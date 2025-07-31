#!/bin/bash

# 🗄️ Go-Email 数据库备份脚本
# 用于备份Cloudflare D1数据库

set -e

# 配置
DATABASE_NAME="gomail-database"
BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup-${TIMESTAMP}.sql"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗄️ Go-Email 数据库备份工具${NC}"
echo "=================================="

# 创建备份目录
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📁 创建备份目录: $BACKUP_DIR${NC}"
    mkdir -p "$BACKUP_DIR"
fi

# 检查wrangler是否已登录
echo -e "${BLUE}🔐 检查Cloudflare登录状态...${NC}"
if ! npx wrangler whoami > /dev/null 2>&1; then
    echo -e "${RED}❌ 未登录Cloudflare，请先运行: npx wrangler login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Cloudflare登录状态正常${NC}"

# 执行备份
echo -e "${BLUE}📦 开始备份数据库: $DATABASE_NAME${NC}"
echo -e "${YELLOW}⏳ 备份文件: $BACKUP_FILE${NC}"

if npx wrangler d1 export "$DATABASE_NAME" --remote --output "$BACKUP_FILE"; then
    echo -e "${GREEN}✅ 数据库备份成功！${NC}"
    
    # 显示备份文件信息
    if [ -f "$BACKUP_FILE" ]; then
        FILE_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
        echo -e "${GREEN}📊 备份文件大小: $FILE_SIZE${NC}"
        echo -e "${GREEN}📍 备份文件路径: $BACKUP_FILE${NC}"
        
        # 显示备份内容摘要
        echo -e "${BLUE}📋 备份内容摘要:${NC}"
        echo "   - 数据库: $DATABASE_NAME"
        echo "   - 时间戳: $TIMESTAMP"
        echo "   - 包含表:"
        grep -i "CREATE TABLE" "$BACKUP_FILE" | sed 's/CREATE TABLE /     • /' | sed 's/ (//' | head -10
        
        TABLE_COUNT=$(grep -c "CREATE TABLE" "$BACKUP_FILE")
        echo "   - 总表数: $TABLE_COUNT"
        
        # 检查是否有数据
        INSERT_COUNT=$(grep -c "INSERT INTO" "$BACKUP_FILE" || echo "0")
        echo "   - 数据记录: $INSERT_COUNT 条INSERT语句"
        
    else
        echo -e "${RED}❌ 备份文件未找到${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ 数据库备份失败${NC}"
    exit 1
fi

# 清理旧备份（保留最近10个）
echo -e "${BLUE}🧹 清理旧备份文件...${NC}"
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup-*.sql 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}📦 发现 $BACKUP_COUNT 个备份文件，保留最新的10个${NC}"
    ls -1t "$BACKUP_DIR"/backup-*.sql | tail -n +11 | xargs rm -f
    echo -e "${GREEN}✅ 旧备份文件清理完成${NC}"
else
    echo -e "${GREEN}✅ 备份文件数量正常 ($BACKUP_COUNT/10)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 备份完成！${NC}"
echo -e "${BLUE}💡 使用说明:${NC}"
echo "   • 恢复备份: npx wrangler d1 execute $DATABASE_NAME --file=$BACKUP_FILE"
echo "   • 查看备份: cat $BACKUP_FILE"
echo "   • 备份目录: $BACKUP_DIR"
echo ""
echo -e "${YELLOW}⚠️  注意: 备份文件包含敏感数据，请妥善保管${NC}"
