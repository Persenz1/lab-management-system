#!/usr/bin/env bash
# ============================================================
# install-systemd.sh - 安装 lab-management systemd 服务
#
# 用途：创建系统用户、复制服务文件、启用开机自启
# 要求：以 root 或 sudo 执行
# 用法：sudo bash scripts/install-systemd.sh
# ============================================================

set -e

APP_DIR="/opt/lab-management"
SERVICE_NAME="lab-management"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "===== 实验室管理系统 systemd 安装 ====="
echo ""

# ---- 1. 创建系统用户 ----
echo "[1/5] 创建系统用户 labmanage..."
if id "labmanage" &>/dev/null; then
    echo "  用户 labmanage 已存在，跳过创建"
else
    sudo useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin labmanage
    echo "  用户 labmanage 已创建"
fi

# ---- 2. 确保部署目录存在 ----
echo "[2/5] 确保部署目录存在..."
sudo mkdir -p "$APP_DIR"/{pb_data,pb_migrations,pb_hooks,pb_public,scripts,backups,docs}

# ---- 3. 同步项目文件（排除不需要的） ----
echo "[3/5] 同步项目文件到 $APP_DIR ..."
sudo rsync -av --delete \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='README.md' \
    --exclude='PROJECT_RULES.md' \
    --exclude='pocketbase' \
    --exclude='pb_data' \
    --exclude='backups' \
    "$PROJECT_DIR/" "$APP_DIR/"

# ---- 4. 设置目录权限 ----
echo "[4/5] 设置目录权限..."
sudo chown -R labmanage:labmanage "$APP_DIR"
sudo chmod +x "$APP_DIR/scripts/backup.sh"

# ---- 5. 安装 systemd 服务 ----
echo "[5/5] 安装 systemd 服务..."
if [ -f "$PROJECT_DIR/scripts/lab-management.service" ]; then
    sudo cp "$PROJECT_DIR/scripts/lab-management.service" "$SERVICE_FILE"
else
    # 直接生成服务文件
    sudo tee "$SERVICE_FILE" > /dev/null << 'SERVICEEOF'
[Unit]
Description=Lab Management PocketBase Service
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/lab-management
ExecStart=/opt/lab-management/pocketbase serve --http=0.0.0.0:8090
Restart=always
RestartSec=5
User=labmanage
Group=labmanage

[Install]
WantedBy=multi-user.target
SERVICEEOF
fi

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"

echo ""
echo "===== 安装完成 ====="
echo ""
echo "后续步骤:"
echo "  1. 将 PocketBase 可执行文件放入: $APP_DIR/pocketbase"
echo "     chmod +x $APP_DIR/pocketbase"
echo ""
echo "  2. 首次需要手动启动:"
echo "     sudo systemctl start $SERVICE_NAME"
echo ""
echo "  3. 创建管理员账号:"
echo "     cd $APP_DIR && sudo -u labmanage ./pocketbase superuser create 邮箱 密码"
echo ""
echo "  4. 设置定时备份:"
echo "     sudo crontab -e"
echo "     0 3 * * * $APP_DIR/scripts/backup.sh"
echo ""
echo "  5. 检查状态:"
echo "     sudo systemctl status $SERVICE_NAME"
