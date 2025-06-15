# GoMail 🚀

**现代化临时邮箱服务 - 基于 Cloudflare 全栈解决方案**

一个完全免费、开源的临时邮箱服务，基于 Cloudflare Workers + D1 数据库 + R2 存储构建，采用 React Router v7 开发，提供企业级的性能和稳定性。

## 🌐 在线体验

**官方网站**: [http://184772.xyz/](http://184772.xyz/)

立即访问体验完整功能，无需注册即可使用！

## 💬 交流群组

**QQ交流群**: `1017212982`

欢迎加入讨论技术问题、功能建议和使用心得！

## 🎯 项目简介

GoMail 是一个专为隐私保护和便捷使用而设计的临时邮箱服务：

### 🚀 **核心特性**
- ⚡ **即时生成**：无需注册，一键生成临时邮箱
- 📧 **实时接收**：自动接收邮件，实时显示内容
- 📎 **附件支持**：完整支持邮件附件查看和下载
- 🔒 **隐私保护**：24小时自动过期，保护用户隐私
- 🌐 **全球可用**：基于Cloudflare全球网络，访问速度快
- 📱 **响应式设计**：完美支持手机、平板、电脑访问

### 🛠️ **技术架构**
- **前端**: React Router v7 + TypeScript + Tailwind CSS
- **后端**: Cloudflare Workers (Serverless)
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2 (附件存储)
- **邮件**: Cloudflare Email Routing
- **部署**: 一键部署到 Cloudflare

## 🎯 使用场景

### 👥 **适用人群**
- 🛡️ **隐私保护者**：不想暴露真实邮箱地址
- 🧪 **开发测试**：需要大量邮箱进行功能测试
- 📝 **临时注册**：注册一次性账号或服务
- 🚫 **避免垃圾邮件**：防止营销邮件骚扰
- 🔍 **匿名验证**：匿名接收验证码和激活邮件

### 💼 **应用场景**
- 📱 APP注册验证
- 🌐 网站账号激活
- 🎮 游戏账号注册
- 💳 优惠券和促销信息接收
- 🧪 API接口测试
- 📊 邮件营销测试

## ✨ 功能特性

### 🚀 **核心功能**
- ⚡ **秒级生成**：点击即可生成可用邮箱
- 📧 **实时接收**：邮件到达立即显示，无需刷新
- 📎 **附件下载**：支持各种格式附件查看和下载
- 🔄 **自动刷新**：智能轮询，及时获取新邮件
- ⏰ **自动过期**：24小时后自动清理，保护隐私
- 📱 **移动优化**：完美适配手机和平板设备

### 🛠️ **管理功能**
- 🔐 **管理后台**：完整的邮件和用户管理系统
- 🔑 **API接口**：RESTful API支持第三方集成
- 📊 **使用统计**：详细的访问和使用数据分析
- 🛡️ **安全防护**：防刷机制和访问频率限制

### 💰 **商业化功能**
- 📊 **Google AdSense**：完整的广告系统集成
- 📈 **百度统计**：用户行为数据分析
- 🎨 **响应式广告**：自适应不同设备的广告展示
- 💡 **条件显示**：可配置的广告开关控制

### 🛡️ **安全与性能**
- 🔒 **隐私保护**：军用级加密和零日志策略
- ⚡ **极速访问**：基于 Cloudflare 全球网络
- 📱 **PWA 支持**：渐进式 Web 应用体验
- 🌐 **SEO 优化**：完整的搜索引擎优化

## 🛠️ 技术栈

### 前端技术
- **框架**：React Router v7
- **样式**：Tailwind CSS + 自定义组件库
- **构建**：Vite 6.x
- **类型**：TypeScript

### 后端服务
- **运行时**：Cloudflare Workers
- **数据库**：Cloudflare D1 (SQLite)
- **存储**：Cloudflare R2 (附件存储)
- **缓存**：Cloudflare KV
- **邮件**：Cloudflare Email Workers

### 开发工具
- **ORM**：Drizzle ORM
- **包管理**：pnpm
- **代码质量**：Biome
- **部署**：Wrangler CLI

## 🚀 快速部署

> 📖 **详细部署指南**: [SETUP.md](SETUP.md) - 完整的配置和部署教程

### 📋 **部署前准备**

#### 必需条件：
- ✅ **Cloudflare账号** (免费即可)
- ✅ **域名** (可在Cloudflare注册或转入)
- ✅ **Node.js 18+** 和 **npm/yarn/pnpm**
- ✅ **Git** 版本控制工具

#### 推荐配置：
- 💳 **Cloudflare付费计划** (更高的请求限制)
- 🌐 **多个备用域名** (提高可用性)
- 📧 **自定义邮箱域名** (更专业的服务)

### ⚡ **一键部署 (推荐)**

最简单的部署方式，适合快速体验：

```bash
# 1. 克隆项目
git clone https://github.com/xn030523/Go-Email.git
cd Go-Email

# 2. 安装依赖
npm install

# 3. 登录Cloudflare
npx wrangler login

# 4. 配置项目
# 复制配置模板并编辑
cp config.example.cjs config.cjs
vim config.cjs  # 填入你的域名和配置

# 5. 生成配置文件
npm run generate-configs

# 6. 创建Cloudflare资源
npm run setup

# 7. 部署到Cloudflare
npm run deploy
```

> 💡 **需要详细指导？** 查看 [SETUP.md](SETUP.md) 获取完整的配置说明和故障排除指南

### 📚 **部署文档**

- 📖 **[完整部署指南](SETUP.md)** - 详细的配置和部署教程
- 🔧 **[配置模板](config.example.cjs)** - 配置文件模板
- 🛠️ **[故障排除](SETUP.md#获取帮助)** - 常见问题解决方案

## 📁 项目结构

```
GoMail/
├── 📁 app/                     # 应用核心代码
│   ├── 📁 components/          # React 组件
│   │   ├── 📁 ui/             # UI 基础组件
│   │   ├── AdSense.tsx        # 广告组件
│   │   ├── Navigation.tsx     # 导航组件
│   │   └── Footer.tsx         # 页脚组件
│   ├── 📁 routes/             # 路由页面
│   ├── 📁 config/             # 配置管理
│   │   ├── app.ts            # 应用配置（自动生成）
│   │   └── analytics.ts      # 统计配置
│   ├── 📁 lib/                # 工具库
│   └── 📁 db/                 # 数据库相关
├── 📁 workers/                # Cloudflare Workers
├── 📁 scripts/                # 自动化脚本
│   ├── generate-configs.cjs   # 配置生成器
│   └── validate-config.cjs    # 配置验证器
├── 📁 docs/                   # 文档
│   ├── adsense-setup.md       # AdSense 配置指南
│   └── adsense-usage-examples.md
├── 📁 public/                 # 静态资源
│   └── ads.txt               # AdSense 验证文件
├── config.example.cjs         # 🎯 配置文件模板
├── config.cjs                # 🔒 主配置文件（不提交到Git）
├── SETUP.md                  # 📖 详细部署指南
├── wrangler.jsonc            # Cloudflare 配置（自动生成）
├── .dev.vars                 # 开发环境变量（自动生成）
└── DEPLOYMENT.md             # 部署指南（自动生成）
```

## 🎯 统一配置管理系统

GoMail 的最大特色是**统一配置管理**，只需修改一个文件即可完成整个项目的配置：

### 📝 主配置文件 `config.cjs`

```javascript
module.exports = {
  // 🏷️ 项目基本信息
  project: {
    name: "gomail-app",
    displayName: "GoMail",
    description: "免费、安全、无广告的临时邮箱服务",
  },

  // 🌐 域名配置
  domain: {
    primary: "184772.xyz", // 您的域名
  },

  // ☁️ Cloudflare 资源配置
  cloudflare: {
    database: { name: "gomail-database" },
    kv: { name: "gomail-kv" },
    r2: { name: "gomail-attachments" },
  },

  // 📊 Google AdSense 配置
  secrets: {
    googleAdsense: {
      clientId: "ca-pub-您的客户端ID",
      enabled: true,
    },
    baiduAnalytics: {
      id: "您的百度统计ID",
      enabled: true,
    },
  },
};
```

### 🔄 自动化工具

```bash
# 验证配置
pnpm run validate-config

# 生成所有配置文件
pnpm run generate-configs

# 自动生成的文件：
# ├── wrangler.jsonc      # Cloudflare Workers 配置
# ├── .dev.vars          # 开发环境变量
# ├── app/config/app.ts  # 应用配置
# └── DEPLOYMENT.md      # 部署指南
## 🌟 特色功能

### 📊 **Google AdSense 集成**
- 🎯 **动态配置**：无需修改代码，配置文件控制
- 📱 **响应式广告**：自适应不同设备尺寸
- 💡 **条件显示**：可随时启用/禁用广告
- 🔧 **多广告位**：支持顶部横幅、侧边栏、内容广告

### 📈 **数据统计分析**
- 📊 **百度统计**：完整的用户行为分析
- 🎛️ **配置化管理**：统计功能可配置开关
- 📱 **移动端优化**：完美支持移动设备统计

### 🔐 **安全与隐私**
- 🛡️ **ads.txt 自动配置**：Google AdSense 验证文件
- 🔒 **Session 加密**：安全的用户会话管理
- 🚫 **零日志策略**：不记录用户隐私数据
- ⏰ **自动过期**：24小时后自动清理数据

## 📚 文档与指南

- 📖 **[SETUP.md](SETUP.md)** - 🌟 **完整的配置和部署指南**
- 🔧 **[config.example.cjs](config.example.cjs)** - 配置文件模板
- 📊 **[AdSense 配置](docs/adsense-setup.md)** - 广告配置详解
- 💡 **[使用示例](docs/adsense-usage-examples.md)** - 代码使用示例

## 🎯 部署状态

- ✅ **在线演示**: https://184772.xyz
- ✅ **GitHub 仓库**: https://github.com/xn030523/Go-Email
- ✅ **技术支持**: 完整的文档和示例

## 🤝 贡献指南

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **发起 Pull Request**

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- **Cloudflare** - 提供强大的边缘计算平台
- **React Router** - 现代化的路由解决方案
- **Tailwind CSS** - 优秀的 CSS 框架
- **Drizzle ORM** - 类型安全的 ORM

## 🎯 **最方便的部署方式**

### 🚀 **推荐：使用Cloudflare一键部署**

1. **Fork项目到你的GitHub**
2. **在Cloudflare Pages中连接GitHub仓库**
3. **配置环境变量和资源绑定**
4. **自动部署完成**

这种方式支持：
- ✅ **自动部署**：代码推送自动更新
- ✅ **零配置**：Cloudflare自动处理构建
- ✅ **免费使用**：Cloudflare免费计划足够使用
- ✅ **全球CDN**：自动享受全球加速

### 💡 **部署小贴士**

- 🔧 **首次部署**：建议使用详细步骤，确保理解每个环节
- ⚡ **快速体验**：使用一键部署脚本，5分钟即可上线
- 🌐 **生产环境**：推荐使用付费计划，获得更好的性能
- 📊 **监控运维**：配置Cloudflare Analytics监控服务状态

## 💬 **交流与支持**

### 🎯 **官方资源**
- 🌐 **在线演示**: [http://184772.xyz/](http://184772.xyz/)
- 📱 **QQ交流群**: `1017212982`
- 📚 **GitHub仓库**: [https://github.com/xn030523/Go-Email](https://github.com/xn030523/Go-Email)

### 🤝 **获取帮助**
- 📖 **部署指南**: [SETUP.md](SETUP.md) - 完整的配置和部署教程
- 🐛 **Bug报告**: [GitHub Issues](https://github.com/xn030523/Go-Email/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/xn030523/Go-Email/discussions)
- 💬 **技术交流**: 加入QQ群 `1017212982` 讨论
- 📧 **邮件联系**: 使用我们的临时邮箱服务发送反馈

### 🎉 **社区贡献**
欢迎提交PR、报告Bug、提出建议！我们重视每一个反馈。

## 📄 **开源协议**

本项目采用 **MIT License** 开源协议，你可以：
- ✅ 商业使用
- ✅ 修改代码
- ✅ 分发代码
- ✅ 私人使用

## 🙏 **致谢**

感谢以下技术和平台：
- **Cloudflare** - 强大的边缘计算平台
- **React Router v7** - 现代化路由框架
- **Tailwind CSS** - 优秀的CSS框架
- **Drizzle ORM** - 类型安全的数据库ORM

---

<div align="center">

### 🌟 **GoMail - 让临时邮箱更简单** 🌟

**⭐ 如果这个项目对您有帮助，请给我们一个 Star！⭐**

**🚀 立即体验：[http://184772.xyz/](http://184772.xyz/) 🚀**

**💬 加入交流群：1017212982 💬**

</div>


