// ============================================================
// 物资状态上报脚本
// 加载物资列表，提交 item_reports
// ============================================================

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!pbApi.init()) {
      common.showMessage('form-message', '系统未初始化，请检查 PocketBase SDK 是否已加载', 'error');
      return;
    }
    loadItems();
    setupForm();
  });

  function loadItems() {
    var selectEl = document.getElementById('item-id');
    pbApi.getItems('', '', '', '')
      .then(function (items) {
        items.forEach(function (item) {
          var opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = item.name +
            ' (' + item.item_type + ' - ' + item.status + ')';
          selectEl.appendChild(opt);
        });

        var preSelectId = common.getUrlParam('item_id');
        if (preSelectId) {
          selectEl.value = preSelectId;
        }
      })
      .catch(function (err) {
        common.showMessage('form-message', '加载物资列表失败：' + pbApi.getError(err), 'error');
      });
  }

  function setupForm() {
    var form = document.getElementById('item-report-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleSubmit();
    });
  }

  function handleSubmit() {
    common.clearMessage('form-message');

    var reporterName = document.getElementById('reporter-name').value.trim();
    var itemId = document.getElementById('item-id').value;
    var reportedStatus = document.getElementById('reported-status').value;
    var note = document.getElementById('note').value.trim();

    if (!reporterName) {
      common.showMessage('form-message', '请输入上报人姓名', 'error');
      return;
    }
    if (!itemId) {
      common.showMessage('form-message', '请选择物资', 'error');
      return;
    }
    if (!reportedStatus) {
      common.showMessage('form-message', '请选择上报状态', 'error');
      return;
    }

    var data = {
      item: itemId,
      reporter_name: reporterName,
      reported_status: reportedStatus,
      review_status: '待审核',
      note: note || '',
    };

    common.disableSubmit('#item-report-form');
    common.showMessage('form-message', '提交中，请稍候...', 'loading');

    pbApi.submitItemReport(data)
      .then(function () {
        common.showSuccessPage(
          'form-message',
          '物资状态上报成功！上报内容已提交，管理员审核后正式台账状态会更新。',
          'item-report.html',
          '继续上报'
        );
        document.getElementById('item-report-form').style.display = 'none';
      })
      .catch(function (err) {
        common.enableSubmit('#item-report-form');
        common.showMessage('form-message', '提交失败：' + pbApi.getError(err), 'error');
      });
  }
})();
