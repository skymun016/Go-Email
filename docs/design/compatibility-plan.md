# GoMail 用户管理系统兼容性方案

## 1. 核心兼容性原则

### 1.1 零破坏性原则
- **现有功能保持不变**：匿名用户仍可正常使用临时邮箱服务
- **API向后兼容**：现有API接口保持完全兼容
- **数据完整性**：现有数据不会丢失或损坏
- **渐进式升级**：用户可选择是否升级到注册账户

### 1.2 双模式并存
```typescript
// 系统支持两种运行模式
type UserMode = "anonymous" | "registered";

// 邮箱所有权类型
type OwnerType = "anonymous" | "user";

// 功能开关配置
const FEATURE_FLAGS = {
  userRegistration: true,  // 是否启用用户注册
  forceUserMode: false,    // 是否强制用户模式
  anonymousAccess: true,   // 是否允许匿名访问
};
```

## 2. 数据库兼容性策略

### 2.1 平滑迁移方案
```sql
-- 阶段1：添加新字段（可选，默认值）
ALTER TABLE mailboxes ADD COLUMN owner_id TEXT;
ALTER TABLE mailboxes ADD COLUMN owner_type TEXT DEFAULT 'anonymous';

-- 阶段2：创建新表
CREATE TABLE users (...);
CREATE TABLE user_mailboxes (...);

-- 阶段3：数据迁移（现有数据标记为匿名）
UPDATE mailboxes SET owner_type = 'anonymous' WHERE owner_type IS NULL;

-- 阶段4：添加索引
CREATE INDEX idx_mailboxes_owner ON mailboxes(owner_id, owner_type);
```

### 2.2 数据迁移脚本
```typescript
// app/lib/migration.ts
export async function migrateExistingData(db: ReturnType<typeof createDB>) {
  console.log("🔄 开始数据迁移...");
  
  // 1. 标记现有邮箱为匿名类型
  const result = await db
    .update(mailboxes)
    .set({ 
      ownerType: "anonymous",
      ownerId: null 
    })
    .where(isNull(mailboxes.ownerType));
    
  console.log(`✅ 迁移了 ${result.changes} 个匿名邮箱`);
  
  // 2. 验证数据完整性
  const totalMailboxes = await db
    .select({ count: count() })
    .from(mailboxes);
    
  const anonymousMailboxes = await db
    .select({ count: count() })
    .from(mailboxes)
    .where(eq(mailboxes.ownerType, "anonymous"));
    
  console.log(`📊 总邮箱数: ${totalMailboxes[0].count}, 匿名邮箱数: ${anonymousMailboxes[0].count}`);
}
```

## 3. API接口兼容性

### 3.1 现有API保持不变
```typescript
// app/routes/api/external/mailbox.ts - 保持完全兼容
export async function action({ request, context }: Route.ActionArgs) {
  // 现有逻辑保持不变，继续创建匿名邮箱
  const email = generateRandomEmail("smart");
  const mailbox = await getOrCreateMailbox(db, email); // 默认创建匿名邮箱
  
  return json({
    success: true,
    data: {
      email: mailbox.email,
      expires_at: mailbox.expiresAt.toISOString(),
    },
  });
}
```

### 3.2 新增用户专用API
```typescript
// app/routes/api/user/mailboxes.ts - 新增用户API
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = await requireUser(request, context.cloudflare.env);
  const userMailboxes = await getUserMailboxes(db, user.id);
  
  return json({
    success: true,
    data: {
      user: {
        username: user.username,
        quota: user.mailboxQuota,
        used: user.usedQuota,
      },
      mailboxes: userMailboxes,
    },
  });
}
```

### 3.3 API版本控制
```typescript
// 支持API版本控制
const API_ROUTES = {
  v1: {
    // 现有API，保持兼容
    "/api/external/mailbox": "routes/api/external/mailbox.ts",
    "/api/external/emails/:email": "routes/api/external/emails.$email.ts",
  },
  v2: {
    // 新版API，支持用户功能
    "/api/v2/user/mailboxes": "routes/api/v2/user/mailboxes.ts",
    "/api/v2/user/emails": "routes/api/v2/user/emails.ts",
  },
};
```

## 4. 前端界面兼容性

### 4.1 路由兼容策略
```typescript
// app/routes.ts - 兼容性路由设计
export default [
  layout("routes/layout.tsx", [
    // 主页：智能重定向
    index("routes/home.tsx"), // 根据用户状态智能重定向
    
    // 匿名模式路由（保持兼容）
    route("/anonymous", "routes/anonymous.tsx"), // 强制匿名模式
    
    // 用户模式路由
    route("/login", "routes/login.tsx"),
    route("/register", "routes/register.tsx"),
    route("/dashboard", "routes/dashboard.tsx"),
    
    // 现有路由保持不变
    route("/about", "routes/about.tsx"),
    route("/api-docs", "routes/api-docs.tsx"),
    route("/mail/:id", "routes/mail.$id.tsx"),
  ]),
] satisfies RouteConfig;
```

### 4.2 智能首页重定向
```typescript
// app/routes/home.tsx - 智能重定向逻辑
export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env;
  
  // 检查功能开关
  if (!FEATURE_FLAGS.userRegistration) {
    // 用户注册功能未启用，使用原有匿名模式
    return await loadAnonymousMode(request, env);
  }
  
  // 检查用户登录状态
  const user = await getOptionalUser(request, env);
  
  if (user) {
    // 已登录用户重定向到dashboard
    return redirect("/dashboard");
  }
  
  // 未登录用户：显示选择界面或直接使用匿名模式
  if (FEATURE_FLAGS.forceUserMode) {
    return redirect("/login");
  }
  
  // 默认：显示匿名模式 + 注册提示
  return await loadAnonymousMode(request, env);
}
```

