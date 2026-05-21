# 实验室管理系统通用部署教程

本文用于从零部署、测试和后续维护实验室管理系统。默认部署在局域网 Ubuntu 服务器，不使用 Docker、Nginx、HTTPS 或云服务。

## 1. 部署目标

部署完成后，局域网用户通过下面地址访问：

```text
普通首页：http://服务器IP:8090/
中文管理面板：http://服务器IP:8090/admin-lite.html
PocketBase 高级后台：http://服务器IP:8090/_/
```

日常使用优先进入中文管理面板。PocketBase 高级后台是底层数据库后台，只建议维护人员使用。

## 2. 服务器准备

推荐环境：

```text
Ubuntu 22.04 / 24.04
x86_64 架构
至少 2GB 内存
至少 10GB 可用磁盘
固定局域网 IP
```

安装常用工具：

```bash
sudo apt update
sudo apt install -y git wget unzip rsync
```

建议在路由器里给服务器设置 DHCP 静态租约，避免 IP 变化。

## 3. 获取项目代码

进入 `/opt`：

```bash
cd /opt
```

如果服务器没有配置 GitHub SSH key，使用 HTTPS 克隆：

```bash
sudo git clone https://github.com/Persenz1/lab-management-system.git lab-management
```

如果已经克隆过：

```bash
cd /opt/lab-management
sudo git pull
```

进入项目目录：

```bash
cd /opt/lab-management
```

## 4. 下载 PocketBase

本项目要求 PocketBase v0.23 或更高版本。建议到 PocketBase GitHub Releases 下载最新版 Linux amd64 包。

示例：

```bash
cd /opt/lab-management
sudo wget -O pocketbase.zip https://github.com/pocketbase/pocketbase/releases/download/v0.23.12/pocketbase_0.23.12_linux_amd64.zip
sudo unzip pocketbase.zip
sudo chmod +x pocketbase
```

确认可执行文件存在：

```bash
./pocketbase --version
```

确认前端 SDK 文件存在：

```bash
test -f pb_public/assets/vendor/pocketbase.umd.js && echo OK
```

## 5. 临时启动测试

正式安装 systemd 前，先前台启动一次：

```bash
cd /opt/lab-management
sudo ./pocketbase serve --http=0.0.0.0:8090
```

在浏览器访问：

```text
http://服务器IP:8090/
http://服务器IP:8090/_/
http://服务器IP:8090/admin-lite.html
```

第一次进入 `/_/` 时，按页面提示创建管理员账号。

如果需要命令行创建管理员：

```bash
cd /opt/lab-management
sudo ./pocketbase superuser create 管理员邮箱 管理员密码
```

看到页面能正常打开，并且终端没有 migrations 或 hooks 报错后，再继续。

## 6. 功能验收清单

### 普通用户页面

打开首页：

```text
http://服务器IP:8090/
```

测试设备登记：

```text
http://服务器IP:8090/equipment-use.html
```

操作：

1. 选择一个设备；
2. 填写使用人；
3. 提交登记；
4. 再换一个使用人登记同一设备。

预期：

```text
第一次登记成功。
第二次登记前显示当前设备正在使用的警告。
确认后登记成功，上一条使用记录自动关闭。
```

测试新物资上报：

```text
http://服务器IP:8090/new-item-report.html
```

操作：

1. 提交一个测试物资；
2. 进入中文管理面板审核。

预期：

```text
普通用户提交后状态为待审核。
管理员通过后，正式物资列表出现该物资。
```

测试物资状态上报：

```text
http://服务器IP:8090/item-report.html
```

操作：

1. 选择一个正式物资；
2. 上报状态，例如“余量低”；
3. 进入中文管理面板审核。

预期：

```text
管理员通过后，正式物资状态变为上报状态。
```

### 管理员页面

打开中文管理面板：

```text
http://服务器IP:8090/admin-lite.html
```

用 PocketBase 管理员账号登录，测试：

