// ============================================================
// 物资列表脚本
// 搜索、筛选、待审核标记
// ============================================================

(function () {
  'use strict';

  var pendingReportItemIds = {};

  document.addEventListener('DOMContentLoaded', function () {
    if (!pbApi.init()) {
      common.showMessage('items-list', '系统未初始化，请检查 PocketBase SDK 是否已加载', 'error');
      return;
    }
    loadItems();
    loadPendingStatus();
    bindFilters();
  });

  function bindFilters() {
    var searchEl = document.getElementById('search-input');
    var typeEl = document.getElementById('filter-type');
    var statusEl = document.getElementById('filter-status');
    var locationEl = document.getElementById('filter-location');

    var handler = function () { loadItems(); };
    searchEl.addEventListener('input', debounce(handler, 300));
    typeEl.addEventListener('change', handler);
    statusEl.addEventListener('change', handler);
    locationEl.addEventListener('change', handler);
  }

  function debounce(fn, delay) {
    var timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  function getFilterValues() {
    return {
      search: document.getElementById('search-input').value,
      type: document.getElementById('filter-type').value,
      status: document.getElementById('filter-status').value,
      location: document.getElementById('filter-location').value,
    };
  }

  function loadPendingStatus() {
    pbApi.getAllPendingReports()
      .then(function (reports) {
        reports.forEach(function (r) {
          pendingReportItemIds[r.item] = true;
        });
        // 刷新显示（如果物资已经加载）
        updatePendingBadges();
      })
      .catch(function () {});
  }

  function updatePendingBadges() {
    var badges = document.querySelectorAll('.pending-badge');
    badges.forEach(function (badge) {
      badge.style.display = 'inline-block';
    });
  }

  function loadItems() {
    var listEl = document.getElementById('items-list');
    var noEl = document.getElementById('no-items');
    var f = getFilterValues();

    listEl.innerHTML = '<div class="msg msg-loading">加载中...</div>';
    noEl.style.display = 'none';

    pbApi.getItems(f.search, f.type, f.status, f.location)
      .then(function (items) {
        listEl.innerHTML = '';
        if (!items.length) {
          noEl.style.display = 'block';
          return;
        }
        noEl.style.display = 'none';

        var statusTagMap = {
          '正常': 'card-tag-success',
          '使用中': 'card-tag-warning',
          '余量低': 'card-tag-warning',
          '已耗尽': 'card-tag-danger',
          '损坏/失效': 'card-tag-danger',
          '位置不明': 'card-tag-info',
        };

        items.forEach(function (item) {
          var locationName = common.getLocationName(item);
          var statusCss = statusTagMap[item.status] || '';

          var html = '<div class="card">' +
            '<div class="card-title">' +
            common.escapeHtml(item.name) +
            (pendingReportItemIds[item.id]
              ? ' <span class="pending-badge card-tag card-tag-warning" style="display:inline-block;font-size:0.7rem;">有待审核上报</span>'
              : ' <span class="pending-badge card-tag card-tag-warning" style="display:none;font-size:0.7rem;">有待审核上报</span>') +
            '</div>' +
            '<div class="card-row">' +
            '<span class="card-tag">' + common.escapeHtml(item.item_type) + '</span>' +
            '<span class="card-tag ' + statusCss + '">' + common.escapeHtml(item.status) + '</span>' +
            (locationName ? '<span>' + common.escapeHtml(locationName) + '</span>' : '') +
            '</div>';

          if (item.specification) {
            html += '<div class="card-row">规格：' + common.escapeHtml(item.specification) + '</div>';
          }
          if (item.note) {
            html += '<div class="card-row" style="color:#94a3b8;">' + common.escapeHtml(item.note) + '</div>';
          }

          html += '<div class="card-actions">' +
            '<a href="item-report.html?item_id=' + encodeURIComponent(item.id) +
            '" class="btn btn-outline btn-small">上报状态</a>' +
            '</div></div>';

          listEl.insertAdjacentHTML('beforeend', html);
        });

        updatePendingBadges();
      })
      .catch(function (err) {
        listEl.innerHTML = '';
        common.showMessage('items-list', '加载物资列表失败：' + pbApi.getError(err), 'error');
      });
  }
})();
