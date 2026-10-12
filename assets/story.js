/* Instagram story cards (Ilya, 2026-10-12: "like Strava, a ready-to-share image with a tiny Alpha sign").
   Draws a 1080 × 1920 image in the browser from the owner's own site: an item, a special offer, or "order from
   our site" with a QR. Three styles. Shared through the phone's share sheet (Instagram → Story) or saved.
   Persian text is shaped by the browser itself, with the site's own font; every picture is on our host, so the
   canvas is never tainted. The Alpha sign is English, small, at the bottom. */
(function () {
  var D = window.STORY; if (!D) return;
  var W = 1080, H = 1920;
  var cv = document.getElementById('storyCanvas'), ctx = cv.getContext('2d');
  var FA = '"IRANYekanX FaNum", "AW Grotesk", Tahoma, sans-serif', EN = '"AW Grotesk Full", "Helvetica Neue", Arial, sans-serif';
  var form = document.getElementById('storyForm');
  var cache = {};
  var fa = function (n) { return Number(n).toLocaleString('fa-IR'); };

  function img(src) {
    if (!src) return Promise.resolve(null);
    if (cache[src]) return cache[src];
    return (cache[src] = new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }));
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cover(im, x, y, w, h, r) {
    if (!im) return;
    var s = Math.max(w / im.width, h / im.height), iw = im.width * s, ih = im.height * s;
    ctx.save(); if (r) { rr(x, y, w, h, r); ctx.clip(); }
    ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
  }
  function font(px, w, en) { ctx.font = (w || 400) + ' ' + px + 'px ' + (en ? EN : FA); }
  function lines(text, max, n) {
    var words = String(text || '').split(/\s+/).filter(Boolean), out = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; });
    if (cur) out.push(cur);
    if (out.length > n) { out = out.slice(0, n); out[n - 1] = out[n - 1].replace(/\s*\S*$/, '') + '…'; }
    return out;
  }
  /* Right-aligned (RTL) or centred block of wrapped text; returns the y after it. */
  function text(t, x, y, px, w, color, max, n, align) {
    font(px, w); ctx.fillStyle = color; ctx.direction = 'rtl'; ctx.textAlign = align || 'right'; ctx.textBaseline = 'alphabetic';
    lines(t, max, n).forEach(function (l) { y += px * 1.25; ctx.fillText(l, x, y); });
    return y;
  }
  function pill(t, cx, y, px, bg, fg, en) {
    font(px, 700, en); ctx.direction = en ? 'ltr' : 'rtl';
    var w = ctx.measureText(t).width + px * 1.6, h = px * 1.9;
    ctx.fillStyle = bg; rr(cx - w / 2, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, cx, y + h / 2 + px * 0.06);
    ctx.textBaseline = 'alphabetic';
    return { w: w, h: h };
  }
  function pillRight(t, right, y, px, bg, fg) {
    font(px, 800); ctx.direction = 'rtl';
    var w = ctx.measureText(t).width + px * 1.4, h = px * 1.8;
    ctx.fillStyle = bg; rr(right - w, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, right - w / 2, y + h / 2 + px * 0.06);
    ctx.textBaseline = 'alphabetic';
    return h;
  }
  function circleLogo(im, cx, cy, r, ring) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
    if (ring) { ctx.fillStyle = ring; ctx.fill(); }
    ctx.clip(); if (im) cover(im, cx - r, cy - r, r * 2, r * 2); ctx.restore();
  }
  /* The business, at the top: logo + name on a soft chip. */
  function header(logo, color, chip) {
    font(40, 800); ctx.direction = 'rtl';
    var nw = Math.min(ctx.measureText(D.name).width, 620), w = nw + 150, x = (W - w) / 2, y = 110;
    if (chip) { ctx.fillStyle = chip; rr(x, y, w, 110, 55); ctx.fill(); }
    circleLogo(logo, x + w - 62, y + 55, 40, 'rgba(255,255,255,.9)');
    ctx.fillStyle = color; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(D.name, x + w - 120, y + 57, 620); ctx.textBaseline = 'alphabetic';
  }
  /* Tiny, English, like Strava's mark: the stacked alpha wordmark + "POWERED BY / Alpha Agency". */
  function sign(dark, alpha, y) {
    var im = dark ? alpha.white : alpha.black, col = dark ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.62)';
    var lw = 54, lh = im ? lw * im.height / im.width : 0;
    font(17, 600, true); ctx.direction = 'ltr'; var t1 = 'POWERED BY'; var w1 = ctx.measureText(t1).width + 17 * 0.18 * t1.length;
    font(25, 700, true); var w2 = ctx.measureText('Alpha Agency').width;
    var tw = Math.max(w1, w2), total = lw + 16 + tw, x = (W - total) / 2;
    ctx.globalAlpha = dark ? .8 : .7; if (im) ctx.drawImage(im, x, y - lh / 2, lw, lh); ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.textAlign = 'left';
    font(17, 600, true); ctx.letterSpacing = '3px'; ctx.fillText(t1, x + lw + 16, y - 6); ctx.letterSpacing = '0px';
    font(25, 700, true); ctx.fillText('Alpha Agency', x + lw + 16, y + 22);
  }
  function urlLine(prefix, color, y, align, x) {
    font(34, 500); ctx.direction = 'rtl'; ctx.fillStyle = color; ctx.textAlign = align || 'center';
    var pre = prefix + ' ', u = D.urlText;
    font(34, 500); var pw = ctx.measureText(pre).width; font(34, 600, true); var uw = ctx.measureText(u).width;
    var startRight = align === 'right' ? x : (W + pw + uw) / 2;
    font(34, 500); ctx.textAlign = 'right'; ctx.fillText(pre, startRight, y);
    font(34, 600, true); ctx.direction = 'ltr'; ctx.textAlign = 'right'; ctx.fillText(u, startRight - pw, y);
  }
  function qr(x, y, size, fg, bg) {
    if (!window.qrcode) return;
    var q = qrcode(0, 'M'); q.addData(D.url); q.make();
    var n = q.getModuleCount(), pad = size * 0.08, cell = (size - pad * 2) / n;
    ctx.fillStyle = bg; rr(x, y, size, size, size * 0.08); ctx.fill(); ctx.fillStyle = fg;
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(Math.floor(x + pad + c * cell), Math.floor(y + pad + r * cell), Math.ceil(cell), Math.ceil(cell));
  }
  function priceText(it) { return it && Number(it.price) > 0 ? fa(it.price) + ' تومان' : ''; }

  function state() {
    var f = new FormData(form);
    return { type: f.get('type') || 'item', style: f.get('style') || 'full', item: f.get('item'), head: (f.get('head') || '').trim(), sub: (f.get('sub') || '').trim(), price: f.get('price') === '1' };
  }
  var drawing = 0;
  function draw() {
    var s = state(), my = ++drawing, T = D.theme;
    var it = D.items.filter(function (x) { return String(x.id) === String(s.item); })[0] || D.items[0] || null;
    if (s.type === 'online') it = null;
    form.querySelectorAll('[data-for]').forEach(function (el) { el.hidden = el.getAttribute('data-for').split(' ').indexOf(s.type) < 0; });
    var photoSrc = s.type === 'online' ? (D.cover || '') : (it ? it.image : '');
    Promise.all([img(photoSrc), img(D.logo), img(D.alphaWhite), img(D.alphaBlack),
                 document.fonts ? document.fonts.load('800 80px "IRANYekanX FaNum"') : null,
                 document.fonts ? document.fonts.load('700 30px "AW Grotesk Full"') : null]).then(function (r) {
      if (my !== drawing) return;
      var photo = r[0], logo = r[1], alpha = { white: r[2], black: r[3] };
      var title = s.type === 'offer' ? (s.head || 'پیشنهاد ویژه امروز') : (it ? it.name : D.name);
      var desc = s.type === 'offer' ? s.sub : (it ? it.desc : '');
      var price = s.type === 'item' || (s.type === 'offer' && s.price) ? priceText(it) : '';
      ctx.clearRect(0, 0, W, H); ctx.letterSpacing = '0px';

      if (s.style === 'full') {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
        if (photo) cover(photo, 0, 0, W, H);
        var g = ctx.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 520);
        g = ctx.createLinearGradient(0, 860, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.45, 'rgba(0,0,0,.62)'); g.addColorStop(1, 'rgba(0,0,0,.9)'); ctx.fillStyle = g; ctx.fillRect(0, 860, W, H - 860);
        header(logo, '#fff', 'rgba(255,255,255,.16)');
        if (s.type === 'online') {
          circleLogo(logo, W / 2, 760, 120, '#fff');
          var yy = text(D.name, W / 2, 900, 84, 800, '#fff', 900, 2, 'center');
          if (D.tagline) yy = text(D.tagline, W / 2, yy + 6, 40, 500, 'rgba(255,255,255,.85)', 860, 2, 'center');
          qr((W - 420) / 2, yy + 60, 420, '#111', '#fff');
          pill('برای سفارش اسکن کنید', W / 2, yy + 510, 36, T.accent, T.onaccent);
          urlLine('یا بزنید:', 'rgba(255,255,255,.9)', yy + 650);
        } else {
          var y = 1210, R = W - 90;
          if (it && it.cat && s.type === 'item') { font(32, 700); y += pillRight(it.cat, R, y, 30, 'rgba(255,255,255,.18)', '#fff') + 18; }
          y = text(title, R, y, 92, 800, '#fff', 900, 2);
          if (desc) y = text(desc, R, y + 6, 42, 500, 'rgba(255,255,255,.86)', 900, 2);
          if (price) y += pillRight(price, R, y + 34, 50, T.accent, T.onaccent) + 34;
          urlLine('سفارش آنلاین:', 'rgba(255,255,255,.9)', y + 92, 'right', R);
        }
        sign(true, alpha, 1846);
      } else if (s.style === 'card') {
        ctx.fillStyle = T.accent; ctx.fillRect(0, 0, W, H);
        var gg = ctx.createRadialGradient(W * .8, 200, 50, W * .8, 200, 1300); gg.addColorStop(0, 'rgba(255,255,255,.22)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
        header(logo, T.onaccent, null);
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24; ctx.fillStyle = T.surface; rr(90, 330, 900, 1250, 64); ctx.fill(); ctx.restore();
        if (s.type === 'online') {
          circleLogo(logo, W / 2, 520, 110, T.bg);
          var y2 = text(D.name, W / 2, 650, 72, 800, T.ink, 800, 2, 'center');
          if (D.tagline) y2 = text(D.tagline, W / 2, y2 + 4, 36, 500, T.muted, 780, 2, 'center');
          qr((W - 460) / 2, y2 + 50, 460, T.ink, T.surface);
          text('برای سفارش اسکن کنید', W / 2, y2 + 540, 40, 700, T.ink, 800, 1, 'center');
        } else {
          if (photo) cover(photo, 130, 370, 820, 820, 44); else { ctx.fillStyle = T.bg; rr(130, 370, 820, 820, 44); ctx.fill(); }
          var y3 = text(title, W - 150, 1210, 62, 800, T.ink, 780, 2);
          if (desc) y3 = text(desc, W - 150, y3 + 2, 34, 500, T.muted, 780, 2);
          if (price) { font(52, 800); ctx.fillStyle = T.accent; ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.fillText(price, W - 150, Math.min(y3 + 84, 1540)); }
        }
        pill(D.urlText, W / 2, 1640, 34, 'rgba(255,255,255,.2)', T.onaccent, true);
        sign(is_dark(T.accent), alpha, 1846);
      } else {
        ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
        header(logo, T.ink, null);
        if (s.type === 'online') {
          circleLogo(logo, W / 2, 560, 130, T.surface);
          var y4 = text(D.name, W / 2, 710, 80, 800, T.ink, 880, 2, 'center');
          if (D.tagline) y4 = text(D.tagline, W / 2, y4 + 4, 38, 500, T.muted, 860, 2, 'center');
          qr((W - 480) / 2, y4 + 60, 480, T.ink, T.surface);
          pill('برای سفارش اسکن کنید', W / 2, y4 + 580, 36, T.accent, T.onaccent);
        } else {
          if (photo) cover(photo, 120, 300, 840, 840, 60); else { ctx.fillStyle = T.surface; rr(120, 300, 840, 840, 60); ctx.fill(); }
          var y5 = text(title, W / 2, 1180, 84, 800, T.ink, 900, 2, 'center');
          if (desc) y5 = text(desc, W / 2, y5 + 4, 40, 500, T.muted, 860, 2, 'center');
          if (price) pill(price, W / 2, y5 + 40, 48, T.accent, T.onaccent);
        }
        urlLine('سفارش آنلاین:', T.ink, 1700);
        sign(is_dark(T.bg), alpha, 1846);
      }
      document.getElementById('storyShare').disabled = false;
    });
  }
  function is_dark(hex) {
    var h = String(hex).replace('#', ''); var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45;
  }
  var t; form.addEventListener('input', function () { clearTimeout(t); t = setTimeout(draw, 120); });
  form.addEventListener('change', draw);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  function blob() { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }
  function save(b) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'story-' + D.slug + '.png';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  var msg = document.getElementById('storyMsg');
  document.getElementById('storyShare').addEventListener('click', function () {
    blob().then(function (b) {
      var file = new File([b], 'story-' + D.slug + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file] }).then(function () { msg.textContent = 'در اینستاگرام «استوری» را انتخاب کن. لینک سایت را با استیکر «لینک» روی استوری بگذار.'; })
          .catch(function () {});
      } else { save(b); msg.textContent = 'عکس ذخیره شد. در اینستاگرام، استوری تازه بساز و این عکس را از گالری انتخاب کن.'; }
    });
  });
  document.getElementById('storySave').addEventListener('click', function () { blob().then(function (b) { save(b); msg.textContent = 'عکس ذخیره شد.'; }); });
  draw();
})();