```text
审核新物资
审核物资状态上报
查看当前设备使用
关闭设备使用记录
新增/编辑/停用物资
新增/编辑/停用设备
新增/编辑/停用成员
新增/编辑/停用位置
CSV 导出
```

### 高级后台

打开：

```text
http://服务器IP:8090/_/
```

只做确认：

```text
能登录。
能看到 collections。
不要随意改 collection 名和字段名。
```

## 7. 安装 systemd 服务

临时测试通过后，停止前台 PocketBase，然后安装 systemd：

```bash
cd /opt/lab-management
sudo bash scripts/install-systemd.sh
```

确认 PocketBase 可执行文件仍在部署目录：

```bash
ls -l /opt/lab-management/pocketbase
```

启动服务：

```bash
sudo systemctl start lab-management
sudo systemctl status lab-management
```

确认开机自启：

```bash
sudo systemctl is-enabled lab-management
```

查看日志：

```bash
sudo journalctl -u lab-management -n 100
```

实时日志：

```bash
sudo journalctl -u lab-management -f
```

## 8. 正式运行后的访问地址

把下面地址发给实验室成员：

```text
首页：http://服务器IP:8090/
设备登记：http://服务器IP:8090/equipment-use.html
物资列表：http://服务器IP:8090/items.html
设备状态：http://服务器IP:8090/equipment.html
```

管理员使用：

```text
中文管理面板：http://服务器IP:8090/admin-lite.html
高级后台：http://服务器IP:8090/_/
```

## 9. 备份设置

手动测试备份：

```bash
sudo /opt/lab-management/scripts/backup.sh
ls -lh /opt/lab-management/backups
```

看到类似文件即成功：

```text
lab-management-backup-YYYY-MM-DD_HH-MM-SS.tar.gz
```

设置每日凌晨 3 点自动备份：

```bash
sudo crontab -e
```

加入：

```cron
0 3 * * * /opt/lab-management/scripts/backup.sh
```

建议每周或每月把最新备份包手动上传到实验室网盘。

## 10. 后续更新代码

以后代码更新后，在服务器执行：

```bash
cd /opt/lab-management
sudo git pull
sudo systemctl restart lab-management
sudo systemctl status lab-management
```

如果更新包含 migrations，PocketBase 启动时会自动执行。更新后建议重新测试：

```text
首页能打开。
admin-lite 能登录。
设备登记能提交。
新物资上报能审核通过。
物资状态上报能审核通过。
备份脚本能运行。
```

## 11. 常见问题

### git@github.com Permission denied

服务器没有配置 GitHub SSH key。改用 HTTPS：

```bash
sudo git clone https://github.com/Persenz1/lab-management-system.git lab-management
```

### 8090 端口无法访问

检查服务：

```bash
sudo systemctl status lab-management
sudo journalctl -u lab-management -n 100
```

检查服务器 IP：

```bash
ip addr
```

如果启用了防火墙，放行 8090：

```bash
sudo ufw allow 8090/tcp
```

### 页面加载失败或按钮没反应

确认本地 SDK 文件存在：

```bash
test -f /opt/lab-management/pb_public/assets/vendor/pocketbase.umd.js && echo OK
```

查看浏览器控制台是否有 JavaScript 报错。

### 不要删除 pb_data

最重要的一条：

```text
不要删除 /opt/lab-management/pb_data
```

`pb_data` 是真实数据库和文件数据。删除后数据会丢失，只能从备份恢复。

## 12. 最终交付检查

部署完成后逐项确认：

```text
[ ] 服务器固定 IP 已设置
[ ] 首页可访问
[ ] 中文管理面板可登录
[ ] PocketBase 高级后台可登录
[ ] 设备登记功能正常
[ ] 设备重复登记有警告
[ ] 新物资上报和审核正常
[ ] 物资状态上报和审核正常
[ ] 设备使用记录关闭正常
[ ] CSV 导出正常
[ ] systemd 服务开机自启
[ ] 备份脚本运行成功
[ ] 自动备份 cron 已设置
[ ] 管理员账号密码已妥善记录
```
