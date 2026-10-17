/* =====================================================================
   奇普托斯蔚藍檔案主義共和國聯盟 · CBARA 互動腳本
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- 進度條 + 頁首陰影 ---------- */
  var bar = document.getElementById('progress');
  var hdr = document.querySelector('.site-header');
  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 行動選單（漢堡） ---------- */
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('mainNav');
  var mask = document.getElementById('navMask');

  function closeNav() {
    if (!nav) return;
    nav.classList.remove('open');
    if (mask) mask.classList.remove('show');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }
  function openNav() {
    if (!nav) return;
    nav.classList.add('open');
    if (mask) mask.classList.add('show');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.contains('open') ? closeNav() : openNav();
    });
    // 點擊導航連結自動收起
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeNav();
    });
  }
  if (mask) mask.addEventListener('click', closeNav);
  // 視窗放大回桌機時重置
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) closeNav();
  });
  // ESC 關閉
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* ---------- 滾動淡入 ---------- */
  var fadeEls = document.querySelectorAll('.fade-in');
  if ('IntersectionObserver' in window && fadeEls.length) {
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          fio.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    fadeEls.forEach(function (el) { fio.observe(el); });
  } else {
    fadeEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 數字滾動 ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function runCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var dur = 1500, t0 = performance.now();
    function step(now) {
      var p = Math.min((now - t0) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { cio.observe(c); });
  } else {
    counters.forEach(function (c) { c.textContent = c.getAttribute('data-count'); });
  }

  /* ---------- 分類篩選（成員國 / 新聞） ---------- */
  document.querySelectorAll('[data-filter-target]').forEach(function (group) {
    var box = document.getElementById(group.getAttribute('data-filter-target'));
    if (!box) return;
    var btns = group.querySelectorAll('.filter-btn');
    var empty = group.parentNode.querySelector('.empty-state');

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');

        var f = b.getAttribute('data-filter');
        var shown = 0;

        box.querySelectorAll('.fitem').forEach(function (it) {
          var match = (f === 'all' || f === '' || !f) || it.getAttribute('data-cat') === f;
          it.style.display = match ? '' : 'none';
          if (match) shown++;
        });

        if (empty) empty.style.display = shown === 0 ? '' : 'none';
      });
    });
  });

  /* ---------- 憲章章節索引高亮 ---------- */
  var tocLinks = document.querySelectorAll('.toc a');
  var arts = document.querySelectorAll('.article');
  if (tocLinks.length && arts.length && 'IntersectionObserver' in window) {
    var aio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var id = en.target.id;
          tocLinks.forEach(function (a) {
            a.classList.toggle('on', a.getAttribute('href') === '#' + id);
          });
          arts.forEach(function (a) { a.classList.toggle('on', a.id === id); });
        }
      });
    }, { rootMargin: '-12% 0px -78% 0px', threshold: 0 });
    arts.forEach(function (a) { aio.observe(a); });
  }

  /* ---------- 表單提交 ---------- */
  document.querySelectorAll('form[data-ajax]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // 簡單驗證
      var invalid = false;
      form.querySelectorAll('[required]').forEach(function (el) {
        if (!el.value.trim()) {
          el.style.borderColor = '#d9646a';
          invalid = true;
        } else {
          el.style.borderColor = '';
        }
      });
      if (invalid) {
        var firstBad = form.querySelector('[required][style]');
        if (firstBad) firstBad.focus();
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var old = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '✓ 已送交秘書處'; }

      setTimeout(function () {
        alert('🏛️ 已送交聯盟秘書處，將依憲章規定提交聯盟大會審議。\n\n本聯盟以和平方法處理各項申請，感謝您的支持。');
        form.reset();
        if (btn) { btn.disabled = false; btn.textContent = old; }
      }, 650);
    });
  });
})();
