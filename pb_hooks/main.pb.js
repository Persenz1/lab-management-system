// ============================================================
// pb_hooks/main.pb.js
// PocketBase JS Hook
//
// PocketBase v0.23+ required（使用 $app.save / runInTransaction）
//
// 部署：将此文件放入 pb_hooks/ 目录，重启 PocketBase 即可生效
// ============================================================

// ============================================================
// Hook 1: 强制 review_status 为 "待审核"，防止匿名用户伪造审核状态
// ============================================================
onRecordCreateRequest(function (e) {
    e.record.set("review_status", "待审核");
    e.record.set("reviewed_by", "");
    e.record.set("reviewed_at", null);
    if (e.collection.name === "new_item_reports") {
        e.record.set("created_item", null);
    }
    return e.next();
}, "item_reports", "new_item_reports");

// ============================================================
// Hook 2: 设备使用登记 custom route
// ============================================================
routerAdd("POST", "/api/custom/equipment-use", function (c) {
    function readBody() {
        var body = c.requestInfo().body || {};
        if (typeof body === "string") {
            try {
                return JSON.parse(body || "{}");
            } catch (_) {
                throw new Error("请求格式错误，请使用 JSON");
            }
        }
        return body;
    }

    function requiredText(data, fieldName, label) {
        var value = (data[fieldName] || "").toString().trim();
        if (!value) {
            throw new Error("缺少 " + (label || fieldName));
        }
        return value;
    }

    function validateMaterialIds(materialIds) {
        if (!Array.isArray(materialIds) || materialIds.length === 0) {
            return [];
        }
        var clean = materialIds
            .filter(function (id) { return id && id.toString().trim(); })
            .filter(function (id, i, arr) { return arr.indexOf(id) === i; });

        for (var i = 0; i < clean.length; i++) {
            try {
                var item = c.app.findRecordById("items", clean[i]);
                if (item.getBool("is_active") !== true) {
                    return { error: "材料「" + item.getString("name") + "」已停用，请重新选择" };
                }
            } catch (_) {
                return { error: "材料记录 " + clean[i] + " 不存在" };
            }
        }
        return clean;
    }

    // ---- 1. 解析请求体 ----
    var data = {};
    try {
        data = readBody();
    } catch (e) {
        return c.json(400, { code: 400, message: e.message || "请求格式错误，请使用 JSON" });
    }

    // ---- 2. 校验必填字段 ----
    var equipmentId;
    var userName;
    try {
        equipmentId = requiredText(data, "equipment_id", "equipment_id");
        userName = requiredText(data, "user_name", "user_name");
    } catch (e) {
        return c.json(400, { code: 400, message: e.message });
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
        equipment = c.app.findRecordById("equipment", equipmentId);
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
    var validMaterials = validateMaterialIds(materials);
    if (validMaterials && validMaterials.error) {
        return c.json(400, { code: 400, message: validMaterials.error });
    }

    var now = new Date().toISOString();

    // ---- 5. 在事务中执行：关闭旧 active + 创建新记录 ----
    var newUsageId = "";
    if (typeof c.app.runInTransaction !== "function") {
        return c.json(500, {
            code: 500,
            message: "当前 PocketBase 版本不支持事务，请升级到 v0.23+",
        });
    }

    try {
        c.app.runInTransaction(function (txApp) {
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
            newUsageId = newRecord.id;
        });
    } catch (e) {
        var msg = "登记失败：";
        try { msg += e.message || e; } catch (_) { msg += "请稍后重试"; }
        return c.json(500, { code: 500, message: msg });
    }

    // ---- 6. 返回新记录 ----
    try {
        var saved = c.app.findRecordById("equipment_usage", newUsageId);
        return c.json(200, {
            code: 200,
            message: "登记成功",
            data: {
                id: saved.id,
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
                id: newUsageId,
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

// ============================================================
// Hook 3: admin-lite 审核与关闭设备记录 custom routes
// ============================================================
routerAdd("POST", "/api/custom/admin/approve-item-report", function (e) {
    try {
        var data = e.requestInfo().body || {};
        var reportId = (data.report_id || "").toString().trim();
        if (!reportId) {
            throw new Error("缺少 report_id");
        }
        var reviewer = (data.reviewed_by || "").toString().trim();
        if (!reviewer && e.auth) {
            var email = e.auth.getString("email") || "";
            reviewer = email.split("@")[0] || email;
        }
        reviewer = reviewer || "admin";
        var now = new Date().toISOString();

        e.app.runInTransaction(function (txApp) {
            var report = txApp.findRecordById("item_reports", reportId);
            if (report.getString("review_status") !== "待审核") {
                throw new Error("该上报已处理，请刷新页面");
            }

            var itemId = report.getString("item");
            var item = txApp.findRecordById("items", itemId);
            item.set("status", report.getString("reported_status"));
            txApp.save(item);

            report.set("review_status", "已通过");
            report.set("reviewed_by", reviewer);
            report.set("reviewed_at", now);
            txApp.save(report);
        });

        return e.json(200, { code: 200, message: "已通过物资状态上报" });
    } catch (err) {
        return e.json(400, { code: 400, message: err.message || "操作失败" });
    }
}, $apis.requireSuperuserAuth());

routerAdd("POST", "/api/custom/admin/reject-item-report", function (e) {
    try {
        var data = e.requestInfo().body || {};
        var reportId = (data.report_id || "").toString().trim();
        if (!reportId) {
            throw new Error("缺少 report_id");
        }
        var reviewer = (data.reviewed_by || "").toString().trim();
        if (!reviewer && e.auth) {
            var email = e.auth.getString("email") || "";
            reviewer = email.split("@")[0] || email;
        }
        reviewer = reviewer || "admin";
        var now = new Date().toISOString();

        e.app.runInTransaction(function (txApp) {
            var report = txApp.findRecordById("item_reports", reportId);
            if (report.getString("review_status") !== "待审核") {
                throw new Error("该上报已处理，请刷新页面");
            }
            report.set("review_status", "已拒绝");
            report.set("reviewed_by", reviewer);
            report.set("reviewed_at", now);
            txApp.save(report);
        });

        return e.json(200, { code: 200, message: "已拒绝物资状态上报" });
    } catch (err) {
        return e.json(400, { code: 400, message: err.message || "操作失败" });
    }
}, $apis.requireSuperuserAuth());

routerAdd("POST", "/api/custom/admin/approve-new-item", function (e) {
    try {
        var data = e.requestInfo().body || {};
        var reportId = (data.report_id || "").toString().trim();
        if (!reportId) {
            throw new Error("缺少 report_id");
        }
        var reviewer = (data.reviewed_by || "").toString().trim();
        if (!reviewer && e.auth) {
            var email = e.auth.getString("email") || "";
            reviewer = email.split("@")[0] || email;
        }
        reviewer = reviewer || "admin";
        var now = new Date().toISOString();

        e.app.runInTransaction(function (txApp) {
            var report = txApp.findRecordById("new_item_reports", reportId);
            if (report.getString("review_status") !== "待审核") {
                throw new Error("该上报已处理，请刷新页面");
            }

            var itemsCollection = txApp.findCollectionByNameOrId("items");
            var item = new Record(itemsCollection);
            item.set("name", report.getString("name"));
            item.set("item_type", report.getString("item_type"));
            item.set("specification", report.getString("specification"));
            item.set("status", report.getString("initial_status") || "正常");
            item.set("location_note", report.getString("location_note"));
            item.set("note", report.getString("note"));
            item.set("is_active", true);

            var location = report.getString("location");
            if (location) {
                item.set("location", location);
            }

            txApp.save(item);

            report.set("review_status", "已通过");
            report.set("reviewed_by", reviewer);
            report.set("reviewed_at", now);
            report.set("created_item", item.id);
            txApp.save(report);
        });

        return e.json(200, { code: 200, message: "已通过新物资上报" });
    } catch (err) {
        return e.json(400, { code: 400, message: err.message || "操作失败" });
    }
}, $apis.requireSuperuserAuth());

routerAdd("POST", "/api/custom/admin/reject-new-item", function (e) {
    try {
        var data = e.requestInfo().body || {};
        var reportId = (data.report_id || "").toString().trim();
        if (!reportId) {
            throw new Error("缺少 report_id");
        }
        var reviewer = (data.reviewed_by || "").toString().trim();
        if (!reviewer && e.auth) {
            var email = e.auth.getString("email") || "";
            reviewer = email.split("@")[0] || email;
        }
        reviewer = reviewer || "admin";
        var now = new Date().toISOString();

        e.app.runInTransaction(function (txApp) {
            var report = txApp.findRecordById("new_item_reports", reportId);
            if (report.getString("review_status") !== "待审核") {
                throw new Error("该上报已处理，请刷新页面");
            }
            report.set("review_status", "已拒绝");
            report.set("reviewed_by", reviewer);
            report.set("reviewed_at", now);
            txApp.save(report);
        });

        return e.json(200, { code: 200, message: "已拒绝新物资上报" });
    } catch (err) {
        return e.json(400, { code: 400, message: err.message || "操作失败" });
    }
}, $apis.requireSuperuserAuth());

routerAdd("POST", "/api/custom/admin/close-equipment-usage", function (e) {
    try {
        var data = e.requestInfo().body || {};
        var usageId = (data.usage_id || "").toString().trim();
        if (!usageId) {
            throw new Error("缺少 usage_id");
        }
        var now = new Date().toISOString();

        e.app.runInTransaction(function (txApp) {
            var usage = txApp.findRecordById("equipment_usage", usageId);
            if (usage.getString("status") !== "active") {
                throw new Error("该设备使用记录已关闭，请刷新页面");
            }
            usage.set("status", "closed");
            usage.set("end_time", now);
            usage.set("end_reason", "admin_closed");
            txApp.save(usage);
        });

        return e.json(200, { code: 200, message: "设备使用记录已关闭" });
    } catch (err) {
        return e.json(400, { code: 400, message: err.message || "操作失败" });
    }
}, $apis.requireSuperuserAuth());
