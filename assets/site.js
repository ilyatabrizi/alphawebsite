/* Buying on a client site (Ilya, 2026-10-14): every product's button opens the shop's own WhatsApp or Telegram chat
   with a ready message naming the product, its choices, price and link; the customer only presses "send".
   Also: the product sheet (photo, description, choices, stock, share), search, the table bar that calls the waiter
   from a QR card, and a privacy-light tap log so the owner's panel shows which products people asked about.
   On sample sites the button shows the message it would send instead of messaging a real number. */
(function () {
  var S = window.SITE || {}, B = S.buy || {};
  var $ = function (id) { return document.getElementById(id); };
  var fa = function (n) { return Number(n).toLocaleString('fa-IR'); };
  var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  var table = '';

  /* Opened from a table's QR card (?t=12): kept for the visit. */
  try { table = (new URLSearchParams(location.search).get('t') || '').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/\D/g, '').slice(0, 4); } catch (e) {}
  if (table === '0') table = '';
  try { if (table) sessionStorage.setItem('aw-table-' + S.slug, table); else table = sessionStorage.getItem('aw-table-' + S.slug) || ''; } catch (e) {}
  var tableFa = table ? Number(table).toLocaleString('fa-IR', { useGrouping: false }) : '';

  function siteUrl(id) {
    var u = location.origin + location.pathname.replace(/\/+$/, '');
    return u + (id ? '#p' + id : '');
  }
  /* The message: what, which choices, the price, where (table), and the link to the product on the site. */
  function message(it, choice) {
    var opt = choice && Object.keys(choice).length ? ' (' + Object.keys(choice).map(function (g) { return choice[g]; }).join('، ') + ')' : '';
    var price = it && it.p > 0 ? fa(it.p) + ' تومان' : '';
    var lines = [];
    if (!it) lines.push('سلام، از سایت ' + S.name + ' پیام می‌دهم.');
    else if (S.fam === 'catalog') { lines.push((S.askMsg || 'سلام، درباره «%s» سؤال دارم.').replace('%s', it.n + opt)); if (price) lines.push('قیمت در سایت: ' + price); }
    else {
      lines.push(S.fam === 'food' ? 'سلام، از منوی ' + S.name + ' سفارش دارم:' : 'سلام، این را از سایت ' + S.name + ' می‌خواهم:');
      lines.push('• ' + it.n + opt + (price ? '، ' + price : ''));
      if (table) lines.push('میز ' + tableFa);
    }
    lines.push(siteUrl(it && it.id));
    return lines.join('\n');
  }
  function link(text) {
    var t = encodeURIComponent(text);
    if (B.ch === 'whatsapp') return 'https://wa.me/' + B.to + '?text=' + t;
    if (B.ch === 'telegram') return 'https://t.me/' + B.to + '?text=' + t;
    if (B.ch === 'call') return 'tel:' + B.to;
    return '';
  }
  function logTap(it) {
    var body = JSON.stringify({ slug: S.slug, id: it ? it.id : 0, item: it ? it.n : '', ch: B.ch, vid: (window.AWP && window.AWP.vid) ? window.AWP.vid() : '' });
    try { if (!navigator.sendBeacon('/api/tap', new Blob([body], { type: 'application/json' }))) throw 0; }
    catch (e) { try { fetch('/api/tap', { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }); } catch (x) {} }
  }

  /* ---------- the demo sheet (sample sites only) ---------- */
  var demo = null;
  function showDemo(text) {
    if (!demo) {
      demo = document.createElement('dialog'); demo.className = 'demo-sheet'; demo.setAttribute('aria-labelledby', 'demoH');
      demo.innerHTML = '<div class="demo-in"><h2 id="demoH"></h2><p id="demoP"></p><div class="demo-bubble" id="demoB"></div>'
        + '<div class="demo-acts"><a id="demoGo" target="_top">همین را برای کسب‌وکارم می‌خواهم</a><button type="button" id="demoX">بستن</button></div></div>';
      document.body.appendChild(demo);
      $('demoX').addEventListener('click', function () { demo.close(); });
      demo.addEventListener('click', function (e) { if (e.target === demo) demo.close(); });
    }
    var via = B.label || 'واتساپ';
    $('demoH').textContent = 'این دکمه، گفتگوی ' + via + ' فروشنده را باز می‌کند';
    $('demoP').textContent = 'در سایت واقعی، مشتری با یک لمس به ' + via + ' شما می‌رود و این پیام آماده است؛ فقط «ارسال» را می‌زند:';
    $('demoB').textContent = text; $('demoB').className = 'demo-bubble' + (B.ch === 'telegram' ? ' tg' : '');
    $('demoGo').href = '/start?layout=' + encodeURIComponent(S.layout || '');
    if (demo.showModal) demo.showModal(); else demo.setAttribute('open', '');
  }

  function go(it, choice) {
    var text = message(it, choice);
    if (S.demo) { showDemo(text); return; }
    logTap(it);
    if (B.ch === 'chat' && window.AlphaUI) {
      window.AlphaUI.openChat();
      setTimeout(function () { var t = $('chText'), f = $('chatForm'); if (t) t.value = text; var el = f && !f.hidden ? t : $('chName'); if (el) el.focus(); }, 160);
      return;
    }
    var url = link(text); if (!url) return;
    if (mobile || B.ch === 'call') location.href = url; else window.open(url, '_blank', 'noopener');
  }

  /* ---------- product sheet ---------- */
  var ps = $('psheet'), cur = null;
  function item(card) {
    var d = card.dataset, o = [];
    try { o = d.opts ? JSON.parse(d.opts) : []; } catch (e) { o = []; }
    return { id: +d.id, n: d.name, p: +d.price || 0, img: d.img || '', desc: d.desc || '', opts: o, stock: d.stock === undefined ? null : +d.stock, off: !!d.off };
  }
  function openSheet(card) {
    if (!ps) return;
    var it = cur = item(card);
    $('psImg').innerHTML = '';
    if (it.img) { var im = document.createElement('img'); im.src = it.img; im.alt = it.n; $('psImg').appendChild(im); }
    $('psName').textContent = it.n;
    var pr = card.querySelector('.price'); $('psPrice').innerHTML = pr ? pr.innerHTML : '';
    $('psDesc').textContent = it.desc;
    $('psErr').hidden = true;
    var low = $('psLow'); low.hidden = !(it.stock !== null && it.stock > 0 && it.stock <= 3); if (!low.hidden) low.textContent = 'فقط ' + fa(it.stock) + ' عدد مانده';
    var box = $('psOpts'); box.innerHTML = '';
    it.opts.forEach(function (g, gi) {
      var fs = document.createElement('fieldset'); fs.dataset.g = g.n;
      var lg = document.createElement('legend'); lg.textContent = g.n; fs.appendChild(lg);
      var row = document.createElement('div'); row.className = 'opt-row';
      g.v.forEach(function (v) {
        var l = document.createElement('label'), i = document.createElement('input'), sp = document.createElement('span');
        i.type = 'radio'; i.name = 'og' + gi; i.value = v; if (g.v.length === 1) i.checked = true;
        sp.textContent = v; l.appendChild(i); l.appendChild(sp); row.appendChild(l);
      });
      fs.appendChild(row); box.appendChild(fs);
    });
    $('psBuy').disabled = it.off;
    $('psBuy').hidden = it.off || !B.ch;
    if (ps.showModal) ps.showModal(); else ps.setAttribute('open', '');
    try { history.replaceState(null, '', '#p' + it.id); } catch (e) {}
  }
  function chosen() {
    var choice = {}, missing = '';
    ($('psOpts').querySelectorAll('fieldset') || []).forEach(function (fs) {
      var c = fs.querySelector('input:checked'); if (c) choice[fs.dataset.g] = c.value; else if (!missing) missing = fs.dataset.g;
    });
    return { choice: choice, missing: missing };
  }
  if (ps) {
    $('psBuy').addEventListener('click', function () {
      if (!cur || cur.off) return;
      var c = chosen();
      if (c.missing) { $('psErr').hidden = false; $('psErr').textContent = c.missing + ' را انتخاب کنید.'; return; }
      go(cur, c.choice);
    });
    $('psShare').addEventListener('click', function () {
      if (!cur) return;
      var data = { title: cur.n + ' | ' + S.name, text: cur.n, url: siteUrl(cur.id) };
      if (navigator.share) navigator.share(data).catch(function () {});
      else { try { navigator.clipboard.writeText(data.url); $('psShare').lastChild.textContent = 'پیوند کپی شد'; setTimeout(function () { $('psShare').lastChild.textContent = 'اشتراک‌گذاری'; }, 1600); } catch (e) {} }
    });
    ps.addEventListener('click', function (e) { if (e.target === ps) ps.close(); });
    ps.addEventListener('close', function () { try { if (/^#p\d+$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) {} });
  }
  document.querySelectorAll('.card').forEach(function (card) {
    var open = card.querySelector('.card-open'), buy = card.querySelector('[data-buy]');
    if (open) open.addEventListener('click', function () { openSheet(card); });
    if (buy) buy.addEventListener('click', function () {
      var it = item(card);
      if (it.opts.length) { openSheet(card); return; }
      buy.classList.add('pop'); setTimeout(function () { buy.classList.remove('pop'); }, 200);
      go(it, null);
    });
  });
  document.querySelectorAll('[data-buy-general]').forEach(function (b) { b.addEventListener('click', function () { go(null, null); }); });

  /* a shared product link (#p12) opens its sheet */
  var m = /^#p(\d+)$/.exec(location.hash);
  if (m) { var c0 = document.getElementById('p' + m[1]); if (c0 && c0.classList.contains('card')) setTimeout(function () { openSheet(c0); }, 400); }

  /* ---------- search ---------- */
  var q = $('q');
  if (q) q.addEventListener('input', function () {
    var v = q.value.trim(), any = false;
    document.querySelectorAll('#products .card').forEach(function (el) {
      var hit = v === '' || (el.dataset.name || '').indexOf(v) > -1 || (el.dataset.desc || '').indexOf(v) > -1;
      el.hidden = !hit; if (hit) any = true;
    });
    document.querySelectorAll('#products .g-cat').forEach(function (sec) { sec.hidden = !sec.querySelector('.card:not([hidden])'); });
    if ($('qNone')) $('qNone').hidden = any;
  });

  /* ---------- the table bar: call the waiter, ask for the bill ---------- */
  var bar = $('tableBar');
  if (bar && table && S.calls) {
    bar.hidden = false; $('tbNo').textContent = tableFa; document.body.classList.add('has-table');
    var msg = $('tbMsg'), timer = 0;
    var say = function (t) { msg.textContent = t; clearTimeout(timer); timer = setTimeout(function () { msg.textContent = ''; }, 5000); };
    bar.querySelectorAll('[data-call]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        b.disabled = true;
        var kind = b.getAttribute('data-call');
        fetch('/api/call', { method: 'POST', body: new URLSearchParams({ slug: S.slug, table: table, kind: kind }) })
          .then(function (r) {
            if (r.status === 204) { say(kind === 'bill' ? 'صورت‌حساب را می‌آورند.' : 'به گارسون خبر دادیم؛ الان می‌آیند.'); setTimeout(function () { b.disabled = false; }, 45000); }
            else if (r.status === 429) { say('خبرش رسیده؛ چند لحظه دیگر دوباره بزنید.'); setTimeout(function () { b.disabled = false; }, 15000); }
            else { say('الان نشد؛ دوباره امتحان کنید.'); b.disabled = false; }
          })
          .catch(function () { say('اینترنت قطع است؛ دوباره امتحان کنید.'); b.disabled = false; });
      });
    });
  }
  window.AlphaBuy = { message: message, link: link, go: go };
})();
