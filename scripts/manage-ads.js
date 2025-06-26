#!/usr/bin/env node

/**
 * 广告管理工具
 * 用于快速管理首页小块广告
 */

const fs = require('fs');
const path = require('path');

const ADS_CONFIG_PATH = path.join(__dirname, '../app/config/ads.ts');

// 广告模板
const AD_TEMPLATES = {
  sponsor: {
    bgColor: "bg-gradient-to-br from-green-500 to-emerald-500",
    textColor: "text-white",
    icon: "💎",
    buttonText: "💰 成为赞助商",
    buttonUrl: "/contact",
    isActive: false
  },
  tech: {
    bgColor: "bg-gradient-to-br from-blue-500 to-cyan-500",
    textColor: "text-white",
    icon: "🔧",
    buttonText: "🔗 了解更多",
    isActive: true
  },
  service: {
    bgColor: "bg-gradient-to-br from-purple-500 to-indigo-500",
    textColor: "text-white",
    icon: "🌟",
    buttonText: "☁️ 访问服务",
    isActive: true
  }
};

/**
 * 读取当前广告配置
 */
function readAdsConfig() {
  try {
    const content = fs.readFileSync(ADS_CONFIG_PATH, 'utf8');
    // 简单的解析，实际项目中可能需要更复杂的解析
    const match = content.match(/export const adsConfig: AdConfig\[\] = (\[[\s\S]*?\]);/);
    if (match) {
      // 这里简化处理，实际应该用更安全的方式解析
      return eval(match[1]);
    }
    return [];
  } catch (error) {
    console.error('读取广告配置失败:', error.message);
    return [];
  }
}

/**
 * 写入广告配置
 */
function writeAdsConfig(ads) {
  try {
    const configContent = `// 广告配置文件 - 自动生成，请勿手动编辑
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
  priority: number;
  startDate?: string;
  endDate?: string;
  clickCount?: number;
  viewCount?: number;
}

// 广告配置数据
export const adsConfig: AdConfig[] = ${JSON.stringify(ads, null, 2)};

// 获取活跃的广告（最多5个）
export function getActiveAds(maxCount: number = 5): AdConfig[] {
  const now = new Date();
  
  return adsConfig
    .filter(ad => {
      if (!ad.isActive) return false;
      if (ad.startDate && new Date(ad.startDate) > now) return false;
      if (ad.endDate && new Date(ad.endDate) < now) return false;
      return true;
    })
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxCount);
}

// 更新广告配置
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
}`;

    fs.writeFileSync(ADS_CONFIG_PATH, configContent);
    console.log('✅ 广告配置已更新');
    return true;
  } catch (error) {
    console.error('❌ 写入广告配置失败:', error.message);
    return false;
  }
}

/**
 * 显示当前广告列表
 */
function listAds() {
  const ads = readAdsConfig();
  
  console.log('\n📋 当前广告列表:');
  console.log('='.repeat(80));
  
  if (ads.length === 0) {
    console.log('暂无广告');
    return;
  }

  ads.forEach((ad, index) => {
    const status = ad.isActive ? '🟢 激活' : '🔴 停用';
    console.log(`${index + 1}. [${ad.id}] ${ad.title}`);
    console.log(`   状态: ${status} | 优先级: ${ad.priority}`);
    console.log(`   描述: ${ad.description}`);
    console.log(`   链接: ${ad.buttonUrl}`);
    if (ad.logoUrl) console.log(`   Logo: ${ad.logoUrl}`);
    console.log('');
  });
}

/**
 * 添加新广告
 */
function addAd(options) {
  const ads = readAdsConfig();
  
  const template = AD_TEMPLATES[options.template] || AD_TEMPLATES.sponsor;
  
  const newAd = {
    id: options.id,
    title: options.title,
    description: options.description,
    buttonText: options.buttonText || template.buttonText,
    buttonUrl: options.url,
    icon: options.icon || template.icon,
    logoUrl: options.logo,
    bgColor: options.bgColor || template.bgColor,
    textColor: options.textColor || template.textColor,
    isActive: options.active !== false,
    priority: options.priority || (ads.length + 1),
    startDate: options.startDate,
    endDate: options.endDate,
    clickCount: 0,
    viewCount: 0
  };

  // 检查ID是否已存在
  if (ads.find(ad => ad.id === newAd.id)) {
    console.error(`❌ 广告ID "${newAd.id}" 已存在`);
    return false;
  }

  ads.push(newAd);
  
  if (writeAdsConfig(ads)) {
    console.log(`✅ 广告 "${newAd.title}" 添加成功`);
    return true;
  }
  
  return false;
}

/**
 * 更新广告状态
 */
function toggleAd(id) {
  const ads = readAdsConfig();
  const ad = ads.find(a => a.id === id);
  
  if (!ad) {
    console.error(`❌ 未找到ID为 "${id}" 的广告`);
    return false;
  }

  ad.isActive = !ad.isActive;
  
  if (writeAdsConfig(ads)) {
    const status = ad.isActive ? '激活' : '停用';
    console.log(`✅ 广告 "${ad.title}" 已${status}`);
    return true;
  }
  
  return false;
}

/**
 * 删除广告
 */
function removeAd(id) {
  const ads = readAdsConfig();
  const index = ads.findIndex(a => a.id === id);
  
  if (index === -1) {
    console.error(`❌ 未找到ID为 "${id}" 的广告`);
    return false;
  }

  const removedAd = ads.splice(index, 1)[0];
  
  if (writeAdsConfig(ads)) {
    console.log(`✅ 广告 "${removedAd.title}" 已删除`);
    return true;
  }
  
  return false;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🎯 广告管理工具

用法:
  node manage-ads.js <命令> [选项]

命令:
  list                     显示所有广告
  add                      添加新广告
  toggle <id>              切换广告状态
  remove <id>              删除广告

添加广告选项:
  --id <id>               广告ID (必需)
  --title <title>         广告标题 (必需)
  --description <desc>    广告描述 (必需)
  --url <url>             广告链接 (必需)
  --template <type>       模板类型 (sponsor|tech|service)
  --icon <icon>           图标 emoji
  --logo <url>            Logo URL
  --priority <num>        优先级 (数字越小越靠前)
  --active <true|false>   是否激活 (默认true)

示例:
  # 显示广告列表
  node manage-ads.js list

  # 添加赞助商广告
  node manage-ads.js add --id "new-sponsor" --title "新赞助商" --description "优质服务提供商" --url "https://example.com" --template sponsor

  # 切换广告状态
  node manage-ads.js toggle xichen-cloud

  # 删除广告
  node manage-ads.js remove sponsor-slot-1
`);
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      listAds();
      break;

    case 'add': {
      const options = {};
      for (let i = 1; i < args.length; i += 2) {
        const key = args[i].replace('--', '');
        const value = args[i + 1];
        options[key] = value;
      }

      if (!options.id || !options.title || !options.description || !options.url) {
        console.error('❌ 缺少必需参数: --id, --title, --description, --url');
        showHelp();
        process.exit(1);
      }

      addAd(options);
      break;
    }

    case 'toggle': {
      const id = args[1];
      if (!id) {
        console.error('❌ 请提供广告ID');
        process.exit(1);
      }
      toggleAd(id);
      break;
    }

    case 'remove': {
      const id = args[1];
      if (!id) {
        console.error('❌ 请提供广告ID');
        process.exit(1);
      }
      removeAd(id);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      console.error('❌ 未知命令:', command);
      showHelp();
      process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  listAds,
  addAd,
  toggleAd,
  removeAd
};
