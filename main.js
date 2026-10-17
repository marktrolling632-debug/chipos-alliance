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

  /* ---------- 表單提交（Web3Forms） ---------- */
  var W3F_ENDPOINT = 'https://api.web3forms.com/submit';

  function genAppId() {
    var d = new Date();
    var y = d.getFullYear();
    var r = Math.floor(Math.random() * 9000) + 1000;
    return 'CA-' + y + '-' + r;
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function nowStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
           ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  document.querySelectorAll('form[data-web3form]').forEach(function (form) {
    var isJoin = form.id === 'joinForm';
    var resultBox = document.getElementById(isJoin ? 'joinResult' : 'contactResult');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // ---- 驗證 ----
      var invalid = false, firstBad = null;
      form.querySelectorAll('[required]').forEach(function (el) {
        if (!el.value || !el.value.trim()) {
          el.style.borderColor = '#d9646a';
          invalid = true;
          if (!firstBad) firstBad = el;
        } else {
          el.style.borderColor = '';
        }
      });
      if (invalid) {
        if (firstBad) firstBad.focus();
        if (resultBox) {
          resultBox.style.display = '';
          resultBox.className = 'result-card result-error';
          resultBox.innerHTML = '⚠️ 尚有必填欄位未填寫，請檢查標示紅框之欄位後重新遞交。';
        }
        return;
      }

      // ---- 入盟申請編號 ----
      var appId = '';
      if (isJoin) {
        appId = genAppId();
        var idField = document.getElementById('joinAppId');
        if (idField) idField.value = appId;
      }

      var btn = form.querySelector('button[type="submit"]');
      var old = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = '遞交中…'; }
      if (resultBox) { resultBox.style.display = 'none'; }

      var data = new FormData(form);

      fetch(W3F_ENDPOINT, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: data
      })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j && res.j.success) {
          var html;
          if (isJoin) {
            html = '<div class="result-head">✅ 申請書已送達聯盟秘書處</div>' +
              '<div class="result-sub">本申請依《聯盟憲章》第三、四、八條辦理，將提交安全理事會審議後送聯盟大會表決。</div>' +
              '<table class="result-table">' +
              '<tr><th>申請編號</th><td class="hl">' + esc(appId) + '</td></tr>' +
              '<tr><th>國家 / 政體</th><td>' + esc(data.get('state_name')) + '</td></tr>' +
              '<tr><th>代表姓名</th><td>' + esc(data.get('representative')) + '</td></tr>' +
              '<tr><th>聯絡方式</th><td>' + esc(data.get('contact')) + '</td></tr>' +
              '<tr><th>申請類型</th><td>' + esc(data.get('apply_type')) + '</td></tr>' +
              '<tr><th>憲章義務</th><td>' + esc(data.get('accept_charter')) + '</td></tr>' +
              '<tr><th>遞交時間</th><td>' + esc(nowStr()) + '</td></tr>' +
              '<tr><th>審議狀態</th><td><span class="status">待秘書處受理</span></td></tr>' +
              '</table>' +
              '<p class="result-note">請妥善保存申請編號 ' + esc(appId) +
              '，審議結果將由秘書處透過上述聯絡渠道正式通知，並公告於資訊中心。</p>';
          } else {
            html = '<div class="result-head">✅ 留言已送達聯盟秘書處</div>' +
              '<div class="result-sub">秘書處將於受理後，依登記之聯絡方式儘速回覆。</div>' +
              '<table class="result-table">' +
              '<tr><th>稱謂</th><td>' + esc(data.get('sender_name')) + '</td></tr>' +
              '<tr><th>聯絡方式</th><td>' + esc(data.get('contact')) + '</td></tr>' +
              '<tr><th>事項類別</th><td>' + esc(data.get('category')) + '</td></tr>' +
              '<tr><th>送出時間</th><td>' + esc(nowStr()) + '</td></tr>' +
              '</table>';
          }
          if (resultBox) {
            resultBox.className = 'result-card result-ok';
            resultBox.innerHTML = html;
            resultBox.style.display = '';
          }
          form.reset();
          if (resultBox) resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          throw new Error('fail');
        }
      })
      .catch(function () {
        if (resultBox) {
          resultBox.style.display = '';
          resultBox.className = 'result-card result-error';
          resultBox.innerHTML = '⚠️ 遞交失敗，請檢查網路連線後重試，或逕向聯盟秘書處聯絡。' +
            (appId ? '<br><span style="opacity:.8;font-size:.82rem">已產生編號：' + esc(appId) + '（未送出）</span>' : '');
        }
      })
      .then(function () {
        if (btn) { btn.disabled = false; btn.textContent = old; }
      });
    });
  });
})();
