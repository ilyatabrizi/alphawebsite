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
  var CAT = S.fam === 'catalog', FOOD = S.fam === 'food';
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
    $('bagToastT').textContent = text; el.hidden = false; el.classList.remove('out');
    clearTimeout(toastT); toastT = setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.hidden = true; }, 260); }, 3200);
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
    if (table && FOOD) m.push(['table', 'سر میز ' + tableFa, 'سفارش سر میز شما می‌آید.']);
    m.push(['pickup', FOOD ? 'بیرون‌بر، تحویل حضوری' : 'تحویل حضوری', 'سفارش آماده می‌شود و خودتان تحویل می‌گیرید.']);
    if (S.del.on) m.push(['delivery', FOOD ? 'ارسال با پیک' : 'ارسال', (S.del.area ? S.del.area + '؛ ' : '') + 'هزینه ارسال ' + toman(S.del.fee) + (S.del.min > 0 ? '؛ حداقل سفارش ' + toman(S.del.min) : '')]);
    return m;
  }
  function fee() { return mode === 'delivery' && S.del ? S.del.fee : 0; }
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
    day.slots.forEach(function (s) { sbox.appendChild(chip('bks', s.s, s.l, '', s.s === bkSlot, function () { bkSlot = s.s; })); });
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
        + '<span class="bl-p"></span><button type="button" class="bl-x" aria-label="حذف"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg></button>';
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
    var empty = !bag.length;
    $('bagEmpty').hidden = !empty; form.hidden = empty; ul.hidden = empty;
    if ($('bagClosed')) $('bagClosed').hidden = true;
    if (empty) return;
    renderBook();
    /* how it is received */
    var ms = modes(), box = $('bagModes');
    if (box) {
      if (!ms.some(function (m) { return m[0] === mode; })) mode = ms.length ? (ms.some(function (m) { return m[0] === 'table'; }) ? 'table' : (me.mode && ms.some(function (m) { return m[0] === me.mode; }) ? me.mode : ms[0][0])) : '';
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
    var opt = mode === 'table';
    all('.bf input[name=name], .bf input[name=phone]', form).forEach(function (i) { var sp = i.parentNode.querySelector('span'); sp.textContent = sp.textContent.replace(/ \(اختیاری\)$/, '') + (opt ? ' (اختیاری)' : ''); });
    /* totals */
    var sum = subtotal(), f = fee(), dl = $('bagSum'), rows = [];
    rows.push([(CAT ? 'موارد انتخابی' : 'جمع ' + fa(count()) + ' مورد'), sum > 0 ? fa(sum) + ' تومان' : 'در گفتگو']);
    if (mode === 'delivery') rows.push(['هزینه ارسال', toman(f)]);
    if (!CAT || sum > 0) rows.push(['مبلغ کل', sum > 0 ? fa(sum + f) + ' تومان' : 'در گفتگو', 1]);
    dl.innerHTML = '';
    rows.forEach(function (r) { var d = document.createElement('div'); if (r[2]) d.className = 'tot'; d.innerHTML = '<dt></dt><dd></dd>'; d.firstChild.textContent = r[0]; d.lastChild.textContent = r[1]; dl.appendChild(d); });
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
  function openBag() {
    if (!bagEl) return;
    var ps = $('psheet'); if (ps && ps.open) ps.close();
    $('bagMain').hidden = false; $('bagDone').hidden = true;
    renderBag();
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
    bagEl.addEventListener('close', function () { if (pushed) closeBag(false); });
    bagEl.addEventListener('click', function (e) { if (e.target === bagEl) closeBag(); });
    all('[data-bag-close]', bagEl).forEach(function (b) { b.addEventListener('click', function () { closeBag(); }); });
    all('[data-bag-shop]', bagEl).forEach(function (b) { b.addEventListener('click', function () { closeBag(); setTimeout(function () { var p = $('products'); if (p) p.scrollIntoView({ behavior: 'smooth' }); }, 120); }); });
    addEventListener('popstate', function () { if (bagEl.open) { pushed = false; closeBag(true); } });
    form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    form.addEventListener('input', function () { var err = $('bagErr'); if (err.dataset.kind === 'v') { err.hidden = true; err.dataset.kind = ''; } });
  }
  all('[data-bag-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openBag(); }); });

  function fail(msg, field) {
    var err = $('bagErr'); err.hidden = false; err.textContent = msg; err.dataset.kind = 'v';
    if (field && form.elements[field]) { form.elements[field].focus(); form.elements[field].setAttribute('aria-invalid', 'true'); }
    else err.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function orderMessage(r, f) {
    var L = [], word = W.order;
    L.push('سلام، ' + word + ' جدید از سایت ' + S.name + (r.no ? '\n' + 'شماره ' + word + ': ' + fa(r.no) : ''));
    r.lines.forEach(function (l) { L.push('• ' + (CAT ? '' : fa(l.q) + '× ') + l.n + (l.p > 0 ? '، ' + fa(l.p * l.q) + ' تومان' : '')); });
    if (r.gold) L.push(r.gold);
    if (r.mode === 'delivery') L.push('هزینه ارسال: ' + (r.fee > 0 ? fa(r.fee) + ' تومان' : 'رایگان'));
    if (r.total > 0) L.push('جمع کل: ' + fa(r.total) + ' تومان');
    if (r.when) L.push(r.when);
    if (r.mode === 'table') L.push('سر میز ' + fa(r.table));
    else if (r.mode === 'pickup') L.push('تحویل: حضوری');
    else if (r.mode === 'delivery') L.push('ارسال به: ' + f.address);
    if (f.name || f.phone) L.push('نام: ' + [f.name, f.phone].filter(Boolean).join('، '));
    if (f.note) L.push((CAT ? 'زمان و توضیح: ' : 'توضیح: ') + f.note);
    L.push(siteUrl(0));
    return L.join('\n');
  }
  function submit() {
    if (sending || !bag.length) return;
    all('[aria-invalid]', form).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    var f = { name: form.elements.name.value.trim(), phone: en(form.elements.phone.value).replace(/\D/g, '').replace(/^98/, '0'), address: form.elements.address ? form.elements.address.value.trim() : '', note: form.elements.note.value.trim() };
    if (f.phone && f.phone.charAt(0) === '9') f.phone = '0' + f.phone;
    if (!CAT && !mode) return fail('نحوه تحویل را انتخاب کنید.');
    if (mode !== 'table') {
      if (f.name.length < 2) return fail('نام خود را بنویسید.', 'name');
      if (!/^09\d{9}$/.test(f.phone)) return fail('شماره موبایل را درست بنویسید؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.', 'phone');
    } else if (f.phone && !/^09\d{9}$/.test(f.phone)) return fail('شماره موبایل را درست بنویسید یا خالی بگذارید.', 'phone');
    if (mode === 'delivery' && f.address.length < 8) return fail('آدرس کامل را بنویسید.', 'address');
    if (BK && (!bkDay || !bkSlot)) { fail(bkDay ? 'ساعت را انتخاب کنید.' : 'روز را انتخاب کنید.'); var bb = $('bagBook'); if (bb) bb.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    var c = pickedCh();
    sending = true; $('bagGo').disabled = true; $('bagGo').classList.add('busy');
    var body = new URLSearchParams({ slug: S.slug, v: '2', items: JSON.stringify(bag.map(function (l) { var it = ITEMS[l.id]; return { id: l.id, q: l.q, o: l.o || {}, p: it ? it.p : 0 }; })),
      mode: mode, table: table, name: f.name, phone: f.phone, address: mode === 'delivery' ? f.address : '', note: f.note, channel: c ? c.ch : (B.ch || '') });
    if (BK) { body.set('bk', '1'); body.set('when_date', bkDay); body.set('when_slot', bkSlot); }
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
  function done(r, f, c) {
    var text = orderMessage(r, f), word = W.order;
    if (!S.demo) { bag = []; saveBag(); refresh(); bkDay = ''; bkSlot = ''; bkKey = ''; }
    /* the order is done: coming back from the messenger must not reopen an empty bag */
    if (pushed) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} pushed = false; }
    $('bagMain').hidden = true; var d = $('bagDone'); d.hidden = false;
    $('bdMsg').textContent = text;
    var send = $('bdSend'), note = $('bdNote'), cp = $('bdCopy');
    note.hidden = true; cp.hidden = false;
    if (S.demo) {
      $('bdH').textContent = 'در سایت واقعی، ' + word + ' این‌جا با شماره ثبت می‌شود';
      $('bdP').textContent = 'و به پنل فروشنده می‌رود؛ مشتری هم با یک لمس به ' + (c ? c.label : 'پیام‌رسان') + ' فروشنده می‌رود و این پیام آماده است:';
      send.textContent = 'همین را برای کسب‌وکارم می‌خواهم'; send.href = '/start?layout=' + encodeURIComponent(S.layout || ''); send.target = '_top'; send.onclick = null;
      cp.hidden = true;
    } else {
      $('bdH').textContent = word + ' شماره ' + fa(r.no) + ' ثبت شد';
      if (c && c.pre) $('bdP').textContent = 'برای نهایی شدن، پیام آماده را در ' + c.label + ' بفرستید؛ زمان و پرداخت همان‌جا هماهنگ می‌شود.';
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
        /* phones: WhatsApp and Telegram open right away; the button stays for a second try */
        if (c.pre && mobile) setTimeout(function () { logTap(0, c.ch); location.href = url; }, 700);
      } else if (S.tel) { send.textContent = 'تماس با ' + S.name; send.href = 'tel:' + S.tel; send.target = ''; send.onclick = null; }
      else send.hidden = true;
    }
    cp.onclick = function () { if (copy(text)) { cp.lastChild.textContent = 'کپی شد'; setTimeout(function () { cp.lastChild.textContent = 'کپی پیام ' + word; }, 1800); } };
    try { d.focus({ preventScroll: true }); } catch (e) {}
    $('bagBody').scrollTop = 0;
  }

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
    $('psBuy').disabled = it.off; $('psBuy').hidden = it.off;
    if ($('psQty')) $('psQty').hidden = it.off;
    if (ps.showModal) ps.showModal(); else ps.setAttribute('open', '');
    try { history.replaceState(history.state, '', '#p' + it.id); } catch (e) {}
  }
  function chosen() {
    var choice = {}, missing = '';
    all('fieldset', $('psOpts')).forEach(function (fs) {
      var c = fs.querySelector('input:checked'); if (c) choice[fs.dataset.g] = c.value; else if (!missing) missing = fs.dataset.g;
    });
    return { choice: choice, missing: missing };
  }
  if (ps) {
    $('psBuy').addEventListener('click', function () {
      if (!cur || cur.off) return;
      var c = chosen();
      if (c.missing) { $('psErr').hidden = false; $('psErr').textContent = c.missing + ' را انتخاب کنید.'; return; }
      if (add(cur, c.choice, psQ)) { ps.close(); if (CAT) openBag(); }
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
    var openBtn = card.querySelector('.card-open'), buy = card.querySelector('[data-buy]');
    if (openBtn) openBtn.addEventListener('click', function () { openSheet(card); });
    if (buy) buy.addEventListener('click', function () {
      var it = ITEMS[+card.dataset.id] || item(card);
      if (it.opts.length) { openSheet(card); return; }
      if (CAT && qtyOf(it.id)) { openBag(); return; }
      buy.classList.add('pop'); setTimeout(function () { buy.classList.remove('pop'); }, 200);
      add(it, null, 1);
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

  loadBag(); refresh();
  /* the cards come priced from the server; a page kept by the browser for a while catches up a few seconds after it opens */
  if (G) { calc(); setTimeout(pollGold, 4000); setInterval(pollGold, 120000); document.addEventListener('visibilitychange', function () { if (!document.hidden) pollGold(); }); }
  if (location.hash === '#bag') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} if (bag.length) setTimeout(openBag, 300); }
  window.AlphaBuy = { message: askMessage, link: link, go: ask, add: add, open: openBag, bag: function () { return bag.slice(); } };
})();
