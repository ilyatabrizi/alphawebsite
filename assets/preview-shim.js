/* Preview only. There is no PHP server behind this preview, so the few server calls the pages make
   (buy taps, visitor statistics, site chat, panel inbox) are answered here in the browser. Forms that would save to the
   server show a short note instead. */
(function () {
  window.AW_STATIC = true;   // store.js: demos are demo-<id>.html files here, not /s/demo-<id>
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
    if (/\/api\/domain/.test(u)) { var l = ''; try { l = new URL(u, location.href).searchParams.get('l') || ''; } catch (e) {}
      return json({ status: /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(l) ? (l.length < 5 ? 'taken' : 'free') : 'invalid' }); }
    if (/\/api\/contact/.test(u)) return json({ ok: true, demo: true });   // the personal site's contact form (v13)
    if (/\/api\/order-pay/.test(u)) { var bp = body(opt); return json({ ok: true, status: 'claimed', ref: (bp.get('ref') || '').replace(/\D/g, '') }); }   // v17 «واریز کردم»
    if (/\/api\/order/.test(u)) {
      /* the bag: answer like the server, from the page's own cards (prices as shown), number 101 and up */
      var bo = body(opt), items = []; try { items = JSON.parse(bo.get('items') || '[]'); } catch (e) {}
      var lines = [], sum = 0;
      items.forEach(function (r) {
        var c = document.querySelector('.card[data-id="' + (+r.id) + '"]'); if (!c) return;
        var o = r.o && typeof r.o === 'object' ? Object.keys(r.o).map(function (k) { return r.o[k]; }) : [];
        var p = +c.dataset.price || 0, q = Math.max(1, Math.min(99, +r.q || 1));
        lines.push({ n: c.dataset.name + (o.length ? ' (' + o.join('، ') + ')' : ''), q: q, p: p }); sum += p * q;
      });
      var mode = bo.get('mode') || '', fee = mode === 'delivery' && window.SITE && window.SITE.del ? +window.SITE.del.fee || 0 : 0;
      var no = 0; try { no = (+sessionStorage.getItem('aw-pv-no') || 100) + 1; sessionStorage.setItem('aw-pv-no', no); } catch (e) { no = 101; }
      var bk = window.SITE && window.SITE.book, when = '';
      if (bk && bo.get('when_date')) { try { var dt = new Date(bo.get('when_date') + 'T12:00:00Z'), sl = bk.slots.filter(function (s) { return s.s === bo.get('when_slot'); })[0];
        when = bk.label + ': ' + new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(dt) + '، ساعت ' + (sl ? sl.l : ''); } catch (e) {} }
      var out = { ok: true, no: (window.SITE && window.SITE.demo) ? 0 : no, lines: lines, sum: sum, fee: fee, total: sum + fee, mode: mode, table: bo.get('table') || '', channel: bo.get('channel') || '', when: when, gold: '', repriced: false };
      /* v17: a demo shows the card-to-card box without a card (the preview has no real shop card) */
      if (bo.get('pay') === 'card' && sum + fee > 0 && sum + fee <= ((window.SITE && window.SITE.payMax) || 5e8) && window.SITE && window.SITE.demo) out.pay = { demo: true, amount: sum + fee };
      return json(out);
    }
    if (/\/api\/gold/.test(u)) {
      /* the gold layout's 2-minute refresh: the price the preview was built with, and the cards' own prices */
      var g = (window.SITE && window.SITE.gold) || {}, its = {};
      Array.prototype.forEach.call(document.querySelectorAll('.card[data-gk]'), function (c) { its[c.dataset.id] = +c.dataset.price || 0; });
      return json({ p18: g.p18 || 0, coins: g.coins || {}, at: g.at || '', src: g.src || '', vat: g.vat || 0, making: g.making || 0, profit: g.profit || 0, ok: !!g.ok, when: 'نمونه', items: its });
    }
    if (/\/api\/call/.test(u)) return Promise.resolve(new Response(null, { status: 204 }));
    if (/\/api\/(v|tap)(\?|$)/.test(u)) return Promise.resolve(new Response(null, { status: 204 }));
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
    if (!f || f.method === 'dialog' || f.id === 'reply' || f.id === 'chatForm' || f.id === 'cvForm') return;
    e.preventDefault(); e.stopImmediatePropagation();
    toast('پیش‌نمایش است؛ روی سرور واقعی همین دکمه ذخیره و اعمال می‌شود.');
  }, true);
})();
