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
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function isMobile() {
    return window.innerWidth < 768;
  }

  function confirmAction(message, callback) {
    if (window.confirm(message)) {
      callback();
    }
  }

  return {
    showMessage: showMessage,
    clearMessage: clearMessage,
    getUrlParam: getUrlParam,
    escapeHtml: escapeHtml,
    isMobile: isMobile,
    confirmAction: confirmAction,
  };
})();
