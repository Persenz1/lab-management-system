// ============================================================
// pb_hooks/main.pb.js
// PocketBase JS Hook
//
// PocketBase v0.23+ 兼容（使用 $app.save / runInTransaction）
// v0.22 用户：$app.save 可用，但不支持 runInTransaction，见底部回退说明
//
// 部署：将此文件放入 pb_hooks/ 目录，重启 PocketBase 即可生效
// ============================================================

// ----------------------------------------------------------
// 辅助函数：校验材料 ID 是否存在且 is_active=true
// ----------------------------------------------------------
function validateMaterials(materialIds) {
    if (!Array.isArray(materialIds) || materialIds.length === 0) {
        return [];
    }
    let clean = materialIds
        .filter(function (id) { return id && id.toString().trim(); })
        .filter(function (id, i, arr) { return arr.indexOf(id) === i; });

    for (let i = 0; i < clean.length; i++) {
        try {
            let item = $app.findRecordById("items", clean[i]);
            if (item.getBool("is_active") !== true) {
                return { error: "材料「" + item.getString("name") + "」已停用，请重新选择" };
            }
        } catch (e) {
            return { error: "材料记录 " + clean[i] + " 不存在" };
        }
    }
    return clean;
}

// ============================================================
// Hook 1: 强制 review_status 为 "待审核"，防止匿名用户伪造审核状态
// ============================================================
onRecordCreateRequest(function (e) {
    e.record.set("review_status", "待审核");
    e.record.set("reviewed_by", "");
    e.record.set("reviewed_at", "");
}, "item_reports", "new_item_reports");

onRecordCreateRequest(function (e) {
    e.record.set("created_item", "");
}, "new_item_reports");

// ============================================================
// Hook 2: 设备使用登记 custom route
// ============================================================
routerAdd("POST", "/api/custom/equipment-use", function (c) {
    // ---- 1. 解析请求体 ----
    var rawBody = $apis.requestInfo(c).body;
    var data = {};

    try {
        data = JSON.parse(rawBody || "{}");
    } catch (e) {
        return c.json(400, { code: 400, message: "请求格式错误，请使用 JSON" });
    }

    // ---- 2. 校验必填字段 ----
    var equipmentId = (data.equipment_id || "").trim();
    var userName = (data.user_name || "").trim();

    if (!equipmentId) {
        return c.json(400, { code: 400, message: "缺少 equipment_id" });
    }
    if (!userName) {
        return c.json(400, { code: 400, message: "缺少 user_name" });
    }

    var estimatedDuration = data.estimated_duration || 0;
    if (estimatedDuration && typeof estimatedDuration !== "number") {
        estimatedDuration = parseInt(estimatedDuration, 10) || 0;
    }
    var materials = data.materials || [];
    var note = (data.note || "").trim();

    // ---- 3. 校验设备 ----
    var equipment;
    try {
        equipment = $app.findRecordById("equipment", equipmentId);
    } catch (e) {
        return c.json(404, { code: 404, message: "设备不存在" });
    }

    if (equipment.getBool("is_active") !== true) {
        return c.json(400, { code: 400, message: "设备已停用，无法登记" });
    }
    if (equipment.getString("status") !== "可用") {
        return c.json(400, {
            code: 400,
            message: "设备当前状态为「" + equipment.getString("status") + "」，无法登记使用",
        });
    }

    // ---- 4. 校验材料（在事务外完成，避免事务内校验失败） ----
    var validMaterials = validateMaterials(materials);
    if (validMaterials && validMaterials.error) {
        return c.json(400, { code: 400, message: validMaterials.error });
    }

    var now = new Date().toISOString();

    // ---- 5. 在事务中执行：关闭旧 active + 创建新记录 ----
    //
    // 如果 PocketBase 版本支持 runInTransaction（v0.23+），
    // 整个操作是原子的：任一步骤失败都会回滚。
    //
    // 如果不支持（v0.22），回退到顺序执行，并在注释中说明限制。
    // ----------------------------------------------------------
    var result = null;
    var hasTransaction = typeof $app.runInTransaction === "function";

    if (hasTransaction) {
        // v0.23+：原子事务
        try {
            result = $app.runInTransaction(function (txApp) {
                // 关闭旧 active 记录
                var oldRecords = txApp.findRecordsByFilter(
                    "equipment_usage",
                    "equipment = {:eqId} && status = {:sts}",
                    "", 100, 0,
                    { eqId: equipmentId, sts: "active" }
                );
                for (var i = 0; i < oldRecords.length; i++) {
                    var rec = oldRecords[i];
                    rec.set("end_time", now);
                    rec.set("status", "closed");
                    rec.set("end_reason", "overridden_by_new_usage");
                    txApp.save(rec);
                }

                // 创建新记录
                var collection = txApp.findCollectionByNameOrId("equipment_usage");
                var newRecord = new Record(collection);
                newRecord.set("equipment", equipmentId);
                newRecord.set("user_name", userName);
                newRecord.set("start_time", now);
                newRecord.set("status", "active");
                newRecord.set("note", note);
                if (estimatedDuration && estimatedDuration > 0) {
                    newRecord.set("estimated_duration", estimatedDuration);
                }
                if (Array.isArray(validMaterials) && validMaterials.length > 0) {
                    newRecord.set("materials", validMaterials);
                }
                txApp.save(newRecord);

                return newRecord;
            });
        } catch (e) {
            var msg = "登记失败：";
            try { msg += e.message || e; } catch (_) { msg += "请稍后重试"; }
            return c.json(500, { code: 500, message: msg });
        }
    } else {
        // v0.22 回退：顺序执行
        // 注意：存在极小概率“关闭成功但创建失败”，建议升级到 v0.23+
        try {
            var oldRecords = $app.findRecordsByFilter(
                "equipment_usage",
                "equipment = {:eqId} && status = {:sts}",
                "", 100, 0,
                { eqId: equipmentId, sts: "active" }
            );
            for (var i = 0; i < oldRecords.length; i++) {
                var rec = oldRecords[i];
                rec.set("end_time", now);
                rec.set("status", "closed");
                rec.set("end_reason", "overridden_by_new_usage");
                $app.save(rec);
            }
            var collection = $app.findCollectionByNameOrId("equipment_usage");
            var newRecord = new Record(collection);
            newRecord.set("equipment", equipmentId);
            newRecord.set("user_name", userName);
            newRecord.set("start_time", now);
            newRecord.set("status", "active");
            newRecord.set("note", note);
            if (estimatedDuration && estimatedDuration > 0) {
                newRecord.set("estimated_duration", estimatedDuration);
            }
            if (Array.isArray(validMaterials) && validMaterials.length > 0) {
                newRecord.set("materials", validMaterials);
            }
            $app.save(newRecord);
            result = newRecord;
        } catch (e) {
            var msg = "登记失败：";
            try { msg += e.message || e; } catch (_) { msg += "请稍后重试"; }
            return c.json(500, { code: 500, message: msg });
        }
    }

    // ---- 6. 返回新记录 ----
    try {
        var saved = $app.findRecordById("equipment_usage", result.getId());
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
        return c.json(200, {
            code: 200,
            message: "登记成功",
            data: {
                id: result.getId(),
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
