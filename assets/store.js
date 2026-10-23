/* Alpha Website: small behaviours for the store, signup, panel and admin. No libraries, no external calls.
   What belongs to a page's own content is bound in init(root); the panel's app navigation (nav.js) swaps the content
   without a reload and calls window.AW.init(newContent) again (2026-10-21). */
(function () {
  var d = document;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* mobile menu sheet */
  var mb = d.querySelector('.menu-btn'), sheet = d.getElementById('sheet');
  if (mb && sheet) {
    /* open: the page behind dims and stops scrolling (2026-10-20, Ilya: the mobile overlay was weak) */
    var set = function (open) { mb.setAttribute('aria-expanded', open ? 'true' : 'false'); mb.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو'); sheet.hidden = !open; d.documentElement.classList.toggle('menu-open', open); };
    mb.addEventListener('click', function () { set(sheet.hidden); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { set(false); mb.focus(); } });
    d.addEventListener('click', function (e) { if (!sheet.hidden && !sheet.contains(e.target) && !mb.contains(e.target)) set(false); });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  }

  /* phones: the bottom bar with «ساخت سایت» slides in while the page's own button is out of sight (2026-10-20) */
  var bb = d.getElementById('buyBar'), bcta = d.querySelector('[data-buy]');
  if (bb && bcta && 'IntersectionObserver' in window) {
    bb.hidden = false; d.body.classList.add('has-buybar');
    var bbSet = function (on) { bb.classList.toggle('on', on); bb.inert = !on; bb.setAttribute('aria-hidden', on ? 'false' : 'true'); };
    bbSet(false);
    new IntersectionObserver(function (es) { es.forEach(function (e) { bbSet(!e.isIntersecting); }); }).observe(bcta);
  }

  /* the card-to-card pay page: ask every few seconds whether the bank's SMS has confirmed the payment, and move on
     once it has. Stops after 45 minutes; a hidden tab asks again as soon as it is shown. */
  var poll = d.querySelector('[data-poll]');
  if (poll && window.fetch) {
    var pUrl = poll.getAttribute('data-poll'), pT0 = Date.now(), pBusy = false;
    var pTick = function () {
      if (pBusy || d.hidden || Date.now() - pT0 > 45 * 60000) return;
      pBusy = true;
      fetch(pUrl, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); })
        .then(function (j) { if (j && j.paid && j.go) location.href = j.go; }).catch(function () {}).then(function () { pBusy = false; });
    };
    setInterval(pTick, 6000);
    d.addEventListener('visibilitychange', pTick);
  }

  /* the template gallery: a search box and a category menu (home #niches, /layouts). Every word typed must appear in
     the card's name, kind or description; Arabic ي/ك/ى, أ/إ/آ, ة and the half-space don't matter. */
  var norm = function (t) { return String(t || '').toLowerCase().replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200f\u200e\u064b-\u065f]/g, '').replace(/[آأإ]/g, 'ا').replace(/ة/g, 'ه'); };
  $$('.tpl-tools').forEach(function (tools) {
    var box = tools.parentNode, cards = $$('.tpl', box), none = box.querySelector('.tpl-none');
    var qi = tools.querySelector('[data-tpl-q]'), ci = tools.querySelector('[data-tpl-c]');
    cards.forEach(function (c) { c._q = norm(c.getAttribute('data-q') + ' ' + c.textContent); });
    var run = function () {
      var words = norm(qi.value).split(/\s+/).filter(Boolean), cat = ci.value, n = 0;
      var tp = box.querySelector('.tpls.clip'); if (tp && (words.length || cat !== 'all')) tp.classList.remove('clip');   // searching shows every card
      /* every word first; nothing found: any word of three letters or more (2026-10-21: «مانتو تبریز» found nothing) */
      [function (w) { return true; }, function (w) { return w.length >= 3; }].some(function (keep, pass) {
        n = 0;
        cards.forEach(function (c) {
          var inCat = cat === 'all' || c.getAttribute('data-cat') === cat, hit = function (w) { return c._q.indexOf(w) > -1; };
          var ok = inCat && (pass === 0 ? words.every(hit) : words.filter(keep).some(hit));
          c.hidden = !ok; if (ok) n++;
        });
        return n > 0 || words.length < 2;
      });
      if (none) none.hidden = n > 0;
    };
    var more = box.querySelector('[data-tpl-more]');
    if (more) more.addEventListener('click', function () { var tp = box.querySelector('.tpls.clip'); if (tp) tp.classList.remove('clip'); more.hidden = true; });
    qi.addEventListener('input', run); ci.addEventListener('change', run);
    qi.addEventListener('keydown', function (e) { if (e.key === 'Enter') e.preventDefault(); });
    if (qi.value || ci.value !== 'all') run();
  });

  /* ---------- phones: live demos you can scroll and tap ----------
     Mouse: the real site loads inside the phone; drag to scroll (with momentum), a soft touch circle replaces the cursor.
     Touch screens: the phone shows the screenshot and a "try it" button that opens the demo full screen (and saves data). */
  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var fine = mq('(hover: hover) and (pointer: fine)'), calm = mq('(prefers-reduced-motion: reduce)');
  var demoSrc = function (layout) { return window.AW_STATIC ? 'demo-' + layout + '.html' : '/s/demo-' + layout; };
  var isDark = function (hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return false;
    var n = parseInt(m[1], 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 < 0.45;
  };
  var setStage = function (ph, bg, bar) {
    if (!ph || !bg) return;
    ph.style.setProperty('--stage', bg); ph.classList.toggle('dk', isDark(bg));
    if (bar) ph.style.setProperty('--bar', bar); else ph.style.removeProperty('--bar');
    ph.classList.toggle('bdk', !!bar && isDark(bar));
  };

  function touchify(f) {
    var w, doc;
    try { w = f.contentWindow; doc = f.contentDocument; } catch (e) { return; }   // another origin: leave it alone
    if (!doc || !doc.body || doc.documentElement.hasAttribute('data-aw-touch')) return;
    doc.documentElement.setAttribute('data-aw-touch', '');
    var st = doc.createElement('style');
    st.textContent = 'html{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none}'
      + 'html.aw-drag,html.aw-drag *{scroll-behavior:auto!important}html,html *{cursor:none!important}html{-webkit-user-select:none;user-select:none}img,a{-webkit-user-drag:none}'
      + '#aw-tap{position:fixed;left:0;top:0;z-index:2147483647;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;'
      + 'background:rgba(120,120,120,.3);box-shadow:0 0 0 1.5px rgba(255,255,255,.8),0 2px 12px rgba(0,0,0,.2);pointer-events:none;opacity:0;'
      + 'transition:opacity .2s,transform .14s,background-color .14s}#aw-tap.on{opacity:1}#aw-tap.down{transform:scale(.8);background:rgba(80,80,80,.45)}';
    (doc.head || doc.documentElement).appendChild(st);
    var dot = doc.createElement('div'); dot.id = 'aw-tap'; doc.body.appendChild(dot);
    var root = doc.scrollingElement || doc.documentElement, drag = null, raf = 0, eat = false;
    var scroller = function (n, axis) {
      for (; n && n.nodeType === 1 && n !== doc.body && n !== doc.documentElement; n = n.parentNode) {
        var cs = w.getComputedStyle(n);
        if (axis === 'x' ? /(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 2
                         : /(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
      }
      return axis === 'x' ? null : root;
    };
    doc.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      w.cancelAnimationFrame(raf); doc.documentElement.classList.remove('aw-drag'); dot.classList.add('down');
      var h = scroller(e.target, 'x'), v = scroller(e.target, 'y');
      drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), h: h, v: v, sl: h ? h.scrollLeft : 0, st: v.scrollTop, vel: 0, moved: false };
    });
    doc.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; dot.classList.add('on');
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        drag.moved = true; drag.axis = drag.h && Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; doc.documentElement.classList.add('aw-drag');
        if (drag.axis === 'x') { drag.snap = drag.h.style.scrollSnapType; drag.h.style.scrollSnapType = 'none'; }
        try { doc.documentElement.setPointerCapture(e.pointerId); } catch (er) {}
      }
      var now = performance.now(), dt = Math.max(1, now - drag.t);
      if (drag.axis === 'x') { drag.h.scrollLeft = drag.sl - dx; drag.vel = 0.75 * drag.vel + 0.25 * (e.clientX - drag.lx) / dt; }
      else { drag.v.scrollTop = drag.st - dy; drag.vel = 0.75 * drag.vel + 0.25 * (e.clientY - drag.ly) / dt; }
      drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now;
    });
    var end = function () {
      dot.classList.remove('down');
      var g = drag; drag = null;
      if (!g || !g.moved) return;
      var html = doc.documentElement, settle = function () { html.classList.remove('aw-drag'); };
      eat = true; setTimeout(function () { eat = false; }, 0);   // a drag is not a tap
      var vel = performance.now() - g.t > 90 ? 0 : g.vel;          // paused before letting go: no throw
      if (g.axis === 'x') {
        settle(); g.h.style.scrollSnapType = g.snap || '';
        if (!calm && Math.abs(vel) > 0.08) g.h.scrollBy({ left: -vel * 300, behavior: 'smooth' });
        else g.h.scrollBy({ left: 0 });                            // let the rail snap
        return;
      }
      if (calm || Math.abs(vel) < 0.08) { settle(); return; }
      var last = performance.now(), el = g.v;
      var step = function (now) {
        var dt = Math.min(34, now - last); last = now;
        el.scrollTop -= vel * dt; vel *= Math.pow(0.95, dt / 16.7);
        if (Math.abs(vel) > 0.02) raf = w.requestAnimationFrame(step); else settle();
      };
      raf = w.requestAnimationFrame(step);
    };
    doc.addEventListener('pointerup', end); doc.addEventListener('pointercancel', end);
    doc.addEventListener('click', function (e) { if (eat) { e.preventDefault(); e.stopPropagation(); eat = false; } }, true);
    doc.addEventListener('dragstart', function (e) { e.preventDefault(); });
    doc.addEventListener('mouseout', function (e) { if (!e.relatedTarget) dot.classList.remove('on'); });
    doc.addEventListener('wheel', function () { w.cancelAnimationFrame(raf); doc.documentElement.classList.remove('aw-drag'); }, { passive: true });
  }

  /* A quiet hint that the phone scrolls: once, a short way down and back, until the visitor touches it. */
  function peek(f, box) {
    if (calm || box.getAttribute('data-peeked')) return;
    box.setAttribute('data-peeked', '1');
    var w; try { w = f.contentWindow; if (!w.document.body) return; } catch (e) { return; }
    var touched = false; box.addEventListener('pointerenter', function () { touched = true; }, { once: true });
    setTimeout(function () { if (!touched) w.scrollTo({ top: 300, behavior: 'smooth' }); }, 900);
    setTimeout(function () { if (!touched) w.scrollTo({ top: 0, behavior: 'smooth' }); }, 2300);
  }

  /* full-screen demo for touch screens */
  var ds = null, dsFrom = null;
  function closeDemo() {
    if (!ds || !ds.classList.contains('open')) return;
    ds.classList.remove('open'); d.documentElement.classList.remove('ds-lock');
    setTimeout(function () { if (!ds.classList.contains('open')) ds.querySelector('.ds-body').innerHTML = ''; }, 450);
    if (dsFrom) dsFrom.focus();
  }
  function openDemo(src, name, layout) {
    if (!ds) {
      ds = d.createElement('div'); ds.className = 'demo-sheet'; ds.setAttribute('role', 'dialog'); ds.setAttribute('aria-modal', 'true');
      ds.innerHTML = '<div class="ds-bar"><button type="button" class="ds-x">بستن</button><b class="ds-t"></b><a class="btn sm ds-go" href="/start">انتخاب این قالب</a></div><div class="ds-body"></div>';
      d.body.appendChild(ds);
      ds.querySelector('.ds-x').addEventListener('click', function () { if (history.state && history.state.awDemo) history.back(); else closeDemo(); });
      window.addEventListener('popstate', closeDemo);
      d.addEventListener('keydown', function (e) { if (e.key === 'Escape') ds.querySelector('.ds-x').click(); });
    }
    dsFrom = d.activeElement;
    ds.setAttribute('aria-label', 'نمونه زنده ' + name);
    ds.querySelector('.ds-t').textContent = name;
    var go = ds.querySelector('.ds-go');
    if (layout) { go.href = window.AW_STATIC ? 'start.html' : '/start?layout=' + layout; go.hidden = false; } else go.hidden = true;
    var f = d.createElement('iframe'); f.src = src; f.title = 'نمونه زنده ' + name;
    var body = ds.querySelector('.ds-body'); body.innerHTML = ''; body.appendChild(f);
    d.documentElement.classList.add('ds-lock');
    ds.offsetWidth; ds.classList.add('open');
    try { history.pushState({ awDemo: 1 }, ''); } catch (e) {}
    ds.querySelector('.ds-x').focus();
  }
  function tryButton(ph, layout, name) {
    var b = ph.querySelector('.ph-try');
    if (!b) {
      b = d.createElement('button'); b.type = 'button'; b.className = 'ph-try';
      b.innerHTML = '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>لمس کن و امتحانش کن</span>';
      ph.appendChild(b);
      b.addEventListener('click', function () { openDemo(demoSrc(b.getAttribute('data-layout')), b.getAttribute('data-name'), b.getAttribute('data-layout')); });
    }
    b.setAttribute('data-layout', layout); b.setAttribute('data-name', name || '');
    b.setAttribute('aria-label', 'باز کردن نمونه زنده ' + (name || '') + ' در تمام صفحه');
  }

  /* The screenshot shows first; on a computer the real site fades in on top of it. */
  function live(box, layout, name, stage, bar) {
    var ph = box.querySelector('.phone'), vp = box.querySelector('.vp'); if (!ph || !vp) return;
    var img = vp.querySelector('img');
    if (img) { img.style.visibility = ''; img.src = (window.AW_STATIC ? 'assets' : '/assets') + '/shots/' + layout + '.webp?v=' + (d.documentElement.getAttribute('data-v') || ''); }
    if (stage) setStage(ph, stage, bar);
    box.setAttribute('data-layout', layout);
    var old = vp.querySelector('iframe'); if (old) old.remove();
    ph.classList.remove('on');
    if (!fine) { tryButton(ph, layout, name || box.getAttribute('data-name')); return; }
    var f = d.createElement('iframe');
    f.src = demoSrc(layout); f.title = 'نمونه زنده ' + (name || box.getAttribute('data-name') || ''); f.tabIndex = -1;
    f.addEventListener('load', function () {
      touchify(f);
      setTimeout(function () {
        f.classList.add('ready'); ph.classList.add('on'); peek(f, box);
        setTimeout(function () { if (img && f.parentNode) img.style.visibility = 'hidden'; }, 450);   // once the live page covers it, the picture under it can't show through
      }, 250);
    });
    vp.appendChild(f);
  }
  var lv = d.getElementById('live');
  if (lv) {
    var start = function () { live(lv, lv.getAttribute('data-layout')); };
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    if (!fine) start();
    else if (d.readyState === 'complete') idle(start); else window.addEventListener('load', function () { idle(start); });
  }

  /* home: pick a niche; the phone loads its demo */
  var tryer = d.querySelector('.tryer');
  if (tryer && lv) {
    var tns = $$('.tn', tryer), go = d.getElementById('tryGo'), more = d.getElementById('tryMore');
    tns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-pressed') === 'true') return;
        tns.forEach(function (t) { t.setAttribute('aria-pressed', t === b ? 'true' : 'false'); });
        var lay = b.getAttribute('data-l');
        live(lv, lay, b.getAttribute('data-n'), b.getAttribute('data-s'), b.getAttribute('data-b'));
        if (go) go.href = window.AW_STATIC ? 'start.html' : '/start?layout=' + lay;
        if (more) more.href = window.AW_STATIC ? 'layout-' + lay + '.html' : '/layouts/' + lay;
      });
    });
  }

  /* pricing: monthly / three months */
  var bt = $$('.bill-toggle button');
  bt.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-bill');
      bt.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-bill') === k ? 'true' : 'false'); });
      $$('.plan [data-m]').forEach(function (el) { el.textContent = el.getAttribute('data-' + k); });
    });
  });

  /* ---------- panel → look: colours (any RGB), shape, text, background and sections, live in the phone before saving ----------
     lookTheme() is the browser twin of theme_colors() + site_theme() in PHP: the same maths, so the phone shows exactly what
     the saved site will be. Keep the two identical (e2e compares them). Only a layout change reloads the phone. */
  var hexOk = function (h) { h = String(h || '').trim().toUpperCase(); return /^#[0-9A-F]{6}$/.test(h) ? h : ''; };
  var rgbOf = function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  var toHex = function (c) { return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('').toUpperCase(); };
  var lum = function (h) { var c = rgbOf(h).map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  var contrast = function (a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  var mix = function (a, b, t) { var A = rgbOf(a), B = rgbOf(b); return toHex([0, 1, 2].map(function (i) { return Math.floor(A[i] + (B[i] - A[i]) * t + 0.5); })); };
  var rgba = function (h, a) { var c = rgbOf(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  var autoInk = function (bg) { return isDark(bg) ? mix(bg, '#FFFFFF', 0.92) : mix(bg, '#000000', 0.88); };
  var autoSurface = function (bg) { return isDark(bg) ? mix(bg, '#FFFFFF', 0.06) : '#FFFFFF'; };
  var LOOK_KEYS = ['bg', 'surface', 'ink', 'accent', 'onaccent', 'muted', 'line'];
  function lookTheme(base, accent, s, opts) {
    var th = {}; LOOK_KEYS.forEach(function (k) { th[k] = base[k]; });
    accent = hexOk(accent);
    if (accent) { th.accent = accent; th.onaccent = isDark(accent) ? '#FFFFFF' : '#111111'; }
    if (s.bg || s.ink || s.surface) {
      if (s.bg) th.bg = s.bg;
      th.ink = s.ink || (s.bg ? autoInk(th.bg) : th.ink);
      th.surface = s.surface || (s.bg ? autoSurface(th.bg) : th.surface);
      if (contrast(th.ink, th.bg) < 3) th.ink = autoInk(th.bg);
      if (contrast(th.ink, th.surface) < 3) th.surface = autoSurface(th.bg);
      if (contrast(th.ink, th.surface) < 3) th.surface = th.bg;
      for (var m = 45; m >= 5; m -= 5) { th.muted = mix(th.ink, th.bg, m / 100); if (contrast(th.muted, th.bg) >= 3) break; }
      th.line = mix(th.ink, th.bg, 0.9);
    }
    var dark = isDark(th.bg);
    th.glass = dark ? rgba(th.surface, 0.93) : rgba(th.bg, 0.9);   // = site_theme() in views_site.php
    th['glass-strong'] = dark ? rgba(th.surface, 0.82) : rgba(th.surface, 0.86);
    th['glass-line'] = dark ? 'rgba(255,255,255,.10)' : rgba(th.ink, 0.1);
    th['glass-shadow'] = dark ? 'inset 0 1px 0 rgba(255,255,255,.08),0 18px 44px rgba(0,0,0,.45),0 3px 10px rgba(0,0,0,.3)'
      : 'inset 0 1px 0 rgba(255,255,255,.9),inset 0 -1px 0 rgba(0,0,0,.05),0 18px 44px ' + rgba(th.ink, 0.16) + ',0 3px 10px ' + rgba(th.ink, 0.08);
    th['pill-on'] = dark ? 'rgba(255,255,255,.12)' : rgba(th.ink, 0.09);
    th.pat = rgba(th.ink, dark ? 0.13 : 0.1);
    th.glow = rgba(th.accent, 0.22);
    th.rk = opts.radius[s.radius]; th.fs = opts.text[s.text]; th.hw = opts.weight[s.weight]; th.ar = opts.ratio[s.ratio]; th.dim = s.dim / 100;
    var cls = (s.pattern !== 'none' ? ['pat-' + s.pattern] : []).concat(s.hide.map(function (h) { return 'no-' + h; }));
    return { th: th, dark: dark, cls: cls };
  }
  window.awLookTheme = lookTheme;   // e2e checks it against the server

  /* ---------- a page's own content: bound on load, and again on the new content after an app navigation ---------- */
  function init(r) {
    r = r || d;
    var byId = function (id) { return r.getElementById ? r.getElementById(id) : r.querySelector('#' + id); };
    d.body.classList.remove('pv-show');   // a page left with the panel's preview open: the next one starts with it closed

    /* copy buttons */
    $$('[data-copy]', r).forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-copy'), old = b.textContent;
        var done = function () { b.textContent = 'کپی شد'; setTimeout(function () { b.textContent = old; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {}); else { var i = d.createElement('input'); i.value = t; d.body.appendChild(i); i.select(); try { d.execCommand('copy'); done(); } catch (e) {} i.remove(); }
      });
    });

    /* «فرستادن لینک سایت»: the phone's share sheet (WhatsApp, Instagram, Telegram…); a computer copies the link */
    $$('[data-share]', r).forEach(function (b) {
      b.addEventListener('click', function () { shareSheet(b.getAttribute('data-share'), b.getAttribute('data-title') || d.title); });   // 2026-10-22: it did nothing without a share sheet
    });

    /* a picture chosen for upload shows at once, beside its field (2026-10-21: the bare «فایلی انتخاب نشده» said nothing) */
    $$('input[type=file][data-preview]', r).forEach(function (inp) {
      inp.addEventListener('change', function () {
        var f = inp.files && inp.files[0], box = inp.parentNode.querySelector('.pick-pv');
        if (!box) { box = d.createElement('span'); box.className = 'pick-pv'; inp.parentNode.appendChild(box); }
        box.innerHTML = '';
        if (!f) return;
        if (!/^image\//.test(f.type)) { box.textContent = 'این فایل عکس نیست.'; return; }
        var im = d.createElement('img'); im.alt = ''; im.src = URL.createObjectURL(f); box.appendChild(im);
        var t = d.createElement('small'); t.textContent = 'عکس انتخاب شد؛ با ذخیره روی سایت می‌رود.'; box.appendChild(t);
      });
    });

    /* a long form tells you it has unsaved changes, and asks before you leave it (2026-10-21: edits were lost silently) */
    $$('form[data-guard]', r).forEach(function (f) {
      var bar = f.querySelector('.save-bar');
      var st = f.querySelector('.lk-state');
      var dirty = function () { if (f.hasAttribute('data-dirty')) return; f.setAttribute('data-dirty', '1'); if (bar) bar.classList.add('on', 'dirty'); if (st) { st.textContent = 'ذخیره نشده'; st.classList.add('dirty'); } };
      f.addEventListener('input', dirty); f.addEventListener('change', dirty);
      f.addEventListener('submit', function () { f.removeAttribute('data-dirty'); });
    });
    /* «سؤال دیگر»: one more question-and-answer row */
    $$('[data-faq-add]', r).forEach(function (b) {
      b.addEventListener('click', function () {
        var box = b.parentNode.querySelector('[data-faq]'), last = box && box.lastElementChild; if (!last) return;
        var n = last.cloneNode(true); n.querySelectorAll('input, textarea').forEach(function (x) { x.value = ''; });
        box.appendChild(n); n.querySelector('input').focus();
      });
    });

    /* the owner's live preview in the panel */
    var pvf = byId('pvFrame');
    if (pvf && fine) {
      var arm = function () { touchify(pvf); };
      pvf.addEventListener('load', arm);
      try { if (pvf.contentDocument && pvf.contentDocument.readyState === 'complete') arm(); } catch (e) {}
    }

    /* admin domain queue: is this name still free? */
    $$('[data-dcheck]', r).forEach(function (b) {
      b.addEventListener('click', function () {
        var out = b.nextElementSibling, words = { free: 'آزاد است', taken: 'ثبت شده', unknown: 'الان قابل بررسی نیست', invalid: 'نام معتبر نیست' };
        out.className = 'dstate'; out.textContent = 'در حال بررسی…';
        fetch('/api/domain?l=' + encodeURIComponent(b.getAttribute('data-dcheck')) + '&ext=' + encodeURIComponent(b.getAttribute('data-ext') || 'ir'))
          .then(function (r) { return r.json(); })
          .then(function (j) { out.className = 'dstate ' + j.status; out.textContent = words[j.status] || ''; })
          .catch(function () { out.className = 'dstate unknown'; out.textContent = words.unknown; });
      });
    });

    /* show / hide password */
    $$('.pw-t', r).forEach(function (b) {
      b.addEventListener('click', function () {
        var i = b.parentNode.querySelector('input'), show = i.type === 'password';
        i.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز');
      });
    });

    /* «+ دسته تازه…» in the add form: its name field appears right there (2026-10-22) */
    $$('select[data-newcat]', r).forEach(function (sel) {
      var box = sel.form && sel.form.querySelector('.new-cat'), inp = box && box.querySelector('input');
      if (!box || !inp) return;
      var sync = function () { var on = sel.value === 'new'; box.hidden = !on; inp.disabled = !on; inp.required = on; if (on && d.activeElement === sel) setTimeout(function () { inp.focus(); }, 30); };
      sel.addEventListener('change', sync); sync();
    });
    /* «ترتیب»: the up/down arrows only while ordering, so each row keeps two clear buttons; remembered for this visit */
    $$('[data-sort-toggle]', r).forEach(function (b) {
      var box = b.closest('#main') || d.body, on = false;
      try { on = sessionStorage.getItem('aw-sorting') === '1'; } catch (e) {}
      var set = function (v) { on = v; box.classList.toggle('sorting', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); b.classList.toggle('on', v); try { sessionStorage.setItem('aw-sorting', v ? '1' : '0'); } catch (e) {} };
      set(on); b.addEventListener('click', function () { set(!on); if (on) note('با فلش‌ها جای هر کدام را عوض کن؛ تمام شد، دوباره «ترتیب» را بزن.'); });
    });
    /* prices as they are typed: «۴۵۰٬۰۰۰ تومان» right under the field, so the zeros can be checked */
    $$('input[data-money], .price-fs input[name=price], .price-fs input[name=old_price]', r).forEach(function (inp) {
      var out = d.createElement('small'); out.className = 'money-say'; out.setAttribute('aria-live', 'polite');
      inp.insertAdjacentElement('afterend', out);
      var en = function (v) { return String(v || '').replace(/[۰-۹]/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(x); }).replace(/[٠-٩]/g, function (x) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(x); }); };
      var say = function () { var v = en(inp.value).replace(/[\s,٬،]/g, ''); out.textContent = /^\d+$/.test(v) && +v > 0 ? Number(v).toLocaleString('fa-IR') + ' تومان' : (v === '0' && inp.name === 'price' ? 'روی سایت: «قیمت در گفتگو»' : ''); };
      inp.addEventListener('input', say); say();
    });
    /* a quick price: one open at a time, the field ready to type */
    $$('details.qp', r).forEach(function (dt) {
      dt.addEventListener('toggle', function () {
        if (!dt.open) return;
        $$('details.qp[open]', r).forEach(function (o) { if (o !== dt) o.open = false; });
        var i = dt.querySelector('input'); if (i) setTimeout(function () { i.focus(); i.select(); }, 30);
      });
    });

    /* a link that asks first (sign out), in the app's own sheet */
    $$('a[data-ask]', r).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        ask(a.getAttribute('data-ask'), { yes: a.getAttribute('data-yes') || 'بله' }).then(function (ok) { if (ok) location.href = a.href; });
      });
    });
    /* the sign-in page remembers the mobile on this device (only the number; never a password) */
    $$('input[data-remember]', r).forEach(function (inp) {
      var k = inp.getAttribute('data-remember');
      try { if (!inp.value) inp.value = localStorage.getItem(k) || ''; } catch (e) {}
      if (inp.form) inp.form.addEventListener('submit', function () { try { localStorage.setItem(k, inp.value.trim()); } catch (e) {} });
    });

    /* ask before deleting */
    $$('form[data-confirm]', r).forEach(function (f) {
      f.addEventListener('submit', function (e) {
        if (f.getAttribute('data-ok') === '1') { f.removeAttribute('data-ok'); return; }       // asked already: on its way
        if (!d.body.classList.contains('area-panel')) { if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault(); return; }
        e.preventDefault(); var sub = e.submitter || null;
        ask(f.getAttribute('data-confirm'), { yes: f.getAttribute('data-yes') || 'بله', danger: f.hasAttribute('data-danger') }).then(function (ok) {
          if (!ok) return; f.setAttribute('data-ok', '1');
          if (f.requestSubmit) { try { f.requestSubmit(sub); } catch (er) { f.requestSubmit(); } } else f.submit();
        });
      });
    });

    /* file pickers in Persian, whatever the browser's language */
    $$('input[type=file]', r).forEach(function (inp) {
      var w = d.createElement('span'); w.className = 'attach';
      inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
      var btn = d.createElement('span'); btn.className = 'attach-btn'; btn.textContent = 'انتخاب فایل';
      var nm = d.createElement('span'); nm.className = 'attach-name'; nm.textContent = 'بدون فایل';
      w.appendChild(btn); w.appendChild(nm);
      inp.addEventListener('change', function () { nm.textContent = inp.files && inp.files.length ? inp.files[0].name : 'بدون فایل'; });
    });

    var lf = byId('lookForm'), pf = byId('pvFrame');
    if (lf) (function () {
      var themes = JSON.parse(lf.getAttribute('data-themes') || '{}'), opts = JSON.parse(lf.getAttribute('data-opts') || '{}');
      var phone = pf && pf.closest('.phone');
      var faNum = function (n) { return String(n).replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'[x]; }).replace('.', '٫'); };
      var enNum = function (t) { return String(t).replace(/[۰-۹]/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(x); }).replace(/[٠-٩]/g, function (x) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(x); }); };
      var field = function (n) { return lf.elements[n]; };
      var radio = function (n) { var r = lf.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ''; };
      var layout = function () { return radio('layout'); };
      var pickers = $$('.cp', lf);
      var state = function () {
        var s = { accent: hexOk(field('accent').value), bg: hexOk(field('bg').value), surface: hexOk(field('surface').value), ink: hexOk(field('ink').value),
                  radius: radio('radius'), text: radio('text'), weight: radio('weight'), ratio: radio('ratio'), pattern: radio('pattern'),
                  dim: +field('dim').value, hide: [] };
        $$('.lk-tog input[type=checkbox]', lf).forEach(function (c) { if (!c.checked) s.hide.push(c.name.slice(5, -1)); });
        return s;
      };
      var url = function () { return '/s/' + lf.getAttribute('data-slug') + '?pv=1&layout=' + layout() + '&look=' + encodeURIComponent(JSON.stringify(state())); };
      var level = function (r, k) {
        if (k === 'acc') return r >= 3 ? ['good', 'خوب'] : r >= 1.3 ? ['ok', 'کافی'] : ['bad', 'کم‌پیدا'];
        return r >= 7 ? ['good', 'عالی'] : r >= 4.5 ? ['good', 'خوب'] : r >= 3 ? ['ok', 'کافی'] : ['bad', 'کم'];
      };
      var dragging = null;
      function paintPicker(cp, T, s) {
        var k = cp.getAttribute('data-key'), v = s[k], shown = v || T.th[k], c = rgbOf(shown);
        cp.querySelector('.cp-chip').style.background = shown;
        cp.querySelector('.cp-val .lat').textContent = shown;
        cp.querySelector('.cp-val em').hidden = !!v;
        $$('.cp-sw button', cp).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-c') === v ? 'true' : 'false'); });
        var rgb = { R: 0, G: 1, B: 2 };
        $$('input[data-ch]', cp).forEach(function (r) {
          var i = rgb[r.getAttribute('data-ch')], lo = c.slice(), hi = c.slice(); lo[i] = 0; hi[i] = 255;
          if (r !== dragging) r.value = c[i];
          r.style.setProperty('--lo', 'rgb(' + lo.join(',') + ')'); r.style.setProperty('--hi', 'rgb(' + hi.join(',') + ')');
        });
        $$('input[data-num]', cp).forEach(function (n) { if (n !== d.activeElement) n.value = c[rgb[n.getAttribute('data-num')]]; });
        var w = cp.querySelector('input[type=color]'); if (w) w.value = shown.toLowerCase();
      }
      function refresh(reload) {
        var s = state(), base = themes[layout()] || {}, T = lookTheme(base, s.accent, s, opts);
        pickers.forEach(function (cp) { paintPicker(cp, T, s); });
        var rows = { text: contrast(T.th.ink, T.th.bg), card: contrast(T.th.ink, T.th.surface), btn: contrast(T.th.onaccent, T.th.accent), acc: contrast(T.th.accent, T.th.bg) };
        $$('#lookCheck li', lf).forEach(function (li) {
          var k = li.getAttribute('data-k'), r = rows[k], L = level(r, k);
          li.className = 'lk-' + L[0]; li.querySelector('b').textContent = L[1];   // no ratios on the owner's screen (2026-10-21)
        });
        byId('lookFix').hidden = !((s.ink && T.th.ink !== s.ink) || (s.surface && T.th.surface !== s.surface));
        var out = byId('lkDimOut'); if (out) out.textContent = faNum(s.dim) + '٪';
        $$('[data-layouts]', lf).forEach(function (el) { el.hidden = (' ' + el.getAttribute('data-layouts') + ' ').indexOf(' ' + layout() + ' ') < 0; });
        var def = lf.querySelector('.lk-pal[data-pal=""]');
        if (def) $$('i', def).forEach(function (i, n) { i.style.background = base[['bg', 'surface', 'ink', 'accent'][n]]; });
        if (phone) setStage(phone, T.th.bg, base.banner ? T.th.ink : '');
        if (!pf) return;
        if (reload) { if (/^\/s\//.test(pf.getAttribute('src') || '')) { pf.classList.remove('ready'); pf.src = url(); } return; }
        paintFrame(T);
      }
      function paintFrame(T) {
        var doc; try { doc = pf.contentDocument; } catch (e) { return; }
        if (!doc || !doc.body) return;
        var b = doc.body;
        Object.keys(T.th).forEach(function (k) { b.style.setProperty('--' + k, String(T.th[k])); });
        b.className.split(/\s+/).forEach(function (c) { if (/^(pat|no)-/.test(c)) b.classList.remove(c); });
        T.cls.forEach(function (c) { b.classList.add(c); });
        if (b.classList.contains('glass')) b.classList.toggle('dark', T.dark);
        $$('img.alpha-mark', doc).forEach(function (i) { i.src = i.getAttribute('src').replace(/alpha-(white|black)\.png/, 'alpha-' + (T.dark ? 'white' : 'black') + '.png'); });
      }
      if (pf) pf.addEventListener('load', function () { refresh(false); });
      var setColor = function (cp, hex, typing) {
        var inp = field(cp.getAttribute('data-key'));
        if (!typing) inp.value = hex;
        refresh(false);
      };
      pickers.forEach(function (cp) {
        var k = cp.getAttribute('data-key');
        $$('.cp-sw button', cp).forEach(function (b) { b.addEventListener('click', function () { setColor(cp, b.getAttribute('data-c')); }); });
        var fromSliders = function () { var c = [0, 0, 0]; $$('input[data-ch]', cp).forEach(function (r) { c[{ R: 0, G: 1, B: 2 }[r.getAttribute('data-ch')]] = Math.max(0, Math.min(255, Math.round(+r.value) || 0)); }); return c; };
        $$('input[data-ch]', cp).forEach(function (r) {
          r.addEventListener('input', function () { dragging = r; setColor(cp, toHex(fromSliders())); });
          r.addEventListener('change', function () { dragging = null; refresh(false); });
        });
        $$('input[data-num]', cp).forEach(function (n) {
          n.addEventListener('input', function () {
            var v = Math.max(0, Math.min(255, Math.round(+enNum(n.value)) || 0));
            var c = fromSliders(); c[{ R: 0, G: 1, B: 2 }[n.getAttribute('data-num')]] = v; setColor(cp, toHex(c));
          });
          n.addEventListener('blur', function () { refresh(false); });
        });
        var hx = field(k);
        hx.addEventListener('input', function () {
          var t = enNum(hx.value).replace(/\s/g, '').toUpperCase(); if (t && t[0] !== '#') t = '#' + t;
          if (t !== hx.value) hx.value = t;
          if (t === '' || hexOk(t)) setColor(cp, t, true);
        });
        hx.addEventListener('blur', function () { if (hx.value && !hexOk(hx.value)) hx.value = ''; refresh(false); });
        var w = cp.querySelector('input[type=color]');
        if (w) w.addEventListener('input', function () { setColor(cp, w.value.toUpperCase()); });
        cp.addEventListener('toggle', function () { if (cp.open) pickers.forEach(function (o) { if (o !== cp) o.open = false; }); });
      });
      $$('.lk-pal', lf).forEach(function (b) {
        b.addEventListener('click', function () {
          field('accent').value = b.getAttribute('data-accent') || ''; field('bg').value = b.getAttribute('data-bg') || '';
          field('ink').value = b.getAttribute('data-ink') || ''; field('surface').value = '';
          refresh(false);
        });
      });
      var reset = byId('lookReset');
      if (reset) reset.addEventListener('click', function () {
        ['accent', 'bg', 'surface', 'ink'].forEach(function (k) { field(k).value = ''; });
        [['radius', 'normal'], ['text', 'normal'], ['weight', 'bold'], ['ratio', 'square'], ['pattern', 'none']].forEach(function (p) { var r = lf.querySelector('input[name="' + p[0] + '"][value="' + p[1] + '"]'); if (r) r.checked = true; });
        field('dim').value = 66;
        $$('.lk-tog input[type=checkbox]', lf).forEach(function (c) { c.checked = true; });
        refresh(false);
      });
      lf.addEventListener('change', function (e) { if (e.target.name === 'layout') refresh(true); else if (!e.target.closest('.cp')) refresh(false); });
      lf.addEventListener('input', function (e) { if (e.target.name === 'dim') refresh(false); });
      refresh(false);

      /* phones and tablets: the live phone opens over the page */
      var show = byId('pvShow'), pv = r.querySelector('.ed-pv');
      if (show && pv) {
        var x = d.createElement('button'); x.type = 'button'; x.className = 'lk-pvx'; x.setAttribute('aria-label', 'بستن پیش‌نمایش'); x.textContent = '×';
        pv.querySelector('.ed-pv-in').appendChild(x);
        var fit = function () { if (phone) phone.style.setProperty('--pv-s', String(Math.min(0.9, (window.innerHeight - 130) / 896, (window.innerWidth - 32) / 424))); };
        var open = function (on) { d.body.classList.toggle('pv-show', on); show.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on) { fit(); x.focus(); } else show.focus(); };
        show.addEventListener('click', function () { open(true); });
        x.addEventListener('click', function () { open(false); });
        pv.addEventListener('click', function (e) { if (e.target === pv) open(false); });
        d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.body.contains(pv) && d.body.classList.contains('pv-show')) open(false); });
        window.addEventListener('resize', function () { if (d.body.contains(pv) && d.body.classList.contains('pv-show')) fit(); });
      }
    })();

    /* where orders go (signup + /panel/info): seven messengers, one main. A filled row lights up; the main one must be
       filled, so choosing an empty row as main moves the focus to it, and emptying the main row passes «main» on. */
    $$('[data-och]', r).forEach(function (box) {
      var rows = $$('.och-row', box);
      var sync = function () {
        var main = box.querySelector('input[name=order_channel]:checked');
        rows.forEach(function (row) { var v = row.querySelector('input.ltr').value.trim(); row.classList.toggle('on', v !== ''); });
        if (main && !main.closest('.och-row').classList.contains('on')) {
          var first = rows.filter(function (r) { return r.classList.contains('on'); })[0];
          if (first && document.activeElement !== main.closest('.och-row').querySelector('input.ltr')) { first.querySelector('input[name=order_channel]').checked = true; main = first.querySelector('input[name=order_channel]'); }
        }
        var row = main && main.closest('.och-row'), ch = row ? row.getAttribute('data-ch') : 'whatsapp';
        var name = row ? row.querySelector('.och-name b').textContent : 'واتساپ';
        $$('[data-och-name]', box).forEach(function (x) { x.textContent = name; });
        var demo = box.querySelector('.och-demo'); if (demo) { demo.classList.toggle('tg', ch === 'telegram'); demo.classList.toggle('other', ch !== 'telegram' && ch !== 'whatsapp'); }
      };
      rows.forEach(function (row) {
        var inp = row.querySelector('input.ltr'), r = row.querySelector('input[name=order_channel]');
        inp.addEventListener('input', function () {
          if (row.getAttribute('data-ch') !== 'whatsapp') inp.value = inp.value.replace(/^\s+/, '');
          sync();
        });
        inp.addEventListener('blur', sync);
        r.addEventListener('change', function () { if (!inp.value.trim()) inp.focus(); sync(); });
      });
      sync();
    });

    /* ready-made replies fill the ticket box */
    $$('[data-fill]', r).forEach(function (b) {
      b.addEventListener('click', function () {
        var t = d.getElementById('replyBody'), s = b.getAttribute('data-fill'); if (!t) return;
        var v = t.value.trim();   /* never wipe what they typed: each chip adds its line (once), so «still broken» + «screenshot attached» stack */
        if (v.indexOf(s) < 0) t.value = v ? v + '\n' + s : s; t.focus();
      });
    });
    /* a new ticket's ready messages: topic, title and text, then the cursor on the first «…» to fill in */
    $$('[data-ready]', r).forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.closest('form'), r; if (!f) return;
        try { r = JSON.parse(b.getAttribute('data-ready')); } catch (e) { return; }
        if (f.topic) f.topic.value = r.t; if (f.subject) f.subject.value = r.s;
        var t = f.body; if (!t) return;
        var v = t.value.trim(), keep = v && v !== t._ready, at = keep ? v.length + 2 : 0;   /* their own words stay; the ready text goes under them */
        t.value = keep ? v + '\n\n' + r.b : r.b; t._ready = r.b; t.focus();
        var i = r.b.indexOf('…'); if (i >= 0) t.setSelectionRange(at + i, at + i + 1);
        $$('[data-ready]', f).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      });
    });
  }
  init(d);
  /* ---------- in-app sheets instead of the browser's boxes (2026-10-22: confirm() looked like an error, not like the app) ---------- */
  var dlg = null;
  function sheetEl() {
    if (dlg) return dlg;
    dlg = d.createElement('dialog'); dlg.className = 'ask-sheet'; dlg.setAttribute('aria-labelledby', 'askT');
    dlg.innerHTML = '<div class="ask-in"><p class="ask-t" id="askT"></p><div class="ask-x"></div><div class="ask-acts"><button type="button" class="btn ask-yes"></button><button type="button" class="btn ghost ask-no">نه</button></div></div>';
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close('no'); });
    d.body.appendChild(dlg); return dlg;
  }
  function ask(text, o) {
    o = o || {};
    return new Promise(function (res) {
      var s = sheetEl();
      if (typeof s.showModal !== 'function') { res(window.confirm(text)); return; }
      s.querySelector('.ask-t').textContent = text; s.querySelector('.ask-x').innerHTML = o.html || '';
      var y = s.querySelector('.ask-yes'), n = s.querySelector('.ask-no');
      y.textContent = o.yes || 'بله'; y.className = 'btn ask-yes' + (o.danger ? ' danger' : ''); n.textContent = o.no || 'نه'; n.hidden = o.no === false;
      var done = function (v) { y.onclick = n.onclick = null; s.onclose = null; if (s.open) s.close(); res(v); };
      y.onclick = function () { done(true); }; n.onclick = function () { done(false); }; s.onclose = function () { done(false); };
      s.showModal(); y.focus();
    });
  }
  function shareSheet(u, title) {
    var shown = u.replace(/^https?:\/\//, '').replace(/\/$/, '');
    var can = !!navigator.share;
    var p = ask('لینک سایتت', { yes: can ? 'فرستادن در پیام‌رسان یا اینستاگرام' : 'کپی لینک', no: 'بستن',
      html: '<p class="ask-link lat" dir="ltr">' + shown.replace(/[<>&"]/g, '') + '</p><p class="hint">این لینک را در بیو اینستاگرامت، استوری و واتساپ بگذار تا مشتری‌ها مستقیم به سایتت بیایند.</p>'
        + (can ? '<button type="button" class="btn sm ghost ask-copy">کپی لینک</button>' : '') });
    var cp = sheetEl().querySelector('.ask-copy');
    var copy = function () {
      var ok = function () { note('لینک کپی شد؛ حالا هر جا خواستی بچسبان.'); };
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(ok, function () { note('کپی نشد؛ لینک را نگه دار و دستی کپی کن.'); });
      else { var i = d.createElement('input'); i.value = u; d.body.appendChild(i); i.select(); try { d.execCommand('copy'); ok(); } catch (e) {} i.remove(); }
    };
    if (cp) cp.onclick = function () { copy(); if (sheetEl().open) sheetEl().close(); };
    p.then(function (yes) { if (!yes) return; if (can) navigator.share({ title: title, url: u }).catch(function () {}); else copy(); });
  }
  /* a short line at the bottom of the screen: what just happened */
  function note(t, ms) {
    if (!t) return;
    var n = d.createElement('div'); n.className = 'call-toast note'; n.setAttribute('role', 'status'); n.textContent = t; d.body.appendChild(n);
    setTimeout(function () { n.classList.add('out'); }, ms || 5200); setTimeout(function () { n.remove(); }, (ms || 5200) + 600);
  }
  /* the browser's own «Please fill out this field.» is in English: say it in Persian */
  d.addEventListener('invalid', function (e) {
    var el = e.target; if (!el || !el.validity || el.hasAttribute('data-own-msg')) return;
    var v = el.validity, m = '';
    if (v.valueMissing) m = el.type === 'checkbox' ? 'برای ادامه این را تیک بزن.' : (el.tagName === 'SELECT' || el.type === 'radio' ? 'یکی را انتخاب کن.' : (el.type === 'file' ? 'یک عکس انتخاب کن.' : 'این را پر کن.'));
    else if (v.typeMismatch) m = el.type === 'email' ? 'ایمیل را درست بنویس؛ مثل name@gmail.com' : 'این را درست بنویس.';
    else if (v.tooShort) m = 'دست‌کم ' + el.minLength + ' حرف بنویس.';
    else if (v.patternMismatch) m = el.getAttribute('title') || 'این را درست بنویس.';
    else if (v.rangeUnderflow || v.rangeOverflow) m = 'این عدد درست نیست.';
    if (m) { el.setCustomValidity(m); el.setAttribute('data-aw-cv', ''); var clear = function () { el.setCustomValidity(''); el.removeAttribute('data-aw-cv'); el.removeEventListener('input', clear); el.removeEventListener('change', clear); }; el.addEventListener('input', clear); el.addEventListener('change', clear); }
  }, true);
  /* the next press of a submit button checks afresh: a message we set must not outlive what caused it (a field filled in
     by a script, a rule taken away), or the form could never be sent. The browser fires «invalid» again where needed. */
  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[type=submit], button:not([type]), input[type=submit]'); if (!b || !b.form) return;
    Array.prototype.forEach.call(b.form.querySelectorAll('[data-aw-cv]'), function (x) { x.setCustomValidity(''); x.removeAttribute('data-aw-cv'); });
  }, true);

  window.AW = window.AW || {}; window.AW.init = init; window.AW.ask = ask; window.AW.note = note; window.AW.share = shareSheet;
  window.AW.dirty = function () { return !!d.querySelector('form[data-dirty]'); };
  window.addEventListener('beforeunload', function (e) { if (window.AW.dirty()) { e.preventDefault(); e.returnValue = ''; } });
})();
