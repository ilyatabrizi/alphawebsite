/* Preview only. There is no PHP server behind this preview, so the few server calls the pages make
   (orders, site chat, panel inbox) are answered here in the browser. Forms that would save to the
   server show a short note instead. */
(function () {
  try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('alpha-chat-') === 0) localStorage.removeItem(k); }); } catch (e) {}
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  var msgs = [], seq = 0, replies = 0;
  function stamp() {
    var p = {};
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
      return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second;
    } catch (e) { return new Date().toISOString().replace('T', ' ').slice(0, 19); }
  }
  function json(o, code) { return Promise.resolve(new Response(JSON.stringify(o), { status: code || 200, headers: { 'Content-Type': 'application/json' } })); }
  function body(opt) { try { return new URLSearchParams(opt && opt.body); } catch (e) { return new URLSearchParams(); } }
  function faInt(s) { return parseInt(String(s || '0').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }), 10) || 0; }

  window.fetch = function (url, opt) {
    var u = String(url && url.url ? url.url : url);
    if (/\/api\/chat\/start/.test(u)) {
      var b = body(opt);
      msgs.push({ id: ++seq, s: 'o', b: 'سلام ' + (b.get('name') || '') + '! پیامتان مستقیم به ' + ((window.SITE && window.SITE.name) || 'فروشگاه') + ' می‌رسد. سفارش یا سؤالتان را بنویسید.', k: 'system', t: stamp() });
      return json({ token: 'p' + Date.now().toString(16).padStart(32, '0').slice(-32) });
    }
    if (/\/api\/chat\/send/.test(u)) {
      var b2 = body(opt), kind = b2.get('kind') === 'order' ? 'order' : 'text';
      var m = { id: ++seq, s: 'c', b: b2.get('body') || '', k: kind, t: stamp() };
      msgs.push(m);
      if (replies < 3) {
        replies++;
        setTimeout(function () {
          msgs.push({ id: ++seq, s: 'o', k: 'text', t: stamp(), b: kind === 'order'
            ? 'سفارشتان رسید ✅ در سایت واقعی، این سفارش همین لحظه در پنل فروشنده و در بله‌اش ظاهر می‌شود.'
            : 'این یک گفتگوی نمونه است. در سایت واقعی، پیام مشتری همین لحظه در پنل فروشنده می‌نشیند و از همان‌جا جواب می‌دهد؛ حتی وقتی اینترنت بین‌الملل قطع است.' });
        }, 1400);
      }
      return json({ message: m });
    }
    if (/\/api\/chat\/poll/.test(u)) {
      var after = 0; try { after = +new URL(u, location.href).searchParams.get('after') || 0; } catch (e) {}
      return json({ messages: msgs.filter(function (x) { return x.id > after; }), unread: 0, online: true });
    }
    if (/\/api\/order/.test(u)) return Promise.resolve(new Response(null, { status: 204 }));
    if (/\/panel\/unread/.test(u)) { var nb = document.getElementById('navChat'); return json({ n: nb && !nb.hidden ? faInt(nb.textContent) : 0 }); }
    if (/\/panel\/chat\/\d+\/poll/.test(u)) return json({ messages: [] });
    if (/\/panel\/chat\/\d+\/send/.test(u)) { var b3 = body(opt); return json({ message: { id: 100000 + (++seq), s: 'o', b: b3.get('body') || '', k: 'text', t: stamp() } }); }
    return realFetch ? realFetch(url, opt) : Promise.reject(new Error('offline preview'));
  };
  try { navigator.sendBeacon = function () { return true; }; } catch (e) {}

  /* forms that would save on the server */
  function toast(text) {
    var t = document.getElementById('previewToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'previewToast';
      t.style.cssText = 'position:fixed;z-index:9999;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:min(92vw,420px);background:#111;color:#F4F4F0;font:500 14px/1.6 Vazirmatn,Tahoma,sans-serif;padding:10px 16px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.3);text-align:center;direction:rtl';
      document.body.appendChild(t);
    }
    t.textContent = text; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(function () { t.hidden = true; }, 2600);
  }
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f || f.method === 'dialog' || f.id === 'reply' || f.id === 'chatForm') return;
    e.preventDefault(); e.stopImmediatePropagation();
    toast('پیش‌نمایش است؛ روی سرور واقعی همین دکمه ذخیره و اعمال می‌شود.');
  }, true);
})();
