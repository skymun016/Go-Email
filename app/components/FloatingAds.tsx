import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface FloatingAdProps {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  buttonGradientFrom: string;
  buttonGradientTo: string;
  position: 'left' | 'right';
  delay?: number;
}

const FloatingAd: React.FC<FloatingAdProps> = ({
  id,
  title,
  description,
  buttonText,
  buttonUrl,
  icon,
  gradientFrom,
  gradientTo,
  buttonGradientFrom,
  buttonGradientTo,
  position,
  delay = 0,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 检查是否已经被用户关闭过
    const dismissed = localStorage.getItem(`floating-ad-${id}-dismissed`);
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
    localStorage.setItem(`floating-ad-${id}-dismissed`, 'true');
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (isDismissed || !isVisible) {
    return null;
  }

  const positionClasses = position === 'left' 
    ? 'left-4 md:left-6' 
    : 'right-4 md:right-6';

  return (
    <div
      className={`fixed ${positionClasses} bottom-4 md:bottom-6 z-50 transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div
        className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm transition-all duration-300 ${
          isMinimized ? 'w-16 h-16' : 'w-80 max-w-[calc(100vw-2rem)]'
        }`}
      >
        {isMinimized ? (
          // 最小化状态
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
            onClick={handleMinimize}
          >
            <span className="text-2xl">{icon}</span>
          </div>
        ) : (
          // 完整状态
          <div className="p-4">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg">{icon}</span>
                </div>
                <span className="text-white font-semibold text-sm">🚀 完整生态系统</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleMinimize}
                  className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  title="最小化"
                >
                  <span className="text-white text-xs">−</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  title="关闭"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>

            {/* 内容 */}
            <div className="mb-4">
              <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
              <p className="text-white/90 text-sm leading-relaxed">{description}</p>
            </div>

            {/* 按钮 */}
            <a
              href={buttonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${buttonGradientFrom} ${buttonGradientTo} text-white rounded-lg hover:shadow-lg transition-all text-sm font-semibold w-full justify-center`}
            >
              <span>{buttonText}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export const FloatingAds: React.FC = () => {
  return (
    <>
      {/* IDEA Token 池广告 - 左侧 */}
      <FloatingAd
        id="idea-token-pool"
        title="IDEA Token 池"
        description="Augment Token 获取地址，为您的 IDEA 开发提供强大的 AI 支持"
        buttonText="🔗 访问 Token 池"
        buttonUrl="https://augment.184772.xyz"
        icon="🎯"
        gradientFrom="from-orange-500"
        gradientTo="to-red-500"
        buttonGradientFrom="from-orange-600"
        buttonGradientTo="to-red-600"
        position="left"
        delay={3000} // 3秒后显示
      />

      {/* IDEA 无感换号插件广告 - 右侧 */}
      <FloatingAd
        id="idea-plugin"
        title="IDEA 无感换号"
        description="开源 IDEA 插件，实现 Augment 账号无感切换，提升开发效率"
        buttonText="📦 GitHub 仓库"
        buttonUrl="https://github.com/xn030523/augment-token-idea-free.git"
        icon="🔧"
        gradientFrom="from-purple-500"
        gradientTo="to-indigo-500"
        buttonGradientFrom="from-purple-600"
        buttonGradientTo="to-indigo-600"
        position="right"
        delay={5000} // 5秒后显示
      />
    </>
  );
};

export default FloatingAds;
