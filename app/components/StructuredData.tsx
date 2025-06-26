import React from 'react';

interface StructuredDataProps {
  type: 'WebApplication' | 'Organization' | 'WebSite';
  data: any;
}

export const StructuredData: React.FC<StructuredDataProps> = ({ type, data }) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": type,
    ...data
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2)
      }}
    />
  );
};

// 网站应用结构化数据
export const WebApplicationStructuredData: React.FC = () => {
  const data = {
    name: "GoMail",
    description: "免费临时邮箱服务，保护您的隐私，避免垃圾邮件骚扰",
    url: "https://184772.xyz",
    applicationCategory: "UtilityApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      description: "完全免费的临时邮箱服务"
    },
    featureList: [
      "24小时有效期",
      "无需注册",
      "支持附件下载",
      "实时邮件接收",
      "完全匿名"
    ],
    screenshot: "https://184772.xyz/screenshot.png",
    author: {
      "@type": "Organization",
      name: "GoMail Team"
    }
  };

  return <StructuredData type="WebApplication" data={data} />;
};

// 组织结构化数据
export const OrganizationStructuredData: React.FC = () => {
  const data = {
    name: "GoMail",
    description: "专业的临时邮箱服务提供商",
    url: "https://184772.xyz",
    logo: "https://184772.xyz/logo.png",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: "https://184772.xyz/contact"
    },
    sameAs: [
      "https://github.com/your-username/gomail"
    ]
  };

  return <StructuredData type="Organization" data={data} />;
};

// 网站结构化数据
export const WebSiteStructuredData: React.FC = () => {
  const data = {
    name: "GoMail - 免费临时邮箱",
    description: "提供免费、安全、匿名的临时邮箱服务",
    url: "https://184772.xyz",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://184772.xyz/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    publisher: {
      "@type": "Organization",
      name: "GoMail Team"
    }
  };

  return <StructuredData type="WebSite" data={data} />;
};
