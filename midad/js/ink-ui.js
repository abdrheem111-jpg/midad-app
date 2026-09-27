/* ==========================================================================
   واجهة الكتابة اليدوية: قلم الرياضيات (تعرّف تلقائي بعد التوقف)،
   قراءة السبورة، نافذة التصحيح والحل، وتدريب التطبيق على خط المستخدم
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  const strokesOf = (objs) => objs.filter((o) => o.type === 'stroke' && !o.hl && o.pts && o.pts.length).map((o) => o.pts);

  /** التعرّف مع اختيار وضع الأرقام تلقائياً */
  function recognize(strokes) {
    const pref = M.settings.inkDigits || 'arabic';
    if (pref !== 'auto') return M.ink.recognize(strokes, { mode: pref, dir: 'auto' });
    const a = M.ink.recognize(strokes, { mode: 'arabic', dir: 'auto' });
    const w = M.ink.recognize(strokes, { mode: 'western', dir: 'auto' });
    return w.confidence > a.confidence + 0.03 ? w : a;
  }
  /** محاولة الحل مع إرجاع نتيجة أو null */
  function trySolve(text) {
    try { return M.math.solve(text); } catch (e) { return null; }
  }

  /* ---------------- قلم الرياضيات ---------------- */
  // الخطوط تتراكم حتى يتصرف المستخدم (حل/نص/إغلاق)، أو يبدأ الكتابة في مكان بعيد
  let pending = [], timer = null, chip = null, shown = false;
  const bboxOfObjs = (objs) => objs.reduce((b, o) => { const q = M.boardUtil.bbox(o); return [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }, [Infinity, Infinity, -Infinity, -Infinity]);
  M.on('mathpen-stroke', (s) => {
    pending = pending.filter((o) => M.board.objects.includes(o));
    if (pending.length) {
      const b = bboxOfObjs(pending), q = M.boardUtil.bbox(s);
      const lineH = Math.max(30, b[3] - b[1]);
      // بعد عرض القراءة: أي خط خارج حدود التعبير الحالي يبدأ تعبيراً جديداً (ويُسمح بإضافة رمز ناقص بجواره)
      const k = shown ? [0.3, 1.5] : [1.2, 6];
      const far = q[1] > b[3] + lineH * k[0] || q[3] < b[1] - lineH * k[0] || q[0] > b[2] + lineH * k[1] || q[2] < b[0] - lineH * k[1];
      if (far) pending = [];
    }
    pending.push(s);
    shown = false;
    clearTimeout(timer);
    if (chip) { chip.remove(); chip = null; }
    timer = setTimeout(processPending, 1400);
  });
  M.on('page', () => { pending = []; if (chip) { chip.remove(); chip = null; } });
  function processPending() {
    const objs = pending.filter((o) => M.board.objects.includes(o));
    if (!objs.length) return;
    const res = recognize(strokesOf(objs));
    if (!res.text) return;
    showChip(objs, res);
    shown = true;
  }
  function showChip(objs, res) {
    const B = M.board;
    // المساعد الذكي: يقترح ما يناسب ما كُتب (حل، رسم، تحليل…)
    if (M.assist && M.settings.assist !== false) {
      M.assist.showText(res.text, objs, {
        editable: true,
        onCorrect: (t) => { if (t !== res.text) { const n = M.ink.learnFromCorrection(res, t.replace(/\n/g, '')); if (n) M.toast(`تعلّمتُ ${L(n)} ${n > 1 ? 'رموز' : 'رمزاً'} من تصحيحك ✨`); res = Object.assign({}, res, { text: t }); } },
        onReplaceText: (t) => {
          const bb = objs.reduce((b, o) => { const q = M.boardUtil.bbox(o); return [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }, [Infinity, Infinity, -Infinity, -Infinity]);
          B.commit();
          B.page.objects = B.objects.filter((o) => !objs.includes(o));
          const size = Math.max(22, ((bb[3] - bb[1]) / Math.max(1, t.split('\n').length)) * 0.8);
          B.objects.push({ id: Math.random().toString(36).slice(2, 10), type: 'text', x: bb[2], y: bb[1], text: M.loc(t), size, color: objs[0].color });
          B.changed();
          pending = [];
        },
      });
      chip = null;
      return;
    }
    const bb = objs.reduce((b, o) => { const q = M.boardUtil.bbox(o); return [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }, [Infinity, Infinity, -Infinity, -Infinity]);
    const [sx, sy] = B.toScreen((bb[0] + bb[2]) / 2, bb[3]);
    chip = h('div', { class: 'ink-chip' });
    const txt = h('input', { class: 'ink-chip-text', value: res.text.replace(/\n/g, ' ؛ '), dir: 'auto', title: 'يمكنك تصحيح النص قبل الحل' });
    const solveB = h('button', { class: 'btn sm primary', html: icon('check') + '<span>حلّ</span>' });
    const repB = h('button', { class: 'btn sm', html: icon('text') + '<span>نص مطبوع</span>' });
    const x = h('button', { class: 'icon-btn sm', html: icon('close'), title: 'إغلاق' });
    // دالة بدلالة س (ص = … أو تعبير دون =) ⇐ زر رسمها على المستوى الإحداثي
    const isFn = (t) => /[سx]/.test(t) && !/\n/.test(t) && (/^\s*[صy]\s*=/.test(t) || !/[=<>]/.test(t)) && !/[صy]/.test(t.replace(/^\s*[صy]\s*=/, ''));
    const plotB = h('button', { class: 'btn sm teal', html: icon('function') + '<span>ارسمها</span>' });
    plotB.onclick = () => { learnIfChanged(); const o = B.addGraph(corrected()); if (o) { M.toast('📈 رُسمت الدالة على المستوى الإحداثي'); chip.remove(); chip = null; pending = []; } };
    if (!isFn(res.text)) plotB.style.display = 'none';
    txt.addEventListener('input', () => (plotB.style.display = isFn(txt.value) ? '' : 'none'));
    chip.append(h('span', { class: 'ink-chip-label' }, '✍️ قرأتُ:'), txt, solveB, plotB, repB, x);
    chip.style.right = Math.max(8, B.w - sx - 160) + 'px';
    chip.style.top = Math.min(B.h - 60, sy + 10) + 'px';
    M.$('#overlays').appendChild(chip);
    const corrected = () => txt.value.replace(/ ؛ /g, '\n');
    const learnIfChanged = () => {
      const c = corrected();
      if (c !== res.text) { const n = M.ink.learnFromCorrection(res, c.replace(/\n/g, '')); if (n) M.toast(`تعلّمتُ ${L(n)} ${n > 1 ? 'رموز' : 'رمزاً'} من تصحيحك ✨`); }
    };
    solveB.onclick = () => {
      learnIfChanged();
      const r = trySolve(corrected());
      if (!r) { M.toast('لم أتمكن من حل هذا التعبير — صحّح النص ثم أعد المحاولة', { type: 'warn' }); return; }
      const ans = '⇐ ' + M.htmlToPlain(r.answer);
      B.add({ type: 'text', x: bb[2], y: bb[3] + 10, text: ans, size: Math.max(20, (bb[3] - bb[1]) * 0.55), color: 'c4' });
      M.toast('تمت إضافة الحل تحت ما كتبت — التفاصيل في لوحة الجبر');
      if (M.algebra) { M.openPanel('algebra'); M.algebra.solve(corrected()); }
      chip.remove(); chip = null; pending = [];
    };
    repB.onclick = () => {
      learnIfChanged();
      B.commit();
      B.page.objects = B.objects.filter((o) => !objs.includes(o));
      const size = Math.max(22, (bb[3] - bb[1]) / Math.max(1, corrected().split('\n').length) * 0.8);
      B.objects.push({ id: Math.random().toString(36).slice(2, 10), type: 'text', x: bb[2], y: bb[1], text: M.loc(corrected()), size, color: objs[0].color });
      B.changed();
      chip.remove(); chip = null; pending = [];
    };
    x.onclick = () => { chip.remove(); chip = null; pending = []; };
    txt.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') solveB.click(); });
  }

  /* ---------------- قراءة كل الكتابة على السبورة ---------------- */
  function readBoard() {
    const objs = M.board.objects.filter((o) => o.type === 'stroke' && !o.hl);
    if (!objs.length) return null;
    const res = recognize(strokesOf(objs));
    return { res, objs };
  }
  /** نافذة: ما قرأه التطبيق من السبورة مع التصحيح والحل */
  function openReader(sel) {
    const objs = sel && sel.length ? sel : M.board.objects.filter((o) => o.type === 'stroke' && !o.hl);
    if (!objs.length) return M.toast('لا توجد كتابة يدوية على الصفحة — اكتب بالقلم أو قلم الرياضيات');
    const res = recognize(strokesOf(objs));
    const wrap = h('div', { class: 'stack' });
    wrap.appendChild(h('div', { class: 'hint' }, 'هذا ما قرأته من كتابتك. صحّح أي رمز إن لزم، وسأتعلّم من تصحيحك لأقرأ خطك بدقة أكبر.'));
    const rows = (res.rows.length ? res.rows : [res.text]).map((t) => {
      const inp = h('input', { class: 'inp math-inp', value: t, dir: 'auto' });
      const out = h('div');
      const upd = () => {
        out.innerHTML = '';
        const r = trySolve(inp.value);
        if (r) out.appendChild(M.renderResult(r, { strategy: 'steps' }));
        else if (inp.value.trim()) out.innerHTML = '<div class="hint">لا يبدو هذا السطر معادلة أو تعبيراً قابلاً للحل.</div>';
      };
      inp.addEventListener('input', M.debounce(upd, 400));
      const row = h('div', { class: 'card' }, inp, out);
      setTimeout(upd, 0);
      return { inp, row };
    });
    rows.forEach((r) => wrap.appendChild(r.row));
    if (rows.length > 1) {
      const sys = h('button', { class: 'btn', html: icon('algebra') + '<span>حلّها كنظام معادلات</span>' });
      sys.onclick = () => { if (M.algebra) { m.close(); M.openPanel('algebra'); M.algebra.solve(rows.map((r) => r.inp.value).join('\n')); } };
      wrap.appendChild(sys);
    }
    const acts = h('div', { class: 'row' });
    const learnB = h('button', { class: 'btn teal', html: icon('wand') + '<span>احفظ تصحيحي وتعلّم</span>' });
    learnB.onclick = () => {
      const n = M.ink.learnFromCorrection(res, rows.map((r) => r.inp.value).join('').replace(/\s/g, ''));
      M.toast(n ? `تعلّمتُ ${L(n)} ${n > 1 ? 'رموز' : 'رمزاً'} من خطك ✨` : 'لا يوجد ما أتعلّمه (القراءة مطابقة، أو عدد الرموز تغيّر)');
    };
    const trainB = h('button', { class: 'btn ghost', html: icon('pen') + '<span>درّب التطبيق على خطي</span>' });
    trainB.onclick = () => { m.close(); openTrainer(); };
    acts.append(learnB, trainB);
    wrap.appendChild(acts);
    wrap.appendChild(h('div', { class: 'hint' }, `زمن القراءة: ${L(res.ms)} مللي ثانية · الثقة ${L(Math.round(res.confidence * 100))}٪`));
    const m = M.modal({ title: 'قراءة الكتابة اليدوية', icon: 'pen', body: wrap, size: 'lg' });
  }

  /* ---------------- تدريب التطبيق على خط المستخدم ---------------- */
  function openTrainer() {
    const mode = M.settings.inkDigits === 'western' ? 'western' : 'arabic';
    const labels = M.ink.labels[mode].filter((l) => l !== '٫');
    const wrap = h('div', { class: 'trainer' });
    const grid = h('div', { class: 'trainer-grid' });
    const padWrap = h('div', { class: 'trainer-pad' });
    const cv = h('canvas', { width: 280, height: 280 });
    const lab = h('div', { class: 'trainer-target' });
    const info = h('div', { class: 'hint' });
    const row = h('div', { class: 'row', style: { justifyContent: 'center' } });
    const clr = h('button', { class: 'btn sm', html: icon('eraser') + '<span>امسح</span>' });
    const save = h('button', { class: 'btn sm primary', html: icon('check') + '<span>احفظ هذا المثال</span>' });
    row.append(clr, save);
    padWrap.append(lab, cv, row, info);
    const reset = h('button', { class: 'btn sm ghost', html: icon('reset') + '<span>انسَ كل ما تعلّمته من خطي</span>' });
    wrap.append(h('div', { class: 'hint' }, 'اختر رمزاً ثم اكتبه في المربع كما تكتبه عادة، واحفظه. ٣ أمثلة لكل رمز تكفي ليتعرّف التطبيق على خطك بدقة.'), h('div', { class: 'trainer-body' }, grid, padWrap), reset);
    let cur = labels[0], strokes = [], drawing = null;
    const ctx = cv.getContext('2d');
    const paint = () => {
      ctx.fillStyle = M.settings.theme === 'white' ? '#fff' : '#1d3830';
      ctx.fillRect(0, 0, 280, 280);
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(i * 70, 0); ctx.lineTo(i * 70, 280); ctx.moveTo(0, i * 70); ctx.lineTo(280, i * 70); ctx.stroke(); }
      ctx.strokeStyle = M.settings.theme === 'white' ? '#1b2330' : '#f4f1e8'; ctx.lineWidth = 5; ctx.lineCap = ctx.lineJoin = 'round';
      strokes.forEach((s) => { ctx.beginPath(); s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
    };
    const renderGrid = () => {
      const st = M.ink.userStats();
      grid.innerHTML = '';
      labels.forEach((l) => {
        const b = h('button', { class: 'trainer-sym' + (l === cur ? ' active' : '') }, h('b', {}, l), h('small', {}, L(st[l] || 0)));
        b.onclick = () => { cur = l; strokes = []; paint(); renderGrid(); upd(); };
        grid.appendChild(b);
      });
    };
    const upd = () => { lab.innerHTML = `اكتب: <b>${cur}</b>`; info.textContent = `أمثلة محفوظة لهذا الرمز: ${L(M.ink.userStats()[cur] || 0)}`; };
    cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); drawing = [[e.offsetX, e.offsetY]]; strokes.push(drawing); paint(); });
    cv.addEventListener('pointermove', (e) => { if (drawing) { drawing.push([e.offsetX, e.offsetY]); paint(); } });
    cv.addEventListener('pointerup', () => (drawing = null));
    clr.onclick = () => { strokes = []; paint(); };
    save.onclick = () => {
      if (!strokes.length) return M.toast('اكتب الرمز أولاً');
      M.ink.learn(cur, strokes.map((s) => s.slice()));
      strokes = []; paint(); renderGrid(); upd();
      M.toast('تم الحفظ ✓');
    };
    reset.onclick = async () => { if (await M.confirm('سيُحذف كل ما تعلّمه التطبيق من خطك. متأكد؟', 'احذف')) { M.ink.resetUser(); renderGrid(); upd(); } };
    paint(); renderGrid(); upd();
    M.modal({ title: 'درّب مِداد على خطك', icon: 'pen', body: wrap, size: 'lg' });
  }

  // تجهيز قوالب التعرّف في وقت الفراغ لتكون أول قراءة فورية
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  idle(() => { try { M.ink.warm(); } catch (e) { /* */ } });

  M.inkUI = { recognize, readBoard, openReader, openTrainer };
})();
