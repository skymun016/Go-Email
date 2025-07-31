#!/bin/bash

# 🕐 Go-Email 数据库时间点管理脚本
# 用于管理Cloudflare D1数据库的时间点恢复功能

set -e

# 配置
DATABASE_NAME="gomail-database"
TIMEPOINTS_FILE="backups/timepoints.md"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}🕐 Go-Email 时间点管理工具${NC}"
    echo "=================================="
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  info     - 查看当前时间点信息"
    echo "  list     - 列出已记录的时间点"
    echo "  save     - 保存当前时间点"
    echo "  restore  - 恢复到指定时间点"
    echo "  help     - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 info                    # 查看当前时间点"
    echo "  $0 save \"添加新功能后\"     # 保存当前时间点"
    echo "  $0 restore                 # 交互式恢复"
    echo ""
}

# 检查wrangler登录状态
check_login() {
    if ! npx wrangler whoami > /dev/null 2>&1; then
        echo -e "${RED}❌ 未登录Cloudflare，请先运行: npx wrangler login${NC}"
        exit 1
    fi
}

# 查看当前时间点信息
show_timepoint_info() {
    echo -e "${BLUE}🕐 查看当前时间点信息...${NC}"
    echo ""
    
    # 获取时间点信息
    TIMEPOINT_INFO=$(npx wrangler d1 time-travel info "$DATABASE_NAME" 2>/dev/null)
    
    if echo "$TIMEPOINT_INFO" | grep -q "bookmark"; then
        BOOKMARK=$(echo "$TIMEPOINT_INFO" | grep "current bookmark is" | grep -o "'[^']*'" | tr -d "'")
        echo -e "${GREEN}✅ 当前时间点书签:${NC}"
        echo -e "${YELLOW}   $BOOKMARK${NC}"
        echo ""
        echo -e "${BLUE}📋 恢复命令:${NC}"
        echo "   npx wrangler d1 time-travel restore $DATABASE_NAME --bookmark=$BOOKMARK"
        echo ""
        
        # 显示时间戳
        CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        echo -e "${BLUE}🕐 当前时间 (UTC):${NC} $CURRENT_TIME"
        echo -e "${BLUE}🕐 当前时间 (本地):${NC} $(date)"
    else
        echo -e "${YELLOW}⚠️  未找到时间点信息${NC}"
    fi
}

# 列出已记录的时间点
list_timepoints() {
    echo -e "${BLUE}📋 已记录的时间点:${NC}"
    echo ""
    
    if [ -f "$TIMEPOINTS_FILE" ]; then
        # 提取书签信息
        grep -A 5 "书签ID" "$TIMEPOINTS_FILE" | head -20
    else
        echo -e "${YELLOW}⚠️  时间点记录文件不存在: $TIMEPOINTS_FILE${NC}"
    fi
}

