// ============================================================
// admin-lite 管理后台脚本
// 管理员审核、设备管理、CSV 导出
// ============================================================

(function () {
  'use strict';

  var adminDisplayName = '';
  var initialized = false;

  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = 'tab-' + this.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        var panel = document.getElementById(targetId);
        if (panel) {
          panel.classList.add('active');
          loadTabContent(this.getAttribute('data-tab'));
        }
      });
    });
  }

  function loadTabContent(tabName) {
    switch (tabName) {
      case 'pending-item-reports': loadPendingItemReports(); break;
      case 'pending-new-items': loadPendingNewItems(); break;
      case 'active-equipment': loadActiveUsage(); break;
      case 'export': break;
    }
  }

  // ---- 认证 ----
  function initAuth() {
    var pb = pbApi.getPb();
    if (pb && pb.authStore.isValid && pb.authStore.model) {
      showAdminUI(pb.authStore.model);
    } else {
      showLoginUI();
    }
  }

  function showLoginUI() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('admin-section').style.display = 'none';
  }

  function showAdminUI(model) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-section').style.display = 'block';

    var email = model.email || '';
    adminDisplayName = email.split('@')[0] || email;
    document.getElementById('admin-name-display').textContent = adminDisplayName;

    if (!initialized) {
      initialized = true;
      loadPendingItemReports();
    }
  }

  function handleLogin(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
      common.showMessage('admin-message', '请输入邮箱和密码', 'error');
      return;
    }

    common.setButtonLoading(document.querySelector('#login-form button[type="submit"]'), true);
    common.showMessage('admin-message', '登录中...', 'loading');

    pbApi.adminAuth(email, password)
      .then(function (authData) {
        common.showMessage('admin-message', '', '');
        showAdminUI(authData.record);
      })
      .catch(function (err) {
        common.setButtonLoading(document.querySelector('#login-form button[type="submit"]'), false);
        common.showMessage('admin-message', '登录失败：邮箱或密码错误', 'error');
      });
  }

  function handleLogout() {
    pbApi.getPb().authStore.clear();
    adminDisplayName = '';
    initialized = false;
    common.showMessage('admin-message', '', '');
    showLoginUI();
  }

  // ---- 待审核物资状态上报 ----
  function loadPendingItemReports() {
    var listEl = document.getElementById('item-reports-list');
    var noEl = document.getElementById('no-item-reports');
    listEl.innerHTML = '<div class="msg msg-loading">加载中...</div>';
    noEl.style.display = 'none';

    pbApi.getPendingItemReports()
      .then(function (reports) {
        listEl.innerHTML = '';
        if (!reports.length) {
          noEl.style.display = 'block';
          return;
        }

        reports.forEach(function (r) {
          var expand = r.expand || {};
          var item = expand.item || {};
          var itemName = item.name || '(物资已删除)';

          var html = '<div class="card">' +
            '<div class="card-title">' + common.escapeHtml(itemName) + '</div>' +
            '<div class="card-row">' +
            '<span>上报人：' + common.escapeHtml(r.reporter_name) + '</span>' +
            '<span>上报状态：</span>' +
            '<span class="card-tag card-tag-warning">' + common.escapeHtml(r.reported_status) + '</span>' +
            '</div>';
          if (r.note) {
            html += '<div class="card-row" style="color:#94a3b8;">备注：' + common.escapeHtml(r.note) + '</div>';
          }
          html += '<div class="card-actions">' +
            '<button class="btn btn-success btn-small approve-item-btn" data-id="' + r.id +
            '" data-item-id="' + r.item + '" data-status="' + common.escapeHtml(r.reported_status) + '">通过</button>' +
            '<button class="btn btn-danger btn-small reject-item-btn" data-id="' + r.id + '">拒绝</button>' +
            '</div></div>';
          listEl.insertAdjacentHTML('beforeend', html);
        });

        bindItemReportButtons();
      })
      .catch(function (err) {
        listEl.innerHTML = '';
        common.showMessage('admin-message', '加载失败：' + pbApi.getError(err), 'error');
      });
  }

  function bindItemReportButtons() {
    document.querySelectorAll('.approve-item-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var itemId = this.getAttribute('data-item-id');
        var reportedStatus = this.getAttribute('data-status');
        approveItemReport(id, itemId, reportedStatus);
      });
    });
    document.querySelectorAll('.reject-item-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rejectItemReport(this.getAttribute('data-id'));
      });
    });
  }

  function approveItemReport(reportId, itemId, reportedStatus) {
    if (!window.confirm('确认通过此物资状态上报？\n通过后正式物资状态将更新为「' + reportedStatus + '」。')) return;

    setButtonLoadingById(reportId, 'approve-item-btn', true);

    pbApi.approveItemReport(reportId, adminDisplayName)
      .then(function () {
        common.showMessage('admin-message', '已通过物资状态上报，正式物资状态已更新', 'success');
        setTimeout(function () { common.clearMessage('admin-message'); }, 3000);
        loadPendingItemReports();
      })
      .catch(function (err) {
        common.showMessage('admin-message', '操作失败：' + pbApi.getError(err), 'error');
        loadPendingItemReports();
      });
  }

  function rejectItemReport(reportId) {
    if (!window.confirm('确认拒绝此物资状态上报？\n拒绝后正式物资状态不变。')) return;

    setButtonLoadingById(reportId, 'reject-item-btn', true);

    pbApi.rejectItemReport(reportId, adminDisplayName)
      .then(function () {
        common.showMessage('admin-message', '已拒绝物资状态上报', 'success');
        setTimeout(function () { common.clearMessage('admin-message'); }, 3000);
        loadPendingItemReports();
      })
      .catch(function (err) {
        common.showMessage('admin-message', '操作失败：' + pbApi.getError(err), 'error');
        loadPendingItemReports();
      });
  }

  // ---- 待审核新物资 ----
  function loadPendingNewItems() {
    var listEl = document.getElementById('new-items-list');
    var noEl = document.getElementById('no-new-items');
    listEl.innerHTML = '<div class="msg msg-loading">加载中...</div>';
    noEl.style.display = 'none';

    pbApi.getPendingNewItems()
      .then(function (reports) {
        listEl.innerHTML = '';
        if (!reports.length) {
          noEl.style.display = 'block';
          return;
        }

        reports.forEach(function (r) {
          var html = '<div class="card">' +
            '<div class="card-title">' + common.escapeHtml(r.name) + '</div>' +
            '<div class="card-row">' +
            '<span class="card-tag">' + common.escapeHtml(r.item_type) + '</span>' +
            '<span>上报人：' + common.escapeHtml(r.reporter_name) + '</span>' +
            '</div>';
          if (r.specification) {
            html += '<div class="card-row">规格：' + common.escapeHtml(r.specification) + '</div>';
          }
          if (r.location_note) {
            html += '<div class="card-row">位置补充：' + common.escapeHtml(r.location_note) + '</div>';
          }
          if (r.note) {
            html += '<div class="card-row" style="color:#94a3b8;">备注：' + common.escapeHtml(r.note) + '</div>';
          }
          html += '<div class="card-actions">' +
            '<button class="btn btn-success btn-small approve-new-btn" data-id="' + r.id + '">通过</button>' +
            '<button class="btn btn-danger btn-small reject-new-btn" data-id="' + r.id + '">拒绝</button>' +
            '</div></div>';
          listEl.insertAdjacentHTML('beforeend', html);
        });

        bindNewItemButtons();
      })
      .catch(function (err) {
        listEl.innerHTML = '';
        common.showMessage('admin-message', '加载失败：' + pbApi.getError(err), 'error');
      });
  }

  function bindNewItemButtons() {
    document.querySelectorAll('.approve-new-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        approveNewItem(this.getAttribute('data-id'));
      });
    });
    document.querySelectorAll('.reject-new-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rejectNewItem(this.getAttribute('data-id'));
      });
    });
  }

  function approveNewItem(reportId) {
    if (!window.confirm('确认通过此新物资上报？\n通过后将创建正式物资台账记录。')) return;

    setButtonLoadingById(reportId, 'approve-new-btn', true);

    pbApi.approveNewItem(reportId, adminDisplayName)
      .then(function () {
        common.showMessage('admin-message', '已通过新物资上报，正式台账已创建', 'success');
        setTimeout(function () { common.clearMessage('admin-message'); }, 3000);
        loadPendingNewItems();
      })
      .catch(function (err) {
        common.showMessage('admin-message', '操作失败：' + pbApi.getError(err), 'error');
        loadPendingNewItems();
      });
  }

  function rejectNewItem(reportId) {
    if (!window.confirm('确认拒绝此新物资上报？\n拒绝后不会创建正式物资台账。')) return;

    setButtonLoadingById(reportId, 'reject-new-btn', true);

    pbApi.rejectNewItem(reportId, adminDisplayName)
      .then(function () {
        common.showMessage('admin-message', '已拒绝新物资上报', 'success');
        setTimeout(function () { common.clearMessage('admin-message'); }, 3000);
        loadPendingNewItems();
      })
      .catch(function (err) {
        common.showMessage('admin-message', '操作失败：' + pbApi.getError(err), 'error');
        loadPendingNewItems();
      });
  }

  // ---- 当前 active 设备使用记录 ----
  function loadActiveUsage() {
    var listEl = document.getElementById('active-usage-list');
    var noEl = document.getElementById('no-active-usage');
    listEl.innerHTML = '<div class="msg msg-loading">加载中...</div>';
    noEl.style.display = 'none';

    pbApi.getAllActiveUsage()
      .then(function (records) {
        listEl.innerHTML = '';
        if (!records.length) {
          noEl.style.display = 'block';
          return;
        }

        records.forEach(function (r) {
          var expand = r.expand || {};
          var eq = expand.equipment || {};
          var eqName = eq.name || '(设备已删除)';

          var html = '<div class="card">' +
            '<div class="card-title">' + common.escapeHtml(eqName) + '</div>' +
            '<div class="card-row">' +
            '<span class="card-tag card-tag-warning">使用中</span>' +
            '<span>使用人：' + common.escapeHtml(r.user_name) + '</span>' +
            '</div>' +
            '<div class="card-row">' +
            '<span>开始：' + common.formatTime(r.start_time) + '</span>';
          if (r.estimated_duration) {
            html += '<span>预计：' + common.formatDuration(r.estimated_duration) + '</span>';
            var startMs = new Date(r.start_time).getTime();
            if (!isNaN(startMs)) {
              var expectedEnd = new Date(startMs + r.estimated_duration * 60 * 1000);
              html += '<span>结束：' + common.formatTime(expectedEnd.toISOString()) + '</span>';
            }
          }
          html += '</div>';
          html += '<div class="card-actions">' +
            '<button class="btn btn-danger btn-small close-usage-btn" data-id="' + r.id + '">手动关闭</button>' +
            '</div></div>';
          listEl.insertAdjacentHTML('beforeend', html);
        });

        bindCloseButtons();
      })
      .catch(function (err) {
        listEl.innerHTML = '';
        common.showMessage('admin-message', '加载失败：' + pbApi.getError(err), 'error');
      });
  }

  function bindCloseButtons() {
    document.querySelectorAll('.close-usage-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeUsage(this.getAttribute('data-id'));
      });
    });
  }

  function closeUsage(usageId) {
    if (!window.confirm('确认手动关闭此设备使用记录？\n关闭后设备状态将变为空闲。')) return;

    setButtonLoadingById(usageId, 'close-usage-btn', true);

    pbApi.closeEquipmentUsage(usageId)
      .then(function () {
        common.showMessage('admin-message', '设备使用记录已关闭', 'success');
        setTimeout(function () { common.clearMessage('admin-message'); }, 3000);
        loadActiveUsage();
      })
      .catch(function (err) {
        common.showMessage('admin-message', '操作失败：' + pbApi.getError(err), 'error');
        loadActiveUsage();
      });
  }

  // ---- CSV 导出 ----
  function downloadCsv(filename, headers, rows) {
    var BOM = '\uFEFF';
    var csv = BOM + headers.map(escapeCsvCell).join(',') + '\n';
    rows.forEach(function (row) {
      csv += row.map(escapeCsvCell).join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function escapeCsvCell(val) {
    var str = (val === null || val === undefined) ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function exportItems() {
    var btn = document.getElementById('export-items-btn');
    common.setButtonLoading(btn, true);

    pbApi.getPb().collection('items').getFullList({ expand: 'location', sort: 'name' })
      .then(function (items) {
        var headers = ['物资名称', '物资类型', '规格', '状态', '位置', '位置补充', '备注', '是否启用'];
        var rows = items.map(function (item) {
          var locName = '';
          if (item.expand && item.expand.location) {
            locName = item.expand.location.display_name || '';
          }
          return [
            item.name, item.item_type, item.specification, item.status,
            locName, item.location_note, item.note,
            item.is_active ? '是' : '否',
          ];
        });
        downloadCsv('物资台账.csv', headers, rows);
        common.showMessage('export-msg', '物资台账 CSV 已导出', 'success');
        common.setButtonLoading(btn, false);
      })
      .catch(function (err) {
        common.showMessage('export-msg', '导出失败：' + pbApi.getError(err), 'error');
        common.setButtonLoading(btn, false);
      });
  }

  function exportItemReports() {
    var btn = document.getElementById('export-item-reports-btn');
    common.setButtonLoading(btn, true);

    pbApi.getPb().collection('item_reports').getFullList({ expand: 'item', sort: '-created' })
      .then(function (reports) {
        var headers = ['物资名称', '上报人', '上报状态', '备注', '审核状态', '审核人', '审核时间'];
        var rows = reports.map(function (r) {
          var itemName = '';
          if (r.expand && r.expand.item) {
            itemName = r.expand.item.name || '';
          }
          return [
            itemName, r.reporter_name, r.reported_status, r.note,
            r.review_status, r.reviewed_by, r.reviewed_at,
          ];
        });
        downloadCsv('物资状态上报.csv', headers, rows);
        common.showMessage('export-msg', '物资状态上报 CSV 已导出', 'success');
        common.setButtonLoading(btn, false);
      })
      .catch(function (err) {
        common.showMessage('export-msg', '导出失败：' + pbApi.getError(err), 'error');
        common.setButtonLoading(btn, false);
      });
  }

  function exportNewItemReports() {
    var btn = document.getElementById('export-new-items-btn');
    common.setButtonLoading(btn, true);

    pbApi.getPb().collection('new_item_reports').getFullList({ sort: '-created' })
      .then(function (reports) {
        var headers = ['上报人', '物资名称', '物资类型', '规格', '初始状态', '位置补充', '备注', '审核状态', '审核人', '审核时间'];
        var rows = reports.map(function (r) {
          return [
            r.reporter_name, r.name, r.item_type, r.specification,
            r.initial_status, r.location_note, r.note,
            r.review_status, r.reviewed_by, r.reviewed_at,
          ];
        });
        downloadCsv('新物资上报.csv', headers, rows);
        common.showMessage('export-msg', '新物资上报 CSV 已导出', 'success');
        common.setButtonLoading(btn, false);
      })
      .catch(function (err) {
        common.showMessage('export-msg', '导出失败：' + pbApi.getError(err), 'error');
        common.setButtonLoading(btn, false);
      });
  }

  function exportEquipmentUsage() {
    var btn = document.getElementById('export-usage-btn');
    common.setButtonLoading(btn, true);

    pbApi.getPb().collection('equipment_usage').getFullList({ expand: 'equipment', sort: '-start_time' })
      .then(function (records) {
        var headers = ['设备名称', '使用人', '开始时间', '结束时间', '预计使用(分钟)', '状态', '结束原因', '备注'];
        var rows = records.map(function (r) {
          var eqName = '';
          if (r.expand && r.expand.equipment) {
            eqName = r.expand.equipment.name || '';
          }
          return [
            eqName, r.user_name, r.start_time, r.end_time,
            r.estimated_duration, r.status, r.end_reason, r.note,
          ];
        });
        downloadCsv('设备使用记录.csv', headers, rows);
        common.showMessage('export-msg', '设备使用记录 CSV 已导出', 'success');
        common.setButtonLoading(btn, false);
      })
      .catch(function (err) {
        common.showMessage('export-msg', '导出失败：' + pbApi.getError(err), 'error');
        common.setButtonLoading(btn, false);
      });
  }

  // ---- 工具 ----
  function setButtonLoadingById(dataId, className, loading) {
    var buttons = document.querySelectorAll('.' + className + '[data-id="' + dataId + '"]');
    buttons.forEach(function (btn) {
      if (loading) {
        btn.disabled = true;
        btn.setAttribute('data-original-text', btn.textContent);
        btn.textContent = '处理中...';
      } else {
        btn.disabled = false;
        var orig = btn.getAttribute('data-original-text');
        if (orig) btn.textContent = orig;
      }
    });
  }

  // ---- 初始化 ----
  document.addEventListener('DOMContentLoaded', function () {
    pbApi.init();
    initTabs();
    initAuth();

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // CSV 导出按钮
    document.getElementById('export-items-btn').addEventListener('click', exportItems);
    document.getElementById('export-item-reports-btn').addEventListener('click', exportItemReports);
    document.getElementById('export-new-items-btn').addEventListener('click', exportNewItemReports);
    document.getElementById('export-usage-btn').addEventListener('click', exportEquipmentUsage);
  });
})();
