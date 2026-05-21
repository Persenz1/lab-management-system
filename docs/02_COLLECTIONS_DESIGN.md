# PocketBase Collections 设计文档 v0.2

## 1. 总体原则

本系统使用 PocketBase Collections 替代传统后端数据库表设计。

设计原则：

1. 使用尽可能少的 Collection；
2. 字段名称保持英文，便于代码访问；
3. select 值尽量使用中文，便于管理员在 PocketBase Admin 中直接理解；
4. 普通用户匿名可读必要数据；
5. 普通用户匿名可创建上报和设备登记；
6. 正式物资和设备不允许普通用户直接修改；
7. 管理员通过 PocketBase Admin 和 admin-lite 维护数据；
8. 不创建普通用户账号；
9. 不创建 `admin_users` Collection；
10. 不创建 `usage_items` Collection。

最终 Collections：

```text
lab_members
locations
items
item_reports
new_item_reports
equipment
equipment_usage
```

---

## 2. Collection: `lab_members`

用途：维护研究生成员名单，用于普通登记页面选择姓名。

### 字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `name` | text | 是 | - | 成员姓名 |
| `is_active` | bool | 是 | true | 是否启用 |
| `note` | text | 否 | - | 备注 |

### API 规则建议

List/Search/View：

```text
is_active = true
```

Create/Update/Delete：

```text
空
```

说明：

普通用户只能读取启用成员，不能创建、修改、删除成员。管理员在 PocketBase Admin 维护。

---

## 3. Collection: `locations`

用途：维护 A-F 位置编号和说明。

### 字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `code` | select | 是 | - | A/B/C/D/E/F/UNCATEGORIZED/OTHER |
| `display_name` | text | 是 | - | A区、B区等 |
| `description` | text | 否 | - | 位置说明 |
| `sort_order` | number | 否 | 0 | 排序 |
| `is_active` | bool | 是 | true | 是否启用 |

### `code` 选项

```text
A
B
C
D
E
F
UNCATEGORIZED
OTHER
```

### 初始化数据

| code | display_name | description |
|---|---|---|
| A | A区 | 待盘库后填写 |
| B | B区 | 待盘库后填写 |
| C | C区 | 待盘库后填写 |
| D | D区 | 待盘库后填写 |
| E | E区 | 待盘库后填写 |
| F | F区 | 待盘库后填写 |
| UNCATEGORIZED | 未分类 | 暂未确定位置 |
| OTHER | 其他 | 其他位置 |

### API 规则建议

List/Search/View：

```text
is_active = true
```

Create/Update/Delete：

```text
空
```

---

## 4. Collection: `items`

用途：正式物资台账。

### 字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `name` | text | 是 | - | 物资名称 |
| `item_type` | select | 是 | - | 物资类型 |
| `specification` | text | 否 | - | 规格 |
| `status` | select | 是 | 正常 | 当前状态 |
| `location` | relation -> locations | 否 | - | 所在位置 |
| `location_note` | text | 否 | - | 位置补充 |
| `note` | text | 否 | - | 备注 |
| `is_active` | bool | 是 | true | 是否启用 |

### `item_type` 选项

```text
3D打印材料
机械耗材
电子元件
化学材料
工具
其他
```

### `status` 选项

```text
正常
使用中
余量低
已耗尽
损坏/失效
位置不明
```

### API 规则建议

List/Search/View：

```text
is_active = true
```

Create/Update/Delete：

```text
空
```

说明：

普通用户可查看启用物资，但不能直接修改正式台账。状态变更必须进入 `item_reports`，由管理员审核。

---

## 5. Collection: `item_reports`

用途：普通成员对已有物资提交状态上报。

### 字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `item` | relation -> items | 是 | - | 被上报物资 |
| `reporter_name` | text | 是 | - | 上报人 |
| `reported_status` | select | 是 | - | 上报状态 |
| `note` | text | 否 | - | 上报备注 |
| `review_status` | select | 是 | 待审核 | 审核状态 |
| `reviewed_by` | text | 否 | - | 审核人 |
| `reviewed_at` | date | 否 | - | 审核时间 |

### `reported_status` 选项

```text
正常
使用中
余量低
已耗尽
损坏/失效
位置不明
```

### `review_status` 选项

```text
待审核
已通过
已拒绝
```

### API 规则建议

List/Search/View：

```text
true
```

Create：

```text
true
```

Update/Delete：

```text
空
```

说明：

普通用户可创建上报。审核通过/拒绝由 admin-lite 或 PocketBase Admin 完成。

---

## 6. Collection: `new_item_reports`

用途：普通成员提交新物资上报。

### 字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `reporter_name` | text | 是 | - | 上报人 |
| `name` | text | 是 | - | 物资名称 |
| `item_type` | select | 是 | - | 物资类型 |
| `specification` | text | 否 | - | 规格 |
| `initial_status` | select | 是 | 正常 | 初始状态 |
| `location` | relation -> locations | 否 | - | 位置 |
| `location_note` | text | 否 | - | 位置补充 |
| `note` | text | 否 | - | 备注 |
| `review_status` | select | 是 | 待审核 | 审核状态 |
| `reviewed_by` | text | 否 | - | 审核人 |
| `reviewed_at` | date | 否 | - | 审核时间 |
| `created_item` | relation -> items | 否 | - | 审核通过后创建的正式物资 |

### `item_type` 选项

```text
3D打印材料
机械耗材
电子元件
化学材料
工具
其他
```

