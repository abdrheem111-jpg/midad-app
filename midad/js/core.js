/* ==========================================================================
   مِداد — السبورة الرياضية الذكية
   النواة: الإعدادات، التخزين، الأرقام العربية، أدوات الواجهة
   تصميم وفكرة: أ. عبدالرحيم مبارك الرحبي
   ========================================================================== */
(function () {
  'use strict';
  const M = (window.M = window.M || {});
  // الاتجاه العربي حتى لو فُتحت الصفحة داخل إطار لا يحدده
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');

  M.APP = {
    name: 'مِداد',
    title: 'السبورة الرياضية الذكية',
    designer: 'أ. عبدالرحيم مبارك الرحبي',
    version: '1.0.0',
  };

  /* ---------------- التخزين المحلي (آمن) ---------------- */
  M.store = {
    get(key, def) {
      try {
        const v = localStorage.getItem('midad.' + key);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(key, val) {
      try {
        localStorage.setItem('midad.' + key, JSON.stringify(val));
        return true;
      } catch (e) {
        return false;
      }
    },
    del(key) {
      try { localStorage.removeItem('midad.' + key); } catch (e) { /* تجاهل */ }
    },
  };

  /* ---------------- الإعدادات ---------------- */
  const defaults = {
    numerals: 'arabic',   // arabic: ٠١٢ | western: 012
    vars: 'arabic',       // arabic: س ص | latin: x y
    angle: 'deg',         // deg | rad (للآلة الحاسبة والمعلم الذكي)
    theme: 'chalk',       // chalk | night | white
    unit: 40,             // طول الوحدة بالبكسل على السبورة
    smartInk: true,       // التعرف الذكي على الأشكال
    font: 'tajawal',       // tajawal | cairo | almarai | naskh | kufi
    aiStrategy: 'steps',  // steps | socratic | hints | simple | challenge
    grade: 'المرحلة المتوسطة',
    student: 'طالب',
    gradeNum: 5,           // الصف الحالي في المنهج العُماني (١–١٢)
    role: '',              // teacher | student (يُسأل في أول تشغيل)
    inkDigits: 'arabic',   // أرقام الكتابة اليدوية المتوقعة
  };
  M.settings = Object.assign({}, defaults, M.store.get('settings', {}));
  M.saveSettings = function () {
    M.store.set('settings', M.settings);
    M.emit('settings');
  };

  /* ---------------- ناقل أحداث بسيط ---------------- */
  const listeners = {};
  M.on = (ev, fn) => ((listeners[ev] = listeners[ev] || []).push(fn), fn);
  M.emit = (ev, data) => (listeners[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });

  /* ---------------- الأرقام العربية ---------------- */
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  /** تحويل أي أرقام عربية/فارسية إلى أرقام غربية (للمعالجة) */
  M.toWestern = function (s) {
    return String(s)
      .replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d))
      .replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d))
      .replace(/٫/g, '.')
      .replace(/٬/g, '')
      .replace(/،/g, ',')
      .replace(/؛/g, ';');
  };

  /** تحويل الأرقام في نص إلى الشكل المختار في الإعدادات */
  M.loc = function (s) {
    s = String(s);
    if (M.settings.numerals !== 'arabic') return s;
    return s
      .replace(/(\d)\.(\d)/g, '$1٫$2')
      .replace(/[0-9]/g, (d) => AR_DIGITS[d]);
  };

  /** تنسيق عدد للعرض */
  M.fmt = function (n, digits) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    if (!Number.isFinite(n)) return n > 0 ? '∞' : '−∞';
    digits = digits == null ? 4 : digits;
    let v = Math.abs(n) < 1e-12 ? 0 : n;
    let s;
    if (Math.abs(v) >= 1e9 || (Math.abs(v) < 1e-5 && v !== 0)) {
      s = v.toExponential(3).replace('e+', '×10^').replace('e-', '×10^-');
    } else {
      s = String(parseFloat(v.toFixed(digits)));
    }
    s = s.replace(/^-/, '-');
    return M.loc(s);
  };

  /** تحويل عدد عشري إلى كسر (بسط، مقام) عبر الكسور المستمرة */
  M.toFraction = function (x, maxDen) {
    maxDen = maxDen || 1000;
    if (!Number.isFinite(x)) return null;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(b);
      const h2 = a * h1 + h0; const k2 = a * k1 + k0;
      if (k2 > maxDen) break;
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
      if (Math.abs(x - h1 / k1) < 1e-9) break;
      b = 1 / (b - a);
      if (!Number.isFinite(b)) break;
    }
    if (k1 === 0 || Math.abs(x - h1 / k1) > 1e-9) return null;
    return { n: sign * h1, d: k1 };
  };

  /** عرض عدد ككسر HTML إن أمكن */
  /** أسس بصيغة مرتفعة للعرض النصي: س^٢ ⇐ س² */
  M.prettyPow = function (t) {
    const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
    return String(t).replace(/\^\(?(-?[0-9٠-٩]+)\)?/g, (m, d) => M.toWestern(d).split('').map((c) => SUP[c] || c).join(''));
  };
  M.fracHTML = function (x) {
    const f = M.toFraction(x);
    if (!f || f.d === 1 || Math.abs(x) > 1e6) return M.fmt(x);
    const neg = f.n < 0 ? '−' : '';
    return `<span class="mfrac-wrap">${neg}<span class="mfrac"><span>${M.loc(Math.abs(f.n))}</span><span>${M.loc(f.d)}</span></span></span>`;
  };

  /** اسم المتغير حسب الإعداد */
  const VAR_AR = { x: 'س', y: 'ص', z: 'ع', a: 'أ', b: 'ب', c: 'جـ', k: 'ك', m: 'م', n: 'ن', t: 'ن', r: 'نق' };
  M.varName = (v) => (M.settings.vars === 'arabic' && VAR_AR[v] ? VAR_AR[v] : v);

  /** تنسيق نقطة (س، ص) */
  M.pointStr = (x, y) => `(${M.fmt(x, 3)}، ${M.fmt(y, 3)})`;

  /* ---------------- أدوات DOM ---------------- */
  M.$ = (sel, root) => (root || document).querySelector(sel);
  M.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  M.h = function (tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return el;
  };
  M.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  M.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  M.debounce = function (fn, ms) {
    let t;
    return function () { clearTimeout(t); const args = arguments; t = setTimeout(() => fn.apply(this, args), ms); };
  };
  M.rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  M.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  M.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  /** خط الواجهة والسبورة الحالي */
  M.fontFamily = () => ({ tajawal: 'Tajawal', cairo: 'Cairo', almarai: 'Almarai', naskh: "'Noto Naskh Arabic'", kufi: "'Reem Kufi'" }[M.settings.font] || 'Tajawal') + ", 'Segoe UI', Tahoma, sans-serif";
  M.cssVar = (name) => getComputedStyle(document.body).getPropertyValue(name).trim();

  /* ---------------- الأيقونات ---------------- */
  const ICONS = {
    select: 'M5 3l6.5 17 2.4-7.1L21 10.5z',
    pan: 'M8 13V5.5a1.5 1.5 0 0 1 3 0V11 M11 10.5V4a1.5 1.5 0 0 1 3 0v7 M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.8 7-6.4 7-2.7 0-4.4-1.2-5.6-3.6L3.3 13a1.5 1.5 0 0 1 2.5-1.6L8 14',
    pen: 'M4 20l4.2-1L19.5 7.7a2.1 2.1 0 0 0-3-3L5.2 15.8z M14.5 6.5l3 3',
    highlighter: 'M8.5 11.5l-4.5 4.5v3h3l4.5-4.5 M8.5 11.5L15 5l4 4-6.5 6.5z M3 21h8',
    eraser: 'M15.5 3.5l5 5L10 19H5.5l-3-3z M9 20h12 M11 8l5 5',
    laser: 'M12 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0 M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
    text: 'M5 5h14 M12 5v14 M9 19h6',
    line: 'M5 19L19 5',
    arrow: 'M5 19L19 5 M10 5h9v9',
    rect: 'M4 6h16v12H4z',
    ellipse: 'M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0',
    triangle: 'M12 4l9 16H3z',
    rtri: 'M5 4v16h15z M5 15.5h4.5V20',
    polygon: 'M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z',
    compass: 'M12 5.5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M11 7.3L6 21 M13 7.3L18 21 M8 15.5h8',
    measure: 'M3 17L17 3l4 4L7 21z M7.5 12.5l2 2 M10.5 9.5l2 2 M13.5 6.5l2 2',
    angle: 'M4 20h16 M4 20L15 6 M10.5 20a6.5 6.5 0 0 0-2.4-5',
    image: 'M4 5h16v14H4z M4 16l5-5 4 4 3-3 4 4 M15.5 9.5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
    protractor: 'M3 18a9 9 0 0 1 18 0z M12 18l4.5-6 M12 9.3v2 M6.3 12l1.4 1.2 M17.7 12l-1.4 1.2',
    ruler: 'M2 8.5h20v7H2z M6 8.5v3 M10 8.5v2 M14 8.5v3 M18 8.5v2',
    trash: 'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v5 M14 11v5',
    undo: 'M9 14L4 9l5-5 M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
    redo: 'M15 14l5-5-5-5 M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
    plus: 'M12 5v14 M5 12h14',
    minus: 'M5 12h14',
    close: 'M6 6l12 12 M18 6L6 18',
    chevR: 'M9 6l6 6-6 6',
    chevL: 'M15 6l-6 6 6 6',
    chevD: 'M6 9l6 6 6-6',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M19.4 13.5l1.6 1.2-1.9 3.3-1.9-.8a7.5 7.5 0 0 1-2.1 1.2L14.8 21h-3.8l-.3-2.1a7.5 7.5 0 0 1-2.1-1.2l-1.9.8L4.8 15l1.6-1.2a7.6 7.6 0 0 1 0-2.4L4.8 10l1.9-3.3 1.9.8a7.5 7.5 0 0 1 2.1-1.2L11 3h3.8l.3 2.3a7.5 7.5 0 0 1 2.1 1.2l1.9-.8 1.9 3.3-1.6 1.2a7.6 7.6 0 0 1 0 2.4z',
    fullscreen: 'M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5',
    download: 'M12 4v11 M7 10l5 5 5-5 M5 20h14',
    upload: 'M12 20V9 M7 14l5-5 5 5 M5 4h14',
    save: 'M5 4h11l3 3v13H5z M8 4v5h7V4 M8 20v-6h8v6',
    sparkles: 'M12 3l1.9 4.9L18.8 9.8l-4.9 1.9L12 16.6l-1.9-4.9L5.2 9.8l4.9-1.9z M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z M5 3.5l.6 1.6 1.6.6-1.6.6L5 7.9l-.6-1.6-1.6-.6 1.6-.6z',
    algebra: 'M8.5 20c2.2 0 2.3-2 3-8s1-8 3.4-8 M7.5 11h7.5 M14.5 14l5.5 6 M20 14l-5.5 6',
    geometry: 'M12 3l9 16H3z M12 13m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
    numbers: 'M9.5 4L7.5 20 M16.5 4l-2 16 M4 9h16.5 M3.5 15h16.5',
    stats: 'M4 20V11 M9.5 20V5 M15 20v-7 M20.5 20V8 M2 20h20',
    target: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0 M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
    users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21a7 7 0 0 1 14 0 M16 3.5a4 4 0 0 1 0 7.5 M22 21a7 7 0 0 0-4-6.3',
    timer: 'M12 13m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0 M12 9v4l2.5 2.5 M9.5 2h5',
    dice: 'M4 4h16v16H4z M8.5 8.5h.01 M15.5 8.5h.01 M12 12h.01 M8.5 15.5h.01 M15.5 15.5h.01',
    shuffle: 'M3 7h3.5c4 0 5.5 10 10 10H21 M18 14l3 3-3 3 M3 17h3.5c1.5 0 2.6-1.2 3.5-2.8 M13.5 9.8C14.4 8.2 15.5 7 17 7h4 M18 4l3 3-3 3',
    curtain: 'M3 3h18 M5 3v18 M19 3v18 M5 3c0 8 4 10 7 11 M19 3c0 8-4 10-7 11',
    spotlight: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M3 3l5 5 M21 3l-5 5 M3 21l5-5 M21 21l-5-5',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0z M8 6H4.5a3.5 3.5 0 0 0 3.8 4.4 M16 6h3.5a3.5 3.5 0 0 1-3.8 4.4 M12 13v4 M8 21h8 M9.5 17h5v4h-5z',
    info: 'M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M12 11v6 M12 7.5h.01',
    send: 'M4 12l16-8-6 16-3-7z M11 13l9-9',
    camera: 'M4 8h3.5l2-3h5l2 3H20v11H4z M12 13.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0',
    page: 'M6 3h9l4 4v14H6z M14 3v5h5',
    pageAdd: 'M6 3h9l4 4v14H6z M14 3v5h5 M12.5 11v6 M9.5 14h6',
    zoomIn: 'M10.5 10.5m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M15.5 15.5L21 21 M10.5 7.5v6 M7.5 10.5h6',
    zoomOut: 'M10.5 10.5m-6.5 0a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0-13 0 M15.5 15.5L21 21 M7.5 10.5h6',
    grid: 'M4 4h16v16H4z M4 9.3h16 M4 14.6h16 M9.3 4v16 M14.6 4v16',
    board: 'M3 4h18v12H3z M8 20l4-4 4 4 M12 16v4',
    copy: 'M8 8h12v12H8z M16 8V4H4v12h4',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z',
    play: 'M7 4.5v15l12.5-7.5z',
    pause: 'M7 5h3.5v14H7z M13.5 5H17v14h-3.5z',
    reset: 'M4 12a8 8 0 1 0 2.4-5.7 M4 4v4.5h4.5',
    book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5',
    keyboard: 'M3 6h18v12H3z M7 10h.01 M11 10h.01 M15 10h.01 M7 14h10',
    fill: 'M12 3L4 11l6 6 8-8z M19 14s2 2.4 2 3.8a2 2 0 0 1-4 0c0-1.4 2-3.8 2-3.8z',
    dash: 'M3 12h3.5 M10 12h4 M17.5 12H21',
    wand: 'M4 20L15 9 M13 7l4 4 M17.5 3v3 M16 4.5h3 M20.5 8v2.5 M19.3 9.2h2.5 M10.5 3.5v2 M9.5 4.5h2',
    layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5',
    move: 'M12 3v18 M3 12h18 M12 3l-3 3 M12 3l3 3 M12 21l-3-3 M12 21l3-3 M3 12l3-3 M3 12l3 3 M21 12l-3-3 M21 12l-3 3',
    function: 'M4 20V4 M4 20h16 M5 17c3-9 5-11 7-11s3 6 5 6 2-2 3-3',
    point: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    midpoint: 'M3 18L21 6 M12 12m-2.2 0a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0-4.4 0',
    mirror: 'M12 3v18 M9 7L4 17h5z M15 7l5 10h-5z',
    rotate: 'M20 12a8 8 0 1 1-2.4-5.7 M20 4v4.5h-4.5',
    scale: 'M4 20h7v-7H4z M13 11V4h7v7 M11 13l7-7',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    hash: 'M4 9h16 M4 15h16 M10 3L8 21 M16 3l-2 18',
    percent: 'M19 5L5 19 M7 7m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
    moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z',
    heart: 'M12 20s-7.5-4.5-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10z',
    print: 'M7 9V3h10v6 M7 17H4v-7h16v7h-3 M7 14h10v7H7z',
    menu: 'M4 6h16 M4 12h16 M4 18h16',
    search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4',
    cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5',
    circleLab: 'M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0 M12 12L20.5 12 M12 12L16.2 4.6 M17 12a5 5 0 0 0-2.5-4.3',
    radial: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
    face: 'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M9 10h.01 M15 10h.01 M9 15c1.5 1.3 4.5 1.3 6 0',
  };
  M.icon = function (name, cls) {
    const d = ICONS[name] || ICONS.info;
    return `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  };

  /* ---------------- التنبيهات ---------------- */
  M.toast = function (msg, opts) {
    opts = opts || {};
    const root = M.$('#toasts');
    if (!root) return;
    const el = M.h('div', { class: 'toast ' + (opts.type || '') });
    el.innerHTML = `<span>${msg}</span>`;
    (opts.actions || (opts.action ? [opts.action] : [])).forEach((a) => {
      const b = M.h('button', { class: 'toast-act' }, a.label);
      b.onclick = () => { a.fn(); el.remove(); };
      el.appendChild(b);
    });
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, opts.time || 2600);
  };

  /* ---------------- النوافذ المنبثقة ---------------- */
  M.modal = function (opts) {
    const root = M.$('#modalRoot');
    const back = M.h('div', { class: 'modal-back' });
    const box = M.h('div', { class: 'modal ' + (opts.size || '') , role: 'dialog', 'aria-modal': 'true' });
    const head = M.h('div', { class: 'modal-head' });
    head.innerHTML = `<h3>${opts.icon ? M.icon(opts.icon) : ''}<span>${opts.title || ''}</span></h3>`;
    const x = M.h('button', { class: 'icon-btn', title: 'إغلاق', html: M.icon('close') });
    head.appendChild(x);
    const body = M.h('div', { class: 'modal-body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    box.append(head, body);
    back.appendChild(box);
    root.appendChild(back);
    requestAnimationFrame(() => back.classList.add('show'));
    const close = () => {
      back.classList.remove('show');
      setTimeout(() => back.remove(), 200);
      document.removeEventListener('keydown', onKey);
      if (opts.onClose) opts.onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    x.onclick = close;
    back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
    return { el: box, body, close };
  };

  /** نافذة سؤال بسيطة */
  M.prompt = function (title, label, def) {
    return new Promise((resolve) => {
      const wrap = M.h('div', { class: 'stack' });
      const inp = M.h('input', { class: 'inp', value: def || '' });
      const ok = M.h('button', { class: 'btn primary' }, 'موافق');
      wrap.append(M.h('label', { class: 'lbl' }, label), inp, ok);
      let done = false;
      const m = M.modal({ title, body: wrap, size: 'sm', onClose: () => { if (!done) resolve(null); } });
      const submit = () => { done = true; resolve(inp.value); m.close(); };
      ok.onclick = submit;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
      setTimeout(() => inp.focus(), 50);
    });
  };

  /** ألوان الرسوم (متناسقة مع السمة) */
  M.seriesColors = () => {
    const light = M.settings.theme === 'white';
    return light
      ? ['#1f6feb', '#d6453d', '#1a936f', '#e08e0b', '#7b4fd6', '#0f8b8d', '#c2408a', '#5c6b7a']
      : ['#6cc5ff', '#ff7b8a', '#7ee0a1', '#ffd166', '#b9a2ff', '#4fd8cf', '#ff9ed2', '#c7d2dc'];
  };
})();

/* ---------------- اللوحات وبطاقات النتائج ---------------- */
(function () {
  'use strict';
  const M = window.M;
  M.panels = [];
  M.registerPanel = (p) => M.panels.push(p);

  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
    '٠': '⁰', '١': '¹', '٢': '²', '٣': '³', '٤': '⁴', '٥': '⁵', '٦': '⁶', '٧': '⁷', '٨': '⁸', '٩': '⁹' };
  /** تحويل HTML رياضي إلى نص عادي (للسبورة والنسخ) */
  M.htmlToPlain = function (html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    d.querySelectorAll('.mfrac').forEach((f) => {
      const [n, den] = f.children;
      const wrapP = (t) => (/[\s+\-×]/.test(t.trim()) ? '(' + t.trim() + ')' : t.trim());
      f.replaceWith(document.createTextNode(wrapP(n.textContent) + '/' + wrapP(den.textContent)));
    });
    d.querySelectorAll('sup').forEach((s) => {
      const t = s.textContent;
      const conv = [...t].every((c) => SUP[c]) ? [...t].map((c) => SUP[c]).join('') : '^(' + t + ')';
      s.replaceWith(document.createTextNode(conv));
    });
    d.querySelectorAll('.mroot').forEach((r) => r.replaceWith(document.createTextNode('(' + r.textContent + ')')));
    d.querySelectorAll('br').forEach((b) => b.replaceWith(document.createTextNode('\n')));
    return d.textContent.replace(/[ \t]+/g, ' ').trim();
  };

  /**
   * بطاقة نتيجة بخطوات. في استراتيجيات "التلميح" و"السقراطية" تُكشف الخطوات تدريجياً.
   * res = {title, steps:[html], answer:html}
   */
  M.renderResult = function (res, opts) {
    opts = opts || {};
    const strategy = opts.strategy || M.settings.aiStrategy;
    const progressive = strategy === 'hints' || strategy === 'socratic';
    const box = M.h('div', { class: 'result' });
    const title = M.h('div', { class: 'result-title' });
    title.innerHTML = `<span>${res.title || 'النتيجة'}</span>`;
    box.appendChild(title);
    // الشرح البصري: بطاقات وأسهم تحمل العمليات بدل سطر تحت سطر
    if (M.visual && res.steps && res.steps.length) box.appendChild(M.visual.flowHTML(res.steps, res.answer, { progressive, answerLabel: (opts.answerLabel || 'الناتج').replace(/[:：]\s*$/, '') }));
    else {
      const ol = M.h('ol', { class: 'steps' });
      (res.steps || []).forEach((s, i) => { const li = M.h('li', { html: s }); if (progressive && i > 0) li.classList.add('hidden-step'); ol.appendChild(li); });
      if (res.steps && res.steps.length) box.appendChild(ol);
      const ans = M.h('div', { class: 'answer', html: (opts.answerLabel || 'الناتج: ') + res.answer });
      if (progressive) ans.classList.add('hidden-step');
      box.appendChild(ans);
    }
    const acts = M.h('div', { class: 'result-actions' });
    if (progressive) {
      const q = strategy === 'socratic' ? M.h('div', { class: 'hint', style: { width: '100%' } }, '🤔 فكّر: ما الخطوة التالية في رأيك؟ ثم اكشفها للتحقق.') : null;
      if (q) acts.appendChild(q);
      const nextBtn = M.h('button', { class: 'btn sm teal', html: M.icon('bulb') + '<span>الخطوة التالية</span>' });
      const allBtn = M.h('button', { class: 'btn sm', html: '<span>أظهر الحل كاملاً</span>' });
      nextBtn.onclick = () => {
        const hidden = box.querySelector('.hidden-step');
        if (hidden) hidden.classList.remove('hidden-step');
        if (!box.querySelector('.hidden-step')) { nextBtn.remove(); allBtn.remove(); if (q) q.remove(); }
      };
      allBtn.onclick = () => { box.querySelectorAll('.hidden-step').forEach((e) => e.classList.remove('hidden-step')); nextBtn.remove(); allBtn.remove(); if (q) q.remove(); };
      acts.append(nextBtn, allBtn);
    }
    const toBoard = M.h('button', { class: 'btn sm', html: M.icon('board') + '<span>على السبورة</span>' });
    toBoard.onclick = () => M.resultToBoard(res);
    const copy = M.h('button', { class: 'btn sm ghost', html: M.icon('copy') + '<span>نسخ</span>' });
    copy.onclick = () => {
      const txt = [res.title].concat((res.steps || []).map((s, i) => M.loc(i + 1) + ') ' + M.htmlToPlain(s)), ['الناتج: ' + M.htmlToPlain(res.answer)]).join('\n');
      navigator.clipboard && navigator.clipboard.writeText(txt).then(() => M.toast('تم النسخ'), () => M.toast('تعذّر النسخ'));
    };
    acts.append(toBoard, copy);
    if (opts.extraActions) opts.extraActions.forEach((b) => acts.appendChild(b));
    box.appendChild(acts);
    return box;
  };

  M.resultToBoard = function (res) {
    if (M.visual) { M.visual.addFlow(res); M.toast('✓ أُضيف الحل على السبورة كمخطط بالأسهم — اسحبه أو كبّره بأداة التحديد'); return; }
    const lines = [res.title || ''];
    (res.steps || []).forEach((s, i) => lines.push(M.loc(i + 1) + ') ' + M.htmlToPlain(s)));
    lines.push('∴ ' + M.htmlToPlain(res.answer));
    M.board.addText(lines.join('\n'), { size: 24 });
    M.toast('تمت الإضافة إلى السبورة');
  };
})();

/* ---------------- حفظ الملفات والتأكيد (يعمل في المتصفح ومنصة claude.ai) ---------------- */
(function () {
  'use strict';
  const M = window.M;
  M.inArtifact = !!(window.claude && typeof window.claude.use === 'function');
  let dl = null;
  const dlReady = M.inArtifact ? window.claude.use('downloads').then((d) => (dl = d)).catch(() => null) : Promise.resolve(null);

  /** حفظ ملف: data نص أو Blob */
  M.saveFile = async function (filename, data, mime) {
    await dlReady;
    if (dl) {
      try { await dl.save({ filename, data }); return true; }
      catch (e) { if (e && e.code !== 'declined' && e.code !== 'cancelled') M.toast('تعذّر حفظ الملف', { type: 'warn' }); return false; }
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a');
    a.download = filename;
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    return true;
  };

  /** نافذة تأكيد داخل الصفحة (بديل confirm) */
  M.confirm = function (message, okLabel) {
    return new Promise((resolve) => {
      const wrap = M.h('div', { class: 'stack' });
      wrap.appendChild(M.h('p', { style: { margin: '0 0 8px', lineHeight: '1.8' } }, message));
      const row = M.h('div', { class: 'row' });
      const ok = M.h('button', { class: 'btn primary' }, okLabel || 'نعم، متأكد');
      const no = M.h('button', { class: 'btn' }, 'إلغاء');
      row.append(ok, no);
      wrap.appendChild(row);
      let done = false;
      const m = M.modal({ title: 'تأكيد', icon: 'info', body: wrap, size: 'sm', onClose: () => { if (!done) resolve(false); } });
      ok.onclick = () => { done = true; resolve(true); m.close(); };
      no.onclick = () => { done = true; resolve(false); m.close(); };
    });
  };
})();
