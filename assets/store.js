/* Alpha Website: small behaviours for the store, signup, panel and admin. No libraries, no external calls. */
(function () {
  var d = document;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };

  /* mobile menu sheet */
  var mb = d.querySelector('.menu-btn'), sheet = d.getElementById('sheet');
  if (mb && sheet) {
    var set = function (open) { mb.setAttribute('aria-expanded', open ? 'true' : 'false'); mb.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو'); sheet.hidden = !open; };
    mb.addEventListener('click', function () { set(sheet.hidden); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) { set(false); mb.focus(); } });
    d.addEventListener('click', function (e) { if (!sheet.hidden && !sheet.contains(e.target) && !mb.contains(e.target)) set(false); });
    $$('a', sheet).forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  }

  /* copy buttons */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-copy'), old = b.textContent;
      var done = function () { b.textContent = 'کپی شد'; setTimeout(function () { b.textContent = old; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, function () {}); else { var i = d.createElement('input'); i.value = t; d.body.appendChild(i); i.select(); try { d.execCommand('copy'); done(); } catch (e) {} i.remove(); }
    });
  });

  /* layout filter chips */
  var chips = $$('button.chip[data-f]');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      var f = c.getAttribute('data-f');
      $$('.lay').forEach(function (l) { l.hidden = f !== 'all' && l.getAttribute('data-type') !== f; });
    });
  });

  /* live demo inside a phone: the screenshot shows first, the real site fades in on top */
  function live(box, layout) {
    var scr = box.querySelector('.scr'); if (!scr) return;
    var img = scr.querySelector('img'); if (img) img.src = '/assets/shots/' + layout + '.webp';
    var old = scr.querySelector('iframe'); if (old) old.remove();
    var f = d.createElement('iframe');
    f.src = '/s/demo-' + layout; f.title = 'نمونه زنده قالب'; f.tabIndex = -1; f.setAttribute('loading', 'lazy');
    f.addEventListener('load', function () { setTimeout(function () { f.classList.add('ready'); }, 250); });
    scr.appendChild(f);
  }
  var lv = d.getElementById('live');
  if (lv) {
    var start = function () { live(lv, lv.getAttribute('data-layout')); };
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    if (d.readyState === 'complete') idle(start); else window.addEventListener('load', function () { idle(start); });
  }

  /* home: café / restaurant / shop switcher with a sliding pill */
  var seg = d.querySelector('.seg');
  if (seg) {
    var pill = seg.querySelector('.seg-pill'), tabs = $$('[role=tab]', seg), cap = d.getElementById('liveCap');
    var place = function (b, instant) {
      if (instant) pill.style.transition = 'none';
      pill.style.left = b.offsetLeft + 'px'; pill.style.width = b.offsetWidth + 'px';
      if (instant) { pill.offsetWidth; pill.style.transition = ''; }
    };
    var cur = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    place(cur, true);
    window.addEventListener('resize', function () { place(cur, true); });
    tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b === cur) return;
        cur = b; tabs.forEach(function (t) { t.setAttribute('aria-selected', t === b ? 'true' : 'false'); });
        place(b);
        var lay = b.getAttribute('data-layout');
        lv.setAttribute('data-layout', lay); live(lv, lay);
        if (cap) { cap.href = '/layouts/' + lay; cap.textContent = 'نمونه زنده قالب «' + b.getAttribute('data-name') + '»؛ امتحانش کن'; }
      });
    });
  }

  /* pricing: monthly / yearly */
  var bt = $$('.bill-toggle button');
  bt.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-bill');
      bt.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      $$('.tier [data-m]').forEach(function (el) { el.textContent = el.getAttribute('data-' + k); });
    });
  });

  /* show / hide password */
  $$('.pw-t').forEach(function (b) {
    b.addEventListener('click', function () {
      var i = b.parentNode.querySelector('input'), show = i.type === 'password';
      i.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز');
    });
  });

  /* ask before deleting */
  $$('form[data-confirm]').forEach(function (f) { f.addEventListener('submit', function (e) { if (!window.confirm(f.getAttribute('data-confirm'))) e.preventDefault(); }); });

  /* file pickers in Persian, whatever the browser's language */
  $$('input[type=file]').forEach(function (inp) {
    var w = d.createElement('span'); w.className = 'attach';
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    var btn = d.createElement('span'); btn.className = 'attach-btn'; btn.textContent = 'انتخاب فایل';
    var nm = d.createElement('span'); nm.className = 'attach-name'; nm.textContent = 'فایلی انتخاب نشده';
    w.appendChild(btn); w.appendChild(nm);
    inp.addEventListener('change', function () { nm.textContent = inp.files && inp.files.length ? inp.files[0].name : 'فایلی انتخاب نشده'; });
  });

  /* ready-made replies fill the ticket box */
  $$('[data-fill]').forEach(function (b) {
    b.addEventListener('click', function () { var t = d.getElementById('replyBody'); if (t) { t.value = b.getAttribute('data-fill'); t.focus(); } });
  });
})();
