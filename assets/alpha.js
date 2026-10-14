/* Alpha signature behaviour on every client site: the splash, the installable offline app, the header and the
   floating glass tab bar that follow the sections, opening hours computed on Tehran time (so a page served from the
   offline cache still tells the truth), and the chat sheet. The consent and install cards live in popups.js. */
(function () {
  var S = window.SITE || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fa = function (s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  var framed = window.top !== window;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* inside the store's phone frames a demo shows as the client's own site would: no demo bar */
  if (framed) { var demoBar = $('.demo-bar'); if (demoBar) demoBar.parentNode.removeChild(demoBar); }

  /* ---------- splash: once per visit, never inside the store's preview frames ---------- */
  var splash = $('#splash');
  if (splash && document.body.classList.contains('splashing')) {
    var t0 = Date.now(), ended = false;
    var done = function () {
      if (ended) return; ended = true;
      setTimeout(function () {
        splash.classList.add('gone');
        try { sessionStorage.setItem('seen-' + S.slug, '1'); } catch (e) {}
        setTimeout(function () { document.body.classList.remove('splashing'); document.dispatchEvent(new CustomEvent('splash:done')); }, 520);
      }, Math.max(0, 700 - (Date.now() - t0)));
    };
    if (document.readyState === 'complete') done(); else window.addEventListener('load', done);
    setTimeout(done, 2000);
  } else setTimeout(function () { document.dispatchEvent(new CustomEvent('splash:done')); }, 0);

  /* ---------- opening hours, on Tehran time (the same rules as PHP hours_status) ---------- */
  function hm(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function clock(m) { m = ((m % 1440) + 1440) % 1440; return fa(Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2)); }
  function tehranNow() {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', hour: 'numeric', minute: 'numeric', weekday: 'short', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { m: (+p.hour % 24) * 60 + (+p.minute), dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
  }
  function status(H) {
    var o = hm(H.open), c = hm(H.close), off = +H.off;
    if (o === null || c === null || o === c) return null;
    var n = tehranNow(), m = n.m, dow = n.dow, over = c < o, tail = over && m < c;
    var shiftDay = tail ? (dow + 6) % 7 : dow;
    var open = (over ? (m >= o || m < c) : (m >= o && m < c)) && shiftDay !== off;
    if (open) { var left = (c - m + 1440) % 1440; return { open: true, dow: dow, text: left <= 45 ? 'باز است؛ ' + fa(left) + ' دقیقه تا بستن' : 'باز است تا ' + clock(c) }; }
    if (dow === off && !tail) return { open: false, dow: dow, text: 'امروز تعطیل است' };
    if (m < o) return { open: false, dow: dow, text: 'بسته است؛ از ' + clock(o) + ' باز می‌شود' };
    return { open: false, dow: dow, text: (dow + 1) % 7 === off ? 'بسته است؛ فردا تعطیل' : 'بسته است؛ فردا از ' + clock(o) };
  }
  function paintHours() {
    if (!S.hours) return;
    var st; try { st = status(S.hours); } catch (e) { return; }
    if (!st) return;
    $$('[data-hours]').forEach(function (el) {
      el.classList.toggle('is-open', st.open); el.classList.toggle('is-closed', !st.open);
      var t = $('.now-t', el); if (t) t.textContent = st.text;
    });
    $$('.week tr').forEach(function (tr) { tr.classList.toggle('today', +tr.dataset.dow === st.dow); });
  }
  paintHours(); setInterval(paintHours, 60000);

  /* ---------- installable app + offline page ---------- */
  if ('serviceWorker' in navigator && !framed && location.protocol !== 'file:' && !window.AW_STATIC) {   // AW_STATIC: the GitHub Pages preview has no worker files
    window.addEventListener('load', function () {
      navigator.serviceWorker.register((S.base || '') + '/sw.js', { scope: S.base || '/' }).catch(function () {});
    });
  }
  $$('[data-act="install"]').forEach(function (b) {
    b.addEventListener('click', function () { if (window.AWP && window.AWP.install) window.AWP.install(true); });
  });
  document.addEventListener('awp:installable', function () { $$('[data-act="install"]').forEach(function (b) { b.hidden = false; }); });

  /* ---------- chat sheet ---------- */
  var chatSheet = $('#chatSheet'), chatOpen = false;
  function openChat() {
    if (!chatSheet) return;
    if (chatSheet.showModal) chatSheet.showModal(); else chatSheet.setAttribute('open', '');
    chatOpen = true; document.dispatchEvent(new CustomEvent('view:change', { detail: 'chat' }));
  }
  if (chatSheet) {
    var closeChat = function () { if (chatSheet.open) chatSheet.close(); };
    $('#chatClose').addEventListener('click', closeChat);
    chatSheet.addEventListener('close', function () { chatOpen = false; document.dispatchEvent(new CustomEvent('view:change', { detail: '' })); });
    chatSheet.addEventListener('click', function (e) { if (e.target === chatSheet) closeChat(); });
    $$('[data-act="chat"]').forEach(function (b) { b.addEventListener('click', openChat); });
  }
  window.AlphaUI = { openChat: openChat, current: function () { return chatOpen ? 'chat' : ''; },
    hours: function () { return S.hours ? status(S.hours) : null; } };   // the bag's «closed right now» note (site.js)

  /* ---------- sections: jump links, the header's nav and the dock follow the scroll ---------- */
  var dock = $('.dock');
  var targets = { top: $('#top'), products: $('#products'), about: $('#about'), contact: $('#contact'), faq: $('#faq') };
  function jump(id) {
    if (id === 'chat') { openChat(); return; }
    if (id === 'top') { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    var el = document.getElementById(id); if (!el) return;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  $$('[data-jump]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); jump(a.dataset.jump); try { history.replaceState(null, '', a.dataset.jump === 'top' ? location.pathname + location.search : '#' + a.dataset.jump); } catch (x) {} }); });

  var current = 'top';
  function movePill() {
    if (!dock) return;
    var pillEl = $('.dock-pill', dock);
    if (!pillEl) { pillEl = document.createElement('span'); pillEl.className = 'dock-pill'; dock.insertBefore(pillEl, dock.firstChild); }
    var active = $('button.on', dock);
    if (!active || !dock.offsetWidth) { pillEl.classList.remove('ready'); return; }
    var dr = dock.getBoundingClientRect(), ar = active.getBoundingClientRect();
    pillEl.style.width = ar.width + 'px';
    pillEl.style.transform = 'translateX(' + (ar.left - dr.left - 1) + 'px)';
    requestAnimationFrame(function () { pillEl.classList.add('ready'); });
  }
  function setOn(id) {
    if (id === current) return;
    current = id;
    if (dock) $$('button[data-tab]', dock).forEach(function (b) {
      var on = b.dataset.tab === id; b.classList.toggle('on', on);
      if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    $$('.hdr-nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.jump === id); });
    movePill();
  }
  function spy() {
    var y = window.scrollY + window.innerHeight * 0.35, id = 'top';
    ['products', 'about', 'contact', 'faq'].forEach(function (k) { var el = targets[k]; if (el && el.getBoundingClientRect().top + window.scrollY <= y) id = k; });
    if (id === 'faq' && !(dock && $('button[data-tab="faq"]', dock))) id = 'contact';
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4 && targets.contact) id = 'contact';
    setOn(id);
  }
  if (dock) {
    $$('button[data-tab]', dock).forEach(function (b) { b.addEventListener('click', function () { jump(b.dataset.tab); }); });
    window.addEventListener('resize', movePill);
    window.addEventListener('orientationchange', function () { setTimeout(movePill, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
    current = ''; setOn('top');
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { ticking = false; spy(); document.documentElement.classList.toggle('scrolled', window.scrollY > 24); });
  }, { passive: true });
  spy();

  /* ---------- category chips follow the products (RTL-safe horizontal centring) ---------- */
  var chips = $$('.g-chips a');
  var chipInto = function (a) {
    var c = a.parentNode, phys = a.offsetLeft + a.offsetWidth / 2 - c.clientWidth / 2, max = c.scrollWidth - c.clientWidth;
    c.scrollTo({ left: getComputedStyle(c).direction === 'rtl' ? phys - max : phys, behavior: 'smooth' });
  };
  chips.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var el = document.getElementById(a.dataset.cat); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }); });
  if ('IntersectionObserver' in window && chips.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        chips.forEach(function (a) { var on = a.dataset.cat === en.target.id; a.classList.toggle('on', on); if (on) chipInto(a); });
      });
    }, { rootMargin: '-140px 0px -60% 0px' });
    $$('.g-cat').forEach(function (s) { io.observe(s); });
  }
})();
