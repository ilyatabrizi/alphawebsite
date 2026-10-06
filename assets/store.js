/* Alpha Website: small behaviours for the store, signup, panel and admin. No libraries, no external calls. */
(function () {
  var d = document;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* mobile menu sheet */
  var mb = d.querySelector('.menu-btn'), sheet = d.getElementById('sheet');
  if (mb && sheet) {
    var set = function (open) { mb.setAttribute('aria-expanded', open ? 'true' : 'false'); mb.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو'); sheet.hidden = !open; };
    mb.addEventListener('click', function () { set(sheet.hidden); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { set(false); mb.focus(); } });
    d.addEventListener('click', function (e) { if (!sheet.hidden && !sheet.contains(e.target) && !mb.contains(e.target)) set(false); });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  }

  /* copy buttons */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy'), old = b.textContent;
      var done = function () { b.textContent = 'کپی شد'; setTimeout(function () { b.textContent = old; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {}); else { var i = d.createElement('input'); i.value = t; d.body.appendChild(i); i.select(); try { d.execCommand('copy'); done(); } catch (e) {} i.remove(); }
    });
  });

  /* layout filter chips */
  var chips = $$('button.chip[data-f]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      var f = c.getAttribute('data-f');
      $$('.lay').forEach(function (l) { l.hidden = f !== 'all' && l.getAttribute('data-type') !== f; });
    });
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
      b.innerHTML = '<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7l-2.3-3.6a1.5 1.5 0 0 1 2.4-1.8L9 15"/></svg>لمس کن و امتحانش کن</span>';
      ph.appendChild(b);
      b.addEventListener('click', function () { openDemo(demoSrc(b.getAttribute('data-layout')), b.getAttribute('data-name'), b.getAttribute('data-layout')); });
    }
    b.setAttribute('data-layout', layout); b.setAttribute('data-name', name || '');
    b.setAttribute('aria-label', 'باز کردن نمونه زنده ' + (name || '') + ' در تمام صفحه');
  }

  /* The screenshot shows first; on a computer the real site fades in on top of it. */
  function live(box, layout, name, stage, bar) {
    var ph = box.querySelector('.phone'), vp = box.querySelector('.vp'); if (!ph || !vp) return;
    var img = vp.querySelector('img'); if (img) img.src = (window.AW_STATIC ? 'assets' : '/assets') + '/shots/' + layout + '.webp';
    if (stage) setStage(ph, stage, bar);
    box.setAttribute('data-layout', layout);
    var old = vp.querySelector('iframe'); if (old) old.remove();
    ph.classList.remove('on');
    if (!fine) { tryButton(ph, layout, name || box.getAttribute('data-name')); return; }
    var f = d.createElement('iframe');
    f.src = demoSrc(layout); f.title = 'نمونه زنده ' + (name || box.getAttribute('data-name') || ''); f.tabIndex = -1;
    f.addEventListener('load', function () {
      touchify(f);
      setTimeout(function () { f.classList.add('ready'); ph.classList.add('on'); peek(f, box); }, 250);
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

  /* the owner's live preview in the panel */
  var pvf = d.getElementById('pvFrame');
  if (pvf && fine) {
    var arm = function () { touchify(pvf); };
    pvf.addEventListener('load', arm);
    try { if (pvf.contentDocument && pvf.contentDocument.readyState === 'complete') arm(); } catch (e) {}
  }

  /* home: café / restaurant / shop switcher with a sliding pill */
  var seg = d.querySelector('.seg');
  if (seg) {
    var pill = seg.querySelector('.seg-pill'), tabs = $$('[role=tab]', seg), cap = d.getElementById('liveCap');
    var place = function (b, instant) {
      if (instant) pill.style.transition = 'none';
      pill.style.left = b.offsetLeft + 'px'; pill.style.width = b.offsetWidth + 'px';
      if (instant) { pill.offsetWidth; pill.style.transition = ''; }
    };
    var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    place(cur, true);
    window.addEventListener('resize', function () { place(cur, true); });
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b === cur) return;
        cur = b; tabs.forEach(function (t) { t.setAttribute('aria-selected', t === b ? 'true' : 'false'); });
        place(b);
        var lay = b.getAttribute('data-layout');
        live(lv, lay, b.getAttribute('data-name'), b.getAttribute('data-stage'), b.getAttribute('data-bar'));
        if (cap) { cap.href = window.AW_STATIC ? 'layout-' + lay + '.html' : '/layouts/' + lay; cap.textContent = 'نمونه زنده «' + b.getAttribute('data-name') + '»؛ داخل گوشی امتحانش کن'; }
      });
    });
  }

  /* pricing: monthly / yearly */
  var bt = $$('.bill-toggle button');
  bt.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-bill');
      bt.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $$('.tier [data-m]').forEach(function (el) { el.textContent = el.getAttribute('data-' + k); });
    });
  });

  /* show / hide password */
  $$('.pw-t').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.parentNode.querySelector('input'), show = i.type === 'password';
      i.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز');
    });
  });

  /* ask before deleting */
  $$('form[data-confirm]').forEach(function (f) { f.addEventListener('submit', function (e) { if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault(); }); });

  /* file pickers in Persian, whatever the browser's language */
  $$('input[type=file]').forEach(function (inp) {
    var w = d.createElement('span'); w.className = 'attach';
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    var btn = d.createElement('span'); btn.className = 'attach-btn'; btn.textContent = 'انتخاب فایل';
    var nm = d.createElement('span'); nm.className = 'attach-name'; nm.textContent = 'فایلی انتخاب نشده';
    w.appendChild(btn); w.appendChild(nm);
    inp.addEventListener('change', function () { nm.textContent = inp.files && inp.files.length ? inp.files[0].name : 'فایلی انتخاب نشده'; });
  });

  /* panel → look: try a layout or colour in the live phone before saving */
  var lf = d.getElementById('lookForm'), pf = d.getElementById('pvFrame');
  if (lf && pf && /^\/s\//.test(pf.getAttribute('src') || '')) {   // (the static preview has no server to render a layout)
    lf.addEventListener('change', function () {
      var l = lf.querySelector('input[name=layout]:checked'), a = lf.querySelector('input[name=accent]:checked');
      var u = '/s/' + lf.getAttribute('data-slug') + '?pv=1' + (l ? '&layout=' + l.value : '') + (a ? '&accent=' + encodeURIComponent(a.value) : '');
      if (l) setStage(pf.closest('.phone'), l.getAttribute('data-stage'), l.getAttribute('data-bar'));
      pf.classList.remove('ready'); pf.src = u;
      var o = d.getElementById('pvOpen'); if (o) o.href = u;
    });
  }

  /* ready-made replies fill the ticket box */
  $$('[data-fill]').forEach(function (b) {
    b.addEventListener('click', function () { var t = d.getElementById('replyBody'); if (t) { t.value = b.getAttribute('data-fill'); t.focus(); } });
  });
})();
