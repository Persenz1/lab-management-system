#!/usr/bin/env bash
# ============================================================
# backup.sh - 实验室管理系统本机备份脚本
#
# 用途：备份 /opt/lab-management/pb_data 到 backups 目录
# 行为：出错时停止（set -e），保留最近 30 天
# 部署：配合 cron 每天执行
#       sudo crontab -e
#       0 3 * * * /opt/lab-management/scripts/backup.sh
# ============================================================

set -e

# ---- 配置 ----
APP_DIR="/opt/lab-management"
BACKUP_DIR="$APP_DIR/backups"
DATA_DIR="$APP_DIR/pb_data"

# ---- 生成时间戳文件名 ----
DATE="$(date +%F_%H-%M-%S)"
BACKUP_FILE="lab-management-backup-${DATE}.tar.gz"

# ---- 确保备份目录存在 ----
mkdir -p "$BACKUP_DIR"

# ---- 检查数据目录 ----
if [ ! -d "$DATA_DIR" ]; then
    echo "[ERROR] 数据目录不存在: $DATA_DIR"
    echo "请确认 PocketBase 已经至少运行过一次。"
    exit 1
fi

# ---- 执行备份 ----
echo "[$(date '+%F %T')] 开始备份: $DATA_DIR -> $BACKUP_DIR/$BACKUP_FILE"

tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    -C "$APP_DIR" \
    pb_data

echo "[$(date '+%F %T')] 备份完成: $BACKUP_DIR/$BACKUP_FILE"
du -h "$BACKUP_DIR/$BACKUP_FILE" | awk '{print "  大小: " $1}'

# ---- 清理 30 天前的旧备份 ----
echo "[$(date '+%F %T')] 清理 30 天前的旧备份..."

DELETED=$(find "$BACKUP_DIR" -name "lab-management-backup-*.tar.gz" -mtime +30 -print -delete | wc -l)

echo "  已清理 $DELETED 个旧备份文件"

# ---- 显示当前备份总数 ----
COUNT=$(ls -1 "$BACKUP_DIR"/lab-management-backup-*.tar.gz 2>/dev/null | wc -l)
echo "[$(date '+%F %T')] 当前备份文件数: $COUNT"
