# 📊 AdSense 使用示例

## 🎯 在页面中添加广告

### 基本用法

```tsx
import { HeaderBannerAd, SidebarAd, InContentAd } from "~/components/AdSense";

export default function MyPage() {
  return (
    <div>
      {/* 页面顶部横幅广告 */}
      <HeaderBannerAd className="mb-8" />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 主要内容 */}
        <div className="lg:col-span-3">
          <h1>页面标题</h1>
          <p>页面内容...</p>
          
          {/* 内容中间广告 */}
          <InContentAd className="my-8" />
          
          <p>更多内容...</p>
        </div>
        
        {/* 侧边栏 */}
        <div className="lg:col-span-1">
          {/* 侧边栏广告 */}
          <SidebarAd className="mb-6" />
          
          <div>其他侧边栏内容...</div>
        </div>
      </div>
    </div>
  );
}
```

### 自定义样式

```tsx
import { AdSense } from "~/components/AdSense";

export default function CustomAdPage() {
  return (
    <div>
      {/* 自定义样式的广告 */}
      <AdSense 
        slot="headerBanner"
        className="max-w-4xl mx-auto my-8 p-4 bg-gray-50 rounded-lg"
        style={{ 
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      />
    </div>
  );
}
```

### 条件显示广告

```tsx
import { APP_CONFIG } from "~/config/app";
import { HeaderBannerAd } from "~/components/AdSense";

export default function ConditionalAdPage() {
  return (
    <div>
      <h1>页面标题</h1>
      
      {/* 只在启用广告时显示 */}
      {APP_CONFIG.adsense.enabled && (
        <HeaderBannerAd className="my-8" />
      )}
      
      <p>页面内容...</p>
    </div>
  );
}
```

## 🎨 响应式广告布局

### 移动端优化

```tsx
export default function ResponsiveAdPage() {
  return (
    <div>
      {/* 桌面端显示横幅广告，移动端隐藏 */}
      <div className="hidden md:block">
        <HeaderBannerAd className="mb-8" />
      </div>
      
      {/* 移动端显示较小的广告 */}
      <div className="block md:hidden">
        <InContentAd className="mb-6" />
      </div>
      
      <div className="content">
        {/* 页面内容 */}
      </div>
    </div>
  );
}
```

### 网格布局中的广告

```tsx
export default function GridAdPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 内容卡片 */}
      <div className="card">内容1</div>
      <div className="card">内容2</div>
      
      {/* 在网格中插入广告 */}
      <div className="md:col-span-2 lg:col-span-3">
        <InContentAd className="my-4" />
      </div>
      
      <div className="card">内容3</div>
      <div className="card">内容4</div>
    </div>
  );
}
```

## 🔧 高级配置示例

### 动态广告位配置

```tsx
import { APP_CONFIG } from "~/config/app";

export default function DynamicAdPage() {
  const adConfig = APP_CONFIG.adsense;
  
  return (
    <div>
      {adConfig.enabled && (
        <div className="ad-container">
          <ins
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-client={adConfig.clientId}
            data-ad-slot={adConfig.adSlots.headerBanner.slotId}
            data-ad-format={adConfig.adSlots.headerBanner.format}
            data-full-width-responsive={adConfig.adSlots.headerBanner.responsive.toString()}
          />
        </div>
      )}
    </div>
  );
}
```

### 延迟加载广告

```tsx
import { useEffect, useRef, useState } from "react";
import { InContentAd } from "~/components/AdSense";

export default function LazyAdPage() {
  const [isVisible, setIsVisible] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <div>大量内容...</div>
      
      <div ref={adRef} className="min-h-[200px]">
        {isVisible && <InContentAd className="my-8" />}
      </div>
      
      <div>更多内容...</div>
    </div>
  );
}
```

## 📱 移动端最佳实践

### 1. 广告尺寸优化

```tsx
export default function MobileOptimizedAd() {
  return (
    <div>
      {/* 移动端使用较小的广告 */}
      <div className="block sm:hidden">
        <AdSense 
          slot="sidebar" // 使用矩形广告位
          className="max-w-sm mx-auto my-4"
        />
      </div>
      
      {/* 桌面端使用横幅广告 */}
      <div className="hidden sm:block">
        <HeaderBannerAd className="my-6" />
      </div>
    </div>
  );
}
```

### 2. 性能优化

```tsx
import { lazy, Suspense } from "react";

// 懒加载广告组件
const LazyAd = lazy(() => import("~/components/AdSense").then(module => ({
  default: module.HeaderBannerAd
})));

export default function PerformanceOptimizedPage() {
  return (
    <div>
      <h1>页面标题</h1>
      
      <Suspense fallback={<div className="h-24 bg-gray-100 animate-pulse rounded" />}>
        <LazyAd className="my-8" />
      </Suspense>
      
      <div>页面内容...</div>
    </div>
  );
}
```

## 🎯 SEO 友好的广告实现

### 1. 结构化标记

```tsx
export default function SEOFriendlyAdPage() {
  return (
    <article>
      <header>
        <h1>文章标题</h1>
      </header>
      
      <section className="content">
        <p>文章内容...</p>
        
        {/* 明确标记为广告内容 */}
        <aside aria-label="广告" className="my-8">
          <InContentAd />
        </aside>
        
        <p>更多内容...</p>
      </section>
    </article>
  );
}
```

### 2. 无障碍访问

```tsx
export default function AccessibleAdPage() {
  return (
    <div>
      <main>
        <h1>主要内容</h1>
        
        {/* 为屏幕阅读器提供跳过广告的选项 */}
        <a href="#main-content" className="sr-only focus:not-sr-only">
          跳过广告
        </a>
        
        <section aria-label="赞助内容" className="my-8">
          <HeaderBannerAd />
        </section>
        
        <div id="main-content">
          <p>主要内容...</p>
        </div>
      </main>
    </div>
  );
}
```

## 🔍 调试和测试

### 开发环境测试

```tsx
import { APP_CONFIG } from "~/config/app";

export default function DebugAdPage() {
  const isDev = process.env.NODE_ENV === 'development';
  
  return (
    <div>
      {isDev && (
        <div className="bg-yellow-100 border border-yellow-400 p-4 mb-4 rounded">
          <h3>广告调试信息</h3>
          <p>客户端ID: {APP_CONFIG.adsense.clientId}</p>
          <p>广告启用: {APP_CONFIG.adsense.enabled ? '是' : '否'}</p>
        </div>
      )}
      
      <HeaderBannerAd className="my-8" />
    </div>
  );
}
```

---

**提示**: 记住在生产环境中移除调试信息，并确保遵守 Google AdSense 政策。
