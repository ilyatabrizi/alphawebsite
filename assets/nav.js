/* The client panel as an app (2026-10-21, Ilya: "blue bank of iran is also web app but it works and feels just like an
   app"). Pages change without a reload: the top bar and the tab bar stay, only #pg (the flash, the side menu and the
   page) is swapped, with a slide (forward / back) or a fade (tabs). Every link and form under /panel goes through fetch;
   anything outside, or anything unexpected, is a normal page load, so nothing can get stuck.
   Also: preload on touch, a thin progress line, back shows the page as it was left at once and then refreshes it, the
   scroll position of each page, the tab bar marked at the tap, and in the installed app (home screen) the iPhone back
   swipe from the right edge and pull to refresh. The server answers this script's requests (header X-AW-Nav) to a
   redirect with the address itself (204 + X-AW-Go, bootstrap.php redirect()), so a #part is kept and a form that saves
   and comes back to the same page keeps its place. No library; same rules as store.js. */
(function () {
  'use strict';
  var d = document, w = window, html = d.documentElement;
  if (!w.fetch || !w.DOMParser || !w.URL || !w.Promise || !history.pushState || !d.getElementById('pg')) return;
  var SCOPE = /^\/panel(\/|$)/, HARD = /^\/panel\/(logout|exit|login|forgot)(\/|$)/, NOPRE = /^\/panel\/(chat|tickets)\/\d+$/;
  var mq = function (q) { return !!(w.matchMedia && w.matchMedia(q).matches); };
  var calm = mq('(prefers-reduced-motion: reduce)');
  var app = !!(w.navigator.standalone || mq('(display-mode: standalone)'));
  var touch = 'ontouchstart' in w;
  if (app) html.classList.add('aw-app');
  var pathOf = function (u) { return u.pathname + u.search; };
  var here = pathOf(location), idx = 0, seq = 0, ctl = null, swiped = false;
  var timers = [], snaps = new Map(), pre = new Map(), ys = {}, renders = 0, busy = false;
  try { history.scrollRestoration = 'manual'; } catch (e) {}
  var st0 = history.state && history.state.aw ? history.state : null;
  idx = st0 ? st0.idx : 0;
  history.replaceState({ aw: 1, idx: idx, y: st0 ? st0.y || 0 : 0 }, '', location.href);
  var input = 0, jumps = 0;   // the last time the person touched, scrolled or typed: from then on the page is theirs
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (t) { w.addEventListener(t, function () { input = Date.now(); }, { passive: true, capture: true }); });
  function jump(y) {   // page changes land at once: the smooth scrolling of the site's CSS is for jumps inside a page
    var go = function () {
      var b = html.style.scrollBehavior; html.style.scrollBehavior = 'auto';
      try { if (typeof y === 'number') w.scrollTo(0, y); else y.scrollIntoView({ block: 'start' }); } finally { html.style.scrollBehavior = b; }
    };
    go(); var k = ++jumps;
    if (typeof y === 'number') return;
    // a #part: hold it in place for a moment, so a smooth scroll still running from the page before, or a photo or font
    // that loads late, can't move it (2026-10-21: a section landed 190px off); the person's own scroll always wins
    var at = function () { return Math.round(y.getBoundingClientRect().top); }, t0 = Date.now(), want = at();
    (function hold() {
      if (k !== jumps || input > t0 || Date.now() - t0 > 600 || !y.isConnected) return;
      if (Math.abs(at() - want) > 1) { go(); want = at(); }
      (w.requestAnimationFrame || setTimeout)(hold);
    })();
  }
  if (st0 && st0.y) jump(st0.y);   // the app reopened or reloaded: back at the same place

  function soft(u) { return u.origin === location.origin && SCOPE.test(u.pathname) && !HARD.test(u.pathname); }
  var gone = false;
  function hard(href) { gone = true; location.assign(href); }   // a normal page load: this page is on its way out
  function main() { return d.getElementById('main') || d.getElementById('pg'); }
  function saveY() { ys[idx] = w.scrollY; try { history.replaceState({ aw: 1, idx: idx, y: w.scrollY }, '', location.href); } catch (e) {} }
  var yT = 0;
  w.addEventListener('scroll', function () { ys[idx] = w.scrollY; clearTimeout(yT); yT = setTimeout(saveY, 400); }, { passive: true });

  /* ---------- the progress line and notes ---------- */
  var bar = d.createElement('div'); bar.className = 'aw-prog'; bar.setAttribute('aria-hidden', 'true'); d.body.appendChild(bar);
  var barT = 0;
  function prog(on) {
    clearTimeout(barT);
    if (on) { bar.className = 'aw-prog'; barT = setTimeout(function () { bar.className = 'aw-prog go'; }, 80); return; }
    if (bar.className.indexOf('go') < 0) { bar.className = 'aw-prog'; return; }
    bar.className = 'aw-prog go done'; barT = setTimeout(function () { bar.className = 'aw-prog'; }, 380);
  }
  function toast(t) {
    if (!t) return;
    var n = d.createElement('div'); n.className = 'call-toast note'; n.setAttribute('role', 'status'); n.textContent = t; d.body.appendChild(n);
    setTimeout(function () { n.classList.add('out'); }, 3800); setTimeout(function () { n.remove(); }, 4400);
  }

  /* ---------- asking the server ---------- */
  function fetchPage(u, o) {
    o = o || {};
    return fetch(u.pathname + u.search, { method: o.method || 'GET', body: o.body, credentials: 'same-origin', cache: 'no-store', signal: o.signal, headers: { 'X-AW-Nav': '1' } })
      .then(function (res) {
        var go = res.headers.get('X-AW-Go');
        if (go !== null) return { go: new URL(go, location.href) };
        if ((res.headers.get('Content-Type') || '').indexOf('text/html') < 0) return { hard: true };
        return res.text().then(function (t) { return { html: t }; });
      });
  }
  function takePre(k) { var p = pre.get(k); pre.delete(k); return p && Date.now() - p.t < 8000 ? p.p : null; }
  function prefetch(a) {
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-hard')) return;
    var u = new URL(a.href, location.href);
    if (!soft(u) || NOPRE.test(u.pathname) || pathOf(u) === here) return;
    var k = pathOf(u), p = pre.get(k);
    if (p && Date.now() - p.t < 8000) return;
    var pr = fetchPage(u);
    pr.catch(function () { var x = pre.get(k); if (x && x.p === pr) pre.delete(k); });   // a failed early load is never reused
    pre.set(k, { p: pr, t: Date.now() });
  }

  /* ---------- the page's own scripts: run again on the new content, in order; their timers stop when it leaves ---------- */
  function runScripts(root) {
    var list = Array.prototype.slice.call(root.querySelectorAll('script'));
    var chain = Promise.resolve(), si = w.setInterval;
    list.forEach(function (old) {
      chain = chain.then(function () {
        return new Promise(function (done) {
          if (!old.parentNode) return done();
          var s = d.createElement('script');
          for (var i = 0; i < old.attributes.length; i++) s.setAttribute(old.attributes[i].name, old.attributes[i].value);
          if (old.src) { s.async = false; s.onload = s.onerror = function () { done(); }; } else s.textContent = old.textContent;
          w.setInterval = function () { var id = si.apply(w, arguments); timers.push(id); return id; };
          try { old.parentNode.replaceChild(s, old); } finally { w.setInterval = si; }
          if (!old.src) done();
        });
      });
    });
    return chain.then(function () {
      if (w.AW && w.AW.init) w.AW.init(root);
      try { d.dispatchEvent(new CustomEvent('aw:page')); } catch (e) {}
    });
  }
  function leave() {
    timers.forEach(function (t) { clearInterval(t); }); timers = [];
    Array.prototype.forEach.call(d.querySelectorAll('.dc-tip'), function (n) { n.remove(); });
    var pg = d.getElementById('pg');
    if (pg && !pg.inert) {
      snaps.set(here, { html: pg.outerHTML, title: d.title.replace(/^\([^)]*\)\s/, '') });
      if (snaps.size > 12) snaps.delete(snaps.keys().next().value);
    }
    try { d.dispatchEvent(new CustomEvent('aw:leave')); } catch (e) {}
  }

  /* ---------- the tab bar: the tapped tab is marked at once, the server's copy follows ---------- */
  function mark(a) {
    var tb = a.closest('.tabbar'); if (!tb) return;
    Array.prototype.forEach.call(tb.querySelectorAll('a'), function (x) { x.classList.toggle('on', x === a); if (x === a) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
  }
  function toHash(u) {
    if (!u.hash || u.hash.length < 2) return false;
    var el = d.getElementById(decodeURIComponent(u.hash.slice(1))); if (!el) return false;
    for (var p = el; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;
    jump(el);
    return true;
  }

  /* ---------- show a page ---------- */
  function render(np, title, u, o) {
    var dir = calm || d.hidden ? 'none' : (o.dir || 'fwd'), rid = ++renders, done;
    var ready = new Promise(function (r) { done = r; });   // settles when the page is in place and its scripts ran
    var swap = function () {
      if (rid !== renders) return done();   // a newer page got here first (the instant copy on back is often overtaken by the fresh one)
      try { put(); } catch (er) { done(); location.assign(u.href); }   // anything odd: a normal page load instead
    };
    var put = function () {
      leave();
      var old = d.getElementById('pg');
      d.adoptNode(np);
      old.parentNode.replaceChild(np, old);
      d.title = title;
      if (o.tabbar) { var tb = d.querySelector('.tabbar'); if (tb) { d.adoptNode(o.tabbar); tb.parentNode.replaceChild(o.tabbar, tb); } }
      if (o.pop) { /* the browser has moved already */ }
      else if (o.replace) history.replaceState({ aw: 1, idx: idx, y: 0 }, '', u.href);
      else { idx++; history.pushState({ aw: 1, idx: idx, y: 0 }, '', u.href); }
      here = pathOf(u);
      if (o.y === 'keep') { /* stays where it is: a refresh of the page you are reading */ }
      else if (o.y !== undefined) jump(o.y);
      else if (!toHash(u)) jump(0);
      saveY();
      if (o.preview) { np.inert = true; return done(); }
      var m = main();
      if (!o.pop && m && !o.keep) { if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1'); try { m.focus({ preventScroll: true }); } catch (e) {} }
      done(runScripts(np));
      if (o.flash) { var f = np.querySelector('.flash'); if (f) toast(f.textContent.trim()); }
    };
    if (dir !== 'none' && d.startViewTransition) {
      html.setAttribute('data-nav', dir);
      var vt = d.startViewTransition(swap);
      var end = function () { if (rid === renders) html.removeAttribute('data-nav'); };
      vt.finished.then(end, end);
    } else {
      html.removeAttribute('data-nav');
      swap();
      var m = main();
      if (dir !== 'none' && m) { m.classList.remove('aw-in-fwd', 'aw-in-back', 'aw-in-tab'); void m.offsetWidth; m.classList.add('aw-in-' + dir); setTimeout(function () { m.classList.remove('aw-in-' + dir); }, 420); }
    }
    return ready;
  }

  function nav(u, o) {
    o = o || {};
    if (ctl) try { ctl.abort(); } catch (e) {}
    ctl = w.AbortController ? new AbortController() : null;
    var my = ++seq, leaving = here, y0 = w.scrollY, post = o.method === 'POST'; busy = true;
    if (!o.pop) saveY();
    if (post) pre.clear();
    prog(true);
    var slow = setTimeout(function () { if (my === seq) html.classList.add('aw-wait'); }, 280);
    var got = !post && takePre(pathOf(u));
    var sig = ctl && ctl.signal, fresh = function () { return fetchPage(u, { method: o.method, body: o.body, signal: sig }); };
    var p = got ? got.catch(fresh) : fresh();   // the early load failed (the internet was off a moment ago): ask again
    return p.then(function (r) {
      if (my !== seq) return;
      if (r.go) {                       // the server sent an address: after a form, or a page that moved
        if (!soft(r.go)) return hard(r.go.href);
        var samePath = pathOf(r.go) === leaving, same = samePath && !r.go.hash;
        clearTimeout(slow);
        return nav(r.go, post ? { dir: same ? 'none' : 'fwd', replace: samePath, y: same ? y0 : undefined, flash: samePath, keep: same }
                              : { dir: o.dir, replace: o.replace, pop: o.pop, y: o.y });
      }
      if (r.hard) return hard(post ? location.href : u.href);
      var doc = new DOMParser().parseFromString(r.html, 'text/html'), np = doc.getElementById('pg');
      if (!np) return hard(post ? location.href : u.href);   // signed out, or not a panel page
      var shown = post ? new URL(location.href) : u;           // a form answered with a page (an error): the address stays
      return render(np, doc.title, shown, { dir: o.dir, pop: o.pop, replace: o.replace || (post && pathOf(shown) === here), y: o.y,
                                     flash: o.flash, keep: o.keep, tabbar: doc.querySelector('.tabbar') });
    }).catch(function (e) {
      if (my !== seq || (e && e.name === 'AbortError')) return;
      Array.prototype.forEach.call(d.querySelectorAll('form[aria-busy=true]'), function (f) { f.removeAttribute('aria-busy'); });
      if (o.pop && snaps.has(pathOf(u))) { var pg = d.getElementById('pg'); if (pg) pg.inert = false; }
      toast(post ? 'اینترنت قطع است؛ فرستاده نشد. دوباره امتحان کن.' : 'اینترنت قطع است؛ دوباره امتحان کن.');
    }).then(function () {
      if (my !== seq) return;
      busy = false; clearTimeout(slow); html.classList.remove('aw-wait'); prog(false);
    });
  }
  function reload() { return nav(new URL(location.href), { dir: 'none', replace: true, y: 'keep', keep: true }); }

  /* ---------- links ---------- */
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.hasAttribute('data-hard')) return;
    var u = new URL(a.href, location.href);
    if (!soft(u)) return;
    var tab = !!a.closest('.tabbar, .side');
    if (pathOf(u) === here) {
      if (u.hash) return;                                   // a jump inside this page: the browser does it
      e.preventDefault();
      if (tab && w.scrollY > 40) { w.scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' }); return; }   // the tab you are on: back to the top
      reload(); return;
    }
    e.preventDefault();
    if (w.AW && w.AW.dirty && w.AW.dirty() && !w.confirm('تغییراتت ذخیره نشده. بدون ذخیره بیرون بروی؟')) return;
    if (w.AW && w.AW.dirty) Array.prototype.forEach.call(d.querySelectorAll('form[data-dirty]'), function (f) { f.removeAttribute('data-dirty'); });
    if (tab) mark(a);
    nav(u, { dir: tab ? 'tab' : 'fwd' });
  });
  d.addEventListener('touchstart', function (e) { var a = e.target.closest && e.target.closest('a[href]'); if (a) prefetch(a); }, { passive: true });
  var hovT = 0;
  d.addEventListener('mouseover', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); clearTimeout(hovT);
    if (a) hovT = setTimeout(function () { prefetch(a); }, 90);
  });

  /* ---------- forms ---------- */
  d.addEventListener('submit', function (e) {
    if (e.defaultPrevented) return;
    var f = e.target, sub = e.submitter || null;
    if (!f || f.tagName !== 'FORM' || f.hasAttribute('data-hard') || (f.target && f.target !== '_self')) return;
    var act = new URL((sub && sub.getAttribute('formaction')) || f.getAttribute('action') || location.href, location.href);
    var method = ((sub && sub.getAttribute('formmethod')) || f.getAttribute('method') || 'GET').toUpperCase();
    if (!soft(act) || (method !== 'GET' && method !== 'POST')) return;
    e.preventDefault();
    if (f.getAttribute('aria-busy') === 'true') return;   // pressed twice
    var fd;
    try { fd = sub ? new FormData(f, sub) : new FormData(f); } catch (er) { fd = new FormData(f); }
    if (sub && sub.name && !fd.has(sub.name)) fd.append(sub.name, sub.value || '');
    if (method === 'GET') {
      var q = new URLSearchParams(); fd.forEach(function (v, k) { if (typeof v === 'string') q.append(k, v); });
      act.search = q.toString(); nav(act, { dir: 'fwd' }); return;
    }
    f.setAttribute('aria-busy', 'true');
    nav(act, { method: 'POST', body: fd, dir: 'fwd' });
  });

  /* ---------- back and forward ---------- */
  w.addEventListener('popstate', function (e) {
    var s = e.state, u = new URL(location.href);
    if (pathOf(u) === here) return;                        // only the #part changed
    if (!s || !s.aw || !soft(u)) { location.reload(); return; }
    var dir = swiped ? 'none' : (s.idx < idx ? 'back' : 'fwd'); swiped = false;
    idx = s.idx;
    var y = ys[s.idx] !== undefined ? ys[s.idx] : (s.y || 0), snap = snaps.get(pathOf(u));
    if (snap) {   // at once, as it was left; then the fresh page quietly in its place
      var np = new DOMParser().parseFromString(snap.html, 'text/html').getElementById('pg');
      if (np) {
        Array.prototype.forEach.call(np.querySelectorAll('iframe'), function (f) { f.removeAttribute('src'); });
        render(np, snap.title, u, { dir: dir, pop: true, y: y, preview: true });
        nav(u, { dir: 'none', pop: true, y: 'keep', keep: true });
        return;
      }
    }
    nav(u, { dir: dir, pop: true, y: y });
  });

  /* ---------- the installed app: back swipe from the right edge (RTL), pull to refresh ---------- */
  if (app && touch) {
    var sw = null, pull = null;
    var ptr = d.createElement('div'); ptr.className = 'aw-ptr'; ptr.setAttribute('aria-hidden', 'true');
    ptr.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>';
    d.body.appendChild(ptr);
    var inner = function (n) {   // a finger on something that scrolls by itself: leave it alone
      for (; n && n !== d.body; n = n.parentElement) {
        if (n.matches && n.matches('input, textarea, select, iframe, [contenteditable], .tbl-wrap, .tblwrap, .chips, .convo, .ed-pv')) return true;
        var cs = w.getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowX + cs.overflowY) && (n.scrollWidth > n.clientWidth + 2 || n.scrollHeight > n.clientHeight + 2)) return true;
      }
      return false;
    };
    d.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1 || d.body.classList.contains('pv-show')) return;
      var t = e.touches[0];
      if (idx > 0 && w.innerWidth - t.clientX < 22) sw = { x: t.clientX, y: t.clientY, dx: 0, on: false, t: Date.now() };
      else if (w.scrollY <= 0 && !inner(e.target)) pull = { y: t.clientY, x: t.clientX, d: 0 };
    }, { passive: true });
    d.addEventListener('touchmove', function (e) {
      var t = e.touches[0], m;
      if (sw) {
        var dx = sw.x - t.clientX, dy = Math.abs(t.clientY - sw.y);
        if (!sw.on) { if (dy > 12 && dy > dx) { sw = null; return; } if (dx < 8) return; sw.on = true; html.classList.add('aw-swipe'); }
        sw.dx = Math.max(0, dx); m = main(); if (m) m.style.transform = 'translateX(' + (-sw.dx) + 'px)';
        return;
      }
      if (pull) {
        var dyp = t.clientY - pull.y;
        if (dyp <= 0 || Math.abs(t.clientX - pull.x) > dyp || w.scrollY > 0) { pull.d = 0; ptr.style.transform = ''; ptr.className = 'aw-ptr'; return; }
        pull.d = Math.min(110, dyp * 0.5);
        ptr.className = 'aw-ptr show' + (pull.d > 62 ? ' ready' : '');
        ptr.style.transform = 'translate(-50%,' + pull.d + 'px) rotate(' + (pull.d * 3) + 'deg)';
      }
    }, { passive: true });
    var tend = function () {
      if (sw) {
        var g = sw, m = main(); sw = null;
        if (!g.on || !m) return;
        var fast = g.dx > 50 && g.dx / Math.max(1, Date.now() - g.t) > 0.45;
        m.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1)';
        if (g.dx > w.innerWidth * 0.33 || fast) {
          m.style.transform = 'translateX(-100%)';
          setTimeout(function () { swiped = true; html.classList.remove('aw-swipe'); m.style.transition = ''; history.back(); }, 200);
        } else {
          m.style.transform = '';
          setTimeout(function () { html.classList.remove('aw-swipe'); m.style.transition = ''; }, 260);
        }
        return;
      }
      if (pull) {
        var go = pull.d > 62; pull = null;
        if (!go) { ptr.className = 'aw-ptr'; ptr.style.transform = ''; return; }
        ptr.className = 'aw-ptr show spin'; ptr.style.transform = 'translate(-50%,64px)';
        reload().then(function () { ptr.className = 'aw-ptr'; ptr.style.transform = ''; });
      }
    };
    d.addEventListener('touchend', tend, { passive: true });
    d.addEventListener('touchcancel', tend, { passive: true });
  }

  w.AWNav = { go: function (href) { return nav(new URL(href, location.href), { dir: 'fwd' }); }, reload: reload,
              busy: function () { return busy || gone; }, n: function () { return seq; } };   // busy and n: for the tests (e2e.py waits on them)
})();
