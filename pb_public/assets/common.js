// ============================================================
// 通用工具函数
// 各页面共用的辅助方法
// ============================================================

var common = (function () {
  'use strict';

  function showMessage(containerId, text, type) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '<div class="msg msg-' + (type || 'info') + '">' + text + '</div>';
  }

  function clearMessage(containerId) {
    var el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  }

  function getUrlParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function isMobile() {
    return window.innerWidth < 768;
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.setAttribute('data-original-text', btn.textContent);
      btn.textContent = '提交中...';
    } else {
      btn.disabled = false;
      var orig = btn.getAttribute('data-original-text');
      if (orig) btn.textContent = orig;
    }
  }

  function disableSubmit(formSelector) {
    var btn = document.querySelector(formSelector + ' button[type="submit"]');
    setButtonLoading(btn, true);
  }

  function enableSubmit(formSelector) {
    var btn = document.querySelector(formSelector + ' button[type="submit"]');
    setButtonLoading(btn, false);
  }

  // ---- 设备派生状态 ----
  function deriveEquipmentStatus(equipment, activeUsage) {
    if (!equipment.is_active) {
      return { text: '停用', css: 'card-tag-danger' };
    }
    if (equipment.status === '维护中') {
      return { text: '维护中', css: 'card-tag-warning' };
    }
    if (equipment.status === '停用') {
      return { text: '停用', css: 'card-tag-danger' };
    }
    if (!activeUsage || activeUsage.length === 0) {
      return { text: '空闲', css: 'card-tag-success' };
    }
    var usage = activeUsage[0];
    if (!usage.estimated_duration) {
      return { text: '使用中', css: 'card-tag-warning' };
    }
    var startTime = new Date(usage.start_time).getTime();
    if (isNaN(startTime)) {
      return { text: '使用中', css: 'card-tag-warning' };
    }
    var expectedEnd = startTime + usage.estimated_duration * 60 * 1000;
    if (Date.now() <= expectedEnd) {
      return { text: '使用中', css: 'card-tag-warning' };
    }
    return { text: '预计已完成，待确认', css: 'card-tag-info' };
  }

  // ---- 格式化时间 ----
  function formatTime(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  function formatDuration(minutes) {
    if (!minutes) return '';
    var mins = parseInt(minutes, 10);
    if (mins < 60) return mins + ' 分钟';
    if (mins < 1440) return (mins / 60).toFixed(1).replace(/\.0$/, '') + ' 小时';
    return (mins / 1440).toFixed(1).replace(/\.0$/, '') + ' 天';
  }

  // ---- 位置名称 ----
  function getLocationName(item) {
    if (item.expand && item.expand.location) {
      return item.expand.location.display_name || '';
    }
    return '';
  }

  // ---- 成功结果视图 ----
  function showSuccessPage(containerId, message, continueUrl, continueText) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML =
      '<div class="msg msg-success" style="margin-bottom:1.5rem;">' + message + '</div>' +
      '<div style="text-align:center;display:flex;flex-direction:column;gap:0.75rem;">' +
      '<a href="' + (continueUrl || '#') + '" class="btn btn-outline btn-large">' +
      (continueText || '继续操作') + '</a>' +
      '<a href="index.html" class="btn btn-secondary btn-large">返回首页</a>' +
      '</div>';
  }

  return {
    showMessage: showMessage,
    clearMessage: clearMessage,
    getUrlParam: getUrlParam,
    escapeHtml: escapeHtml,
    isMobile: isMobile,
    setButtonLoading: setButtonLoading,
    disableSubmit: disableSubmit,
    enableSubmit: enableSubmit,
    deriveEquipmentStatus: deriveEquipmentStatus,
    formatTime: formatTime,
    formatDuration: formatDuration,
    getLocationName: getLocationName,
    showSuccessPage: showSuccessPage,
  };
})();
