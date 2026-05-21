# PROJECT_RULES.md

## 1. 项目根原则

本项目是实验室低维护管理系统，不是标准互联网 Web 项目。

最高优先级：

```text
简单
稳定
低维护
可备份
可恢复
毕业后可接手
```

任何功能、技术栈或代码改动，如果会明显增加维护成本，都必须先征得项目负责人确认。

---

## 2. 固定技术栈

允许使用：

```text
PocketBase
PocketBase 内置 SQLite
PocketBase JS SDK
静态 HTML
CSS
原生 JavaScript
PocketBase JS hooks / custom routes
systemd
bash 脚本
CSV 导出
```

不允许使用：

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
MySQL
Docker
Nginx
Webpack
Vite
复杂前端构建系统
微信小程序
云部署
```

---

## 3. 功能边界

v0.2 必须实现：

```text
普通首页
设备状态看板
设备使用登记
物资列表
物资状态上报
新物资上报
admin-lite
PocketBase Admin 数据维护
设备登记 custom route
本机备份
部署文档
维护文档
二维码入口说明
```

v0.2 不允许擅自实现：

```text
普通用户登录
普通用户注册
手机号验证码
微信登录
微信小程序
采购审批
设备预约
精确库存数量
图片上传
附件上传
Excel 导入
自动服务器探测
拓竹打印机 API
复杂统计图表
消息通知
邮件通知
企业微信通知
多实验室系统
```

---

## 4. 数据规则

最终 Collections 只能是：

```text
lab_members
locations
items
item_reports
new_item_reports
equipment
equipment_usage
```

不得新增：

```text
admin_users
usage_items
```

原因：

```text
管理员账号由 PocketBase 自带 superuser/admin 系统处理。
设备使用关联物资使用 equipment_usage.materials 多选 relation。
```

---

## 5. 普通用户权限规则

普通用户免登录。

普通用户可以：

```text
读取启用成员
读取启用位置
读取启用物资
读取启用设备
读取设备使用状态
创建物资状态上报
创建新物资上报
通过 custom route 登记设备使用
```

普通用户不能：

```text
直接修改 items
直接修改 equipment
直接修改 lab_members
直接修改 locations
直接创建 equipment_usage
直接更新 equipment_usage
删除任何记录
```

---

## 6. 管理员规则

管理员主要使用：

```text
PocketBase Admin
admin-lite.html
```

PocketBase Admin 用于：

```text
原始数据维护
字段修正
成员维护
设备维护
物资维护
紧急修数据
```

admin-lite 用于：

```text
审核物资状态上报
审核新物资上报
查看 active 设备记录
手动关闭 active 设备记录
CSV 导出
```

不要重新开发完整后台管理系统。

---

## 7. 设备登记规则

设备登记是核心业务逻辑，必须通过 custom route 实现。

路径：

```text
POST /api/custom/equipment-use
```

逻辑：

```text
1. 校验 equipment_id
2. 校验 user_name
3. 查询旧 active 记录
4. 如果存在旧 active：
   - end_time = 当前时间
   - status = closed
   - end_reason = overridden_by_new_usage
5. 创建新 active 记录
6. 保存 materials
7. 返回新记录
```

禁止：

```text
前端直接 create equipment_usage
允许同设备多条 active
把设备占用状态写入 equipment.status
```

---

## 8. 设备状态规则

设备是否正在使用由 `equipment_usage` 派生，不直接写入 `equipment.status`。

`equipment.status` 只表示：

```text
可用
维护中
停用
```

显示状态派生：

```text
无 active -> 空闲
有 active 且未超时 -> 使用中
有 active 且超预计时间 -> 预计已完成，待确认
设备维护中 -> 维护中
设备停用 -> 停用
```

---

## 9. 前端规则

普通页面：

```text
手机优先
卡片布局
大按钮
少字段
少层级
每页可返回首页
不横向滚动
不使用复杂表格
```

admin-lite：

```text
手机和电脑双端适配
手机端卡片
电脑端宽卡片或表格
审核操作有确认
关闭设备记录有确认
```

禁止：

```text
引入大型 UI 框架
引入构建系统
把所有逻辑写在一个超大 JS 文件里
```

---

## 10. 部署规则

部署方式固定为：

```text
Ubuntu
/opt/lab-management
PocketBase 单文件
systemd 开机自启
固定局域网 IP
8090 端口
本机备份
人工网盘备份
```

不使用：

```text
Docker
Nginx
HTTPS
公网访问
自动网盘同步
```

---

## 11. 备份规则

必须备份：

```text
pb_data
```

备份方式：

```text
每天本机自动备份
本机保留 30 天
每周或每月手动上传网盘
```

必须在文档中反复强调：

```text
不要删除 pb_data。
pb_data 是系统真实数据。
```

---

## 12. 开发工作规则

每次让 AI Agent 修改代码前，必须先让它阅读：

```text
PROJECT_RULES.md
02_COLLECTIONS_DESIGN.md
03_DEVELOPMENT_TASKS_PocketBase版.md
```

每次任务必须限制范围：

```text
只完成本阶段任务。
不要扩大功能。
不要更换技术栈。
不要引入未授权依赖。
```

每个阶段完成后必须检查：

```text
是否引入禁止技术栈
是否破坏 Collection 设计
是否绕过 custom route
是否需要构建工具
是否影响低维护目标
```

---

## 13. 文档同步规则

如果修改了：

```text
Collection 字段
API 路径
部署路径
备份方式
页面文件名
业务规则
```

必须同步修改：

```text
docs/
README.md
```

不要让代码和文档不一致。

---

## 14. 终止规则

如果 AI Agent 开始引入以下内容，应立即停止任务并回滚：

```text
package.json
Vue/React 依赖
FastAPI/Node 后端
Dockerfile
docker-compose.yml
Nginx 配置
普通用户登录系统
自建管理员账号表
复杂权限表
Excel 导入
图片上传
```

除非项目负责人明确改变技术路线。
