/* ==========================================================================
   المجسمات وشبكاتها: بناء الأوجه ثلاثية الأبعاد، طيّ الشبكة إلى مجسم،
   وحساب المساحة الجانبية والكلية والحجم وعدد الأوجه والأحرف والرؤوس
   المحور الرأسي في المشهد هو y (الأرض هي المستوى y = 0)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const PI = Math.PI;
  const L = (x) => M.loc(x);
  const F = (x) => M.fmt(x, 2);
  const COLORS = ['#38c9b4', '#f2b134', '#6aa9ff', '#ef6b6b', '#b28dff', '#5fd08a', '#ff9f5a', '#4fd1e8'];

  /* ---------------- تحويلات ثلاثية الأبعاد ---------------- */
  const I3 = () => ({ R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [0, 0, 0] });
  const mulR = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const mulV = (A, v) => A.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
  const apply = (m, p) => { const q = mulV(m.R, p); return [q[0] + m.t[0], q[1] + m.t[1], q[2] + m.t[2]]; };
  const compose = (A, B) => { const Bt = mulV(A.R, B.t); return { R: mulR(A.R, B.R), t: [Bt[0] + A.t[0], Bt[1] + A.t[1], Bt[2] + A.t[2]] }; };
  /** دوران بزاوية th حول محور يمر بالنقطة P واتجاهه d */
  function rotAbout(P, d, th) {
    const l = Math.hypot(d[0], d[1], d[2]) || 1; const [x, y, z] = [d[0] / l, d[1] / l, d[2] / l];
    const c = Math.cos(th), s = Math.sin(th), C = 1 - c;
    const R = [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
    const RP = mulV(R, P);
    return { R, t: [P[0] - RP[0], P[1] - RP[1], P[2] - RP[2]] };
  }
  const to3 = ([x, z]) => [x, 0, z];

  /**
   * طيّ شبكة مضلعات: faces = [{pts:[[x,z]...], parent, hinge:[i,j], fold, color}]
   * hinge: رقما رأسين في هذا الوجه يقعان على الحرف المشترك مع الأب. t من ٠ (مسطحة) إلى ١ (مجسم)
   */
  function foldNet(faces, t) {
    const mats = [];
    const out = [];
    faces.forEach((f, i) => {
      let m = I3();
      if (f.parent >= 0) {
        const P = to3(f.pts[f.hinge[0]]), Q = to3(f.pts[f.hinge[1]]);
        const d = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]];
        const c = f.pts.reduce((a, p) => [a[0] + p[0] / f.pts.length, a[1] + p[1] / f.pts.length], [0, 0]);
        const v = [c[0] - P[0], 0, c[1] - P[2]];
        // اتجاه الدوران الذي يرفع الوجه إلى الأعلى (+y)
        const lift = d[2] * v[0] - d[0] * v[2];
        const sgn = lift >= 0 ? 1 : -1;
        m = compose(mats[f.parent], rotAbout(P, d, sgn * f.fold * t));
      }
      mats[i] = m;
      out.push({ p: f.pts.map((p) => apply(m, to3(p))), color: f.color || COLORS[i % COLORS.length], twoSided: true });
    });
    return out;
  }

  /* ---------------- مضلعات القواعد ---------------- */
  const regPoly = (n, R, rot) => Array.from({ length: n }, (_, i) => { const a = (rot || 0) + (2 * PI * i) / n; return [R * Math.cos(a), R * Math.sin(a)]; });
  function prismFaces(base, h, col) {
    const bot = base.map(([x, z]) => [x, 0, z]), top = base.map(([x, z]) => [x, h, z]);
    const faces = [{ p: bot.slice().reverse(), color: col[1] }, { p: top, color: col[1] }];
    base.forEach((_, i) => { const j = (i + 1) % base.length; faces.push({ p: [bot[i], bot[j], top[j], top[i]], color: col[0] }); });
    return faces;
  }
  function pyramidFaces(base, h, col) {
    const bot = base.map(([x, z]) => [x, 0, z]), apex = [0, h, 0];
    const faces = [{ p: bot.slice().reverse(), color: col[1] }];
    base.forEach((_, i) => { const j = (i + 1) % base.length; faces.push({ p: [bot[i], bot[j], apex], color: col[0] }); });
    return faces;
  }
  /** سطح دوراني: نصف قطر r(v) وارتفاع y(v) لـ v من ٠ إلى ١ */
  function revolve(rf, yf, n, m, col, capBottom, capTop) {
    n = n || 40; m = m || 1;
    const faces = [];
    for (let k = 0; k < m; k++) {
      const v0 = k / m, v1 = (k + 1) / m;
      for (let i = 0; i < n; i++) {
        const a0 = (2 * PI * i) / n, a1 = (2 * PI * (i + 1)) / n;
        const P = (v, a) => [rf(v) * Math.cos(a), yf(v), rf(v) * Math.sin(a)];
        faces.push({ p: [P(v0, a0), P(v0, a1), P(v1, a1), P(v1, a0)], color: col[0], edge: false });
      }
    }
    const disc = (r, y, flip) => { const pts = Array.from({ length: n }, (_, i) => [r * Math.cos((2 * PI * i) / n), y, r * Math.sin((2 * PI * i) / n)]); return { p: flip ? pts.reverse() : pts, color: col[1], edge: false }; };
    if (capBottom) faces.push(disc(rf(0), yf(0), true));
    if (capTop) faces.push(disc(rf(1), yf(1), false));
    return faces;
  }
  const circleLines = (r, y, n, color) => Array.from({ length: n || 48 }, (_, i) => { const a0 = (2 * PI * i) / (n || 48), a1 = (2 * PI * (i + 1)) / (n || 48); return { a: [r * Math.cos(a0), y, r * Math.sin(a0)], b: [r * Math.cos(a1), y, r * Math.sin(a1)], color: color || 'rgba(255,255,255,.7)', width: 1.4 }; });
  const dim = (a, b, text, lp) => ({ lines: [{ a, b, color: '#f2b134', width: 2, dash: true, front: true }], labels: [{ p: lp || [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], text, color: '#f2b134' }] });

  /* ---------------- تعريف المجسمات ---------------- */
  const P = (k, label, def, min, max, step) => ({ k, label, def, min: min || 1, max: max || 10, step: step || 0.5 });
  const row = (name, formula, subst, value, unit) => ({ name, formula, subst, value, unit });
  const SOLIDS = {
    cube: {
      name: 'المكعب', params: [P('a', 'طول الحرف ل', 3)], vef: [8, 12, 6],
      build: ({ a }) => ({ faces: prismFaces(regPoly(4, a / Math.SQRT2, PI / 4), a, [COLORS[0], COLORS[0]]), dims: [dim([a / 2 + 0.3, 0, a / 2], [a / 2 + 0.3, a, a / 2], `ل = ${F(a)}`)] }),
      calc: ({ a }) => [row('المساحة الجانبية', '٤ ل²', `٤ × ${F(a)}²`, 4 * a * a, 2), row('المساحة الكلية', '٦ ل²', `٦ × ${F(a)}²`, 6 * a * a, 2), row('الحجم', 'ل³', `${F(a)}³`, a ** 3, 3), row('طول القطر', 'ل√٣', `${F(a)} × √٣`, a * Math.sqrt(3), 1)],
      net: 'cube',
    },
    cuboid: {
      name: 'متوازي المستطيلات', params: [P('l', 'الطول ل', 4), P('w', 'العرض ع', 2.5), P('h', 'الارتفاع ر', 2)], vef: [8, 12, 6],
      build: ({ l, w, h }) => ({ faces: prismFaces([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]], h, [COLORS[2], COLORS[2]]), dims: [dim([-l / 2, 0, w / 2 + 0.3], [l / 2, 0, w / 2 + 0.3], `ل = ${F(l)}`), dim([l / 2 + 0.3, 0, -w / 2], [l / 2 + 0.3, 0, w / 2], `ع = ${F(w)}`), dim([l / 2 + 0.3, 0, w / 2 + 0.3], [l / 2 + 0.3, h, w / 2 + 0.3], `ر = ${F(h)}`)] }),
      calc: ({ l, w, h }) => [row('المساحة الجانبية', '٢ر(ل + ع)', `٢ × ${F(h)} × (${F(l)} + ${F(w)})`, 2 * h * (l + w), 2), row('المساحة الكلية', '٢(ل ع + ل ر + ع ر)', `٢(${F(l)}×${F(w)} + ${F(l)}×${F(h)} + ${F(w)}×${F(h)})`, 2 * (l * w + l * h + w * h), 2), row('الحجم', 'ل × ع × ر', `${F(l)} × ${F(w)} × ${F(h)}`, l * w * h, 3), row('طول القطر', '√(ل² + ع² + ر²)', `√(${F(l)}² + ${F(w)}² + ${F(h)}²)`, Math.hypot(l, w, h), 1)],
      net: 'cuboid',
    },
    triPrism: {
      name: 'المنشور الثلاثي', params: [P('a', 'ضلع القاعدة (مثلث متطابق الأضلاع) أ', 3), P('h', 'ارتفاع المنشور ع', 4)], vef: [6, 9, 5],
      build: ({ a, h }) => ({ faces: prismFaces(regPoly(3, a / Math.sqrt(3), -PI / 2), h, [COLORS[1], COLORS[3]]), dims: [dim([a / Math.sqrt(3) + 0.3, 0, 0], [a / Math.sqrt(3) + 0.3, h, 0], `ع = ${F(h)}`)] }),
      calc: ({ a, h }) => { const B = (Math.sqrt(3) / 4) * a * a; return [row('مساحة القاعدة', '(√٣ ÷ ٤) أ²', `(√٣ ÷ ٤) × ${F(a)}²`, B, 2), row('المساحة الجانبية', 'محيط القاعدة × ع', `${F(3 * a)} × ${F(h)}`, 3 * a * h, 2), row('المساحة الكلية', 'الجانبية + ٢ × القاعدة', `${F(3 * a * h)} + ٢ × ${F(B)}`, 3 * a * h + 2 * B, 2), row('الحجم', 'مساحة القاعدة × ع', `${F(B)} × ${F(h)}`, B * h, 3)]; },
      net: 'triPrism',
    },
    hexPrism: {
      name: 'المنشور السداسي', params: [P('a', 'ضلع القاعدة (سداسي منتظم) أ', 1.6), P('h', 'ارتفاع المنشور ع', 3.5)], vef: [12, 18, 8],
      build: ({ a, h }) => ({ faces: prismFaces(regPoly(6, a), h, [COLORS[4], COLORS[1]]), dims: [dim([a + 0.3, 0, 0], [a + 0.3, h, 0], `ع = ${F(h)}`)] }),
      calc: ({ a, h }) => { const B = ((3 * Math.sqrt(3)) / 2) * a * a; return [row('مساحة القاعدة', '(٣√٣ ÷ ٢) أ²', `(٣√٣ ÷ ٢) × ${F(a)}²`, B, 2), row('المساحة الجانبية', '٦ أ × ع', `٦ × ${F(a)} × ${F(h)}`, 6 * a * h, 2), row('المساحة الكلية', 'الجانبية + ٢ × القاعدة', `${F(6 * a * h)} + ٢ × ${F(B)}`, 6 * a * h + 2 * B, 2), row('الحجم', 'مساحة القاعدة × ع', `${F(B)} × ${F(h)}`, B * h, 3)]; },
      net: 'hexPrism',
    },
    sqPyramid: {
      name: 'الهرم الرباعي', params: [P('a', 'ضلع القاعدة أ', 3.5), P('h', 'الارتفاع ع', 3)], vef: [5, 8, 5],
      build: ({ a, h }) => ({ faces: pyramidFaces(regPoly(4, a / Math.SQRT2, PI / 4), h, [COLORS[1], COLORS[0]]), dims: [dim([0, 0, 0], [0, h, 0], `ع = ${F(h)}`, [0.35, h / 2, 0])] }),
      calc: ({ a, h }) => { const s = Math.hypot(h, a / 2); return [row('الارتفاع الجانبي', '√(ع² + (أ÷٢)²)', `√(${F(h)}² + ${F(a / 2)}²)`, s, 1), row('المساحة الجانبية', '٢ أ × الارتفاع الجانبي', `٢ × ${F(a)} × ${F(s)}`, 2 * a * s, 2), row('المساحة الكلية', 'أ² + الجانبية', `${F(a)}² + ${F(2 * a * s)}`, a * a + 2 * a * s, 2), row('الحجم', '⅓ × أ² × ع', `⅓ × ${F(a)}² × ${F(h)}`, (a * a * h) / 3, 3)]; },
      net: 'sqPyramid',
    },
    tetra: {
      name: 'الهرم الثلاثي المنتظم', params: [P('a', 'طول الحرف أ', 3.5)], vef: [4, 6, 4],
      build: ({ a }) => ({ faces: pyramidFaces(regPoly(3, a / Math.sqrt(3), -PI / 2), a * Math.sqrt(2 / 3), [COLORS[5], COLORS[3]]), dims: [] }),
      calc: ({ a }) => [row('مساحة الوجه الواحد', '(√٣ ÷ ٤) أ²', `(√٣ ÷ ٤) × ${F(a)}²`, (Math.sqrt(3) / 4) * a * a, 2), row('المساحة الكلية', '√٣ أ²', `√٣ × ${F(a)}²`, Math.sqrt(3) * a * a, 2), row('الارتفاع', 'أ √(٢÷٣)', `${F(a)} × √(٢÷٣)`, a * Math.sqrt(2 / 3), 1), row('الحجم', 'أ³ ÷ (٦√٢)', `${F(a)}³ ÷ (٦√٢)`, a ** 3 / (6 * Math.SQRT2), 3)],
      net: 'tetra',
    },
    cylinder: {
      name: 'الأسطوانة', params: [P('r', 'نصف القطر نق', 1.5, 0.5, 6), P('h', 'الارتفاع ع', 3.5)], vef: null,
      build: ({ r, h }) => ({ faces: revolve(() => r, (v) => v * h, 44, 1, [COLORS[0], COLORS[1]], true, true), lines: circleLines(r, 0).concat(circleLines(r, h)), dims: [dim([0, h, 0], [r, h, 0], `نق = ${F(r)}`, [r / 2, h + 0.3, 0]), dim([r + 0.3, 0, 0], [r + 0.3, h, 0], `ع = ${F(h)}`)] }),
      calc: ({ r, h }) => [row('مساحة القاعدة', 'ط نق²', `ط × ${F(r)}²`, PI * r * r, 2), row('المساحة الجانبية', '٢ ط نق ع', `٢ × ط × ${F(r)} × ${F(h)}`, 2 * PI * r * h, 2), row('المساحة الكلية', '٢ ط نق (نق + ع)', `٢ × ط × ${F(r)} × (${F(r)} + ${F(h)})`, 2 * PI * r * (r + h), 2), row('الحجم', 'ط نق² ع', `ط × ${F(r)}² × ${F(h)}`, PI * r * r * h, 3)],
      net: 'cylinder',
    },
    cone: {
      name: 'المخروط', params: [P('r', 'نصف قطر القاعدة نق', 1.8, 0.5, 6), P('h', 'الارتفاع ع', 3.5)], vef: null,
      build: ({ r, h }) => ({ faces: revolve((v) => r * (1 - v), (v) => v * h, 44, 1, [COLORS[1], COLORS[0]], true, false), lines: circleLines(r, 0), dims: [dim([0, 0, 0], [0, h, 0], `ع = ${F(h)}`, [0.35, h / 2, 0]), dim([0, 0, 0], [r, 0, 0], `نق = ${F(r)}`, [r / 2, -0.3, 0])] }),
      calc: ({ r, h }) => { const s = Math.hypot(r, h); return [row('الراسم (الارتفاع الجانبي)', '√(نق² + ع²)', `√(${F(r)}² + ${F(h)}²)`, s, 1), row('المساحة الجانبية', 'ط نق ل', `ط × ${F(r)} × ${F(s)}`, PI * r * s, 2), row('المساحة الكلية', 'ط نق (نق + ل)', `ط × ${F(r)} × (${F(r)} + ${F(s)})`, PI * r * (r + s), 2), row('الحجم', '⅓ ط نق² ع', `⅓ × ط × ${F(r)}² × ${F(h)}`, (PI * r * r * h) / 3, 3)]; },
      net: 'cone',
    },
    sphere: {
      name: 'الكرة', params: [P('r', 'نصف القطر نق', 2, 0.5, 6)], vef: null,
      build: ({ r }) => ({ faces: revolve((v) => r * Math.sin(PI * v), (v) => r - r * Math.cos(PI * v), 36, 18, [COLORS[2], COLORS[2]]), lines: circleLines(r, r, 48, 'rgba(255,255,255,.35)'), dims: [dim([0, r, 0], [r, r, 0], `نق = ${F(r)}`, [r / 2, r + 0.3, 0])] }),
      calc: ({ r }) => [row('مساحة السطح', '٤ ط نق²', `٤ × ط × ${F(r)}²`, 4 * PI * r * r, 2), row('الحجم', '⁴⁄₃ ط نق³', `⁴⁄₃ × ط × ${F(r)}³`, (4 / 3) * PI * r ** 3, 3)],
    },
    hemisphere: {
      name: 'نصف الكرة', params: [P('r', 'نصف القطر نق', 2, 0.5, 6)], vef: null,
      build: ({ r }) => ({ faces: revolve((v) => r * Math.cos((PI / 2) * v), (v) => r * Math.sin((PI / 2) * v), 36, 9, [COLORS[3], COLORS[1]], true, false), lines: circleLines(r, 0), dims: [dim([0, 0, 0], [r, 0, 0], `نق = ${F(r)}`, [r / 2, -0.3, 0])] }),
      calc: ({ r }) => [row('المساحة المنحنية', '٢ ط نق²', `٢ × ط × ${F(r)}²`, 2 * PI * r * r, 2), row('المساحة الكلية', '٣ ط نق²', `٣ × ط × ${F(r)}²`, 3 * PI * r * r, 2), row('الحجم', '⅔ ط نق³', `⅔ × ط × ${F(r)}³`, (2 / 3) * PI * r ** 3, 3)],
    },
    frustum: {
      name: 'المخروط الناقص', params: [P('r1', 'نصف قطر القاعدة الكبرى نق١', 2.2, 0.5, 6), P('r2', 'نصف قطر القاعدة الصغرى نق٢', 1.1, 0.2, 6), P('h', 'الارتفاع ع', 3)], vef: null,
      build: ({ r1, r2, h }) => ({ faces: revolve((v) => r1 + (r2 - r1) * v, (v) => v * h, 44, 1, [COLORS[6], COLORS[1]], true, true), lines: circleLines(r1, 0).concat(circleLines(r2, h)), dims: [dim([r1 + 0.3, 0, 0], [r1 + 0.3, h, 0], `ع = ${F(h)}`)] }),
      calc: ({ r1, r2, h }) => { const s = Math.hypot(h, r1 - r2); return [row('الراسم', '√(ع² + (نق١ − نق٢)²)', `√(${F(h)}² + ${F(r1 - r2)}²)`, s, 1), row('المساحة الجانبية', 'ط (نق١ + نق٢) ل', `ط × (${F(r1)} + ${F(r2)}) × ${F(s)}`, PI * (r1 + r2) * s, 2), row('المساحة الكلية', 'الجانبية + ط نق١² + ط نق٢²', '', PI * (r1 + r2) * s + PI * (r1 * r1 + r2 * r2), 2), row('الحجم', '⅓ ط ع (نق١² + نق١ نق٢ + نق٢²)', `⅓ × ط × ${F(h)} × (${F(r1)}² + ${F(r1)}×${F(r2)} + ${F(r2)}²)`, (PI * h * (r1 * r1 + r1 * r2 + r2 * r2)) / 3, 3)]; },
    },
  };

  /* ---------------- الشبكات ---------------- */
  const sq = (x0, z0, w, d) => [[x0, z0], [x0 + w, z0], [x0 + w, z0 + d], [x0, z0 + d]];
  const NETS = {
    cube: ({ a }) => [
      { pts: sq(0, 0, a, a), parent: -1, name: 'القاعدة' },
      { pts: sq(0, -a, a, a), parent: 0, hinge: [3, 2], fold: PI / 2, name: 'الأمامي' },
      { pts: sq(0, a, a, a), parent: 0, hinge: [0, 1], fold: PI / 2, name: 'الخلفي' },
      { pts: sq(0, 2 * a, a, a), parent: 2, hinge: [0, 1], fold: PI / 2, name: 'العلوي' },
      { pts: sq(-a, 0, a, a), parent: 0, hinge: [1, 2], fold: PI / 2, name: 'الأيسر' },
      { pts: sq(a, 0, a, a), parent: 0, hinge: [0, 3], fold: PI / 2, name: 'الأيمن' },
    ],
    cuboid: ({ l, w, h }) => [
      { pts: sq(0, 0, l, w), parent: -1 },
      { pts: sq(0, -h, l, h), parent: 0, hinge: [3, 2], fold: PI / 2 },
      { pts: sq(0, w, l, h), parent: 0, hinge: [0, 1], fold: PI / 2 },
      { pts: sq(0, w + h, l, w), parent: 2, hinge: [0, 1], fold: PI / 2 },
      { pts: sq(-h, 0, h, w), parent: 0, hinge: [1, 2], fold: PI / 2 },
      { pts: sq(l, 0, h, w), parent: 0, hinge: [0, 3], fold: PI / 2 },
    ],
    triPrism: ({ a, h }) => {
      const t = (a * Math.sqrt(3)) / 2;
      return [
        { pts: sq(0, 0, a, h), parent: -1 },
        { pts: sq(a, 0, a, h), parent: 0, hinge: [0, 3], fold: (2 * PI) / 3 },
        { pts: sq(2 * a, 0, a, h), parent: 1, hinge: [0, 3], fold: (2 * PI) / 3 },
        { pts: [[0, 0], [a / 2, -t], [a, 0]], parent: 0, hinge: [0, 2], fold: PI / 2 },
        { pts: [[0, h], [a, h], [a / 2, h + t]], parent: 0, hinge: [0, 1], fold: PI / 2 },
      ];
    },
    hexPrism: ({ a, h }) => {
      const faces = [{ pts: sq(0, 0, a, h), parent: -1 }];
      for (let i = 1; i < 6; i++) faces.push({ pts: sq(i * a, 0, a, h), parent: i - 1, hinge: [0, 3], fold: PI / 3 });
      const hx = (cx, cz, flip) => regPoly(6, a, 0).map(([x, z]) => [cx + x, cz + (flip ? -z : z)]);
      const ap = (a * Math.sqrt(3)) / 2;
      const top = hx(a / 2, h + ap), bot = hx(a / 2, -ap);
      // الرأسان المشتركان مع المستطيل الأول
      const pick = (poly, zEdge) => poly.map((p, i) => [i, p]).filter(([, p]) => Math.abs(p[1] - zEdge) < 1e-6).map(([i]) => i);
      faces.push({ pts: bot, parent: 0, hinge: pick(bot, 0), fold: PI / 2 });
      faces.push({ pts: top, parent: 0, hinge: pick(top, h), fold: PI / 2 });
      return faces;
    },
    sqPyramid: ({ a, h }) => {
      const s = Math.hypot(h, a / 2), f = PI - Math.atan2(h, a / 2);
      return [
        { pts: sq(0, 0, a, a), parent: -1 },
        { pts: [[0, 0], [a / 2, -s], [a, 0]], parent: 0, hinge: [0, 2], fold: f },
        { pts: [[a, 0], [a + s, a / 2], [a, a]], parent: 0, hinge: [0, 2], fold: f },
        { pts: [[a, a], [a / 2, a + s], [0, a]], parent: 0, hinge: [0, 2], fold: f },
        { pts: [[0, a], [-s, a / 2], [0, 0]], parent: 0, hinge: [0, 2], fold: f },
      ];
    },
    tetra: ({ a }) => {
      const t = (a * Math.sqrt(3)) / 2, f = PI - Math.acos(1 / 3);
      const A = [0, 0], B = [a, 0], C = [a / 2, t];
      const out = (p, q, r) => [p, [p[0] + q[0] - r[0], p[1] + q[1] - r[1]], q]; // انعكاس الرأس المقابل
      return [
        { pts: [A, B, C], parent: -1 },
        { pts: out(A, B, C), parent: 0, hinge: [0, 2], fold: f },
        { pts: out(B, C, A), parent: 0, hinge: [0, 2], fold: f },
        { pts: out(C, A, B), parent: 0, hinge: [0, 2], fold: f },
      ];
    },
  };
  /** شبكة مطوية جزئياً: أوجه ثلاثية الأبعاد */
  function netFaces(key, p, t) {
    if (key === 'cylinder') return cylinderNet(p, t);
    if (key === 'cone') return coneNet(p, t);
    const faces = NETS[key](p);
    faces.forEach((f, i) => (f.color = COLORS[i % COLORS.length]));
    return foldNet(faces, t);
  }
  function cylinderNet({ r, h }, t) {
    const W = 2 * PI * r, n = 48, out = [];
    const R = t > 1e-6 ? W / (2 * PI * t) : Infinity;
    const P = (x, z) => { if (!Number.isFinite(R)) return [x, 0, z]; const ph = x / R; return [R * Math.sin(ph), R * (1 - Math.cos(ph)), z]; };
    for (let i = 0; i < n; i++) {
      const x0 = -W / 2 + (W * i) / n, x1 = -W / 2 + (W * (i + 1)) / n;
      out.push({ p: [P(x0, 0), P(x1, 0), P(x1, h), P(x0, h)], color: COLORS[0], edge: false, twoSided: true });
    }
    const disc = (cz, sign) => {
      const pts = regPoly(n, r).map(([x, z]) => [x, 0, cz + z]);
      const hinge = sign > 0 ? 0 : h;
      const m = rotAbout([0, 0, hinge], [1, 0, 0], sign * (PI / 2) * t);
      return { p: pts.map((q) => apply(m, q)), color: COLORS[1], edge: false, twoSided: true };
    };
    out.push(disc(h + r, -1), disc(-r, 1));
    return out;
  }
  function coneNet({ r, h }, t) {
    const s = Math.hypot(r, h), TH = (2 * PI * r) / s, n = 48, m = 6, out = [];
    const k = 1 + t * (2 * PI / TH - 1), sg = 1 / k, cg = Math.sqrt(Math.max(0, 1 - sg * sg));
    const P = (rho, al) => { const b = al * k; return [rho * sg * Math.sin(b), s * cg - rho * cg, rho * sg * Math.cos(b)]; };
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const a0 = -TH / 2 + (TH * i) / n, a1 = -TH / 2 + (TH * (i + 1)) / n, r0 = (s * j) / m, r1 = (s * (j + 1)) / m;
      out.push({ p: [P(r0, a0), P(r0, a1), P(r1, a1), P(r1, a0)].filter((q, qi, arr) => qi === 0 || Math.hypot(q[0] - arr[qi - 1][0], q[1] - arr[qi - 1][1], q[2] - arr[qi - 1][2]) > 1e-9), color: COLORS[1], edge: false, twoSided: true });
    }
    // القاعدة: تنزلق من خارج القطاع إلى مركزه
    const d = (s + r) * (1 - t);
    out.push({ p: regPoly(n, r).map(([x, z]) => [x, 0, z + d]), color: COLORS[0], edge: false, twoSided: true });
    return out;
  }

  /** مشهد مجسم كامل */
  function solidScene(key, p) {
    const S = SOLIDS[key];
    const b = S.build(p);
    const scene = { faces: b.faces, lines: (b.lines || []).slice(), labels: [] };
    (b.dims || []).forEach((d) => { scene.lines.push(...d.lines); scene.labels.push(...d.labels); });
    return scene;
  }
  const defaults = (key) => Object.fromEntries(SOLIDS[key].params.map((q) => [q.k, q.def]));

  M.solids = { SOLIDS, NETS, netFaces, foldNet, solidScene, defaults, COLORS, _rotAbout: rotAbout, _apply: apply };
})();
