// ============================================================
// pb_hooks/main.pb.js
// PocketBase JS Hook — 设备使用登记 custom route
//
// 部署：将此文件放入 pb_hooks/ 目录，重启 PocketBase 即可生效
// ============================================================

// ----------------------------------------------------------
// 并发说明：
//
// PocketBase JS hooks 运行在单个 Go 协程的事件循环中，
// 同一 PocketBase 实例内不会有两个 hook 请求同时执行 JS 代码。
// 因此 "查询旧 active → 关闭 → 创建新记录" 的序列在单实例
// 部署下是安全的，不会产生多条 active 记录。
//
// 限制：如果有多个 PocketBase 实例共享同一个 pb_data
// 目录（不推荐），上述保证将不成立。本项目的 systemd 单实例
// 部署不存在此问题。
// ----------------------------------------------------------

routerAdd("POST", "/api/custom/equipment-use", (c) => {
    // ---- 1. 解析请求体 ----
    let body = $apis.requestInfo(c).body;
    let data = {};

    try {
        data = JSON.parse(body || "{}");
    } catch (e) {
        return c.json(400, {
            code: 400,
            message: "请求格式错误，请使用 JSON",
        });
    }

    // ---- 2. 校验必填字段 ----
    let equipmentId = (data.equipment_id || "").trim();
    let userName = (data.user_name || "").trim();

    if (!equipmentId) {
        return c.json(400, {
            code: 400,
            message: "缺少 equipment_id",
        });
    }
    if (!userName) {
        return c.json(400, {
            code: 400,
            message: "缺少 user_name",
        });
    }

    let estimatedDuration = data.estimated_duration || 0;
    let materials = data.materials || [];
    let note = (data.note || "").trim();

    if (estimatedDuration && typeof estimatedDuration !== "number") {
        estimatedDuration = parseInt(estimatedDuration, 10) || 0;
    }

    // ---- 3. 查询设备 ----
    let equipment;
    let equipmentCollection;

    try {
        equipmentCollection = $app.findCollectionByNameOrId("equipment");
        equipment = $app.findRecordById("equipment", equipmentId);
    } catch (e) {
        return c.json(404, {
            code: 404,
            message: "设备不存在",
        });
    }

    // ---- 4. 校验设备状态 ----
    if (equipment.getBool("is_active") !== true) {
        return c.json(400, {
            code: 400,
            message: "设备已停用，无法登记",
        });
    }

    let equipmentStatus = equipment.getString("status");
    if (equipmentStatus !== "可用") {
        return c.json(400, {
            code: 400,
            message: "设备当前状态为「" + equipmentStatus + "」，无法登记使用",
        });
    }

    // ---- 5. 查询并关闭旧 active 记录 ----
    // 注意：理论上同一设备只会有一条 active 记录，
    // 但用循环处理以防万一存在脏数据
    let now = new Date().toISOString();

    try {
        let oldActiveRecords = $app.findRecordsByFilter(
            "equipment_usage",
            "equipment = {:eqId} && status = {:sts}",
            "",   // 不排序
            100,  // 取足够多条
            0,
            { eqId: equipmentId, sts: "active" }
        );

        for (let i = 0; i < oldActiveRecords.length; i++) {
            let oldRecord = oldActiveRecords[i];
            oldRecord.set("end_time", now);
            oldRecord.set("status", "closed");
            oldRecord.set("end_reason", "overridden_by_new_usage");
            $app.dao().saveRecord(oldRecord);
        }
    } catch (e) {
        return c.json(500, {
            code: 500,
            message: "关闭旧使用记录时出错：请稍后重试",
        });
    }

    // ---- 6. 创建新 active 记录 ----
    let usageCollection;
    try {
        usageCollection = $app.findCollectionByNameOrId("equipment_usage");
    } catch (e) {
        return c.json(500, {
            code: 500,
            message: "系统错误：找不到 equipment_usage 集合",
        });
    }

    let newRecord = new Record(usageCollection);

    newRecord.set("equipment", equipmentId);
    newRecord.set("user_name", userName);
    newRecord.set("start_time", now);
    newRecord.set("status", "active");
    newRecord.set("note", note);

    if (estimatedDuration && estimatedDuration > 0) {
        newRecord.set("estimated_duration", estimatedDuration);
    }

    // materials 是多个 relation 到 items，值为 ID 数组
    if (Array.isArray(materials) && materials.length > 0) {
        // 去除空值和重复
        let cleanMaterials = materials
            .filter(function (id) { return id && id.toString().trim(); })
            .filter(function (id, i, arr) { return arr.indexOf(id) === i; });
        if (cleanMaterials.length > 0) {
            newRecord.set("materials", cleanMaterials);
        }
    }

    try {
        $app.dao().saveRecord(newRecord);
    } catch (e) {
        let msg = "创建使用记录时出错：";
        try {
            msg += e.message || e;
        } catch (_) {
            msg += "请稍后重试";
        }
        return c.json(500, {
            code: 500,
            message: msg,
        });
    }

    // ---- 7. 返回新记录 ----
    // 重新查询以获得完整 expand 数据
    try {
        let saved = $app.findRecordById("equipment_usage", newRecord.getId());
        return c.json(200, {
            code: 200,
            message: "登记成功",
            data: {
                id: saved.getId(),
                equipment: saved.getString("equipment"),
                user_name: saved.getString("user_name"),
                start_time: saved.getString("start_time"),
                estimated_duration: saved.getInt("estimated_duration"),
                status: saved.getString("status"),
                note: saved.getString("note"),
                created: saved.getString("created"),
            },
        });
    } catch (e) {
        // 即使查询失败，记录已创建，返回基本信息
        return c.json(200, {
            code: 200,
            message: "登记成功",
            data: {
                id: newRecord.getId(),
                equipment: equipmentId,
                user_name: userName,
                start_time: now,
                estimated_duration: estimatedDuration || 0,
                status: "active",
                note: note,
            },
        });
    }
});
