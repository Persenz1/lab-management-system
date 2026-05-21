// ============================================================
// 新物资上报脚本
// 动态加载位置列表，提交 new_item_reports
// ============================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!pbApi.init()) {
      common.showMessage('form-message', '系统未初始化，请检查 PocketBase SDK 是否已加载', 'error');
      return;
    }
    loadLocations();
    setupForm();
  });

  function loadLocations() {
    var selectEl = document.getElementById('location');
    pbApi.getLocations()
      .then(function (locations) {
        // 清除现有选项（保留「请选择位置」）
        while (selectEl.options.length > 1) {
          selectEl.remove(1);
        }
        locations.forEach(function (loc) {
          var opt = document.createElement('option');
          opt.value = loc.id;
          opt.textContent = loc.display_name;
          selectEl.appendChild(opt);
        });
      })
      .catch(function () {
        console.warn('位置列表加载失败');
      });
  }

  function setupForm() {
    var form = document.getElementById('new-item-report-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit();
    });
  }

  function handleSubmit() {
    common.clearMessage('form-message');

    var reporterName = document.getElementById('reporter-name').value.trim();
    var itemName = document.getElementById('item-name').value.trim();
    var itemType = document.getElementById('item-type').value;
    var specification = document.getElementById('specification').value.trim();
    var initialStatus = document.getElementById('initial-status').value;
    var locationId = document.getElementById('location').value;
    var locationNote = document.getElementById('location-note').value.trim();
    var note = document.getElementById('note').value.trim();

    if (!reporterName) {
      common.showMessage('form-message', '请输入上报人姓名', 'error');
      return;
    }
    if (!itemName) {
      common.showMessage('form-message', '请输入物资名称', 'error');
      return;
    }
    if (!itemType) {
      common.showMessage('form-message', '请选择物资类型', 'error');
      return;
    }

    var data = {
      reporter_name: reporterName,
      name: itemName,
      item_type: itemType,
      specification: specification || '',
      initial_status: initialStatus,
      location_note: locationNote || '',
      note: note || '',
      review_status: '待审核',
    };

    if (locationId) {
      data.location = locationId;
    }

    common.disableSubmit('#new-item-report-form');
    common.showMessage('form-message', '提交中，请稍候...', 'loading');

    pbApi.submitNewItemReport(data)
      .then(function () {
        common.showSuccessPage(
          'form-message',
          '新物资上报成功！上报内容已提交，管理员审核通过后将添加到正式台账。',
          'new-item-report.html',
          '继续上报'
        );
        document.getElementById('new-item-report-form').style.display = 'none';
      })
      .catch(function (err) {
        common.enableSubmit('#new-item-report-form');
        common.showMessage('form-message', '提交失败：' + pbApi.getError(err), 'error');
      });
  }
})();
