/* Alpha signature behaviour: Alpha Island, splash, installable offline app, and the glass tab bar. */
(function () {
  var S = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fa = function (s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  var framed = window.top !== window;
  /* inside the store's phone frames a demo shows as the client's own site would: no demo bar */
  if (framed) { var demoBar = $('.demo-bar'); if (demoBar) demoBar.parentNode.removeChild(demoBar); }

  /* ---------- splash: once per visit, never inside the store's preview frames ---------- */
  var splash = $('#splash');
  if (splash && document.body.classList.contains('splashing')) {
    var t0 = Date.now();
    var done = function () {
      setTimeout(function () {
        splash.classList.add('gone');
        try { sessionStorage.setItem('seen-' + S.slug, '1'); } catch (e) {}
        setTimeout(function () { document.body.classList.remove('splashing'); }, 520);
      }, Math.max(0, 750 - (Date.now() - t0)));
    };
    if (document.readyState === 'complete') done(); else window.addEventListener('load', done);
    setTimeout(done, 2200);
  }

  /* ---------- Alpha Island: open/closed computed on Tehran time, so cached pages stay right ---------- */
  var island = $('#island');
  function hm(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function clock(m) { m = ((m % 1440) + 1440) % 1440; return fa(Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2)); }
  function tehranNow() {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { m: (+p.hour % 24) * 60 + (+p.minute), dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
  }
  function status() {
    var o = hm(island.dataset.open), c = hm(island.dataset.close), off = +island.dataset.off;
    if (o === null || c === null || o === c) return null;
    var n = tehranNow(), m = n.m, dow = n.dow, over = c < o, tail = over && m < c;
    var shiftDay = tail ? (dow + 6) % 7 : dow;
    var open = (over ? (m >= o || m < c) : (m >= o && m < c)) && shiftDay !== off;
    if (open) { var left = (c - m + 1440) % 1440; return { open: true, text: left <= 45 ? 'باز است؛ ' + fa(left) + ' دقیقه تا بستن' : 'باز است تا ' + clock(c) }; }
    if (dow === off && !tail) return { open: false, text: 'امروز تعطیل است' };
    if (m < o) return { open: false, text: 'بسته است؛ از ' + clock(o) + ' باز می‌شود' };
    return { open: false, text: (dow + 1) % 7 === off ? 'بسته است؛ فردا تعطیل' : 'بسته است؛ فردا از ' + clock(o) };
  }
  function paint() {
    var st = status(); if (!st) return;
    island.classList.toggle('is-open', st.open); island.classList.toggle('is-closed', !st.open);
    $$('.isl-status', island).forEach(function (el) { el.textContent = st.text; });
  }
  if (island) {
    try { paint(); setInterval(paint, 60000); } catch (e) {}
    var pill = $('.isl-pill', island), panel = $('#islPanel');
    var toggle = function (show) {
      panel.hidden = !show; pill.setAttribute('aria-expanded', show ? 'true' : 'false');
    };
    pill.addEventListener('click', function () { toggle(panel.hidden); });
    $('.isl-x', island).addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !island.contains(e.target)) toggle(false); });
    $$('[data-act="chat"]').forEach(function (b) { b.addEventListener('click', function () { toggle(false); openChat(); }); });
  }

  /* scroll-edge scrim under the island */
  var onScroll = function () { document.documentElement.classList.toggle('scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- installable app + offline menu ---------- */
  if ('serviceWorker' in navigator && !framed && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register((S.base || '') + '/sw.js', { scope: S.base || '/' }).catch(function () {});
    });
  }
  var deferred = null;
  var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  function showInstall() { if (!standalone && !framed) $$('[data-act="install"]').forEach(function (b) { b.hidden = false; }); }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showInstall(); });
  if (ios) showInstall();
  $$('[data-act="install"]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; }); return; }
      var tip = $('.isl-ios'); if (tip) { tip.hidden = false; if (island && $('#islPanel').hidden) { $('#islPanel').hidden = false; } }
    });
  });

  /* ---------- glass layouts: views + the floating tab bar with its sliding pill ---------- */
  var dock = $('.dock');
  var scrollMem = {};
  var current = 'home';
  function movePill() {
    if (!dock) return;
    var pillEl = $('.dock-pill', dock);
    if (!pillEl) { pillEl = document.createElement('span'); pillEl.className = 'dock-pill'; dock.insertBefore(pillEl, dock.firstChild); }
    var active = $('button.on', dock);
    if (!active) { pillEl.classList.remove('ready'); return; }
    var dr = dock.getBoundingClientRect(), ar = active.getBoundingClientRect();
    pillEl.style.width = ar.width + 'px';
    pillEl.style.transform = 'translateX(' + (ar.left - dr.left - 1) + 'px)';
    requestAnimationFrame(function () { pillEl.classList.add('ready'); });
  }
  function show(view, fromHash) {
    if (!dock || !$('#v-' + view)) return;
    if (view === current && fromHash) return;
    scrollMem[current] = window.scrollY;
    $$('.view').forEach(function (v) { v.classList.toggle('on', v.dataset.view === view); });
    $$('button[data-tab]', dock).forEach(function (b) {
      var on = b.dataset.tab === view; b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    current = view;
    movePill();
    window.scrollTo(0, view === 'chat' ? document.body.scrollHeight : (scrollMem[view] || 0));
    document.dispatchEvent(new CustomEvent('view:change', { detail: view }));
    if (!fromHash) history.pushState(null, '', view === 'home' ? location.pathname : '#' + view);
  }
  function fromHash() {
    var h = location.hash.replace('#', '');
    if (/^c\d+$/.test(h)) { show('menu', true); var el = document.getElementById(h); if (el) el.scrollIntoView(); return; }
    show($('#v-' + h) ? h : 'home', true);
  }
  function openChat() {
    if (dock && $('#v-chat')) { show('chat'); return; }
    var sh = $('#chatSheet'); if (sh) { if (sh.showModal) sh.showModal(); else sh.setAttribute('open', ''); document.dispatchEvent(new CustomEvent('view:change', { detail: 'chat' })); }
  }
  window.AlphaUI = { openChat: openChat, show: show, current: function () { return dock ? current : (($('#chatSheet') || {}).open ? 'chat' : ''); } };

  if (dock) {
    $$('button[data-tab]', dock).forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });
    $$('[data-go]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); show(b.dataset.go); }); });
    window.addEventListener('popstate', fromHash);
    window.addEventListener('resize', movePill);
    window.addEventListener('orientationchange', function () { setTimeout(movePill, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
    fromHash(); movePill();

    /* bag badge + bump on add */
    document.addEventListener('cart:change', function (e) {
      var b = $('[data-badge="bag"]'); if (!b) return;
      b.hidden = e.detail.count === 0; b.textContent = fa(e.detail.count);
    });
    document.addEventListener('cart:add', function () {
      var t = $('button[data-tab="bag"]', dock); if (!t) return;
      t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
    });

    /* category chips follow the scroll (RTL-safe horizontal centring) */
    var chipInto = function (a) {
      var c = a.parentNode, phys = a.offsetLeft + a.offsetWidth / 2 - c.clientWidth / 2, max = c.scrollWidth - c.clientWidth;
      c.scrollTo({ left: getComputedStyle(c).direction === 'rtl' ? phys - max : phys, behavior: 'smooth' });
    };
    var chips = $$('.g-chips a');
    chips.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var el = document.getElementById(a.dataset.cat); if (el) el.scrollIntoView({ behavior: 'smooth' }); }); });
    if ('IntersectionObserver' in window && chips.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          chips.forEach(function (a) {
            var on = a.dataset.cat === en.target.id; a.classList.toggle('on', on);
            if (on) chipInto(a);
          });
        });
      }, { rootMargin: '-120px 0px -65% 0px' });
      $$('.g-cat').forEach(function (s) { io.observe(s); });
    }
  } else {
    var fab = $('#chatFab'); if (fab) fab.addEventListener('click', openChat);
    var close = $('#chatClose'); if (close) close.addEventListener('click', function () { $('#chatSheet').close(); document.dispatchEvent(new CustomEvent('view:change', { detail: '' })); });
  }
})();
