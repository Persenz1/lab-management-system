// ============================================================
// 设备状态看板脚本
// 加载所有启用设备并计算派生状态
// ============================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!pbApi.init()) {
      common.showMessage('equipment-list', '系统未初始化，请检查 PocketBase SDK 是否已加载', 'error');
      return;
    }
    loadEquipment();
  });

  function loadEquipment() {
    var listEl = document.getElementById('equipment-list');
    var noEl = document.getElementById('no-equipment');
    listEl.innerHTML = '<div class="msg msg-loading">加载中...</div>';

    Promise.all([pbApi.getEquipment(), pbApi.getAllActiveUsage()])
      .then(function (results) {
        var equipment = results[0];
        var activeUsage = results[1];

        if (!equipment.length) {
          listEl.innerHTML = '';
          noEl.style.display = 'block';
          return;
        }

        listEl.innerHTML = '';
        noEl.style.display = 'none';

        equipment.forEach(function (eq) {
          var eqActive = activeUsage.filter(function (u) {
            return u.equipment === eq.id;
          });
          var status = common.deriveEquipmentStatus(eq, eqActive);
          var locationName = common.getLocationName(eq);

          var html = '<div class="card">' +
            '<div class="card-title">' + common.escapeHtml(eq.name) + '</div>' +
            '<div class="card-row">' +
            '<span class="card-tag card-tag-info">' + common.escapeHtml(eq.equipment_type) + '</span>' +
            (locationName ? '<span>' + common.escapeHtml(locationName) + '</span>' : '') +
            '<span class="card-tag ' + status.css + '">' + status.text + '</span>' +
            '</div>';

          if (eqActive.length > 0) {
            var usage = eqActive[0];
            html += '<div class="card-row">' +
              '<span>使用人：' + common.escapeHtml(usage.user_name) + '</span>' +
              '<span>开始：' + common.formatTime(usage.start_time) + '</span>';
            if (usage.estimated_duration) {
              var startMs = new Date(usage.start_time).getTime();
              if (!isNaN(startMs)) {
                var expectedEnd = new Date(startMs + usage.estimated_duration * 60 * 1000);
                html += '<span>预计结束：' + common.formatTime(expectedEnd.toISOString()) + '</span>';
              }
            }
            html += '</div>';
          }

          html += '<div class="card-actions">' +
            '<a href="equipment-use.html?equipment_id=' + encodeURIComponent(eq.id) +
            '" class="btn btn-primary btn-small">开始使用登记</a>' +
            '</div></div>';

          listEl.insertAdjacentHTML('beforeend', html);
        });
      })
      .catch(function (err) {
        listEl.innerHTML = '';
        common.showMessage('equipment-list', '加载设备列表失败：' + pbApi.getError(err), 'error');
      });
  }
})();
