/* Cart → message to the shop. Every order is also saved to the owner's panel, so it isn't lost if a messenger is blocked.
   Works in both families: classic layouts (cart bar + sheet) and glass layouts (the «سبد» tab).
   Also: item choices (size, colour, milk…), stock limits, how the order is received (at the table, pickup,
   delivery with its fee and minimum) and the table bar that calls the waiter from a QR card. */
(function () {
  var S = window.SITE || {};
  var cart = {};                       // key (item id + choices) → { id, n, o, p, q, s }
  var fa = function (n) { return Number(n).toLocaleString('fa-IR'); };
  var $ = function (id) { return document.getElementById(id); };
  var sheet = $('sheet');
  var table = '';

  /* Opened from a table's QR card (?t=12): kept for the visit. */
  try { table = (new URLSearchParams(location.search).get('t') || '').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/\D/g, '').slice(0, 4); } catch (e) {}
  if (table === '0') table = '';
  try { if (table) sessionStorage.setItem('aw-table-' + S.slug, table); else table = sessionStorage.getItem('aw-table-' + S.slug) || ''; } catch (e) {}
  var tableFa = table ? Number(table).toLocaleString('fa-IR', { useGrouping: false }) : '';

  /* ---------- how the order is received ---------- */
  var modes = $('oModes'), fee = modes ? Number(modes.getAttribute('data-fee')) || 0 : 0, min = modes ? Number(modes.getAttribute('data-min')) || 0 : 0;
  function mode() { var r = document.querySelector('input[name=omode]:checked'); return r ? r.value : ''; }
  if (modes) {
    var tl = modes.querySelector('[data-mode=table]');
    if (tl && table) { tl.hidden = false; $('oTable').textContent = tableFa; }
    var first = table && tl ? 'table' : (S.type === 'shop' && S.delivery ? 'delivery' : 'pickup');
    var r0 = modes.querySelector('input[value=' + first + ']'); if (r0) r0.checked = true;
    if (modes.querySelectorAll('label:not([hidden])').length < 2) modes.classList.add('single');
    modes.addEventListener('change', render);
  }

  function totals() {
    var count = 0, sum = 0;
    Object.keys(cart).forEach(function (k) { count += cart[k].q; sum += cart[k].q * cart[k].p; });
    var f = mode() === 'delivery' ? fee : 0;
    return { count: count, sum: sum, fee: f, total: sum + f, short: mode() === 'delivery' && min > sum ? min - sum : 0 };
  }
  function inCart(id) { var n = 0; Object.keys(cart).forEach(function (k) { if (cart[k].id === id) n += cart[k].q; }); return n; }
  function set(id, v) { var el = $(id); if (el) el.textContent = v; }

  function render() {
    var t = totals(), m = mode();
    if ($('cartbar')) $('cartbar').hidden = t.count === 0;
    document.body.classList.toggle('has-cart', t.count > 0);
    if ($('bagEmpty')) { $('bagEmpty').hidden = t.count > 0; $('bagFull').hidden = t.count === 0; }
    set('cartCount', fa(t.count)); set('cartTotal', fa(t.sum)); set('sumTotal', fa(t.total));
    if ($('feeRow')) { $('feeRow').hidden = !t.fee; set('feeVal', fa(t.fee)); }
    if ($('oDelivNote')) $('oDelivNote').hidden = m !== 'delivery';
    var warn = $('minWarn');
    if (warn) { warn.hidden = !t.short; if (t.short) warn.textContent = 'حداقل سفارش برای ارسال ' + fa(min) + ' تومان است؛ ' + fa(t.short) + ' تومان دیگر اضافه کنید یا «تحویل حضوری» را بزنید.'; }
    document.querySelectorAll('.ch').forEach(function (b) { b.disabled = !!t.short; });
    var note = $('cNote'), lab = $('cNoteLabel');
    if (note && lab) {
      note.required = m === 'delivery';
      lab.textContent = m === 'delivery' ? 'آدرس کامل' : m === 'table' ? 'توضیح (اختیاری)' : m === 'pickup' ? 'توضیح یا ساعت تحویل (اختیاری)' : (S.type === 'shop' ? 'آدرس ارسال' : 'آدرس یا شماره میز');
    }
    var ul = $('lines'); if (!ul) return;
    ul.innerHTML = '';
    Object.keys(cart).forEach(function (k) {
      var it = cart[k];
      var li = document.createElement('li');
      li.innerHTML = '<span></span><span class="qty"><button type="button" data-d="-1" aria-label="کم کردن">−</button><b></b><button type="button" data-d="1" aria-label="اضافه کردن">+</button></span>';
      li.firstChild.textContent = it.n;
      li.querySelector('b').textContent = fa(it.q);
      var plus = li.querySelector('[data-d="1"]');
      if (it.s !== null && inCart(it.id) >= it.s) { plus.disabled = true; plus.title = 'موجودی همین است'; }
      li.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var d = Number(b.dataset.d);
          if (d > 0 && it.s !== null && inCart(it.id) >= it.s) return;
          it.q += d;
          if (it.q <= 0) delete cart[k];
          render();
          if (totals().count === 0 && sheet && sheet.open) sheet.close();
        });
      });
      ul.appendChild(li);
    });
    document.dispatchEvent(new CustomEvent('cart:change', { detail: t }));
  }

  function put(b, choice) {
    var id = Number(b.dataset.id), stock = b.dataset.stock === undefined ? null : Number(b.dataset.stock);
    if (stock !== null && inCart(id) >= stock) { flashBtn(b, 'موجودی همین است'); return false; }
    var keys = choice ? Object.keys(choice) : [];
    var key = id + (keys.length ? '|' + keys.map(function (g) { return g + ':' + choice[g]; }).join('|') : '');
    var label = b.dataset.name + (keys.length ? ' (' + keys.map(function (g) { return choice[g]; }).join('، ') + ')' : '');
    cart[key] = cart[key] || { id: id, n: label, o: choice || null, p: Number(b.dataset.price), q: 0, s: stock };
    cart[key].q++;
    b.classList.add('pop'); setTimeout(function () { b.classList.remove('pop'); }, 180);
    render();
    document.dispatchEvent(new CustomEvent('cart:add'));
    return true;
  }
  function flashBtn(b, text) {
    var old = b.getAttribute('aria-label'); b.classList.add('no'); b.setAttribute('aria-label', text); b.title = text;
    setTimeout(function () { b.classList.remove('no'); b.setAttribute('aria-label', old); b.title = ''; }, 1400);
  }

  /* ---------- choices: a small sheet with one row of chips per group ---------- */
  var pick = null, pickFor = null;
  function picker(b) {
    var groups; try { groups = JSON.parse(b.dataset.opts); } catch (e) { groups = []; }
    if (!groups.length) { put(b); return; }
    if (!pick) {
      pick = document.createElement('dialog'); pick.className = 'opt-sheet'; pick.setAttribute('aria-labelledby', 'optTitle');
      pick.innerHTML = '<form method="dialog" class="opt-in"><div class="opt-h"><h2 id="optTitle"></h2><button value="close" class="x" formnovalidate aria-label="بستن">×</button></div>'
        + '<div id="optGroups"></div><p class="opt-err" id="optErr" role="alert" hidden></p><button type="button" class="opt-go" id="optGo">افزودن به سبد</button></form>';
      document.body.appendChild(pick);
      pick.addEventListener('click', function (e) { if (e.target === pick) pick.close(); });
      $('optGo').addEventListener('click', function () {
        var choice = {}, missing = '';
        pick.querySelectorAll('fieldset').forEach(function (fs) {
          var c = fs.querySelector('input:checked'); if (c) choice[fs.dataset.g] = c.value; else if (!missing) missing = fs.dataset.g;
        });
        if (missing) { $('optErr').hidden = false; $('optErr').textContent = missing + ' را انتخاب کنید.'; return; }
        if (put(pickFor, choice)) pick.close();
        else { $('optErr').hidden = false; $('optErr').textContent = 'از این آیتم بیشتر از این موجود نیست.'; }
      });
    }
    pickFor = b;
    $('optTitle').textContent = b.dataset.name;
    $('optErr').hidden = true;
    var box = $('optGroups'); box.innerHTML = '';
    groups.forEach(function (g, gi) {
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
    if (pick.showModal) pick.showModal(); else pick.setAttribute('open', '');
  }

  document.querySelectorAll('.add').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.stock !== undefined && inCart(Number(b.dataset.id)) >= Number(b.dataset.stock)) { flashBtn(b, 'موجودی همین است'); return; }
      if (b.dataset.opts) picker(b); else put(b);
    });
  });
  if ($('openCart')) $('openCart').addEventListener('click', function () { if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', ''); });

  /* ---------- sending ---------- */
  var MODE_TEXT = { table: 'سر میز', pickup: 'تحویل حضوری', delivery: S.type === 'shop' ? 'ارسال' : 'ارسال با پیک' };
  function message() {
    var t = totals(), m = mode(), lines = ['سفارش جدید از سایت ' + S.name];
    Object.keys(cart).forEach(function (k) { var it = cart[k]; lines.push(fa(it.q) + ' × ' + it.n + ' — ' + fa(it.q * it.p)); });
    if (t.fee) { lines.push('جمع اقلام: ' + fa(t.sum) + ' تومان'); lines.push('هزینه ارسال: ' + fa(t.fee) + ' تومان'); }
    lines.push('جمع: ' + fa(t.total) + ' تومان');
    if (m) lines.push('نوع: ' + MODE_TEXT[m] + (m === 'table' ? ' ' + tableFa : ''));
    lines.push('نام: ' + $('cName').value.trim() + ' | تلفن: ' + $('cPhone').value.trim());
    if ($('cNote').value.trim()) lines.push((m === 'delivery' ? 'آدرس: ' : m ? 'توضیح: ' : 'آدرس/میز: ') + $('cNote').value.trim());
    return lines.join('\n');
  }

  document.querySelectorAll('.ch').forEach(function (b) {
    b.addEventListener('click', function () {
      var name = $('cName'), phone = $('cPhone'), note = $('cNote');
      if (!name.value.trim()) { name.reportValidity ? name.reportValidity() : 0; name.focus(); return; }
      if (!phone.value.trim()) { phone.reportValidity ? phone.reportValidity() : 0; phone.focus(); return; }
      if (note.required && !note.value.trim()) { note.reportValidity ? note.reportValidity() : 0; note.focus(); return; }
      if (totals().short) return;
      var text = message(), ch = b.dataset.ch, href = b.dataset.href;
      var items = Object.keys(cart).map(function (k) { return { id: cart[k].id, q: cart[k].q, o: cart[k].o }; });
      var body = new URLSearchParams({ slug: S.slug, items: JSON.stringify(items), name: name.value, phone: phone.value, note: note.value,
        channel: ch, mode: mode(), table: mode() === 'table' ? table : '' });
      try { if (!navigator.sendBeacon('/api/order', body)) throw 0; } catch (e) { fetch('/api/order', { method: 'POST', body: body, keepalive: true }); }
      if (ch === 'chat') {
        if (sheet && sheet.open) sheet.close();
        if (window.AlphaChat) window.AlphaChat.order(name.value.trim(), phone.value.trim(), text);
        cart = {}; render();
        return;
      }
      if (ch === 'whatsapp') href += '?text=' + encodeURIComponent(text);
      else if (ch === 'sms') href += (/iPhone|iPad/.test(navigator.userAgent) ? '&' : '?') + 'body=' + encodeURIComponent(text);
      else if (ch === 'bale' || ch === 'telegram') {
        try { navigator.clipboard.writeText(text); $('copied').hidden = false; } catch (e) {}
      }
      window.location.href = href;
    });
  });

  /* ---------- the table bar: call the waiter, ask for the bill ---------- */
  var bar = $('tableBar');
  if (bar && table && S.calls) {
    bar.hidden = false; set('tbNo', tableFa); document.body.classList.add('has-table');
    /* out of the way while the customer fills in the bag or chats */
    document.addEventListener('view:change', function (e) { bar.hidden = e.detail === 'bag' || e.detail === 'chat'; });
    if (/^#(bag|chat)$/.test(location.hash)) bar.hidden = true;
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

  var q = $('q');
  if (q) q.addEventListener('input', function () {
    var v = q.value.trim();
    document.querySelectorAll('.menu .item, #v-menu .card').forEach(function (el) { el.hidden = v !== '' && el.dataset.name.indexOf(v) === -1; });
    document.querySelectorAll('#v-menu .g-cat, .menu .cat').forEach(function (sec) { sec.hidden = !sec.querySelector('.item:not([hidden]), .card:not([hidden])'); });
  });
  render();
})();