# 保存当前时间点
save_timepoint() {
    local description="$1"
    
    if [ -z "$description" ]; then
        echo -e "${YELLOW}📝 请输入时间点描述:${NC}"
        read -r description
    fi
    
    if [ -z "$description" ]; then
        description="手动保存的时间点"
    fi
    
    echo -e "${BLUE}💾 保存当前时间点...${NC}"
    
    # 获取当前时间点
    TIMEPOINT_INFO=$(npx wrangler d1 time-travel info "$DATABASE_NAME" 2>/dev/null)
    
    if echo "$TIMEPOINT_INFO" | grep -q "bookmark"; then
        BOOKMARK=$(echo "$TIMEPOINT_INFO" | grep "current bookmark is" | grep -o "'[^']*'" | tr -d "'")
        CURRENT_TIME=$(date)
        CURRENT_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        
        # 添加到时间点文件
        echo "" >> "$TIMEPOINTS_FILE"
        echo "### $(date '+%Y-%m-%d %H:%M')" >> "$TIMEPOINTS_FILE"
        echo "- **时间**: $CURRENT_TIME" >> "$TIMEPOINTS_FILE"
        echo "- **UTC时间**: $CURRENT_UTC" >> "$TIMEPOINTS_FILE"
        echo "- **书签ID**: \`$BOOKMARK\`" >> "$TIMEPOINTS_FILE"
        echo "- **描述**: $description" >> "$TIMEPOINTS_FILE"
        echo "- **状态**: ✅ 已保存" >> "$TIMEPOINTS_FILE"
        echo "- **恢复命令**: " >> "$TIMEPOINTS_FILE"
        echo "  \`\`\`bash" >> "$TIMEPOINTS_FILE"
        echo "  wrangler d1 time-travel restore $DATABASE_NAME --bookmark=$BOOKMARK" >> "$TIMEPOINTS_FILE"
        echo "  \`\`\`" >> "$TIMEPOINTS_FILE"
        
        echo -e "${GREEN}✅ 时间点已保存${NC}"
        echo -e "${BLUE}📋 书签ID:${NC} $BOOKMARK"
        echo -e "${BLUE}📝 描述:${NC} $description"
        echo -e "${BLUE}📁 记录文件:${NC} $TIMEPOINTS_FILE"
    else
        echo -e "${RED}❌ 无法获取时间点信息${NC}"
        exit 1
    fi
}

# 恢复到指定时间点
restore_timepoint() {
    echo -e "${BLUE}🔄 时间点恢复工具${NC}"
    echo ""
    
    # 显示警告
    echo -e "${RED}⚠️  警告: 恢复操作将覆盖当前数据库！${NC}"
    echo -e "${YELLOW}💡 建议: 在恢复前先创建当前状态的备份${NC}"
    echo ""
    
    # 询问是否继续
    echo -e "${YELLOW}是否要先创建当前状态的备份？ (y/N):${NC}"
    read -r create_backup
    
    if [[ $create_backup =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}📦 创建备份...${NC}"
        ./scripts/backup-database.sh
        echo ""
    fi
    
    # 显示可用的时间点
    echo -e "${BLUE}📋 可用的时间点:${NC}"
    list_timepoints
    echo ""
    
    # 获取当前时间点
    show_timepoint_info
    echo ""
    
    # 询问恢复方式
    echo -e "${YELLOW}选择恢复方式:${NC}"
    echo "1) 使用书签ID恢复"
    echo "2) 使用时间戳恢复"
    echo "3) 取消"
    echo ""
    echo -e "${YELLOW}请选择 (1-3):${NC}"
    read -r choice
    
    case $choice in
        1)
            echo -e "${YELLOW}请输入书签ID:${NC}"
            read -r bookmark_id
            if [ -n "$bookmark_id" ]; then
                echo -e "${BLUE}🔄 恢复到书签: $bookmark_id${NC}"
                npx wrangler d1 time-travel restore "$DATABASE_NAME" --bookmark="$bookmark_id"
            else
                echo -e "${RED}❌ 书签ID不能为空${NC}"
            fi
            ;;
        2)
            echo -e "${YELLOW}请输入时间戳 (格式: 2025-07-31T15:00:00Z):${NC}"
            read -r timestamp
            if [ -n "$timestamp" ]; then
                echo -e "${BLUE}🔄 恢复到时间: $timestamp${NC}"
                npx wrangler d1 time-travel restore "$DATABASE_NAME" --timestamp="$timestamp"
            else
                echo -e "${RED}❌ 时间戳不能为空${NC}"
            fi
            ;;
        3)
            echo -e "${YELLOW}❌ 已取消恢复操作${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 无效选择${NC}"
            exit 1
            ;;
    esac
}

# 主函数
main() {
    # 检查登录状态
    check_login
    
    # 创建备份目录
    mkdir -p backups
    
    # 处理命令
    case "${1:-help}" in
        "info")
            show_timepoint_info
            ;;
        "list")
            list_timepoints
            ;;
        "save")
            save_timepoint "$2"
            ;;
        "restore")
            restore_timepoint
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# 运行主函数
main "$@"
