/* ==========================================================================
   المساعد الذكي على السبورة: شريط اقتراحات يظهر بجوار ما كتبته أو رسمته أو
   حدّدته، ويسألك ماذا تريد (حل، رسم، معادلة المنحنى، قياسات، تحويلات هندسية،
   طيّ الشبكة إلى مجسم…) ثم ينفّذ ذلك على السبورة مباشرة
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const E = M.math;
  const A = M.assistCore;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 2 : d);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const B = () => M.board;
  const enabled = () => M.settings.assist !== false;

  let bar = null, ctx = null;

  /* ---------------- أدوات الرسم على السبورة ---------------- */
  const U = () => B().unit;
  const toW = (mx, my) => [mx * U(), -my * U()];
  function commitObjs(list) { const b = B(); b.commit(); list.forEach((o) => { o.id = o.id || uid(); b.objects.push(o); }); b.changed(); }
  function textObj(x, y, text, size, color) { return { type: 'text', x, y, text: L(text), size: size || 20, color: color || 'c1' }; }
  function pointObjs(mx, my, label, color) {
    const [x, y] = toW(mx, my), r = 6;
    return [{ type: 'ellipse', x1: x - r, y1: y - r, x2: x + r, y2: y + r, color: color || 'c1', width: 2, fill: true }, textObj(x + 18 + label.length * 5, y - 32, label, 17, color || 'c1')];
  }
  const P = (x, y) => `(${F(x)}، ${F(y)})`;
  function anchorBox() {
    if (ctx && ctx.bbox) return ctx.bbox;
    const [cx, cy] = B().viewCenter();
    return [cx - 50, cy - 20, cx + 50, cy + 20];
  }
  /** كتابة سطر تحت العنصر المرتبط */
  function writeBelow(text, color) {
    const b = anchorBox();
    const lines = String(text).split('\n').length;
    commitObjs([textObj(b[2], b[3] + 12, text, Math.max(18, Math.min(28, (b[3] - b[1]) * 0.5 || 22)), color || 'c4')]);
    if (ctx && ctx.bbox) ctx.bbox = [b[0], b[1], b[2], b[3] + 34 * lines];
  }
  const plain = (html) => M.htmlToPlain(String(html));

  /* ---------------- الشريط ---------------- */
  function hide() { if (bar) { bar.remove(); bar = null; } ctx = null; }
  function position() {
    if (!bar || !ctx) return;
    const b = anchorBox(), Bd = B();
    const [sx, sy] = Bd.toScreen((b[0] + b[2]) / 2, b[3]);
    const [, sy0] = Bd.toScreen(0, b[1]);
    const w = bar.offsetWidth || 360, hgt = bar.offsetHeight || 120;
    let top = sy + 14;
    if (top + hgt > Bd.h - 70) top = Math.max(8, sy0 - hgt - 14);
    bar.style.left = Math.max(8, Math.min(Bd.w - w - 8, sx - w / 2)) + 'px';
    bar.style.top = Math.max(8, Math.min(Bd.h - hgt - 8, top)) + 'px';
  }
  /**
   * عرض اقتراحات: a = نتيجة التحليل {head, sugg}، c = السياق {text, objs, bbox, editable, …}
   */
  function show(a, c) {
    hide();
    if (!a || !a.sugg || !a.sugg.length) return;
    ctx = Object.assign({ analysis: a }, c);
    bar = h('div', { class: 'assist', role: 'dialog' });
    const head = h('div', { class: 'assist-head', html: `<span class="assist-spark">${icon('sparkles')}</span><span class="assist-q">${a.head}</span>` });
    const x = h('button', { class: 'icon-btn sm', title: 'إغلاق', html: icon('close') });
    x.onclick = hide;
    head.appendChild(x);
    bar.appendChild(head);
    if (c.editable) {
      const inp = h('input', { class: 'inp assist-inp', value: (c.text || '').replace(/\n/g, ' ؛ '), dir: 'auto', title: 'يمكنك تصحيح القراءة' });
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { const p = ctx.analysis.sugg.find((s) => s.primary) || ctx.analysis.sugg[0]; run(p.id); } if (e.key === 'Escape') hide(); });
      inp.addEventListener('input', M.debounce(() => {
        const t = inp.value.replace(/ ؛ /g, '\n');
        const na = A.analyzeText(t);
        if (na) { ctx.text = t; ctx.analysis = na; renderChips(); bar.querySelector('.assist-q').innerHTML = na.head; }
      }, 300));
      bar.appendChild(inp);
      ctx.input = inp;
    }
    const chips = h('div', { class: 'assist-chips' });
    bar.appendChild(chips);
    const out = h('div', { class: 'assist-out' });
    bar.appendChild(out);
    ctx.chips = chips; ctx.out = out;
    renderChips();
    bar.addEventListener('pointerdown', (e) => e.stopPropagation());
    M.$('#overlays').appendChild(bar);
    requestAnimationFrame(() => { position(); bar && bar.classList.add('show'); });
  }
  function renderChips() {
    const a = ctx.analysis, chips = ctx.chips;
    chips.innerHTML = '';
    const list = a.sugg.slice();
    (ctx.extra || []).forEach((s) => list.push(s));
    list.forEach((s) => {
      const b = h('button', { class: 'chip assist-chip' + (s.primary ? ' primary' : ''), html: `${icon(s.icon || 'sparkles')}<span>${s.label}</span>` });
      b.onclick = () => run(s.id);
      chips.appendChild(b);
    });
  }
  function result(html, buttons) {
    if (!ctx || !ctx.out) return;
    ctx.out.innerHTML = html;
    (buttons || []).forEach(([label, fn]) => { const b = h('button', { class: 'btn sm ghost' }, label); b.onclick = fn; ctx.out.appendChild(b); });
    position();
  }
  function run(id) {
    if (!ctx) return;
    if (ctx.input && ctx.onCorrect) ctx.onCorrect(ctx.text);
    const fn = ACTIONS[id];
    if (!fn) return;
    try { fn(ctx); } catch (e) { console.error(e); result(`<div class="err">تعذّر التنفيذ: ${M.esc(e.message)}</div>`); }
  }

  /* ---------------- الإجراءات ---------------- */
  const txt = (c) => (c.text || '').trim();
  function solveAndShow(c, phrase, openPanel) {
    const q = phrase || txt(c);
    let r = null;
    try { r = E.solve(q); } catch (e) { /* نجرب فهم السؤال */ }
    if (!r) { const u = M.nlu.understand(q); if (u && u.type === 'result') r = u.result; }
    if (!r) { result('<div class="err">لم أتمكن من حل هذا — صحّح النص ثم أعد المحاولة.</div>'); return null; }
    writeBelow('⇐ ' + plain(r.answer));
    const steps = (r.steps || []).slice(0, 5);
    const flow = steps.length && M.visual ? M.visual.flowHTML(steps, r.answer, { compact: true }).outerHTML : '';
    result(`<div class="assist-res"><b>${r.title || 'الحل'}:</b> ${r.answer}${flow}</div>`, [['الخطوات كاملة في المعلم الذكي', () => M.tutor.send(q)]].concat(openPanel && M.algebra ? [['افتح في الجبر', () => { M.openPanel('algebra'); M.algebra.solve(q); }]] : []));
    return r;
  }
  function fnExpr(c) { return (c.analysis.expr || '').trim() || txt(c).replace(/^\s*(ص|y)\s*=\s*/, ''); }
  function fnOfText(src) { const ast = E.parse(src); return { ast, f: E.compile(ast) }; }
  function rootsOf(f, a, b) { return E.findRoots((x) => f(x), a == null ? -50 : a, b == null ? 50 : b, 20000).map((r) => Math.round(r * 1e6) / 1e6); }
  function graphIt(src, label) { const o = B().addGraph(src, label ? { label } : undefined); return o; }
  function fnProps(src) {
    const { ast, f } = fnOfText(src);
    const out = [], pts = [];
    const c = (() => { try { return E.polyCoeffs(ast, 'x', 6); } catch (e) { return null; } })();
    const zs = rootsOf(f).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 6);
    out.push(`<b>الأصفار (التقاطع مع محور س):</b> ${zs.length ? zs.map((z) => P(z, 0)).join('، ') : 'لا توجد في المدى [−٥٠، ٥٠]'}`);
    zs.forEach((z) => pts.push(...pointObjs(z, 0, P(z, 0), 'c2')));
    const y0 = f(0);
    if (Number.isFinite(y0)) { out.push(`<b>المقطع الصادي:</b> ${P(0, y0)}`); pts.push(...pointObjs(0, y0, P(0, y0), 'c3')); }
    if (c && c.length === 2) out.push(`<b>الميل:</b> ${M.fracHTML(c[1])} — ${c[1] > 0 ? 'المستقيم صاعد' : c[1] < 0 ? 'المستقيم نازل' : 'أفقي'}`);
    if (c && c.length === 3) {
      const xv = -c[1] / (2 * c[2]), yv = f(xv);
      out.push(`<b>الرأس:</b> ${P(xv, yv)} — ${c[2] > 0 ? 'قيمة صغرى (مفتوح للأعلى)' : 'قيمة عظمى (مفتوح للأسفل)'}`, `<b>محور التماثل:</b> ${M.varName('x')} = ${F(xv)}`);
      pts.push(...pointObjs(xv, yv, 'الرأس ' + P(xv, yv), 'c1'));
    }
    return { html: out.join('<br>'), pts };
  }

  const ACTIONS = {
    solve: (c) => solveAndShow(c, null, true),
    calc: (c) => solveAndShow(c),
    simplify: (c) => solveAndShow(c, 'بسط ' + txt(c)),
    factor: (c) => solveAndShow(c, 'حلل ' + txt(c)),
    factor_eq: (c) => { const [l, r] = txt(c).split('='); const z = (() => { try { return E.evaluate(E.parse(r), {}, 'rad') === 0; } catch (e) { return false; } })(); solveAndShow(c, 'حلل ' + (z ? l : `${l} - (${r})`)); },
    deriv: (c) => solveAndShow(c, 'مشتقة ' + txt(c)),
    ask: (c) => M.tutor.send(txt(c)),
    graph: (c) => { const o = graphIt(fnExpr(c)); if (o) result('📈 رُسمت على المستوى الإحداثي. حدّد المنحنى لاحقاً لتعرف خصائصه.', [['الخصائص', () => run('props')]]); },
    graph_rel: (c) => { const rel = E.parseRelation(txt(c)); const vars = new Set(); E.variables(rel.lhs, vars); E.variables(rel.rhs, vars); const r = E.solveForVar(rel, 'x', vars); const y = plain(r.answer).replace(/^.*?=/, ''); graphIt(y, txt(c)); result(`📈 ${M.esc(L(txt(c)))} ⇐ ${plain(r.answer)}`); },
    graph_eq: (c) => {
      const [l, r] = txt(c).split('=');
      graphIt(l); graphIt(r);
      const f = E.compile(E.parse(`(${l}) - (${r})`)), g = E.compile(E.parse(l));
      const zs = rootsOf(f).slice(0, 4);
      const pts = zs.flatMap((z) => pointObjs(z, g(z), `${M.varName('x')} = ${F(z)}`, 'c1'));
      commitObjs(pts);
      result(`الحل بيانياً: الإحداثي السيني لنقاط تقاطع الطرفين ⇐ <b>${zs.map((z) => `${M.varName('x')} = ${F(z)}`).join('، ') || 'لا تقاطع'}</b>`);
    },
    graph_ineq: (c) => { const [l, r] = txt(c).split(/<=|>=|≤|≥|<|>/); graphIt(l); graphIt(r); result('📈 رُسم الطرفان — الحل حيث يكون المنحنى الأول فوق/تحت الثاني.'); },
    graph_system: (c) => {
      const exprs = c.analysis.lines.map((ln) => { const rel = E.parseRelation(ln); const vars = new Set(); E.variables(rel.lhs, vars); E.variables(rel.rhs, vars); return plain(E.solveForVar(rel, 'x', vars).answer).replace(/^.*?=/, ''); });
      exprs.forEach((e, i) => graphIt(e, c.analysis.lines[i]));
      if (exprs.length >= 2) {
        const f = E.compile(E.parse(`(${exprs[0]}) - (${exprs[1]})`)), g = E.compile(E.parse(exprs[0]));
        const zs = rootsOf(f);
        if (zs.length) { commitObjs(pointObjs(zs[0], g(zs[0]), 'التقاطع ' + P(zs[0], g(zs[0])), 'c1')); result(`نقطة التقاطع = حل النظام: <b>${P(zs[0], g(zs[0]))}</b>`); } else result('المستقيمان متوازيان — لا يوجد حل.');
      }
    },
    graph3d: (c) => { M.lab.open('graph3d', c.analysis.expr); result('🧊 فُتح الرسم في مختبر المجسمات — اسحب لتدويره.', [['كبّر العرض', () => M.lab.openBig()]]); },
    props: (c) => {
      const objs = c.objs || [];
      const o = objs.find((q) => q.type === 'fn');
      if (o && o.vline != null) { result(`مستقيم رأسي معادلته <b>${M.varName('x')} = ${F(o.vline)}</b> — ميله غير معرّف.`); return; }
      const src = o ? o.expr : fnExpr(c);
      if (!o && c.analysis.kind === 'function') graphIt(src);
      const pr = fnProps(src);
      commitObjs(pr.pts);
      result(`<div class="assist-res">${pr.html}</div>`);
    },
    table: (c) => {
      const o = (c.objs || []).find((q) => q.type === 'fn');
      const src = o ? o.expr : fnExpr(c);
      const { f } = fnOfText(src);
      const xs = [-3, -2, -1, 0, 1, 2, 3];
      const ys = xs.map((x) => { const v = f(x); return Number.isFinite(v) ? F(v) : '—'; });
      writeBelow(`${M.varName('x')}:  ${xs.map((x) => L(x)).join('    ')}\n${M.varName('y')}:  ${ys.join('    ')}`, 'c1');
      result('📋 كُتب جدول القيم على السبورة.');
    },
    deriv_graph: (c) => {
      const o = (c.objs || []).find((q) => q.type === 'fn');
      const src = o ? o.expr : fnExpr(c);
      const d = E.derivative(E.parse(src), 'x');
      const dt = plain(E.toText(d, false));
      if (!o && c.analysis.kind === 'function') graphIt(src);
      graphIt(dt, `${M.varName('y')}′ = ${dt}`);
      result(`المشتقة: <b>${M.varName('y')}′ = ${M.esc(L(dt))}</b> — لاحظ أن المشتقة تساوي صفراً عند القيم العظمى والصغرى.`);
    },
    open_algebra: (c) => { const o = (c.objs || []).find((q) => q.type === 'fn'); M.openPanel('algebra'); M.algebra.graphText('ص = ' + (o ? o.expr : fnExpr(c))); },
    intersect: (c) => {
      const [a, b] = c.objs.filter((o) => o.type === 'fn');
      const f = E.compile(E.parse(`(${a.expr}) - (${b.expr})`)), g = E.compile(E.parse(a.expr));
      const zs = rootsOf(f).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 6);
      commitObjs(zs.flatMap((z) => pointObjs(z, g(z), P(z, g(z)), 'c1')));
      result(zs.length ? `نقاط التقاطع: <b>${zs.map((z) => P(z, g(z))).join('، ')}</b>` : 'المنحنيان لا يتقاطعان في المدى [−٥٠، ٥٠].');
    },
    tangent: (c) => {
      const fo = c.objs.find((o) => o.type === 'fn');
      const t = M.fnTangent.addTangent(fo, 1);
      hide();
      const inf = M.fnTangent.info(t);
      M.toast('📐 اسحب النقطة الوردية على المنحنى: يتغيّر المماس وميله ومعادلته مباشرة' + (inf && inf.k ? ` — الآن الميل ${F(inf.k.m)}` : ''), { time: 6000 });
    },
    intersect_line: (c) => {
      const fo = c.objs.find((o) => o.type === 'fn'), ln = c.objs.find((o) => o.type === 'line'), u = U();
      const x1 = ln.x1 / u, y1 = -ln.y1 / u, x2 = ln.x2 / u, y2 = -ln.y2 / u, g = E.compile(E.parse(fo.expr));
      let zs;
      if (Math.abs(x2 - x1) < 1e-9) zs = [x1];
      else { const m = (y2 - y1) / (x2 - x1), k = y1 - m * x1; zs = rootsOf(E.compile(E.parse(`(${fo.expr}) - (${m}*x + ${k})`))).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 6); }
      zs = zs.filter((z) => Number.isFinite(g(z)));
      commitObjs(zs.flatMap((z) => pointObjs(z, g(z), P(z, g(z)), 'c1')));
      result(zs.length ? `نقاط تقاطع المستقيم مع المنحنى: <b>${zs.map((z) => P(z, g(z))).join('، ')}</b> — نحلّ د(س) = معادلة المستقيم` : 'المستقيم لا يقطع المنحنى في المدى [−٥٠، ٥٠].');
    },
    numberline: (c) => {
      const s = A.solveIneq(txt(c));
      const b = anchorBox(), Bd = B();
      const roots = s.roots.length ? s.roots : [0];
      const lo = Math.floor(Math.min(...roots)) - 4, hi = Math.ceil(Math.max(...roots)) + 4;
      const span = hi - lo, W = Math.max(360, span * 36), px = (v) => b[0] + ((v - lo) / span) * W, y = b[3] + 60;
      const out = [{ type: 'arrow', x1: px(lo) - 10, y1: y, x2: px(hi) + 20, y2: y, color: 'c0', width: 2 }, { type: 'arrow', x1: px(hi) + 10, y1: y, x2: px(lo) - 20, y2: y, color: 'c0', width: 2 }];
      for (let v = lo; v <= hi; v++) { out.push({ type: 'line', x1: px(v), y1: y - 7, x2: px(v), y2: y + 7, color: 'c0', width: 1.5 }); out.push(textObj(px(v) + 6, y + 12, String(v), 14, 'c0')); }
      s.intervals.forEach(([a1, b1]) => {
        const xa = Number.isFinite(a1) ? px(a1) : px(lo) - 16, xb = Number.isFinite(b1) ? px(b1) : px(hi) + 16;
        out.push({ type: Number.isFinite(a1) && Number.isFinite(b1) ? 'line' : 'arrow', x1: Number.isFinite(a1) ? xa : xb, y1: y, x2: Number.isFinite(a1) ? xb : xa, y2: y, color: 'c4', width: 6 });
      });
      s.roots.forEach((r) => out.push({ type: 'ellipse', x1: px(r) - 8, y1: y - 8, x2: px(r) + 8, y2: y + 8, color: 'c4', width: 3, fill: s.inclusive }));
      commitObjs(out);
      const desc = s.intervals.map(([a1, b1]) => (!Number.isFinite(a1) ? `${M.varName('x')} ${s.inclusive ? '≤' : '<'} ${F(b1)}` : !Number.isFinite(b1) ? `${M.varName('x')} ${s.inclusive ? '≥' : '>'} ${F(a1)}` : `${F(a1)} ${s.inclusive ? '≤' : '<'} ${M.varName('x')} ${s.inclusive ? '≤' : '<'} ${F(b1)}`)).join(' أو ');
      result(`الحل: <b>${desc || 'لا يوجد'}</b> — ${s.inclusive ? 'الدائرة المظللة تعني أن العدد ضمن الحل' : 'الدائرة المفرغة تعني أن العدد ليس ضمن الحل'}.`);
      if (ctx) ctx.bbox = [b[0], b[1], b[2], y + 40];
      void Bd;
    },
    fraction_viz: (c) => {
      const { n, d } = c.analysis;
      const b = anchorBox(), R = 55, out = [];
      const whole = Math.max(1, Math.ceil(n / d));
      for (let k = 0; k < whole; k++) {
        const cx = b[2] - R - k * (2 * R + 24), cy = b[3] + R + 30;
        for (let i = 0; i < d; i++) {
          const a0 = -Math.PI / 2 + (2 * Math.PI * i) / d, a1 = -Math.PI / 2 + (2 * Math.PI * (i + 1)) / d;
          const pts = [[cx, cy]]; for (let s = 0; s <= 12; s++) { const a = a0 + ((a1 - a0) * s) / 12; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
          out.push({ type: 'poly', pts, color: k * d + i < n ? 'c4' : 'c0', width: 2, fill: k * d + i < n });
        }
      }
      if (n <= d) {
        const x0 = b[2] - 2 * R * Math.max(2, whole) - 30, y0 = b[3] + 2 * R + 70, W = 2 * R * 2.2, cw = W / d;
        for (let i = 0; i < d; i++) out.push({ type: 'rect', x1: x0 + i * cw, y1: y0, x2: x0 + (i + 1) * cw, y2: y0 + 34, color: i < n ? 'c4' : 'c0', width: 2, fill: i < n });
      }
      commitObjs(out);
      const g = (function gcd(a, bb) { return bb ? gcd(bb, a % bb) : a; })(n, d);
      result(`${M.fracHTML(n / d)} يعني ${L(n)} أجزاء من ${L(d)} أجزاء متساوية${g > 1 ? ` — وبعد القسمة على ${L(g)}: ${L(n / g)}/${L(d / g)}` : ''} = ${F(n / d, 3)} = ${F((100 * n) / d, 1)}٪`);
    },
    stats: (c) => {
      const s = E.stats(c.analysis.data);
      const html = `المتوسط = <b>${F(s.mean)}</b> ، الوسيط = <b>${F(s.median)}</b> ، المنوال = <b>${s.mode.length ? s.mode.map((x) => F(x)).join('، ') : 'لا يوجد'}</b> ، المدى = <b>${F(s.range)}</b>`;
      writeBelow(`المتوسط = ${F(s.mean)} ، الوسيط = ${F(s.median)} ، المدى = ${F(s.range)}`);
      result(html, [['الشرح بالخطوات', () => M.tutor.send('المتوسط والوسيط والمنوال والمدى لـ ' + c.analysis.data.join(' '))]]);
    },
    sort: (c) => { writeBelow('مرتبة: ' + c.analysis.data.slice().sort((a, b) => a - b).map((x) => L(x)).join('، ')); result('✓ كُتبت القيم مرتبة.'); },
    barchart: (c) => {
      const data = c.analysis.data, b = anchorBox(), mx = Math.max(...data.map(Math.abs), 1), H = 160, bw = 34, out = [];
      const x0 = b[0], y0 = b[3] + H + 40;
      out.push({ type: 'line', x1: x0 - 10, y1: y0, x2: x0 + data.length * (bw + 12) + 10, y2: y0, color: 'c0', width: 2 });
      data.forEach((v, i) => { const hh = (Math.abs(v) / mx) * H; out.push({ type: 'rect', x1: x0 + i * (bw + 12), y1: y0 - hh, x2: x0 + i * (bw + 12) + bw, y2: y0, color: ['c3', 'c4', 'c1', 'c5', 'c6', 'c2'][i % 6], width: 2, fill: true }); out.push(textObj(x0 + i * (bw + 12) + bw - 4, y0 - hh - 26, String(v), 15, 'c0')); });
      commitObjs(out);
      result('📊 رُسم التمثيل بالأعمدة على السبورة.');
    },
    discriminant: (c) => {
      const [l, r] = txt(c).split('=');
      const co = E.polyCoeffs(E.parse(`(${l}) - (${r})`), 'x', 2);
      const [cc, bb, aa] = co;
      const D = bb * bb - 4 * aa * cc;
      const msg = `المميّز = ب² − ٤أجـ = (${F(bb)})² − ٤ × ${F(aa)} × ${F(cc)} = ${F(D)}`;
      writeBelow(msg + (D > 0 ? ' ⇐ حلّان حقيقيان' : D === 0 ? ' ⇐ حل مكرر' : ' ⇐ لا حلول حقيقية'));
      result(`${msg}<br>${D > 0 ? 'المميّز موجب ⇐ للمعادلة حلّان حقيقيان مختلفان' : D === 0 ? 'المميّز صفر ⇐ حل حقيقي واحد مكرر' : 'المميّز سالب ⇐ لا توجد حلول حقيقية'}`);
    },
    check_value: (c) => {
      const inp = h('input', { class: 'inp', type: 'number', placeholder: 'قيمة س', style: { width: '110px' } });
      const go = h('button', { class: 'btn sm primary' }, 'احسب');
      result('');
      c.out.append(h('div', { class: 'row' }, h('span', {}, `${M.varName('x')} =`), inp, go));
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') go.click(); });
      go.onclick = () => {
        const x = +inp.value, t = txt(c);
        if (/=/.test(t)) {
          const [l, r] = t.split('='); const lv = E.evaluate(E.parse(l), { x }, 'deg'), rv = E.evaluate(E.parse(r), { x }, 'deg');
          const ok = Math.abs(lv - rv) < 1e-9;
          c.out.insertAdjacentHTML('beforeend', `<div>الطرف الأيمن = ${F(lv)} ، الطرف الأيسر = ${F(rv)} ⇐ <b>${ok ? `نعم، ${M.varName('x')} = ${F(x)} حل للمعادلة ✓` : 'ليست حلاً ✗'}</b></div>`);
        } else c.out.insertAdjacentHTML('beforeend', `<div>القيمة عند ${M.varName('x')} = ${F(x)}: <b>${F(E.evaluate(E.parse(t), { x }, 'deg'))}</b></div>`);
        position();
      };
      setTimeout(() => inp.focus(), 30);
    },
    to_text: (c) => { if (c.onReplaceText) c.onReplaceText(txt(c)); hide(); },
    read_ink: (c) => M.inkUI.openReader(c.objs),
    /* ---------- الأشكال ---------- */
    measure: (c) => { const o = c.objs[0]; B().addMeasurements(o, measureRes(o)); result('📏 كُتبت الأضلاع والزوايا والمساحة والمحيط على السبورة.'); },
    measure_all: (c) => { c.objs.forEach((o) => B().addMeasurements(o, measureRes(o))); result('📏 كُتبت قياسات كل الأشكال.'); },
    correct: (c) => { B().correctShape(c.objs[0], c.stroke); hide(); },
    reflect: (c) => transform(c.objs[0], 'reflect'),
    rotate: (c) => transform(c.objs[0], 'rotate'),
    translate: (c) => transform(c.objs[0], 'translate'),
    dilate: (c) => transform(c.objs[0], 'dilate'),
    symmetry: (c) => {
      const o = c.objs[0], s = A.symmetryAxes(o);
      if (!s.lines.length) { result(s.note || 'هذا الشكل ليس له محور تماثل.'); return; }
      commitObjs(s.lines.map(([a, b]) => ({ type: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], color: 'c6', width: 2, dash: true })));
      result(`محاور التماثل: <b>${s.count === Infinity ? 'عدد لا نهائي (رسمنا بعضها)' : L(s.count)}</b> — كل محور يقسم الشكل إلى نصفين متطابقين.`);
    },
    tri_angles: (c) => {
      const p = c.objs[0].pts, out = [], ang = [0, 1, 2].map((i) => M.shapeRec._angleAt(p, i));
      [0, 1, 2].forEach((i) => out.push({ type: 'angle', p: [p[(i + 2) % 3], p[i], p[(i + 1) % 3]], color: ['c1', 'c3', 'c4'][i], width: 2 }));
      commitObjs(out);
      writeBelow(`${ang.map((a) => F(a, 1) + '°').join(' + ')} = ١٨٠°`, 'c1');
      result('مجموع زوايا أي مثلث = ١٨٠° دائماً — جرّب رسم مثلث آخر وتحقق!');
    },
    angle: (c) => {
      const [a, b] = c.objs.filter((o) => o.type === 'line');
      const pa = [[a.x1, a.y1], [a.x2, a.y2]], pb = [[b.x1, b.y1], [b.x2, b.y2]];
      let best = null;
      pa.forEach((p, i) => pb.forEach((q, j) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (!best || d < best.d) best = { d, i, j }; }));
      let V;
      if (best.d < 20) V = [(pa[best.i][0] + pb[best.j][0]) / 2, (pa[best.i][1] + pb[best.j][1]) / 2];
      else { const X = lineX(pa, pb); if (!X) { result('المستقيمان متوازيان — لا توجد زاوية بينهما.'); return; } V = X; }
      const far = (seg) => (Math.hypot(seg[0][0] - V[0], seg[0][1] - V[1]) > Math.hypot(seg[1][0] - V[0], seg[1][1] - V[1]) ? seg[0] : seg[1]);
      const A1 = far(pa), C1 = far(pb);
      commitObjs([{ type: 'angle', p: [A1, V, C1], color: 'c1', width: 2 }]);
      const u = [A1[0] - V[0], A1[1] - V[1]], w = [C1[0] - V[0], C1[1] - V[1]];
      const deg = (Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(...u) * Math.hypot(...w))))) * 180) / Math.PI;
      result(`الزاوية = <b>${F(deg, 1)}°</b> — ${deg < 89.5 ? 'حادة' : deg <= 90.5 ? 'قائمة' : deg < 179.5 ? 'منفرجة' : 'مستقيمة'}`);
    },
    parallel: (c) => {
      const [a, b] = c.objs.filter((o) => o.type === 'line');
      const t = (l) => Math.atan2(l.y2 - l.y1, l.x2 - l.x1);
      let d = Math.abs(((t(a) - t(b)) * 180) / Math.PI) % 180; if (d > 90) d = 180 - d;
      result(d < 3 ? '∥ المستقيمان <b>متوازيان</b> (لهما الميل نفسه).' : Math.abs(d - 90) < 3 ? '⊥ المستقيمان <b>متعامدان</b> (الزاوية بينهما ٩٠°).' : `المستقيمان ليسا متوازيين ولا متعامدين — الزاوية بينهما ${F(d, 1)}°.`);
    },
    /* ---------- الشبكات ---------- */
    fold3d: (c) => foldNet(c.analysis.net),
    fold3d_try: (c) => { if (c.analysis.net && c.analysis.net.faces) foldNet(c.analysis.net, true); else result(`<div class="err">${M.esc(c.analysis.net.message || '')}</div>`); },
    why_net: (c) => { const n = c.analysis.net || M.netFold.detect(c.objs.filter((o) => o.type === 'poly' || o.type === 'rect').map(A.polyPts), { unit: U() }); result(n.ok ? `✓ نعم! هذه شبكة ${n.name} صالحة.` : `💡 ${M.esc(n.message || 'لا تبدو هذه شبكة مجسم.')}`); },
    net_area: (c) => { const n = c.analysis.net; writeBelow(`المساحة الكلية للشبكة = ${F(n.area)} وحدة²`); result(`مساحة الشبكة = مجموع مساحات أوجهها = <b>${F(n.area)} وحدة مربعة</b> — وهي المساحة الكلية لسطح ${n.name}.`); },
    /* ---------- المنحنيات على المستوى الإحداثي ---------- */
    curve_exact: (c) => { applyCurve(c, true); },
    curve_label: (c) => { applyCurve(c, false); },
    curve_props: (c) => { const o = applyCurve(c, true); if (o && o.type === 'fn' && o.vline == null) { const pr = fnProps(o.expr); commitObjs(pr.pts); result(`<div class="assist-res">${pr.html}</div>`); } },
    circle_eq: (c) => {
      const o = c.objs[0], u = U(), cx = (o.x1 + o.x2) / 2 / u, cy = -(o.y1 + o.y2) / 2 / u, r = Math.abs(o.x2 - o.x1) / 2 / u;
      const X = M.varName('x'), Y = M.varName('y');
      const term = (v, n) => (Math.abs(n) < 1e-9 ? `${v}²` : `(${v} ${n > 0 ? '−' : '+'} ${F(Math.abs(n))})²`);
      const eq = `${term(X, cx)} + ${term(Y, cy)} = ${F(r * r)}`;
      writeBelow(eq, 'c1');
      result(`المركز ${P(cx, cy)} ، نصف القطر ${F(r)} ⇐ <b>${M.esc(L(eq))}</b>`);
    },
    vertex_coords: (c) => {
      const o = c.objs[0], pts = A.polyPts(o), u = U();
      const cen = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length], [0, 0]);
      const names = ['أ', 'ب', 'جـ', 'د', 'هـ', 'و', 'ز', 'ح'];
      commitObjs(pts.map((q, i) => { const d = Math.hypot(q[0] - cen[0], q[1] - cen[1]) || 1; return textObj(q[0] + ((q[0] - cen[0]) / d) * 26 + 40, q[1] + ((q[1] - cen[1]) / d) * 26 - 12, `${names[i] || ''}${P(q[0] / u, -q[1] / u)}`, 16, 'c1'); }));
      result('📍 كُتبت إحداثيات كل رأس بجواره.');
    },
    circle_lab: (c) => {
      // دائرة مرسومة ⇐ دائرة تفاعلية بالمركز ونصف القطر نفسيهما
      const o = c.objs[0], b = B();
      const cx = o.type === 'compass' ? o.x1 : (o.x1 + o.x2) / 2, cy = o.type === 'compass' ? o.y1 : (o.y1 + o.y2) / 2;
      const r = o.type === 'compass' ? Math.hypot(o.x2 - o.x1, o.y2 - o.y1) : (Math.abs(o.x2 - o.x1) + Math.abs(o.y2 - o.y1)) / 4;
      const g = M.circleGeo.create(cx, cy, r, 'basic');
      g.color = o.color || b.color;
      b.commit(); b.page.objects = b.objects.filter((x) => x !== o); b.objects.push(g); b.selected.clear(); b.changed();
      hide();
      M.modes.open('circle', { attach: g });
      M.toast('⭕ أصبحت دائرتك تفاعلية: اختر قطاعاً أو قوساً أو نظرية، واسحب النقاط');
    },
    circ_quiz: (c) => { hide(); M.modes.open('circle', { attach: c.objs[0], quiz: true }); },
    circ_open: (c) => { hide(); M.modes.open('circle', { attach: c.objs[0] }); },
    region: (c) => { const o = B().addInequality(txt(c)); if (o) result(o.type === 'xregion' ? `المنطقة المظللة = قيم ${M.varName('x')} التي تحقق المتباينة. ${o.inclusive ? 'الخط المتصل: الحد ضمن الحل' : 'الخط المتقطع: الحد ليس ضمن الحل'}.` : `ظُللت منطقة الحل ${o.ineq[0] === '>' ? 'فوق' : 'تحت'} المنحنى — ${o.ineq.length === 1 ? 'الحد متقطع لأنه ليس ضمن الحل' : 'الحد متصل لأنه ضمن الحل'}. جرّب نقطة من المنطقة وعوّضها للتحقق!`); },
    region_all: (c) => { let n = 0; c.analysis.lines.forEach((l) => { if (B().addInequality(l, { focus: n === 0 })) n++; }); result(`ظُللت ${L(n)} مناطق — <b>منطقة الحل المشتركة هي حيث تتداخل الألوان</b> (الأغمق).`); },
    dismiss: () => hide(),
  };
  function lineX(p, q) {
    const [x1, y1] = p[0], [x2, y2] = p[1], [x3, y3] = q[0], [x4, y4] = q[1];
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }
  function measureRes(o) {
    if (o.type === 'ellipse') { const k = A.shapeKind(o); return { kind: k, label: M.shapeRec.NAMES[k] }; }
    const pts = A.polyPts(o);
    const r = M.shapeRec.fromVertices(pts);
    const k = A.shapeKind(o);
    return { kind: r.kind, label: M.shapeRec.NAMES[k] || r.label };
  }
  function applyCurve(c, exact) {
    const Bd = B(), g = c.curve;
    Bd.commit();
    let main = null;
    if (exact) {
      Bd.page.objects = Bd.objects.filter((o) => o !== c.stroke);
      g.objs.forEach((o) => Bd.objects.push(o));
      main = g.objs[0];
    } else {
      const b = M.boardUtil.bbox(c.stroke);
      Bd.objects.push({ id: uid(), type: 'text', x: b[2] + 10, y: b[1] - 34, text: L(g.fit.eq), size: 20, color: c.stroke.color });
      main = c.stroke;
    }
    Bd.changed();
    result(`✓ ${g.fit.label}: <b>${M.esc(L(g.fit.eq))}</b>`);
    return main;
  }

  /** تحويل هندسي متحرك: انعكاس، دوران ٩٠°، انسحاب، تكبير ×٢ */
  function transform(o, kind) {
    const Bd = B(), base = o.type === 'rect' ? { type: 'poly', pts: A.polyPts(o), color: o.color, width: o.width } : JSON.parse(JSON.stringify(o));
    delete base.id;
    const b = M.boardUtil.bbox(o), w = b[2] - b[0], hh = b[3] - b[1];
    const extra = [];
    let f;
    if (kind === 'reflect') {
      const m = b[2] + Math.max(30, w * 0.25);
      extra.push({ type: 'line', x1: m, y1: b[1] - 40, x2: m, y2: b[3] + 40, color: 'c6', width: 2, dash: true }, textObj(m + 40, b[1] - 76, 'محور الانعكاس', 15, 'c6'));
      f = (t) => (x, y) => [m + (x - m) * (1 - 2 * t), y];
    } else if (kind === 'rotate') {
      const c = [b[2], b[3]];
      extra.push({ type: 'ellipse', x1: c[0] - 5, y1: c[1] - 5, x2: c[0] + 5, y2: c[1] + 5, color: 'c6', width: 2, fill: true }, textObj(c[0] + 60, c[1] + 10, 'مركز الدوران', 15, 'c6'));
      f = (t) => { const a = (-Math.PI / 2) * t, co = Math.cos(a), si = Math.sin(a); return (x, y) => [c[0] + (x - c[0]) * co - (y - c[1]) * si, c[1] + (x - c[0]) * si + (y - c[1]) * co]; };
    } else if (kind === 'translate') {
      const v = [w * 1.3 + 30, -hh * 0.4];
      const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
      extra.push({ type: 'arrow', x1: cx, y1: cy, x2: cx + v[0], y2: cy + v[1], color: 'c6', width: 2.5, dash: true }, textObj(cx + v[0] / 2 + 60, cy + v[1] / 2 - 36, `متجه الانسحاب (${F(v[0] / U(), 1)}، ${F(-v[1] / U(), 1)})`, 15, 'c6'));
      f = (t) => (x, y) => [x + v[0] * t, y + v[1] * t];
    } else {
      const c = [b[0] - 20, b[3] + 20];
      extra.push({ type: 'ellipse', x1: c[0] - 5, y1: c[1] - 5, x2: c[0] + 5, y2: c[1] + 5, color: 'c6', width: 2, fill: true }, textObj(c[0] + 50, c[1] + 10, 'مركز التكبير', 15, 'c6'));
      f = (t) => { const k = 1 + t; return (x, y) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]; };
    }
    Bd.commit();
    const img = Object.assign(JSON.parse(JSON.stringify(base)), { id: uid(), color: 'c5', dash: false });
    extra.forEach((e) => { e.id = uid(); Bd.objects.push(e); });
    Bd.objects.push(img);
    const t0 = performance.now(), dur = 1100;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      const fresh = JSON.parse(JSON.stringify(base));
      M.boardUtil.mapObj(fresh, f(e), kind === 'dilate' ? 1 : 0);
      Object.keys(fresh).forEach((k) => { if (k !== 'color' && k !== 'id') img[k] = fresh[k]; });
      if (img.type === 'ellipse' && kind === 'rotate') { const x1 = Math.min(img.x1, img.x2), x2 = Math.max(img.x1, img.x2), y1 = Math.min(img.y1, img.y2), y2 = Math.max(img.y1, img.y2); Object.assign(img, { x1, x2, y1, y2 }); }
      Bd.requestRender();
      if (u < 1) requestAnimationFrame(step); else Bd.changed();
    };
    requestAnimationFrame(step);
    const names = { reflect: 'انعكاس حول محور رأسي: الصورة تطابق الأصل لكنها معكوسة، والمسافة إلى المحور متساوية', rotate: 'دوران ٩٠° عكس عقارب الساعة حول المركز: الأطوال والزوايا لا تتغير', translate: 'انسحاب: كل نقطة تتحرك بالمتجه نفسه، والشكل لا يتغير', dilate: 'تكبير بمعامل ٢: الأطوال تتضاعف، والمساحة تصبح ٤ أمثالها، والزوايا ثابتة' };
    result(`✨ ${names[kind]}.`);
  }

  function foldNet(net, tryAnyway) {
    const vef = net.vef ? `الرؤوس ${L(net.vef[0])} ، الأحرف ${L(net.vef[1])} ، الأوجه ${L(net.vef[2])}<br>` : '';
    const info = net.ok ? `${vef}المساحة الكلية = ${F(net.area)} وحدة² ، الحجم ≈ ${F(net.volume)} وحدة³` : `<span class="err">${M.esc(net.message || '')}</span>`;
    M.float3d.open({ title: net.ok ? net.name : 'تجربة الطي', facesAt: (t) => M.netFold.foldAt(net, t), info, onFolded: () => { if (net.ok) M.toast(`🎉 انطوت الشبكة إلى ${net.name}!`); else if (tryAnyway) M.toast('لاحظ: بعض الأوجه تقع فوق بعضها وبقي جانب مفتوح', { type: 'warn', time: 4000 }); } });
    result(net.ok ? `🧊 تنطوي الآن إلى ${net.name} في النافذة العائمة — اسحبها أو دوّرها.` : '👀 شاهد ماذا يحدث عند الطي…');
  }

  /* ---------------- الربط بأحداث السبورة ---------------- */
  /** قائمة المضلعات الملتصقة بالشكل (لاكتشاف شبكة مكتملة أثناء الرسم) */
  function netAround(obj) {
    const polys = B().objects.filter((o) => o.type === 'poly' || o.type === 'rect');
    if (polys.length < 4 || !polys.includes(obj)) return null;
    const pts = polys.map(A.polyPts);
    const edges = pts.flatMap((p) => p.map((q, i) => Math.hypot(p[(i + 1) % p.length][0] - q[0], p[(i + 1) % p.length][1] - q[1])));
    const med = edges.slice().sort((a, b) => a - b)[Math.floor(edges.length / 2)];
    const adj = M.netFold.adjacency(pts.map((p) => p.slice()), med * 0.14);
    const start = polys.indexOf(obj), seen = new Set([start]), st = [start];
    while (st.length) { const a = st.pop(); adj[a].forEach((e) => { if (!seen.has(e.to)) { seen.add(e.to); st.push(e.to); } }); }
    if (seen.size < 4) return null;
    const comp = [...seen].map((i) => polys[i]);
    const res = M.netFold.detect(comp.map(A.polyPts), { unit: U() });
    return res.ok ? { res, objs: comp } : null;
  }
  const bboxOfObjs = (objs) => objs.reduce((b, o) => { const q = M.boardUtil.bbox(o); return [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; }, [Infinity, Infinity, -Infinity, -Infinity]);

  const API = {
    /** نص رياضي (قلم الرياضيات أو أداة النص) */
    showText(text, objs, opts) {
      opts = opts || {};
      const a = A.analyzeText(text);
      if (!a) return;
      const extra = [];
      if (opts.onReplaceText) extra.push({ id: 'to_text', label: 'حوّله إلى نص مطبوع', icon: 'text' });
      show(a, Object.assign({ text, objs, bbox: objs && objs.length ? bboxOfObjs(objs) : null, extra, editable: !!opts.editable }, opts));
    },
    /** شكل تعرّف عليه القلم الذكي */
    showShape(obj, res, stroke) {
      const around = netAround(obj);
      if (around) {
        show({ head: `🧊 رسمتَ شبكة ${around.res.name} كاملة! أطويها لك مجسماً ثلاثي الأبعاد؟`, net: around.res, sugg: [{ id: 'fold3d', label: 'حوّلها إلى مجسم ثلاثي الأبعاد', icon: 'cube', primary: true }, { id: 'net_area', label: 'المساحة الكلية', icon: 'grid' }, { id: 'dismiss', label: 'ليس الآن', icon: 'close' }] }, { objs: around.objs, bbox: bboxOfObjs(around.objs) });
        return;
      }
      const m = M.shapeRec.measure(Object.assign({}, res, { obj }), U());
      const info = m.area != null ? ` — المساحة ${F(m.area)} ، المحيط ${F(m.perimeter)}` : m.length != null ? ` — الطول ${F(m.length)}` : '';
      const base = A.analyzeSelection([obj], { unit: U(), coord: B().page.bg === 'coord' });
      const sugg = obj.type === 'line' || obj.type === 'arrow' ? [{ id: 'dismiss', label: 'حسناً', icon: 'check', primary: true }] : (base ? base.sugg.slice(0, 5) : []);
      sugg.push({ id: 'correct', label: 'ليس هذا الشكل', icon: 'wand' });
      show({ head: `✨ ${res.label}${info}`, sugg }, { objs: [obj], bbox: M.boardUtil.bbox(obj), stroke });
    },
    /** منحنى مرسوم على المستوى الإحداثي: نسأل قبل استبداله */
    showCurve(stroke, g) {
      show({ head: `رسمتَ ${g.fit.label} — هل تريدني أن أُظهر معادلته؟`, sugg: [{ id: 'curve_exact', label: 'نعم، ارسمه بدقة مع معادلته', icon: 'function', primary: true }, { id: 'curve_label', label: 'اكتب المعادلة واترك رسمي', icon: 'text' }, { id: 'curve_props', label: 'المعادلة والخصائص', icon: 'target' }, { id: 'dismiss', label: 'لا، شكراً', icon: 'close' }] }, { stroke, curve: g, objs: [stroke], bbox: M.boardUtil.bbox(stroke) });
    },
    showSelection(objs) {
      const a = A.analyzeSelection(objs, { unit: U(), coord: B().page.bg === 'coord' });
      if (a) show(a, { objs, bbox: bboxOfObjs(objs), text: a.source === 'text' ? objs.map((o) => o.text).join('\n') : '' });
    },
    hide, run,
    /** تنفيذ إجراء مباشرة على نص (من لوحات الأوضاع) دون إظهار الشريط */
    exec(id, text) {
      const [cx, cy] = B().viewCenter();
      const prev = ctx;
      ctx = { analysis: A.analyzeText(text) || { sugg: [] }, text, bbox: [cx - 120, cy - 140, cx + 120, cy - 100] };
      try { (ACTIONS[id] || (() => {}))(ctx); } catch (e) { console.error(e); M.toast('تعذّر التنفيذ: ' + e.message, { type: 'warn' }); }
      ctx = prev;
    },
    get ctx() { return ctx; },
  };
  M.assist = API;

  // التحديد بأداة التحديد
  let selTimer = null;
  M.on('selection', ({ count }) => {
    clearTimeout(selTimer);
    if (!enabled()) return;
    if (!count) { if (ctx && ctx.fromSel) hide(); return; }
    selTimer = setTimeout(() => {
      const Bd = B();
      if (Bd.action) return;
      const objs = Bd.selectedObjs();
      if (!objs.length) return;
      API.showSelection(objs);
      if (ctx) ctx.fromSel = true;
    }, 350);
  });
  // نص كُتب بأداة النص
  M.on('text-added', (o) => {
    if (!enabled() || !o || !/[=+\-×÷*/^√<>]|\d\s*[سص]|[سص]\s*[²³^]/.test(M.toWestern(o.text))) return;
    const a = A.analyzeText(o.text);
    if (a && a.kind !== 'unknown') show(a, { text: o.text, objs: [o], bbox: M.boardUtil.bbox(o) });
  });
  M.on('page', hide);
  // بدء رسم جديد يغلق الاقتراحات (إلا عند التحديد)
  const boardEl = document.getElementById('board');
  if (boardEl) boardEl.addEventListener('pointerdown', () => { if (bar && !(ctx && ctx.fromSel && B().tool === 'select')) hide(); });
  M.on('zoom', () => position());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bar) hide(); });
})();
