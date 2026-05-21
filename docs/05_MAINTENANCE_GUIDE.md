# 实验室管理系统维护指南 v0.2

## 1. 最重要原则

```text
不要删除 /opt/lab-management/pb_data
```

`pb_data` 是系统真实数据目录，包含数据库、上传文件和 PocketBase 运行数据。

如果 `pb_data` 被删除，系统数据会丢失。

---

## 2. 常用命令

### 查看服务状态

```bash
sudo systemctl status lab-management
```

### 重启系统

```bash
sudo systemctl restart lab-management
```

### 停止系统

```bash
sudo systemctl stop lab-management
```

### 启动系统

```bash
sudo systemctl start lab-management
```

### 查看日志

```bash
sudo journalctl -u lab-management -n 100
```

实时查看：

```bash
sudo journalctl -u lab-management -f
```

---

## 3. 访问地址

普通用户页面：

```text
http://服务器IP:8090/
```

管理员 Lite 页面：

```text
http://服务器IP:8090/admin-lite.html
```

PocketBase Admin：

```text
http://服务器IP:8090/_/
```

---

## 4. 日常维护任务

### 每周

1. 检查系统是否能访问；
2. 检查备份目录是否有新备份；
3. 手动下载最新备份并上传网盘；
4. 检查磁盘空间。

### 每月

1. 检查成员名单是否需要更新；
2. 检查设备清单是否需要更新；
3. 清理明显错误或重复的物资记录；
4. 检查二维码是否仍能访问；
5. 抽查一次备份是否能解压。

---

## 5. 备份方案

### 5.1 本机自动备份

备份脚本：

```text
/opt/lab-management/scripts/backup.sh
```

备份目录：

```text
/opt/lab-management/backups/
```

备份文件命名：

```text
lab-management-backup-YYYY-MM-DD_HH-MM-SS.tar.gz
```

备份内容：

```text
pb_data
```

默认保留最近 30 天。

### 5.2 backup.sh 示例

```bash
#!/usr/bin/env bash
set -e

APP_DIR="/opt/lab-management"
BACKUP_DIR="$APP_DIR/backups"
DATE="$(date +%F_%H-%M-%S)"

mkdir -p "$BACKUP_DIR"

tar -czf "$BACKUP_DIR/lab-management-backup-$DATE.tar.gz" \
  -C "$APP_DIR" pb_data

find "$BACKUP_DIR" -name "lab-management-backup-*.tar.gz" -mtime +30 -delete
```

赋予执行权限：

```bash
chmod +x /opt/lab-management/scripts/backup.sh
```

### 5.3 cron 定时备份

编辑 crontab：

```bash
sudo crontab -e
```

加入：

```cron
0 3 * * * /opt/lab-management/scripts/backup.sh
```

含义：

```text
每天凌晨 3 点备份一次。
```

### 5.4 手动网盘备份

因为实验室暂无 NAS，所以采用人工上传网盘。

建议流程：

```text
每周或每月：
1. 登录服务器或通过文件工具进入 backups 目录；
2. 复制最新备份包；
3. 上传到实验室网盘；
4. 按月份归档。
```

网盘目录建议：

```text
实验室管理系统备份/
├── 2026-05/
├── 2026-06/
└── 2026-07/
```

不要依赖自动网盘同步，避免账号过期、同步失败、客户端异常等维护问题。

---

## 6. 恢复数据

### 6.1 恢复前警告

恢复会用备份里的 `pb_data` 覆盖当前数据。

恢复前建议保留当前坏数据目录：

```bash
sudo systemctl stop lab-management

cd /opt/lab-management
sudo mv pb_data pb_data_broken_$(date +%F_%H-%M-%S)
```

### 6.2 解压备份

```bash
cd /opt/lab-management
sudo tar -xzf backups/lab-management-backup-某日期.tar.gz
sudo chown -R labmanage:labmanage pb_data
```

### 6.3 启动服务

```bash
sudo systemctl start lab-management
sudo systemctl status lab-management
```

### 6.4 检查

1. 普通首页能打开；
2. PocketBase Admin 能登录；
3. 物资列表存在；
4. 设备使用记录存在。

---

## 7. 常见问题

### 7.1 网页打不开

检查：

```bash
sudo systemctl status lab-management
```

如果服务没运行：

```bash
sudo systemctl restart lab-management
```

再检查 IP 是否变化。

### 7.2 手机打不开，电脑能打开

检查手机是否连接实验室同一局域网或 Wi-Fi。

### 7.3 管理员密码忘了

需要在服务器上使用 PocketBase 命令重置或新建 superuser。操作前先停止服务并备份数据。

### 7.4 页面能打开，但数据为空

可能原因：

1. `pb_data` 换错了；
2. 服务目录错误；
3. 迁移未执行；
4. Collection 未初始化。

先检查：

```text
/opt/lab-management/pb_data 是否存在
```

### 7.5 设备一直显示使用中

原因：

1. 用户未再次登记覆盖；
2. 预计时间设置为不确定；
3. active 记录未关闭。

处理：

1. 打开 admin-lite；
2. 找到当前 active 设备记录；
3. 点击手动关闭。

---

## 8. 新增成员

通过 PocketBase Admin：

```text
Collections -> lab_members -> New record
```

填写：

```text
name
is_active = true
note
```

---

## 9. 新增设备

通过 PocketBase Admin：

```text
Collections -> equipment -> New record
```

填写：

```text
name
equipment_type
location
status = 可用
default_duration
note
is_active = true
```

设备二维码可使用：

```text
http://服务器IP:8090/equipment-use.html?equipment_id=设备ID
```

---

## 10. 新增物资

推荐方式：

1. 普通用户用“新物资上报”；
2. 管理员在 admin-lite 审核通过。

也可以直接通过 PocketBase Admin 新增 `items` 记录。

---

## 11. 停用物资或设备

不要删除记录，使用 `is_active = false` 或 `status = 停用`。

这样历史记录不会断。

---

## 12. 毕业交接清单

交接给下一任维护者时，必须说明：

1. 系统部署在哪台服务器；
2. 服务器 IP；
3. PocketBase Admin 地址；
4. 管理员账号由谁保管；
5. `/opt/lab-management/pb_data` 不能删；
6. 怎么重启服务；
7. 备份在哪里；
8. 网盘备份路径；
9. 二维码贴在哪里；
10. 项目文档在哪里。

---

## 13. 迁移到新机器

参见 [04_DEPLOYMENT_GUIDE.md - 第 15 节](./04_DEPLOYMENT_GUIDE.md) 获取完整迁移步骤。

简要流程：

1. 在新机器创建 `labmanage` 用户和 `/opt/lab-management` 目录
2. 从旧机器复制 `pocketbase` 可执行文件和 `pb_data/` 目录
3. 复制 `pb_hooks/`、`pb_public/`、`scripts/` 目录
4. 运行 `sudo bash scripts/install-systemd.sh`
5. 启动服务，检查数据完整性

---

## 14. 二维码维护

二维码生成方式参见 [scripts/generate-qr.md](../scripts/generate-qr.md)。

关键提醒：

- 二维码必须使用**固定 IP**。IP 变化后所有二维码失效，需重新生成。
- 新增设备后，在 PocketBase Admin 查询设备 ID，生成对应二维码。
- 建议在网盘中保留二维码图片备份，方便重新打印。
- 二维码贴放位置：
  - 总入口：实验室门口、公告栏
  - 设备登记：每个设备旁
  - 物资上报：材料柜旁
