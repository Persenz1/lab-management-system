# OpenCode + DeepSeek 开发任务书 v0.2 PocketBase 版

## 1. 项目目标

开发一个基于 PocketBase 的轻量级实验室管理系统。

技术路线：

```text
PocketBase
内置 SQLite
静态 HTML/CSS/原生 JavaScript
PocketBase JS SDK
少量 pb_hooks / custom route
systemd 部署
本机备份 + 手动网盘备份
```

核心目标：

1. 普通用户免登录；
2. 手机扫码可登记；
3. 管理员使用 PocketBase Admin 和 admin-lite；
4. 物资可查、状态可上报；
5. 设备可登记、状态可查看；
6. 新设备登记自动关闭旧 active 记录；
7. 系统尽可能低维护；
8. 不使用复杂框架。

---

## 2. 硬性禁止事项

开发 Agent 不得引入：

```text
Vue
React
Angular
Svelte
FastAPI
Django
Flask
Node 后端
Express
NestJS
PostgreSQL
Docker
Nginx
微信小程序
云部署
普通用户账号系统
Excel 导入
图片上传
附件上传
采购审批
预约系统
复杂权限系统
```

如果需要新增功能，必须先获得项目负责人确认。

---

## 3. 项目目录结构

建议目录：

```text
lab-management-system/
├── pocketbase                 # PocketBase 可执行文件，实际部署时放入
├── pb_data/                    # 运行后生成，真实数据目录，不提交 git
├── pb_migrations/              # Collection 迁移文件
├── pb_hooks/                   # JS hooks / custom routes
├── pb_public/                  # 静态网页
│   ├── index.html
│   ├── equipment.html
│   ├── equipment-use.html
│   ├── items.html
│   ├── item-report.html
│   ├── new-item-report.html
│   ├── admin-lite.html
│   └── assets/
│       ├── style.css
│       ├── api.js
│       ├── common.js
│       ├── home.js
│       ├── equipment.js
│       ├── equipment-use.js
│       ├── items.js
│       ├── item-report.js
│       ├── new-item-report.js
│       └── admin-lite.js
├── scripts/
│   ├── backup.sh
│   ├── install-systemd.sh
│   └── generate-qr.md
├── backups/                    # 本机备份目录，不提交 git
├── docs/
│   ├── 01_PRD_PocketBase版.md
│   ├── 02_COLLECTIONS_DESIGN.md
│   ├── 03_DEVELOPMENT_TASKS_PocketBase版.md
│   ├── 04_DEPLOYMENT_GUIDE.md
│   ├── 05_MAINTENANCE_GUIDE.md
│   ├── 06_PROJECT_RULES.md
│   └── 07_STAGE_PROMPTS_OpenCode_DeepSeek.md
└── README.md
```

---

## 4. 阶段划分

### 阶段 0：文档和规则冻结

目标：

1. 放入项目文档；
2. 创建 `PROJECT_RULES.md`；
3. 明确技术栈和禁止事项；
4. 不写业务代码。

验收：

1. docs 目录完整；
2. README 能说明项目定位；
3. Agent 不再引用旧的 Vue/FastAPI 文档。

---

### 阶段 1：项目骨架

目标：

1. 创建目录结构；
2. 创建静态页面空壳；
3. 创建基础 CSS；
4. 创建 API 封装文件；
5. 创建 README；
6. 不实现复杂业务。

验收：

1. 所有 HTML 文件存在；
2. 所有页面能打开；
3. 每页有返回首页链接；
4. 页面不依赖构建工具；
5. 没有 package.json；
6. 没有 Vue/React。

---

### 阶段 2：PocketBase Collections

目标：

1. 创建 7 个 Collections；
2. 创建字段；
3. 创建 API 规则；
4. 创建初始化数据；
5. 创建 migrations。

Collections：

```text
lab_members
locations
items
item_reports
new_item_reports
equipment
equipment_usage
```

不创建：

```text
admin_users
usage_items
```

验收：

1. PocketBase 启动后能看到 7 个 Collections；
2. locations 有 A-F、未分类、其他；
3. 能手动添加成员、物资、设备；
4. 普通匿名接口能读取启用物资和设备；
5. 普通匿名接口不能直接修改正式物资和设备。

---

### 阶段 3：普通用户页面

目标页面：

```text
index.html
equipment.html
equipment-use.html
items.html
item-report.html
new-item-report.html
```

目标功能：

1. 首页显示设备摘要和常用入口；
2. 设备页显示设备状态；
3. 设备登记页可提交登记；
4. 物资列表可搜索和筛选；
5. 物资状态可上报；
6. 新物资可上报；
7. 支持二维码 URL 参数预选设备/物资。

验收：

