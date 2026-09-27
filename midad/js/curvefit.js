/* ==========================================================================
   التعرّف على المنحنيات المرسومة باليد على المستوى الإحداثي واستنتاج معادلتها
   العائلات: خطية، تربيعية، تكعيبية، القيمة المطلقة، الجذر التربيعي، الأسية،
   اللوغاريتمية، الجيبية (جا/جتا)، الكسرية (١/س)، الدائرة، المستقيم الرأسي
   لكل عائلة: ملاءمة بأقل المربعات (مع بحث شبكي للمعاملات غير الخطية)،
   ثم اختيار العائلة الأنسب مع تفضيل الأبسط، ثم تقريب المعاملات لقيم «جميلة»
   المدخلات بالإحداثيات الرياضية (س أفقي، ص للأعلى)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const PI = Math.PI;

  /* ---------------- جبر خطي صغير ---------------- */
  function solve(A, b) {
    const n = b.length, a = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (Math.abs(a[p][c]) < 1e-12) return null;
      [a[c], a[p]] = [a[p], a[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c] / a[c][c]; for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k]; }
    }
    return a.map((r, i) => r[n] / r[i]);
  }
  /** أقل مربعات: cols = دوال أساس (x) => قيمة، يعيد المعاملات */
  function lsq(pts, cols) {
    const n = cols.length, A = Array.from({ length: n }, () => new Array(n).fill(0)), b = new Array(n).fill(0);
    for (const [x, y] of pts) {
      const v = cols.map((f) => f(x));
      if (v.some((q) => !Number.isFinite(q))) return null;
      for (let i = 0; i < n; i++) { b[i] += v[i] * y; for (let j = 0; j < n; j++) A[i][j] += v[i] * v[j]; }
    }
    return solve(A, b);
  }
  const rms = (pts, f) => { let s = 0; for (const [x, y] of pts) { const v = f(x); if (!Number.isFinite(v)) return Infinity; s += (v - y) ** 2; } return Math.sqrt(s / pts.length); };
  function polyFit(pts, d) { return lsq(pts, Array.from({ length: d + 1 }, (_, i) => (x) => x ** i)); }
  const evalP = (c, x) => c.reduceRight((s, k) => s * x + k, 0);
  function resample(pts, n) {
    const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = d[d.length - 1] || 1, out = []; let j = 0;
    for (let k = 0; k < n; k++) { const t = (L * k) / (n - 1); while (j < d.length - 2 && d[j + 1] < t) j++; const u = (t - d[j]) / ((d[j + 1] - d[j]) || 1); const q = pts[j + 1] || pts[j]; out.push([pts[j][0] + (q[0] - pts[j][0]) * u, pts[j][1] + (q[1] - pts[j][1]) * u]); }
    return out;
  }
  /** بحث شبكي ثم تحسين للمعامل غير الخطي p مع ملاءمة خطية للبقية */
  function search1(pts, lo, hi, n, build) {
    let best = null;
    const tryP = (p) => { const m = build(p); if (!m) return; const c = lsq(pts, m.cols); if (!c) return; const f = (x) => m.f(c, x); const e = rms(pts, f); if (!best || e < best.e) best = { p, c, e, f }; };
    for (let i = 0; i <= n; i++) tryP(lo + ((hi - lo) * i) / n);
    if (!best) return null;
    let step = (hi - lo) / n;
    for (let it = 0; it < 18; it++) { step /= 2; const p0 = best.p; tryP(p0 - step); tryP(p0 + step); }
    return best;
  }

  /* ---------------- التنسيق ---------------- */
  const loc = (x) => (M.loc ? M.loc(x) : String(x));
  const nice = (x) => { const r = Math.round(x * 100) / 100; return Math.abs(r) < 1e-9 ? 0 : r; };
  const num = (x) => loc(M.fmt ? M.fmt(nice(x), 2) : nice(x));
  const X = () => (M.varName ? M.varName('x') : 'x');
  const Y = () => (M.varName ? M.varName('y') : 'y');
  /** معامل أمام حد: ١ ⇐ لا شيء، −١ ⇐ − */
  const coef = (a) => (Math.abs(a - 1) < 1e-9 ? '' : Math.abs(a + 1) < 1e-9 ? '−' : num(a));
  const shift = (h) => (Math.abs(h) < 1e-9 ? X() : `${X()} ${h > 0 ? '−' : '+'} ${num(Math.abs(h))}`);
  const plus = (k) => (Math.abs(k) < 1e-9 ? '' : ` ${k > 0 ? '+' : '−'} ${num(Math.abs(k))}`);
  const js = (x) => `(${nice(x)})`;
  function polyText(c) { return M.math && M.math.polyToText ? M.math.polyToText(c.map(nice), 'x', false) : c.join(','); }
  const pretty = (s) => (M.prettyPow ? M.prettyPow(s) : s);

  /* ---------------- التقريب ---------------- */
  const snapTo = (v, st) => Math.round(v / st) * st;
  function snapTry(pts, diag, base, variants) {
    // variants: مصفوفات معاملات مرشحة (الأبسط أولاً)، نقبل أول واحدة تبقي الخطأ صغيراً
    for (const v of variants) { const e = rms(pts, (x) => base(v, x)); if (e < 0.06 * diag) return { p: v, e }; }
    return null;
  }

  /* ---------------- العائلات ---------------- */
  function families(pts, info) {
    const { xmin, xmax, w, diag } = info;
    const out = [];
    // كثيرات الحدود
    for (const d of [1, 2, 3]) {
      const c = polyFit(pts, d); if (!c) continue;
      if (d > 1 && Math.abs(c[d]) * Math.pow(w / 2, d) < 0.04 * diag) continue;
      out.push({ kind: ['', 'line', 'quad', 'cubic'][d], np: d + 1, e: rms(pts, (x) => evalP(c, x)), c });
    }
    // القيمة المطلقة: أ|س − هـ| + ك
    const ab = search1(pts, xmin + 0.12 * w, xmax - 0.12 * w, 60, (h) => ({ cols: [(x) => Math.abs(x - h), () => 1], f: (c, x) => c[0] * Math.abs(x - h) + c[1] }));
    if (ab && Math.abs(ab.c[0]) > 0.15) out.push({ kind: 'abs', np: 3, e: ab.e, a: ab.c[0], h: ab.p, k: ab.c[1] });
    // الجذر: أ√(±(س − هـ)) + ك
    for (const s of [1, -1]) {
      const lo = s > 0 ? xmin - 0.6 * w : xmax, hi = s > 0 ? xmin : xmax + 0.6 * w;
      const r = search1(pts, lo, hi, 50, (h) => ({ cols: [(x) => Math.sqrt(Math.max(0, s * (x - h))), () => 1], f: (c, x) => c[0] * Math.sqrt(Math.max(0, s * (x - h))) + c[1] }));
      if (r) out.push({ kind: 'sqrt', np: 3, e: r.e, a: r.c[0], h: r.p, k: r.c[1], s });
    }
    // اللوغاريتم: أ لوهـ(±(س − هـ)) + ك
    for (const s of [1, -1]) {
      const lo = s > 0 ? xmin - 1.5 * w : xmax + 0.01, hi = s > 0 ? xmin - 0.01 : xmax + 1.5 * w;
      const r = search1(pts, lo, hi, 60, (h) => ({ cols: [(x) => Math.log(s * (x - h)), () => 1], f: (c, x) => c[0] * Math.log(s * (x - h)) + c[1] }));
      if (r) out.push({ kind: 'log', np: 3, e: r.e, a: r.c[0], h: r.p, k: r.c[1], s });
    }
    // الأسية: أ هـ^(ب س) + جـ
    for (const [lo, hi] of [[0.12, 3.5], [-3.5, -0.12]]) {
      const r = search1(pts, lo, hi, 60, (b) => ({ cols: [(x) => Math.exp(b * x), () => 1], f: (c, x) => c[0] * Math.exp(b * x) + c[1] }));
      if (r) out.push({ kind: 'exp', np: 3, e: r.e, a: r.c[0], b: r.p, k: r.c[1] });
    }
    // الكسرية: أ/(س − هـ) + ك (فرع واحد مرسوم)
    for (const [lo, hi] of [[xmin - 2 * w, xmin - 0.02 * w], [xmax + 0.02 * w, xmax + 2 * w]]) {
      const r = search1(pts, lo, hi, 60, (h) => ({ cols: [(x) => 1 / (x - h), () => 1], f: (c, x) => c[0] / (x - h) + c[1] }));
      if (r) out.push({ kind: 'rational', np: 3, e: r.e, a: r.c[0], h: r.p, k: r.c[1] });
    }
    // الجيبية: أ جا(ب س) + جـ جتا(ب س) + د — تحتاج نقطتي انعطاف على الأقل
    if (info.extrema >= 2) {
      let best = null;
      for (let i = 0; i <= 90; i++) {
        const B = 0.2 * Math.pow(40, i / 90);
        if (B * w < 1.1 * PI) continue;
        const c = lsq(pts, [(x) => Math.sin(B * x), (x) => Math.cos(B * x), () => 1]); if (!c) continue;
        const e = rms(pts, (x) => c[0] * Math.sin(B * x) + c[1] * Math.cos(B * x) + c[2]);
        if (!best || e < best.e) best = { B, c, e };
      }
      if (best) {
        let step = best.B * 0.03;
        for (let it = 0; it < 16; it++) { step /= 2; for (const B of [best.B - step, best.B + step]) { const c = lsq(pts, [(x) => Math.sin(B * x), (x) => Math.cos(B * x), () => 1]); if (!c) continue; const e = rms(pts, (x) => c[0] * Math.sin(B * x) + c[1] * Math.cos(B * x) + c[2]); if (e < best.e) best = { B, c, e }; } }
        out.push({ kind: 'sin', np: 4, e: best.e, B: best.B, A: best.c[0], C: best.c[1], D: best.c[2] });
      }
    }
    return out;
  }

  /* ---------------- تقريب كل عائلة وصياغة معادلتها ---------------- */
  function finalize(m, pts, diag) {
    const res = { kind: m.kind, err: m.e };
    if (m.kind === 'line' || m.kind === 'quad' || m.kind === 'cubic') {
      const d = m.c.length - 1;
      let c = m.c;
      for (const st of [1, 0.5, 0.25]) {
        const s = c.map((k, i) => (i === d && Math.abs(k) < 1 ? snapTo(k, Math.min(st, 0.25)) : snapTo(k, st)));
        if (d > 0 && s[d] === 0 && Math.abs(m.c[d]) * Math.pow(Math.max(1, (pts[pts.length - 1][0] - pts[0][0]) / 2), d) > 0.05 * diag) continue;
        if (rms(pts, (x) => evalP(s, x)) < (d === 3 ? 0.06 : 0.045) * diag) { c = s; break; }
      }
      c = c.map((k) => (Math.abs(k) < 1e-9 ? 0 : k));
      while (c.length > 2 && c[c.length - 1] === 0) c.pop(); // حد أعلى صار صفراً ⇐ درجة أقل
      res.kind = ['', 'line', 'quad', 'cubic'][c.length - 1] || 'line';
      res.coeffs = c;
      res.expr = polyText(c);
      res.eq = pretty(`${Y()} = ${polyText(c)}`);
      res.label = ['', 'مستقيم', 'قطع مكافئ (دالة تربيعية)', 'دالة تكعيبية'][c.length - 1];
      return res;
    }
    const s3 = (base, p) => snapTry(pts, diag, base, [p.map((v, i) => snapTo(v, i === 0 ? 1 : 1)), p.map((v) => snapTo(v, 0.5)), p.map((v, i) => snapTo(v, i === 0 ? 0.25 : 0.5))]);
    if (m.kind === 'abs') {
      const base = ([a, h, k], x) => a * Math.abs(x - h) + k;
      const sn = s3(base, [m.a, m.h, m.k]); const [a, h, k] = sn ? sn.p : [m.a, m.h, m.k];
      Object.assign(res, { params: { a, h, k }, expr: `${js(a)}*abs(x-${js(h)})+${js(k)}`, eq: `${Y()} = ${coef(a)}|${shift(h)}|${plus(k)}`, label: 'دالة القيمة المطلقة' });
      return res;
    }
    if (m.kind === 'sqrt') {
      const s = m.s, base = ([a, h, k], x) => a * Math.sqrt(Math.max(0, s * (x - h))) + k;
      // بداية منحنى الجذر = طرف الخط نفسه (حيث المماس رأسي)
      const end = pts.reduce((q, p) => (s > 0 ? (p[0] < q[0] ? p : q) : (p[0] > q[0] ? p : q)));
      const pri = [1, 0.5].map((st) => [snapTo(m.a, st) || m.a, snapTo(end[0], st), snapTo(end[1], st)]);
      const sn = snapTry(pts, diag, base, pri) || s3(base, [m.a, m.h, m.k]); const [a, h, k] = sn ? sn.p : [m.a, m.h, m.k];
      const inside = s > 0 ? shift(h) : `${num(h)} − ${X()}`;
      Object.assign(res, { params: { a, h, k, s }, expr: `${js(a)}*sqrt(${s > 0 ? `x-${js(h)}` : `${js(h)}-x`})+${js(k)}`, eq: `${Y()} = ${coef(a)}√(${inside})${plus(k)}`, label: 'دالة الجذر التربيعي' });
      return res;
    }
    if (m.kind === 'log') {
      const s = m.s;
      // نختار الأساس الذي يجعل المعامل أجمل: لوهـ أو لو (١٠) أو لو٢
      let bestF = null;
      // الأساس الذي يعطي معاملاً أقرب لعدد جميل (لوهـ أولاً عند التساوي)
      for (const [bn, lnb, jsf, disp] of [[Math.E, 1, 'ln', 'لوهـ'], [10, Math.LN10, 'log', 'لو'], [2, Math.LN2, 'ln', 'لو₂']]) {
        const A = m.a * lnb, a2 = snapTo(A, 0.5) || snapTo(A, 0.25);
        if (!a2) continue;
        const relErr = Math.abs(A - a2) / Math.abs(A);
        const h2 = snapTo(m.h, 0.5), k2 = snapTo(m.k, 0.5);
        const e = rms(pts, (x) => (a2 / lnb) * Math.log(s * (x - h2)) + k2);
        if (e < 0.05 * diag && (!bestF || relErr < bestF.relErr - 0.02)) bestF = { e, a2, h2, k2, bn, lnb, jsf, disp, relErr };
      }
      const f = bestF || { a2: m.a, h2: m.h, k2: m.k, lnb: 1, jsf: 'ln', disp: 'لوهـ' };
      const inside = s > 0 ? shift(f.h2) : `${num(f.h2)} − ${X()}`;
      const arg = s > 0 ? `x-${js(f.h2)}` : `${js(f.h2)}-x`;
      const jsExpr = f.jsf === 'log' ? `${js(f.a2)}*log(${arg})+${js(f.k2)}` : `${js(f.a2 / f.lnb)}*ln(${arg})+${js(f.k2)}`;
      Object.assign(res, { params: { a: f.a2, h: f.h2, k: f.k2, base: f.bn }, expr: jsExpr, eq: `${Y()} = ${coef(f.a2)}${f.disp}(${inside})${plus(f.k2)}`, label: 'دالة لوغاريتمية' });
      return res;
    }
    if (m.kind === 'exp') {
      // أ × ب^س + جـ حيث ب = هـ^b
      let best = null;
      for (const [B, disp] of [[2, '٢'], [3, '٣'], [10, '١٠'], [Math.E, 'هـ'], [0.5, '(½)'], [1 / 3, '(⅓)'], [4, '٤'], [5, '٥']]) {
        if (Math.abs(Math.log(B) - m.b) / Math.abs(m.b) > 0.12) continue;
        for (const st of [1, 0.5, 0.25]) {
          const a2 = snapTo(m.a, st), k2 = snapTo(m.k, 0.5);
          if (!a2) continue;
          const e = rms(pts, (x) => a2 * Math.pow(B, x) + k2);
          if (e < 0.05 * diag && (!best || e < best.e)) best = { e, a2, k2, B, disp };
          if (e < 0.05 * diag) break;
        }
      }
      if (best) Object.assign(res, { params: { a: best.a2, b: best.B, k: best.k2 }, expr: best.B === Math.E ? `${js(best.a2)}*exp(x)+${js(best.k2)}` : `${js(best.a2)}*(${best.B})^x+${js(best.k2)}`, eq: `${Y()} = ${coef(best.a2)}${best.disp}^${X()}${plus(best.k2)}`, label: m.b > 0 ? 'دالة أسية (نمو)' : 'دالة أسية (اضمحلال)' });
      else Object.assign(res, { params: { a: m.a, b: Math.exp(m.b), k: m.k }, expr: `${js(m.a)}*exp(${js(m.b)}*x)+${js(m.k)}`, eq: `${Y()} = ${num(m.a)}هـ^(${num(m.b)}${X()})${plus(m.k)}`, label: 'دالة أسية' });
      return res;
    }
    if (m.kind === 'rational') {
      const base = ([a, h, k], x) => a / (x - h) + k;
      const sn = s3(base, [m.a, m.h, m.k]); const [a, h, k] = sn ? sn.p : [m.a, m.h, m.k];
      Object.assign(res, { params: { a, h, k }, expr: `${js(a)}/(x-${js(h)})+${js(k)}`, eq: `${Y()} = ${num(a)}/(${shift(h)})${plus(k)}`, label: 'دالة كسرية (مقلوب)' });
      return res;
    }
    if (m.kind === 'sin') {
      let R = Math.hypot(m.A, m.C), ph = Math.atan2(m.C, m.A), B = m.B, D = m.D;
      const Bs = [0.25, 0.5, 1, 1.5, 2, 3, 4, PI / 4, PI / 2, PI];
      const Bn = Bs.reduce((a, b) => (Math.abs(b - B) < Math.abs(a - B) ? b : a));
      const phn = Math.round(ph / (PI / 4)) * (PI / 4);
      const cand = { R: snapTo(R, 0.5) || R, B: Math.abs(Bn - B) / B < 0.1 ? Bn : B, ph: Math.abs(phn - ph) < 0.3 ? phn : ph, D: snapTo(D, 0.5) };
      if (rms(pts, (x) => cand.R * Math.sin(cand.B * x + cand.ph) + cand.D) < 0.06 * diag) ({ R, B, ph, D } = cand);
      const bTxt = (b) => (Math.abs(b - 1) < 1e-9 ? '' : Math.abs(b - PI) < 1e-9 ? 'ط' : Math.abs(b - PI / 2) < 1e-9 ? 'ط/٢ ' : Math.abs(b - PI / 4) < 1e-9 ? 'ط/٤ ' : num(b));
      const norm = ((ph % (2 * PI)) + 2 * PI) % (2 * PI);
      let fnName = 'جا', sgn = 1, rest = 0;
      if (Math.abs(norm) < 1e-6 || Math.abs(norm - 2 * PI) < 1e-6) { fnName = 'جا'; sgn = 1; }
      else if (Math.abs(norm - PI / 2) < 1e-6) { fnName = 'جتا'; sgn = 1; }
      else if (Math.abs(norm - PI) < 1e-6) { fnName = 'جا'; sgn = -1; }
      else if (Math.abs(norm - 1.5 * PI) < 1e-6) { fnName = 'جتا'; sgn = -1; }
      else rest = ph;
      const amp = sgn * R;
      const argDisp = rest ? `${bTxt(B)}${X()} ${rest > 0 ? '+' : '−'} ${num(Math.abs(rest))}` : `${bTxt(B)}${X()}`;
      Object.assign(res, { params: { A: R, B, phase: ph, D }, expr: `${js(R)}*sin(${nice(B)}*x+${js(ph)})+${js(D)}`, eq: `${Y()} = ${coef(amp)}${fnName}(${argDisp})${plus(D)}`, label: fnName === 'جتا' ? 'دالة جيب التمام (مثلثية)' : 'دالة الجيب (مثلثية)', period: (2 * PI) / B });
      res.expr = `(${R})*sin((${B})*x+(${ph}))+(${D})`;
      return res;
    }
    return null;
  }

  /**
   * pts: نقاط المنحنى بالإحداثيات الرياضية. يعيد {kind, expr, eq, label, …} أو null
   */
  function fit(raw, opts) {
    opts = opts || {};
    if (!raw || raw.length < 6) return null;
    const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
    const xmin = Math.min(...xs), xmax = Math.max(...xs), w = xmax - xmin, h = Math.max(...ys) - Math.min(...ys);
    const diag = Math.hypot(w, h);
    if (diag < 0.8) return null;
    const pts = resample(raw, 90);
    const closed = Math.hypot(raw[0][0] - raw[raw.length - 1][0], raw[0][1] - raw[raw.length - 1][1]) < 0.2 * diag;
    if (closed) return circle(pts, w, h);
    // دالة؟ يجب أن تتقدم س في اتجاه واحد تقريباً
    let back = 0; const dir = Math.sign(pts[pts.length - 1][0] - pts[0][0]) || 1;
    for (let i = 1; i < pts.length; i++) { const dx = (pts[i][0] - pts[i - 1][0]) * dir; if (dx < 0) back += -dx; }
    if (w < 0.25 * diag || back > 0.08 * w) {
      if (w < 0.08 * diag) { const x0 = xs.reduce((s, v) => s + v, 0) / xs.length; const xr = Math.round(x0 * 2) / 2; const xv = Math.abs(xr - x0) < 0.3 ? xr : x0; return { kind: 'vline', x: xv, eq: `${X()} = ${num(xv)}`, label: 'مستقيم رأسي', err: 0, expr: '0' }; }
      return null;
    }
    // نقاط الانعطاف (بعد تنعيم) للتمييز بين العائلات
    const sm = pts.map((p, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 3); j <= Math.min(pts.length - 1, i + 3); j++) { s += pts[j][1]; c++; } return s / c; });
    let extrema = 0, last = 0;
    // نعدّ الانعطاف فقط إذا تغيّر الاتجاه بمقدار ملموس (لا اهتزاز اليد)
    let ext = null;
    for (let i = 1; i < sm.length; i++) {
      const d = sm[i] - sm[i - 1]; if (Math.abs(d) < 1e-9) continue; const s = Math.sign(d);
      if (ext == null) { ext = sm[i - 1]; last = s; continue; }
      if (s === last) continue;
      if (Math.abs(sm[i - 1] - ext) > 0.12 * Math.max(h, 0.3 * diag)) { extrema++; ext = sm[i - 1]; last = s; }
    }
    const info = { xmin, xmax, w, diag, extrema };
    const tol = 0.04 * diag;
    let cands = families(pts, info).filter((m) => m.e < (opts.only ? tol * 1.8 : tol));
    // المستخدم حدّد نوع الدالة التي يرسمها ⇐ نقصر الملاءمة على تلك العائلة
    if (opts.only) { cands = cands.filter((m) => m.kind === opts.only).sort((x, y) => x.e - y.e); if (!cands.length) return null; const r0 = finalize(cands[0], pts, diag); if (!r0) return null; r0.xRange = [xmin, xmax]; r0.eq = pretty(r0.eq); return r0; }
    if (!cands.length) return null;
    // سلّم التعقيد: نبدأ بأبسط نموذج مقبول ولا ننتقل لعائلة أعقد إلا إذا كانت أفضل بوضوح (خطأ أقل بـ ٢٨٪ فأكثر)
    const byKind = {}; cands.forEach((m) => { if (!byKind[m.kind] || m.e < byKind[m.kind].e) byKind[m.kind] = m; });
    let best = byKind.line || null;
    // بين العائلات ذات المعاملات الثلاثة: الأقل خطأً، ومع التقارب (١٠٪) نفضّل الأشيع في المنهج
    const G3 = ['abs', 'sqrt', 'exp', 'log', 'rational'].map((k) => byKind[k]).filter(Boolean);
    let g3 = G3.slice().sort((x, y) => x.e - y.e)[0];
    if (g3) { const pick = G3.find((m) => m.e < g3.e * 1.1); if (pick) g3 = pick; }
    let three = byKind.quad || null;
    if (g3 && (!three || g3.e < three.e * 0.85)) three = g3;
    const best3 = [byKind.quad, g3].filter(Boolean).sort((x, y) => x.e - y.e)[0];
    if (three && (!best || three.e < best.e * 0.72)) best = three;
    // الجيبية: يجب أن تكون سعتها واضحة لا مجرد اهتزاز يد
    if (byKind.sin && 2 * Math.hypot(byKind.sin.A, byKind.sin.C) < 0.12 * diag) delete byKind.sin;
    const four = [byKind.cubic, byKind.sin].filter(Boolean).sort((x, y) => x.e - y.e)[0];
    const ref4 = best3 && best3.e < (best ? best.e : Infinity) ? best3 : best;
    if (four && (!ref4 || four.e < ref4.e * 0.72)) best = four;
    if (!best) return null;
    cands.sort((x, y) => (x === best ? -1 : y === best ? 1 : x.e - y.e));
    const res = finalize(cands[0], pts, diag);
    if (!res) return null;
    res.xRange = [xmin, xmax];
    res.eq = pretty(res.eq);
    res.alternatives = cands.slice(1, 3).map((c) => c.kind);
    return res;
  }
  function circle(pts, w, h) {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    for (const [x, y] of pts) { const row = [x, y, 1], rhs = -(x * x + y * y); for (let i = 0; i < 3; i++) { b[i] += row[i] * rhs; for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j]; } }
    const s = solve(A, b); if (!s) return null;
    let cx = -s[0] / 2, cy = -s[1] / 2, r = Math.sqrt(Math.max(0, cx * cx + cy * cy - s[2]));
    const e = Math.sqrt(pts.reduce((q, [x, y]) => q + (Math.hypot(x - cx, y - cy) - r) ** 2, 0) / pts.length);
    if (e > 0.08 * r || Math.abs(w - h) / Math.max(w, h) > 0.22) return null;
    const cx2 = snapTo(cx, 0.5), cy2 = snapTo(cy, 0.5), r2 = Math.max(0.5, snapTo(r, 0.5));
    if (Math.hypot(cx2 - cx, cy2 - cy) < 0.2 * r && Math.abs(r2 - r) < 0.2 * r) { cx = cx2; cy = cy2; r = r2; }
    const term = (v, n) => (Math.abs(n) < 1e-9 ? `${v}²` : `(${v} ${n > 0 ? '−' : '+'} ${num(Math.abs(n))})²`);
    return { kind: 'circle', center: [cx, cy], r, err: e, eq: `${term(X(), cx)} + ${term(Y(), cy)} = ${num(r * r)}`, label: 'دائرة' };
  }

  M.curveFit = { fit, polyFit, resample };
})();
