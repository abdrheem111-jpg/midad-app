/* ==========================================================================
   الأشكال ثنائية الأبعاد: رسم الشكل من أبعاده مع التسميات وحساب المحيط
   والمساحة بالقانون والتعويض. الإحداثيات بوحدات الطول (ص للأعلى)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const PI = Math.PI;
  const F = (x) => M.fmt(x, 2);
  const P = (k, label, def, min, max, step) => ({ k, label, def, min: min == null ? 1 : min, max: max || 10, step: step || 0.5 });
  const row = (name, formula, subst, value, unit, display) => ({ name, formula, subst, value, unit, display });
  const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: (n || 64) + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / (n || 64); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const lab = (p, text, kind) => ({ p, text, kind: kind || 'dim' });
  const deg = (x) => (x * 180) / PI;

  const SHAPES = {
    square: {
      name: 'المربع', params: [P('a', 'طول الضلع ل', 4)],
      geo: ({ a }) => { const pts = [[0, 0], [a, 0], [a, a], [0, a]]; return { pts, labels: [lab(mid(pts[0], pts[1]), `ل = ${F(a)}`)], right: [0, 1, 2, 3] }; },
      calc: ({ a }) => [row('المحيط', '٤ × ل', `٤ × ${F(a)}`, 4 * a, 1), row('المساحة', 'ل²', `${F(a)}²`, a * a, 2), row('القطر', 'ل√٢', `${F(a)} × √٢`, a * Math.SQRT2, 1)],
    },
    rect: {
      name: 'المستطيل', params: [P('l', 'الطول ل', 6), P('w', 'العرض ع', 3.5)],
      geo: ({ l, w }) => { const pts = [[0, 0], [l, 0], [l, w], [0, w]]; return { pts, labels: [lab(mid(pts[0], pts[1]), `ل = ${F(l)}`), lab(mid(pts[1], pts[2]), `ع = ${F(w)}`)], right: [0, 1, 2, 3] }; },
      calc: ({ l, w }) => [row('المحيط', '٢ × (ل + ع)', `٢ × (${F(l)} + ${F(w)})`, 2 * (l + w), 1), row('المساحة', 'ل × ع', `${F(l)} × ${F(w)}`, l * w, 2), row('القطر', '√(ل² + ع²)', `√(${F(l)}² + ${F(w)}²)`, Math.hypot(l, w), 1)],
    },
    tri: {
      name: 'المثلث (بمعلومية أضلاعه)', params: [P('a', 'الضلع أ', 5, 1, 12), P('b', 'الضلع ب', 4, 1, 12), P('c', 'الضلع جـ', 3.5, 1, 12)],
      valid: ({ a, b, c }) => a + b > c && a + c > b && b + c > a ? null : 'مجموع أي ضلعين يجب أن يكون أكبر من الضلع الثالث (متباينة المثلث)',
      geo: ({ a, b, c }) => { const x = (a * a + c * c - b * b) / (2 * a); const y = Math.sqrt(Math.max(0, c * c - x * x)); const pts = [[0, 0], [a, 0], [x, y]]; return { pts, labels: [lab(mid(pts[0], pts[1]), `أ = ${F(a)}`), lab(mid(pts[1], pts[2]), `ب = ${F(b)}`), lab(mid(pts[2], pts[0]), `جـ = ${F(c)}`)], height: [[x, 0], [x, y]] }; },
      calc: ({ a, b, c }) => { const s = (a + b + c) / 2, A = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c))); return [row('المحيط', 'أ + ب + جـ', `${F(a)} + ${F(b)} + ${F(c)}`, a + b + c, 1), row('نصف المحيط ح', '(أ + ب + جـ) ÷ ٢', '', s, 1), row('المساحة (هيرون)', '√(ح(ح−أ)(ح−ب)(ح−جـ))', `√(${F(s)} × ${F(s - a)} × ${F(s - b)} × ${F(s - c)})`, A, 2), row('الارتفاع على أ', '٢ × المساحة ÷ أ', '', (2 * A) / a, 1)]; },
    },
    rtri: {
      name: 'المثلث القائم', params: [P('a', 'الضلع القائم أ', 4), P('b', 'الضلع القائم ب', 3)],
      geo: ({ a, b }) => { const pts = [[0, 0], [a, 0], [0, b]]; return { pts, labels: [lab(mid(pts[0], pts[1]), `أ = ${F(a)}`), lab(mid(pts[0], pts[2]), `ب = ${F(b)}`), lab(mid(pts[1], pts[2]), `الوتر = ${F(Math.hypot(a, b))}`)], right: [0] }; },
      calc: ({ a, b }) => { const c = Math.hypot(a, b); return [row('الوتر (فيثاغورس)', '√(أ² + ب²)', `√(${F(a)}² + ${F(b)}²)`, c, 1), row('المحيط', 'أ + ب + الوتر', `${F(a)} + ${F(b)} + ${F(c)}`, a + b + c, 1), row('المساحة', '½ × أ × ب', `½ × ${F(a)} × ${F(b)}`, (a * b) / 2, 2)]; },
    },
    equi: {
      name: 'المثلث المتطابق الأضلاع', params: [P('a', 'طول الضلع ل', 5)],
      geo: ({ a }) => { const h = (Math.sqrt(3) / 2) * a; const pts = [[0, 0], [a, 0], [a / 2, h]]; return { pts, labels: [lab(mid(pts[0], pts[1]), `ل = ${F(a)}`)], height: [[a / 2, 0], [a / 2, h]] }; },
      calc: ({ a }) => [row('المحيط', '٣ × ل', `٣ × ${F(a)}`, 3 * a, 1), row('الارتفاع', '(√٣ ÷ ٢) ل', `(√٣ ÷ ٢) × ${F(a)}`, (Math.sqrt(3) / 2) * a, 1), row('المساحة', '(√٣ ÷ ٤) ل²', `(√٣ ÷ ٤) × ${F(a)}²`, (Math.sqrt(3) / 4) * a * a, 2)],
    },
    para: {
      name: 'متوازي الأضلاع', params: [P('b', 'القاعدة ق', 6), P('s', 'الضلع المائل م', 3.5), P('t', 'الزاوية (درجة)', 60, 20, 90, 5)],
      geo: ({ b, s, t }) => { const r = (t * PI) / 180, dx = s * Math.cos(r), h = s * Math.sin(r); const pts = [[0, 0], [b, 0], [b + dx, h], [dx, h]]; return { pts, labels: [lab(mid(pts[0], pts[1]), `ق = ${F(b)}`), lab(mid(pts[0], pts[3]), `م = ${F(s)}`)], height: [[dx, 0], [dx, h]] }; },
      calc: ({ b, s, t }) => { const h = s * Math.sin((t * PI) / 180); return [row('المحيط', '٢ × (ق + م)', `٢ × (${F(b)} + ${F(s)})`, 2 * (b + s), 1), row('الارتفاع', 'م × جا الزاوية', `${F(s)} × جا ${F(t)}°`, h, 1), row('المساحة', 'القاعدة × الارتفاع', `${F(b)} × ${F(h)}`, b * h, 2)]; },
    },
    rhombus: {
      name: 'المعين', params: [P('d1', 'القطر الأول ق١', 6), P('d2', 'القطر الثاني ق٢', 4)],
      geo: ({ d1, d2 }) => { const pts = [[0, d2 / 2], [d1 / 2, 0], [d1, d2 / 2], [d1 / 2, d2]]; return { pts, labels: [lab([d1 / 2, d2 / 2 + 0.25], `ق١ = ${F(d1)}`), lab([d1 / 2 + 0.3, d2 / 4], `ق٢ = ${F(d2)}`)], diag: [[pts[0], pts[2]], [pts[1], pts[3]]] }; },
      calc: ({ d1, d2 }) => { const s = Math.hypot(d1 / 2, d2 / 2); return [row('طول الضلع', '√((ق١÷٢)² + (ق٢÷٢)²)', `√(${F(d1 / 2)}² + ${F(d2 / 2)}²)`, s, 1), row('المحيط', '٤ × الضلع', `٤ × ${F(s)}`, 4 * s, 1), row('المساحة', '½ × ق١ × ق٢', `½ × ${F(d1)} × ${F(d2)}`, (d1 * d2) / 2, 2)]; },
    },
    trap: {
      name: 'شبه المنحرف', params: [P('b1', 'القاعدة الكبرى ق١', 7), P('b2', 'القاعدة الصغرى ق٢', 4), P('h', 'الارتفاع ع', 3), P('o', 'إزاحة القاعدة الصغرى', 1.5, 0, 6)],
      geo: ({ b1, b2, h, o }) => { const pts = [[0, 0], [b1, 0], [o + b2, h], [o, h]]; return { pts, labels: [lab(mid(pts[0], pts[1]), `ق١ = ${F(b1)}`), lab(mid(pts[2], pts[3]), `ق٢ = ${F(b2)}`)], height: [[o, 0], [o, h]] }; },
      calc: ({ b1, b2, h, o }) => { const l1 = Math.hypot(o, h), l2 = Math.hypot(b1 - o - b2, h); return [row('الساقان', '(بفيثاغورس)', '', 0, 0, `${F(l1)} و ${F(l2)}`), row('المحيط', 'ق١ + ق٢ + الساقان', `${F(b1)} + ${F(b2)} + ${F(l1)} + ${F(l2)}`, b1 + b2 + l1 + l2, 1), row('المساحة', '½ × (ق١ + ق٢) × ع', `½ × (${F(b1)} + ${F(b2)}) × ${F(h)}`, ((b1 + b2) * h) / 2, 2)]; },
    },
    kite: {
      name: 'الطائرة الورقية', params: [P('d1', 'القطر الأفقي ق١', 5), P('d2', 'القطر الرأسي ق٢', 7), P('k', 'موقع التقاطع على ق٢', 2.2, 0.5, 6)],
      geo: ({ d1, d2, k }) => { const kk = Math.min(k, d2 - 0.2); const pts = [[d1 / 2, 0], [d1, d2 - kk], [d1 / 2, d2], [0, d2 - kk]]; return { pts, labels: [lab([d1 / 2 + 0.35, d2 / 2], `ق٢ = ${F(d2)}`), lab([d1 * 0.25, d2 - kk + 0.3], `ق١ = ${F(d1)}`)], diag: [[pts[1], pts[3]], [pts[0], pts[2]]] }; },
      calc: ({ d1, d2, k }) => { const kk = Math.min(k, d2 - 0.2); const s1 = Math.hypot(d1 / 2, kk), s2 = Math.hypot(d1 / 2, d2 - kk); return [row('المحيط', '٢ × (الضلع الأول + الضلع الثاني)', `٢ × (${F(s1)} + ${F(s2)})`, 2 * (s1 + s2), 1), row('المساحة', '½ × ق١ × ق٢', `½ × ${F(d1)} × ${F(d2)}`, (d1 * d2) / 2, 2)]; },
    },
    regpoly: {
      name: 'المضلع المنتظم', params: [P('n', 'عدد الأضلاع ن', 6, 3, 12, 1), P('a', 'طول الضلع ل', 3)],
      geo: ({ n, a }) => { n = Math.round(n); const R = a / (2 * Math.sin(PI / n)); const pts = Array.from({ length: n }, (_, i) => { const t = -PI / 2 - PI / n + (2 * PI * i) / n; return [R + R * Math.cos(t), R + R * Math.sin(t)]; }); const ap = R * Math.cos(PI / n); return { pts, labels: [lab(mid(pts[0], pts[1]), `ل = ${F(a)}`)], height: [[R, R], mid(pts[0], pts[1])] , apLabel: `العامد = ${F(ap)}` }; },
      calc: ({ n, a }) => { n = Math.round(n); const ap = a / (2 * Math.tan(PI / n)); return [row('المحيط', 'ن × ل', `${M.loc(n)} × ${F(a)}`, n * a, 1), row('العامد (البعد من المركز إلى الضلع)', 'ل ÷ (٢ ظا(١٨٠° ÷ ن))', '', ap, 1), row('المساحة', '½ × المحيط × العامد', `½ × ${F(n * a)} × ${F(ap)}`, (n * a * ap) / 2, 2), row('مجموع الزوايا الداخلية', '(ن − ٢) × ١٨٠°', '', (n - 2) * 180, 0, `${M.loc((n - 2) * 180)}°`), row('قياس الزاوية الداخلية', '(ن − ٢) × ١٨٠° ÷ ن', '', ((n - 2) * 180) / n, 0, `${F(((n - 2) * 180) / n)}°`)]; },
    },
    circle: {
      name: 'الدائرة', params: [P('r', 'نصف القطر نق', 3, 0.5, 8)],
      geo: ({ r }) => ({ pts: arc(r, r, r, 0, 2 * PI, 96), curved: true, labels: [lab([r * 1.5, r + 0.3], `نق = ${F(r)}`)], radius: [[r, r], [2 * r, r]] }),
      calc: ({ r }) => [row('المحيط', '٢ × ط × نق', `٢ × ط × ${F(r)}`, 2 * PI * r, 1), row('المساحة', 'ط × نق²', `ط × ${F(r)}²`, PI * r * r, 2), row('القطر', '٢ × نق', `٢ × ${F(r)}`, 2 * r, 1)],
    },
    semicircle: {
      name: 'نصف الدائرة', params: [P('r', 'نصف القطر نق', 3, 0.5, 8)],
      geo: ({ r }) => ({ pts: arc(r, 0, r, 0, PI, 64), curved: true, labels: [lab([r * 1.5, 0.3], `نق = ${F(r)}`)], radius: [[r, 0], [2 * r, 0]] }),
      calc: ({ r }) => [row('المحيط', 'ط × نق + ٢ × نق', `ط × ${F(r)} + ٢ × ${F(r)}`, PI * r + 2 * r, 1), row('المساحة', '½ × ط × نق²', `½ × ط × ${F(r)}²`, (PI * r * r) / 2, 2)],
    },
    sector: {
      name: 'القطاع الدائري', params: [P('r', 'نصف القطر نق', 4, 0.5, 8), P('t', 'الزاوية المركزية (درجة)', 70, 10, 350, 5)],
      geo: ({ r, t }) => ({ pts: [[0, 0]].concat(arc(0, 0, r, 0, (t * PI) / 180, 64)), curved: true, labels: [lab([r * 0.55, -0.35], `نق = ${F(r)}`), lab([0.9 * Math.cos((t * PI) / 360), 0.9 * Math.sin((t * PI) / 360)], `${M.loc(t)}°`, 'ang')] }),
      calc: ({ r, t }) => { const L = (t / 360) * 2 * PI * r; return [row('طول القوس', '(الزاوية ÷ ٣٦٠) × ٢ ط نق', `(${M.loc(t)} ÷ ٣٦٠) × ٢ × ط × ${F(r)}`, L, 1), row('المحيط', 'طول القوس + ٢ نق', `${F(L)} + ٢ × ${F(r)}`, L + 2 * r, 1), row('المساحة', '(الزاوية ÷ ٣٦٠) × ط نق²', `(${M.loc(t)} ÷ ٣٦٠) × ط × ${F(r)}²`, (t / 360) * PI * r * r, 2)]; },
    },
    ellipse: {
      name: 'القطع الناقص', params: [P('a', 'نصف المحور الأكبر أ', 4, 0.5, 8), P('b', 'نصف المحور الأصغر ب', 2.5, 0.5, 8)],
      geo: ({ a, b }) => ({ pts: Array.from({ length: 97 }, (_, i) => [a + a * Math.cos((2 * PI * i) / 96), b + b * Math.sin((2 * PI * i) / 96)]), curved: true, labels: [lab([a * 1.5, b + 0.3], `أ = ${F(a)}`), lab([a + 0.35, b * 1.5], `ب = ${F(b)}`)], radius: [[a, b], [2 * a, b]] }),
      calc: ({ a, b }) => { const h = ((a - b) / (a + b)) ** 2; const per = PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))); return [row('المساحة', 'ط × أ × ب', `ط × ${F(a)} × ${F(b)}`, PI * a * b, 2), row('المحيط (تقريب رامانوجان)', 'ط(أ+ب)(١ + ٣هـ ÷ (١٠ + √(٤ − ٣هـ)))', '', per, 1)]; },
    },
    ring: {
      name: 'الحلقة الدائرية', params: [P('R', 'نصف القطر الخارجي', 4, 1, 8), P('r', 'نصف القطر الداخلي', 2, 0.5, 7)],
      valid: ({ R, r }) => (r < R ? null : 'نصف القطر الداخلي يجب أن يكون أصغر من الخارجي'),
      geo: ({ R, r }) => ({ pts: arc(R, R, R, 0, 2 * PI, 96), hole: arc(R, R, r, 0, 2 * PI, 96), curved: true, labels: [lab([R * 1.5, R + 0.3], `${F(R)}`), lab([R + r / 2, R - 0.3], `${F(r)}`)], radius: [[R, R], [2 * R, R]] }),
      calc: ({ R, r }) => [row('المساحة', 'ط (نق١² − نق٢²)', `ط × (${F(R)}² − ${F(r)}²)`, PI * (R * R - r * r), 2), row('مجموع المحيطين', '٢ط (نق١ + نق٢)', '', 2 * PI * (R + r), 1)],
    },
  };
  const defaults = (key) => Object.fromEntries(SHAPES[key].params.map((q) => [q.k, q.def]));
  M.shapes2d = { SHAPES, defaults, deg };
})();
