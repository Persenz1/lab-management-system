// ============================================================
// admin-lite — 全中文管理员面板
// 审核、CRUD 管理、设备关闭、CSV 导出
// ============================================================

var ADMIN_LABELS = {
  collections: {
    lab_members: '成员',
    locations: '位置',
    items: '物资',
    item_reports: '物资状态上报',
    new_item_reports: '新物资上报',
    equipment: '设备',
    equipment_usage: '设备使用记录',
  },
  fields: {
    id: 'ID',
    name: '名称',
    display_name: '显示名称',
    code: '编号',
    item_type: '物资类型',
    equipment_type: '设备类型',
    specification: '规格',
    status: '状态',
    location: '位置',
    location_note: '位置补充',
    note: '备注',
    is_active: '启用',
    sort_order: '排序',
    reporter_name: '上报人',
    reported_status: '上报状态',
    review_status: '审核状态',
    reviewed_by: '审核人',
    reviewed_at: '审核时间',
    created_item: '创建的正式物资',
    user_name: '使用人',
    start_time: '开始时间',
    end_time: '结束时间',
    estimated_duration: '预计时长',
    default_duration: '默认时长',
    materials: '使用材料',
    end_reason: '结束原因',
    initial_status: '初始状态',
    created: '创建时间',
    updated: '更新时间',
  },
  endReasons: {
    overridden_by_new_usage: '被新登记覆盖',
    admin_closed: '管理员手动关闭',
    manual_end: '用户手动结束',
    system_timeout_marked: '系统超时标记',
  },
};

