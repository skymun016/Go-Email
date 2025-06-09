// 百度统计配置
export function getBaiduAnalyticsConfig(env?: Env) {
  // 在 Cloudflare Workers 环境中使用 env 参数
  if (env) {
    return {
      id: env.BAIDU_ANALYTICS_ID || "YOUR_BAIDU_ANALYTICS_ID",
      enabled: env.ENABLE_ANALYTICS === "true",
    };
  }

  // 在开发环境中使用默认值
  return {
    id: "YOUR_BAIDU_ANALYTICS_ID",
    enabled: false,
  };
}

// 百度统计脚本加载函数
export function loadBaiduAnalytics(id: string) {
  if (typeof window === "undefined" || !id || id === "YOUR_BAIDU_ANALYTICS_ID") {
    return;
  }

  // 检查是否已经加载
  if (window._hmt) {
    return;
  }

  // 创建百度统计脚本
  const script = document.createElement("script");
  script.innerHTML = `
    var _hmt = _hmt || [];
    (function() {
      var hm = document.createElement("script");
      hm.src = "https://hm.baidu.com/hm.js?${id}";
      var s = document.getElementsByTagName("script")[0]; 
      s.parentNode.insertBefore(hm, s);
    })();
  `;
  
  document.head.appendChild(script);
}

// 页面访问统计
export function trackPageView(url?: string) {
  if (typeof window !== "undefined" && window._hmt) {
    window._hmt.push(['_trackPageview', url || window.location.pathname]);
  }
}

// 事件统计
export function trackEvent(category: string, action: string, label?: string, value?: number) {
  if (typeof window !== "undefined" && window._hmt) {
    window._hmt.push(['_trackEvent', category, action, label, value]);
  }
}

// 类型声明
declare global {
  interface Window {
    _hmt: any[];
  }
}
