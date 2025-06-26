// 简单广告条组件 - 基于配置文件
import React from 'react';
import { getActiveAds, type AdConfig } from '~/config/ads';

interface SimpleAdCardProps {
  ad: AdConfig;
}

// 单个广告卡片
const SimpleAdCard: React.FC<SimpleAdCardProps> = ({ ad }) => {
  const handleClick = () => {
    // 在新窗口打开链接
    window.open(ad.buttonUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`${ad.bgColor} rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300 cursor-pointer group`}
      onClick={handleClick}
    >
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
                onError={(e) => {
                  // 如果图片加载失败，显示默认图标
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<span class="${ad.textColor} text-2xl">${ad.icon || '📢'}</span>`;
                  }
                }}
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
        <div className={`inline-flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 ${ad.textColor} rounded-lg transition-all text-xs font-medium group-hover:scale-105`}>
          <span>{ad.buttonText}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    </div>
  );
};

interface SimpleAdsBarProps {
  maxAds?: number;
}

// 简单广告条组件
export const SimpleAdsBar: React.FC<SimpleAdsBarProps> = ({ maxAds = 5 }) => {
  // 从配置文件获取活跃广告
  const activeAds = getActiveAds(maxAds);

  // 如果没有活跃广告，不显示
  if (activeAds.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 max-w-6xl mx-auto px-4">
        {activeAds.map((ad) => (
          <SimpleAdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
};

export default SimpleAdsBar;
