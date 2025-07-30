# GoMail 用户认证系统设计方案

## 1. 认证系统架构

### 1.1 Session管理设计
```typescript
// 扩展现有的session类型
type UserSessionData = {
  userId: string;
  username: string;
  expiresAt?: string; // 用户账号过期时间
};

// 创建用户session cookie（复用admin模式）
const userSessionCookie = createCookie("__user_session", {
  secrets: ["user-session-secret"], // 从环境变量读取
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30天
});
```

### 1.2 Session存储函数
```typescript
// 用户session管理函数（参考admin实现）
export function getUserSession(cookieHeader: string | null, env?: Env) {
  if (!env) {
    const { getSession } = createMemorySessionStorage<UserSessionData>({
      cookie: userSessionCookie,
    });
    return getSession(cookieHeader);
  }

  const { getSession } = createWorkersKVSessionStorage<UserSessionData>({
    kv: getKVNamespace(env),
    cookie: userSessionCookie,
  });
  return getSession(cookieHeader);
}

export function commitUserSession(session: any, env?: Env) {
  // 类似admin实现
}

export function destroyUserSession(session: any, env?: Env) {
  // 类似admin实现
}
```

## 2. 用户注册流程

### 2.1 注册路由设计
```typescript
// app/routes/register.tsx
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const formData = await request.formData();
  
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();
  const confirmPassword = formData.get("confirmPassword")?.toString();

  // 1. 输入验证
  if (!username || !password || !confirmPassword) {
    return { error: "所有字段都是必填的" };
  }

  if (password !== confirmPassword) {
    return { error: "密码确认不匹配" };
  }

  // 2. 密码强度验证（复用现有函数）
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.isValid) {
    return { error: passwordValidation.errors.join(", ") };
  }

  // 3. 用户名唯一性检查
  const db = createDB(getDatabase(env));
  const existingUser = await checkUserExists(db, username);
  if (existingUser) {
    return { error: "用户名已存在" };
  }

  // 4. 创建用户
  const hashedPassword = await hashPassword(password);
  const user = await createUser(db, {
    username,
    passwordHash: hashedPassword,
    mailboxQuota: APP_CONFIG.user.defaultQuota || 5,
  });

  // 5. 分配邮箱配额
  await allocateUserMailboxes(db, user.id, user.mailboxQuota);

  // 6. 自动登录
  const session = await getUserSession(request.headers.get("Cookie"), env);
  session.set("userId", user.id);
  session.set("username", user.username);

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await commitUserSession(session, env),
    },
  });
}
```

### 2.2 用户创建函数
```typescript
// app/lib/user-db.ts
export async function createUser(
  db: ReturnType<typeof createDB>,
  userData: {
    username: string;
    passwordHash: string;
    mailboxQuota: number;
    expiresAt?: Date;
  }
): Promise<User> {
  const userId = nanoid();
  const expiresAt = userData.expiresAt || 
    new Date(Date.now() + APP_CONFIG.user.defaultExpirationDays * 24 * 60 * 60 * 1000);

  const newUser: NewUser = {
    id: userId,
    username: userData.username,
    passwordHash: userData.passwordHash,
    mailboxQuota: userData.mailboxQuota,
    usedQuota: 0,
    isActive: true,
    expiresAt,
  };

  await db.insert(users).values(newUser);
  
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0];
}
```

## 3. 用户登录流程

### 3.1 登录路由设计
```typescript
// app/routes/login.tsx
export async function action({ request, context }: Route.ActionArgs) {
  const env = context.cloudflare.env;
  const formData = await request.formData();
  
  const username = formData.get("username")?.toString();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return { error: "用户名和密码不能为空" };
  }

  // 1. 查找用户
  const db = createDB(getDatabase(env));
  const user = await validateUser(db, username, password);
  
  if (!user) {
    return { error: "用户名或密码错误" };
  }

  // 2. 检查用户状态
  if (!user.isActive) {
    return { error: "账号已被禁用" };
  }

  if (user.expiresAt && new Date() > user.expiresAt) {
    return { error: "账号已过期" };
  }

  // 3. 更新最后登录时间
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  // 4. 创建session
  const session = await getUserSession(request.headers.get("Cookie"), env);
  session.set("userId", user.id);
  session.set("username", user.username);
  if (user.expiresAt) {
    session.set("expiresAt", user.expiresAt.toISOString());
  }

  return redirect("/dashboard", {
    headers: {
      "Set-Cookie": await commitUserSession(session, env),
    },
  });
}
```

### 3.2 用户验证函数
```typescript
export async function validateUser(
  db: ReturnType<typeof createDB>,
  username: string,
  password: string
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const user = result[0];
  const isValid = await verifyPassword(password, user.passwordHash);

  return isValid ? user : null;
}
```

## 4. 认证中间件

### 4.1 用户认证中间件
```typescript
// app/lib/auth.ts 扩展
export async function requireUser(request: Request, env: Env) {
  const session = await getUserSession(request.headers.get("Cookie"), env);
  const userId = session.get("userId");

  if (!userId) {
    throw redirect("/login");
  }

  const db = createDB(env.DB);
  const user = await db.query.users.findFirst({
    where: (users, { eq, and }) => and(
      eq(users.id, userId),
      eq(users.isActive, true)
    ),
  });

  if (!user) {
    // 清除无效session
    throw redirect("/login", {
      headers: {
        "Set-Cookie": await destroyUserSession(session, env),
      },
    });
  }

  // 检查用户是否过期
  if (user.expiresAt && new Date() > user.expiresAt) {
    throw redirect("/login", {
      headers: {
        "Set-Cookie": await destroyUserSession(session, env),
      },
    });
  }

  return user;
}
```

### 4.2 可选用户认证
```typescript
export async function getOptionalUser(request: Request, env: Env): Promise<User | null> {
  try {
    return await requireUser(request, env);
  } catch (error) {
    // 如果是重定向错误，说明用户未登录，返回null
    if (error instanceof Response && error.status === 302) {
      return null;
    }
    throw error;
  }
}
```

## 5. 路由保护

### 5.1 受保护的路由
```typescript
// app/routes/dashboard.tsx
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 要求用户登录
  const user = await requireUser(request, env);
  
  // 获取用户邮箱列表
  const userMailboxes = await getUserMailboxes(createDB(getDatabase(env)), user.id);
  
  return {
    user: {
      id: user.id,
      username: user.username,
      mailboxQuota: user.mailboxQuota,
      usedQuota: user.usedQuota,
      expiresAt: user.expiresAt?.toISOString(),
    },
    mailboxes: userMailboxes,
  };
}
```

### 5.2 兼容匿名访问
```typescript
// app/routes/home.tsx 修改
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 检查用户是否登录
  const user = await getOptionalUser(request, env);
  
  if (user) {
    // 已登录用户重定向到dashboard
    return redirect("/dashboard");
  }
  
  // 匿名用户继续使用原有逻辑
  // ... 现有的匿名邮箱逻辑
}
```
