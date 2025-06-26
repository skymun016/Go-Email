import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// 小块广告组件
interface SmallAdProps {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  icon?: string;
  logoUrl?: string;
  bgColor: string;
  textColor: string;
  delay: number;
}

const SmallAd: React.FC<SmallAdProps> = ({
  id,
  title,
  description,
  buttonText,
  buttonUrl,
  icon,
  logoUrl,
  bgColor,
  textColor,
  delay,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 检查是否已经被用户关闭过
    const dismissed = localStorage.getItem(`small-ad-${id}-dismissed`);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // 延迟显示广告
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [id, delay]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem(`small-ad-${id}-dismissed`, 'true');
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  return (
    <div
      className={`${bgColor} rounded-xl shadow-lg border border-white/20 p-4 hover:shadow-xl transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-white/20">
              <img 
                src={logoUrl} 
                alt={title} 
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className={`${textColor} text-lg`}>{icon}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className={`${textColor} font-semibold text-sm truncate`}>{title}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="w-5 h-5 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          title="关闭"
        >
          <X className={`w-3 h-3 ${textColor}`} />
        </button>
      </div>
      
      <p className={`${textColor} text-xs mb-3 leading-relaxed opacity-90`}>
        {description}
      </p>
      
      <a
        href={buttonUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 ${textColor} rounded-lg transition-all text-xs font-semibold w-full justify-center`}
      >
        <span>{buttonText}</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
};

// 广告横条容器组件
export const SmallAdsBar: React.FC = () => {
  return (
    <div className="w-full mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto px-4">
        {/* 兮辰云广告 */}
        <SmallAd
          id="xichen-cloud"
          title="兮辰云专业服务器"
          description="高性能云服务器，稳定可靠，价格实惠。多地域机房，BGP多线接入，7x24小时技术支持"
          buttonText="☁️ 访问官网"
          buttonUrl="https://idc.xicheny.com"
          logoUrl="https://idc.xicheny.com/msg/logo2.png"
          bgColor="bg-gradient-to-br from-blue-500 to-cyan-500"
          textColor="text-white"
          delay={1000}
        />

        {/* IDEA Token 池广告 */}
        <SmallAd
          id="idea-token-pool"
          title="IDEA Token 池"
          description="Augment Token 获取地址，为您的 IDEA 开发提供强大的 AI 支持，提升编程效率"
          buttonText="🔗 访问 Token 池"
          buttonUrl="https://augment.184772.xyz"
          icon="🎯"
          bgColor="bg-gradient-to-br from-orange-500 to-red-500"
          textColor="text-white"
          delay={2000}
        />

        {/* IDEA 无感换号插件广告 */}
        <SmallAd
          id="idea-plugin"
          title="IDEA 无感换号插件"
          description="开源 IDEA 插件，实现 Augment 账号无感切换，提升开发效率，完全免费使用"
          buttonText="📦 GitHub 仓库"
          buttonUrl="https://github.com/xn030523/augment-token-idea-free.git"
          icon="🔧"
          bgColor="bg-gradient-to-br from-purple-500 to-indigo-500"
          textColor="text-white"
          delay={3000}
        />
      </div>
    </div>
  );
};

export default SmallAdsBar;
