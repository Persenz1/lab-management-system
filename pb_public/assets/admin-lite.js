// ============================================================
// admin-lite 管理后台脚本
// ============================================================
// 阶段 1 占位：后续阶段实现标签切换、审核操作、设备关闭、CSV 导出

(function () {
  'use strict';

  // 标签切换逻辑
  function initTabs() {
    var tabBtns = document.querySelectorAll('.tab-btn');
    var tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = 'tab-' + this.getAttribute('data-tab');

        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        tabPanels.forEach(function (p) { p.classList.remove('active'); });

        this.classList.add('active');
        var panel = document.getElementById(targetId);
        if (panel) panel.classList.add('active');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
  });
})();