### 4.3 组件兼容性处理
```typescript
// app/components/EmailGenerator.tsx - 兼容性组件
export function EmailGenerator({ 
  mode = "anonymous",
  user = null 
}: {
  mode?: "anonymous" | "user";
  user?: User | null;
}) {
  if (mode === "user" && user) {
    // 用户模式：显示邮箱列表
    return <UserMailboxList user={user} />;
  }
  
  // 匿名模式：保持原有界面
  return <AnonymousEmailGenerator />;
}
```

## 5. 管理后台兼容性

### 5.1 管理后台增强
```typescript
// app/routes/admin/dashboard.tsx - 增强管理后台
export async function loader({ request, context }: Route.LoaderArgs) {
  await requireAdmin(request, context.cloudflare.env);
  
  const db = createDB(getDatabase(context.cloudflare.env));
  
  // 获取统计数据（包含用户和匿名数据）
  const stats = await db
    .select({
      totalMailboxes: count(mailboxes.id),
      userMailboxes: count(
        case()
          .when(eq(mailboxes.ownerType, "user"), mailboxes.id)
          .else(null)
      ),
      anonymousMailboxes: count(
        case()
          .when(eq(mailboxes.ownerType, "anonymous"), mailboxes.id)
          .else(null)
      ),
      totalUsers: count(users.id),
      activeUsers: count(
        case()
          .when(eq(users.isActive, true), users.id)
          .else(null)
      ),
    })
    .from(mailboxes)
    .leftJoin(users, eq(mailboxes.ownerId, users.id));
    
  return json({ stats: stats[0] });
}
```

### 5.2 用户管理功能
```typescript
// app/routes/admin/users.tsx - 新增用户管理
export default function AdminUsers({ loaderData }: Route.ComponentProps) {
  const { users, pagination } = loaderData;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <div className="flex space-x-2">
          <button className="btn-secondary">导出用户</button>
          <button className="btn-primary">添加用户</button>
        </div>
      </div>
      
      <UserTable users={users} />
      <Pagination {...pagination} />
    </div>
  );
}
```

## 6. 配置管理兼容性

### 6.1 环境变量配置
```typescript
// app/config/app.ts - 兼容性配置
export const APP_CONFIG = {
  // 现有配置保持不变
  email: {
    expirationHours: 24,
    domains: ["aug.qzz.io", "asksy.dpdns.org"],
  },
  
  // 新增用户管理配置
  user: {
    registrationEnabled: env.USER_REGISTRATION_ENABLED === "true",
    defaultQuota: parseInt(env.USER_DEFAULT_QUOTA || "5"),
    defaultExpirationDays: parseInt(env.USER_DEFAULT_EXPIRATION_DAYS || "365"),
    forceUserMode: env.FORCE_USER_MODE === "true",
  },
  
  // 兼容性开关
  compatibility: {
    allowAnonymous: env.ALLOW_ANONYMOUS !== "false",
    showRegistrationPrompt: env.SHOW_REGISTRATION_PROMPT !== "false",
    migrateOnStartup: env.MIGRATE_ON_STARTUP === "true",
  },
};
```

### 6.2 功能开关机制
```typescript
// app/lib/feature-flags.ts
export class FeatureFlags {
  static isUserRegistrationEnabled(): boolean {
    return APP_CONFIG.user.registrationEnabled;
  }
  
  static isAnonymousAccessAllowed(): boolean {
    return APP_CONFIG.compatibility.allowAnonymous;
  }
  
  static shouldForceUserMode(): boolean {
    return APP_CONFIG.user.forceUserMode;
  }
  
  static shouldShowRegistrationPrompt(): boolean {
    return APP_CONFIG.compatibility.showRegistrationPrompt;
  }
}
```

## 7. 部署兼容性策略

### 7.1 蓝绿部署支持
```typescript
// 部署脚本支持回滚
const DEPLOYMENT_CONFIG = {
  enableUserFeatures: process.env.ENABLE_USER_FEATURES === "true",
  rollbackSupported: true,
  migrationRequired: false, // 数据库迁移是可选的
};
```

### 7.2 渐进式功能启用
```bash
# 阶段1：部署代码，功能关闭
wrangler deploy --env production
wrangler secret put ENABLE_USER_FEATURES --env production # 设置为 "false"

# 阶段2：启用用户注册，保持匿名访问
wrangler secret put USER_REGISTRATION_ENABLED --env production # 设置为 "true"

# 阶段3：完全启用用户功能
wrangler secret put ENABLE_USER_FEATURES --env production # 设置为 "true"
```

## 8. 监控和回滚策略

### 8.1 兼容性监控
```typescript
// app/lib/monitoring.ts
export function trackCompatibilityMetrics() {
  return {
    anonymousUsers: getAnonymousUserCount(),
    registeredUsers: getRegisteredUserCount(),
    apiUsage: {
      v1: getV1ApiUsage(),
      v2: getV2ApiUsage(),
    },
    errors: getCompatibilityErrors(),
  };
}
```

### 8.2 快速回滚机制
```typescript
// 紧急回滚：禁用用户功能
export async function emergencyRollback(env: Env) {
  // 1. 禁用用户注册
  await env.KV.put("FEATURE_USER_REGISTRATION", "false");
  
  // 2. 强制匿名模式
  await env.KV.put("FORCE_ANONYMOUS_MODE", "true");
  
  // 3. 记录回滚事件
  console.log("🚨 紧急回滚：已禁用用户功能，恢复纯匿名模式");
}
```
