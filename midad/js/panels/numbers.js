/* ==========================================================================
   لوحة الأعداد: التحليل وشجرة العوامل، ق.م.أ و م.م.أ، الكسور بصرياً،
   ترتيب العمليات خطوة بخطوة، خط الأعداد، جدول الضرب، التحويلات
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const E = M.math;
  const num = (s) => parseFloat(M.toWestern(String(s).trim()));
  const L = (x) => M.loc(x);

  M.registerPanel({
    id: 'numbers', title: 'الأعداد والعمليات', short: 'الأعداد', icon: 'numbers',
    desc: 'التحليل، القواسم والمضاعفات، الكسور، وترتيب العمليات',
    build(root) {
      root.append(orderOps(), factorCard(), gcdCard(), fractionCard(), convertCard(), numberLineCard(), timesCard());
    },
  });

  /* ---------- ترتيب العمليات ---------- */
  function orderOps() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('layers')} ترتيب العمليات خطوة بخطوة</h4><div class="hint">الأقواس ← الأسس ← الضرب والقسمة (من اليمين لليسار في القراءة) ← الجمع والطرح.</div>`;
    const inp = h('input', { class: 'inp math-inp', placeholder: 'مثال: ٣ + ٤ × (٦ - ٢)^٢ ÷ ٨', value: '٣ + ٤ × (٦ - ٢)^٢ ÷ ٨' });
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>احسب بالترتيب</span>' });
    const out = h('div');
    card.append(inp, btn, out);
    const run = () => {
      out.innerHTML = '';
      try {
        let ast = E.parse(inp.value);
        if (E.variables(ast).size) throw new Error('هذه الأداة للأعداد فقط');
        const steps = [`${E.toHTML(ast)}`];
        let guard = 0;
        while (ast.t !== 'num' && guard++ < 60) {
          const r = reduceOnce(ast);
          ast = r.ast;
          steps.push(`<span style="color:var(--ui-muted);font-size:12px">${r.why}</span><br>= ${E.toHTML(ast)}`);
        }
        out.appendChild(M.renderResult({ title: 'ترتيب العمليات', steps, answer: M.fracHTML(ast.v) }));
      } catch (e) { out.innerHTML = `<div class="err">⚠ ${e.message}</div>`; }
    };
    btn.onclick = run;
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && run());
    return card;
  }
  const PREC = { '^': 3, '*': 2, '/': 2, '+': 1, '-': 1 };
  const WHY = { '^': 'نحسب الأس', '*': 'نضرب', '/': 'نقسم', '+': 'نجمع', '-': 'نطرح', fn: 'نحسب الدالة', neg: 'الإشارة', paren: 'نزيل القوس' };
  function reduceOnce(root) {
    const cands = [];
    let idx = 0;
    const walk = (n, depth, parent, key) => {
      if (n.t === 'paren') { if (n.a.t === 'num') cands.push({ n, parent, key, depth: depth + 1, prec: 9, idx: idx++, kind: 'paren' }); else walk(n.a, depth + 1, n, 'a'); return; }
      if (n.t === 'op') {
        walk(n.a, depth, n, 'a');
        const my = idx++;
        walk(n.b, depth, n, 'b');
        if (n.a.t === 'num' && n.b.t === 'num') cands.push({ n, parent, key, depth, prec: PREC[n.op], idx: my, kind: n.op });
        return;
      }
      if (n.t === 'fn' || n.t === 'neg') { if (n.a.t === 'num') cands.push({ n, parent, key, depth: depth + 1, prec: 4, idx: idx++, kind: n.t === 'fn' ? 'fn' : 'neg' }); else walk(n.a, depth + 1, n, 'a'); }
    };
    walk(root, 0, null, null);
    if (!cands.length) throw new Error('تعذّر التبسيط');
    cands.sort((a, b) => b.depth - a.depth || b.prec - a.prec || a.idx - b.idx);
    const c = cands[0];
    const v = c.kind === 'paren' ? c.n.a.v : E.evaluate(c.n, {}, M.settings.angle);
    const val = { t: 'num', v: Math.abs(v - Math.round(v)) < 1e-10 ? Math.round(v) : v };
    const why = c.kind === 'paren' ? WHY.paren : `${c.depth > 0 ? 'داخل الأقواس: ' : ''}${WHY[c.kind]}: ${M.htmlToPlain(E.toHTML(c.n))} = ${M.fmt(val.v)}`;
    if (!c.parent) return { ast: val, why };
    c.parent[c.key] = val;
    return { ast: root, why };
  }

  /* ---------- التحليل إلى العوامل الأولية ---------- */
  function factorCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('hash')} التحليل إلى العوامل الأولية</h4>`;
    const row = h('div', { class: 'row' });
    const inp = h('input', { class: 'inp grow', value: '٣٦٠', inputmode: 'numeric' });
    const btn = h('button', { class: 'btn primary', html: '<span>حلّل</span>' });
    row.append(inp, btn);
    const out = h('div');
    card.append(row, out);
    const run = () => {
      const n = Math.floor(num(inp.value));
      out.innerHTML = '';
      if (!(n >= 2) || n > 1e12) { out.innerHTML = '<div class="err">⚠ أدخل عدداً صحيحاً بين ٢ و ١٠¹²</div>'; return; }
      const f = E.factorize(n);
      const counts = {};
      f.forEach((p) => (counts[p] = (counts[p] || 0) + 1));
      const power = Object.entries(counts).map(([p, c]) => (c > 1 ? `${L(p)}<sup>${L(c)}</sup>` : L(p))).join(' × ');
      const divs = n <= 1e7 ? E.divisors(n) : null;
      const svg = factorTree(n);
      const res = {
        title: `تحليل العدد ${L(n)}`,
        steps: [
          E.isPrime(n) ? `${L(n)} عدد أولي (قواسمه ١ ونفسه فقط)` : `شجرة العوامل:<div style="overflow-x:auto">${svg}</div>`,
          `العوامل الأولية: ${f.map(L).join(' × ')}`,
          divs ? `القواسم (${L(divs.length)}): ${divs.slice(0, 40).map(L).join('، ')}${divs.length > 40 ? '…' : ''}` : '',
          divs ? `مجموع القواسم = ${L(divs.reduce((s, d) => s + d, 0))}${divs.reduce((s, d) => s + d, 0) - n === n ? ' — عدد تام! ✨' : ''}` : '',
          Number.isInteger(Math.sqrt(n)) ? `${L(n)} مربع كامل = ${L(Math.sqrt(n))}²` : '',
        ].filter(Boolean),
        answer: `<span class="math">${L(n)} = ${power}</span>`,
      };
      out.appendChild(M.renderResult(res, { strategy: 'steps' }));
    };
    btn.onclick = run;
    inp.addEventListener('keydown', (e) => e.key === 'Enter' && run());
    return card;
  }
  function factorTree(n) {
    // بناء شجرة: كل عدد مركب يتفرع إلى أصغر عامل أولي × الباقي
    const nodes = [];
    let y = 20, x = 150, level = 0;
    let cur = n;
    const W = 300;
    const lines = [];
    const cols = { prime: 'var(--accent)', comp: 'var(--ui-text)' };
    while (!E.isPrime(cur) && cur > 1 && level < 12) {
      const p = E.factorize(cur)[0];
      const rest = cur / p;
      nodes.push({ x, y, v: cur, prime: false });
      const lx = x + 40, rx = x - 40, ny = y + 46;
      lines.push(`<line x1="${x}" y1="${y + 10}" x2="${lx}" y2="${ny - 12}"/><line x1="${x}" y1="${y + 10}" x2="${rx}" y2="${ny - 12}"/>`);
      nodes.push({ x: lx, y: ny, v: p, prime: true });
      x = rx; y = ny; cur = rest; level++;
    }
    nodes.push({ x, y, v: cur, prime: true });
    const minX = Math.min(...nodes.map((n2) => n2.x)) - 30, maxX = Math.max(...nodes.map((n2) => n2.x)) + 30;
    const H = y + 24;
    return `<svg viewBox="${minX} 0 ${maxX - minX} ${H}" width="${Math.min(W, maxX - minX)}" height="${H}" style="max-width:100%" stroke="var(--ui-muted)" stroke-width="1.5">
      ${lines.join('')}
      ${nodes.map((nd) => `<g><circle cx="${nd.x}" cy="${nd.y}" r="${nd.prime ? 15 : 0}" fill="none" stroke="${cols.prime}" stroke-width="2"/><text x="${nd.x}" y="${nd.y + 5}" text-anchor="middle" fill="${nd.prime ? cols.prime : cols.comp}" stroke="none" style="font:700 14px Tajawal,sans-serif">${L(nd.v)}</text></g>`).join('')}
    </svg>`;
  }

  /* ---------- ق.م.أ و م.م.أ ---------- */
  function gcdCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('numbers')} القاسم المشترك الأكبر والمضاعف المشترك الأصغر</h4>`;
    const inp = h('input', { class: 'inp', value: '٤٨، ١٨٠', placeholder: 'أعداد مفصولة بفواصل' });
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>احسب ق.م.أ و م.م.أ</span>' });
    const out = h('div');
    card.append(inp, btn, out);
    btn.onclick = () => {
      out.innerHTML = '';
      const ns = E.numbersIn(inp.value).map(Math.abs).map(Math.floor).filter((x) => x > 0);
      if (ns.length < 2) { out.innerHTML = '<div class="err">⚠ أدخل عددين صحيحين موجبين على الأقل</div>'; return; }
      const steps = [];
      // خوارزمية إقليدس لأول عددين
      let [a, b] = [Math.max(ns[0], ns[1]), Math.min(ns[0], ns[1])];
      steps.push('<b>خوارزمية إقليدس</b> (القسمة المتكررة):');
      while (b) { steps.push(`${L(a)} = ${L(b)} × ${L(Math.floor(a / b))} + ${L(a % b)}`); [a, b] = [b, a % b]; }
      let g = ns.reduce((x, y) => E.gcd(x, y));
      let l = ns.reduce((x, y) => E.lcm(x, y));
      steps.push(`بالتحليل: ${ns.map((n) => `${L(n)} = ${E.factorize(n).map(L).join(' × ')}`).join(' ، ')}`);
      steps.push('ق.م.أ = حاصل ضرب العوامل المشتركة بأصغر أس ، م.م.أ = حاصل ضرب كل العوامل بأكبر أس');
      if (ns.length === 2) steps.push(`للتحقق: ق.م.أ × م.م.أ = ${L(g)} × ${L(l)} = ${L(g * l)} = ${L(ns[0])} × ${L(ns[1])} ✓`);
      out.appendChild(M.renderResult({ title: 'ق.م.أ و م.م.أ', steps, answer: `ق.م.أ = ${L(g)} ، م.م.أ = ${L(l)}` }));
    };
    return card;
  }

  /* ---------- الكسور ---------- */
  function parseFrac(s) {
    s = M.toWestern(s).trim().replace(/\s+/g, ' ');
    let m = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/); // عدد كسري
    if (m) { const w = +m[1], n = +m[2], d = +m[3]; return { n: (Math.abs(w) * d + n) * Math.sign(w || 1), d }; }
    m = s.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
    if (m) return { n: +m[1], d: +m[2] };
    m = s.match(/^-?\d+(\.\d+)?$/);
    if (m) { const f = M.toFraction(+s, 10000); return f || null; }
    return null;
  }
  const simp = (f) => { const g = E.gcd(f.n, f.d) || 1; const s = f.d < 0 ? -1 : 1; return { n: (s * f.n) / g, d: (s * f.d) / g }; };
  const fH = (f) => { f = simp(f); if (f.d === 1) return L(f.n); return `<span class="mfrac-wrap">${f.n < 0 ? '−' : ''}<span class="mfrac"><span>${L(Math.abs(f.n))}</span><span>${L(f.d)}</span></span></span>`; };
  const fRaw = (n, d) => `<span class="mfrac-wrap">${n < 0 ? '−' : ''}<span class="mfrac"><span>${L(Math.abs(n))}</span><span>${L(d)}</span></span></span>`;
  function fracBar(f, color) {
    const n = Math.abs(f.n), d = f.d;
    if (d > 24) return '';
    const whole = Math.floor(n / d), rem = n % d;
    const bars = [];
    for (let k = 0; k < whole + (rem ? 1 : 0) && k < 4; k++) {
      const filled = k < whole ? d : rem;
      let cells = '';
      for (let i = 0; i < d; i++) cells += `<rect x="${(i * 220) / d}" y="0" width="${220 / d}" height="22" fill="${i < filled ? color : 'transparent'}" fill-opacity=".75" stroke="var(--ui-muted)" stroke-width="1"/>`;
      bars.push(`<svg viewBox="-1 -1 222 24" width="100%" height="24" style="display:block;margin:3px 0;transform:scaleX(-1)">${cells}</svg>`);
    }
    return bars.join('');
  }
  function fractionCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('percent')} عمليات الكسور مع التمثيل البصري</h4><div class="hint">اكتب الكسر هكذا: ٣/٤ ، أو عدداً كسرياً: ١ ٢/٣</div>`;
    const row = h('div', { class: 'row' });
    const a = h('input', { class: 'inp grow', value: '٣/٤' });
    const op = h('select', { class: 'sel', style: { width: '64px' } }, ...['+', '−', '×', '÷'].map((o) => h('option', { value: o }, o)));
    const b = h('input', { class: 'inp grow', value: '٢/٣' });
    row.append(a, op, b);
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>احسب</span>' });
    const out = h('div');
    card.append(row, btn, out);
    btn.onclick = () => {
      out.innerHTML = '';
      const x = parseFrac(a.value), y = parseFrac(b.value);
      if (!x || !y || !x.d || !y.d) { out.innerHTML = '<div class="err">⚠ صيغة الكسر غير صحيحة</div>'; return; }
      const steps = [];
      let r;
      const o = op.value;
      if (o === '+' || o === '−') {
        const l = E.lcm(x.d, y.d);
        const xn = x.n * (l / x.d), yn = y.n * (l / y.d);
        steps.push(`نوحّد المقامات: م.م.أ(${L(x.d)}، ${L(y.d)}) = ${L(l)}`);
        steps.push(`${fRaw(x.n, x.d)} = ${fRaw(xn, l)} ، ${fRaw(y.n, y.d)} = ${fRaw(yn, l)}`);
        const rn = o === '+' ? xn + yn : xn - yn;
        steps.push(`${o === '+' ? 'نجمع' : 'نطرح'} البسطين: ${fRaw(xn, l)} ${o} ${fRaw(yn, l)} = ${fRaw(rn, l)}`);
        r = { n: rn, d: l };
      } else if (o === '×') {
        steps.push(`نضرب البسط في البسط والمقام في المقام: ${fRaw(x.n * y.n, x.d * y.d)}`);
        r = { n: x.n * y.n, d: x.d * y.d };
      } else {
        if (!y.n) { out.innerHTML = '<div class="err">⚠ لا يمكن القسمة على صفر</div>'; return; }
        steps.push(`القسمة على كسر = الضرب في مقلوبه: ${fRaw(x.n, x.d)} × ${fRaw(y.d, y.n)}`);
        r = { n: x.n * y.d, d: x.d * y.n };
        steps.push(`= ${fRaw(r.n, r.d)}`);
      }
      const s = simp(r);
      if (s.d !== Math.abs(r.d)) steps.push(`نبسّط بالقسمة على ق.م.أ = ${L(E.gcd(r.n, r.d))}: ${fH(r)}`);
      if (Math.abs(s.n) > s.d && s.d !== 1) steps.push(`كعدد كسري: ${L(Math.trunc(s.n / s.d))} و ${fRaw(Math.abs(s.n % s.d), s.d)}`);
      steps.push(`كعدد عشري: ${M.fmt(s.n / s.d, 5)} ، وكنسبة مئوية: ${M.fmt((s.n / s.d) * 100, 3)}٪`);
      const cols = M.seriesColors();
      steps.push(`<div style="display:grid;grid-template-columns:40px 1fr;gap:4px 8px;align-items:center">
        <span>${fH(x)}</span><div>${fracBar(x, cols[0])}</div>
        <span>${fH(y)}</span><div>${fracBar(y, cols[1])}</div>
        ${s.n > 0 ? `<span>${fH(s)}</span><div>${fracBar(s, cols[2])}</div>` : ''}</div>`);
      out.appendChild(M.renderResult({ title: 'عملية على الكسور', steps, answer: `${fH(x)} ${o} ${fH(y)} = ${fH(s)}` }));
    };
    return card;
  }

  /* ---------- التحويلات ---------- */
  function convertCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('shuffle')} تحويل: كسر ⇄ عدد عشري ⇄ نسبة مئوية</h4>`;
    const g = h('div', { class: 'grid3' });
    const fi = h('input', { class: 'inp', placeholder: 'كسر ٣/٨' }), di = h('input', { class: 'inp', placeholder: 'عشري ٠٫٣٧٥' }), pi = h('input', { class: 'inp', placeholder: 'نسبة ٣٧٫٥' });
    g.append(labelled('كسر', fi), labelled('عدد عشري', di), labelled('نسبة مئوية ٪', pi));
    card.appendChild(g);
    const set = (v, except) => {
      const f = M.toFraction(v, 10000);
      if (except !== fi) fi.value = f ? (f.d === 1 ? L(f.n) : `${L(f.n)}/${L(f.d)}`) : '';
      if (except !== di) di.value = M.fmt(v, 6);
      if (except !== pi) pi.value = M.fmt(v * 100, 4);
    };
    fi.oninput = () => { const f = parseFrac(fi.value); if (f && f.d) set(f.n / f.d, fi); };
    di.oninput = () => { const v = num(di.value); if (Number.isFinite(v)) set(v, di); };
    pi.oninput = () => { const v = num(pi.value); if (Number.isFinite(v)) set(v / 100, pi); };
    return card;
  }
  const labelled = (t, el) => h('label', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'lbl' }, t), el);

  /* ---------- خط الأعداد ---------- */
  function numberLineCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('ruler')} خط الأعداد على السبورة</h4><div class="hint">ارسم خط أعداد وحدّد عليه نقاطاً أو فترة (للمتباينات).</div>`;
    const g = h('div', { class: 'grid3' });
    const from = h('input', { class: 'inp', value: '-٥' }), to = h('input', { class: 'inp', value: '٥' }), step = h('input', { class: 'inp', value: '١' });
    g.append(labelled('من', from), labelled('إلى', to), labelled('الخطوة', step));
    const marks = h('input', { class: 'inp', placeholder: 'نقاط للتحديد (اختياري): -٢، ٣٫٥', style: { marginTop: '8px' } });
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: icon('board') + '<span>ارسم على السبورة</span>' });
    card.append(g, marks, btn);
    btn.onclick = () => {
      const a = num(from.value), b = num(to.value), s = Math.abs(num(step.value)) || 1;
      if (!(b > a) || (b - a) / s > 60) return M.toast('تحقق من المدى والخطوة (حتى ٦٠ قسماً)', { type: 'warn' });
      const B = M.board;
      const [cx, cy] = B.viewCenter();
      const unitPx = Math.min(60, (B.w * 0.75) / B.view.s / ((b - a) / s));
      const W = ((b - a) / s) * unitPx;
      const x0 = cx - W / 2;
      const X = (v) => x0 + ((v - a) / s) * unitPx;
      const col = B.color;
      B.commit();
      const objs = [];
      objs.push({ type: 'arrow', x1: x0 - 20, y1: cy, x2: x0 + W + 30, y2: cy, color: col, width: 2.5 });
      objs.push({ type: 'arrow', x1: x0 + W + 20, y1: cy, x2: x0 - 30, y2: cy, color: col, width: 2.5 });
      for (let v = a, i = 0; v <= b + 1e-9; v = a + ++i * s) {
        objs.push({ type: 'line', x1: X(v), y1: cy - 8, x2: X(v), y2: cy + 8, color: col, width: 2 });
        const t = { type: 'text', x: X(v), y: cy + 14, text: M.fmt(v), size: 18, color: col };
        const bb = M.boardUtil.bbox(t); t.x += (bb[2] - bb[0]) / 2;
        objs.push(t);
      }
      E.numbersIn(marks.value).forEach((v) => {
        if (v < a || v > b) return;
        objs.push({ type: 'ellipse', x1: X(v) - 7, y1: cy - 7, x2: X(v) + 7, y2: cy + 7, color: 'c2', width: 3, fill: true });
      });
      objs.forEach((o) => { o.id = Math.random().toString(36).slice(2, 10); B.objects.push(o); });
      B.changed();
      M.toast('تم رسم خط الأعداد');
    };
    return card;
  }

  /* ---------- جدول الضرب ---------- */
  function timesCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('grid')} جدول الضرب التفاعلي</h4>`;
    const row = h('div', { class: 'row' });
    const inp = h('input', { class: 'inp grow', type: 'number', min: 1, max: 99, value: 7 });
    const toB = h('button', { class: 'btn', html: icon('board') + '<span>إلى السبورة</span>' });
    row.append(inp, toB);
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '2px', marginTop: '8px', fontSize: '12px' } });
    card.append(row, grid);
    const render = () => {
      const n = +inp.value || 7;
      grid.innerHTML = '';
      for (let r = 0; r <= 10; r++) for (let c = 0; c <= 10; c++) {
        const v = r === 0 && c === 0 ? '×' : r === 0 ? c : c === 0 ? r : r * c;
        const hl = r === n || c === n;
        const cell = h('div', {
          style: {
            textAlign: 'center', padding: '4px 0', borderRadius: '5px', fontWeight: r === 0 || c === 0 ? '800' : '500',
            background: r === 0 || c === 0 ? 'var(--ui-panel)' : hl ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'transparent',
          },
        }, typeof v === 'number' ? L(v) : v);
        cell.onclick = () => { if (r && c) M.toast(`${L(r)} × ${L(c)} = ${L(r * c)}`); };
        grid.appendChild(cell);
      }
    };
    inp.oninput = render;
    toB.onclick = () => {
      const n = +inp.value || 7;
      const lines = []; for (let i = 1; i <= 10; i++) lines.push(`${L(n)} × ${L(i)} = ${L(n * i)}`);
      M.board.addText(lines.join('\n'), { size: 26 });
    };
    render();
    return card;
  }
})();
