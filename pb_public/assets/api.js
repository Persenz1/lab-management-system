// ============================================================
// PocketBase API 封装
// 统一管理 PocketBase SDK 初始化和所有 API 请求
// 阶段 1 占位，阶段 3-5 填充实际逻辑
// ============================================================

const pbApi = (function () {
  'use strict';

  var pb = null;

  function init() {
    // 后续阶段填写 PocketBase 连接地址
    // pb = new PocketBase("http://localhost:8090");
  }

  function getMembers() {}
  function getLocations() {}
  function getItems(filters) {}
  function getEquipment() {}
  function getEquipmentUsage() {}
  function submitItemReport(data) {}
  function submitNewItemReport(data) {}
  function submitEquipmentUse(data) {}
  function getPendingItemReports() {}
  function getPendingNewItems() {}
  function approveItemReport(id, reviewedBy) {}
  function rejectItemReport(id, reviewedBy) {}
  function approveNewItem(id, reviewedBy) {}
  function rejectNewItem(id, reviewedBy) {}
  function closeEquipmentUsage(id, reviewedBy) {}
  function exportCsv(collectionName) {}

  return {
    init: init,
    getMembers: getMembers,
    getLocations: getLocations,
    getItems: getItems,
    getEquipment: getEquipment,
    getEquipmentUsage: getEquipmentUsage,
    submitItemReport: submitItemReport,
    submitNewItemReport: submitNewItemReport,
    submitEquipmentUse: submitEquipmentUse,
    getPendingItemReports: getPendingItemReports,
    getPendingNewItems: getPendingNewItems,
    approveItemReport: approveItemReport,
    rejectItemReport: rejectItemReport,
    approveNewItem: approveNewItem,
    rejectNewItem: rejectNewItem,
    closeEquipmentUsage: closeEquipmentUsage,
    exportCsv: exportCsv,
  };
})();
