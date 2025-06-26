// 方案二：数据库管理广告
import { drizzle } from 'drizzle-orm/d1';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { eq, and, lte, gte, desc } from 'drizzle-orm';

// 广告表结构
export const ads = sqliteTable('ads', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  buttonText: text('button_text').notNull(),
  buttonUrl: text('button_url').notNull(),
  icon: text('icon'),
  logoUrl: text('logo_url'),
  bgColor: text('bg_color').notNull(),
  textColor: text('text_color').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  priority: integer('priority').notNull().default(999),
  startDate: text('start_date'),
  endDate: text('end_date'),
  clickCount: integer('click_count').notNull().default(0),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  
  // 赞助商信息
  sponsorName: text('sponsor_name'),
  sponsorEmail: text('sponsor_email'),
  sponsorPhone: text('sponsor_phone'),
  monthlyFee: real('monthly_fee').default(0),
  contractStartDate: text('contract_start_date'),
  contractEndDate: text('contract_end_date'),
});

export type Ad = typeof ads.$inferSelect;
export type NewAd = typeof ads.$inferInsert;

// 广告管理类
export class AdsManager {
  constructor(private db: ReturnType<typeof drizzle>) {}

  // 获取活跃广告
  async getActiveAds(maxCount: number = 5): Promise<Ad[]> {
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    
    return await this.db
      .select()
      .from(ads)
      .where(
        and(
          eq(ads.isActive, true),
          // 检查开始日期
          ads.startDate ? gte(now, ads.startDate) : undefined,
          // 检查结束日期  
          ads.endDate ? lte(now, ads.endDate) : undefined
        )
      )
      .orderBy(ads.priority)
      .limit(maxCount);
  }

  // 获取所有广告（管理后台用）
  async getAllAds(): Promise<Ad[]> {
    return await this.db
      .select()
      .from(ads)
      .orderBy(ads.priority);
  }

  // 添加广告
  async addAd(ad: NewAd): Promise<void> {
    const now = new Date().toISOString();
    await this.db.insert(ads).values({
      ...ad,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 更新广告
  async updateAd(id: string, updates: Partial<NewAd>): Promise<void> {
    await this.db
      .update(ads)
      .set({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ads.id, id));
  }

  // 删除广告
  async deleteAd(id: string): Promise<void> {
    await this.db.delete(ads).where(eq(ads.id, id));
  }

  // 增加点击统计
  async incrementClick(id: string): Promise<void> {
    const ad = await this.db
      .select({ clickCount: ads.clickCount })
      .from(ads)
      .where(eq(ads.id, id))
      .get();
    
    if (ad) {
      await this.db
        .update(ads)
        .set({ clickCount: ad.clickCount + 1 })
        .where(eq(ads.id, id));
    }
  }

  // 增加展示统计
  async incrementView(id: string): Promise<void> {
    const ad = await this.db
      .select({ viewCount: ads.viewCount })
      .from(ads)
      .where(eq(ads.id, id))
      .get();
    
    if (ad) {
      await this.db
        .update(ads)
        .set({ viewCount: ad.viewCount + 1 })
        .where(eq(ads.id, id));
    }
  }

  // 获取广告统计
  async getAdStats(id: string): Promise<{ clickCount: number; viewCount: number; ctr: number } | null> {
    const ad = await this.db
      .select({
        clickCount: ads.clickCount,
        viewCount: ads.viewCount,
      })
      .from(ads)
      .where(eq(ads.id, id))
      .get();
    
    if (!ad) return null;
    
    const ctr = ad.viewCount > 0 ? (ad.clickCount / ad.viewCount) * 100 : 0;
    
    return {
      clickCount: ad.clickCount,
      viewCount: ad.viewCount,
      ctr: Math.round(ctr * 100) / 100, // 保留2位小数
    };
  }
}

// 初始化数据库表的SQL
export const createAdsTableSQL = `
CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  button_text TEXT NOT NULL,
  button_url TEXT NOT NULL,
  icon TEXT,
  logo_url TEXT,
  bg_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 999,
  start_date TEXT,
  end_date TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sponsor_name TEXT,
  sponsor_email TEXT,
  sponsor_phone TEXT,
  monthly_fee REAL DEFAULT 0,
  contract_start_date TEXT,
  contract_end_date TEXT
);
`;

// 插入默认广告数据
export const insertDefaultAdsSQL = `
INSERT OR IGNORE INTO ads (
  id, title, description, button_text, button_url, logo_url, bg_color, text_color,
  is_active, priority, created_at, updated_at
) VALUES 
('xichen-cloud', '兮辰云专业服务器', '高性能云服务器，稳定可靠，价格实惠', '☁️ 访问官网', 
 'https://idc.xicheny.com', 'https://idc.xicheny.com/msg/logo2.png', 
 'bg-gradient-to-br from-blue-500 to-cyan-500', 'text-white', 1, 1, 
 datetime('now'), datetime('now')),
 
('idea-token-pool', 'IDEA Token 池', 'Augment Token 获取地址，AI 开发支持', '🔗 访问 Token 池',
 'https://augment.184772.xyz', NULL, 'bg-gradient-to-br from-orange-500 to-red-500', 
 'text-white', 1, 2, datetime('now'), datetime('now')),
 
('idea-plugin', 'IDEA 无感换号插件', '开源插件，账号无感切换', '📦 GitHub 仓库',
 'https://github.com/xn030523/augment-token-idea-free.git', NULL, 
 'bg-gradient-to-br from-purple-500 to-indigo-500', 'text-white', 1, 3, 
 datetime('now'), datetime('now'));
`;
