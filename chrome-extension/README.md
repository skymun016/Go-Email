# AugmentCode 自动注册助手 - Chrome 插件版

## 📖 简介

这是一个 Chrome 浏览器插件，用于自动化 AugmentCode 的注册流程。插件使用自有邮箱系统，无需依赖油猴脚本。

## ✨ 功能特性

- 🤖 **全自动注册** - 自动获取邮箱、填写表单、处理验证码
- 📧 **自有邮箱系统** - 集成自建邮箱服务，无需第三方临时邮箱
- 🎯 **智能识别** - 自动识别注册表单和验证码输入框
- 📊 **状态跟踪** - 实时显示注册进度和状态
- 🔄 **手动控制** - 支持手动更新状态和重置操作
- 🧪 **测试功能** - 内置邮箱提取和链接提取测试

## 🚀 安装方法

### 方法一：开发者模式安装

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `chrome-extension` 文件夹
6. 插件安装完成

### 方法二：打包安装

1. 在扩展程序页面点击"打包扩展程序"
2. 选择 `chrome-extension` 文件夹
3. 生成 `.crx` 文件
4. 拖拽 `.crx` 文件到扩展程序页面安装

## 📋 使用说明

### 基本使用

1. **访问 AugmentCode 网站** - 插件会自动检测当前页面
2. **点击插件图标** - 打开控制面板
3. **开始自动注册** - 点击"开始自动注册"按钮
4. **等待完成** - 插件会自动处理整个注册流程

### 高级功能

- **手动更新状态** - 在订阅页面手动标记邮箱为已注册
- **重置状态** - 清除所有操作状态，重新开始
- **测试提取** - 测试邮箱和链接提取功能

### 控制面板功能

插件提供两种控制界面：

1. **弹窗界面** - 点击插件图标打开
2. **页面控制面板** - 在 AugmentCode 页面左上角显示（紧凑设计，不遮挡页面内容）

## 🔧 配置说明

### API 配置

插件使用以下 API 端点：

```javascript
const AUTOMATION_API_CONFIG = {
    baseUrl: "https://gomail-app.amexiaowu.workers.dev",
    apiToken: "gm_VS-Bg8f_nGaGDI-a9IWqMxZIw9wy50wQ",
    endpoints: {
        getAvailableMailboxes: "/api/automation?action=get-available-mailboxes",
        getVerificationCodes: "/api/automation?action=get-verification-codes",
        markRegistered: "/api/automation"
    }
};
```

### 权限说明

插件需要以下权限：

- `storage` - 存储用户数据和状态
- `activeTab` - 访问当前标签页
- `scripting` - 注入内容脚本
- `host_permissions` - 访问 AugmentCode 和邮箱 API

## 🛠️ 开发说明

### 文件结构

```
chrome-extension/
├── manifest.json          # 插件配置文件
├── background.js          # 后台脚本（处理跨域请求）
├── content.js            # 内容脚本（主要逻辑）
├── popup.html            # 弹窗界面
├── popup.js              # 弹窗脚本
├── icon16.png            # 16x16 图标
├── icon48.png            # 48x48 图标
├── icon128.png           # 128x128 图标
└── README.md             # 说明文档
```

### 核心组件

1. **Background Script** - 处理跨域 HTTP 请求和数据存储
2. **Content Script** - 页面交互和自动化逻辑
3. **Popup Interface** - 用户控制界面

### 与油猴版本的差异

- ❌ 移除了 `GM_*` 函数依赖
- ✅ 使用 Chrome Extension API
- ✅ 更好的权限控制
- ✅ 原生浏览器集成
- ✅ 更稳定的跨域请求处理

## 🐛 故障排除

### 常见问题

1. **插件无法加载**
   - 检查是否开启开发者模式
   - 确认文件夹路径正确

2. **API 请求失败**
   - 检查网络连接
   - 确认 API 令牌有效

3. **页面识别失败**
   - 刷新页面重试
   - 检查页面 URL 是否正确

### 调试方法

1. 打开开发者工具 (F12)
2. 查看 Console 标签页的日志
3. 检查 Network 标签页的请求
4. 在扩展程序页面查看插件详情

## 📝 更新日志

### v1.0.1 (2025-07-30)

- 🎨 **界面优化**：将控制面板从右上角移动到左上角，避免遮挡注册按钮
- 📏 **尺寸调整**：缩小控制面板尺寸，从 280px 缩小到 200-220px
- 🔧 **样式优化**：调整按钮和文字大小，使界面更紧凑

### v1.0.0 (2025-07-30)

- ✅ 初始版本发布
- ✅ 基本自动注册功能
- ✅ 邮箱系统集成
- ✅ 控制面板界面
- ✅ 状态跟踪和日志

## 📄 许可证

本项目仅供学习和研究使用。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

*AugmentCode 自动注册助手 - 让注册更简单* 🚀
