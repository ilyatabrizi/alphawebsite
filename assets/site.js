/* Cart → message to the shop. Every order is also saved to the owner's panel, so it isn't lost if a messenger is blocked.
   Works in both families: classic layouts (cart bar + sheet) and glass layouts (the «سبد» tab). */
(function () {
  var cart = {};
  var fa = function (n) { return Number(n).toLocaleString('fa-IR'); };
  var $ = function (id) { return document.getElementById(id); };
  var sheet = $('sheet');

  /* Opened from a table's QR card (?t=12): the order already says which table. Kept for the visit. */
  (function () {
    var t = '';
    try { t = (new URLSearchParams(location.search).get('t') || '').replace(/\D/g, '').slice(0, 4); } catch (e) {}
    try { if (t) sessionStorage.setItem('aw-table', t); else t = sessionStorage.getItem('aw-table') || ''; } catch (e) {}
    var note = $('cNote');
    if (t && note && !note.value) note.value = 'میز ' + Number(t).toLocaleString('fa-IR', { useGrouping: false });
  })();

  function totals() {
    var count = 0, sum = 0;
    Object.keys(cart).forEach(function (k) { count += cart[k].q; sum += cart[k].q * cart[k].p; });
    return { count: count, sum: sum };
  }
  function set(id, v) { var el = $(id); if (el) el.textContent = v; }
  function render() {
    var t = totals();
    if ($('cartbar')) $('cartbar').hidden = t.count === 0;
    document.body.classList.toggle('has-cart', t.count > 0);
    if ($('bagEmpty')) { $('bagEmpty').hidden = t.count > 0; $('bagFull').hidden = t.count === 0; }
    set('cartCount', fa(t.count)); set('cartTotal', fa(t.sum)); set('sumTotal', fa(t.sum));
    var ul = $('lines'); ul.innerHTML = '';
    Object.keys(cart).forEach(function (k) {
      var it = cart[k];
      var li = document.createElement('li');
      li.innerHTML = '<span></span><span class="qty"><button type="button" data-d="-1" aria-label="کم کردن">−</button><b></b><button type="button" data-d="1" aria-label="اضافه کردن">+</button></span>';
      li.firstChild.textContent = it.n;
      li.querySelector('b').textContent = fa(it.q);
      li.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          it.q += Number(b.dataset.d);
          if (it.q <= 0) delete cart[k];
          render();
          if (totals().count === 0 && sheet && sheet.open) sheet.close();
        });
      });
      ul.appendChild(li);
    });
    document.dispatchEvent(new CustomEvent('cart:change', { detail: t }));
  }
  document.querySelectorAll('.add').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.dataset.id;
      cart[id] = cart[id] || { n: b.dataset.name, p: Number(b.dataset.price), q: 0 };
      cart[id].q++;
      b.classList.add('pop'); setTimeout(function () { b.classList.remove('pop'); }, 180);
      render();
      document.dispatchEvent(new CustomEvent('cart:add'));
    });
  });
  if ($('openCart')) $('openCart').addEventListener('click', function () { if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', ''); });

  function message() {
    var t = totals(), lines = ['سفارش جدید از سایت ' + window.SITE.name];
    Object.keys(cart).forEach(function (k) { var it = cart[k]; lines.push(fa(it.q) + ' × ' + it.n + ' — ' + fa(it.q * it.p)); });
    lines.push('جمع: ' + fa(t.sum) + ' تومان');
    lines.push('نام: ' + $('cName').value.trim() + ' | تلفن: ' + $('cPhone').value.trim());
    if ($('cNote').value.trim()) lines.push('آدرس/میز: ' + $('cNote').value.trim());
    return lines.join('\n');
  }

  document.querySelectorAll('.ch').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!$('cName').value.trim() || !$('cPhone').value.trim()) { $('cName').reportValidity(); $('cPhone').reportValidity(); return; }
      var text = message(), ch = b.dataset.ch, href = b.dataset.href;
      var items = Object.keys(cart).map(function (k) { return { id: Number(k), n: cart[k].n, q: cart[k].q, p: cart[k].p }; });
      var body = new URLSearchParams({ slug: window.SITE.slug, items: JSON.stringify(items), name: $('cName').value, phone: $('cPhone').value, note: $('cNote').value, channel: ch });
      try { if (!navigator.sendBeacon('/api/order', body)) throw 0; } catch (e) { fetch('/api/order', { method: 'POST', body: body, keepalive: true }); }
      if (ch === 'chat') {
        if (sheet && sheet.open) sheet.close();
        if (window.AlphaChat) window.AlphaChat.order($('cName').value.trim(), $('cPhone').value.trim(), text);
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

  var q = $('q');
  if (q) q.addEventListener('input', function () {
    var v = q.value.trim();
    document.querySelectorAll('.menu .item, #v-menu .card').forEach(function (el) { el.hidden = v !== '' && el.dataset.name.indexOf(v) === -1; });
    document.querySelectorAll('#v-menu .g-cat, .menu .cat').forEach(function (sec) { sec.hidden = !sec.querySelector('.item:not([hidden]), .card:not([hidden])'); });
  });
  render();
})();
