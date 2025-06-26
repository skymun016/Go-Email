// 广告配置文件 - 方案一：简单配置
export interface AdConfig {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  icon?: string;
  logoUrl?: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  priority: number; // 显示优先级，数字越小越靠前
  startDate?: string; // 开始显示日期
  endDate?: string; // 结束显示日期
  clickCount?: number; // 点击统计
  viewCount?: number; // 展示统计
}

// 广告配置数据
export const adsConfig: AdConfig[] = [
  {
    id: "xichen-cloud",
    title: "兮辰云专业服务器",
    description: "高性能云服务器，稳定可靠，价格实惠。多地域机房，BGP多线接入",
    buttonText: "☁️ 访问官网",
    buttonUrl: "https://idc.xicheny.com",
    logoUrl: "https://idc.xicheny.com/msg/logo2.png",
    bgColor: "bg-gradient-to-br from-blue-500 to-cyan-500",
    textColor: "text-white",
    isActive: true,
    priority: 1
    // 移除了过期的时间限制
  },
  {
    id: "idea-token-pool",
    title: "IDEA Token 池",
    description: "Augment Token 获取地址，为您的 IDEA 开发提供强大的 AI 支持",
    buttonText: "🔗 访问 Token 池",
    buttonUrl: "https://augment.184772.xyz",
    icon: "🎯",
    bgColor: "bg-gradient-to-br from-orange-500 to-red-500",
    textColor: "text-white",
    isActive: true,
    priority: 2
  },
  {
    id: "idea-plugin",
    title: "IDEA 无感换号插件",
    description: "开源 IDEA 插件，实现 Augment 账号无感切换，提升开发效率",
    buttonText: "📦 GitHub 仓库",
    buttonUrl: "https://github.com/xn030523/augment-token-idea-free.git",
    icon: "🔧",
    bgColor: "bg-gradient-to-br from-purple-500 to-indigo-500",
    textColor: "text-white",
    isActive: true,
    priority: 3
  },
  {
    id: "sponsor-slot-1",
    title: "赞助商位置1",
    description: "这里可以展示您的产品或服务，联系我们获取更多信息",
    buttonText: "💰 成为赞助商",
    buttonUrl: "/contact",
    icon: "💎",
    bgColor: "bg-gradient-to-br from-green-500 to-emerald-500",
    textColor: "text-white",
    isActive: true,
    priority: 4
  },
  {
    id: "sponsor-slot-2",
    title: "赞助商位置2",
    description: "优质广告位，高曝光率，精准用户群体",
    buttonText: "📞 联系合作",
    buttonUrl: "/contact",
    icon: "🌟",
    bgColor: "bg-gradient-to-br from-pink-500 to-rose-500",
    textColor: "text-white",
    isActive: true,
    priority: 5
  }
];

// 获取活跃的广告（最多5个）
export function getActiveAds(maxCount: number = 5): AdConfig[] {
  const now = new Date();
  
  return adsConfig
    .filter(ad => {
      // 检查是否激活
      if (!ad.isActive) return false;
      
      // 检查日期范围
      if (ad.startDate && new Date(ad.startDate) > now) return false;
      if (ad.endDate && new Date(ad.endDate) < now) return false;
      
      return true;
    })
    .sort((a, b) => a.priority - b.priority) // 按优先级排序
    .slice(0, maxCount); // 限制数量
}

// 更新广告配置（用于管理后台）
export function updateAdConfig(id: string, updates: Partial<AdConfig>): boolean {
  const index = adsConfig.findIndex(ad => ad.id === id);
  if (index === -1) return false;
  
  adsConfig[index] = { ...adsConfig[index], ...updates };
  return true;
}

// 添加新广告
export function addAdConfig(ad: AdConfig): void {
  adsConfig.push(ad);
}

// 删除广告
export function removeAdConfig(id: string): boolean {
  const index = adsConfig.findIndex(ad => ad.id === id);
  if (index === -1) return false;
  
  adsConfig.splice(index, 1);
  return true;
}
