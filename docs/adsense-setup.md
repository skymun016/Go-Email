# 📊 Google AdSense 配置指南

## 🎯 概述

GoMail 项目已集成 Google AdSense 广告系统，支持动态配置，无需修改代码即可管理广告设置。

## 🚀 快速配置

### 1. 获取 AdSense 客户端ID

1. 访问 [Google AdSense](https://www.google.com/adsense/)
2. 登录您的 Google 账户
3. 添加您的网站域名
4. 获取客户端ID（格式：`ca-pub-xxxxxxxxxx`）

### 2. 创建广告位

在 AdSense 控制台中创建以下广告位：

#### 顶部横幅广告
- **类型**: 展示广告
- **尺寸**: 自适应
- **位置**: 页面顶部
- **格式**: auto

#### 侧边栏广告
- **类型**: 展示广告
- **尺寸**: 矩形 (300x250)
- **位置**: 侧边栏
- **格式**: rectangle

#### 内容广告
- **类型**: 信息流广告
- **尺寸**: 自适应
- **位置**: 内容中间
- **格式**: fluid

### 3. 更新配置文件

编辑 `config.cjs` 文件中的 AdSense 配置：

```javascript
// Google AdSense 配置
googleAdsense: {
  clientId: "ca-pub-您的客户端ID", // 替换为您的实际客户端ID
  enabled: true, // 设置为 false 可禁用所有广告
  adSlots: {
    headerBanner: {
      slotId: "您的顶部广告位ID", // 替换为实际广告位ID
      format: "auto",
      responsive: true,
    },
    sidebar: {
      slotId: "您的侧边栏广告位ID", // 替换为实际广告位ID
      format: "rectangle",
      responsive: true,
    },
    inContent: {
      slotId: "您的内容广告位ID", // 替换为实际广告位ID
      format: "fluid",
      responsive: true,
    },
  },
},
```

### 4. 重新生成配置

```bash
pnpm run generate-configs
```

### 5. 验证配置

```bash
pnpm run validate-config
```

### 6. 部署更新

```bash
pnpm run deploy
```

## 🎨 广告位置

### 当前广告位置：

1. **顶部横幅广告**: 位于 Hero Section 下方
2. **内容广告**: 位于主要内容和功能介绍之间

### 添加更多广告位：

如需添加更多广告位，可以：

1. 在 `config.cjs` 中添加新的广告位配置
2. 在 `app/components/AdSense.tsx` 中添加新的广告位类型
3. 在相应页面中使用新的广告组件

## 🔧 高级配置

### 条件显示广告

广告会根据配置自动显示/隐藏：

```typescript
// 在 config.cjs 中
googleAdsense: {
  enabled: false, // 设置为 false 禁用所有广告
  // ...
}
```

### 自定义广告样式

可以通过 CSS 类名自定义广告容器样式：

```tsx
<HeaderBannerAd 
  className="my-custom-ad-style" 
  style={{ maxWidth: '728px', margin: '0 auto' }}
/>
```

### 响应式广告

所有广告位默认启用响应式设计，会根据屏幕尺寸自动调整。

## 📊 监控和优化

### 1. AdSense 控制台

定期检查 AdSense 控制台中的：
- 广告效果报告
- 收入统计
- 点击率数据
- 展示次数

### 2. 网站性能

监控广告对网站性能的影响：
- 页面加载速度
- 用户体验指标
- 移动端性能

### 3. 广告位优化

根据数据调整：
- 广告位置
- 广告尺寸
- 广告类型

## 🚫 禁用广告

### 临时禁用

在 `config.cjs` 中设置：

```javascript
googleAdsense: {
  enabled: false, // 禁用所有广告
  // ...
}
```

### 移除特定广告位

注释掉相应页面中的广告组件：

```tsx
{/* <HeaderBannerAd className="mb-8" /> */}
```

## 🔍 故障排除

### 常见问题：

1. **广告不显示**
   - 检查客户端ID是否正确
   - 确认广告位ID是否有效
   - 验证网站是否已通过 AdSense 审核

2. **控制台错误**
   - 检查 AdSense 脚本是否正确加载
   - 确认广告位配置是否正确

3. **移动端问题**
   - 确认响应式设置已启用
   - 检查移动端广告政策合规性

### 调试步骤：

1. 打开浏览器开发者工具
2. 检查控制台是否有错误信息
3. 验证 AdSense 脚本是否加载
4. 确认广告容器是否正确渲染

## 📞 支持

如遇到问题，请：

1. 查看 AdSense 帮助中心
2. 检查配置文件是否正确
3. 运行 `pnpm run validate-config` 验证配置
4. 查看浏览器控制台错误信息

---

**注意**: 请确保遵守 Google AdSense 政策和条款，避免违规操作导致账户被封。
