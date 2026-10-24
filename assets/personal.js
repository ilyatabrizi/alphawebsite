/* The personal résumé site (views_personal.php, v13): the header that follows the sections, the work lightbox, the
   printable résumé, and the contact form that lands in the person's panel. Sample sites send nothing and explain. */
(function () {
  var S = window.SITE || {};
  var $ = function (id) { return document.getElementById(id); };
  var all = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var en = function (s) { return String(s || '').replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }); };

  /* the header: a shadow once the page moves, the current section underlined */
  var top = document.querySelector('.cv-top');
  var onScroll = function () { if (top) top.classList.toggle('up', window.scrollY > 8); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var links = all('.cv-nav a');
  if ('IntersectionObserver' in window && links.length) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* «دانلود رزومه»: the browser's print, which saves a PDF; the print sheet shows the résumé only */
  all('[data-print]').forEach(function (b) { b.addEventListener('click', function () { window.print(); }); });

  /* a piece of work, large */
  var lb = $('cvLb');
  all('.cv-card [data-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = b.closest('.cv-card'), img = card.querySelector('img');
      $('cvLbImg').src = img ? img.src : ''; $('cvLbImg').alt = img ? img.alt : '';
      $('cvLbH').textContent = card.querySelector('h3').textContent;
      var p = card.querySelector('.cv-card-b p:not(.cv-price)'); $('cvLbP').textContent = p ? p.textContent : '';
      if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
    });
  });
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  /* sample sites: messengers and calls explain instead of opening */
  var toastT = 0;
  function toast(t) {
    var el = $('cvToast');
    if (!el) { el = document.createElement('div'); el.id = 'cvToast'; el.className = 'cv-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 3800);
  }
  if (S.demo) all('.cv-chl, .cv-ask, .cv-links a').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); toast('در سایت واقعی، این دکمه گفتگو یا پروفایل خود شما را باز می‌کند.'); });
  });

  /* the contact form */
  var f = $('cvForm');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('cvErr'), done = $('cvDone'), btn = f.querySelector('button[type=submit]');
    var name = f.elements.name.value.trim(), phone = en(f.elements.phone.value).replace(/\D/g, '').replace(/^98/, '0'), note = f.elements.note.value.trim();
    if (phone.charAt(0) === '9') phone = '0' + phone;
    var bad = name.length < 2 ? ['name', 'نامتان را بنویسید.'] : (!/^09\d{9}$/.test(phone) ? ['phone', 'شماره موبایل را درست بنویسید؛ مثل ۰۹۱۲۱۲۳۴۵۶۷.'] : (note.length < 5 ? ['note', 'پیامتان را کمی کامل‌تر بنویسید.'] : null));
    all('[aria-invalid]', f).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    if (bad) { err.hidden = false; err.textContent = bad[1]; f.elements[bad[0]].setAttribute('aria-invalid', 'true'); f.elements[bad[0]].focus(); return; }
    err.hidden = true; btn.disabled = true;
    fetch('/api/contact', { method: 'POST', body: new URLSearchParams({ slug: S.slug, name: name, phone: phone, note: note }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        btn.disabled = false;
        if (x.s !== 200 || !x.j.ok) { err.hidden = false; err.textContent = x.j.error || 'نرسید؛ دوباره امتحان کنید.'; return; }
        f.reset(); done.hidden = false;
        done.textContent = x.j.demo ? 'در سایت واقعی، این پیام همین لحظه در پنل صاحب سایت ثبت می‌شود و به ایمیل و بله‌اش خبر می‌رسد.' : 'پیامتان رسید؛ به‌زودی با شما تماس می‌گیرم.';
      })
      .catch(function () { btn.disabled = false; err.hidden = false; err.textContent = 'اینترنت قطع است؛ دوباره امتحان کنید.'; });
  });

  /* the site chat (chat.js, 2026-10-24): a sheet opened from the bar; chat.js asks AlphaUI whether it is in view */
  var cs = $('chatSheet'), csOpen = false;
  var openChat = function () { if (!cs) return; if (cs.showModal) cs.showModal(); else cs.setAttribute('open', ''); csOpen = true; document.dispatchEvent(new CustomEvent('view:change', { detail: 'chat' })); };
  if (cs) {
    $('chatClose').addEventListener('click', function () { if (cs.open) cs.close(); });
    cs.addEventListener('close', function () { csOpen = false; document.dispatchEvent(new CustomEvent('view:change', { detail: '' })); });
    cs.addEventListener('click', function (e) { if (e.target === cs) cs.close(); });
    all('[data-act="chat"]').forEach(function (b) { b.addEventListener('click', openChat); });
    if (location.hash === '#chat') setTimeout(openChat, 300);
  }
  window.AlphaUI = window.AlphaUI || { openChat: openChat, current: function () { return csOpen ? 'chat' : ''; } };

  /* a shared link to one piece (?p=12 or #p12) opens it */
  var m = /^#p(\d+)$/.exec(location.hash) || /[?&]p=(\d+)/.exec(location.search);
  if (m) { var c = document.getElementById('p' + m[1]); if (c) { var ob = c.querySelector('[data-open]'); setTimeout(function () { c.scrollIntoView({ block: 'center' }); if (ob) ob.click(); }, 300); } }
})();
