/* The first-open «اعلان‌ها را روشن کن» sheet in the installed app (2026-10-30; Ilya: "at the start we should push users
   to enable notifications!"). The markup is push_prompt_html() (lib/push.php), dialog#npSheet, in every panel page.
   - Only inside the installed app (html.in-app, set by app_gate_head) with Web Push support and the server's key.
   - The phone has not answered yet: the sheet opens before the panel tour (help.js waits for «aw:np-done»).
     «روشن کردن اعلان‌ها» asks the phone (in the tap itself, as iPhone requires), subscribes and registers the phone
     (/panel/push/sub; the server sends the welcome push). «بعداً» or closing it: asked again after a day.
   - The phone said no: once a week, how to allow it in the phone's settings (a page cannot ask again).
   - The phone said yes: re-registered quietly once a day per account (after «خروج» and signing in, a renewed key).
   Our tests and screenshots (cookie awq=1) see none of it unless sessionStorage aw-np-now is '1'.
   Storage that throws only means the sheet may come back sooner. */
(function () {
  'use strict';
  var d = document, w = window, n = navigator, dl = d.getElementById('npSheet');
  if (!dl || w.__awNp) return; w.__awNp = 1;
  var root = d.documentElement;
  var store = function (k, v) { try { if (v === undefined) return w.localStorage.getItem(k); if (v === null) w.localStorage.removeItem(k); else w.localStorage.setItem(k, v); } catch (e) { return null; } };
  var sess = function (k) { try { return w.sessionStorage.getItem(k); } catch (e) { return null; } };
  if (/(^|;\s*)awq=1/.test(d.cookie) && sess('aw-np-now') !== '1') return;
  if (!root.classList.contains('in-app')) return;
  if (!('serviceWorker' in n) || !('PushManager' in w) || !('Notification' in w)) return;
  var K = dl.getAttribute('data-key'), csrf = dl.getAttribute('data-csrf'), tid = dl.getAttribute('data-tid');
  if (!K) return;
  var DAY = 864e5;

  function u8(b) { b = b.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; var s = atob(b), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; }
  function b64(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function post(url, data) { var f = new FormData(); f.append('csrf', csrf); for (var k in data) f.append(k, data[k]); return fetch(url, { method: 'POST', body: f, credentials: 'same-origin' }).then(function (r) { return r.json().catch(function () { return { ok: false }; }); }); }
  function keys(s) { var j = s.toJSON(); return { endpoint: s.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }; }
  function reg() { return n.serviceWorker.register('/sw.js', { scope: '/' }).then(function () { return n.serviceWorker.ready; }); }
  function fresh(r) {   // this phone's subscription for our key (a subscription for an old key is replaced)
    var opts = { userVisibleOnly: true, applicationServerKey: u8(K) };
    return r.pushManager.getSubscription().then(function (s) {
      var k = s && s.options && s.options.applicationServerKey;
      if (s && k && b64(k) !== K) return s.unsubscribe().then(function () { return r.pushManager.subscribe(opts); });
      return s || r.pushManager.subscribe(opts);
    });
  }
  var mark = tid + ':' + new Date().toISOString().slice(0, 10);
  function sync() {
    if (store('aw-np-sync') === mark) return;
    reg().then(fresh).then(function (s) { return post('/panel/push/sub', Object.assign(keys(s), { quiet: '1' })); })
      .then(function (j) { if (j && j.ok) store('aw-np-sync', mark); }).catch(function () {});
  }

  function state(s) { dl.setAttribute('data-state', s); }
  function open(s) {
    state(s); root.classList.add('np-on');
    try { if (dl.showModal) dl.showModal(); else dl.setAttribute('open', ''); } catch (e) { dl.setAttribute('open', ''); }
  }
  function close() {
    if (dl.open) { try { dl.close(); } catch (e) { dl.removeAttribute('open'); } }
    if (!root.classList.contains('np-on')) return;
    root.classList.remove('np-on');
    d.dispatchEvent(new Event('aw:np-done'));
  }
  function later() { store('aw-np', String(Date.now())); close(); }
  function enable(btn) {
    if (btn) btn.disabled = true;
    var asked;
    try { asked = Notification.requestPermission(); } catch (e) { asked = null; }   // in the tap itself (iPhone)
    if (!asked || !asked.then) asked = new Promise(function (ok) { Notification.requestPermission(ok); });   // an older callback-only browser
    state('wait');
    asked.then(function (p) {
      if (p !== 'granted') { var e = new Error(p); e.p = p; throw e; }
      return reg().then(fresh);
    }).then(function (s) { return post('/panel/push/sub', keys(s)); }).then(function (j) {
      if (btn) btn.disabled = false;
      if (j && j.ok) { store('aw-np-sync', mark); store('aw-np', null); state('on'); setTimeout(close, 2600); }
      else state('fail');
    }).catch(function (e) {
      if (btn) btn.disabled = false;
      if (e && e.p === 'denied') { store('aw-np-d', String(Date.now())); state('denied'); }
      else if (e && e.p) state('ask');   // closed the phone's question without answering: the sheet stays, they can tap again
      else state('fail');
    });
  }

  dl.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-np-on],[data-np-later],[data-np-close]') : null;
    if (!t) return;
    if (t.hasAttribute('data-np-on')) enable(t);
    else if (t.hasAttribute('data-np-later')) later();
    else close();
  });
  dl.addEventListener('cancel', function (e) { e.preventDefault(); if (dl.getAttribute('data-state') === 'ask') later(); else close(); });   // the back gesture or Escape

  var p = Notification.permission, now = Date.now();
  if (p === 'granted') { sync(); return; }
  if (p === 'denied') {
    if (now - (+store('aw-np-d') || 0) < 7 * DAY) return;
    store('aw-np-d', String(now)); open('denied'); return;
  }
  if (now - (+store('aw-np') || 0) < DAY) return;
  open('ask');
})();