### `initial_status` 选项

```text
正常
使用中
余量低
```

### `review_status` 选项

```text
待审核
已通过
已拒绝
```

### API 规则建议

List/Search/View：

```text
true
```

Create：

```text
true
```

Update/Delete：

```text
空
```

说明：

普通用户可提交新物资，但不会直接进入正式台账。审核通过后创建 `items` 记录。

---

## 7. Collection: `equipment`

用途：设备基础信息。

### 字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `name` | text | 是 | - | 设备名称 |
| `equipment_type` | select | 是 | - | 设备类型 |
| `location` | relation -> locations | 否 | - | 位置 |
| `status` | select | 是 | 可用 | 设备管理状态 |
| `default_duration` | number | 否 | - | 默认预计使用分钟数 |
| `note` | text | 否 | - | 备注 |
| `is_active` | bool | 是 | true | 是否启用 |

### `equipment_type` 选项

```text
服务器
3D打印机
测试设备
加工设备
其他
```

### `status` 选项

```text
可用
维护中
停用
```

### API 规则建议

List/Search/View：

```text
is_active = true
```

Create/Update/Delete：

```text
空
```

说明：

`equipment.status` 表示设备管理状态，不表示设备是否正在被使用。当前占用状态由 `equipment_usage` 派生。

---

## 8. Collection: `equipment_usage`

用途：设备使用登记记录。

### 字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---|---|
| `equipment` | relation -> equipment | 是 | - | 被使用设备 |
| `user_name` | text | 是 | - | 使用人 |
| `start_time` | date | 是 | 当前时间 | 开始时间 |
| `end_time` | date | 否 | - | 结束时间 |
| `estimated_duration` | number | 否 | - | 预计使用分钟数 |
| `materials` | relation -> items, multiple | 否 | - | 使用材料 |
| `status` | select | 是 | active | 记录状态 |
| `end_reason` | select | 否 | - | 结束原因 |
| `note` | text | 否 | - | 备注 |

### `status` 选项

```text
active
closed
```

说明：

该字段使用英文值，因为前端和 custom route 会频繁判断。

### `end_reason` 选项

```text
overridden_by_new_usage
admin_closed
manual_end
system_timeout_marked
```

v0.2 实际主要使用：

```text
overridden_by_new_usage
admin_closed
```

### API 规则建议

List/Search/View：

```text
true
```

Create：

```text
空
```

Update/Delete：

```text
空
```

说明：

普通用户不应直接创建 `equipment_usage`，必须通过 custom route 创建，保证“新登记自动关闭旧 active 记录”。

---

## 9. 关键业务逻辑

### 9.1 设备登记 custom route

路径建议：

```text
POST /api/custom/equipment-use
```

请求字段：

```json
{
  "equipment_id": "设备记录ID",
  "user_name": "张三",
  "estimated_duration": 240,
  "materials": ["物资ID1", "物资ID2"],
  "note": "可选备注"
}
```

逻辑：

```text
1. 校验 equipment_id 和 user_name
2. 查询设备是否存在、是否启用、是否可用
3. 查询同设备 status = active 的旧记录
4. 如果存在旧记录：
   - end_time = 当前时间
   - status = closed
   - end_reason = overridden_by_new_usage
5. 创建新记录：
   - equipment = 当前设备
   - user_name = 请求中的姓名
   - start_time = 当前时间
   - estimated_duration = 请求值
   - materials = 请求中的物资列表
   - status = active
6. 返回新记录
```

### 9.2 审核物资状态上报

通过：

```text
1. item_reports.review_status = 已通过
2. item_reports.reviewed_by = 管理员显示名
3. item_reports.reviewed_at = 当前时间
4. items.status = item_reports.reported_status
```

拒绝：

```text
1. item_reports.review_status = 已拒绝
2. item_reports.reviewed_by = 管理员显示名
3. item_reports.reviewed_at = 当前时间
4. items.status 不变
```

### 9.3 审核新物资上报

通过：

```text
1. 创建 items 记录
2. new_item_reports.review_status = 已通过
3. new_item_reports.reviewed_by = 管理员显示名
4. new_item_reports.reviewed_at = 当前时间
5. new_item_reports.created_item = 新建物资
```

拒绝：

```text
1. new_item_reports.review_status = 已拒绝
2. new_item_reports.reviewed_by = 管理员显示名
3. new_item_reports.reviewed_at = 当前时间
4. 不创建 items 记录
```

---

## 10. 派生状态

### 10.1 设备显示状态

伪代码：

```text
if equipment.is_active != true:
    return "停用"

if equipment.status == "维护中":
    return "维护中"

active_usage = find equipment_usage where equipment = current and status = "active"

if active_usage not found:
    return "空闲"

if active_usage.estimated_duration is empty:
    return "使用中"

expected_end = active_usage.start_time + estimated_duration minutes

if now <= expected_end:
    return "使用中"

return "预计已完成，待确认"
```

### 10.2 物资待审核上报标记

伪代码：

```text
has_pending_report = exists item_reports
where item = current_item
and review_status = "待审核"
```

---

## 11. 注意事项

1. 不要给普通用户开放 `items` 的 update 权限；
2. 不要给普通用户开放 `equipment` 的 update 权限；
3. 不要让普通用户直接 create `equipment_usage`；
4. 设备登记必须走 custom route；
5. 所有正式数据修正由管理员完成；
6. `pb_data` 保存真实数据，不能删除。
