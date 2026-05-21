// ============================================================
// PocketBase API 封装
// 统一管理 PocketBase SDK 初始化和所有 API 请求
// ============================================================

var pbApi = (function () {
  'use strict';

  var PB_URL = window.location.origin;
  var pb = null;

  function init() {
    if (typeof PocketBase === 'undefined') {
      console.error('PocketBase SDK 未加载，请确保已引入 pocketbase.umd.js');
      return false;
    }
    pb = new PocketBase(PB_URL);
    pb.autoCancellation(false);
    return true;
  }

  function getPb() {
    return pb;
  }

  function getError(err) {
    if (err && err.response && err.response.message) {
      return err.response.message;
    }
    if (err && err.message) {
      return err.message;
    }
    return '未知错误，请稍后重试';
  }

  // ---- 成员 ----
  function getMembers() {
    return pb.collection('lab_members').getFullList({
      filter: 'is_active=true',
      sort: 'name',
    });
  }

  // ---- 位置 ----
  function getLocations() {
    return pb.collection('locations').getFullList({
      filter: 'is_active=true',
      sort: 'sort_order',
    });
  }

  // ---- 物资 ----
  function getItems(filterText, typeFilter, statusFilter, locationFilter) {
    var filters = ['is_active=true'];
    if (filterText && filterText.trim()) {
      var txt = filterText.trim();
      filters.push(pb.filter('(name~{:txt} || specification~{:txt})', { txt: txt }));
    }
    if (typeFilter) {
      filters.push(pb.filter('item_type={:type}', { type: typeFilter }));
    }
    if (statusFilter) {
      filters.push(pb.filter('status={:status}', { status: statusFilter }));
    }
    if (locationFilter) {
      filters.push(pb.filter('location.display_name={:location}', { location: locationFilter }));
    }

    return pb.collection('items').getFullList({
      filter: filters.join(' && '),
      sort: 'name',
      expand: 'location',
    });
  }

  // ---- 设备 ----
  function getEquipment() {
    return pb.collection('equipment').getFullList({
      filter: 'is_active=true',
      sort: 'name',
      expand: 'location',
    });
  }

  // ---- 获取设备 active 使用记录 ----
  function getActiveUsage(equipmentId) {
    return pb.collection('equipment_usage').getFullList({
      filter: pb.filter('equipment={:equipmentId} && status={:status}', {
        equipmentId: equipmentId,
        status: 'active',
      }),
      sort: '-start_time',
      expand: 'equipment,materials',
    });
  }

  // ---- 获取物资待审核上报 ----
  function getPendingReports(itemId) {
    return pb.collection('item_reports').getFullList({
      filter: pb.filter('item={:itemId} && review_status={:status}', {
        itemId: itemId,
        status: '待审核',
      }),
    });
  }

  // ---- 批量获取所有 active 使用记录 ----
  function getAllActiveUsage() {
    return pb.collection('equipment_usage').getFullList({
      filter: "status='active'",
      sort: '-start_time',
      expand: 'equipment',
    });
  }

  // ---- 批量获取所有待审核上报 ----
  function getAllPendingReports() {
    return pb.collection('item_reports').getFullList({
      filter: "review_status='待审核'",
    });
  }

  // ---- 提交物资状态上报 ----
  function submitItemReport(data) {
    return pb.collection('item_reports').create(data);
  }

  // ---- 提交新物资上报 ----
  function submitNewItemReport(data) {
    return pb.collection('new_item_reports').create(data);
  }

  // ---- 设备使用登记（调用 custom route） ----
  function submitEquipmentUse(data) {
    return pb.send('/api/custom/equipment-use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  // ---- 管理员操作（后续阶段使用） ----
  function adminAuth(email, password) {
    return pb.collection('_superusers').authWithPassword(email, password);
  }

  function getPendingItemReports() {
    return pb.collection('item_reports').getFullList({
      filter: "review_status='待审核'",
      sort: '-created',
      expand: 'item',
    });
  }

  function getPendingNewItems() {
    return pb.collection('new_item_reports').getFullList({
      filter: "review_status='待审核'",
      sort: '-created',
    });
  }

  function sendAdminAction(path, data) {
    return pb.send('/api/custom/admin/' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
  }

  function approveItemReport(id, reviewedBy) {
    return sendAdminAction('approve-item-report', {
      report_id: id,
      reviewed_by: reviewedBy || '',
    });
  }

  function rejectItemReport(id, reviewedBy) {
    return sendAdminAction('reject-item-report', {
      report_id: id,
      reviewed_by: reviewedBy || '',
    });
  }

  function approveNewItem(id, reviewedBy) {
    return sendAdminAction('approve-new-item', {
      report_id: id,
      reviewed_by: reviewedBy || '',
    });
  }

  function rejectNewItem(id, reviewedBy) {
    return sendAdminAction('reject-new-item', {
      report_id: id,
      reviewed_by: reviewedBy || '',
    });
  }

  function closeEquipmentUsage(id) {
    return sendAdminAction('close-equipment-usage', {
      usage_id: id,
    });
  }

  // ---- 管理员 CRUD ----
  function adminGetAll(collection, sort) {
    return pb.collection(collection).getFullList({
      sort: sort || '-created',
      expand: collection === 'items' || collection === 'equipment' ? 'location' : '',
    });
  }

  function adminCreate(collection, data) {
    return pb.collection(collection).create(data);
  }

  function adminUpdate(collection, id, data) {
    return pb.collection(collection).update(id, data);
  }

  function adminDisable(collection, id) {
    return pb.collection(collection).update(id, { is_active: false });
  }

  // ---- 导出 CSV（用 fetch 拼接参数） ----
  function exportCsv(collectionName, filter) {
    var params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    params.set('perPage', '10000');
    var url = PB_URL + '/api/collections/' + collectionName + '/records?' + params.toString();
    return fetch(url).then(function (r) { return r.json(); });
  }

  return {
    init: init,
    getPb: getPb,
    getError: getError,
    getMembers: getMembers,
    getLocations: getLocations,
    getItems: getItems,
    getEquipment: getEquipment,
    getActiveUsage: getActiveUsage,
    getPendingReports: getPendingReports,
    getAllActiveUsage: getAllActiveUsage,
    getAllPendingReports: getAllPendingReports,
    submitItemReport: submitItemReport,
    submitNewItemReport: submitNewItemReport,
    submitEquipmentUse: submitEquipmentUse,
    adminAuth: adminAuth,
    getPendingItemReports: getPendingItemReports,
    getPendingNewItems: getPendingNewItems,
    approveItemReport: approveItemReport,
    rejectItemReport: rejectItemReport,
    approveNewItem: approveNewItem,
    rejectNewItem: rejectNewItem,
    closeEquipmentUsage: closeEquipmentUsage,
    adminGetAll: adminGetAll,
    adminCreate: adminCreate,
    adminUpdate: adminUpdate,
    adminDisable: adminDisable,
    exportCsv: exportCsv,
  };
})();
