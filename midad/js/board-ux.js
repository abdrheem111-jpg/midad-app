/* ==========================================================================
   التكيّف مع السبورات والشاشات التفاعلية (Promethean ActivBoard / ActivPanel وغيرها):
   وضع السبورة التفاعلية (واجهة أكبر)، قائمة أدوات دائرية بالضغط المطوّل بجوار اليد،
   اللمس بالإصبع (رسم أو تحريك)، الكتابة الجماعية، المسح براحة اليد، مكان شريط الأدوات،
   واختبار القلم — كلها دون اتصال
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const B = () => M.board;
  const S = () => M.settings;

  /* ---------------- تطبيق الإعدادات ---------------- */
  /** حجم الواجهة: يدوي، أو تلقائي حسب عرض الشاشة في وضع السبورة (١٣٦٦ ⇐ ١٠٠٪، ١٩٢٠ ⇐ ١٣٠٪، الشاشات الأعرض حتى ١٦٠٪) */
  function scale() {
    const s = S();
    if (s.uiScale) return +s.uiScale;
    if (!s.boardMode) return 1;
    return Math.round(M.clamp(window.innerWidth / 1480, 1, 1.6) * 20) / 20;
  }
  function apply() {
    const s = S(), body = document.body, z = scale();
    body.classList.toggle('board-mode', !!s.boardMode);
    body.classList.toggle('ui-zoomed', z !== 1);
    body.classList.toggle('tb-left', s.toolbarSide === 'left');
    document.documentElement.style.setProperty('--ui-zoom', z);
    // منع تكبير الصفحة نفسها بالإصبعين على السبورة (التكبير للسبورة فقط)
    const vp = document.querySelector('meta[name=viewport]');
    if (vp) vp.content = 'width=device-width, initial-scale=1, viewport-fit=cover' + (s.boardMode ? ', maximum-scale=1, user-scalable=no' : '');
    if (B()) { B().resize(); B().requestRender(); }
  }
  // تغيّر دقة الشاشة (نقل النافذة إلى جهاز العرض أو شاشة أخرى) ⇐ إعادة ضبط حدة السبورة
  function watchDpr() {
    if (!window.matchMedia) return;
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    const on = () => { if (B()) B().resize(); watchDpr(); };
    if (mq.addEventListener) mq.addEventListener('change', on, { once: true });
  }

  /* ---------------- القائمة الدائرية ---------------- */
  let radial = null;
  function closeRadial() { if (radial) { radial.remove(); radial = null; } }
  function openRadial(x, y) {
    closeRadial();
    const wrap = M.$('#boardWrap'), rect = wrap.getBoundingClientRect();
    const R = S().boardMode ? 108 : 88;
    const px = M.clamp(x - rect.left, R + 30, rect.width - R - 30), py = M.clamp(y - rect.top, R + 30, rect.height - R - 30);
    const el = h('div', { class: 'radial', style: `left:${px}px;top:${py}px;--R:${R}px` });
    const items = [
      ['pen', 'قلم', () => M.setTool('pen')],
      ['wand', 'قلم الرياضيات', () => M.setTool('mathpen')],
      ['eraser', 'ممحاة', () => M.setTool('eraser')],
      ['select', 'تحديد', () => M.setTool('select')],
      ['undo', 'تراجع', () => B().undo()],
      ['circleLab', 'الدائرة', () => M.modes.open('circle')],
      ['function', 'مستوى إحداثي', () => M.modes.open('coord')],
      ['laser', 'ليزر', () => M.setTool('laser')],
    ];
    items.forEach(([ic, t, fn], i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / items.length;
      const b = h('button', { class: 'radial-item', title: t, style: `transform: translate(calc(${Math.cos(a).toFixed(3)} * var(--R)), calc(${Math.sin(a).toFixed(3)} * var(--R)))`, html: icon(ic) + `<small>${t}</small>` });
      b.onclick = (e) => { e.stopPropagation(); closeRadial(); fn(); };
      el.appendChild(b);
    });
    // الألوان في الحلقة الداخلية
    const pal = (M.boardUtil && M.boardUtil.PALETTES) ? (B().isLight ? M.boardUtil.PALETTES.light : M.boardUtil.PALETTES.dark) : [];
    const inner = h('div', { class: 'radial-colors' });
    pal.slice(0, 6).forEach((c, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 6;
      const sw = h('button', { class: 'radial-sw' + (B().color === 'c' + i ? ' active' : ''), style: `background:${c};transform: translate(${(Math.cos(a) * 34).toFixed(1)}px, ${(Math.sin(a) * 34).toFixed(1)}px)` });
      sw.onclick = (e) => { e.stopPropagation(); B().color = 'c' + i; M.emit('color', 'c' + i); if (!['pen', 'mathpen', 'highlighter'].includes(B().tool)) M.setTool('pen'); closeRadial(); };
      inner.appendChild(sw);
    });
    el.appendChild(inner);
    const x0 = h('button', { class: 'radial-close', title: 'إغلاق', html: icon('close') });
    x0.onclick = (e) => { e.stopPropagation(); closeRadial(); };
    el.appendChild(x0);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    wrap.appendChild(el);
    radial = el;
    requestAnimationFrame(() => el.classList.add('show'));
  }
  M.on('longpress', ({ x, y }) => openRadial(x, y));
  document.addEventListener('pointerdown', (e) => { if (radial && !radial.contains(e.target)) closeRadial(); }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRadial(); });

  /* ---------------- اختبار القلم والشاشة ---------------- */
  function penTest() {
    const wrap = h('div', { class: 'pentest' });
    const cv = h('canvas', { class: 'pentest-cv' });
    const out = h('div', { class: 'pentest-out' });
    wrap.append(cv, out, h('div', { class: 'hint' }, 'اكتب بقلم السبورة، ثم جرّب طرفه الخلفي (الممحاة) وزره الجانبي، ثم أصابعك وراحة يدك، ثم عدة أقلام أو أصابع معاً. تظهر هنا البيانات التي تصل من السبورة.'));
    const m = M.modal({ title: 'اختبار القلم والسبورة التفاعلية', icon: 'pen', body: wrap, size: 'lg' });
    const ctx = cv.getContext('2d');
    const active = new Map();
    let maxTouch = 0;
    const fit = () => { const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    setTimeout(fit, 50);
    const colors = { pen: '#4dabf7', touch: '#ffa94d', mouse: '#8ce99a' };
    let verdict = '';
    const judge = (e) => {
      const k = B().pointerKind(e), tool = B().tool;
      if (k.compat) return '✍️ كتابة (وضع التوافق)';
      if (k.reject) return '🚫 تُهمل (راحة يد أثناء الكتابة بالقلم)';
      if (k.palm) return '🧽 مسح براحة اليد';
      if (k.penErase) return '🧽 ممحاة القلم';
      if (k.nav) return '✋ تحريك السبورة';
      return ['pen', 'mathpen', 'highlighter'].includes(tool) ? '✍️ كتابة ✓' : 'الأداة الحالية: ' + tool;
    };
    const show = (e, kind) => {
      maxTouch = Math.max(maxTouch, active.size);
      out.innerHTML = (verdict ? `<div class="pentest-verdict">السبورة ستعامل هذه اللمسة: <b>${verdict}</b></div>` : '') + `<b>${kind}</b> · نوع المؤشر: <b>${e.pointerType === 'pen' ? 'قلم ✓' : e.pointerType === 'touch' ? 'لمس' : 'فأرة'}</b> · الضغط: ${M.fmt(e.pressure, 2)} · الأزرار: ${M.loc(e.buttons)}${e.buttons & 32 ? ' (ممحاة القلم ✓)' : e.buttons & 2 ? ' (الزر الجانبي ✓)' : ''} · مساحة التلامس: ${M.loc(Math.round(e.width || 0))}×${M.loc(Math.round(e.height || 0))}${Math.max(e.width || 0, e.height || 0) >= 44 ? ' (راحة يد ✓)' : ''} · مؤشرات معاً الآن: ${M.loc(active.size)} (الأقصى ${M.loc(maxTouch)}) · دقة الشاشة: ${M.loc(screen.width)}×${M.loc(screen.height)} × ${M.fmt(window.devicePixelRatio || 1, 2)} · نقاط اللمس المدعومة: ${M.loc(navigator.maxTouchPoints || 0)}`;
    };
    cv.addEventListener('pointerdown', (e) => { try { cv.setPointerCapture(e.pointerId); } catch (err) { /* */ } verdict = judge(e); const r = cv.getBoundingClientRect(); active.set(e.pointerId, [e.clientX - r.left, e.clientY - r.top]); show(e, 'بدء'); });
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect(), p = [e.clientX - r.left, e.clientY - r.top], last = active.get(e.pointerId);
      if (last) {
        const erase = e.buttons & 32 || Math.max(e.width || 0, e.height || 0) >= 44;
        ctx.strokeStyle = erase ? '#ff6b6b' : colors[e.pointerType] || '#fff';
        ctx.lineWidth = e.pointerType === 'pen' ? 1 + (e.pressure || 0.5) * 6 : 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        active.set(e.pointerId, p);
      }
      show(e, last ? 'رسم' : 'تحويم');
    });
    const up = (e) => { active.delete(e.pointerId); show(e, 'رفع'); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    const fixB = h('button', { class: 'btn sm', html: icon('check') + '<span>القلم لا يكتب على السبورة؟ فعّل وضع التوافق</span>' });
    fixB.onclick = () => { S().compat = true; M.saveSettings(); m.close(); M.toast('✓ وضع التوافق مفعّل: القلم والإصبع يكتبان مباشرة دون أي تمييز ذكي'); };
    wrap.appendChild(h('div', { class: 'mode-row foot' }, fixB));
  }

  /* ---------------- صفوف الإعدادات ---------------- */
  function settingsRows(wrap, row) {
    const s = S();
    const sel = (opts, cur, onPick) => {
      const el = h('select', { class: 'sel' });
      opts.forEach(([v, t]) => el.appendChild(h('option', { value: String(v), selected: String(cur) === String(v) }, t)));
      el.onchange = () => { const o = opts.find((q) => String(q[0]) === el.value); onPick(o[0]); M.saveSettings(); apply(); };
      return el;
    };
    wrap.appendChild(h('div', { class: 'set-head', html: `${icon('board')}<b>السبورة التفاعلية (Promethean ActivBoard / ActivPanel والشاشات اللمسية)</b>` }));
    row('وضع السبورة التفاعلية', 'أزرار وخطوط أكبر، نقاط سحب أوسع، وقائمة أدوات دائرية بالضغط المطوّل بالقلم أو الإصبع', sel([[true, 'مفعّل'], [false, 'متوقف']], !!s.boardMode, (v) => (s.boardMode = v)));
    row('حجم الواجهة', 'كبّر الأزرار لتناسب الشاشات الكبيرة والبعيدة عن الطلاب', sel([['', 'تلقائي'], [1, '١٠٠٪'], [1.15, '١١٥٪'], [1.3, '١٣٠٪'], [1.5, '١٥٠٪'], [1.75, '١٧٥٪']], s.uiScale || '', (v) => (s.uiScale = v)));
    row('وضع التوافق', 'إذا لم يكتب القلم على السبورة: يلغي كل التمييز الذكي (راحة اليد، ممحاة القلم، الكتابة الجماعية، الضغط المطوّل) فيكتب القلم والإصبع مباشرة', sel([[false, 'متوقف'], [true, 'مفعّل']], !!s.compat, (v) => (s.compat = v)));
    row('اللمس بالإصبع', 'تلقائي: الإصبع يكتب، وتُهمل راحة اليد فقط والقلم ملامس للسبورة', sel([['auto', 'تلقائي (موصى به)'], ['draw', 'الإصبع يكتب دائماً'], ['gesture', 'الإصبع للتحريك والتكبير فقط']], s.touchMode || 'auto', (v) => (s.touchMode = v)));
    row('الكتابة الجماعية', 'عدة طلاب يكتبون معاً بأقلام أو أصابع مختلفة في الوقت نفسه', sel([['auto', 'مفعّلة (إصبعان معاً = تكبير)'], ['always', 'دائماً (بلا تكبير بالإصبعين)'], ['off', 'متوقفة']], s.multiWriter || 'auto', (v) => (s.multiWriter = v)));
    row('المسح براحة اليد', 'يتعلّم حجم لمساتك المعتاد، ويمسح فقط بلمسة أكبر منه بكثير (باطن اليد)', sel([[true, 'تلقائي'], [false, 'متوقف']], s.palmErase !== false, (v) => (s.palmErase = v)));
    row('القائمة الدائرية', 'اضغط مطوّلاً على السبورة لتظهر الأدوات والألوان بجوار يدك (مفيد في السبورات العريضة)', sel([[true, 'مفعّلة'], [false, 'متوقفة']], s.radial !== false, (v) => (s.radial = v)));
    row('مكان شريط الأدوات', 'ضعه في الجهة الأقرب إلى المعلم', sel([['right', 'يمين'], ['left', 'يسار']], s.toolbarSide || 'right', (v) => (s.toolbarSide = v)));
    const t = h('button', { class: 'btn sm', html: icon('pen') + '<span>اختبر القلم والشاشة</span>' });
    t.onclick = penTest;
    row('اختبار القلم', 'تحقق من أن السبورة ترسل القلم والضغط والممحاة واللمس المتعدد', t);
  }

  /* ---------------- الاكتشاف التلقائي ---------------- */
  function autodetect() {
    const s = S();
    if (s.boardModeAsked) return;
    const big = (navigator.maxTouchPoints || 0) >= 10 || ((navigator.maxTouchPoints || 0) > 1 && screen.width >= 1900);
    if (!big) return;
    s.boardModeAsked = true; M.saveSettings();
    setTimeout(() => M.toast('يبدو أنك على سبورة أو شاشة تفاعلية كبيرة 🖊️', { time: 12000, action: { label: 'فعّل وضع السبورة التفاعلية', fn: () => { s.boardMode = true; M.saveSettings(); apply(); M.toast('✓ وضع السبورة التفاعلية: اضغط مطوّلاً لتظهر الأدوات بجوارك'); } } }), 2500);
  }

  apply();
  watchDpr();
  autodetect();
  M.on('settings', apply);
  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (S().boardMode && !S().uiScale) apply(); }, 250); });
  M.boardUX = { apply, settingsRows, openRadial, closeRadial, penTest };
})();
