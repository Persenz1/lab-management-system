# 实验室低维护管理系统 v0.2

面向约 20 多人实验室的轻量级管理系统，用于物资盘点、设备使用登记、状态上报。

## 技术栈

| 组件 | 选型 |
|---|---|
| 后端 | PocketBase（单文件） |
| 数据库 | PocketBase 内置 SQLite |
| 前端 | 静态 HTML / CSS / 原生 JavaScript |
| SDK | PocketBase JS SDK |
| 业务逻辑 | pb_hooks / custom routes |
| 部署 | systemd 开机自启 |
| 备份 | 本机 tar.gz + 手动网盘 |

明确不使用：Vue、React、FastAPI、Django、Flask、Node 后端、Docker、Nginx、PostgreSQL、微信小程序、普通用户账号系统。

## 启动方式

```bash
cd /opt/lab-management
./pocketbase serve --http=0.0.0.0:8090
```

首次启动后访问 `http://服务器IP:8090/_/` 创建管理员账号。

## 关键 URL

| 地址 | 说明 |
|---|---|
| `http://服务器IP:8090/` | 普通首页 |
| `http://服务器IP:8090/admin-lite.html` | 管理员轻量管理页 |
| `http://服务器IP:8090/_/` | PocketBase Admin |

## 目录结构

```text
lab-management-system/
├── pocketbase            # PocketBase 可执行文件（不提交 git）
├── pb_data/              # 运行时真实数据（不提交 git，禁止删除）
├── pb_migrations/        # Collection 迁移文件
├── pb_hooks/             # JS hooks / custom routes
├── pb_public/            # 静态网页
│   ├── index.html
│   ├── equipment.html
│   ├── equipment-use.html
│   ├── items.html
│   ├── item-report.html
│   ├── new-item-report.html
│   ├── admin-lite.html
│   └── assets/
├── scripts/
│   ├── backup.sh
│   └── install-systemd.sh
├── backups/              # 本机备份目录（不提交 git）
├── docs/
│   ├── 01_PRD_PocketBase版.md
│   ├── 02_COLLECTIONS_DESIGN.md
│   ├── 03_DEVELOPMENT_TASKS_PocketBase版.md
│   ├── 04_DEPLOYMENT_GUIDE.md
│   ├── 05_MAINTENANCE_GUIDE.md
│   └── 06_PROJECT_RULES.md
└── README.md
```

## 用户角色

- **普通成员**：免登录，查看物资/设备、登记设备使用、上报物资状态
- **管理员**：通过 PocketBase Admin 和 admin-lite 维护数据、审核上报、导出 CSV
