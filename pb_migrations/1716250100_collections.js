const withTimestamps = (fields) => fields.concat([
    { type: "autodate", name: "created", onCreate: true, onUpdate: false },
    { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
]);

migrate((app) => {
    const labMembers = new Collection({
        type: "base",
        name: "lab_members",
        listRule: "is_active = true",
        viewRule: "is_active = true",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: withTimestamps([
            { type: "text", name: "name", required: true },
            { type: "bool", name: "is_active", required: true },
            { type: "text", name: "note" },
        ]),
    });
    app.save(labMembers);

    const locations = new Collection({
        type: "base",
        name: "locations",
        listRule: "is_active = true",
        viewRule: "is_active = true",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: withTimestamps([
            { type: "select", name: "code", required: true, values: ["A", "B", "C", "D", "E", "F", "UNCATEGORIZED", "OTHER"] },
            { type: "text", name: "display_name", required: true },
            { type: "text", name: "description" },
            { type: "number", name: "sort_order" },
            { type: "bool", name: "is_active", required: true },
        ]),
    });
    app.save(locations);

    const initialLocations = [
        ["A", "A区", "待盘库后填写", 1],
        ["B", "B区", "待盘库后填写", 2],
        ["C", "C区", "待盘库后填写", 3],
        ["D", "D区", "待盘库后填写", 4],
        ["E", "E区", "待盘库后填写", 5],
        ["F", "F区", "待盘库后填写", 6],
        ["UNCATEGORIZED", "未分类", "暂未确定位置", 7],
        ["OTHER", "其他", "其他位置", 8],
    ];
    for (let i = 0; i < initialLocations.length; i++) {
        const row = initialLocations[i];
        const record = new Record(locations);
        record.set("code", row[0]);
        record.set("display_name", row[1]);
        record.set("description", row[2]);
        record.set("sort_order", row[3]);
        record.set("is_active", true);
        app.save(record);
    }

    const items = new Collection({
        type: "base",
        name: "items",
        listRule: "is_active = true",
        viewRule: "is_active = true",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: withTimestamps([
            { type: "text", name: "name", required: true },
            { type: "select", name: "item_type", required: true, values: ["3D打印材料", "机械耗材", "电子元件", "化学材料", "工具", "其他"] },
            { type: "text", name: "specification" },
            { type: "select", name: "status", required: true, values: ["正常", "使用中", "余量低", "已耗尽", "损坏/失效", "位置不明"] },
            { type: "relation", name: "location", collectionId: locations.id, maxSelect: 1 },
            { type: "text", name: "location_note" },
            { type: "text", name: "note" },
            { type: "bool", name: "is_active", required: true },
        ]),
    });
    app.save(items);

    const itemReports = new Collection({
        type: "base",
        name: "item_reports",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: null,
        deleteRule: null,
        fields: withTimestamps([
            { type: "relation", name: "item", required: true, collectionId: items.id, maxSelect: 1 },
            { type: "text", name: "reporter_name", required: true },
            { type: "select", name: "reported_status", required: true, values: ["正常", "使用中", "余量低", "已耗尽", "损坏/失效", "位置不明"] },
            { type: "text", name: "note" },
            { type: "select", name: "review_status", required: true, values: ["待审核", "已通过", "已拒绝"] },
            { type: "text", name: "reviewed_by" },
            { type: "date", name: "reviewed_at" },
        ]),
    });
    app.save(itemReports);

    const newItemReports = new Collection({
        type: "base",
        name: "new_item_reports",
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: null,
        deleteRule: null,
        fields: withTimestamps([
            { type: "text", name: "reporter_name", required: true },
            { type: "text", name: "name", required: true },
            { type: "select", name: "item_type", required: true, values: ["3D打印材料", "机械耗材", "电子元件", "化学材料", "工具", "其他"] },
            { type: "text", name: "specification" },
            { type: "select", name: "initial_status", required: true, values: ["正常", "使用中", "余量低"] },
            { type: "relation", name: "location", collectionId: locations.id, maxSelect: 1 },
            { type: "text", name: "location_note" },
            { type: "text", name: "note" },
            { type: "select", name: "review_status", required: true, values: ["待审核", "已通过", "已拒绝"] },
            { type: "text", name: "reviewed_by" },
            { type: "date", name: "reviewed_at" },
            { type: "relation", name: "created_item", collectionId: items.id, maxSelect: 1 },
        ]),
    });
    app.save(newItemReports);

    const equipment = new Collection({
        type: "base",
        name: "equipment",
        listRule: "is_active = true",
        viewRule: "is_active = true",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: withTimestamps([
            { type: "text", name: "name", required: true },
            { type: "select", name: "equipment_type", required: true, values: ["服务器", "3D打印机", "测试设备", "加工设备", "其他"] },
            { type: "relation", name: "location", collectionId: locations.id, maxSelect: 1 },
            { type: "select", name: "status", required: true, values: ["可用", "维护中", "停用"] },
            { type: "number", name: "default_duration" },
            { type: "text", name: "note" },
            { type: "bool", name: "is_active", required: true },
        ]),
    });
    app.save(equipment);

    const initialEquipment = [
        ["服务器 A", "服务器"],
        ["服务器 B", "服务器"],
        ["3D 打印机", "3D打印机"],
    ];
    for (let i = 0; i < initialEquipment.length; i++) {
        const row = initialEquipment[i];
        const record = new Record(equipment);
        record.set("name", row[0]);
        record.set("equipment_type", row[1]);
        record.set("status", "可用");
        record.set("is_active", true);
        app.save(record);
    }

    const equipmentUsage = new Collection({
        type: "base",
        name: "equipment_usage",
        listRule: "",
        viewRule: "",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: withTimestamps([
            { type: "relation", name: "equipment", required: true, collectionId: equipment.id, maxSelect: 1 },
            { type: "text", name: "user_name", required: true },
            { type: "date", name: "start_time", required: true },
            { type: "date", name: "end_time" },
            { type: "number", name: "estimated_duration" },
            { type: "relation", name: "materials", collectionId: items.id, maxSelect: 999 },
            { type: "select", name: "status", required: true, values: ["active", "closed"] },
            { type: "select", name: "end_reason", values: ["overridden_by_new_usage", "admin_closed", "manual_end", "system_timeout_marked"] },
            { type: "text", name: "note" },
        ]),
    });
    app.save(equipmentUsage);
}, (app) => {
    const names = [
        "equipment_usage",
        "equipment",
        "new_item_reports",
        "item_reports",
        "items",
        "locations",
        "lab_members",
    ];
    for (let i = 0; i < names.length; i++) {
        try {
            app.delete(app.findCollectionByNameOrId(names[i]));
        } catch (_) {}
    }
});
