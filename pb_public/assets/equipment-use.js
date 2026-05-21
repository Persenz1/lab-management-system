// ============================================================
// 设备使用登记脚本
// 加载成员/设备/物资列表，提交到 custom route
// ============================================================

(function () {
  'use strict';

  var activeUsageByEquipment = {};

  document.addEventListener('DOMContentLoaded', function () {
    if (!pbApi.init()) {
      common.showMessage('form-message', '系统未初始化，请检查 PocketBase SDK 是否已加载', 'error');
      return;
    }
    loadFormData();
    setupForm();
  });

  function loadFormData() {
    loadMembers();
    loadEquipmentList();
    loadMaterials();
  }

  function loadMembers() {
    var selectEl = document.getElementById('user-name');
    pbApi.getMembers()
      .then(function (members) {
        members.forEach(function (m) {
          var opt = document.createElement('option');
          opt.value = m.name;
          opt.textContent = m.name;
          selectEl.appendChild(opt);
        });
      })
      .catch(function () {
        // 成员列表加载失败不阻塞，用户可手填
        console.warn('成员列表加载失败');
      });
  }

  function loadEquipmentList() {
    var selectEl = document.getElementById('equipment-id');
    selectEl.addEventListener('change', function () {
      showActiveUsageWarning(this.value, activeUsageByEquipment[this.value]);
    });

    Promise.all([pbApi.getEquipment(), pbApi.getAllActiveUsage()])
      .then(function (results) {
        var equipment = results[0];
        var activeUsage = results[1];
        activeUsageByEquipment = {};
        activeUsage.forEach(function (usage) {
          if (!activeUsageByEquipment[usage.equipment]) {
            activeUsageByEquipment[usage.equipment] = usage;
          }
        });

        equipment.forEach(function (eq) {
          // 只显示启用且可用的设备（排除停用和维护中的）
          if (eq.status !== '可用') return;
          var opt = document.createElement('option');
          opt.value = eq.id;
          opt.textContent = eq.name;
          selectEl.appendChild(opt);
        });

        var preSelectId = common.getUrlParam('equipment_id');
        if (preSelectId) {
          selectEl.value = preSelectId;
        }
        showActiveUsageWarning(selectEl.value, activeUsageByEquipment[selectEl.value]);
      })
      .catch(function (err) {
        common.showMessage('form-message', '加载设备列表失败：' + pbApi.getError(err), 'error');
      });
  }

  function loadMaterials() {
    var container = document.getElementById('materials-checkboxes');
    pbApi.getItems('', '', '', '')
      .then(function (items) {
        if (!items.length) {
          container.innerHTML = '<span class="form-hint">暂无可用物资</span>';
          return;
        }
        items.forEach(function (item) {
          var label = document.createElement('label');
          label.className = 'form-checkbox-label';
          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = item.id;
          cb.setAttribute('data-item-id', item.id);
          label.appendChild(cb);
          label.appendChild(document.createTextNode(item.name));
          container.appendChild(label);
        });
      })
      .catch(function () {
        container.innerHTML = '<span class="form-hint">物资列表加载失败</span>';
      });
  }

  function setupForm() {
    var form = document.getElementById('equipment-use-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit();
    });
  }

  function getSelectedMaterials() {
    var checkboxes = document.querySelectorAll('#materials-checkboxes input[type="checkbox"]:checked');
    var ids = [];
    checkboxes.forEach(function (cb) { ids.push(cb.value); });
    return ids;
  }

  function buildUsageWarningHtml(usage) {
    var html = '<div class="msg msg-warning" style="margin-top:0.5rem;margin-bottom:0;text-align:left;">' +
      '当前设备正在使用中。继续提交会自动关闭上一条使用记录，并标记为 overridden_by_new_usage。' +
      '<br>当前使用人：' + common.escapeHtml(usage.user_name || '未知');

    if (usage.start_time) {
      html += '<br>开始时间：' + common.escapeHtml(common.formatTime(usage.start_time));
    }

    if (usage.estimated_duration) {
      var startMs = new Date(usage.start_time).getTime();
      if (!isNaN(startMs)) {
        var expectedEnd = new Date(startMs + usage.estimated_duration * 60 * 1000);
        html += '<br>预计结束：' + common.escapeHtml(common.formatTime(expectedEnd.toISOString()));
      }
    }

    html += '</div>';
    return html;
  }

  function showActiveUsageWarning(equipmentId, usage) {
    var warningEl = document.getElementById('equipment-active-warning');
    if (!warningEl) return;
    if (!equipmentId || !usage) {
      warningEl.style.display = 'none';
      warningEl.innerHTML = '';
      return;
    }
    warningEl.innerHTML = buildUsageWarningHtml(usage);
    warningEl.style.display = 'block';
  }

  function buildOverrideConfirmMessage(usage) {
    var lines = [
      '这个设备当前正在使用中。',
      '',
      '当前使用人：' + (usage.user_name || '未知'),
    ];

    if (usage.start_time) {
      lines.push('开始时间：' + common.formatTime(usage.start_time));
    }
    if (usage.estimated_duration) {
      var startMs = new Date(usage.start_time).getTime();
      if (!isNaN(startMs)) {
        var expectedEnd = new Date(startMs + usage.estimated_duration * 60 * 1000);
        lines.push('预计结束：' + common.formatTime(expectedEnd.toISOString()));
      }
    }

    lines.push('');
    lines.push('继续提交会自动关闭上一条使用记录。确认继续？');
    return lines.join('\n');
  }

  function submitRegistration(data, hadActiveUsage) {
    common.showMessage('form-message', '提交中，请稍候...', 'loading');

    pbApi.submitEquipmentUse(data)
      .then(function () {
        common.showSuccessPage(
          'form-message',
          hadActiveUsage
            ? '设备使用登记成功！上一条使用记录已自动关闭。'
            : '设备使用登记成功！',
          'equipment-use.html',
          '继续登记'
        );
        document.getElementById('equipment-use-form').style.display = 'none';
      })
      .catch(function (err) {
        common.enableSubmit('#equipment-use-form');
        common.showMessage('form-message', '提交失败：' + pbApi.getError(err), 'error');
      });
  }

  function handleSubmit() {
    common.clearMessage('form-message');

    var selectEl = document.getElementById('user-name');
    var manualEl = document.getElementById('user-name-manual');
    var userName = selectEl.value || manualEl.value.trim();

    var equipmentId = document.getElementById('equipment-id').value;
    var durationVal = document.getElementById('estimated-duration').value;
    var note = document.getElementById('note').value.trim();

    // 验证
    if (!userName) {
      common.showMessage('form-message', '请选择或输入使用人', 'error');
      return;
    }
    if (!equipmentId) {
      common.showMessage('form-message', '请选择使用设备', 'error');
      return;
    }

    var data = {
      equipment_id: equipmentId,
      user_name: userName,
      note: note || '',
    };

    if (durationVal) {
      data.estimated_duration = parseInt(durationVal, 10);
    }

    var materials = getSelectedMaterials();
    if (materials.length > 0) {
      data.materials = materials;
    }

    common.disableSubmit('#equipment-use-form');
    common.showMessage('form-message', '检查设备当前使用状态...', 'loading');

    pbApi.getActiveUsage(equipmentId)
      .then(function (activeUsage) {
        var currentUsage = activeUsage && activeUsage.length ? activeUsage[0] : null;
        if (currentUsage) {
          activeUsageByEquipment[equipmentId] = currentUsage;
        } else {
          delete activeUsageByEquipment[equipmentId];
        }
        showActiveUsageWarning(equipmentId, currentUsage);

        if (currentUsage && !window.confirm(buildOverrideConfirmMessage(currentUsage))) {
          common.enableSubmit('#equipment-use-form');
          common.clearMessage('form-message');
          return;
        }

        submitRegistration(data, !!currentUsage);
      })
      .catch(function (err) {
        common.enableSubmit('#equipment-use-form');
        common.showMessage('form-message', '检查设备状态失败：' + pbApi.getError(err), 'error');
      });
  }
})();
