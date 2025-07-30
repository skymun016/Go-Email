# GoMail 前端界面改造设计方案

## 1. 整体界面架构调整

### 1.1 路由结构重新设计
```typescript
// app/routes.ts 新增路由
export default [
  layout("routes/layout.tsx", [
    // 匿名用户路由
    index("routes/home.tsx"), // 匿名临时邮箱（保持兼容）
    
    // 用户认证路由
    route("/login", "routes/login.tsx"),
    route("/register", "routes/register.tsx"),
    route("/logout", "routes/logout.ts"),
    
    // 用户仪表板路由（需要登录）
    route("/dashboard", "routes/dashboard.tsx"),
    route("/dashboard/mailbox/:id", "routes/dashboard.mailbox.$id.tsx"),
    
    // 其他现有路由保持不变
    route("/about", "routes/about.tsx"),
    route("/api-docs", "routes/api-docs.tsx"),
    route("/faq", "routes/faq.tsx"),
    route("/contact", "routes/contact.tsx"),
    route("/mail/:id", "routes/mail.$id.tsx"),
  ]),
  
  // 管理员路由保持不变
  route("/admin", "routes/admin.ts"),
  // ... 其他现有路由
] satisfies RouteConfig;
```

### 1.2 导航栏改造
```typescript
// app/components/Navigation.tsx 修改
export function Navigation({ currentPath, user }: { 
  currentPath: string; 
  user?: User | null; 
}) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="AugMails" className="h-8 w-8" />
              <span className="text-xl font-bold">AugMails</span>
            </Link>
          </div>
          
          {/* 导航链接 */}
          <div className="flex items-center space-x-4">
            {user ? (
              // 已登录用户导航
              <>
                <Link to="/dashboard" className="nav-link">我的邮箱</Link>
                <Link to="/about" className="nav-link">关于</Link>
                <div className="relative">
                  <UserDropdown user={user} />
                </div>
              </>
            ) : (
              // 未登录用户导航
              <>
                <Link to="/" className="nav-link">临时邮箱</Link>
                <Link to="/about" className="nav-link">关于</Link>
                <Link to="/api-docs" className="nav-link">API文档</Link>
                <Link to="/login" className="btn-primary">登录</Link>
                <Link to="/register" className="btn-secondary">注册</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

## 2. 用户仪表板界面设计

### 2.1 主仪表板布局
```typescript
// app/routes/dashboard.tsx
export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user, mailboxes, selectedMailbox, emails } = loaderData;
  const [selectedMailboxId, setSelectedMailboxId] = useState(
    selectedMailbox?.id || mailboxes[0]?.id
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 用户信息头部 */}
      <UserHeader user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧：邮箱列表 */}
          <div className="lg:col-span-1">
            <MailboxList 
              mailboxes={mailboxes}
              selectedId={selectedMailboxId}
              onSelect={setSelectedMailboxId}
            />
          </div>
          
          {/* 右侧：邮件列表 */}
          <div className="lg:col-span-3">
            <EmailList 
              mailbox={selectedMailbox}
              emails={emails}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.2 用户信息头部组件
```typescript
// app/components/UserHeader.tsx
export function UserHeader({ user }: { user: User }) {
  const quotaPercentage = (user.usedQuota / user.mailboxQuota) * 100;
  
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              欢迎回来，{user.username}
            </h1>
            <p className="text-gray-600">
              管理您的临时邮箱和邮件
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* 配额显示 */}
            <div className="text-center">
              <div className="text-sm text-gray-500">邮箱配额</div>
              <div className="text-lg font-semibold">
                {user.usedQuota} / {user.mailboxQuota}
              </div>
              <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${quotaPercentage}%` }}
                />
              </div>
            </div>
            
            {/* 过期时间 */}
            {user.expiresAt && (
              <div className="text-center">
                <div className="text-sm text-gray-500">账号有效期</div>
                <div className="text-lg font-semibold">
                  {formatDate(user.expiresAt)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 2.3 邮箱列表组件
```typescript
// app/components/MailboxList.tsx
export function MailboxList({ 
  mailboxes, 
  selectedId, 
  onSelect 
}: {
  mailboxes: Array<Mailbox & { isDefault: boolean; emailCount: number; unreadCount: number }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">我的邮箱</h2>
        <p className="text-sm text-gray-600">
          {mailboxes.length} 个邮箱
        </p>
      </div>
      
      <div className="divide-y">
        {mailboxes.map((mailbox) => (
          <div
            key={mailbox.id}
            className={`p-4 cursor-pointer hover:bg-gray-50 ${
              selectedId === mailbox.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
            }`}
            onClick={() => onSelect(mailbox.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {mailbox.email}
                  </span>
                  {mailbox.isDefault && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      默认
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4 mt-1">
                  <span className="text-xs text-gray-500">
                    {mailbox.emailCount} 封邮件
                  </span>
                  {mailbox.unreadCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {mailbox.unreadCount} 未读
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <CopyButton text={mailbox.email} />
                <MailboxActions mailbox={mailbox} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 3. 认证界面设计

### 3.1 登录页面
```typescript
// app/routes/login.tsx
export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img className="mx-auto h-12 w-auto" src="/logo.png" alt="AugMails" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到您的账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或者{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              创建新账户
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" method="post">
          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{actionData.error}</div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入用户名"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入密码"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              登录
            </button>
          </div>
          
          <div className="text-center">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-500">
              继续使用匿名临时邮箱
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 3.2 注册页面
```typescript
// app/routes/register.tsx
export default function Register({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <img className="mx-auto h-12 w-auto" src="/logo.png" alt="AugMails" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            创建新账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            已有账户？{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              立即登录
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" method="post">
          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{actionData.error}</div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="请输入用户名"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="至少8位，包含大小写字母和数字"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="请再次输入密码"
              />
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="text-sm text-blue-700">
              <strong>注册即可获得：</strong>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>5个专属临时邮箱地址</li>
                <li>邮箱永久有效（账号有效期内）</li>
                <li>邮件历史记录保存</li>
                <li>更好的隐私保护</li>
              </ul>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              创建账户
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

## 4. 兼容性界面处理

### 4.1 首页改造（匿名用户）
```typescript
// app/routes/home.tsx 修改
export default function Home({ loaderData }: Route.ComponentProps) {
  const { user, email, mails, stats } = loaderData;
  
  // 如果用户已登录，重定向到dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 保持现有的匿名邮箱界面 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 添加注册提示 */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                升级到用户账户
              </h3>
              <p className="text-blue-700">
                注册账户即可获得5个专属邮箱，邮件永久保存，更好的隐私保护
              </p>
            </div>
            <div className="flex space-x-3">
              <Link to="/register" className="btn-primary">
                立即注册
              </Link>
              <Link to="/login" className="btn-secondary">
                登录
              </Link>
            </div>
          </div>
        </div>
        
        {/* 现有的匿名邮箱界面保持不变 */}
        {/* ... */}
      </div>
    </div>
  );
}
```
