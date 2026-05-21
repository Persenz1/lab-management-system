// ============================================================
// 设备使用登记脚本
// 加载成员/设备/物资列表，提交到 custom route
// ============================================================

(function () {
  'use strict';

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
    pbApi.getEquipment()
      .then(function (equipment) {
        equipment.forEach(function (eq) {
          if (eq.status === '停用') return;
          var opt = document.createElement('option');
          opt.value = eq.id;
          opt.textContent = eq.name + (eq.status === '维护中' ? ' [维护中]' : '');
          selectEl.appendChild(opt);
        });

        var preSelectId = common.getUrlParam('equipment_id');
        if (preSelectId) {
          selectEl.value = preSelectId;
        }
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
    common.showMessage('form-message', '提交中，请稍候...', 'loading');

    pbApi.submitEquipmentUse(data)
      .then(function () {
        common.showSuccessPage(
          'form-message',
          '设备使用登记成功！新登记会自动关闭该设备的上一条使用记录。',
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
})();
