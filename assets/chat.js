/* In-site chat (customer side). Talks only to our own server, so it keeps working on Iran's domestic network
   when WhatsApp, Telegram and Instagram are cut. Short polling: 3 s while the chat is open, 15 s in the
   background for the unread badge, 30 s when the tab is hidden. */
(function () {
  var S = window.SITE || {};
  if (!S.chat) return;
  var $ = function (id) { return document.getElementById(id); };
  var fa = function (s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  var KEY = 'alpha-chat-' + S.slug;
  var token = null;
  try { token = localStorage.getItem(KEY); } catch (e) {}
  var last = 0, timer = null, busy = false, seen = {};
  var log = $('chatLog'), intro = $('chatIntro'), form = $('chatForm'), input = $('chText');
  if (!log) return;

  function api(path, data) {
    data.slug = S.slug; if (token) data.token = token;
    return fetch('/api/chat/' + path, { method: 'POST', body: new URLSearchParams(data), cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  function visible() { return !document.hidden && window.AlphaUI && window.AlphaUI.current() === 'chat'; }
  function scrollEnd() {
    if (S.glass) window.scrollTo(0, document.body.scrollHeight);
    else { var box = document.querySelector('#chatSheet .sheet-in'); if (box) box.scrollTop = box.scrollHeight; }
  }
  function add(m) {
    if (seen[m.id]) return false;
    seen[m.id] = 1; last = Math.max(last, m.id);
    var d = document.createElement('div');
    d.className = 'msg ' + (m.s === 'c' ? 'me' : 'them') + (m.k === 'order' ? ' order' : '');
    d.textContent = m.b;
    var t = document.createElement('time'); t.textContent = fa(String(m.t).substr(11, 5)); d.appendChild(t);
    log.appendChild(d);
    return true;
  }
  function badge(n) {
    if (visible()) n = 0;
    [document.querySelector('[data-badge="chat"]'), $('chatBadge')].forEach(function (b) { if (b) { b.hidden = !n; b.textContent = fa(n); } });
  }
  function setOnline(on) {
    var s = $('chatState'); if (!s) return;
    s.textContent = on ? 'آنلاین است؛ معمولاً زود جواب می‌دهد' : 'پیام بگذارید؛ به‌محض دیدن جواب می‌دهند';
    s.classList.toggle('on', !!on);
  }
  function schedule() {
    clearTimeout(timer);
    if (!token) return;
    timer = setTimeout(poll, document.hidden ? 30000 : (visible() ? 3000 : 15000));
  }
  function reset() { token = null; try { localStorage.removeItem(KEY); } catch (e) {} intro.hidden = false; form.hidden = true; log.innerHTML = ''; seen = {}; last = 0; }
  function poll() {
    if (!token) return;
    if (busy) return schedule();
    busy = true;
    var qs = new URLSearchParams({ slug: S.slug, token: token, after: last, seen: visible() ? 1 : 0 });
    fetch('/api/chat/poll?' + qs, { cache: 'no-store' })
      .then(function (r) { if (r.status === 404) { reset(); throw 0; } return r.json(); })
      .then(function (j) {
        var fresh = 0;
        j.messages.forEach(function (m) { if (add(m) && m.s === 'o') fresh++; });
        if (fresh && visible()) scrollEnd();
        setOnline(j.online); badge(j.unread);
      })
      .catch(function () {})
      .then(function () { busy = false; schedule(); });
  }
  function ready() { intro.hidden = true; form.hidden = false; }
  function start(name, phone) {
    return api('start', { name: name, phone: phone }).then(function (j) {
      token = j.token; try { localStorage.setItem(KEY, token); } catch (e) {}
      ready(); poll(); return j;
    });
  }
  function err(msg) { var e = $('chErr'); e.textContent = msg || 'الان وصل نشد؛ چند لحظه بعد دوباره بزنید.'; e.hidden = false; }

  $('chStart').addEventListener('click', function () {
    var n = $('chName').value.trim(), p = $('chPhone').value.trim();
    if (!n || !p) { err('نام و شماره موبایل را بنویسید.'); return; }
    $('chErr').hidden = true;
    start(n, p).then(function () { setTimeout(function () { input.focus(); }, 50); }).catch(function (j) { err(j && j.error); });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim(); if (!text) return;
    input.value = '';
    var pending = document.createElement('div'); pending.className = 'msg me pending'; pending.textContent = text; log.appendChild(pending); scrollEnd();
    api('send', { body: text }).then(function (j) { pending.remove(); add(j.message); scrollEnd(); clearTimeout(timer); timer = setTimeout(poll, 1500); })
      .catch(function (j) { pending.classList.remove('pending'); pending.style.opacity = .5; err(j && j.error); });
  });

  /* «ارسال در گفتگوی سایت» from the cart */
  window.AlphaChat = {
    order: function (name, phone, text) {
      var send = function () {
        return api('send', { body: text, kind: 'order' }).then(function (j) { add(j.message); window.AlphaUI.openChat(); setTimeout(scrollEnd, 80); });
      };
      (token ? send() : start(name, phone).then(send)).catch(function (j) { window.AlphaUI.openChat(); err(j && j.error); });
    }
  };

  document.addEventListener('view:change', function (e) {
    if (e.detail === 'chat') { badge(0); if (token) { clearTimeout(timer); poll(); } setTimeout(scrollEnd, 60); }
    else schedule();
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && token) { clearTimeout(timer); poll(); } });
  if ($('cName')) $('cName').addEventListener('change', function () { if (!$('chName').value) $('chName').value = $('cName').value; });
  if ($('cPhone')) $('cPhone').addEventListener('change', function () { if (!$('chPhone').value) $('chPhone').value = $('cPhone').value; });
  if (token) { ready(); poll(); }
})();
