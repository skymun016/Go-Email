import { useEffect } from "react";
import { APP_CONFIG } from "~/config/app";

// AdSense 广告位类型
type AdSlotType = "headerBanner" | "sidebar" | "inContent";

interface AdSenseProps {
  slot: AdSlotType;
  className?: string;
  style?: React.CSSProperties;
}

// 声明全局 adsbygoogle 变量
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function AdSense({ slot, className = "", style }: AdSenseProps) {
  // 如果 AdSense 未启用，不显示广告
  if (!APP_CONFIG.adsense.enabled) {
    return null;
  }

  const adConfig = APP_CONFIG.adsense.adSlots[slot];
  
  useEffect(() => {
    try {
      // 推送广告到 AdSense
      if (window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error("AdSense 加载错误:", error);
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={APP_CONFIG.adsense.clientId}
        data-ad-slot={adConfig.slotId}
        data-ad-format={adConfig.format}
        data-full-width-responsive={adConfig.responsive.toString()}
      />
    </div>
  );
}

// 预定义的广告组件
export function HeaderBannerAd({ className, style }: Omit<AdSenseProps, "slot">) {
  return <AdSense slot="headerBanner" className={className} style={style} />;
}

export function SidebarAd({ className, style }: Omit<AdSenseProps, "slot">) {
  return <AdSense slot="sidebar" className={className} style={style} />;
}

export function InContentAd({ className, style }: Omit<AdSenseProps, "slot">) {
  return <AdSense slot="inContent" className={className} style={style} />;
}

// AdSense 脚本加载器
export function AdSenseScript() {
  // 如果 AdSense 未启用，不加载脚本
  if (!APP_CONFIG.adsense.enabled) {
    return null;
  }

  return (
    <script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${APP_CONFIG.adsense.clientId}`}
      crossOrigin="anonymous"
    />
  );
}
