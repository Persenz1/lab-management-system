# 实验室管理系统部署指南 v0.2

## 1. 部署原则

本系统采用低维护部署方式：

```text
Ubuntu 服务器
PocketBase 单文件
systemd 开机自启
固定局域网 IP
pb_public 静态网页
pb_data 保存数据
本机每日备份
手动上传网盘
```

不使用：

```text
Docker
Nginx
HTTPS
云服务器
外网访问
```

---

## 2. 服务器要求

推荐：

```text
Ubuntu 22.04 / 24.04
长期通电
固定局域网 IP
普通 x86_64 小主机或服务器
至少 2GB 内存
至少 10GB 可用磁盘
```

不要部署在个人笔记本或经常关机的电脑上。

---

## 3. 目录结构

部署路径：

```text
/opt/lab-management/
```

目录：

```text
/opt/lab-management/
├── pocketbase
├── pb_data/
├── pb_migrations/
├── pb_hooks/
├── pb_public/
├── backups/
├── scripts/
└── docs/
```

重要说明：

```text
pb_data 是真实数据目录，不能删除。
pb_public 是网页目录。
pb_hooks 是自定义业务逻辑目录。
backups 是本机备份目录。
```

---

## 4. 创建运行用户

建议使用独立用户运行服务：

```bash
sudo useradd --system --home /opt/lab-management --shell /usr/sbin/nologin labmanage
```

设置目录权限：

```bash
sudo mkdir -p /opt/lab-management
sudo chown -R labmanage:labmanage /opt/lab-management
```

---

## 5. 放置 PocketBase

本项目要求 PocketBase v0.23 或更高版本。`pb_hooks/main.pb.js` 使用新版 request hooks 和 `$app.runInTransaction()`，低于 v0.23 的可执行文件不要用于部署。

将 PocketBase 可执行文件放入：

```text
/opt/lab-management/pocketbase
```

赋予执行权限：

```bash
sudo chmod +x /opt/lab-management/pocketbase
```

测试运行：

```bash
cd /opt/lab-management
./pocketbase serve --http=0.0.0.0:8090
```

浏览器访问：

```text
http://服务器IP:8090
http://服务器IP:8090/_/
```

确认前端 SDK 文件存在：

```bash
test -f /opt/lab-management/pb_public/assets/vendor/pocketbase.umd.js
```

如果该文件不存在，普通页面和 admin-lite 都会因缺少 PocketBase JS SDK 而初始化失败。

---

## 6. 创建第一个管理员账号

首次启动 PocketBase 后，按页面提示创建管理员账号。

也可以命令行创建：

```bash
cd /opt/lab-management
./pocketbase superuser create 管理员邮箱 管理员密码
```

密码不要太弱。账号信息应记录在实验室内部安全位置，不要写在公开 README 中。

---

## 7. systemd 服务

创建服务文件：

```bash
sudo nano /etc/systemd/system/lab-management.service
```

内容：

```ini
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
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable lab-management
sudo systemctl start lab-management
```

查看状态：

```bash
sudo systemctl status lab-management
```

重启：

```bash
sudo systemctl restart lab-management
```

---

## 8. 固定局域网 IP

推荐在路由器中做 DHCP 静态租约：

```text
服务器 MAC 地址 -> 固定 IP
```

例如：

```text
192.168.1.50
```

普通用户访问：

```text
http://192.168.1.50:8090
```

不要依赖经常变化的动态 IP。

---

## 9. 二维码入口

生成二维码内容：

### 总入口

```text
http://服务器IP:8090/
```

### 设备登记页

```text
http://服务器IP:8090/equipment-use.html
```

### 单设备登记页

```text
http://服务器IP:8090/equipment-use.html?equipment_id=设备ID
```

二维码贴放位置：

```text
实验室门口
服务器旁
3D 打印机旁
材料柜旁
公告栏
```

注意：

这是网页入口二维码，不是物资二维码管理系统。