1. 手机浏览器可正常使用；
2. 字号和按钮适合触屏；
3. 表单有必填校验；
4. 提交成功和失败都有提示；
5. 普通用户不需要登录；
6. 设备登记不直接写 Collection，而是调用 custom route。

---

### 阶段 4：核心 custom route / hooks

目标：

实现：

```text
POST /api/custom/equipment-use
```

必须逻辑：

1. 校验设备；
2. 校验使用人；
3. 查询旧 active 记录；
4. 自动关闭旧 active；
5. 创建新 active；
6. 保存 materials 多选 relation；
7. 返回新记录。

验收：

1. 连续登记同一设备不会产生多条 active；
2. 新登记会将旧记录设为 closed；
3. 旧记录 end_reason = overridden_by_new_usage；
4. 材料关联正确保存；
5. 错误输入有明确错误响应。

---

### 阶段 5：admin-lite

目标页面：

```text
admin-lite.html
```

功能：

1. 查看待审核物资状态上报；
2. 通过/拒绝状态上报；
3. 查看待审核新物资；
4. 通过/拒绝新物资；
5. 查看当前 active 设备记录；
6. 手动关闭设备记录；
7. CSV 导出；
8. 跳转 PocketBase Admin。

验收：

1. 手机和电脑都可用；
2. 手机端卡片布局；
3. 电脑端信息密度更高；
4. 通过状态上报后正式物资状态改变；
5. 通过新物资后创建正式物资；
6. 手动关闭设备记录后状态变成 closed；
7. 导出 CSV 可由 Excel 打开。

---

### 阶段 6：部署、备份、二维码

目标：

1. systemd 服务文件；
2. backup.sh；
3. 安装说明；
4. 维护说明；
5. 恢复说明；
6. 二维码生成说明。

验收：

1. 可开机自启；
2. 可通过 systemctl 查看状态；
3. 可每天备份 pb_data；
4. 备份保留 30 天；
5. 文档说明如何手动上传网盘；
6. 文档说明如何恢复；
7. 文档明确 pb_data 不能删除。

---

## 5. 页面实现要求

### 普通端

1. 使用卡片布局；
2. 使用大按钮；
3. 页面不横向滚动；
4. 表单字段尽可能少；
5. 每页顶部有返回首页；
6. 错误信息要写人话；
7. 加载中要有提示；
8. 成功后提供“返回首页”和“继续操作”。

### admin-lite

1. 手机端卡片；
2. 电脑端可用表格或宽卡片；
3. 审核操作必须二次确认；
4. 拒绝操作可直接执行；
5. 手动关闭设备记录必须二次确认；
6. CSV 导出字段使用中文表头。

---

## 6. 核心 API 封装建议

`pb_public/assets/api.js` 负责：

1. 初始化 PocketBase SDK；
2. 获取成员列表；
3. 获取位置列表；
4. 获取物资列表；
5. 获取设备列表；
6. 获取设备状态；
7. 提交物资状态上报；
8. 提交新物资上报；
9. 调用设备登记 custom route；
10. admin-lite 审核相关操作。

不要在每个页面重复写 PocketBase 连接代码。

---

## 7. 测试清单

### 普通端

1. 首页可打开；
2. 设备看板可显示状态；
3. 设备登记可提交；
4. 设备二维码可预选设备；
5. 物资列表可搜索；
6. 物资状态上报可提交；
7. 新物资上报可提交；
8. 空姓名不能提交；
9. 空设备不能提交；
10. 空物资名称不能提交。

### 业务逻辑

1. 同一设备连续登记 3 次，只保留最后一条 active；
2. 被覆盖记录 end_time 正确；
3. 被覆盖记录 end_reason 正确；
4. materials 多选保存正确；
5. 超过预计时间显示“预计已完成，待确认”。

### 管理端

1. admin-lite 可审核状态上报；
2. 审核通过会改正式物资状态；
3. 审核拒绝不会改正式物资状态；
4. 审核新物资通过会创建正式物资；
5. 审核新物资拒绝不会创建物资；
6. 手动关闭 active 记录有效；
7. CSV 可导出。

### 部署维护

1. systemd 服务可启动；
2. systemd 服务可重启；
3. backup.sh 能生成备份包；
4. 备份包包含 pb_data；
5. 恢复流程可执行。

---

## 8. Definition of Done

v0.2 完成标准：

1. PocketBase 能启动；
2. 静态页面由 PocketBase 直接服务；
3. 普通用户免登录；
4. 设备登记 custom route 正常；
5. 管理员可使用 PocketBase Admin；
6. admin-lite 可完成日常审核；
7. 本机备份可用；
8. 部署文档可用；
9. 维护文档可用；
10. OpenCode/DeepSeek 没有引入禁止技术栈。
