// 方案三：动态广告组件
import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

export interface DynamicAd {
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
  priority: number;
  startDate?: string;
  endDate?: string;
  clickCount?: number;
  viewCount?: number;
}

interface DynamicAdCardProps {
  ad: DynamicAd;
  onView: (id: string) => void;
  onClick: (id: string) => void;
  onDismiss: (id: string) => void;
}

// 单个广告卡片组件
const DynamicAdCard: React.FC<DynamicAdCardProps> = ({ ad, onView, onClick, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 检查是否已被关闭
    const dismissed = localStorage.getItem(`dynamic-ad-${ad.id}-dismissed`);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // 延迟显示并统计展示
    const timer = setTimeout(() => {
      setIsVisible(true);
      onView(ad.id);
    }, ad.priority * 500); // 根据优先级延迟显示

    return () => clearTimeout(timer);
  }, [ad.id, ad.priority, onView]);

  const handleClick = () => {
    onClick(ad.id);
    window.open(ad.buttonUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem(`dynamic-ad-${ad.id}-dismissed`, 'true');
    onDismiss(ad.id);
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <div
      className={`${ad.bgColor} rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300 cursor-pointer group ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
      onClick={handleClick}
    >
      {/* 关闭按钮 */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleDismiss}
          className="w-5 h-5 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
          title="关闭广告"
        >
          <X className={`w-3 h-3 ${ad.textColor}`} />
        </button>
      </div>

      {/* 广告内容 */}
      <div className="flex flex-col items-center text-center">
        {/* Logo或图标 */}
        <div className="mb-3">
          {ad.logoUrl ? (
            <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
              <img 
                src={ad.logoUrl} 
                alt={ad.title} 
                className="w-10 h-10 object-contain"
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className={`${ad.textColor} text-2xl`}>{ad.icon || '📢'}</span>
            </div>
          )}
        </div>

        {/* 标题 */}
        <h4 className={`${ad.textColor} font-bold text-sm mb-2 line-clamp-1`}>
          {ad.title}
        </h4>

        {/* 描述 */}
        <p className={`${ad.textColor} text-xs mb-3 opacity-90 line-clamp-2 leading-relaxed`}>
          {ad.description}
        </p>

        {/* 按钮 */}
        <div className={`inline-flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 ${ad.textColor} rounded-lg transition-all text-xs font-medium`}>
          <span>{ad.buttonText}</span>
          <ExternalLink className="w-3 h-3" />
        </div>

        {/* 统计信息（仅开发模式显示） */}
        {process.env.NODE_ENV === 'development' && (
          <div className={`${ad.textColor} text-xs opacity-50 mt-2`}>
            👁️ {ad.viewCount || 0} | 🖱️ {ad.clickCount || 0}
          </div>
        )}
      </div>
    </div>
  );
};

interface DynamicAdsBarProps {
  maxAds?: number;
  dataSource?: 'config' | 'api' | 'database';
  apiEndpoint?: string;
  onAdInteraction?: (action: 'view' | 'click' | 'dismiss', adId: string) => void;
}

// 动态广告条组件
export const DynamicAdsBar: React.FC<DynamicAdsBarProps> = ({
  maxAds = 5,
  dataSource = 'config',
  apiEndpoint = '/api/ads',
  onAdInteraction
}) => {
  const [ads, setAds] = useState<DynamicAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载广告数据
  useEffect(() => {
    const loadAds = async () => {
      try {
        setLoading(true);
        let adsData: DynamicAd[] = [];

        switch (dataSource) {
          case 'api':
            const response = await fetch(apiEndpoint);
            if (!response.ok) throw new Error('Failed to fetch ads');
            adsData = await response.json();
            break;
            
          case 'database':
            // 这里可以调用数据库API
            const dbResponse = await fetch('/api/ads/active');
            if (!dbResponse.ok) throw new Error('Failed to fetch ads from database');
            adsData = await dbResponse.json();
            break;
            
          case 'config':
          default:
            // 使用配置文件数据
            const { getActiveAds } = await import('../config/ads');
            adsData = getActiveAds(maxAds);
            break;
        }

        setAds(adsData.slice(0, maxAds));
        setError(null);
      } catch (err) {
        console.error('Failed to load ads:', err);
        setError('加载广告失败');
      } finally {
        setLoading(false);
      }
    };

    loadAds();
  }, [dataSource, apiEndpoint, maxAds]);

  // 处理广告交互
  const handleAdInteraction = (action: 'view' | 'click' | 'dismiss', adId: string) => {
    // 更新本地统计
    setAds(prevAds => 
      prevAds.map(ad => 
        ad.id === adId 
          ? { 
              ...ad, 
              clickCount: action === 'click' ? (ad.clickCount || 0) + 1 : ad.clickCount,
              viewCount: action === 'view' ? (ad.viewCount || 0) + 1 : ad.viewCount
            }
          : ad
      )
    );

    // 发送统计到服务器
    if (dataSource !== 'config') {
      fetch(`/api/ads/${adId}/${action}`, { method: 'POST' }).catch(console.error);
    }

    // 调用外部回调
    onAdInteraction?.(action, adId);
  };

  if (loading) {
    return (
      <div className="w-full mb-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-6xl mx-auto px-4">
          {Array.from({ length: maxAds }).map((_, index) => (
            <div key={index} className="bg-gray-200 rounded-xl p-4 animate-pulse">
              <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-3"></div>
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded mb-3"></div>
              <div className="h-8 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mb-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-6xl mx-auto px-4">
        {ads.map((ad) => (
          <DynamicAdCard
            key={ad.id}
            ad={ad}
            onView={handleAdInteraction.bind(null, 'view')}
            onClick={handleAdInteraction.bind(null, 'click')}
            onDismiss={handleAdInteraction.bind(null, 'dismiss')}
          />
        ))}
      </div>
    </div>
  );
};

export default DynamicAdsBar;
