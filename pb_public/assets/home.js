// ============================================================
// 首页脚本
// 加载设备状态摘要、物资提醒
// ============================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!pbApi.init()) {
      common.showMessage('status-summary', '系统未初始化，请检查 PocketBase SDK 是否已加载', 'error');
      return;
    }
    loadSummary();
    loadItemAlerts();
  });

  function loadSummary() {
    common.showMessage('status-content', '加载中...', 'loading');

    Promise.all([pbApi.getEquipment(), pbApi.getAllActiveUsage()])
      .then(function (results) {
        var equipment = results[0];
        var activeUsage = results[1];

        var total = equipment.length;
        var inUse = 0;
        var free = 0;
        var maintenance = 0;

        equipment.forEach(function (eq) {
          if (eq.status === '维护中') { maintenance++; return; }
          if (!eq.is_active) return;
          var hasActive = activeUsage.some(function (u) {
            return u.equipment === eq.id;
          });
          if (hasActive) { inUse++; } else { free++; }
        });

        var summaryEl = document.getElementById('status-summary');
        summaryEl.style.display = 'block';
        document.getElementById('status-content').innerHTML =
          '<div class="card-row" style="gap:1rem;">' +
          '<span>共 <strong>' + total + '</strong> 台</span>' +
          '<span style="color:#16a34a;">空闲 <strong>' + free + '</strong></span>' +
          '<span style="color:#d97706;">使用中 <strong>' + inUse + '</strong></span>' +
          (maintenance > 0 ? '<span style="color:#dc2626;">维护 <strong>' + maintenance + '</strong></span>' : '') +
          '</div>';
      })
      .catch(function (err) {
        common.showMessage('status-content', '加载设备状态失败：' + pbApi.getError(err), 'error');
      });
  }

  function loadItemAlerts() {
    pbApi.getAllPendingReports()
      .then(function (reports) {
        if (!reports.length) return;

        var alertCount = reports.length;
        var alertsEl = document.getElementById('item-alerts');
        alertsEl.style.display = 'block';
        document.getElementById('alerts-content').innerHTML =
          '<p style="color:#d97706;">有 <strong>' + alertCount + '</strong> 条待审核的物资状态上报</p>';
      })
      .catch(function () {
        // 静默失败，物资提醒非关键
      });
  }
})();
