/* Buying on a client site.
   2026-10-15 (Ilya: "add bag page for all layouts for complete ordering"): products go into a bag (kept in this
   browser), the bag page asks how to receive it, who is ordering and which of the shop's messengers to use, saves the
   order on the server (the owner's panel lists it with a number) and then opens that messenger with the whole order
   as a ready message. WhatsApp and Telegram take the message in the link; Instagram, Bale, Rubika, Eitaa and Soroush
   can't, so the message is copied first and the customer pastes it.
   Also: the product sheet (photo, description, choices, quantity, stock, a question in the messenger, share), search,
   the table bar that calls the waiter from a QR card, and a privacy-light tap log for the owner's «most wanted» list.
   Sample sites run the whole flow but save nothing and open no real chat.
   2026-10-14: gold and jewellery prices by weight at the live gram price (refreshed every 2 minutes, the same integer
   maths as gold_calc in lib/gold.php), the gold calculator, a day and time picker for the services that receive
   people (book_cfg), and a note in the bag when the shop is closed right now. */
(function () {
  var S = window.SITE || {}, B = S.buy || {}, W = S.words || { add: 'افزودن', bag: 'سبد خرید', send: 'ثبت سفارش', order: 'سفارش' };
  var CH = (S.chans && S.chans.length) ? S.chans : (B.ch && B.ch !== 'chat' && B.ch !== 'call' ? [B] : []);
  var CAT = S.fam === 'catalog', FOOD = S.fam === 'food', VIEW = !!S.view;   // VIEW: gold and cars show, they don't sell online (2026-10-31)
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var fa = function (n) { return Number(n).toLocaleString('fa-IR'); };
  var toman = function (n) { return n > 0 ? fa(n) + ' تومان' : 'رایگان'; };
  var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
  var en = function (s) { return String(s || '').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }); };
  var store = function (k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { return null; }
    return null;
  };
  var table = '';

  /* Opened from a table's QR card (?t=12): kept for the visit. */
  try { table = en(new URLSearchParams(location.search).get('t') || '').replace(/\D/g, '').slice(0, 4); } catch (e) {}
  if (table === '0') table = '';
  try { if (table) sessionStorage.setItem('aw-table-' + S.slug, table); else table = sessionStorage.getItem('aw-table-' + S.slug) || ''; } catch (e) {}
  var tableFa = table ? Number(table).toLocaleString('fa-IR', { useGrouping: false }) : '';
  var ICON_RECEIPT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17V7"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/></svg>';   // Lucide «receipt», for the invoice button

  function siteUrl(id) {
    var u = location.origin + location.pathname.replace(/\/+$/, '');
    return u + '/' + (id ? '?p=' + id : '');
  }
  function chan(ch) { for (var i = 0; i < CH.length; i++) if (CH[i].ch === ch) return CH[i]; return CH[0] || null; }
  /* The chat link for one messenger; the text rides along only where the messenger takes it. */
  function link(text, c) {
    c = c || chan(B.ch) || B;
    if (!c || !c.ch) return '';
    var t = encodeURIComponent(text || '');
    if (c.ch === 'whatsapp') return 'https://wa.me/' + c.to + (text ? '?text=' + t : '');
    if (c.ch === 'telegram') return 'https://t.me/' + c.to + (text ? '?text=' + t : '');
    if (c.ch === 'call') return 'tel:' + c.to;
    return c.url || '';
  }
  function copy(text) {
    var ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); ok = true; } } catch (e) {}
    if (!ok) {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (e) {} ta.remove();
    }
    return ok;
  }
  function logTap(id, ch) {
    if (S.demo) return;
    var body = JSON.stringify({ slug: S.slug, id: id || 0, ch: ch || '', vid: (window.AWP && window.AWP.vid) ? window.AWP.vid() : '' });
    try { if (!navigator.sendBeacon('/api/tap', new Blob([body], { type: 'application/json' }))) throw 0; }
    catch (e) { try { fetch('/api/tap', { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }); } catch (x) {} }
  }

  /* ---------- the page's own items ---------- */
  function item(card) {
    var d = card.dataset, o = [];
    try { o = d.opts ? JSON.parse(d.opts) : []; } catch (e) { o = []; }
    var g = d.gk ? { k: d.gk, w: +d.gw || 0, pur: +d.gp || 750, m: +d.gm || 0, s: +d.gs || 0, x: +d.gx || 0, c: d.gc || '' } : null;
    return { id: +d.id, n: d.name, p: +d.price || 0, img: d.img || '', desc: d.desc || '', opts: o, stock: d.stock === undefined ? null : +d.stock, off: !!d.off, g: g };
  }
  var ITEMS = {};
  all('.card[data-id]').forEach(function (c) { var it = item(c); if (!ITEMS[it.id]) ITEMS[it.id] = it; });
  var optText = function (o) { var k = o ? Object.keys(o) : []; return k.length ? ' (' + k.map(function (g) { return o[g]; }).join('، ') + ')' : ''; };

  /* ---------- gold: prices by weight at the live gram price ---------- */
  var G = S.gold || null;
  var PUR = { 750: '۱۸ عیار', 875: '۲۱ عیار', 1000: '۲۴ عیار' };
  /* round(num / den) half up, whole numbers: lib/gold.php gold_div */
  function gdiv(num, den) { return (BigInt(2) * num + den) / (BigInt(2) * den); }
  /* lib/gold.php gold_calc: weight in mg, purity in thousandths, percentages in hundredths of a percent */
  function goldCalc(w, pur, p18, mk, pf, vat, stone) {
    var B = BigInt, gold = gdiv(B(w) * B(p18) * B(pur), B(750000)), making = gdiv(gold * B(mk), B(10000));
    var profit = gdiv((gold + making) * B(pf), B(10000)), tax = gdiv((making + profit) * B(vat), B(10000));
    var o = { gold: Number(gold), making: Number(making), profit: Number(profit), vat: Number(tax), stone: stone || 0 };
    o.total = o.gold + o.making + o.profit + o.vat + o.stone; return o;
  }
  function goldPrice(it) {
    if (!G || !it.g) return it.p;
    if (it.g.k === 'coin') { var base = +((G.coins || {})[it.g.c] || 0); return base > 0 ? base + it.g.x : 0; }
    return G.ok && G.p18 > 0 && it.g.w > 0 ? goldCalc(it.g.w, it.g.pur, G.p18, it.g.m, it.g.s, G.vat, it.g.x).total : 0;
  }
  /* views_site.php price_html for a gold item */
  function goldPriceHtml(p) { return p > 0 ? '<span class="now-p">' + fa(p) + '</span> <small>تومان</small>' : '<small>قیمت روز در گفتگو</small>'; }
  var pct = function (bp) { return (bp / 100).toLocaleString('fa-IR', { maximumFractionDigits: 2 }); };
  var grams = function (mg) { return (mg / 1000).toLocaleString('fa-IR', { maximumFractionDigits: 3 }); };
  /* the same parsing as gold_parse_weight / gold_parse_pct (gold_clean: spaces and direction marks dropped anywhere) */
  var gclean = function (v) { return en(v).replace(/[\s\u00A0\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, ''); };
  function parseWeight(v) {
    var m = /^(\d{1,4})(?:\.(\d{1,3}))?$/.exec(gclean(v).replace(/[٫\/,،]/g, '.'));
    if (!m) return null; var mg = (+m[1]) * 1000 + +((m[2] || '') + '000').slice(0, 3);
    return mg > 0 && mg <= 1000000 ? mg : null;
  }
  function parsePct(v, max) {
    var m = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(gclean(v).replace(/[٫\/,]/g, '.').replace(/[٪%]/g, ''));
    if (!m) return null; var bp = (+m[1]) * 100 + +((m[2] || '') + '00').slice(0, 2);
    return bp <= max * 100 ? bp : null;
  }
  function paintGold(serverItems) {
    if (!G) return;
    all('.card[data-gk]').forEach(function (card) {
      var it = ITEMS[+card.dataset.id]; if (!it || it.off) return;
      var p = serverItems && serverItems[it.id] !== undefined ? +serverItems[it.id] : goldPrice(it);
      it.p = p; card.dataset.price = p;
      var el = card.querySelector('.price'); if (el) el.innerHTML = goldPriceHtml(p);
    });
    var live = G.ok && G.p18 > 0;
    all('.gold-p').forEach(function (el) { el.innerHTML = live ? '<b data-gold-p18>' + fa(G.p18) + '</b> <small>تومان</small>' : '<b data-gold-p18>در گفتگو بپرسید</b>'; });
    all('[data-gold-src]').forEach(function (el) { el.textContent = !live ? 'نرخ روز الان در دسترس نیست؛ قیمت را در گفتگو بپرسید.' : (G.src === 'shop' ? 'نرخ امروز فروشگاه' : 'نرخ لحظه‌ای بازار؛ هر چند دقیقه خودکار به‌روز می‌شود'); });
    /* a coin the latest answer lacks is not shown at an old price */
    all('[data-coin]').forEach(function (el) { var v = live ? +((G.coins || {})[el.getAttribute('data-coin')] || 0) : 0; el.innerHTML = v > 0 ? fa(v) + ' <small>تومان</small>' : '<small>در گفتگو</small>'; });
    calc();
  }
  function pollGold() {
    if (!G || document.hidden) return;
    fetch('/api/gold?slug=' + encodeURIComponent(S.slug), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || typeof j.p18 !== 'number') return;
      G.p18 = j.p18; G.coins = j.coins || {}; G.ok = !!j.ok; G.vat = j.vat; G.src = j.src; G.at = j.at;
      all('[data-gold-when]').forEach(function (el) {
        el.textContent = j.ok ? 'به‌روز: ' + j.when : 'در دسترس نیست';
        var chip = el.closest('.gold-chip'); if (chip) { chip.classList.toggle('is-open', !!j.ok); chip.classList.toggle('is-closed', !j.ok); }
      });
      paintGold(j.items || null);
      if (bagEl && bagEl.open) renderBag();
    }).catch(function () {});
  }
  /* the calculator */
  var gc = $('goldCalc');
  function calc() {
    if (!gc || !G) return;
    var out = $('gcOut'), w = parseWeight($('gcW').value), mk = parsePct($('gcM').value, 100), pf = parsePct($('gcS').value, 50), rows = [];
    $('gcW').toggleAttribute('aria-invalid', $('gcW').value.trim() !== '' && w === null);
    $('gcM').toggleAttribute('aria-invalid', mk === null); $('gcS').toggleAttribute('aria-invalid', pf === null);
    if (!G.ok || !(G.p18 > 0)) rows = [['نرخ روز طلا الان در دسترس نیست؛ در گفتگو بپرسید.', '', 'gc-empty']];
    else if (w === null) rows = [[$('gcW').value.trim() === '' ? 'وزن را بنویسید تا قیمت حساب شود.' : 'وزن را به گرم بنویسید؛ مثل ۳٫۲۵ (تا ۱۰۰۰ گرم).', '', 'gc-empty']];
    else if (mk === null || pf === null) rows = [[mk === null ? 'اجرت ساخت را بین ۰ تا ۱۰۰ درصد بنویسید.' : 'سود فروشنده را بین ۰ تا ۵۰ درصد بنویسید.', '', 'gc-empty']];
    else {
      var pur = +$('gcP').value || 750, b = goldCalc(w, pur, G.p18, mk, pf, G.vat, 0);
      rows = [['ارزش طلا (' + grams(w) + ' گرم ' + PUR[pur] + ')', fa(b.gold)], ['اجرت ساخت ' + pct(mk) + '٪', fa(b.making)], ['سود فروشنده ' + pct(pf) + '٪', fa(b.profit)],
              ['مالیات ' + pct(G.vat) + '٪ روی اجرت و سود', fa(b.vat)], ['قیمت نهایی', fa(b.total) + ' تومان', 'tot']];
    }
    out.innerHTML = '';
    rows.forEach(function (r) { var d = document.createElement('div'); if (r[2]) d.className = r[2]; d.innerHTML = '<dt></dt><dd></dd>'; d.firstChild.textContent = r[0]; d.lastChild.textContent = r[1]; out.appendChild(d); });
  }
  if (gc) { gc.addEventListener('input', calc); gc.addEventListener('change', calc); gc.addEventListener('submit', function (e) { e.preventDefault(); }); }
  /* the product sheet's breakdown */
  function goldSheet(it) {
    var dl = $('psGold'); if (!dl) return;
    dl.innerHTML = ''; dl.hidden = true;
    if (!G || !it.g || it.p <= 0) return;
    var rows;
    if (it.g.k === 'coin') {
      var base = +((G.coins || {})[it.g.c] || 0); if (base + it.g.x !== it.p) return;
      rows = [['نرخ روز', fa(base)]]; if (it.g.x > 0) rows.push(['حق فروشنده', fa(it.g.x)]);
    } else {
      var b = goldCalc(it.g.w, it.g.pur, G.p18, it.g.m, it.g.s, G.vat, it.g.x);
      if (b.total !== it.p) return;   // the owner changed this piece while the page was open: the price alone, never rows that don't add up
      rows = [['وزن و عیار', grams(it.g.w) + ' گرم، ' + PUR[it.g.pur]], ['نرخ هر گرم ۱۸ عیار', fa(G.p18)], ['ارزش طلا', fa(b.gold)], ['اجرت ساخت ' + pct(it.g.m) + '٪', fa(b.making)],
              ['سود فروشنده ' + pct(it.g.s) + '٪', fa(b.profit)], ['مالیات ' + pct(G.vat) + '٪ (روی اجرت و سود)', fa(b.vat)]];
      if (b.stone > 0) rows.push(['سنگ', fa(b.stone)]);
    }
    rows.push(['قیمت نهایی', fa(it.p) + ' تومان', 'tot']);
    rows.forEach(function (r) { var d = document.createElement('div'); if (r[2]) d.className = r[2]; d.innerHTML = '<dt></dt><dd></dd>'; d.firstChild.textContent = r[0]; d.lastChild.textContent = r[1]; dl.appendChild(d); });
    dl.hidden = false;
  }

  /* A question about one product (or the shop) straight in the main messenger: the old one-tap message. */
  function askMessage(it, choice) {
    var lines = [];
    if (!it) lines.push('سلام، از سایت ' + S.name + ' پیام می‌دهم.');
    else if (CAT) lines.push((S.askMsg || 'سلام، درباره «%s» سؤال دارم.').replace('%s', it.n + optText(choice)));
    else lines.push('سلام، درباره «' + it.n + optText(choice) + '» از سایت ' + S.name + ' سؤال دارم.');
    if (it && it.p > 0) lines.push('قیمت در سایت: ' + fa(it.p) + ' تومان');
    if (table) lines.push('میز ' + tableFa);
    lines.push(siteUrl(it && it.id));
    return lines.join('\n');
  }

  /* ---------- the sample-site sheet ---------- */
  var demo = null;
  function showDemo(text, c) {
    if (!demo) {
      demo = document.createElement('dialog'); demo.className = 'demo-sheet'; demo.setAttribute('aria-labelledby', 'demoH');
      demo.innerHTML = '<div class="demo-in"><h2 id="demoH"></h2><p id="demoP"></p><div class="demo-bubble" id="demoB"></div>'
        + '<div class="demo-acts"><a id="demoGo" target="_top">همین را برای کسب‌وکارم می‌خواهم</a><button type="button" id="demoX">بستن</button></div></div>';
      document.body.appendChild(demo);
      $('demoX').addEventListener('click', function () { demo.close(); });
      demo.addEventListener('click', function (e) { if (e.target === demo) demo.close(); });
    }
    c = c || chan(B.ch) || B;
    var via = (c && c.label) || 'واتساپ';
    $('demoH').textContent = 'این دکمه، گفتگوی ' + via + ' فروشنده را باز می‌کند';
    $('demoP').textContent = text ? 'در سایت واقعی، مشتری با یک لمس به ' + via + ' شما می‌رود و این پیام آماده است:' : 'در سایت واقعی، این‌جا گفتگوی ' + via + ' شما باز می‌شود.';
    $('demoB').textContent = text || ''; $('demoB').hidden = !text; $('demoB').className = 'demo-bubble' + (c && c.ch === 'telegram' ? ' tg' : '');
    $('demoGo').href = '/start?layout=' + encodeURIComponent(S.layout || '');
    if (demo.showModal) demo.showModal(); else demo.setAttribute('open', '');
  }
  function open(url) { if (!url) return; if (mobile || /^tel:/.test(url)) location.href = url; else window.open(url, '_blank', 'noopener'); }
  function ask(it, choice) {
    var text = askMessage(it, choice), c = chan(B.ch) || B;
    if (S.demo) { showDemo(text, c); return; }
    logTap(it && it.id, c && c.ch);
    if (B.ch === 'chat' && window.AlphaUI) {
      window.AlphaUI.openChat();
      setTimeout(function () { var t = $('chText'), f = $('chatForm'); if (t) t.value = text; var el = f && !f.hidden ? t : $('chName'); if (el) el.focus(); }, 160);
      return;
    }
    if (c && c.ch && !c.pre && c.ch !== 'call') copy(text);
    open(link(text, c));
  }
  /* «پرسیدن»: the site chat with the item's question ready (it works on Iran's domestic network too); without the chat,
     the shop's main messenger as above (2026-10-31, gold and cars) */
  function askChat(it, choice) {
    if (!window.AlphaUI || !$('chatSheet')) { ask(it, choice); return; }
    var text = askMessage(it, choice).replace(/\s*\n+\s*/g, ' ');   // the chat box is one line: «…سؤال دارم. قیمت در سایت: …», never «دارم.قیمت»
    if (!S.demo) logTap(it && it.id, 'chat');
    var ps = $('psheet'); if (ps && ps.open) ps.close();
    window.AlphaUI.openChat();
    setTimeout(function () { var t = $('chText'), f = $('chatForm'); if (t) t.value = text; var el = f && !f.hidden ? t : $('chName'); if (el) el.focus(); }, 160);
  }

  /* ---------- the bag (kept per site in this browser) ---------- */
  var KEY = 'aw-bag-' + S.slug;
  var bag = [];
  function lineKey(l) { return l.id + '|' + JSON.stringify(l.o || {}); }
  function loadBag() {
    var raw = store(KEY); bag = [];
    (Array.isArray(raw) ? raw : []).forEach(function (l) {
      var it = l && ITEMS[l.id]; if (!it || it.off) return;
      var q = Math.max(1, Math.min(99, +l.q || 1)); if (it.stock !== null) q = Math.min(q, Math.max(0, it.stock)); if (!q) return;
      bag.push({ id: it.id, o: l.o && typeof l.o === 'object' ? l.o : null, q: q });
    });
  }
  function saveBag() { store(KEY, bag.length ? bag : null); }
  function count() { return bag.reduce(function (a, l) { return a + l.q; }, 0); }
  function subtotal() { return bag.reduce(function (a, l) { return a + l.q * (ITEMS[l.id] ? ITEMS[l.id].p : 0); }, 0); }
  function qtyOf(id) { return bag.reduce(function (a, l) { return a + (l.id === id ? l.q : 0); }, 0); }
  function room(it, extra) { return it.stock === null ? 99 : Math.max(0, it.stock - extra); }

  var toastT = 0;
  function toast(text) {
    var el = $('bagToast'); if (!el) return;
    var bl = document.querySelector('.bag-last'); if (bl) bl.remove();   // one note at a time in that place
    $('bagToastT').textContent = text; el.hidden = false; el.classList.remove('out');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.hidden = true; }, 260); }, 5600);
  }
  function add(it, choice, q) {
    q = q || 1;
    if (it.g && it.p <= 0) { toast('قیمت روز «' + it.n + '» الان در دسترس نیست؛ قیمتش را در گفتگو بپرسید.'); return false; }
    var k = lineKey({ id: it.id, o: choice }), have = qtyOf(it.id), can = room(it, have);
    if (can <= 0) { toast('از «' + it.n + '» بیشتر از این موجود نیست.'); return false; }
    q = Math.min(q, can);
    var found = null; bag.forEach(function (l) { if (lineKey(l) === k) found = l; });
    if (found) found.q = Math.min(99, found.q + q); else bag.push({ id: it.id, o: choice && Object.keys(choice).length ? choice : null, q: q });
    saveBag(); refresh(); logTap(it.id, 'bag');
    toast(CAT ? '«' + it.n + '» به لیست اضافه شد.' : (q > 1 ? fa(q) + ' عدد ' : '') + '«' + it.n + optText(choice) + '» به ' + W.bag + ' اضافه شد.');
    return true;
  }
  function setQ(i, q) {
    var l = bag[i]; if (!l) return;
    var it = ITEMS[l.id], others = qtyOf(l.id) - l.q;
    q = Math.max(0, Math.min(99, q, room(it, others)));
    if (!q) bag.splice(i, 1); else l.q = q;
    saveBag(); refresh(); if (bagEl && bagEl.open) renderBag();
  }

  /* badges, card steppers, the header count */
  function refresh() {
    var n = count();
    all('[data-bag-n]').forEach(function (b) { b.textContent = fa(n); b.hidden = !n; });
    all('.hdr-bag').forEach(function (b) { b.classList.toggle('has', n > 0); b.setAttribute('aria-label', W.bag + (n ? '، ' + fa(n) + ' مورد' : '')); });
    all('.card[data-id]').forEach(function (card) {
      var it = ITEMS[+card.dataset.id]; if (!it || it.off) return;
      var buy = card.querySelector('[data-buy]'), q = qtyOf(it.id); if (!buy) return;
      if (CAT || it.opts.length) {
        buy.classList.toggle('in', q > 0);
        if (q > 0) buy.setAttribute('data-in', fa(q)); else buy.removeAttribute('data-in');
        if (CAT) { var sp = buy.querySelector('span'); if (sp) sp.textContent = q > 0 ? 'در لیست' : W.add; }
        return;
      }
      var st = card.querySelector('.qty.cq');
      if (q > 0 && !st) {
        st = document.createElement('div'); st.className = 'qty cq'; st.setAttribute('role', 'group'); st.setAttribute('aria-label', 'تعداد ' + it.n);
        st.innerHTML = '<button type="button" data-cq="1" aria-label="یکی بیشتر">+</button><output></output><button type="button" data-cq="-1" aria-label="یکی کمتر">−</button>';
        buy.parentNode.insertBefore(st, buy);
        st.addEventListener('click', function (e) {
          var b = e.target.closest('[data-cq]'); if (!b) return;
          var idx = -1; bag.forEach(function (l, i) { if (l.id === it.id && !l.o) idx = i; });
          if (+b.dataset.cq > 0) { if (idx < 0) add(it, null, 1); else if (room(it, qtyOf(it.id) - bag[idx].q) > bag[idx].q) setQ(idx, bag[idx].q + 1); else toast('از «' + it.n + '» بیشتر از این موجود نیست.'); }
          else if (idx >= 0) setQ(idx, bag[idx].q - 1);
        });
      }
      if (st) { st.hidden = !q; st.querySelector('output').textContent = fa(q); }
      buy.hidden = q > 0;
    });
  }

  /* ---------- the bag page ---------- */
  var bagEl = $('bag'), form = $('bagForm'), mode = '', sending = false, pushed = false;
  var me = store('aw-me') || {};
  function modes() {
    if (CAT || !S.del) return [];
    var m = [];
    /* dine-in (2026-10-26): the owner's choice, S.dine = table (the number is typed, or filled from the table's QR) |
       plain (no numbers: the customer's name) | off */
    if (FOOD && S.dine !== 'off') m.push(['table', table ? 'سر میز ' + tableFa : 'سر میز', S.dine === 'plain' && !table ? 'سفارش که آماده شد، با نامتان صدایتان می‌زنند.' : 'سفارش سر میز شما می‌آید.']);
    m.push(['pickup', FOOD ? 'بیرون‌بر، تحویل حضوری' : 'تحویل حضوری', 'سفارش آماده می‌شود و خودتان تحویل می‌گیرید.']);
    if (S.del.on) m.push(['delivery', FOOD ? 'ارسال با پیک' : 'ارسال', (S.del.area ? S.del.area + '؛ ' : '') + 'هزینه ارسال ' + toman(S.del.fee) + (S.del.min > 0 ? '؛ حداقل سفارش ' + toman(S.del.min) : '')]);
    return m;
  }
  function fee() { return mode === 'delivery' && S.del ? S.del.fee : 0; }
  /* «سر میز» with a number: the owner numbers the tables, or this visit came from a table's QR card */
  function tableAsked() { return mode === 'table' && (S.dine !== 'plain' || !!table); }
  /* a day and a time window (book_cfg in lib/bootstrap.php; the server checks it again with book_check) */
  var BK = S.book || null, bkDay = '', bkSlot = '';
  function tehranToday() {
    var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, mo: +p.month, d: +p.day, m: (+p.hour % 24) * 60 + (+p.minute) };
  }
  function bookDays() {
    var n = tehranToday(), out = [], wd = new Intl.DateTimeFormat('fa-IR', { timeZone: 'UTC', weekday: 'long' }), dm = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { timeZone: 'UTC', day: 'numeric', month: 'long' });
    for (var i = 0; i < BK.days; i++) {
      var dt = new Date(Date.UTC(n.y, n.mo - 1, n.d + i, 12)), dow = dt.getUTCDay();
      if (dow === BK.off) continue;
      var slots = BK.slots.filter(function (s) { return i > 0 || s.e > n.m + 30; });
      if (!slots.length) continue;
      out.push({ v: dt.toISOString().slice(0, 10), top: i === 0 ? 'امروز' : (i === 1 ? 'فردا' : wd.format(dt)), sub: dm.format(dt), slots: slots });
    }
    return out;
  }
  function chip(name, value, top, sub, on, fn) {
    var lb = document.createElement('label'), r = document.createElement('input'), sp = document.createElement('span');
    r.type = 'radio'; r.name = name; r.value = value; r.checked = on;
    sp.innerHTML = '<b></b>' + (sub ? '<small></small>' : ''); sp.firstChild.textContent = top; if (sub) sp.lastChild.textContent = sub;
    r.addEventListener('change', fn); lb.appendChild(r); lb.appendChild(sp); return lb;
  }
  var bkKey = '';
  function renderBook() {
    if (!BK || !$('bkDays')) return;
    var days = bookDays(), dbox = $('bkDays'), sbox = $('bkSlots');
    if (!days.some(function (d) { return d.v === bkDay; })) { bkDay = ''; bkSlot = ''; }
    /* the day chips are rebuilt only when the days themselves change (a new day, today's last window gone), so the
       row keeps its scroll and the keyboard focus */
    var key = days.map(function (d) { return d.v + d.slots.length; }).join();
    if (key !== bkKey) {
      bkKey = key; dbox.innerHTML = '';
      days.forEach(function (d) { dbox.appendChild(chip('bkd', d.v, d.top, d.sub, d.v === bkDay, function () { bkDay = d.v; renderBook(); })); });
    } else all('input', dbox).forEach(function (r) { r.checked = r.value === bkDay; });
    sbox.innerHTML = '';
    var day = days.filter(function (d) { return d.v === bkDay; })[0];
    if (!day) { var h = document.createElement('p'); h.className = 'bk-pick'; h.textContent = 'اول روز را انتخاب کنید.'; sbox.appendChild(h); return; }
    if (!day.slots.some(function (s) { return s.s === bkSlot; })) bkSlot = '';
    day.slots.forEach(function (s) { sbox.appendChild(chip('bks', s.s, s.l, s.p || '', s.s === bkSlot, function () { bkSlot = s.s; })); });
  }
  /* closed right now: the order still goes in, and the customer knows when it is seen */
  function renderClosed() {
    var el = $('bagClosed'); if (!el) return;
    var st = null; try { st = window.AlphaUI && window.AlphaUI.hours ? window.AlphaUI.hours() : null; } catch (e) {}
    el.hidden = !st || st.open || mode === 'table';
    if (!el.hidden) el.lastChild.textContent = S.name + (/^امروز/.test(st.text) ? ' ' : ' الان ') + st.text + '. ' + W.order + ' شما همین الان ثبت می‌شود و در ساعت کاری پیگیری می‌شود.';
  }
  function pickedCh() { var r = form && form.querySelector('input[name=ch]:checked'); return r ? chan(r.value) : (CH[0] || null); }
  function renderBag() {
    if (!bagEl) return;
    var ul = $('bagLines'), n = count(); ul.innerHTML = '';
    $('bagCnt').textContent = n ? fa(n) + ' مورد' : '';
    bag.forEach(function (l, i) {
      var it = ITEMS[l.id]; if (!it) return;
      var li = document.createElement('li'); li.className = 'bl';
      li.innerHTML = (it.img ? '<img alt="" loading="lazy">' : '<span class="bl-ph"></span>')
        + '<div class="bl-t"><b></b><small></small></div>'
        + (CAT ? '' : '<div class="qty sm" role="group"><button type="button" data-d="1" aria-label="یکی بیشتر">+</button><output></output><button type="button" data-d="-1" aria-label="یکی کمتر">−</button></div>')
        + '<span class="bl-p"></span><button type="button" class="bl-x" aria-label="حذف"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
      if (it.img) li.querySelector('img').src = it.img;
      li.querySelector('b').textContent = it.n + optText(l.o);
      li.querySelector('small').textContent = it.p > 0 ? fa(it.p) + ' تومان' : 'قیمت در گفتگو';
      if (!CAT) li.querySelector('output').textContent = fa(l.q);
      li.querySelector('.bl-p').textContent = it.p > 0 ? fa(it.p * l.q) : '';
      li.addEventListener('click', function (e) {
        var d = e.target.closest('[data-d]');
        if (d) { if (+d.dataset.d > 0 && room(it, qtyOf(it.id) - l.q) <= l.q) { toast('از «' + it.n + '» بیشتر از این موجود نیست.'); return; } setQ(i, l.q + (+d.dataset.d)); }
        else if (e.target.closest('.bl-x')) setQ(i, 0);
      });
      ul.appendChild(li);
    });
    var empty = !bag.length, bar = $('bagBar');
    $('bagEmpty').hidden = !empty; form.hidden = empty; ul.hidden = empty; if (bar) bar.hidden = empty;
    if ($('bagClosed')) $('bagClosed').hidden = true;
    if (empty) return;
    renderBook();
    /* how it is received */
    var ms = modes(), box = $('bagModes');
    if (box) {
      var has = function (k) { return ms.some(function (m) { return m[0] === k; }); };
      /* «سر میز» first only from a table's QR card; a visitor at home starts on what they chose last time, else takeaway */
      if (!has(mode)) mode = !ms.length ? '' : (table && has('table') ? 'table' : (me.mode && me.mode !== 'table' && has(me.mode) ? me.mode : (has('pickup') ? 'pickup' : ms[0][0])));
      box.innerHTML = '';
      ms.forEach(function (m) {
        var lb = document.createElement('label'), r = document.createElement('input'), sp = document.createElement('span');
        r.type = 'radio'; r.name = 'mode'; r.value = m[0]; r.checked = m[0] === mode; sp.textContent = m[1];
        r.addEventListener('change', function () { mode = m[0]; renderBag(); });
        lb.appendChild(r); lb.appendChild(sp); box.appendChild(lb);
      });
      var cur = ms.filter(function (m) { return m[0] === mode; })[0], hint = $('bagModeHint');
      hint.hidden = !cur; if (cur) hint.textContent = cur[2];
    }
    $('bagAddr').hidden = mode !== 'delivery';
    var tNum = tableAsked(), tb = $('bagTable');
    if (tb) { tb.hidden = !tNum; if (tNum && table && !form.elements.table.value) form.elements.table.value = table; }
    all('.bf input[name=name], .bf input[name=phone]', form).forEach(function (i) { var sp = i.parentNode.querySelector('span'), opt = i.name === 'phone' ? mode === 'table' : tNum; sp.textContent = sp.textContent.replace(/ \(اختیاری\)$/, '') + (opt ? ' (اختیاری)' : ''); });
    /* totals */
    var sum = subtotal(), f = fee(), dl = $('bagSum'), rows = [];
    if (S.noSum) rows.push(['موارد انتخابی', fa(count()) + ' ' + (S.unit || 'مورد'), 1]);   // real estate: how many files, no price sum (2026-10-31)
    else {
      rows.push([(CAT ? 'موارد انتخابی' : 'جمع ' + fa(count()) + ' مورد'), sum > 0 ? fa(sum) + ' تومان' : 'در گفتگو']);
      if (mode === 'delivery') rows.push(['هزینه ارسال', toman(f)]);
      if (!CAT || sum > 0) rows.push(['مبلغ کل', sum > 0 ? fa(sum + f) + ' تومان' : 'در گفتگو', 1]);
    }
    dl.innerHTML = '';
    rows.forEach(function (r) { var d = document.createElement('div'); if (r[2]) d.className = 'tot'; d.innerHTML = '<dt></dt><dd></dd>'; d.firstChild.textContent = r[0]; d.lastChild.textContent = r[1]; dl.appendChild(d); });
    var last = rows[rows.length - 1], tm = / تومان$/.test(last[1]);   // the bar under the list repeats the total (2026-10-30)
    if ($('bagBarTot')) { $('bagBarL').textContent = last[0] + (tm ? ' (تومان)' : ''); $('bagBarTot').textContent = tm ? last[1].replace(/ تومان$/, '') : last[1]; }
    var unpriced = bag.some(function (l) { return ITEMS[l.id] && !(ITEMS[l.id].p > 0); });
    var payable = sum > 0 && !unpriced && sum + f <= (S.payMax || 5e8);
    var pb = $('bagPayBox'); if (pb) pb.hidden = !payable;
    /* 2026-10-24: the site's own way to pay only; this line says why there is none for this order */
    var pl = $('bagPayLine');
    if (pl) {
      var why = unpriced || (CAT && !(sum > 0)) ? 'unpriced' : (sum + f > (S.payMax || 5e8) ? 'big' : (!pb && sum > 0 ? 'none' : ''));
      pl.hidden = !why; if (why) pl.lastChild.textContent = pl.getAttribute('data-' + why) || '';
    }
    var low = mode === 'delivery' && S.del && S.del.min > 0 && sum < S.del.min;
    var err = $('bagErr');
    if (low) { err.hidden = false; err.textContent = 'برای ارسال، حداقل سفارش ' + toman(S.del.min) + ' است؛ ' + toman(S.del.min - sum) + ' دیگر اضافه کنید یا «تحویل حضوری» را انتخاب کنید.'; }
    else if (err.dataset.kind === 'min') err.hidden = true;
    err.dataset.kind = low ? 'min' : '';
    $('bagGo').disabled = low || sending;
    /* the customer club (crm.php): what this order earns once it is done */
    var earnEl = $('bagEarn'), CL = S.club;
    if (earnEl) {
      var earn = !CL ? 0 : (CL.mode === 'stamps' ? (sum > 0 && sum >= CL.min ? 1 : 0) : Math.floor(sum / CL.per));
      earnEl.hidden = !earn;
      if (earn) earnEl.lastChild.textContent = 'با این ' + W.order + ' ' + fa(earn) + ' ' + (CL.mode === 'stamps' ? 'مهر' : 'امتیاز') + ' در باشگاه مشتریان ' + S.name + ' می‌گیرید (' + fa(CL.goal) + ' ' + (CL.mode === 'stamps' ? 'مهر' : 'امتیاز') + ' = ' + CL.reward + ')؛ بعد از تحویل ثبت می‌شود.';
    }
    var c = pickedCh();
    $('bagGoT').textContent = W.send + (c ? ' و ارسال در ' + c.label : '');
    renderClosed();
  }
  /* A card-to-card order survives closing the bag or a reload (customers leave for the bank app and come back): its
     card, amount and «واریز کردم» are kept 48 hours in this browser (review of 2026-10-15). */
  var PKEY = 'aw-pay-' + S.slug;
  function pending() {
    var p = store(PKEY);
    if (!p || !p.r || !p.r.pay || !p.f || Date.now() - (+p.at || 0) > 48 * 3600e3) { if (p) store(PKEY, null); return null; }
    return p;
  }
  function resumePay(p) { openBag(); done(p.r, p.f, p.ch ? chan(p.ch) : null, true); }
  function resumeLine() {
    var p = pending(), m = $('bagMain'), el = $('bagResume');
    if (!p) { if (el) el.hidden = true; return; }
    if (!el) { el = document.createElement('div'); el.id = 'bagResume'; el.className = 'bag-resume'; m.insertBefore(el, m.firstChild); }
    el.hidden = false; el.innerHTML = '';
    var ty = p.r.pay.tayid || p.r.pay.zp, t = document.createElement('span');
    t.textContent = W.order + ' شماره ' + fa(p.r.no) + (p.r.payDone ? '؛ پرداخت شد.' : (p.r.payRef || p.r.payClaim ? '؛ واریزش ثبت شده.' : (ty ? '؛ منتظر پرداخت شما.' : '؛ منتظر واریز شما.')));
    var b = document.createElement('button'); b.type = 'button'; b.className = 'bp-copy'; b.textContent = p.r.payRef || p.r.payDone ? 'دیدن ' + W.order : (ty ? 'پرداخت' : 'کارت و ثبت واریز');
    b.onclick = function () { done(p.r, p.f, p.ch ? chan(p.ch) : null, true); };
    el.appendChild(t); el.appendChild(b);
  }
  /* a service that takes people: open the list at its day and time picker */
  function bookNow() {
    openBag();
    if (!BK) return;
    /* the day and time come up with the chosen service still in sight above them (it scrolled the service out and the
       title sat under the header; 2026-10-23 sweep) */
    setTimeout(function () {
      var bb = $('bagBook'); if (!bb || bkDay) return;
      var sc = bb.parentElement; while (sc && sc !== bagEl && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement;
      try { if (sc) sc.scrollBy({ top: bb.getBoundingClientRect().top - sc.getBoundingClientRect().top - 96, behavior: 'smooth' }); else bb.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
    }, 260);
  }
  function openBag() {
    if (!bagEl) return;
    var ps = $('psheet'); if (ps && ps.open) ps.close();
    $('bagMain').hidden = false; $('bagDone').hidden = true;
    renderBag(); resumeLine();
    if (!bagEl.open) { if (bagEl.showModal) bagEl.showModal(); else bagEl.setAttribute('open', ''); }
    if (!pushed) { try { history.pushState({ awbag: 1 }, '', '#bag'); pushed = true; } catch (e) {} }
    var tb = $('bagToast'); if (tb) tb.hidden = true;
  }
  function closeBag(fromPop) {
    if (!bagEl) return;
    if (bagEl.open) bagEl.close();
    if (pushed && !fromPop) { pushed = false; try { history.back(); } catch (e) {} }
    pushed = false;
  }
  if (bagEl) {
    /* fill in what this customer typed last time */
    ['name', 'phone', 'address'].forEach(function (k) { if (me[k] && form.elements[k]) form.elements[k].value = me[k]; });
    var lastCh = store('aw-ch-' + S.slug); if (lastCh && form.querySelector('input[name=ch][value="' + lastCh + '"]')) form.querySelector('input[name=ch][value="' + lastCh + '"]').checked = true;
    all('input[name=ch]', form).forEach(function (r) { r.addEventListener('change', renderBag); });
    bagEl.addEventListener('close', function () {
      stopAuto();
      if (!$('bagDone').hidden) { var lp = lastOrder(); if (lp) seen(lp.r.no); }   // they saw it and closed it themselves
      if (pushed) closeBag(false);
    });
    bagEl.addEventListener('click', function (e) { if (e.target === bagEl) closeBag(); });
    all('[data-bag-close]', bagEl).forEach(function (b) { b.addEventListener('click', function () { closeBag(); }); });
    all('[data-bag-shop]', bagEl).forEach(function (b) { b.addEventListener('click', function () { closeBag(); setTimeout(function () { var p = $('products'); if (p) p.scrollIntoView({ behavior: 'smooth' }); }, 120); }); });
    addEventListener('popstate', function () {
      if (window.__acSkip) return;   // the account sheet stepped back over the bag (its own listener clears the flag)
      var ac = $('acct'); if (ac && ac.open) return;   // Back closes the account sheet first
      if (bagEl.open) { pushed = false; closeBag(true); }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    form.addEventListener('input', function () { var err = $('bagErr'); if (err.dataset.kind === 'v') { err.hidden = true; err.dataset.kind = ''; } });
  }
  all('[data-bag-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openBag(); }); });
  if (bagEl && !S.demo) (function () {
    if (/[?&]op=/.test(location.search)) return;   // back from Tayid Shod's page: payBack() below
    var p = pending(); if (!p || p.r.payRef || p.r.payDone || Date.now() - p.at > 3600e3 || /[?&]p=/.test(location.search)) {
      var later = function () { if (!bagEl.open) lastLine(); };
      setTimeout(function () { if (document.body.classList.contains('splashing')) document.addEventListener('splash:done', later, { once: true }); else later(); }, 900);
      return;
    }
    var go = function () { if (!bagEl.open) resumePay(p); };
    setTimeout(function () { if (document.body.classList.contains('splashing')) document.addEventListener('splash:done', go, { once: true }); else go(); }, 700);
  })();

  function fail(msg, field) {
    var err = $('bagErr'); err.hidden = false; err.textContent = msg; err.dataset.kind = 'v';
    if (field && form.elements[field]) { form.elements[field].focus(); form.elements[field].setAttribute('aria-invalid', 'true'); }
    else err.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  /* the site's own way to pay (Tayid Shod, Zarinpal or the card), the only one (2026-10-24) */
  function payChoice() { var pb = $('bagPayBox'), p = pb && !pb.hidden ? pb.querySelector('input[name=pay]:checked') : null; return p ? p.value : ''; }
  function orderMessage(r, f) {
    var L = [], word = W.order;
    L.push('سلام، ' + word + ' جدید از سایت ' + S.name + (r.no ? '\n' + 'شماره ' + word + ': ' + fa(r.no) : ''));
    r.lines.forEach(function (l) { L.push('• ' + (CAT ? '' : fa(l.q) + '× ') + l.n + (l.p > 0 ? '، ' + fa(l.p * l.q) + ' تومان' : '')); });
    if (r.gold) L.push(r.gold);
    if (r.mode === 'delivery') L.push('هزینه ارسال: ' + (r.fee > 0 ? fa(r.fee) + ' تومان' : 'رایگان'));
    if (r.total > 0) L.push('جمع کل: ' + fa(r.total) + ' تومان');
    if (r.when) L.push(r.when);
    if (r.mode === 'table') L.push(r.table ? 'سر میز ' + fa(r.table) : 'سر میز');
    else if (r.mode === 'pickup') L.push('تحویل: حضوری');
    else if (r.mode === 'delivery') L.push('ارسال به: ' + f.address);
    if (f.name || f.phone) L.push('نام: ' + [f.name, f.phone].filter(Boolean).join('، '));
    if (f.note) L.push((CAT ? 'زمان و توضیح: ' : 'توضیح: ') + f.note);
    if (r.pay && r.pay.tayid) L.push('پرداخت: کارت‌به‌کارت خودکار' + (r.payDone ? '، پرداخت شد' : (r.payClaim ? '، واریز شد' : '، بعد از ثبت ' + word)));
    else if (r.pay && r.pay.zp) L.push('پرداخت: زرین‌پال' + (r.payRef ? '، پرداخت شد؛ شماره پیگیری ' + r.payRef : '، بعد از ثبت ' + word));
    else if (r.pay) L.push('پرداخت: کارت‌به‌کارت' + (r.payRef ? '، واریز شد؛ شماره پیگیری ' + r.payRef : '، بعد از ثبت ' + word));
    L.push(siteUrl(0));
    return L.join('\n');
  }
  function submit() {
    if (sending || !bag.length) return;
    all('[aria-invalid]', form).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    var f = { pay: payChoice(), name: form.elements.name.value.trim(), phone: en(form.elements.phone.value).replace(/\D/g, '').replace(/^98/, '0'), address: form.elements.address ? form.elements.address.value.trim() : '', note: form.elements.note.value.trim() };
    if (f.phone && f.phone.charAt(0) === '9') f.phone = '0' + f.phone;
    if (!CAT && !mode) return fail('نحوه تحویل را انتخاب کنید.');
    var tno = '';
    if (mode === 'table') {
      if (tableAsked()) { tno = en(form.elements.table.value).replace(/\D/g, ''); if (!tno || !(+tno > 0) || tno.length > 4) return fail('شماره میزتان را بنویسید.', 'table'); }
      else if (f.name.length < 2) return fail('نامتان را بنویسید تا ' + W.order + ' را به خودتان بدهند.', 'name');
    }
    if (mode !== 'table') {
      if (f.name.length < 2) return fail('نام خود را بنویسید.', 'name');
      if (!/^09\d{9}$/.test(f.phone)) return fail('شماره موبایل را درست بنویسید؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.', 'phone');
    } else if (f.phone && !/^09\d{9}$/.test(f.phone)) return fail('شماره موبایل را درست بنویسید یا خالی بگذارید.', 'phone');
    if (mode === 'delivery' && f.address.length < 8) return fail('آدرس کامل را بنویسید.', 'address');
    if (BK && (!bkDay || !bkSlot)) { fail(bkDay ? 'ساعت را انتخاب کنید.' : 'روز را انتخاب کنید.'); var bb = $('bagBook'); if (bb) bb.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    var c = pickedCh();
    sending = true; $('bagGo').disabled = true; $('bagGo').classList.add('busy');
    var body = new URLSearchParams({ slug: S.slug, v: '2', items: JSON.stringify(bag.map(function (l) { var it = ITEMS[l.id]; return { id: l.id, q: l.q, o: l.o || {}, p: it ? it.p : 0 }; })),
      mode: mode, table: tno, name: f.name, phone: f.phone, address: mode === 'delivery' ? f.address : '', note: f.note, channel: c ? c.ch : (B.ch || '') });
    if (BK) { body.set('bk', '1'); body.set('when_date', bkDay); body.set('when_slot', bkSlot); }
    if (payChoice()) body.set('pay', payChoice());
    if (form.elements.bd_d && form.elements.bd_d.value && form.elements.bd_m.value) { body.set('bd_d', form.elements.bd_d.value); body.set('bd_m', form.elements.bd_m.value); }
    fetch('/api/order', { method: 'POST', body: body })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        sending = false; $('bagGo').classList.remove('busy');
        if (x.s !== 200 || !x.j.ok) {
          /* the gold price moved: take the server's prices, show the new total, and let the customer send again */
          if (x.j.prices) { paintGold(x.j.prices); refresh(); pollGold(); }
          else if (G) pollGold();
          renderBag(); return fail(x.j.error || (x.s === 429 ? 'چند لحظه دیگر دوباره بزنید.' : 'ثبت نشد؛ دوباره امتحان کنید.'));
        }
        me = { name: f.name, phone: f.phone, address: f.address || me.address || '', mode: mode }; store('aw-me', me);
        if (c) store('aw-ch-' + S.slug, c.ch);
        done(x.j, f, c);
      })
      .catch(function () { sending = false; $('bagGo').classList.remove('busy'); renderBag(); fail('اینترنت قطع است؛ دوباره امتحان کنید.'); });
  }
  function done(r, f, c, resumed) {
    var text = orderMessage(r, f), word = W.order;
    if (!S.demo && !resumed) { bag = []; saveBag(); refresh(); bkDay = ''; bkSlot = ''; bkKey = ''; }
    if (!S.demo && !resumed && r.pay) store(PKEY, { r: r, f: f, ch: c ? c.ch : '', at: Date.now() });
    if (!S.demo && !resumed) { store(LKEY, { r: r, f: f, ch: c ? c.ch : '', at: Date.now() }); seen(''); }
    /* the order is done: coming back from the messenger must not reopen an empty bag */
    if (pushed) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} pushed = false; }
    $('bagMain').hidden = true; var d = $('bagDone'); d.hidden = false; if ($('bagBar')) $('bagBar').hidden = true;
    $('bdMsg').textContent = text;
    var send = $('bdSend'), note = $('bdNote'), cp = $('bdCopy');
    payBox(r, function () { text = orderMessage(r, f); $('bdMsg').textContent = text; if (c && c.pre && !S.demo) send.href = link(text, c); });
    note.hidden = true; cp.hidden = false;
    if (S.demo) {
      $('bdH').textContent = 'در سایت واقعی، ' + word + ' این‌جا با شماره ثبت می‌شود';
      $('bdP').textContent = 'و به پنل فروشنده می‌رود؛ مشتری هم با یک لمس به ' + (c ? c.label : 'پیام‌رسان') + ' فروشنده می‌رود و پیام آماده پایین همین صفحه را می‌فرستد.';
      send.textContent = 'همین را برای کسب‌وکارم می‌خواهم'; send.href = '/start?layout=' + encodeURIComponent(S.layout || ''); send.target = '_top'; send.onclick = null;
      cp.hidden = true;
    } else {
      $('bdH').textContent = word + ' شماره ' + fa(r.no) + ' ثبت شد';
      if (r.pay && r.pay.tayid) $('bdP').textContent = r.payDone ? 'پرداخت شد و ' + S.name + ' آن را تأیید کرد. فاکتورتان را با دکمه پایین ببینید یا ذخیره کنید' + (c ? '؛ پیام ' + word + ' را هم در ' + c.label + ' بفرستید.' : '.')
        : 'دکمه «پرداخت» را بزنید: مبلغ دقیق و کارت ' + S.name + ' را در صفحه امن «تأیید شد» می‌بینید و بعد از واریز به همین‌جا برمی‌گردید. بعد پیام ' + word + ' را' + (c ? ' در ' + c.label : '') + ' بفرستید.';
      else if (r.pay && r.pay.zp) $('bdP').textContent = r.payRef ? 'پرداختتان ثبت شد؛ ' + S.name + ' آن را بررسی و تأیید می‌کند. پیام ' + word + ' را هم' + (c ? ' در ' + c.label : '') + ' بفرستید.'
        : 'دکمه «پرداخت در زرین‌پال» را بزنید و همین مبلغ را بپردازید؛ بعد شماره پیگیری را همین‌جا بنویسید و پیام ' + word + ' را' + (c ? ' در ' + c.label : '') + ' بفرستید.';
      else if (r.pay) $('bdP').textContent = 'مبلغ را به کارت زیر کارت‌به‌کارت کنید و شماره پیگیری رسید را بنویسید؛ بعد پیام ' + word + ' را' + (c ? ' در ' + c.label : '') + ' بفرستید.';
      else if (c && c.pre) $('bdP').textContent = (resumed ? 'پیام را فرستادید؟ اگر نه، دکمه زیر را بزنید.' : 'برای نهایی شدن، پیام آماده را در ' + c.label + ' بفرستید.')
        + (BK ? ' ' + S.name + ' زمان را همان‌جا تأیید می‌کند.' : (CAT ? ' زمان همان‌جا هماهنگ می‌شود.' : (FOOD ? ' تحویل همان‌جا هماهنگ می‌شود.' : ' ارسال همان‌جا هماهنگ می‌شود.')));
      else if (c) $('bdP').textContent = c.label + ' پیام آماده را در لینک نمی‌پذیرد: پیام را کپی می‌کنیم، گفتگوی ما باز می‌شود، آن را بچسبانید (Paste) و بفرستید.';
      else $('bdP').textContent = S.name + ' به‌زودی با شما تماس می‌گیرد.' + (S.tel ? ' عجله دارید؟ تماس بگیرید.' : '');
      if (r.repriced) $('bdP').textContent = 'نرخ طلا از وقتی صفحه را باز کردید تغییر کرده بود؛ قیمت‌ها با نرخ همین لحظه ثبت شد. ' + $('bdP').textContent;
      send.target = '_blank';
      if (c) {
        var url = link(c.pre ? text : '', c);
        send.innerHTML = ''; send.appendChild(document.createTextNode(c.pre ? 'ارسال پیام در ' + c.label : 'کپی پیام و باز کردن ' + c.label));
        send.href = url;
        send.onclick = function (e) {
          logTap(0, c.ch);
          if (!c.pre) { copy(text); note.hidden = false; note.textContent = 'پیام کپی شد؛ در گفتگوی ' + c.label + ' نگه دارید و «Paste» یا «چسباندن» را بزنید.'; }
          if (mobile) { e.preventDefault(); location.href = url; }
        };
        /* phones: WhatsApp and Telegram open by themselves, after a short count the customer can see (2026-10-22: the
           number and the time were gone before anyone read them); the button stays for a second try. With
           card-to-card the customer pays first. */
        if (c.pre && mobile && !r.pay && !resumed) autoGo(url, c, note);
      } else if (S.tel) { send.textContent = 'تماس با ' + S.name; send.href = 'tel:' + S.tel; send.target = ''; send.onclick = null; }
      else send.hidden = true;
    }
    cp.onclick = function () { if (copy(text)) { cp.lastChild.textContent = 'کپی شد'; setTimeout(function () { cp.lastChild.textContent = 'کپی پیام ' + word; }, 1800); } };
    try { d.focus({ preventScroll: true }); } catch (e) {}
    $('bagBody').scrollTop = 0;
  }

  var autoT = 0;
  function stopAuto() { clearTimeout(autoT); autoT = 0; }
  function autoGo(url, c, note) {
    stopAuto();
    var n = 3, t = document.createElement('span'), stay = document.createElement('button');
    stay.type = 'button'; stay.className = 'bd-stay'; stay.textContent = 'نه، بمانم';
    note.hidden = false; note.className = 'bd-note bd-auto'; note.innerHTML = ''; note.appendChild(t); note.appendChild(stay);
    var tick = function () {
      if (!bagEl.open || $('bagDone').hidden) { stopAuto(); return; }
      if (n <= 0) {
        autoT = 0; logTap(0, c.ch);
        note.className = 'bd-note'; note.textContent = c.label + ' باز نشد؟ دکمه «ارسال پیام در ' + c.label + '» را بزنید.';
        location.href = url; return;
      }
      t.textContent = fa(n) + ' ثانیه دیگر ' + c.label + ' باز می‌شود تا پیام را بفرستید. ';
      n--; autoT = setTimeout(tick, 1000);
    };
    stay.onclick = function () { stopAuto(); note.className = 'bd-note'; note.textContent = 'هر وقت آماده بودید، دکمه بالا را بزنید.'; };
    tick();
  }
  /* The last order is kept a day in this browser: a customer who went to the messenger and came back (the page reloaded)
     sees «سفارش شماره ۱۰۲ ثبت شد» with «دیدن» until they close it or its done screen (2026-10-22). */
  var LKEY = 'aw-last-' + S.slug;
  function seen(no) { try { if (no === '') sessionStorage.removeItem(LKEY); else sessionStorage.setItem(LKEY, String(no)); } catch (e) {} }
  function seenNo() { try { return sessionStorage.getItem(LKEY) || ''; } catch (e) { return ''; } }
  function lastOrder() {
    var p = store(LKEY);
    if (!p || !p.r || !p.f || Date.now() - (+p.at || 0) > 24 * 3600e3) { if (p) store(LKEY, null); return null; }
    return p;
  }
  function lastLine() {
    var p = lastOrder(); if (!p || !bagEl || S.demo || seenNo() === String(p.r.no) || Date.now() - p.at > 3 * 3600e3) return;
    var el = document.createElement('div'); el.className = 'bag-toast bag-last'; el.setAttribute('role', 'status');
    var t = document.createElement('span'); t.textContent = W.order + ' شماره ' + fa(p.r.no) + ' شما ثبت شده است.';
    var b = document.createElement('button'); b.type = 'button'; b.textContent = 'دیدن';
    var x = document.createElement('button'); x.type = 'button'; x.className = 'bl-x'; x.setAttribute('aria-label', 'بستن'); x.textContent = '×';
    b.onclick = function () { el.remove(); openBag(); done(p.r, p.f, p.ch ? chan(p.ch) : null, true); };
    x.onclick = function () { el.remove(); seen(p.r.no); };
    el.appendChild(t); el.appendChild(b); el.appendChild(x); document.body.appendChild(el);
  }

  /* v17: the shop's card after a card-to-card order: the exact amount and the card (copy buttons), the Sheba above the
     daily card limit, then «واریز کردم» with the receipt's tracking number. The owner confirms it in the panel; the
     claim never marks anything paid by itself. Demos show the same box without a card number. */
  function payBox(r, again) {
    var box = $('bdPay'); if (!box) return;
    box.innerHTML = ''; box.hidden = !r.pay; if (!r.pay) return;
    var P = r.pay, mk = function (tag, cls, txt) { var x = document.createElement(tag); if (cls) x.className = cls; if (txt !== undefined) x.textContent = txt; return x; };
    if (P.tayid) return tayidBox(r, box, P, mk, again);
    if (P.zp) return zpBox(r, box, P, mk, again);
    var cbtn = function (val, label) { var b = mk('button', 'bp-copy', label); b.type = 'button'; b.onclick = function () { if (copy(val)) { b.textContent = 'کپی شد'; setTimeout(function () { b.textContent = label; }, 1600); } }; return b; };
    var amt = mk('div', 'bp-amt'); amt.appendChild(mk('span', '', 'مبلغ دقیق واریز')); amt.appendChild(mk('b', '', fa(P.amount) + ' تومان'));
    if (!P.demo) amt.appendChild(cbtn(String(P.amount), 'کپی مبلغ'));
    box.appendChild(amt);
    if (P.demo) { box.insertBefore(mk('p', 'bp-h', 'اگر مشتری «کارت‌به‌کارت» را انتخاب کند:'), amt); box.appendChild(mk('p', 'bp-note', 'در سایت واقعی شماره کارت فروشگاه همین‌جا با دکمه کپی می‌آید؛ مشتری واریز می‌کند، شماره پیگیری رسید را می‌نویسد و «واریز کردم» را می‌زند، و فروشنده در پنلش «رسید» را تأیید می‌کند.')); return; }
    var card = mk('div', 'bp-card'), pan = String(P.card).replace(/(\d{4})(?=\d)/g, '$1 ');
    if (P.bank) card.appendChild(mk('span', 'bp-bank', P.bank));
    var pn = mk('b', 'bp-pan', pan); pn.dir = 'ltr'; card.appendChild(pn);
    if (P.holder) card.appendChild(mk('span', 'bp-name', 'به نام ' + P.holder));
    card.appendChild(cbtn(String(P.card), 'کپی شماره کارت'));
    box.appendChild(card);
    if (P.iban) { var ib = mk('p', 'bp-iban', ''); ib.appendChild(mk('span', '', 'این مبلغ از سقف روزانه کارت‌به‌کارت بیشتر است؛ با پایا به این شبا هم می‌شود: ')); var ibv = mk('b', '', P.iban); ibv.dir = 'ltr'; ib.appendChild(ibv); ib.appendChild(cbtn(P.iban, 'کپی شبا')); box.appendChild(ib); }
    else if (P.big) box.appendChild(mk('p', 'bp-note', 'این مبلغ از سقف روزانه کارت‌به‌کارت بیشتر است؛ می‌توانید در دو روز بفرستید.'));
    if (r.payRef) { var was = mk('p', 'bp-ok', ''); was.appendChild(mk('b', '', 'واریز ثبت شد')); was.appendChild(document.createTextNode(' (پیگیری ' + r.payRef + ')؛ ' + S.name + ' آن را بررسی و تأیید می‌کند.')); box.appendChild(was); watchPaid(r, box, P, mk); return; }
    var fm = mk('form', 'bp-form'); fm.noValidate = true;
    fm.innerHTML = '<label class="bf"><span>شماره پیگیری رسید</span><input name="ref" inputmode="numeric" autocomplete="off" maxlength="40" dir="ltr" placeholder="123456"></label>'
      + '<label class="bf"><span>۴ رقم آخر کارت شما (اختیاری)</span><input name="last4" inputmode="numeric" autocomplete="off" maxlength="4" dir="ltr" placeholder="1234"></label>'
      + '<p class="bag-err" role="alert" hidden></p><button class="bag-go" type="submit"></button>';
    fm.querySelector('button').textContent = 'واریز کردم';
    var er = fm.querySelector('.bag-err'), go = fm.querySelector('button'), busy = false;
    fm.addEventListener('submit', function (e) {
      e.preventDefault(); if (busy) return;
      var ref = en(fm.elements.ref.value).replace(/[\s\-_.\/:#]/g, '');
      if (!/^[0-9A-Za-z]{4,34}$/.test(ref) || (ref.match(/\d/g) || []).length < 4) { er.hidden = false; er.textContent = 'شماره پیگیری رسید بانک را بنویسید (دست‌کم ۴ رقم).'; fm.elements.ref.focus(); return; }
      busy = true; go.classList.add('busy');
      fetch('/api/order-pay', { method: 'POST', body: new URLSearchParams({ slug: S.slug, order: P.order, key: P.key, ref: ref, last4: en(fm.elements.last4.value).replace(/\D/g, '') }) })
        .then(function (x) { return x.json().catch(function () { return {}; }).then(function (j) { return { s: x.status, j: j }; }); })
        .then(function (x) {
          busy = false; go.classList.remove('busy');
          if (!x.j.ok) { er.hidden = false; er.textContent = x.j.error || 'ثبت نشد؛ دوباره امتحان کنید.'; return; }
          r.payRef = x.j.ref || ref;
          var kept = pending(); if (kept && kept.r.no === r.no) { kept.r.payRef = r.payRef; store(PKEY, kept); }
          var ok = mk('p', 'bp-ok', ''); ok.appendChild(mk('b', '', 'واریز ثبت شد')); ok.appendChild(document.createTextNode(' (پیگیری ' + r.payRef + ')؛ ' + S.name + ' آن را بررسی و تأیید می‌کند.'));
          fm.replaceWith(ok);
          watchPaid(r, box, P, mk);
          if (again) again();
        })
        .catch(function () { busy = false; go.classList.remove('busy'); er.hidden = false; er.textContent = 'اینترنت قطع است؛ دوباره امتحان کنید.'; });
    });
    box.appendChild(fm);
  }

  /* v20: Tayid Shod. «پرداخت» opens its payment page (/api/order-go makes the order there); the customer comes back with
     ?op={order}.{key} and this box shows the status, asked every few seconds while it waits (/api/order-status). */
  var payTimer = 0;
  function payStatusText(st) {
    return st === 'paid' ? 'پرداخت شد؛ ' + S.name + ' آن را تأیید کرد.' : (st === 'claimed' ? 'واریز شما اعلام شد؛ ' + S.name + ' به‌زودی تأییدش می‌کند. همین صفحه خودش به‌روز می‌شود.'
      : (st === 'unpaid' ? S.name + ' هنوز این واریز را ندیده؛ اگر واریز کرده‌اید به ' + S.name + ' خبر بدهید، وگرنه دوباره «پرداخت» را بزنید.' : ''));
  }
  function tayidBox(r, box, P, mk, again) {
    var amt = mk('div', 'bp-amt'); amt.appendChild(mk('span', '', 'مبلغ ' + W.order)); amt.appendChild(mk('b', '', fa(P.amount) + ' تومان'));
    box.appendChild(amt);
    if (P.demo) {
      box.insertBefore(mk('p', 'bp-h', 'اگر مشتری «کارت‌به‌کارت» را انتخاب کند:'), amt);
      box.appendChild(mk('p', 'bp-note', 'در سایت واقعی دکمه «پرداخت» این‌جاست: مشتری در صفحه امن «تأیید شد» مبلغ دقیق و کارت فروشگاه را می‌بیند، واریز می‌کند و «واریز کردم» را می‌زند؛ فروشنده با یک لمس در بله تأیید می‌کند، سفارش خودش «پرداخت شد» می‌شود و مشتری فاکتورش را همین‌جا می‌گیرد.'));
      invLink(box, mk, (S.base || '') + '/f/sample', 'نمونه فاکتور مشتری');
      return;
    }
    var stEl = mk('p', 'bp-ok', ''), go = mk('a', 'bag-go bp-pay', '');
    go.href = '/api/order-go?' + new URLSearchParams({ s: S.slug, o: P.order, k: P.key }).toString();
    go.appendChild(document.createTextNode('پرداخت ' + fa(P.amount) + ' تومان'));
    var how = mk('p', 'bp-note', 'کارت‌به‌کارت خودکار با «تأیید شد»: مبلغ دقیق (با سه رقم کد آخرش) و کارت ' + S.name + ' را با دکمه کپی می‌بینید.');
    var iv = null;
    function paint(st) {
      if (st === 'paid') r.payDone = true; if (st === 'claimed') r.payClaim = true;
      var tx = payStatusText(st); stEl.hidden = !tx; stEl.textContent = tx; stEl.className = st === 'paid' ? 'bp-ok' : 'bp-note';
      go.hidden = st === 'paid' || st === 'claimed'; how.hidden = go.hidden;
      if (r.payDone && r.inv && !iv) iv = invLink(box, mk, r.inv);
      keepPay(r);
      if (again) again();
    }
    box.appendChild(go); box.appendChild(how); box.appendChild(stEl);
    paint(r.payDone ? 'paid' : (r.payClaim ? 'claimed' : 'wait'));
    clearTimeout(payTimer);
    var tries = 0, ask = function () {
      if (!bagEl.open || !document.body.contains(box) || box.hidden || (r.payDone && r.inv) || tries++ > 180) return;
      if (document.hidden) { payTimer = setTimeout(ask, 5000); return; }
      fetch('/api/order-status?' + new URLSearchParams({ s: S.slug, o: P.order, k: P.key }).toString(), { cache: 'no-store' })
        .then(function (x) { return x.ok ? x.json() : null; }).then(function (j) { if (j && j.ok) { if (j.invoice) r.inv = j.invoice; paint(j.status); } })
        .catch(function () {}).then(function () { if (!r.payDone) payTimer = setTimeout(ask, r.payClaim ? 5000 : 8000); });
    };
    if (r.payBack || r.payClaim || (r.payDone && !r.inv)) ask(); else payTimer = setTimeout(ask, 8000);
  }
  /* The invoice (2026-10-26, invoice.php): once the payment is confirmed, the customer opens, prints or saves it. */
  function invLink(box, mk, href, label) {
    var a = mk('a', 'bag-go bp-inv', ''); a.href = href; a.innerHTML = ICON_RECEIPT; a.appendChild(document.createTextNode(label || 'دیدن و ذخیره فاکتور'));
    box.appendChild(a); return a;
  }
  function keepPay(r) { var kept = pending(); if (kept && kept.r.no === r.no) { kept.r.payDone = r.payDone; kept.r.payClaim = r.payClaim; kept.r.payRef = r.payRef; kept.r.inv = r.inv; store(PKEY, kept); } }
  /* Zarinpal and the card: the owner confirms in the panel; while the bag is open this asks now and then and shows the
     invoice the moment it is confirmed (a customer who left gets it in «حساب من» or from the shop). */
  function watchPaid(r, box, P, mk) {
    var ok = null, iv = null;
    function show() {
      if (!ok) { ok = mk('p', 'bp-ok', ''); ok.appendChild(mk('b', '', 'پرداخت تأیید شد')); ok.appendChild(document.createTextNode('؛ ' + S.name + ' پرداخت شما را دید.')); box.appendChild(ok); }
      if (r.inv && !iv) iv = invLink(box, mk, r.inv);
    }
    if (r.payDone && r.inv) { show(); return; }
    clearTimeout(payTimer);
    var tries = 0, ask = function () {
      if (!bagEl.open || !document.body.contains(box) || box.hidden || (r.payDone && r.inv) || tries++ > 180) return;
      if (document.hidden) { payTimer = setTimeout(ask, 6000); return; }
      fetch('/api/order-status?' + new URLSearchParams({ s: S.slug, o: P.order, k: P.key }).toString(), { cache: 'no-store' })
        .then(function (x) { return x.ok ? x.json() : null; })
        .then(function (j) { if (j && j.ok && j.status === 'paid') { r.payDone = true; if (j.invoice) r.inv = j.invoice; keepPay(r); show(); } })
        .catch(function () {}).then(function () { if (!(r.payDone && r.inv)) payTimer = setTimeout(ask, 10000); });
    };
    ask();
  }
  /* 2026-10-24: the shop's Zarinpal page. The exact amount (copy), «پرداخت در زرین‌پال», then «پرداخت کردم» with the tracking
     number; the owner confirms it in the panel, the claim never marks anything paid by itself. */
  function zpBox(r, box, P, mk, again) {
    var amt = mk('div', 'bp-amt'); amt.appendChild(mk('span', '', 'مبلغ ' + W.order)); amt.appendChild(mk('b', '', fa(P.amount) + ' تومان'));
    var cp = mk('button', 'bp-copy', 'کپی مبلغ'); cp.type = 'button'; cp.onclick = function () { if (copy(String(P.amount))) { cp.textContent = 'کپی شد'; setTimeout(function () { cp.textContent = 'کپی مبلغ'; }, 1600); } };
    amt.appendChild(cp); box.appendChild(amt);
    if (r.payRef) { var was = mk('p', 'bp-ok', ''); was.appendChild(mk('b', '', 'پرداخت ثبت شد')); was.appendChild(document.createTextNode(' (پیگیری ' + r.payRef + ')؛ ' + S.name + ' آن را بررسی و تأیید می‌کند.')); box.appendChild(was); watchPaid(r, box, P, mk); return; }
    var go = mk('a', 'bag-go bp-pay', ''); go.href = P.url; go.target = '_blank'; go.rel = 'noopener';
    go.appendChild(document.createTextNode('پرداخت در زرین‌پال'));
    box.appendChild(go);
    box.appendChild(mk('p', 'bp-note', 'در درگاه، همین مبلغ (' + fa(P.amount) + ' تومان) را بنویسید و شماره ' + W.order + ' (' + fa(r.no) + ') را در توضیح بگذارید. بعد از پرداخت، شماره پیگیری را این‌جا بنویسید.'));
    var fm = mk('form', 'bp-form'); fm.noValidate = true;
    fm.innerHTML = '<label class="bf"><span>شماره پیگیری زرین‌پال</span><input name="ref" inputmode="numeric" autocomplete="off" maxlength="40" dir="ltr" placeholder="123456"></label>'
      + '<p class="bag-err" role="alert" hidden></p><button class="bag-copy" type="submit"></button>';
    fm.querySelector('button').textContent = 'پرداخت کردم';
    var er = fm.querySelector('.bag-err'), btn = fm.querySelector('button'), busy = false;
    fm.addEventListener('submit', function (e) {
      e.preventDefault(); if (busy) return;
      var ref = en(fm.elements.ref.value).replace(/[\s\-_.\/:#]/g, '');
      if (!/^[0-9A-Za-z]{4,34}$/.test(ref) || (ref.match(/\d/g) || []).length < 4) { er.hidden = false; er.textContent = 'شماره پیگیری پرداخت را بنویسید (دست‌کم ۴ رقم).'; fm.elements.ref.focus(); return; }
      busy = true; btn.classList.add('busy');
      fetch('/api/order-pay', { method: 'POST', body: new URLSearchParams({ slug: S.slug, order: P.order, key: P.key, ref: ref }) })
        .then(function (x) { return x.json().catch(function () { return {}; }).then(function (j) { return { s: x.status, j: j }; }); })
        .then(function (x) {
          busy = false; btn.classList.remove('busy');
          if (!x.j.ok) { er.hidden = false; er.textContent = x.j.error || 'ثبت نشد؛ دوباره امتحان کنید.'; return; }
          r.payRef = x.j.ref || ref;
          var kept = pending(); if (kept && kept.r.no === r.no) { kept.r.payRef = r.payRef; store(PKEY, kept); }
          var ok = mk('p', 'bp-ok', ''); ok.appendChild(mk('b', '', 'پرداخت ثبت شد')); ok.appendChild(document.createTextNode(' (پیگیری ' + r.payRef + ')؛ ' + S.name + ' آن را بررسی و تأیید می‌کند.'));
          go.remove(); fm.replaceWith(ok);
          watchPaid(r, box, P, mk);
          if (again) again();
        })
        .catch(function () { busy = false; btn.classList.remove('busy'); er.hidden = false; er.textContent = 'اینترنت قطع است؛ دوباره امتحان کنید.'; });
    });
    box.appendChild(fm);
  }
  /* back from the payment page: the order this browser kept, or (another browser) just its number and amount */
  (function payBack() {
    var m = /[?&]op=(\d+)\.([a-f0-9]{32})/.exec(location.search); if (!m || !bagEl || S.demo) return;
    try { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])(op|tayidshod_id|order_id|status)=[^&]*/g, '$1').replace(/[?&]+$/, '').replace(/\?&+/, '?')); } catch (e) {}
    var p = pending(), go = function (r, f, ch) { r.payBack = true; openBag(); done(r, f, ch, true); };
    if (p && String(p.r.pay.order) === m[1]) { setTimeout(function () { go(p.r, p.f, p.ch ? chan(p.ch) : null); }, 500); return; }
    fetch('/api/order-status?' + new URLSearchParams({ s: S.slug, o: m[1], k: m[2] }).toString(), { cache: 'no-store' })
      .then(function (x) { return x.ok ? x.json() : null; })
      .then(function (j) { if (!j || !j.ok) return; go({ no: j.no, lines: [], total: j.total, fee: 0, mode: '', pay: { tayid: 1, order: +m[1], key: m[2], amount: j.total }, payDone: j.status === 'paid', payClaim: j.status === 'claimed' }, { name: '', phone: '', note: '' }, null); })
      .catch(function () {});
  })();

  /* ---------- product sheet ---------- */
  var ps = $('psheet'), cur = null, psQ = 1;
  function setPsQ(q) { psQ = Math.max(1, Math.min(99, q, cur ? room(cur, qtyOf(cur.id)) || 1 : 99)); if ($('psQn')) $('psQn').textContent = fa(psQ); }
  function openSheet(card) {
    if (!ps) return;
    var it = cur = ITEMS[+card.dataset.id] || item(card);
    $('psImg').innerHTML = '';
    if (it.img) { var im = document.createElement('img'); im.src = it.img; im.alt = it.n; $('psImg').appendChild(im); }
    $('psName').textContent = it.n;
    var pr = card.querySelector('.price'); $('psPrice').innerHTML = pr ? pr.innerHTML : '';
    goldSheet(ITEMS[it.id] || it);
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
    setPsQ(1);
    if ($('psBuy')) { $('psBuy').disabled = it.off; $('psBuy').hidden = it.off; }
    if ($('psQty')) $('psQty').hidden = it.off;
    if (ps.showModal) ps.showModal(); else ps.setAttribute('open', '');
    try { history.replaceState(history.state, '', '#p' + it.id); } catch (e) {}
  }
  function chosen() {
    var choice = {}, miss = [];   // every group still to pick, said at once («رنگ و سایز را انتخاب کنید»), and marked
    all('fieldset', $('psOpts')).forEach(function (fs) {
      var c = fs.querySelector('input:checked'); fs.classList.remove('need');
      if (c) choice[fs.dataset.g] = c.value; else miss.push(fs);
    });
    return { choice: choice, missing: miss.map(function (fs) { return fs.dataset.g; }).join(' و '), need: miss };
  }
  if (ps) {
    if ($('psChat')) $('psChat').addEventListener('click', function () { if (cur) askChat(cur, chosen().choice); });
    if ($('psBuy')) $('psBuy').addEventListener('click', function () {
      if (!cur || cur.off) return;
      var c = chosen();
      if (c.missing) {
        $('psErr').hidden = false; $('psErr').textContent = c.missing + ' را انتخاب کنید.';
        c.need.forEach(function (fs) { fs.classList.add('need'); fs.addEventListener('change', function () { fs.classList.remove('need'); }, { once: true }); });
        try { c.need[0].scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
        return;
      }
      if (add(cur, c.choice, psQ)) { ps.close(); if (CAT) bookNow(); }
    });
    if ($('psQty')) $('psQty').addEventListener('click', function (e) { var b = e.target.closest('[data-q]'); if (b) setPsQ(psQ + (+b.dataset.q)); });
    if ($('psAsk')) $('psAsk').addEventListener('click', function () { if (cur) ask(cur, chosen().choice); });
    $('psShare').addEventListener('click', function () {
      if (!cur) return;
      var data = { title: cur.n + ' | ' + S.name, text: cur.n, url: siteUrl(cur.id) };
      if (navigator.share) navigator.share(data).catch(function () {});
      else if (copy(data.url)) { $('psShare').lastChild.textContent = 'پیوند کپی شد'; setTimeout(function () { $('psShare').lastChild.textContent = 'اشتراک‌گذاری'; }, 1600); }
    });
    ps.addEventListener('click', function (e) { if (e.target === ps) ps.close(); });
    ps.addEventListener('close', function () { try { if (/^#p\d+$/.test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search.replace(/([?&])p=\d+&?/, '$1').replace(/[?&]$/, '')); } catch (e) {} });
  }
  all('.card').forEach(function (card) {
    var openBtn = card.querySelector('.card-open'), buy = card.querySelector('[data-buy]'), askB = card.querySelector('[data-ask-item]');
    if (openBtn) openBtn.addEventListener('click', function () { openSheet(card); });
    if (askB) askB.addEventListener('click', function () { askChat(ITEMS[+card.dataset.id] || item(card), null); });
    if (buy) buy.addEventListener('click', function () {
      var it = ITEMS[+card.dataset.id] || item(card);
      if (it.opts.length) { openSheet(card); return; }
      if (CAT && qtyOf(it.id)) { bookNow(); return; }
      buy.classList.add('pop'); setTimeout(function () { buy.classList.remove('pop'); }, 200);
      if (add(it, null, 1) && BK) bookNow();   // «رزرو نوبت» goes straight to picking the day and the time (2026-10-22)
    });
  });
  all('[data-buy-general]').forEach(function (b) { b.addEventListener('click', function () { ask(null, null); }); });
  /* the contact list's messenger links: copy a hello for the ones without a ready message; samples explain instead */
  all('[data-ch-open]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var c = chan(a.getAttribute('data-ch-open'));
      if (S.demo) { e.preventDefault(); showDemo('', c); return; }
      logTap(0, c && c.ch);
      if (c && c.pre) { e.preventDefault(); open(link(askMessage(null, null), c)); }
    });
  });

  /* a shared product link (?p=12 or #p12) opens its sheet; #bag opens the bag */
  var m = /^#p(\d+)$/.exec(location.hash) || /[?&]p=(\d+)/.exec(location.search);
  if (m) { var c0 = document.getElementById('p' + m[1]); if (c0 && c0.classList.contains('card')) setTimeout(function () { openSheet(c0); }, 400); }
  addEventListener('hashchange', function () {
    var h = /^#p(\d+)$/.exec(location.hash), c1 = h && document.getElementById('p' + h[1]);
    if (c1 && c1.classList.contains('card') && !(ps && ps.open)) openSheet(c1);
  });

  /* ---------- search ---------- */
  var q = $('q');
  if (q) q.addEventListener('input', function () {
    var v = q.value.trim(), any = false;
    all('#products .card').forEach(function (el) {
      var hit = v === '' || (el.dataset.name || '').indexOf(v) > -1 || (el.dataset.desc || '').indexOf(v) > -1;
      el.hidden = !hit; if (hit) any = true;
    });
    all('#products .g-cat').forEach(function (sec) { sec.hidden = !sec.querySelector('.card:not([hidden])'); });
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

  /* ---------- the customer's account (accounts.php; Ilya, 2026-10-24: "every layout should have sign in and sign up") ----------
     Optional: a guest still orders. Signed in, the bag is filled, the order shows in «حساب من» with its status and payment,
     and the site chat is the same conversation on every device (chat.js listens to acct:change). */
  var acEl = $('acct'), ME = null, acPushed = false;
  function acApi(a, data) {
    var get = a === 'me';
    var url = '/api/acct/' + a + (get ? '?' + new URLSearchParams({ slug: S.slug }).toString() : '');
    var opt = get ? { cache: 'no-store', credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', body: new URLSearchParams(Object.assign({ slug: S.slug }, data || {})) };
    return fetch(url, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.status = r.status; return j; }); });
  }
  function firstName(n) { n = String(n || '').trim().split(/\s+/)[0] || ''; return n.length > 10 ? n.slice(0, 9) + '…' : n; }
  function acOrders(list) {
    var ul = $('acOrders'); if (!ul) return;
    ul.innerHTML = ''; $('acNone').hidden = !!(list && list.length);
    (list || []).forEach(function (o) {
      var li = document.createElement('li'), mk = function (tag, cls, txt) { var x = document.createElement(tag); if (cls) x.className = cls; if (txt) x.textContent = txt; return x; };
      var h = mk('div', 'ao-h'); h.appendChild(mk('b', '', W.order + ' شماره ' + fa(o.no))); h.appendChild(mk('span', 'ao-st' + (o.done ? ' done' : ''), o.status)); li.appendChild(h);
      li.appendChild(mk('small', 'ao-at', o.at));
      if (o.what) li.appendChild(mk('p', 'ao-what', o.what));
      if (o.when) li.appendChild(mk('p', 'ao-when', o.when));
      var f = mk('div', 'ao-f'); f.appendChild(mk('span', 'ao-tot', o.total > 0 ? fa(o.total) + ' تومان' : ''));
      if (o.pay) f.appendChild(mk('span', 'ao-pay', o.pay));
      if (o.go) { var g = mk('a', 'bp-copy', 'پرداخت'); g.href = o.go; f.appendChild(g); }
      if (o.inv) { var iv = mk('a', 'bp-copy', 'فاکتور'); iv.href = o.inv; f.appendChild(iv); }   // paid: the invoice (2026-10-26)
      li.appendChild(f); ul.appendChild(li);
    });
  }
  function acPaint(j) {
    if (j && 'user' in j) ME = j.user || null;
    window.AlphaAcct = { me: ME };
    all('.hdr-acct').forEach(function (b) { var l = b.querySelector('.acct-l'); if (l) l.textContent = ME ? firstName(ME.name) || 'حساب من' : 'ورود'; b.classList.toggle('in', !!ME); b.setAttribute('aria-label', ME ? 'حساب من' : 'ورود یا ثبت‌نام'); });
    var out = $('acOut'), meEl = $('acMe');
    if (out) { out.hidden = !!ME; meEl.hidden = !ME; }
    if (ME && meEl) {
      $('acName').textContent = ME.name; $('acMobile').textContent = String(ME.mobile).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); $('acAv').textContent = (ME.name || '؟').trim().charAt(0);
      var sf = $('acSave'); if (sf) { sf.elements.name.value = ME.name; if (sf.elements.address) sf.elements.address.value = ME.address || ''; sf.elements.pass.value = ''; }
      acOrders(j && j.orders);
    }
    /* the bag: who is ordering */
    var line = $('bagAcct');
    if (line) {
      if (ME) { line.lastChild.innerHTML = ''; line.lastChild.appendChild(document.createTextNode('با حساب ' + ME.name + ' ' + W.order + ' می‌دهید؛ در ')); var lb = document.createElement('button'); lb.type = 'button'; lb.className = 'ac-link'; lb.textContent = '«حساب من»'; lb.onclick = acOpen; line.lastChild.appendChild(lb); line.lastChild.appendChild(document.createTextNode(' دنبالش می‌کنید.')); }
      else if (line.dataset.out) line.lastChild.innerHTML = line.dataset.out;
    }
    if (ME && form) {
      if (!form.elements.name.value) form.elements.name.value = ME.name;
      if (!form.elements.phone.value) form.elements.phone.value = ME.mobile;
      if (form.elements.address && !form.elements.address.value && ME.address) form.elements.address.value = ME.address;
    }
    document.dispatchEvent(new CustomEvent('acct:change', { detail: ME }));
  }
  function acTab(k) {
    ['in', 'up', 'forgot'].forEach(function (x) { var f = $({ 'in': 'acIn', up: 'acUp', forgot: 'acForgot' }[x]); if (f) f.hidden = x !== k; });
    var tabs = acEl.querySelector('.ac-tabs'); if (tabs) tabs.hidden = k === 'forgot';   // the forgotten password is its own step, «بازگشت به ورود» leads back
    all('[role=tab][data-ac-tab]', acEl).forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-ac-tab') === k ? 'true' : 'false'); });
    var f = $({ 'in': 'acIn', up: 'acUp', forgot: 'acForgot' }[k]); var i = f && f.querySelector('input'); if (i && !mobile) setTimeout(function () { i.focus(); }, 60);
  }
  function acOpen() {
    if (!acEl) return;
    if (!acEl.open) { if (acEl.showModal) acEl.showModal(); else acEl.setAttribute('open', ''); }
    if (!acPushed) { try { history.pushState({ awacct: 1 }, '', '#acct'); acPushed = true; } catch (e) {} }
    if (!ME) acTab('in');
    acApi('me').then(acPaint).catch(function () {});
  }
  /* the sheet's own history step: closing it steps back once; that step must not close the bag under it */
  function acClose(fromPop) {
    if (fromPop) acPushed = false;
    if (acEl && acEl.open) acEl.close();
  }
  if (acEl) {
    var outLine = $('bagAcct'); if (outLine) outLine.dataset.out = outLine.lastChild.innerHTML;
    document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-acct-open]'); if (b) { e.preventDefault(); acOpen(); } });   // the header, the footer and the bag's line (redrawn)
    all('[data-acct-close]', acEl).forEach(function (b) { b.addEventListener('click', function () { acClose(); }); });
    acEl.addEventListener('click', function (e) { if (e.target === acEl) acClose(); });
    acEl.addEventListener('close', function () { if (acPushed) { acPushed = false; window.__acSkip = true; try { history.back(); } catch (x) { window.__acSkip = false; } } });
    addEventListener('popstate', function () { if (window.__acSkip) { window.__acSkip = false; return; } if (acEl.open) acClose(true); });
    all('[data-ac-tab]', acEl).forEach(function (b) { b.addEventListener('click', function () { acTab(b.getAttribute('data-ac-tab')); }); });
    all('form[data-ac]', acEl).forEach(function (fm) {
      fm.addEventListener('submit', function (e) {
        e.preventDefault();
        var a = fm.getAttribute('data-ac'), er = fm.querySelector('[role=alert]'), btn = fm.querySelector('button[type=submit]');
        all('[aria-invalid]', fm).forEach(function (i) { i.removeAttribute('aria-invalid'); });
        var bad = function (msg, field) { er.hidden = false; er.className = 'bag-err'; er.textContent = msg; if (field && fm.elements[field]) { fm.elements[field].setAttribute('aria-invalid', 'true'); fm.elements[field].focus(); } };
        var data = {}; all('input, textarea', fm).forEach(function (i) { if (i.name) data[i.name] = i.name === 'mobile' ? en(i.value).replace(/\D/g, '').replace(/^98/, '0').replace(/^9/, '09') : i.value; });
        var codeBox = fm.querySelector('.ac-code');
        if (a === 'forgot' && codeBox && !codeBox.hidden) a = 'reset';
        if (data.mobile !== undefined && a !== 'save' && !/^09\d{9}$/.test(data.mobile)) return bad('شماره موبایل را درست بنویسید؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.', 'mobile');
        if ((a === 'signin' || a === 'signup') && !data.pass) return bad('رمز را بنویسید.', 'pass');
        if (a === 'signup' && String(data.name || '').trim().length < 2) return bad('نام خود را بنویسید.', 'name');
        if (a === 'reset' && !data.code) return bad('کد پیامک را بنویسید.', 'code');
        er.hidden = true; btn.disabled = true; btn.classList.add('busy');
        acApi(a, data).then(function (j) {
          btn.disabled = false; btn.classList.remove('busy');
          if (!j.ok) {
            if (j.have) { acTab('in'); var mi = $('acIn').elements.mobile; mi.value = data.mobile; var e2 = $('acIn').querySelector('[role=alert]'); e2.className = 'bag-err'; e2.hidden = false; e2.textContent = j.error; $('acIn').elements.pass.focus(); return; }
            return bad(j.error || 'نشد؛ دوباره امتحان کنید.', j.field);
          }
          if (a === 'forgot') { codeBox.hidden = false; btn.lastChild.textContent = 'عوض کردن رمز'; er.hidden = false; er.className = 'bag-hint'; er.textContent = 'اگر با این شماره حساب داشته باشید، کد ۵ رقمی تا یک دقیقه دیگر پیامک می‌شود.'; fm.elements.code.focus(); return; }
          if (a === 'save') { er.hidden = false; er.className = 'bag-hint'; er.textContent = 'ذخیره شد.'; setTimeout(function () { er.hidden = true; er.className = 'bag-err'; }, 2400); }
          all('input[type=password]', fm).forEach(function (i) { i.value = ''; });
          acPaint(j);
          if ((a === 'signin' || a === 'signup' || a === 'reset') && bagEl && bagEl.open) acClose();   // back to the bag, now filled
        }).catch(function () { btn.disabled = false; btn.classList.remove('busy'); bad('اینترنت قطع است؛ دوباره امتحان کنید.'); });
      });
    });
    var ob = $('acOutBtn'); if (ob) ob.addEventListener('click', function () { acApi('signout').then(function (j) { acPaint(j); acTab('in'); }).catch(function () {}); });
    var acHash = function (wait) { if (location.hash !== '#acct' || acEl.open) return; try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} setTimeout(acOpen, wait); };
    acHash(300); addEventListener('hashchange', function () { acHash(0); });   // a link to …#acct, from another page or this one
    acApi('me').then(acPaint).catch(function () {});
  }

  loadBag(); refresh();
  /* the cards come priced from the server; a page kept by the browser for a while catches up a few seconds after it opens */
  if (G) { calc(); setTimeout(pollGold, 4000); setInterval(pollGold, 120000); document.addEventListener('visibilitychange', function () { if (!document.hidden) pollGold(); }); }
  if (location.hash === '#bag') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} if (bag.length) setTimeout(openBag, 300); }
  window.AlphaBuy = { message: askMessage, link: link, go: ask, add: add, open: openBag, bag: function () { return bag.slice(); } };
})();
