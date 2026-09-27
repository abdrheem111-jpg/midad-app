/* ==========================================================================
   أوضاع السبورة: السبورة تعرف ماذا تريد أن تفعل
   - المستوى الإحداثي: اكتب دالة أو متباينة، أو أضف دالة جاهزة (خطية، تربيعية،
     تكعيبية، مطلقة، جذرية، أسية، لوغاريتمية، مثلثية، كسرية) وحرّك معاملاتها،
     أو اختر نوع الدالة التي سترسمها بيدك ليتعرّف عليها بدقة
   - الفضاء ثلاثي الأبعاد: أضف مجسمات، وارسم شبكة على لوح مربعات فتنطوي مجسماً
   - الأشكال، الكسور، خط الأعداد، البيانات، الجبر
   - نشاط تفاعلي على السبورة لكل درس في المنهج
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 2 : d);
  const B = () => M.board;
  const X = () => M.varName('x'), Y = () => M.varName('y');

  /* ================= قوالب الدوال ================= */
  const P = (k, label, def, min, max, step) => ({ k, label, def, min, max, step: step || 0.5 });
  const n = (v) => L(F(v));
  const cf = (a) => (Math.abs(a - 1) < 1e-9 ? '' : Math.abs(a + 1) < 1e-9 ? '−' : n(a));
  const sh = (hh) => (Math.abs(hh) < 1e-9 ? X() : `${X()} ${hh > 0 ? '−' : '+'} ${n(Math.abs(hh))}`);
  const pl = (k) => (Math.abs(k) < 1e-9 ? '' : ` ${k > 0 ? '+' : '−'} ${n(Math.abs(k))}`);
  const TPL = {
    linear: { name: 'خطية', ic: 'line', params: [P('m', 'الميل م', 2, -5, 5), P('b', 'المقطع ب', 1, -8, 8)], expr: (p) => `(${p.m})*x+(${p.b})`, label: (p) => `${Y()} = ${Math.abs(p.m) < 1e-9 ? '' : cf(p.m) + X()}${Math.abs(p.m) < 1e-9 ? n(p.b) : pl(p.b)}`, tip: 'م يتحكم في الميل (الانحدار)، وب نقطة التقاطع مع محور ص.' },
    quad: { name: 'تربيعية', ic: 'function', params: [P('a', 'أ (الاتساع والاتجاه)', 1, -4, 4, 0.25), P('h', 'هـ (إزاحة أفقية)', 0, -6, 6), P('k', 'ك (إزاحة رأسية)', -2, -8, 8)], expr: (p) => `(${p.a})*(x-(${p.h}))^2+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}(${sh(p.h)})²${pl(p.k)}`, tip: 'الرأس عند (هـ، ك). أ موجبة: مفتوح للأعلى، سالبة: للأسفل، وكلما كبرت |أ| ضاق المنحنى.' },
    cubic: { name: 'تكعيبية', ic: 'function', params: [P('a', 'أ', 1, -3, 3, 0.25), P('h', 'هـ', 0, -6, 6), P('k', 'ك', 0, -8, 8)], expr: (p) => `(${p.a})*(x-(${p.h}))^3+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}(${sh(p.h)})³${pl(p.k)}`, tip: 'نقطة الانعطاف عند (هـ، ك).' },
    abs: { name: 'القيمة المطلقة', ic: 'function', params: [P('a', 'أ', 1, -4, 4, 0.25), P('h', 'هـ', 0, -6, 6), P('k', 'ك', 0, -8, 8)], expr: (p) => `(${p.a})*abs(x-(${p.h}))+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}|${sh(p.h)}|${pl(p.k)}`, tip: 'شكل V رأسه عند (هـ، ك).' },
    sqrt: { name: 'جذرية', ic: 'function', params: [P('a', 'أ', 1, -4, 4, 0.25), P('h', 'هـ', 0, -6, 6), P('k', 'ك', 0, -8, 8)], expr: (p) => `(${p.a})*sqrt(x-(${p.h}))+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}√(${sh(p.h)})${pl(p.k)}`, tip: 'تبدأ من النقطة (هـ، ك)، ومجالها س ≥ هـ.' },
    exp: { name: 'أسية', ic: 'function', params: [P('a', 'أ', 1, -4, 4, 0.25), P('b', 'الأساس ب', 2, 0.2, 5, 0.1), P('k', 'ك (خط التقارب)', 0, -6, 6)], expr: (p) => `(${p.a})*(${p.b})^x+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}${n(p.b)}^${X()}${pl(p.k)}`, tip: 'ب > ١: نمو، ٠ < ب < ١: اضمحلال. خط التقارب الأفقي ص = ك.' },
    log: { name: 'لوغاريتمية', ic: 'function', params: [P('a', 'أ', 1, -4, 4, 0.25), P('h', 'هـ (خط التقارب)', 0, -6, 6), P('k', 'ك', 0, -6, 6)], expr: (p) => `(${p.a})*ln(x-(${p.h}))+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}لوهـ(${sh(p.h)})${pl(p.k)}`, tip: 'معكوس الدالة الأسية. خط التقارب الرأسي س = هـ.' },
    sin: { name: 'جيبية (جا)', ic: 'function', params: [P('a', 'السعة أ', 1, -4, 4, 0.25), P('b', 'ب (التردد)', 1, 0.25, 4, 0.25), P('h', 'إزاحة الطور', 0, -3.2, 3.2, 0.1), P('k', 'ك', 0, -5, 5)], expr: (p) => `(${p.a})*sin((${p.b})*(x-(${p.h})))+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}جا(${Math.abs(p.b - 1) < 1e-9 ? '' : n(p.b)}(${sh(p.h)}))${pl(p.k)}`, tip: 'السعة |أ|، والدورة = ٢ط ÷ ب.' },
    cos: { name: 'جيب التمام (جتا)', ic: 'function', params: [P('a', 'السعة أ', 1, -4, 4, 0.25), P('b', 'ب', 1, 0.25, 4, 0.25), P('h', 'إزاحة الطور', 0, -3.2, 3.2, 0.1), P('k', 'ك', 0, -5, 5)], expr: (p) => `(${p.a})*cos((${p.b})*(x-(${p.h})))+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}جتا(${Math.abs(p.b - 1) < 1e-9 ? '' : n(p.b)}(${sh(p.h)}))${pl(p.k)}`, tip: 'تشبه جا لكنها مزاحة ربع دورة.' },
    tan: { name: 'الظل (ظا)', ic: 'function', params: [P('a', 'أ', 1, -3, 3, 0.25), P('b', 'ب', 1, 0.25, 3, 0.25), P('k', 'ك', 0, -5, 5)], expr: (p) => `(${p.a})*tan((${p.b})*x)+(${p.k})`, label: (p) => `${Y()} = ${cf(p.a)}ظا(${Math.abs(p.b - 1) < 1e-9 ? '' : n(p.b)}${X()})${pl(p.k)}`, tip: 'دورتها ط ÷ ب ولها خطوط تقارب رأسية.' },
    rational: { name: 'كسرية', ic: 'function', params: [P('a', 'أ', 1, -6, 6, 0.5), P('h', 'هـ (تقارب رأسي)', 0, -6, 6), P('k', 'ك (تقارب أفقي)', 0, -6, 6)], expr: (p) => `(${p.a})/(x-(${p.h}))+(${p.k})`, label: (p) => `${Y()} = ${n(p.a)}/(${sh(p.h)})${pl(p.k)}`, tip: 'خطا التقارب: س = هـ و ص = ك.' },
  };
  const DRAW_KINDS = [['auto', 'تلقائي'], ['line', 'خطية'], ['quad', 'تربيعية'], ['cubic', 'تكعيبية'], ['abs', 'مطلقة'], ['sqrt', 'جذرية'], ['exp', 'أسية'], ['log', 'لوغاريتمية'], ['sin', 'مثلثية'], ['rational', 'كسرية']];

  function addTemplate(id, params) {
    const t = TPL[id], p = Object.assign(Object.fromEntries(t.params.map((q) => [q.k, q.def])), params || {});
    const o = B().addGraph(t.expr(p), { label: t.label(p) });
    if (o) { o.tpl = id; o.params = p; activeFn = o; }
    return o;
  }
  function updateTemplate(o) {
    const t = TPL[o.tpl];
    o.expr = t.expr(o.params); o.label = t.label(o.params);
    B().requestRender();
    clearTimeout(updateTemplate._t); updateTemplate._t = setTimeout(() => B().changed(), 400);
  }

  /* ================= الإطار العام للوحة الوضع ================= */
  let dock = null, current = null, activeFn = null, sliderHook = null, suppressPage = false;
  M.on('selection', () => { if (current !== 'coord' || !sliderHook) return; const s = B().selectedObjs(); if (s.length === 1 && s[0].tpl) { activeFn = s[0]; sliderHook(); } });
  function closeDock() { if (dock) dock.remove(); dock = null; current = null; }
  function openDock(mode, title, iconName, build) {
    closeDock();
    current = mode;
    dock = h('div', { class: 'mode-dock', 'data-mode': mode });
    const head = h('div', { class: 'mode-head' });
    head.innerHTML = `<span class="mode-ic">${icon(iconName)}</span><b>${title}</b>`;
    const minB = h('button', { class: 'icon-btn sm', title: 'تصغير', html: icon('chevD') });
    const x = h('button', { class: 'icon-btn sm', title: 'إغلاق', html: icon('close') });
    minB.onclick = () => dock.classList.toggle('min');
    x.onclick = closeDock;
    head.append(minB, x);
    const body = h('div', { class: 'mode-body' });
    dock.append(head, body);
    dock.addEventListener('pointerdown', (e) => e.stopPropagation());
    dock.addEventListener('keydown', (e) => e.stopPropagation());
    build(body);
    M.$('#overlays').appendChild(dock);
    return body;
  }
  const inputRow = (ph, onGo, btnLabel) => {
    const inp = h('input', { class: 'inp mode-inp', placeholder: ph, dir: 'rtl' });
    const go = h('button', { class: 'btn primary sm', html: icon('check') + `<span>${btnLabel || 'نفّذ'}</span>` });
    const run = () => { const v = inp.value.trim(); if (v) onGo(v, inp); };
    go.onclick = run;
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') run(); });
    return { row: h('div', { class: 'mode-row' }, inp, go), inp };
  };
  const section = (t) => h('div', { class: 'mode-sec' }, t);
  const chipRow = (list, onPick, cls) => { const r = h('div', { class: 'mode-chips ' + (cls || '') }); list.forEach(([k, t, ic]) => { const b = h('button', { class: 'chip', 'data-k': k, html: (ic ? icon(ic) : '') + `<span>${t}</span>` }); b.onclick = () => onPick(k, b, r); r.appendChild(b); }); return r; };

  /* ================= وضع المستوى الإحداثي ================= */
  function coordMode(preset) {
    preset = preset || {};
    if (B().page.bg !== 'coord') { suppressPage = true; B().setBackground('coord'); suppressPage = false; }
    let sliders;
    openDock('coord', 'المستوى الإحداثي — ماذا تريد أن ترسم؟', 'function', (body) => {
      const { row, inp } = inputRow('اكتب دالة أو متباينة: ص = س² − ٤ ، ص > ٢س + ١ ، س ≤ ٣', (v, i) => {
        const hasIneq = /[<>≤≥]/.test(v);
        const o = hasIneq ? B().addInequality(v) : B().addGraph(v);
        if (o) { i.value = ''; M.toast(hasIneq ? '✓ ظُللت منطقة الحل' : '✓ رُسمت الدالة'); }
      }, 'ارسم');
      if (preset.input) inp.value = preset.input;
      body.append(section('✍️ اكتبها:'), row);
      body.appendChild(section('🧩 أو أضف دالة جاهزة وحرّك معاملاتها:'));
      body.appendChild(chipRow(Object.entries(TPL).map(([k, t]) => [k, t.name]), (k) => { addTemplate(k); renderSliders(); }));
      body.appendChild(section('🖊️ أو ارسمها بيدك — ما نوعها؟ (يساعدني على الدقة)'));
      const kinds = chipRow(DRAW_KINDS, (k, b, r) => { B().curveMode = k === 'auto' ? null : k; M.$$('.chip', r).forEach((c) => c.classList.toggle('active', c === b)); M.setTool('pen'); if (dock) dock.classList.add('min'); M.toast(k === 'auto' ? 'ارسم بالقلم وسأتعرّف على نوع الدالة تلقائياً' : `ارسم الدالة ال${DRAW_KINDS.find((q) => q[0] === k)[1]} بالقلم — سأستنتج معادلتها`); }, 'kinds');
      const cur = B().curveMode || 'auto';
      M.$$('.chip', kinds).forEach((c) => c.classList.toggle('active', c.dataset.k === cur));
      body.appendChild(kinds);
      sliders = h('div', { class: 'mode-sliders' });
      body.appendChild(sliders);
      const foot = h('div', { class: 'mode-row foot' });
      const clr = h('button', { class: 'btn sm ghost', html: icon('eraser') + '<span>امسح الرسوم البيانية</span>' });
      clr.onclick = () => { const b = B(); b.commit(); b.page.objects = b.objects.filter((o) => o.type !== 'fn' && o.type !== 'xregion' && o.type !== 'fntan'); b.changed(); activeFn = null; renderSliders(); };
      const pen = h('button', { class: 'btn sm ghost', html: icon('pen') + '<span>القلم</span>' });
      pen.onclick = () => M.setTool('pen');
      const tanB = h('button', { class: 'btn sm ghost', html: icon('point') + '<span>المماس عند نقطة</span>' });
      tanB.onclick = () => { const b = B(), fo = (activeFn && b.objects.includes(activeFn) ? activeFn : null) || b.objects.filter((o) => o.type === 'fn' && !o.ineq && o.vline == null).slice(-1)[0]; if (!fo) return M.toast('ارسم دالة أولاً', { type: 'warn' }); M.fnTangent.addTangent(fo, 1); M.toast('📐 اسحب النقطة على المنحنى لترى المماس وميله يتغيران'); };
      foot.append(pen, tanB, clr);
      body.appendChild(foot);
    });
    function renderSliders() {
      if (!sliders) return;
      sliders.innerHTML = '';
      const o = activeFn && B().objects.includes(activeFn) && activeFn.tpl ? activeFn : null;
      if (!o) return;
      const t = TPL[o.tpl];
      const lab = h('div', { class: 'mode-fn-label' }, M.prettyPow(o.label));
      sliders.append(section(`🎚️ حرّك معاملات الدالة ال${t.name}:`), lab);
      t.params.forEach((q) => {
        const r = h('div', { class: 'lab-slider' });
        const rng = h('input', { type: 'range', min: q.min, max: q.max, step: q.step, value: o.params[q.k] });
        const val = h('input', { class: 'inp', type: 'number', min: q.min, max: q.max, step: q.step, value: o.params[q.k] });
        const set = (v) => { o.params[q.k] = +v; rng.value = v; val.value = v; updateTemplate(o); lab.textContent = M.prettyPow(o.label); };
        rng.oninput = () => set(rng.value); val.onchange = () => set(val.value);
        r.append(h('label', {}, q.label), rng, val);
        sliders.appendChild(r);
      });
      sliders.appendChild(h('div', { class: 'hint' }, '💡 ' + t.tip));
    }
    if (preset.template) { addTemplate(preset.template, preset.params); }
    if (preset.draw) B().curveMode = preset.draw;
    renderSliders();
    sliderHook = renderSliders;
  }

  /* ================= وضع الفضاء ثلاثي الأبعاد ================= */
  function space3dMode(preset) {
    preset = preset || {};
    const b = B();
    if (b.page.bg !== 'space3d') { suppressPage = true; b.page.prevBg = b.page.bg; b.setBackground('space3d'); suppressPage = false; }
    openSpace(preset);
  }
  function openSpace(preset) { closeDock(); M.space3d.open(preset); }
  function closeSpace() { if (M.space3d) M.space3d.close(); }
  function exitSpace() { M.space3d.exit(); }

  /* ================= الأوضاع الخفيفة ================= */
  function execAt(id, text) { if (M.assist && M.assist.exec) M.assist.exec(id, text); }
  function shapesMode() {
    openDock('shapes', 'الأشكال الهندسية — ارسم أو أدرج', 'geometry', (body) => {
      body.appendChild(section('ارسم الشكل بالقلم وسأتعرّف عليه، أو أدرج شكلاً جاهزاً:'));
      const u = () => B().unit;
      const ins = (k) => {
        const b = B(), [cx, cy] = b.viewCenter(), s = 2.5 * u(), id = () => Math.random().toString(36).slice(2, 10);
        const reg = (nn, r, a0) => Array.from({ length: nn }, (_, i) => [cx + r * Math.cos(a0 + (2 * Math.PI * i) / nn), cy + r * Math.sin(a0 + (2 * Math.PI * i) / nn)]);
        const shapes = {
          square: { type: 'rect', x1: cx - s, y1: cy - s, x2: cx + s, y2: cy + s }, rect: { type: 'rect', x1: cx - 1.6 * s, y1: cy - s, x2: cx + 1.6 * s, y2: cy + s },
          tri: { type: 'poly', pts: [[cx - 1.5 * s, cy + s], [cx + 1.3 * s, cy + s], [cx - 0.3 * s, cy - s]] }, rtri: { type: 'poly', pts: [[cx - s, cy - s], [cx - s, cy + s], [cx + 1.5 * s, cy + s]], rightAngle: 1 },
          para: { type: 'poly', pts: [[cx - 1.5 * s, cy + s], [cx + s, cy + s], [cx + 1.5 * s, cy - s], [cx - s, cy - s]] }, trap: { type: 'poly', pts: [[cx - 1.6 * s, cy + s], [cx + 1.6 * s, cy + s], [cx + 0.8 * s, cy - s], [cx - 0.8 * s, cy - s]] },
          circle: { type: 'ellipse', x1: cx - s, y1: cy - s, x2: cx + s, y2: cy + s }, hex: { type: 'poly', pts: reg(6, 1.2 * s, 0) }, pent: { type: 'poly', pts: reg(5, 1.2 * s, -Math.PI / 2) },
        };
        const o = b.add(Object.assign({ id: id(), color: b.color, width: 3, fill: false }, shapes[k]));
        b.selected.clear(); b.selected.add(o.id); M.setTool('select'); b.emitSelection();
      };
      body.appendChild(chipRow([['square', 'مربع'], ['rect', 'مستطيل'], ['tri', 'مثلث'], ['rtri', 'مثلث قائم'], ['para', 'متوازي أضلاع'], ['trap', 'شبه منحرف'], ['circle', 'دائرة'], ['pent', 'خماسي'], ['hex', 'سداسي']], ins));
      body.appendChild(h('div', { class: 'hint' }, '💡 حدّد أي شكل لقياس محيطه ومساحته وزواياه، أو لعكسه وتدويره وسحبه وتكبيره، أو لإظهار محاور تماثله.'));
      const lab = h('button', { class: 'btn sm ghost', html: icon('cube') + '<span>مختبر الأشكال (منزلقات)</span>' });
      lab.onclick = () => M.lab.open('shapes');
      body.appendChild(h('div', { class: 'mode-row foot' }, lab));
    });
  }
  function fractionsMode(preset) {
    openDock('fractions', 'الكسور والنسب — مثّلها بصرياً', 'percent', (body) => {
      const { row, inp } = inputRow('اكتب كسراً أو أكثر: ٣/٤ ، ٢/٣ ، ٥/٨', (v) => {
        const fr = M.toWestern(v).match(/\d+\s*\/\s*\d+/g) || [];
        if (!fr.length) return M.toast('اكتب كسراً مثل ٣/٤', { type: 'warn' });
        fr.forEach((f, i) => setTimeout(() => execAt('fraction_viz', f.replace(/\s/g, '')), i * 60));
        if (fr.length === 2) { const [a, b2] = fr.map((f) => { const [x, y] = f.split('/').map(Number); return x / y; }); M.toast(`${L(fr[0])} ${a > b2 ? '>' : a < b2 ? '<' : '='} ${L(fr[1])}`, { time: 4000 }); }
      }, 'مثّل');
      if (preset && preset.input) inp.value = preset.input;
      body.append(section('✍️ اكتب الكسور لتمثيلها بالدائرة والشريط ومقارنتها:'), row, h('div', { class: 'hint' }, 'كسران معاً ⇐ أقارن بينهما. ويمكنك كتابة الكسر على السبورة وتحديده لأقترح عليك.'));
    });
  }
  function numberlineMode(preset) {
    openDock('numberline', 'خط الأعداد', 'dash', (body) => {
      const { row, inp } = inputRow('أعداد مثل −٣ ، ٢ ، ٥٫٥ أو متباينة مثل ٢س − ١ > ٥', (v) => {
        if (/[<>≤≥]/.test(v)) return execAt('numberline', v);
        const nums = (M.toWestern(v).match(/-?\d+(\.\d+)?/g) || []).map(Number);
        if (!nums.length) return;
        drawNumberLine(nums);
      }, 'ارسم');
      if (preset && preset.input) inp.value = preset.input;
      body.append(section('✍️ اكتب أعداداً لتعيينها أو متباينة لتمثيل حلها:'), row);
    });
  }
  function drawNumberLine(nums) {
    const b = B(), [cx, cy] = b.viewCenter();
    const lo = Math.floor(Math.min(0, ...nums)) - 2, hi = Math.ceil(Math.max(0, ...nums)) + 2, span = hi - lo;
    const W = Math.min(900, Math.max(420, span * 44)), px = (x) => cx - W / 2 + ((x - lo) / span) * W, y = cy;
    const id = () => Math.random().toString(36).slice(2, 10), out = [];
    out.push({ type: 'arrow', x1: px(lo) - 10, y1: y, x2: px(hi) + 22, y2: y, color: 'c0', width: 2 }, { type: 'arrow', x1: px(hi) + 10, y1: y, x2: px(lo) - 22, y2: y, color: 'c0', width: 2 });
    const step = span > 30 ? 5 : span > 16 ? 2 : 1;
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) { out.push({ type: 'line', x1: px(v), y1: y - 7, x2: px(v), y2: y + 7, color: 'c0', width: 1.5 }); out.push({ type: 'text', x: px(v) + 6, y: y + 12, text: L(v), size: 14, color: 'c0' }); }
    nums.forEach((v, i) => { const c = ['c3', 'c4', 'c1', 'c5', 'c6'][i % 5]; out.push({ type: 'ellipse', x1: px(v) - 7, y1: y - 7, x2: px(v) + 7, y2: y + 7, color: c, width: 2, fill: true }); out.push({ type: 'text', x: px(v) + 10, y: y - 40, text: L(v), size: 18, color: c }); });
    b.commit(); out.forEach((o) => { o.id = id(); b.objects.push(o); }); b.changed();
    const sorted = nums.slice().sort((a, c) => a - c);
    M.toast(`مرتبة تصاعدياً: ${sorted.map(L).join(' < ')}`, { time: 4500 });
  }
  function dataMode(preset) {
    openDock('data', 'الإحصاء والبيانات', 'stats', (body) => {
      const { row, inp } = inputRow('اكتب القيم: ٤ ٨ ١٥ ١٦ ٢٣ ٤٢', (v) => { execAt('stats', v); setTimeout(() => execAt('barchart', v), 50); }, 'حلّل');
      if (preset && preset.input) inp.value = preset.input;
      body.append(section('✍️ اكتب البيانات لأحسب المقاييس وأمثّلها بالأعمدة:'), row);
      const st = h('button', { class: 'btn sm ghost', html: icon('stats') + '<span>لوحة الإحصاء والاحتمالات</span>' });
      st.onclick = () => M.openPanel('stats');
      body.appendChild(h('div', { class: 'mode-row foot' }, st));
    });
  }
  function algebraMode(preset) {
    openDock('algebra', 'الجبر والحساب — اكتب وأنا أحل', 'algebra', (body) => {
      const { row, inp } = inputRow('معادلة أو تعبير: ٢س + ٣ = ١١ ، (س + ٢)² ، ٣/٤ + ١/٢', (v) => {
        const a = M.assistCore.analyzeText(v);
        if (!a) return;
        const p = a.sugg.find((s) => s.primary) || a.sugg[0];
        execAt(p.id, v);
      }, 'حلّ');
      if (preset && preset.input) inp.value = preset.input;
      body.append(section('✍️ اكتب بالقلم على السبورة أو هنا — سأحلّها بالخطوات:'), row, h('div', { class: 'hint' }, '💡 استخدم قلم الرياضيات (W) لتكتب بخط يدك، وسأعرض عليك ما يناسب: حل، رسم، تحليل…'));
      const pen = h('button', { class: 'btn sm ghost', html: icon('wand') + '<span>قلم الرياضيات</span>' });
      pen.onclick = () => M.setTool('mathpen');
      body.appendChild(h('div', { class: 'mode-row foot' }, pen));
    });
  }


  /* ================= الدائرة التفاعلية ================= */
  let activeCirc = null, circHook = null;
  const CG = () => M.circleGeo;
  const circOnPage = () => B().objects.filter((o) => o.type === 'circ');
  M.on('circ-active', (o) => { activeCirc = o; if (current === 'circle' && circHook) circHook(true); });
  M.on('circ-change', (o) => { if (current === 'circle' && circHook && o === activeCirc) circHook(false); });
  M.on('selection', () => { const sel = B().selectedObjs(); if (sel.length === 1 && sel[0].type === 'circ') { activeCirc = sel[0]; if (current === 'circle' && circHook) circHook(true); } });
  const uiZoom = () => (document.body.classList.contains('ui-zoomed') ? +getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom') || 1 : 1);
  /** مكان الدائرة وحجمها: بجوار لوحة الوضع، وبطاقة القوانين على يمينها */
  function placeCircle(o) {
    const b = B(), u = b.unit, s = b.view.s, [, vy] = b.viewCenter();
    const cardW = 380 * (M.settings.boardMode ? 1.3 : 1); // البطاقة مرسومة بوحدات السبورة
    let left = 0, W = 0;
    const room = (dw) => { left = b.toWorld(dw, 0)[0]; W = b.toWorld(b.w, 0)[0] - left; return Math.min((W - cardW - 80) / 2, (b.h / s) * 0.3); };
    let maxR = room(460 * uiZoom());
    if (maxR < 2.5 * u) maxR = room(0);
    o.r = Math.max(1.5 * u, Math.round((maxR * 0.85) / (u / 2)) * (u / 2));
    o.cx = left + Math.max(o.r + 30, (W - (2 * o.r + 40 + cardW)) / 2 + o.r);
    o.cy = vy;
  }
  function newCircle(scene) {
    const b = B();
    const o = CG().create(0, 0, 100, scene || 'basic');
    placeCircle(o);
    o.color = b.color;
    b.commit(); b.objects.push(o); b.changed();
    activeCirc = o;
    return o;
  }
  /** المماسان: نقرّب النقطة الخارجية لتبقى هي والبطاقة داخل الشاشة */
  function fitTangent(c) {
    const b = B(), right = b.toWorld(b.w, 0)[0], cardW = 380 * (M.settings.boardMode ? 1.3 : 1);
    const k = (right - cardW - 70 - c.cx) / c.r;
    c.e = { k: M.clamp(k, 1.35, 2.3), a: c.e ? c.e.a : 0.17 };
  }
  /** مشهدا الدحرجة والتقطيع أعرض من الدائرة: نصغّرها ونزيحها لتظهر الحركة كاملة */
  function fitWide(c, k) {
    const b = B(), s = b.view.s, u = b.unit;
    const dock = 460 * uiZoom(), left = b.toWorld(dock, 0)[0], W = b.toWorld(b.w, 0)[0] - left, H = b.h / s;
    const maxR = k === 'pi' ? Math.min((W - 60) / 8.9, H * 0.22) : Math.min((W - 480) / 3.5, H * 0.3);
    c.r = Math.max(u, Math.floor(maxR / (u / 2)) * (u / 2));
    c.cx = left + c.r + 40;
    c.cy = b.viewCenter()[1] + (k === 'pi' ? c.r * 0.4 : 0);
  }
  function circleMode(preset) {
    preset = preset || {};
    const b = B();
    // السبورة ضيقة واللوحة الجانبية مفتوحة ⇐ نطويها لتتسع الدائرة وبطاقتها
    const drawer = M.$('#drawer'), narrow = b.w < 1000 && drawer && !drawer.classList.contains('collapsed');
    if (narrow) drawer.classList.add('collapsed');
    let o = preset.attach || (activeCirc && b.objects.includes(activeCirc) ? activeCirc : circOnPage().slice(-1)[0]);
    if (!o) { o = newCircle(preset.scene); if (narrow) setTimeout(() => { b.resize(); placeCircle(o); if (o.scene === 'tangent') fitTangent(o); b.changed(); }, 420); }
    else if (preset.scene && o.scene !== preset.scene) { b.commit(); CG().setScene(o, preset.scene); b.changed(); }
    activeCirc = o;
    let infoBox, sliders, quizBox, chipsWrap, piRow;
    const cur = () => (activeCirc && b.objects.includes(activeCirc) ? activeCirc : null);
    const upd = () => { b.requestRender(); clearTimeout(upd._t); upd._t = setTimeout(() => b.changed(), 350); };
    openDock('circle', 'الدائرة التفاعلية — اسحب النقاط بالقلم أو بإصبعك', 'circleLab', (body) => {
      const S = CG().SCENES;
      const grp = (g) => Object.entries(S).filter(([, v]) => v.grp === g).map(([k, v]) => [k, v.t]);
      const pick = (k) => {
        const c = cur() || newCircle(k); b.commit();
        const disc = k === 'pi' || k === 'slices', wasDisc = c.scene === 'pi' || c.scene === 'slices';
        if (disc && !wasDisc) c.home = { cx: c.cx, cy: c.cy, r: c.r };
        if (!disc && wasDisc && c.home) { Object.assign(c, c.home); c.home = null; }
        CG().setScene(c, k);
        if (disc) fitWide(c, k);
        if (k === 'tangent') fitTangent(c);
        b.changed(); refresh(true);
        if (disc) setTimeout(() => CG().animate(c, k === 'pi' ? 3200 : 2600), 250);
      };
      chipsWrap = h('div');
      chipsWrap.append(section('📏 القياس:'), chipRow(grp('measure'), pick, 'circ-chips'), section('📐 نظريات الدائرة:'), chipRow(grp('thm'), pick, 'circ-chips'), section('💡 اكتشف بنفسك:'), chipRow(grp('discover'), pick, 'circ-chips'));
      body.appendChild(chipsWrap);
      sliders = h('div', { class: 'mode-sliders' });
      body.appendChild(sliders);
      piRow = h('div', { class: 'mode-row circ-pi' });
      body.appendChild(piRow);
      infoBox = h('div', { class: 'circ-info' });
      body.appendChild(infoBox);
      const acts = h('div', { class: 'mode-row foot circ-acts' });
      const btn = (ic, t, fn, cls) => { const x = h('button', { class: 'btn sm ' + (cls || 'ghost'), html: icon(ic) + `<span>${t}</span>` }); x.onclick = fn; acts.appendChild(x); return x; };
      btn('play', 'حرّك', () => { const c = cur(); if (!c) return; if (c.scene === 'pi' || c.scene === 'slices') CG().animate(c, c.scene === 'pi' ? 3200 : 2600); else if (c.scene === 'sector' || c.scene === 'segment') CG().sweep(c); else wiggle(c); }, 'primary');
      btn('text', 'اكتب النتائج على السبورة', () => writeInfo());
      btn('bulb', 'سؤال على هذا الشكل', () => askQuiz());
      btn('plus', 'دائرة جديدة', () => { newCircle(cur() ? cur().scene : 'basic'); refresh(true); });
      body.appendChild(acts);
      quizBox = h('div', { class: 'circ-quiz' });
      body.appendChild(quizBox);
      body.appendChild(h('div', { class: 'hint' }, '💡 النقاط الملوّنة تُسحب بالقلم أو بالإصبع مباشرة، والمركز م يحرّك الدائرة كلها. الزوايا تلتصق بالدرجات الصحيحة ومضاعفات ١٥°.'));
    });
    function refresh(full) {
      const c = cur();
      if (!infoBox) return;
      if (full) {
        M.$$('.circ-chips .chip', dock).forEach((x) => x.classList.toggle('active', !!c && x.dataset.k === c.scene));
        renderSliders(); renderPi();
      }
      infoBox.innerHTML = '';
      if (!c) return;
      const inf = CG().info(c);
      infoBox.appendChild(h('b', {}, '⭕ ' + inf.title));
      inf.lines.forEach((t) => infoBox.appendChild(h('div', {}, M.loc(t))));
      if (!full) syncSliders();
    }
    let sl = {};
    function slider(key, label, min, max, step, get, set) {
      const r = h('div', { class: 'lab-slider' });
      const rng = h('input', { type: 'range', min, max, step, value: get() });
      const val = h('input', { class: 'inp', type: 'number', min, max, step, value: get() });
      const apply = (v) => { v = M.clamp(+v, min, max); rng.value = v; val.value = v; set(v); upd(); refresh(false); };
      rng.oninput = () => apply(rng.value); val.onchange = () => apply(val.value);
      r.append(h('label', {}, label), rng, val);
      sliders.appendChild(r);
      sl[key] = { rng, val, get };
    }
    function syncSliders() { Object.values(sl).forEach((q) => { const v = Math.round(q.get() * 10) / 10; if (document.activeElement !== q.val) { q.rng.value = v; q.val.value = v; } }); }
    function renderSliders() {
      sliders.innerHTML = ''; sl = {};
      const c = cur(); if (!c) return;
      const u = b.unit;
      slider('r', 'نصف القطر (سم)', 0.5, 12, 0.5, () => c.r / u, (v) => (c.r = v * u));
      if (c.scene === 'sector' || c.scene === 'segment') slider('th', 'الزاوية المركزية θ°', 1, 359, 1, () => CG().thetaDeg(c), (v) => (c.a.B = c.a.A + (v * Math.PI) / 180));
      if (c.scene === 'slices') slider('n', 'عدد القطاعات', 4, 48, 2, () => c.n || 12, (v) => { c.n = v; c.anim = { t: 1 }; });
    }
    function renderPi() {
      piRow.innerHTML = '';
      const c = cur(); if (!c) return;
      piRow.appendChild(h('span', { class: 'hint' }, 'قيمة ط:'));
      [['pi', 'ط (دقيقة)'], ['3.14', '٣٫١٤'], ['22/7', '٢٢÷٧']].forEach(([k, t]) => {
        const x = h('button', { class: 'chip' + ((c.opts.pi || 'pi') === k ? ' active' : '') }, t);
        x.onclick = () => { c.opts.pi = k; upd(); refresh(true); };
        piRow.appendChild(x);
      });
      const card = h('button', { class: 'chip' + (c.opts.card !== false ? ' active' : '') }, '🗒️ البطاقة');
      card.onclick = () => { c.opts.card = c.opts.card === false; upd(); refresh(true); };
      piRow.appendChild(card);
    }
    /** تحريك نقطة ذهاباً وإياباً لإظهار أن العلاقة ثابتة */
    function wiggle(c) {
      const key = { tangentAt: 'A', inscribed: 'P', semicircle: 'P', sameArc: 'Q', cyclic: 'D', tangent: 'E', chord: 'B', chords: 'D', tanChord: 'P', basic: 'R' }[c.scene];
      if (!key) return;
      const t0 = performance.now(), dur = 4200;
      const base = key === 'E' ? Object.assign({}, c.e) : c.a[key];
      const step = (now) => {
        const t = Math.min(1, (now - t0) / dur), w = Math.sin(t * Math.PI * 2);
        if (key === 'E') c.e = { k: base.k + 0.5 * Math.sin(t * Math.PI * 4) * (t < 1 ? 1 : 0), a: base.a + 0.7 * w };
        else if (key === 'R') { c.a.R = base + w * 1.2; }
        else c.a[key] = base + 0.75 * w;
        b.requestRender(); refresh(false);
        if (t < 1) requestAnimationFrame(step); else { if (key === 'E') c.e = base; else c.a[key] = base; b.changed(); refresh(false); }
      };
      requestAnimationFrame(step);
    }
    function writeInfo() {
      const c = cur(); if (!c) return;
      const inf = CG().info(c);
      const bb = CG().bbox(c);
      const t = { id: Math.random().toString(36).slice(2, 10), type: 'text', x: bb[2], y: bb[3] + 12, text: M.loc(inf.title + '\n' + inf.lines.join('\n')), size: 20, color: 'c1' };
      b.commit(); b.objects.push(t); b.changed();
      M.toast('✓ كُتبت النتائج على السبورة');
    }
    function askQuiz() {
      const c = cur(); if (!c) return;
      const q = CG().quiz(c);
      quizBox.innerHTML = '';
      if (!q) { quizBox.appendChild(h('div', { class: 'hint' }, 'حرّك النقاط لتكوين شكل صالح أولاً.')); return; }
      const qt = h('div', { class: 'circ-q' }, '❓ ' + M.loc(q.q));
      const ans = h('div', { class: 'circ-a' });
      const show = h('button', { class: 'btn sm primary', html: icon('check') + '<span>أظهر الحل</span>' });
      show.onclick = () => { ans.innerHTML = ''; ans.appendChild(h('b', {}, '✓ الإجابة: ' + M.loc(typeof q.a === 'number' ? M.fmt(q.a) : q.a))); (q.steps || []).forEach((st) => ans.appendChild(h('div', {}, M.loc(st)))); };
      const toBoard = h('button', { class: 'btn sm ghost', html: icon('text') + '<span>اكتبه على السبورة</span>' });
      toBoard.onclick = () => { const bb = CG().bbox(c); b.commit(); b.objects.push({ id: Math.random().toString(36).slice(2, 10), type: 'text', x: bb[2], y: bb[1] - 60, text: M.loc('سؤال: ' + q.q), size: 21, color: 'c2' }); b.changed(); };
      quizBox.append(qt, h('div', { class: 'mode-row' }, show, toBoard), ans);
    }
    circHook = (full) => refresh(full);
    refresh(true);
    if (preset.quiz) askQuiz();
  }

  /* ================= نشاط تفاعلي لكل درس ================= */
  const SKILL_MODE = {
    slope: ['coord', { template: 'linear' }], functions: ['coord', { template: 'linear' }], coordinates: ['coord', {}], systems: ['coord', { input: 'ص = ٢س − ١' }],
    quadratic: ['coord', { template: 'quad' }], trigRatios: ['coord', { template: 'sin' }], trigEq: ['coord', { template: 'sin' }], radians: ['circle', { scene: 'sector' }], sector: ['circle', { scene: 'sector' }], sineRule: ['shapes', {}],
    logs: ['coord', { template: 'log' }], expEq: ['coord', { template: 'exp' }], derivative: ['coord', { template: 'cubic' }], limits: ['coord', { template: 'rational' }], integral: ['coord', { template: 'quad' }],
    transform: ['coord', {}], vectors: ['coord', {}], linIneq: ['numberline', { input: '٢س − ١ > ٥' }],
    volume: ['space3d', { solid: 'cuboid' }], volumes3: ['space3d', { solid: 'cylinder' }],
    perimeter: ['shapes', {}], area: ['shapes', {}], shapes: ['shapes', {}], angles: ['shapes', {}], parallel: ['shapes', {}], similarity: ['shapes', {}], circle: ['circle', { scene: 'basic' }], circleThm: ['circle', { scene: 'inscribed' }], pythagoras: ['shapes', {}],
    fracBasic: ['fractions', { input: '٣/٤ ، ٢/٤' }], fractions: ['fractions', { input: '٢/٣ ، ٣/٤' }], decimals: ['fractions', { input: '٣/١٠' }], fdp: ['fractions', { input: '١/٤' }], percent: ['fractions', { input: '٢٥/١٠٠' }], ratio: ['fractions', { input: '٢/٥ ، ٣/٥' }],
    count: ['numberline', { input: '٣ ، ٧ ، ١٢' }], compare: ['numberline', { input: '١٥ ، ٨ ، ١٢' }], placeValue: ['algebra', { input: '٣٥٤٧' }], negatives: ['numberline', { input: '−٤ ، −١ ، ٣' }], rounding: ['numberline', { input: '٣٤٧ ، ٣٥٠' }],
    stats: ['data', { input: '٤ ٨ ٦ ٥ ٨ ٧' }], groupedMean: ['data', { input: '١٢ ١٥ ١٥ ١٨ ٢٠' }], probability: ['data', {}], probComb: ['data', {}], perms: ['data', {}], distributions: ['data', {}], sets: ['numberline', {}],
  };
  const MODE_BG = { circle: 'grid', coord: 'coord', shapes: 'grid', space3d: 'space3d', fractions: 'grid', numberline: 'plain', data: 'grid', algebra: 'lines' };
  function lessonMode(lesson) {
    for (const s of lesson.s) if (SKILL_MODE[s]) return SKILL_MODE[s];
    if (/مجسم|حجم|شبك|مكعب|أسطوان|منشور|هرم|مخروط|كرة/.test(lesson.t)) return ['space3d', { tab: /شبك/.test(lesson.t) ? 'net' : 'solids', solid: /أسطوان/.test(lesson.t) ? 'cylinder' : /هرم/.test(lesson.t) ? 'sqPyramid' : /مخروط/.test(lesson.t) ? 'cone' : /كرة/.test(lesson.t) ? 'sphere' : 'cube' }];
    if (/دائر|قطاع|قوس|مماس|وتر في/.test(lesson.t) && !/مجسم/.test(lesson.t)) return ['circle', { scene: /قطاع|قوس/.test(lesson.t) ? 'sector' : /نظري|مماس/.test(lesson.t) ? 'inscribed' : 'basic' }];
    if (/إحداثي|دال|منحن|رسم بياني/.test(lesson.t)) return ['coord', {}];
    return ['algebra', {}];
  }
  function startLesson(lesson) {
    const [mode, preset] = lessonMode(lesson);
    const b = B();
    b.addPage(MODE_BG[mode] || 'grid');
    if (mode !== 'space3d') {
      // عنوان الدرس ومثال من مولّد أسئلته
      let q = null; try { q = M.practice.lessonQuestion(lesson); } catch (e) { /* */ }
      const [cx, cy] = b.viewCenter();
      if (M.visual) M.visual.addLessonMap(lesson, q, mode === 'algebra' || mode === 'fractions' || mode === 'numberline' || mode === 'data' ? 'center' : 'side');
      else {
        const txt = `📘 ${lesson.t}\n${lesson.d}` + (q ? `\n\n✏️ سؤال: ${M.htmlToPlain(q.text.replace(/<br>/g, ' — '))}` : '');
        const o = { id: Math.random().toString(36).slice(2, 10), type: 'text', x: cx + b.w / 2 / b.view.s - 30, y: cy - b.h / 2 / b.view.s + 30, text: M.loc(txt), size: 22, color: 'c1' };
        b.commit(); b.objects.push(o); b.changed();
      }
    }
    open(mode, preset);
    M.toast(`🎯 نشاط الدرس جاهز على السبورة: ${lesson.t}`, { time: 4000 });
  }

  /* ================= التشغيل ================= */
  function open(mode, preset) {
    if (mode !== 'space3d') closeSpace();
    ({ circle: circleMode, coord: coordMode, space3d: space3dMode, shapes: shapesMode, fractions: fractionsMode, numberline: numberlineMode, data: dataMode, algebra: algebraMode })[mode](preset || {});
  }
  // تغيير الخلفية: المستوى الإحداثي ⇐ وضع الرسم البياني، الفضاء ⇐ الوضع ثلاثي الأبعاد
  let lastPage = null, lastBg = null;
  M.on('page', ({ index, bg }) => {
    const b = B(); if (!b) return;
    if (suppressPage) { lastPage = index; lastBg = bg; return; }
    const changedPage = index !== lastPage;
    if (bg === 'space3d') { if (changedPage || lastBg !== 'space3d' || !M.space3d.isOpen()) openSpace({}); }
    else {
      closeSpace();
      if (bg === 'coord' && (lastBg !== 'coord' || changedPage) && M.settings.assist !== false) { if (current !== 'coord') coordMode({}); }
      else if (changedPage && current === 'coord' && bg !== 'coord') closeDock();
    }
    lastPage = index; lastBg = bg;
  });

  // بدء الرسم على السبورة يصغّر لوحة الوضع لتتسع مساحة الرسم (وتعود بنقرة على رأسها)
  const boardEl = document.getElementById('board');
  if (boardEl) boardEl.addEventListener('pointerdown', () => { if (dock && ['pen', 'mathpen', 'highlighter'].includes(B().tool)) dock.classList.add('min'); });
  document.addEventListener('click', (e) => { const hd = e.target.closest('.mode-head'); if (hd && !e.target.closest('button') && dock) dock.classList.toggle('min'); });
  M.modes = { newCircle, open, startLesson, lessonMode, closeDock, addTemplate, TPL, exitSpace, get current() { return current; }, _SKILL_MODE: SKILL_MODE };
})();
