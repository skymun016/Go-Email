/**
 * Telegram 推送服务
 * 基于 moepush 项目实现，用于发送邮件通知到 Telegram
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
}

export interface EmailNotification {
  from: string;
  to: string;
  subject: string;
  textContent?: string;
  receivedAt: Date;
  mailboxEmail: string;
}

/**
 * Telegram 推送服务类
 */
export class TelegramPushService {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * 发送邮件通知到 Telegram
   */
  async sendEmailNotification(notification: EmailNotification): Promise<boolean> {
    if (!this.config.enabled || !this.config.botToken || !this.config.chatId) {
      console.log('Telegram 推送未启用或配置不完整');
      return false;
    }

    try {
      const message = this.formatEmailMessage(notification);
      await this.sendMessage(message);
      console.log(`✅ Telegram 邮件通知发送成功: ${notification.subject}`);
      return true;
    } catch (error) {
      console.error('❌ Telegram 邮件通知发送失败:', error);
      return false;
    }
  }

  /**
   * 格式化邮件消息为 Telegram 消息
   */
  private formatEmailMessage(notification: EmailNotification): TelegramMessage {
    const { from, to, subject, textContent, receivedAt, mailboxEmail } = notification;
    
    // 截取邮件内容预览（最多200字符）
    const preview = textContent 
      ? textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '')
      : '(无文本内容)';

    // 格式化时间
    const timeStr = receivedAt.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // 使用 HTML 格式构建消息
    const text = `
📧 <b>新邮件通知</b>

📮 <b>邮箱:</b> <code>${mailboxEmail}</code>
👤 <b>发件人:</b> <code>${from}</code>
📝 <b>主题:</b> ${this.escapeHtml(subject || '(无主题)')}
🕐 <b>时间:</b> ${timeStr}

📄 <b>内容预览:</b>
<pre>${this.escapeHtml(preview)}</pre>

🔗 <a href="https://${process.env.DOMAIN || 'your-domain.com'}/inbox/${encodeURIComponent(mailboxEmail)}">查看完整邮件</a>
    `.trim();

    return {
      chat_id: this.config.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      disable_notification: false
    };
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 发送消息到 Telegram
   */
  private async sendMessage(message: TelegramMessage): Promise<void> {
    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorData = await response.json() as { description?: string };
      throw new Error(`Telegram API 错误: ${errorData.description || response.statusText}`);
    }

    const result = await response.json();
    console.log('Telegram 消息发送成功:', result);
  }

  /**
   * 测试 Telegram 配置是否有效
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.botToken || !this.config.chatId) {
      return { success: false, error: '缺少 Bot Token 或 Chat ID' };
    }

    try {
      const testMessage: TelegramMessage = {
        chat_id: this.config.chatId,
        text: '🤖 GoMail 邮件推送服务测试消息\n\n如果您收到此消息，说明 Telegram 推送配置成功！',
        parse_mode: 'HTML'
      };

      await this.sendMessage(testMessage);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      };
    }
  }
}

/**
 * 创建 Telegram 推送服务实例
 */
export function createTelegramPushService(config: TelegramConfig): TelegramPushService {
  return new TelegramPushService(config);
}

/**
 * 验证 Telegram 配置
 */
export function validateTelegramConfig(config: Partial<TelegramConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.botToken) {
    errors.push('Bot Token 不能为空');
  } else if (!config.botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
    errors.push('Bot Token 格式不正确');
  }

  if (!config.chatId) {
    errors.push('Chat ID 不能为空');
  } else if (!config.chatId.match(/^-?\d+$/)) {
    errors.push('Chat ID 必须是数字');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 获取 Telegram Bot 信息
 */
export async function getTelegramBotInfo(botToken: string): Promise<{
  success: boolean;
  botInfo?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  error?: string;
}> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    
    if (!response.ok) {
      const errorData = await response.json() as { description?: string };
      return { 
        success: false, 
        error: errorData.description || 'API 请求失败' 
      };
    }

    const result = await response.json() as { 
      ok: boolean; 
      result: any; 
      description?: string; 
    };
    
    if (!result.ok) {
      return { 
        success: false, 
        error: result.description || '获取 Bot 信息失败' 
      };
    }

    return {
      success: true,
      botInfo: result.result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    };
  }
}