(function () {
  'use strict';

  var adminDisplayName = '';
  var initialized = false;
  var L = ADMIN_LABELS;

  // ============================================================
  // 工具
  // ============================================================
  function Lf(field) { return L.fields[field] || field; }

  function setBtnLoadingById(dataId, cls, loading) {
    document.querySelectorAll('.' + cls + '[data-id="' + dataId + '"]').forEach(function (btn) {
      if (loading) {
        btn.disabled = true;
        btn.setAttribute('data-ot', btn.textContent);
        btn.textContent = '处理中...';
      } else {
        btn.disabled = false;
        var o = btn.getAttribute('data-ot');
        if (o) btn.textContent = o;
      }
    });
  }

  function showToast(text, type) {
    common.showMessage('admin-message', text, type || 'success');
    setTimeout(function () { common.clearMessage('admin-message'); }, 4000);
  }

  function yesno(msg) { return window.confirm(msg); }

  // ============================================================
  // 标签
  // ============================================================
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tid = 'tab-' + this.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        var panel = document.getElementById(tid);
        if (panel) {
          panel.classList.add('active');
          loadTab(this.getAttribute('data-tab'));
        }
      });
    });
  }

  function loadTab(name) {
    switch (name) {
      case 'review': loadPendingItemReports(); loadPendingNewItems(); break;
      case 'items': loadItems(); break;
      case 'equipment': loadEquipment(); break;
      case 'members': loadMembers(); break;
      case 'locations': loadLocations(); break;
      case 'usage': loadActiveUsage(); break;
      case 'export': break;
    }
  }

  // ============================================================
  // 认证
  // ============================================================
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
    adminDisplayName = (model.email || '').split('@')[0] || '';
    document.getElementById('admin-name-display').textContent = adminDisplayName;
    if (!initialized) { initialized = true; loadPendingItemReports(); loadPendingNewItems(); }
  }

  function handleLogin(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var pw = document.getElementById('login-password').value.trim();
    if (!email || !pw) { showToast('请输入邮箱和密码', 'error'); return; }
    common.setButtonLoading(document.querySelector('#login-form button[type="submit"]'), true);
    showToast('登录中...', 'loading');
    pbApi.adminAuth(email, pw).then(function (r) { showAdminUI(r.record); }).catch(function () {
      common.setButtonLoading(document.querySelector('#login-form button[type="submit"]'), false);
      showToast('登录失败：邮箱或密码错误', 'error');
    });
  }

  function handleLogout() {
    pbApi.getPb().authStore.clear();
    adminDisplayName = ''; initialized = false;
    common.clearMessage('admin-message');
    showLoginUI();
  }

  // ============================================================
  // 审核中心
  // ============================================================
  function loadPendingItemReports() {
    var el = document.getElementById('item-reports-list');
    var no = document.getElementById('no-item-reports');
    el.innerHTML = '<div class="msg msg-loading">加载中...</div>';
    no.style.display = 'none';
    pbApi.getPendingItemReports().then(function (rs) {
      el.innerHTML = '';
      if (!rs.length) { no.style.display = 'block'; return; }
      rs.forEach(function (r) {
        var item = (r.expand || {}).item || {};
        el.insertAdjacentHTML('beforeend',
          '<div class="admin-list-item">' +
          '<div class="admin-list-info">' +
          '<div class="admin-list-name">' + common.escapeHtml(item.name || '(物资已删除)') + '</div>' +
          '<div class="admin-list-meta">上报人：' + common.escapeHtml(r.reporter_name) +
          ' | 上报状态：' + common.escapeHtml(r.reported_status) + '</div>' +
          (r.note ? '<div class="admin-list-meta">备注：' + common.escapeHtml(r.note) + '</div>' : '') +
          '</div>' +
          '<div class="admin-list-actions">' +
          '<button class="btn btn-success btn-small" data-id="' + r.id + '" data-action="approve-item">通过</button>' +
          '<button class="btn btn-danger btn-small" data-id="' + r.id + '" data-action="reject-item">拒绝</button>' +
          '</div></div>');
      });
      bindReviewButtons();
    }).catch(function (e) { el.innerHTML = ''; showToast('加载失败：' + pbApi.getError(e), 'error'); });
  }

  function loadPendingNewItems() {
    var el = document.getElementById('new-items-list');
    var no = document.getElementById('no-new-items');
    el.innerHTML = '<div class="msg msg-loading">加载中...</div>';
    no.style.display = 'none';
    pbApi.getPendingNewItems().then(function (rs) {
      el.innerHTML = '';
      if (!rs.length) { no.style.display = 'block'; return; }
      rs.forEach(function (r) {
        el.insertAdjacentHTML('beforeend',
          '<div class="admin-list-item">' +
          '<div class="admin-list-info">' +
          '<div class="admin-list-name">' + common.escapeHtml(r.name) + '</div>' +
          '<div class="admin-list-meta">类型：' + common.escapeHtml(r.item_type) +
          ' | 上报人：' + common.escapeHtml(r.reporter_name) + '</div>' +
          (r.specification ? '<div class="admin-list-meta">规格：' + common.escapeHtml(r.specification) + '</div>' : '') +
          '</div>' +
          '<div class="admin-list-actions">' +
          '<button class="btn btn-success btn-small" data-id="' + r.id + '" data-action="approve-new">通过</button>' +
          '<button class="btn btn-danger btn-small" data-id="' + r.id + '" data-action="reject-new">拒绝</button>' +
          '</div></div>');
      });
      bindReviewButtons();
    }).catch(function (e) { el.innerHTML = ''; showToast('加载失败：' + pbApi.getError(e), 'error'); });
  }

  function bindReviewButtons() {
    document.querySelectorAll('[data-action="approve-item"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!yesno('确认通过此物资状态上报？')) return;
        setBtnLoadingById(id, 'btn-success', true);
        pbApi.approveItemReport(id, adminDisplayName).then(function () {
          showToast('已通过，正式物资状态已更新');
          loadPendingItemReports();
        }).catch(function (e) { showToast('失败：' + pbApi.getError(e), 'error'); loadPendingItemReports(); });
      });
    });
    document.querySelectorAll('[data-action="reject-item"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!yesno('确认拒绝此物资状态上报？')) return;
        setBtnLoadingById(id, 'btn-danger', true);
        pbApi.rejectItemReport(id, adminDisplayName).then(function () {
          showToast('已拒绝');
          loadPendingItemReports();
        }).catch(function (e) { showToast('失败：' + pbApi.getError(e), 'error'); loadPendingItemReports(); });
      });
    });
    document.querySelectorAll('[data-action="approve-new"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!yesno('确认通过？将创建正式物资台账。')) return;
        setBtnLoadingById(id, 'btn-success', true);
        pbApi.approveNewItem(id, adminDisplayName).then(function () {
          showToast('已通过，正式台账已创建');
          loadPendingNewItems();
        }).catch(function (e) { showToast('失败：' + pbApi.getError(e), 'error'); loadPendingNewItems(); });
      });
    });
    document.querySelectorAll('[data-action="reject-new"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!yesno('确认拒绝？不会创建正式物资。')) return;
        setBtnLoadingById(id, 'btn-danger', true);
        pbApi.rejectNewItem(id, adminDisplayName).then(function () {
          showToast('已拒绝');
          loadPendingNewItems();
        }).catch(function (e) { showToast('失败：' + pbApi.getError(e), 'error'); loadPendingNewItems(); });
      });
    });
  }

  // ============================================================
  // 通用 CRUD 列表渲染
  // ============================================================
  function renderAdminList(containerId, records, opts) {
    var container = document.getElementById(containerId);
    var html = '';
    if (!records.length) {
      container.innerHTML = '<div class="empty-state"><p>暂无' + (opts.name || '记录') + '</p></div>';
      return;
    }
    records.forEach(function (r) {
      var disabled = r.is_active === false ? ' admin-list-disabled' : '';
      html += '<div class="admin-list-item' + disabled + '">' +
        '<div class="admin-list-info">' +
        '<div class="admin-list-name">' + common.escapeHtml(opts.title(r)) + '</div>' +
        '<div class="admin-list-meta">' + common.escapeHtml(opts.meta(r)) + '</div>' +
        '</div>' +
        '<div class="admin-list-actions">' +
        '<button class="btn btn-outline btn-small" data-id="' + r.id + '" data-action="' + (opts.editAction || '') + '">编辑</button>' +
        (r.is_active !== false
          ? '<button class="btn btn-danger btn-small" data-id="' + r.id + '" data-action="' + (opts.disableAction || '') + '">停用</button>'
          : '<span style="font-size:0.75rem;color:#94a3b8;">已停用</span>') +
        '</div></div>';
    });
    container.innerHTML = html;
    bindCrudButtons(containerId, opts);
  }

  function bindCrudButtons(containerId, opts) {
    var container = document.getElementById(containerId);

    container.querySelectorAll('[data-action="' + (opts.editAction || '') + '"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        var record = opts.findRecord(id);
        if (record) opts.showEditForm(record);
      });
    });

    container.querySelectorAll('[data-action="' + (opts.disableAction || '') + '"]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!yesno('确认停用此' + (opts.name || '记录') + '？\n停用后不再出现在普通页面中，历史数据保留。')) return;
        setBtnLoadingById(id, 'btn-danger', true);
        opts.onDisable(id).then(function () {
          showToast('已停用');
          opts.reload();
        }).catch(function (e) { showToast('失败：' + pbApi.getError(e), 'error'); opts.reload(); });
      });
    });
  }

  // ============================================================
  // 通用 inline 表单
  // ============================================================
  function showInlineForm(containerId, fields, onSubmit, initialData) {
    var container = document.getElementById(containerId);
    var html = '<form class="admin-inline-form" id="' + containerId + '-form">';
    fields.forEach(function (f) {
      html += '<div class="form-group">' +
        '<label class="form-label">' + common.escapeHtml(f.label) + (f.required ? ' <span style="color:#dc2626;">*</span>' : '') + '</label>';
      var val = initialData && initialData[f.name] !== undefined ? common.escapeHtml(String(initialData[f.name] || '')) : '';
      if (f.type === 'select') {
        html += '<select class="form-select" name="' + f.name + '"' + (f.required ? ' required' : '') + '>';
        html += '<option value="">请选择</option>';
        (f.options || []).forEach(function (o) {
          var selected = val === o.value ? ' selected' : '';
          html += '<option value="' + common.escapeHtml(o.value) + '"' + selected + '>' + common.escapeHtml(o.label) + '</option>';
        });
        if (f.freeform) {
          html += '<option value="__other__">其他（手动输入）</option>';
        }
        html += '</select>';
        if (f.freeform) {
          html += '<input type="text" class="form-input" name="' + f.name + '_free" placeholder="手动输入" style="margin-top:0.35rem;display:none;">';
        }
      } else if (f.type === 'textarea') {
        html += '<textarea class="form-textarea" name="' + f.name + '" rows="2" placeholder="' + common.escapeHtml(f.placeholder || '') + '">' + val + '</textarea>';
      } else {
        html += '<input type="' + (f.type || 'text') + '" class="form-input" name="' + f.name + '" value="' + val + '" placeholder="' + common.escapeHtml(f.placeholder || '') + '"' + (f.required ? ' required' : '') + '>';
      }
      html += '</div>';
    });
    html += '<div style="display:flex;gap:0.5rem;">' +
      '<button type="submit" class="btn btn-primary btn-small">保存</button>' +
      '<button type="button" class="btn btn-secondary btn-small cancel-form-btn">取消</button>' +
      '</div></form>';
    container.innerHTML = html;

    container.querySelector('.cancel-form-btn').addEventListener('click', function () { container.innerHTML = ''; });

    // freeform select toggle
    container.querySelectorAll('select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var free = this.parentElement.querySelector('input[name="' + this.name + '_free"]');
        if (free) free.style.display = this.value === '__other__' ? 'block' : 'none';
      });
    });

    container.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      var fd = new FormData(this);
      fd.forEach(function (v, k) {
        if (k.endsWith('_free')) return;
        var freeVal = fd.get(k + '_free');
        if (v === '__other__' && freeVal) {
          data[k] = freeVal.trim();
        } else if (v !== '__other__') {
          data[k] = v.toString().trim();
        }
      });
      // 移除空的可选字段
      Object.keys(data).forEach(function (k) {
        if (!data[k] && !fields.some(function (f) { return f.name === k && f.required; })) {
          delete data[k];
        }
      });
      var submitBtn = this.querySelector('button[type="submit"]');
      common.setButtonLoading(submitBtn, true);
      onSubmit(data).then(function () {
        container.innerHTML = '';
      }).catch(function (e) {
        common.setButtonLoading(submitBtn, false);
        showToast('失败：' + pbApi.getError(e), 'error');
      });
    });
  }

  // ============================================================
  // 物资管理
  // ============================================================
  var itemsCache = [];

  function loadItems() {
    document.getElementById('items-inline-form').innerHTML = '';
    var search = document.getElementById('items-search').value;
    var type = document.getElementById('items-type-filter').value;
    var status = document.getElementById('items-status-filter').value;

    pbApi.adminGetAll('items', 'name').then(function (all) {
      itemsCache = all;
      var filtered = all.filter(function (r) {
        if (search) {
          var q = search.toLowerCase();
          var n = (r.name || '').toLowerCase();
          var s = (r.specification || '').toLowerCase();
          if (n.indexOf(q) === -1 && s.indexOf(q) === -1) return false;
        }
        if (type && r.item_type !== type) return false;
        if (status && r.status !== status) return false;
        return true;
      });
      renderAdminList('items-list-container', filtered, {
        name: '物资',
        title: function (r) { return (r.is_active === false ? '[已停用] ' : '') + r.name; },
        meta: function (r) {
          var loc = (r.expand && r.expand.location) ? r.expand.location.display_name : '';
          return r.item_type + ' | ' + r.status + (loc ? ' | ' + loc : '');
        },
        editAction: 'edit-item',
        disableAction: 'disable-item',
        findRecord: function (id) { return itemsCache.find(function (r) { return r.id === id; }); },
        showEditForm: showEditItemForm,
        onDisable: function (id) { return pbApi.adminDisable('items', id); },
        reload: function () { loadItems(); },
      });
    }).catch(function (e) { showToast('加载失败：' + pbApi.getError(e), 'error'); });
  }

  function showAddItemForm() {
    pbApi.getLocations().then(function (locs) {
      var locOpts = locs.map(function (l) { return { value: l.id, label: l.display_name }; });
      showInlineForm('items-inline-form', [
        { name: 'name', label: Lf('name'), type: 'text', required: true, placeholder: '物资名称' },
        { name: 'item_type', label: Lf('item_type'), type: 'select', required: true, options: ['3D打印材料','机械耗材','电子元件','化学材料','工具','其他'].map(function(v){return{value:v,label:v};}), freeform: true },
        { name: 'specification', label: Lf('specification'), type: 'text', placeholder: '规格型号' },
        { name: 'status', label: Lf('status'), type: 'select', required: true, options: ['正常','使用中','余量低','已耗尽','损坏/失效','位置不明'].map(function(v){return{value:v,label:v};}) },
        { name: 'location', label: Lf('location'), type: 'select', options: locOpts },
        { name: 'location_note', label: Lf('location_note'), type: 'text', placeholder: '如第几个抽屉' },
        { name: 'note', label: Lf('note'), type: 'textarea', placeholder: '备注' },
      ], function (data) {
        data.is_active = true;
        return pbApi.adminCreate('items', data).then(function () { showToast('物资已添加'); loadItems(); });
      });
    });
  }

  function showEditItemForm(record) {
    pbApi.getLocations().then(function (locs) {
      var locOpts = locs.map(function (l) { return { value: l.id, label: l.display_name }; });
      showInlineForm('items-inline-form', [
        { name: 'name', label: Lf('name'), type: 'text', required: true },
        { name: 'item_type', label: Lf('item_type'), type: 'select', required: true, options: ['3D打印材料','机械耗材','电子元件','化学材料','工具','其他'].map(function(v){return{value:v,label:v};}), freeform: true },
        { name: 'specification', label: Lf('specification'), type: 'text' },
        { name: 'status', label: Lf('status'), type: 'select', required: true, options: ['正常','使用中','余量低','已耗尽','损坏/失效','位置不明'].map(function(v){return{value:v,label:v};}) },
        { name: 'location', label: Lf('location'), type: 'select', options: locOpts },
        { name: 'location_note', label: Lf('location_note'), type: 'text' },
        { name: 'note', label: Lf('note'), type: 'textarea' },
      ], function (data) {
        return pbApi.adminUpdate('items', record.id, data).then(function () { showToast('物资已更新'); loadItems(); });
      }, record);
    });
  }

  // ============================================================
  // 设备管理
  // ============================================================
  var equipmentCache = [];

  function loadEquipment() {
    document.getElementById('equipment-inline-form').innerHTML = '';
    pbApi.adminGetAll('equipment', 'name').then(function (all) {
      equipmentCache = all;
      renderAdminList('equipment-list-container', all, {
        name: '设备',
        title: function (r) { return (r.is_active === false ? '[已停用] ' : '') + r.name; },
        meta: function (r) {
          var loc = (r.expand && r.expand.location) ? r.expand.location.display_name : '';
          return r.equipment_type + ' | ' + r.status + (loc ? ' | ' + loc : '');
        },
        editAction: 'edit-equipment',
        disableAction: 'disable-equipment',
        findRecord: function (id) { return equipmentCache.find(function (r) { return r.id === id; }); },
        showEditForm: showEditEquipmentForm,
        onDisable: function (id) { return pbApi.adminDisable('equipment', id); },
        reload: function () { loadEquipment(); },
      });
    }).catch(function (e) { showToast('加载失败：' + pbApi.getError(e), 'error'); });
  }

  function showAddEquipmentForm() {
    pbApi.getLocations().then(function (locs) {
      var locOpts = locs.map(function (l) { return { value: l.id, label: l.display_name }; });
      showInlineForm('equipment-inline-form', [
        { name: 'name', label: Lf('name'), type: 'text', required: true, placeholder: '设备名称' },
        { name: 'equipment_type', label: Lf('equipment_type'), type: 'select', required: true, options: ['服务器','3D打印机','测试设备','加工设备','其他'].map(function(v){return{value:v,label:v};}) },
        { name: 'status', label: Lf('status'), type: 'select', required: true, options: ['可用','维护中','停用'].map(function(v){return{value:v,label:v};}) },
        { name: 'location', label: Lf('location'), type: 'select', options: locOpts },
        { name: 'default_duration', label: Lf('default_duration'), type: 'number', placeholder: '默认预计使用分钟数' },
        { name: 'note', label: Lf('note'), type: 'textarea', placeholder: '备注' },
      ], function (data) {
        data.is_active = true;
        return pbApi.adminCreate('equipment', data).then(function () { showToast('设备已添加'); loadEquipment(); });
      });
    });
  }

  function showEditEquipmentForm(record) {
    pbApi.getLocations().then(function (locs) {
      var locOpts = locs.map(function (l) { return { value: l.id, label: l.display_name }; });
      showInlineForm('equipment-inline-form', [
        { name: 'name', label: Lf('name'), type: 'text', required: true },
        { name: 'equipment_type', label: Lf('equipment_type'), type: 'select', required: true, options: ['服务器','3D打印机','测试设备','加工设备','其他'].map(function(v){return{value:v,label:v};}) },
        { name: 'status', label: Lf('status'), type: 'select', required: true, options: ['可用','维护中','停用'].map(function(v){return{value:v,label:v};}) },
        { name: 'location', label: Lf('location'), type: 'select', options: locOpts },
        { name: 'default_duration', label: Lf('default_duration'), type: 'number' },
        { name: 'note', label: Lf('note'), type: 'textarea' },
      ], function (data) {
        return pbApi.adminUpdate('equipment', record.id, data).then(function () { showToast('设备已更新'); loadEquipment(); });
      }, record);
    });
  }

  // ============================================================
  // 成员管理
  // ============================================================
  var membersCache = [];

  function loadMembers() {
    document.getElementById('members-inline-form').innerHTML = '';
    pbApi.adminGetAll('lab_members', 'name').then(function (all) {
      membersCache = all;
      renderAdminList('members-list-container', all, {
        name: '成员',
        title: function (r) { return (r.is_active === false ? '[已停用] ' : '') + r.name; },
        meta: function (r) { return r.note || ''; },
        editAction: 'edit-member',
        disableAction: 'disable-member',
        findRecord: function (id) { return membersCache.find(function (r) { return r.id === id; }); },
        showEditForm: showEditMemberForm,
        onDisable: function (id) { return pbApi.adminDisable('lab_members', id); },
        reload: function () { loadMembers(); },
      });
    }).catch(function (e) { showToast('加载失败：' + pbApi.getError(e), 'error'); });
  }

  function showAddMemberForm() {
    showInlineForm('members-inline-form', [
      { name: 'name', label: Lf('name'), type: 'text', required: true, placeholder: '成员姓名' },
      { name: 'note', label: Lf('note'), type: 'textarea', placeholder: '备注（如年级、方向等）' },
    ], function (data) {
      data.is_active = true;
      return pbApi.adminCreate('lab_members', data).then(function () { showToast('成员已添加'); loadMembers(); });
    });
  }

  function showEditMemberForm(record) {
    showInlineForm('members-inline-form', [
      { name: 'name', label: Lf('name'), type: 'text', required: true },
      { name: 'note', label: Lf('note'), type: 'textarea' },
    ], function (data) {
      return pbApi.adminUpdate('lab_members', record.id, data).then(function () { showToast('成员已更新'); loadMembers(); });
    }, record);
  }

  // ============================================================
  // 位置管理
  // ============================================================
  var locationsCache = [];

  function loadLocations() {
    document.getElementById('locations-inline-form').innerHTML = '';
    pbApi.adminGetAll('locations', 'sort_order').then(function (all) {
      locationsCache = all;
      renderAdminList('locations-list-container', all, {
        name: '位置',
        title: function (r) { return (r.is_active === false ? '[已停用] ' : '') + r.display_name + ' (' + r.code + ')'; },
        meta: function (r) { return r.description || ''; },
        editAction: 'edit-location',
        disableAction: 'disable-location',
        findRecord: function (id) { return locationsCache.find(function (r) { return r.id === id; }); },
        showEditForm: showEditLocationForm,
        onDisable: function (id) { return pbApi.adminDisable('locations', id); },
        reload: function () { loadLocations(); },
      });
    }).catch(function (e) { showToast('加载失败：' + pbApi.getError(e), 'error'); });
  }

  function showAddLocationForm() {
    showInlineForm('locations-inline-form', [
      { name: 'code', label: Lf('code'), type: 'select', required: true, options: ['A','B','C','D','E','F','UNCATEGORIZED','OTHER'].map(function(v){return{value:v,label:v};}) },
      { name: 'display_name', label: Lf('display_name'), type: 'text', required: true, placeholder: '如 A区' },
      { name: 'description', label: '说明', type: 'textarea', placeholder: '位置说明' },
      { name: 'sort_order', label: Lf('sort_order'), type: 'number', placeholder: '排序数字' },
    ], function (data) {
      data.is_active = true;
      if (data.sort_order) data.sort_order = parseInt(data.sort_order, 10) || 0;
      return pbApi.adminCreate('locations', data).then(function () { showToast('位置已添加'); loadLocations(); });
    });
  }

  function showEditLocationForm(record) {
    showInlineForm('locations-inline-form', [
      { name: 'code', label: Lf('code'), type: 'select', required: true, options: ['A','B','C','D','E','F','UNCATEGORIZED','OTHER'].map(function(v){return{value:v,label:v};}) },
      { name: 'display_name', label: Lf('display_name'), type: 'text', required: true },
      { name: 'description', label: '说明', type: 'textarea' },
      { name: 'sort_order', label: Lf('sort_order'), type: 'number' },
    ], function (data) {
      if (data.sort_order) data.sort_order = parseInt(data.sort_order, 10) || 0;
      return pbApi.adminUpdate('locations', record.id, data).then(function () { showToast('位置已更新'); loadLocations(); });
    }, record);
  }

  // ============================================================
  // 当前设备使用
  // ============================================================
  function loadActiveUsage() {
    var el = document.getElementById('active-usage-list');
    var no = document.getElementById('no-active-usage');
    el.innerHTML = '<div class="msg msg-loading">加载中...</div>';
    no.style.display = 'none';
    pbApi.getAllActiveUsage().then(function (rs) {
      el.innerHTML = '';
      if (!rs.length) { no.style.display = 'block'; return; }
      rs.forEach(function (r) {
        var eq = (r.expand || {}).equipment || {};
        var html = '<div class="card"><div class="card-title">' + common.escapeHtml(eq.name || '(已删除)') + '</div>' +
          '<div class="card-row"><span class="card-tag card-tag-warning">使用中</span>' +
          '<span>使用人：' + common.escapeHtml(r.user_name) + '</span></div>' +
          '<div class="card-row"><span>开始：' + common.formatTime(r.start_time) + '</span>';
        if (r.estimated_duration) {
          html += '<span>预计：' + common.formatDuration(r.estimated_duration) + '</span>';
          var sms = new Date(r.start_time).getTime();
          if (!isNaN(sms)) {
            html += '<span>结束：' + common.formatTime(new Date(sms + r.estimated_duration * 60000).toISOString()) + '</span>';
          }
        }
        html += '</div><div class="card-actions">' +
          '<button class="btn btn-danger btn-small" data-id="' + r.id + '" data-action="close-usage">手动关闭</button></div></div>';
        el.insertAdjacentHTML('beforeend', html);
      });
      document.querySelectorAll('[data-action="close-usage"]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = this.getAttribute('data-id');
          if (!yesno('确认手动关闭此设备使用记录？\n关闭后设备状态将变为空闲。')) return;
          setBtnLoadingById(id, 'btn-danger', true);
          pbApi.closeEquipmentUsage(id).then(function () {
            showToast('设备使用记录已关闭');
            loadActiveUsage();
          }).catch(function (e) { showToast('失败：' + pbApi.getError(e), 'error'); loadActiveUsage(); });
        });
      });
    }).catch(function (e) { el.innerHTML = ''; showToast('加载失败：' + pbApi.getError(e), 'error'); });
  }

  // ============================================================
  // CSV 导出
  // ============================================================
  function downloadCsv(filename, headers, rows) {
    var csv = '\uFEFF' + headers.map(function (h) { return '"' + h.replace(/"/g, '""') + '"'; }).join(',') + '\n';
    rows.forEach(function (row) {
      csv += row.map(function (c) { var s = (c === null || c === undefined ? '' : String(c)); return '"' + s.replace(/"/g, '""') + '"'; }).join(',') + '\n';
    });
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportItems() {
    var btn = document.getElementById('export-items-btn');
    common.setButtonLoading(btn, true);
    pbApi.adminGetAll('items', 'name').then(function (rows) {
      downloadCsv('物资台账.csv',
        [Lf('name'), Lf('item_type'), Lf('specification'), Lf('status'), Lf('location'), Lf('location_note'), Lf('note'), Lf('is_active')],
        rows.map(function (r) { var loc = (r.expand && r.expand.location) ? r.expand.location.display_name : ''; return [r.name, r.item_type, r.specification, r.status, loc, r.location_note, r.note, r.is_active ? '是' : '否']; }));
      showToast('物资台账 CSV 已导出');
      common.setButtonLoading(btn, false);
    }).catch(function (e) { showToast('导出失败：' + pbApi.getError(e), 'error'); common.setButtonLoading(btn, false); });
  }

  function exportItemReports() {
    var btn = document.getElementById('export-item-reports-btn');
    common.setButtonLoading(btn, true);
    pbApi.adminGetAll('item_reports', '-created').then(function (rows) {
      var headers = [Lf('name'), Lf('reporter_name'), Lf('reported_status'), Lf('note'), Lf('review_status'), Lf('reviewed_by'), Lf('reviewed_at')];
      downloadCsv('物资状态上报.csv', headers, rows.map(function (r) { return [r.name, r.reporter_name, r.reported_status, r.note, r.review_status, r.reviewed_by, r.reviewed_at]; }));
      showToast('物资状态上报 CSV 已导出');
      common.setButtonLoading(btn, false);
    }).catch(function (e) { showToast('导出失败：' + pbApi.getError(e), 'error'); common.setButtonLoading(btn, false); });
  }

  function exportNewItemReports() {
    var btn = document.getElementById('export-new-items-btn');
    common.setButtonLoading(btn, true);
    pbApi.adminGetAll('new_item_reports', '-created').then(function (rows) {
      downloadCsv('新物资上报.csv',
        [Lf('reporter_name'), Lf('name'), Lf('item_type'), Lf('specification'), Lf('initial_status'), Lf('location_note'), Lf('note'), Lf('review_status'), Lf('reviewed_by'), Lf('reviewed_at')],
        rows.map(function (r) { return [r.reporter_name, r.name, r.item_type, r.specification, r.initial_status, r.location_note, r.note, r.review_status, r.reviewed_by, r.reviewed_at]; }));
      showToast('新物资上报 CSV 已导出');
      common.setButtonLoading(btn, false);
    }).catch(function (e) { showToast('导出失败：' + pbApi.getError(e), 'error'); common.setButtonLoading(btn, false); });
  }

  function exportEquipmentUsage() {
    var btn = document.getElementById('export-usage-btn');
    common.setButtonLoading(btn, true);
    pbApi.adminGetAll('equipment_usage', '-start_time').then(function (rows) {
      downloadCsv('设备使用记录.csv',
        [Lf('name'), Lf('user_name'), Lf('start_time'), Lf('end_time'), Lf('estimated_duration'), Lf('status'), Lf('end_reason'), Lf('note')],
        rows.map(function (r) { return [r.equipment, r.user_name, r.start_time, r.end_time, r.estimated_duration, r.status, r.end_reason, r.note]; }));
      showToast('设备使用记录 CSV 已导出');
      common.setButtonLoading(btn, false);
    }).catch(function (e) { showToast('导出失败：' + pbApi.getError(e), 'error'); common.setButtonLoading(btn, false); });
  }

  // ============================================================
  // 搜索/筛选绑定
  // ============================================================
  function debounce(fn, d) { var t; return function () { clearTimeout(t); t = setTimeout(fn, d); }; }

  // ============================================================
  // 初始化
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    pbApi.init();
    initTabs();
    initAuth();

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // 物资管理按钮
    document.getElementById('add-item-btn').addEventListener('click', showAddItemForm);
    var itemsReload = debounce(loadItems, 300);
    document.getElementById('items-search').addEventListener('input', itemsReload);
    document.getElementById('items-type-filter').addEventListener('change', itemsReload);
    document.getElementById('items-status-filter').addEventListener('change', itemsReload);

    // 设备管理按钮
    document.getElementById('add-equipment-btn').addEventListener('click', showAddEquipmentForm);

    // 成员管理按钮
    document.getElementById('add-member-btn').addEventListener('click', showAddMemberForm);

    // 位置管理按钮
    document.getElementById('add-location-btn').addEventListener('click', showAddLocationForm);

    // CSV 导出
    document.getElementById('export-items-btn').addEventListener('click', exportItems);
    document.getElementById('export-item-reports-btn').addEventListener('click', exportItemReports);
    document.getElementById('export-new-items-btn').addEventListener('click', exportNewItemReports);
    document.getElementById('export-usage-btn').addEventListener('click', exportEquipmentUsage);
  });
})();
