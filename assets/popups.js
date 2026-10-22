/* Two cards on alphawebsite.ir and on every client site (Ilya, 2026-10-14):
   1. Consent. Accept: a first-party visitor id and the visit (device, browser, where they came from, pages, time)
      go to our own server, and the owner sees them in their panel (Alpha: the CEO panel). Decline: nothing about
      the person is kept; only the day's count of "declined" goes up. No third-party scripts, ever.
   2. Add to home screen, right after. Android / Chrome / Edge / desktop: the browser's own install prompt.
      iPhone / iPad: the two taps in Safari's share menu. Inside Instagram or Telegram's browser: open in Safari or
      Chrome first. Store: again after 3 days if closed. Client sites: every new visit until it is installed.
   Never inside the store's phone frames, never in the installed app. window.AWP holds the page's settings. */
(function () {
  var C = window.AWP; if (!C) return;
  var framed = window.top !== window;
  var ua = navigator.userAgent || '';
  var site = C.scope === 'site';
  var CK = 'awc' + (site && C.base ? '_' + C.slug : '');           // consent cookie, per site on the temporary link
  var IK = site ? 'awi_' + C.slug : 'awi';                        // install card state
  var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true || /[?&]src=app\b/.test(location.search);
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ''));
  var android = /Android/.test(ua);
  var inApp = /Instagram|FBAN|FBAV|Telegram|; wv\)/.test(ua);
  var deferred = null;
  var t0 = Date.now(), active = 0, lastVis = Date.now();

  function cookie(n) { var m = document.cookie.match('(?:^|; )' + n + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : null; }
  function setCookie(n, v, days) {
    document.cookie = n + '=' + encodeURIComponent(v) + '; Max-Age=' + Math.round(days * 86400) + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function sess(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  var quiet = cookie('awq') === '1';                              // our own tests and screenshots

  function vid() {
    var v = cookie('awv');
    if (!v || !/^[a-f0-9]{24,40}$/.test(v)) {
      var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a);
      v = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      setCookie('awv', v, 365);
    }
    return v;
  }
  function ctx() {
    var p = {}; try { p = Object.fromEntries(new URLSearchParams(location.search)); } catch (e) {}
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    return { path: location.pathname + (location.hash && /^#p\d+$/.test(location.hash) ? location.hash : ''), title: document.title.slice(0, 120),
             ref: document.referrer && document.referrer.indexOf(location.origin) !== 0 ? document.referrer.slice(0, 300) : '',
             us: p.utm_source || p.ref || '', um: p.utm_medium || '', uc: p.utm_campaign || '',
             sw: screen.width, sh: screen.height, lang: (navigator.language || '').slice(0, 12), tz: tz.slice(0, 40), app: standalone ? 1 : 0 };
  }
  function send(ev, data) {
    if (framed) return;
    var body = { ev: ev, scope: C.scope, slug: site ? C.slug : '' };
    if (data) for (var k in data) body[k] = data[k];
    var json = JSON.stringify(body);
    try { if (navigator.sendBeacon && navigator.sendBeacon(C.api || '/api/v', new Blob([json], { type: 'application/json' }))) return; } catch (e) {}
    try { fetch(C.api || '/api/v', { method: 'POST', body: json, headers: { 'Content-Type': 'application/json' }, keepalive: true }); } catch (e) {}
  }
  function track(ev) { var d = ctx(); d.vid = vid(); send(ev, d); }

  /* time on the page, while it is visible */
  function seconds() { var s = active + (document.hidden ? 0 : Date.now() - lastVis); return Math.min(3600, Math.round(s / 1000)); }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { active += Date.now() - lastVis; if (cookie(CK) === '1') send('t', { vid: vid(), secs: seconds(), path: location.pathname }); }
    else lastVis = Date.now();
  });

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; document.dispatchEvent(new CustomEvent('awp:installable')); });
  window.addEventListener('appinstalled', function () { store(IK + '_done', '1'); if (cookie(CK) === '1') send('install', { vid: vid() }); else send('install', {}); close(); });
  if (ios && !standalone) setTimeout(function () { document.dispatchEvent(new CustomEvent('awp:installable')); }, 0);

  /* ---------- the card ---------- */
  var root = null, onClose = null;
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text) x.textContent = text; return x; }
  function close() {
    if (!root) return;
    var r = root; root = null; r.classList.add('out');
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 260);
    document.documentElement.classList.remove('awp-on');
    var f = onClose; onClose = null; if (f) f();
  }
  function card(opts) {
    if (root) { root.parentNode.removeChild(root); root = null; }
    root = el('div', 'awp' + (site ? ' awp-site' : ' awp-store'));
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'false'); root.setAttribute('aria-labelledby', 'awpH');
    var box = el('div', 'awp-card'), top = el('div', 'awp-top');
    if (opts.icon) { var im = el('img', 'awp-ic'); im.src = opts.icon; im.alt = ''; im.width = 48; im.height = 48; top.appendChild(im); }
    else { var ic = el('span', 'awp-ic awp-ic-c'); ic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h.01"/><path d="M11.496 2c.324-.016.558.292.529.615a4 4 0 004.235 4.368.713.713 0 01.758.757 4 4 0 004.366 4.237c.323-.03.63.204.614.527a10 10 0 01-2.915 6.566A1 1 0 114.93 4.918 10 10 0 0111.496 2"/><path d="M12 12h.01"/><path d="M16 16h.01"/><path d="M16 3h.01"/><path d="M21 4h.01"/><path d="M21 8h.01"/><path d="M7 14h.01"/><path d="M9 8h.01"/></svg>'; top.appendChild(ic); }
    var tx = el('div', 'awp-tx'), h = el('b', '', opts.title); h.id = 'awpH'; tx.appendChild(h);
    var p = el('p', '', opts.text);
    if (opts.link) { p.appendChild(document.createTextNode(' ')); var a = el('a', '', opts.link[0]); a.href = opts.link[1]; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); }
    tx.appendChild(p); top.appendChild(tx);
    var x = el('button', 'awp-x'); x.type = 'button'; x.setAttribute('aria-label', 'بستن'); x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    x.addEventListener('click', function () { (opts.onX || opts.onNo || close)(); });
    top.appendChild(x); box.appendChild(top);
    if (opts.steps) {
      var ol = el('ol', 'awp-steps');
      opts.steps.forEach(function (s) { var li = el('li'); li.innerHTML = s; ol.appendChild(li); });
      box.appendChild(ol);
    }
    var acts = el('div', 'awp-acts');
    if (opts.yes) { var y = el('button', 'awp-yes', opts.yes); y.type = 'button'; y.addEventListener('click', opts.onYes); acts.appendChild(y); }
    if (opts.no) { var n = el('button', 'awp-no', opts.no); n.type = 'button'; n.addEventListener('click', opts.onNo || close); acts.appendChild(n); }
    if (acts.childNodes.length) box.appendChild(acts);
    root.appendChild(box);
    document.body.appendChild(root);
    document.documentElement.classList.add('awp-on');
    requestAnimationFrame(function () { root && root.classList.add('in'); });
    onClose = opts.onClose || null;
    return root;
  }

  /* ---------- 1. consent ---------- */
  var nameFa = site ? (C.name || '') : 'آلفا وب‌سایت';
  function consent(next) {
    card({
      title: site ? 'اجازه می‌دهید سایت بهتر شود؟' : 'کوکی و آمار بازدید',
      text: site ? nameFa + ' با اجازه شما آمار بازدید را ثبت می‌کند: نوع گوشی و مرورگر، از کجا آمده‌اید و چه صفحه‌هایی دیده‌اید. این اطلاعات فقط پیش خود فروشگاه می‌ماند.'
                 : 'با اجازه شما نوع دستگاه و مرورگر، از کجا آمده‌اید و صفحه‌هایی که می‌بینید را ثبت می‌کنیم تا سایت بهتر شود. این اطلاعات فقط پیش آلفا می‌ماند و به کسی داده نمی‌شود.',
      link: ['حریم خصوصی', C.privacy || '/privacy#visitors'],
      yes: 'قبول', no: 'نه، ممنون',
      onYes: function () { setCookie(CK, '1', 365); track('yes'); close(); },
      onNo: function () { setCookie(CK, '0', 180); send('no', {}); close(); },
      onX: function () { setCookie(CK, '0', 180); send('no', {}); close(); },
      onClose: next
    });
  }

  /* ---------- 2. add to home screen ---------- */
  var SHARE = '<svg class="awp-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v13"/><path d="m16 6-4-4-4 4"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/></svg>';
  var PLUS = '<svg class="awp-i" viewBox="0 0 24 24" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>';
  function installCard(force) {
    if (standalone || (!force && store(IK + '_done') === '1')) return;
    var title = site ? nameFa + ' را روی گوشی‌ات نصب کن' : 'آلفا وب‌سایت را روی گوشی‌ات نصب کن';
    var text = site ? 'دفعه بعد با یک لمس، مثل یک اپ باز می‌شود؛ با نام و لوگوی ' + nameFa + '. بدون اپ‌استور و بدون حجم.'
                    : 'قالب‌ها، قیمت و پنلت با یک لمس؛ مثل یک اپ، بدون اپ‌استور و بدون حجم.';
    var base = { icon: C.icon, title: title, text: text, onClose: null };
    var later = function () { if (site) sess(IK, '1'); else store(IK, String(Date.now())); send('later', {}); close(); };
    if (deferred) {
      base.yes = 'نصب'; base.no = 'بعداً';
      base.onYes = function () {
        var d = deferred; deferred = null;
        d.prompt(); (d.userChoice || Promise.resolve({})).then(function (r) { if (r && r.outcome === 'accepted') store(IK + '_done', '1'); close(); });
      };
      base.onNo = later;
    } else if (inApp) {
      base.text = 'داخل مرورگر ' + (/Telegram/.test(ua) ? 'تلگرام' : 'اینستاگرام') + ' نصب ممکن نیست. صفحه را در ' + (ios ? 'سافاری' : 'کروم') + ' باز کن و از آنجا نصب کن:';
      base.steps = ['دکمه <b>⋯</b> بالای صفحه را بزن و «Open in browser» یا «باز کردن در مرورگر» را انتخاب کن.', ios ? 'در سافاری: ' + SHARE + ' اشتراک‌گذاری و بعد «Add to Home Screen».' : 'در کروم: منوی ⋮ و بعد «نصب برنامه» یا «Add to Home screen».'];
      base.no = 'باشه'; base.onNo = later;
    } else if (ios) {
      base.steps = ['در نوار سافاری دکمه اشتراک‌گذاری ' + SHARE + ' را بزن (در iOS جدید: اول <b>⋯</b>).', 'گزینه ' + PLUS + ' «Add to Home Screen» یا «افزودن به صفحه اصلی» را بزن.', '«Add» را بزن؛ آیکون ' + (site ? nameFa : 'آلفا') + ' روی صفحه اصلی می‌آید.'];
      base.no = 'متوجه شدم'; base.onNo = later;
    } else if (android) {
      base.steps = ['منوی مرورگر <b>⋮</b> را بزن.', '«نصب برنامه» یا «Add to Home screen» را انتخاب کن.'];
      base.no = 'متوجه شدم'; base.onNo = later;
    } else if (!force) return;                                     // desktop browsers without an install prompt
    else { base.steps = ['از منوی مرورگر گزینه «نصب» یا «Install» را بزن.']; base.no = 'باشه'; base.onNo = close; }
    base.onX = later;
    card(base);
    send('shown', {});
  }
  /* the store (2026-10-21): a first-time visitor is not asked to install anything; owners (signed in) and people on their
     third visit are. Visits are counted once per browser session. */
  if (!site && sess('aw-visit') !== '1') { sess('aw-visit', '1'); store('aw-visits', String((+(store('aw-visits') || 0)) + 1)); }
  function installDue() {
    if (C.flow) return false;                                       // signup, payment, welcome: nothing on top of the steps (2026-10-22); /welcome has its own card
    if (standalone || quiet || store(IK + '_done') === '1') return false;
    if (site) return sess(IK) !== '1';                              // client sites: every new visit until installed
    if (!C.owner && +(store('aw-visits') || 0) < 3) return false;
    var last = +(store(IK) || 0); return !last || Date.now() - last > 3 * 86400000;   // the store: every 3 days
  }

  /* ---------- order: intro (store home) / splash (client sites) → consent → install ---------- */
  function start() {
    if (C.demo) return;                                             // a demo site: no consent or install card (it was a second set of cards for the same visitor)
    if (framed || standalone && cookie(CK) !== null) { if (cookie(CK) === '1') track('pv'); return; }
    if (quiet) { if (cookie(CK) === '1') track('pv'); return; }
    var c = cookie(CK);
    var thenInstall = function () { if (!site) return; setTimeout(function () { if (installDue()) installCard(false); }, 900); };   // the store: never right after the consent card
    if (c === '1') { track('pv'); if (installDue()) setTimeout(function () { installCard(false); }, 2500); }
    else if (c === '0') { if (installDue()) setTimeout(function () { installCard(false); }, 2500); }
    else setTimeout(function () { consent(thenInstall); }, site ? 500 : 700);
  }
  var waitFor = site ? 'splash:done' : 'intro:done';
  var started = false;
  var go = function () { if (started) return; started = true; start(); };
  document.addEventListener(waitFor, go);
  setTimeout(go, site ? 2600 : 3200);                               // never wait forever
  if (!site && !document.querySelector('.intro')) setTimeout(go, 0);

  window.AWP.vid = function () { return cookie(CK) === '1' ? vid() : ''; };
  window.AWP.install = function (force) { installCard(force !== false); };
  window.AWP.consent = function () { consent(null); };
})();