---

## 10. 防火墙

如果服务器开启了 UFW，需要放行 8090：

```bash
sudo ufw allow 8090/tcp
```

只在局域网访问，不做外网端口映射。

---

## 11. 备份目录

创建备份目录：

```bash
sudo mkdir -p /opt/lab-management/backups
sudo chown -R labmanage:labmanage /opt/lab-management/backups
```

备份脚本放在：

```text
/opt/lab-management/scripts/backup.sh
```

---

## 12. 部署完成检查

检查项：

1. `systemctl status lab-management` 显示 running；
2. 手机连接实验室 Wi-Fi 后可访问首页；
3. 电脑可访问 PocketBase Admin；
4. 普通页面能读取物资和设备；
5. admin-lite 可打开；
6. backup.sh 可生成备份；
7. 二维码扫码能进入网页。

---

## 13. 升级 PocketBase

升级前必须备份：

```bash
cd /opt/lab-management
sudo -u labmanage ./scripts/backup.sh
```

升级步骤：

```text
1. 停止服务
2. 备份旧 pocketbase 可执行文件
3. 替换新 pocketbase
4. 启动服务
5. 检查页面和后台
```

命令示例：

```bash
sudo systemctl stop lab-management
sudo cp /opt/lab-management/pocketbase /opt/lab-management/pocketbase.old
sudo cp 新版pocketbase /opt/lab-management/pocketbase
sudo chmod +x /opt/lab-management/pocketbase
sudo systemctl start lab-management
```

如果失败，恢复旧文件：

```bash
sudo systemctl stop lab-management
sudo cp /opt/lab-management/pocketbase.old /opt/lab-management/pocketbase
sudo systemctl start lab-management
```

---

## 14. 不建议做的部署改造

v0.2 不建议加入：

1. Docker；
2. Nginx；
3. HTTPS；
4. 公网访问；
5. 自动网盘同步；
6. 复杂域名解析；
7. 多机部署。

这些都会提高后期维护难度。

---

## 15. 迁移到新机器

当需要将系统迁移到另一台服务器时：

### 15.1 准备工作

在新机器上完成基础部署：

```bash
# 创建目录和用户
sudo mkdir -p /opt/lab-management
sudo useradd --system --home /opt/lab-management --shell /usr/sbin/nologin labmanage
sudo chown -R labmanage:labmanage /opt/lab-management
```

### 15.2 复制数据

在旧机器上备份：

```bash
sudo systemctl stop lab-management
cd /opt/lab-management
sudo -u labmanage ./scripts/backup.sh
```

将以下内容复制到新机器：

```text
1. pocketbase 可执行文件（下载相同版本）
2. pb_data/ 目录（数据）
3. pb_hooks/ 目录（业务逻辑）
4. pb_public/ 目录（网页）
5. pb_migrations/ 目录（迁移文件）
6. scripts/ 目录（脚本）
```

或直接用备份包迁移：

```bash
# 旧机器：生成完整备份
cd /opt/lab-management
tar -czf /tmp/lab-full-migration.tar.gz pocketbase pb_data pb_hooks pb_public pb_migrations scripts

# 复制到新机器
scp /tmp/lab-full-migration.tar.gz user@新机器IP:/tmp/

# 新机器：解压
cd /opt/lab-management
sudo tar -xzf /tmp/lab-full-migration.tar.gz
sudo chown -R labmanage:labmanage /opt/lab-management
sudo chmod +x /opt/lab-management/pocketbase
sudo chmod +x /opt/lab-management/scripts/backup.sh
```

### 15.3 安装服务并启动

```bash
cd /opt/lab-management
sudo bash scripts/install-systemd.sh
sudo systemctl start lab-management
sudo systemctl status lab-management
```

### 15.4 验证

1. 首页可访问
2. PocketBase Admin 可登录
3. 数据完整
4. 设备登记 custom route 可用
5. backup.sh 可执行
