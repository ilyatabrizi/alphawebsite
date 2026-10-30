/* The panel's «راهنما» sheet and its first-time tour (2026-10-22, Ilya: "users can simply understand every single
   function and things that is happening in this platform").
   - Every panel page carries <template id="pgHelp"> (what the page is for, what its buttons do, in the business's own
     words; lib/panel_help.php). The «راهنما» button in the top bar opens it in a sheet (dialog#helpSheet). The page part
     changes in place (nav.js), so the sheet reads the template when it opens.
   - The panel home carries #tourData: six short steps over the tab bar (phones) or the side menu (computers). Shown once
     per device (localStorage aw-tour), again from the sheet's «تور کوتاه پنل». Nothing here is needed for the panel to
     work; storage that throws only means the tour may show again. */
(function () {
  'use strict';
  var d = document, w = window;
  var store = function (k, v) { try { if (v === undefined) return w.localStorage.getItem(k); w.localStorage.setItem(k, v); } catch (e) { return null; } };
  var sess = function (k, v) { try { if (v === undefined) return w.sessionStorage.getItem(k); if (v === null) w.sessionStorage.removeItem(k); else w.sessionStorage.setItem(k, v); } catch (e) { return null; } };
  var fa = function (n) { return String(n).replace(/\d/g, function (x) { return '۰۱۲۳۴۵۶۷۸۹'[x]; }); };
  var calm = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- the help sheet ---------- */
  var sheet = d.getElementById('helpSheet');
  function openHelp() {
    if (!sheet) return;
    var t = d.getElementById('pgHelp'), body = d.getElementById('hsBody'), h = d.getElementById('hsT');
    if (t) { h.textContent = t.getAttribute('data-t') || 'راهنما'; body.innerHTML = ''; body.appendChild(t.content.cloneNode(true)); }
    else { h.textContent = 'راهنما'; body.innerHTML = '<p class="hs-lead">هر جا گیر کردی یا چیزی روشن نبود، برای تیم آلفا پیام بفرست؛ جواب همین‌جا در پنل می‌آید.</p>'; }
    if (typeof sheet.showModal === 'function') { if (!sheet.open) sheet.showModal(); } else sheet.setAttribute('open', '');
    d.documentElement.classList.add('hs-lock');
    var x = sheet.querySelector('.hs-x'); if (x) x.focus();
  }
  function closeHelp() {
    if (!sheet) return;
    if (sheet.open) { if (typeof sheet.close === 'function') sheet.close(); else sheet.removeAttribute('open'); }
    d.documentElement.classList.remove('hs-lock');
  }
  if (sheet) {
    sheet.addEventListener('close', function () { d.documentElement.classList.remove('hs-lock'); });
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) { closeHelp(); return; }                       // a tap outside the card
      var c = e.target.closest && e.target.closest('[data-hs-close]'); if (c) closeHelp();
      var a = e.target.closest && e.target.closest('a[href]'); if (a && !a.target) closeHelp();
    });
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-help]');
    if (b) { e.preventDefault(); openHelp(); return; }
    var again = e.target.closest && e.target.closest('[data-tour-again]');
    if (again) {
      e.preventDefault(); closeHelp();
      if (d.getElementById('tourData')) startTour(true);
      else { sess('aw-tour-now', '1'); if (w.AWNav) w.AWNav.go('/panel'); else location.href = '/panel'; }
    }
  });
  d.addEventListener('aw:leave', closeHelp);

  /* ---------- the first-time tour ---------- */
  var tour = null;
  function visible(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && w.getComputedStyle(el).visibility !== 'hidden'; }
  function find(sels) { for (var i = 0; i < sels.length; i++) { var el = d.querySelector(sels[i]); if (visible(el)) return el; } return null; }
  function endTour(done) {
    if (!tour) return;
    if (done) store('aw-tour', '1');
    w.removeEventListener('resize', place); w.removeEventListener('scroll', place, true); d.removeEventListener('keydown', key, true);
    var o = tour.o; tour = null; o.classList.add('out'); setTimeout(function () { o.remove(); }, calm ? 0 : 200);
    d.documentElement.classList.remove('tour-on');
  }
  function key(e) {
    if (!tour) return;
    if (e.key === 'Escape') { e.preventDefault(); endTour(true); }
    else if (e.key === 'ArrowLeft' || e.key === 'Enter') { if (e.target && e.target.tagName === 'BUTTON' && e.key === 'Enter') return; e.preventDefault(); step(tour.i + 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(tour.i - 1); }
  }
  function place() {
    if (!tour) return;
    var ring = tour.ring, card = tour.card, el = tour.el, vw = w.innerWidth, vh = w.innerHeight;
    if (!el) { ring.hidden = true; card.style.top = Math.max(16, (vh - card.offsetHeight) / 2) + 'px'; card.style.left = Math.max(12, (vw - card.offsetWidth) / 2) + 'px'; return; }
    var r = el.getBoundingClientRect(), p = 6;
    ring.hidden = false;
    ring.style.top = (r.top - p) + 'px'; ring.style.left = (r.left - p) + 'px'; ring.style.width = (r.width + p * 2) + 'px'; ring.style.height = (r.height + p * 2) + 'px';
    var cw = card.offsetWidth, ch = card.offsetHeight, gap = 14;
    var below = r.bottom + p + gap + ch <= vh - 8, above = r.top - p - gap - ch >= 8;
    var top = (r.top + r.height / 2 > vh / 2 || !below) && above ? r.top - p - gap - ch : r.bottom + p + gap;
    if (!below && !above) top = Math.max(8, vh - ch - 8);
    var left = r.left + r.width / 2 - cw / 2; left = Math.min(Math.max(12, left), vw - cw - 12);
    card.style.top = top + 'px'; card.style.left = left + 'px';
  }
  function step(i) {
    if (!tour) return;
    if (i < 0) i = 0;
    if (i >= tour.s.length) { endTour(true); return; }
    tour.i = i; var s = tour.s[i];
    tour.el = find(s.s || []);
    if (tour.el && !tour.el.closest('.tabbar, .side, .top')) {   // a part of the page: bring it into view first
      var r = tour.el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > w.innerHeight - 90) tour.el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
    }
    tour.card.querySelector('.tour-n').textContent = fa(i + 1) + ' از ' + fa(tour.s.length);
    tour.card.querySelector('.tour-t').textContent = s.t;
    tour.card.querySelector('.tour-d').textContent = s.d;
    var next = tour.card.querySelector('.tour-next'); next.textContent = i === tour.s.length - 1 ? 'فهمیدم' : 'بعدی';
    tour.card.querySelector('.tour-back').hidden = i === 0;
    place(); setTimeout(place, calm ? 0 : 380);   // after a smooth scroll settles
    next.focus({ preventScroll: true });
  }
  function startTour(force) {
    if (tour) return;
    var data = d.getElementById('tourData'); if (!data) return;
    if (!force && store('aw-tour') === '1') return;
    var s; try { s = JSON.parse(data.textContent); } catch (e) { return; }
    if (!s || !s.length) return;
    var o = d.createElement('div'); o.className = 'tour'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'tourT');
    o.innerHTML = '<div class="tour-ring" aria-hidden="true"></div><div class="tour-card"><p class="tour-n"></p><h2 class="tour-t" id="tourT"></h2><p class="tour-d"></p>'
      + '<div class="tour-acts"><button type="button" class="btn sm tour-next"></button><button type="button" class="btn sm ghost tour-back">قبلی</button><button type="button" class="tour-skip">رد کردن</button></div></div>';
    d.body.appendChild(o);
    tour = { o: o, s: s, i: 0, ring: o.querySelector('.tour-ring'), card: o.querySelector('.tour-card'), el: null };
    o.querySelector('.tour-next').addEventListener('click', function () { if (tour) step(tour.i + 1); });
    o.querySelector('.tour-back').addEventListener('click', function () { if (tour) step(tour.i - 1); });
    o.querySelector('.tour-skip').addEventListener('click', function () { endTour(true); });
    o.addEventListener('click', function (e) { if (tour && (e.target === o || e.target === tour.ring)) step(tour.i + 1); });   // a tap anywhere moves on
    w.addEventListener('resize', place); w.addEventListener('scroll', place, true); d.addEventListener('keydown', key, true);
    d.documentElement.classList.add('tour-on');
    step(0);
  }
  var quiet = /(^|;\s*)awq=1/.test(d.cookie);   // our own tests and screenshots: the tour only when asked for
  function maybe() {
    if (!d.getElementById('tourData')) return;
    if (quiet && sess('aw-tour-now') !== '1') return;
    var now = sess('aw-tour-now') === '1'; if (now) sess('aw-tour-now', null);
    if (!now && store('aw-tour') === '1') return;
    setTimeout(function () {
      /* the «اعلان‌ها را روشن کن» sheet (push.js) comes first in the app; the tour follows when it closes (2026-10-30) */
      if (d.documentElement.classList.contains('np-on')) { d.addEventListener('aw:np-done', function () { setTimeout(function () { if (!d.hidden) startTour(now); }, 350); }, { once: true }); return; }
      if (!d.hidden && !(sheet && sheet.open)) startTour(now);
    }, now ? 250 : 900);
  }
  d.addEventListener('aw:page', function () { endTour(false); maybe(); });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', maybe); else maybe();
  /* ---------- a page that is waiting on something (data-autorefresh="6"): look again by itself ----------
     The owner never has to press «بررسی دوباره» while we are still making something (2026-10-22). Stops when the page
     is left, when it is hidden, or while the person is typing or a sheet is open. */
  var ar = null;
  function autoRefresh() {
    clearTimeout(ar); ar = null;
    var el = d.querySelector('[data-autorefresh]'); if (!el) return;
    var sec = Math.max(4, parseInt(el.getAttribute('data-autorefresh'), 10) || 8), at = location.pathname + location.search;
    ar = setTimeout(function again() {
      if (!d.querySelector('[data-autorefresh]') || location.pathname + location.search !== at) return;
      // never while a page change is on its way: nav.js would cancel it (a «بررسی دوباره» or a save the person just sent)
      var busy = d.hidden || (sheet && sheet.open) || tour || (w.AWNav && w.AWNav.busy && w.AWNav.busy()) || d.querySelector('dialog[open], form.dirty') || (d.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(d.activeElement.tagName));
      if (busy) { ar = setTimeout(again, sec * 1000); return; }
      if (w.AWNav && w.AWNav.reload) w.AWNav.reload(); else location.reload();
    }, sec * 1000);
  }
  d.addEventListener('aw:leave', function () { clearTimeout(ar); ar = null; });
  d.addEventListener('aw:page', autoRefresh);
  d.addEventListener('visibilitychange', function () {   // back from Bale or the bank app: look at once
    if (d.hidden || !d.querySelector('[data-autorefresh]') || tour || (sheet && sheet.open) || (w.AWNav && w.AWNav.busy && w.AWNav.busy()) || d.querySelector('dialog[open], form.dirty')) return;
    clearTimeout(ar); ar = null; if (w.AWNav && w.AWNav.reload) w.AWNav.reload();
  });
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', autoRefresh); else autoRefresh();

  w.AWHelp = { open: openHelp, close: closeHelp, tour: function () { startTour(true); } };
})();
