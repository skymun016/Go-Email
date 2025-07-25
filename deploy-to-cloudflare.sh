#!/bin/bash

# 🚀 AugMails Cloudflare 部署脚本
# 自动创建Cloudflare资源并部署Go-Email项目

set -e  # 遇到错误立即退出

echo "🚀 开始部署 AugMails 到 Cloudflare..."
echo "📋 配置信息："
echo "   - Web域名: apps.augmails.com"
echo "   - 主邮箱域名: augmails.com"
echo "   - 备用域名: 55mails.com, augmentmails.com, cusmails.com"
echo ""

# 检查是否已登录 Cloudflare
echo "🔐 检查 Cloudflare 登录状态..."
if ! wrangler whoami > /dev/null 2>&1; then
    echo "❌ 请先登录 Cloudflare:"
    echo "   wrangler auth login"
    exit 1
fi

echo "✅ Cloudflare 登录状态正常"
echo ""

# 创建 D1 数据库
echo "📊 创建 D1 数据库..."
DB_OUTPUT=$(wrangler d1 create gomail-database 2>/dev/null || echo "数据库可能已存在")
if [[ $DB_OUTPUT == *"database_id"* ]]; then
    DB_ID=$(echo "$DB_OUTPUT" | grep -o '"database_id": "[^"]*"' | cut -d'"' -f4)
    echo "✅ D1 数据库创建成功，ID: $DB_ID"
else
    echo "⚠️  数据库可能已存在，请手动检查"
fi

# 创建 KV 命名空间
echo "🗄️  创建 KV 命名空间..."
KV_OUTPUT=$(wrangler kv namespace create "gomail-kv" 2>/dev/null || echo "KV可能已存在")
if [[ $KV_OUTPUT == *"id"* ]]; then
    KV_ID=$(echo "$KV_OUTPUT" | grep -o '"id": "[^"]*"' | cut -d'"' -f4)
    echo "✅ KV 命名空间创建成功，ID: $KV_ID"
else
    echo "⚠️  KV 命名空间可能已存在，请手动检查"
fi

# 创建 R2 存储桶
echo "🪣 创建 R2 存储桶..."
R2_OUTPUT=$(wrangler r2 bucket create gomail-attachments 2>/dev/null || echo "R2存储桶可能已存在")
if [[ $R2_OUTPUT == *"Created bucket"* ]]; then
    echo "✅ R2 存储桶创建成功"
else
    echo "⚠️  R2 存储桶可能已存在，请手动检查"
fi

echo ""
echo "📝 请手动更新 config.cjs 文件中的资源ID："
echo ""
if [ ! -z "$DB_ID" ]; then
    echo "数据库ID: $DB_ID"
    echo "请在 config.cjs 中设置: cloudflare.database.id = \"$DB_ID\""
fi
if [ ! -z "$KV_ID" ]; then
    echo "KV ID: $KV_ID"
    echo "请在 config.cjs 中设置: cloudflare.kv.id = \"$KV_ID\""
fi
echo ""

read -p "是否已更新 config.cjs 中的资源ID？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 请先更新 config.cjs 文件中的资源ID，然后重新运行此脚本"
    exit 1
fi

# 重新生成配置文件
echo "🔄 重新生成配置文件..."
npm run generate-configs

# 生成数据库迁移文件
echo "📊 生成数据库迁移文件..."
npm run db:generate

# 执行数据库迁移
echo "🔄 执行数据库迁移..."
npm run db:migrate

# 设置环境变量
echo "🔐 设置环境变量..."
echo "请设置以下环境变量（可选，按需设置）："
echo ""

# 构建项目
echo "🏗️  构建项目..."
npm run build

# 部署到 Cloudflare
echo "🚀 部署到 Cloudflare..."
npm run deploy

echo ""
echo "🎉 部署完成！"
echo ""
echo "📋 后续步骤："
echo "1. 在 Cloudflare Dashboard 中配置域名："
echo "   - 添加域名: apps.augmails.com (Web应用)"
echo "   - 添加域名: augmails.com (邮箱服务)"
echo "   - 添加域名: 55mails.com, augmentmails.com, cusmails.com (备用邮箱)"
echo ""
echo "2. 配置 Email Routing："
echo "   - 为每个邮箱域名启用 Email Routing"
echo "   - 设置 Catch-all 规则指向 Worker"
echo ""
echo "3. 配置 DNS 记录："
echo "   - apps.augmails.com -> CNAME 指向 Worker"
echo "   - 邮箱域名的 MX 记录指向 Cloudflare Email Routing"
echo ""
echo "4. 测试部署："
echo "   - 访问 https://apps.augmails.com"
echo "   - 创建临时邮箱并测试接收邮件"
echo ""
echo "📚 详细配置说明请查看 DEPLOYMENT.md 文件"
