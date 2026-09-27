/* ==========================================================================
   الدائرة التفاعلية على السبورة: المحيط والمساحة، القطاع وطول القوس، القطعة الدائرية،
   الزوايا المركزية والمحيطية، الرباعي الدائري، المماسات، الأوتار… ونقاط تُسحب باليد أو بالقلم
   الكائن: { type:'circ', cx, cy, r, scene, a:{A,B,…} (زوايا بالراديان باتجاه عكس عقارب الساعة),
             e:{k,a} (نقطة خارجية للمماسين), opts:{pi, card, rad}, anim:{t} }
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const TAU = Math.PI * 2, DEG = 180 / Math.PI;
  const norm = (a) => ((a % TAU) + TAU) % TAU;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 2 : d);

  /* ---------------- الرياضيات (نقية وقابلة للاختبار) ---------------- */
  const measures = (r) => ({ d: 2 * r, C: TAU * r, A: Math.PI * r * r });
  const sector = (r, th) => ({ arc: r * th, area: 0.5 * r * r * th, perim: 2 * r + r * th, deg: th * DEG });
  const segment = (r, th) => ({ area: 0.5 * r * r * (th - Math.sin(th)), tri: 0.5 * r * r * Math.sin(th), chord: 2 * r * Math.sin(th / 2) });
  /** الزاوية عند الرأس P بين الشعاعين إلى A و B (بالدرجات، ٠–١٨٠) */
  function angleAt(P, A, B) {
    let d = Math.abs(Math.atan2(A[1] - P[1], A[0] - P[0]) - Math.atan2(B[1] - P[1], B[0] - P[0]));
    if (d > Math.PI) d = TAU - d;
    return d * DEG;
  }
  const pt = (o, a) => [o.cx + o.r * Math.cos(a), o.cy - o.r * Math.sin(a)];
  const angOf = (o, x, y) => Math.atan2(-(y - o.cy), x - o.cx);
  /** هل الزاوية x تقع على القوس من a إلى b عكس عقارب الساعة؟ */
  const onArc = (x, a, b) => norm(x - a) <= norm(b - a) + 1e-12;
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  function extPt(o) { const e = o.e || { k: 2.3, a: 0.2 }; return [o.cx + e.k * o.r * Math.cos(e.a), o.cy - e.k * o.r * Math.sin(e.a)]; }
  function tangents(o) {
    const E = extPt(o), dx = E[0] - o.cx, dy = -(E[1] - o.cy), d = Math.hypot(dx, dy);
    if (d <= o.r * 1.0001) return null;
    const base = Math.atan2(dy, dx), off = Math.acos(o.r / d);
    return { E, d, len: Math.sqrt(d * d - o.r * o.r), a1: base + off, a2: base - off, between: 180 - 2 * off * DEG };
  }
  function segX(p1, p2, p3, p4) {
    const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
    if (Math.abs(d) < 1e-9) return null;
    const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
    const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
  }

  /* ---------------- المشاهد ---------------- */
  const d2r = (d) => (d * Math.PI) / 180;
  const SCENES = {
    basic: { t: 'المحيط والمساحة', grp: 'measure', pts: { R: d2r(30) } },
    sector: { t: 'القطاع وطول القوس', grp: 'measure', pts: { A: d2r(15), B: d2r(95) } },
    segment: { t: 'القطعة الدائرية', grp: 'measure', pts: { A: d2r(-20), B: d2r(100) } },
    inscribed: { t: 'المركزية والمحيطية', grp: 'thm', pts: { A: d2r(-30), B: d2r(55), P: d2r(210) } },
    semicircle: { t: 'الزاوية في نصف دائرة', grp: 'thm', pts: { A: d2r(10), P: d2r(120) } },
    sameArc: { t: 'زوايا على القوس نفسه', grp: 'thm', pts: { A: d2r(-35), B: d2r(35), P: d2r(130), Q: d2r(215) } },
    cyclic: { t: 'الرباعي الدائري', grp: 'thm', pts: { A: d2r(15), B: d2r(125), C: d2r(200), D: d2r(285) } },
    tangent: { t: 'المماسان من نقطة خارجية', grp: 'thm', pts: {}, e: { k: 2.3, a: d2r(10) } },
    chord: { t: 'الوتر والعمود من المركز', grp: 'thm', pts: { A: d2r(25), B: d2r(145) } },
    chords: { t: 'الأوتار المتقاطعة', grp: 'thm', pts: { A: d2r(20), B: d2r(205), C: d2r(100), D: d2r(285) } },
    tanChord: { t: 'المماس والوتر', grp: 'thm', pts: { A: d2r(-90), B: d2r(45), P: d2r(145) } },
    tangentAt: { t: 'المماس عند نقطة (بالإحداثيات)', grp: 'thm', pts: { A: d2r(37) } },
    lineCircle: { t: 'تقاطع مستقيم ودائرة', grp: 'thm', pts: {}, q: { P: [-1.25, 0.05], Q: [1.2, 0.85] } },
    pi: { t: 'اكتشف ط بالدحرجة', grp: 'discover', pts: {} },
    slices: { t: 'اكتشف المساحة بالتقطيع', grp: 'discover', pts: {}, n: 12 },
  };
  const LBL = { A: 'أ', B: 'ب', C: 'ج', D: 'د', P: 'ج', Q: 'د' };

  function create(cx, cy, r, scene, opts) {
    scene = SCENES[scene] ? scene : 'basic';
    const S = SCENES[scene];
    const o = { id: Math.random().toString(36).slice(2, 10), type: 'circ', cx, cy, r, scene, a: Object.assign({}, S.pts), e: S.e ? Object.assign({}, S.e) : undefined, n: S.n, opts: Object.assign({ pi: 'pi', card: true }, opts || {}), color: 'c0', width: 3 };
    initQ(o);
    return o;
  }
  function setScene(o, scene) {
    const S = SCENES[scene]; if (!S) return;
    o.scene = scene; o.a = Object.assign({}, S.pts); o.e = S.e ? Object.assign({}, S.e) : undefined; o.n = S.n || o.n; o.anim = null;
    initQ(o);
  }
  /** نقطتا المستقيم الحرّتان (بالسنتيمتر، نسبةً إلى المركز، ص للأعلى) */
  function initQ(o) {
    const S = SCENES[o.scene];
    if (S && S.q) { const rc = o.r / unitOf(); o.q = { P: [+(S.q.P[0] * rc).toFixed(1), +(S.q.P[1] * rc).toFixed(1)], Q: [+(S.q.Q[0] * rc).toFixed(1), +(S.q.Q[1] * rc).toFixed(1)] }; }
  }
  const qW = (o, k) => [o.cx + o.q[k][0] * unitOf(), o.cy - o.q[k][1] * unitOf()];
  /** المستقيم أ س + ب ص + ج = ٠ المار بـ ل و ك ، وتقاطعه مع الدائرة (المركز عند الأصل) */
  function lineCircleCalc(o) {
    const r = o.r / unitOf(), [x1, y1] = o.q.P, [x2, y2] = o.q.Q;
    const A = y2 - y1, Bc = x1 - x2, C = x2 * y1 - x1 * y2, nn = Math.hypot(A, Bc) || 1;
    const d = Math.abs(C) / nn, foot = [(-A * C) / (nn * nn), (-Bc * C) / (nn * nn)];
    const dir = [-Bc / nn, A / nn];
    let pts = [];
    if (d < r - 1e-9) { const hlf = Math.sqrt(r * r - d * d); pts = [[foot[0] - dir[0] * hlf, foot[1] - dir[1] * hlf], [foot[0] + dir[0] * hlf, foot[1] + dir[1] * hlf]]; }
    else if (Math.abs(d - r) < 1e-9) pts = [foot];
    return { r, A, B: Bc, C, d, foot, dir, pts, kind: d < r - 1e-9 ? 'secant' : Math.abs(d - r) < 1e-9 ? 'tangent' : 'none' };
  }
  const eqLine = (A, Bc, C) => {
    const X = M.varName('x'), Y = M.varName('y');
    if (Math.abs(Bc) < 1e-9) return `${X} = ${F(-C / A)}`;
    const m = -A / Bc, c = -C / Bc;
    return `${Y} = ${Math.abs(m) < 1e-9 ? '' : (Math.abs(m - 1) < 1e-9 ? '' : Math.abs(m + 1) < 1e-9 ? '−' : F(m)) + X}${Math.abs(m) < 1e-9 ? F(c) : Math.abs(c) < 1e-9 ? '' : ` ${c < 0 ? '−' : '+'} ${F(Math.abs(c))}`}`;
  };
  /** كل نقاط المشهد (للرسم والسحب) */
  function points(o) {
    const P = {};
    const keys = Object.keys(o.a || {}).filter((k) => k !== 'R');
    keys.forEach((k) => (P[k] = pt(o, o.a[k])));
    if (o.scene === 'semicircle') P.B = pt(o, o.a.A + Math.PI);
    return P;
  }

  /* ---------------- القيم المعروضة ---------------- */
  const unitOf = () => (M.board && M.board.unit) || (M.settings && M.settings.unit) || 40;
  const piVal = (o) => (o.opts && o.opts.pi === '22/7' ? 22 / 7 : o.opts && o.opts.pi === '3.14' ? 3.14 : Math.PI);
  const piTxt = (o) => (o.opts && o.opts.pi === '22/7' ? '٢٢/٧' : o.opts && o.opts.pi === '3.14' ? '٣٫١٤' : 'ط');
  /** k·ط بالصيغة المختارة: «٢٥ط ≈ ٧٨٫٥٤» أو «٧٨٫٥» */
  function withPi(o, k, unit) {
    const u = unit ? ' ' + unit : '';
    if (!o.opts || o.opts.pi === 'pi' || !o.opts.pi) {
      const kk = Math.abs(k - 1) < 1e-9 ? '' : F(k);
      return `${kk}ط ≈ ${F(k * Math.PI)}${u}`;
    }
    return `${F(k * piVal(o))}${u}`;
  }
  const rU = (o) => Math.round((o.r / unitOf()) * 100) / 100;
  const degOf = (rad) => Math.round(norm(rad) * DEG * 10) / 10;
  /** الزاوية المركزية للقطاع (القوس من أ إلى ب عكس عقارب الساعة) */
  const thetaDeg = (o) => degOf(o.a.B - o.a.A) || 360;
  const radTxt = (deg) => { const fr = M.toFraction ? M.toFraction(deg / 180) : null; const f = fr && fr.d <= 36 ? (fr.n === 1 && fr.d === 1 ? 'ط' : fr.d === 1 ? `${L(fr.n)}ط` : `${fr.n === 1 ? '' : L(fr.n)}ط/${L(fr.d)}`) : `${F(deg / 180, 3)}ط`; return `${f} ≈ ${F((deg * Math.PI) / 180, 3)}`; };

  function info(o) {
    const r = rU(o), P = points(o), lines = [];
    let title = SCENES[o.scene] ? SCENES[o.scene].t : 'الدائرة';
    const ang = (p, a, b) => Math.round(angleAt(p, a, b) * 10) / 10;
    const pv = piTxt(o), exact = !o.opts || o.opts.pi === 'pi';
    switch (o.scene) {
      case 'basic': {
        lines.push(`نق = ${F(r)} سم ، القطر ق = ٢نق = ${F(2 * r)} سم`);
        lines.push(`المحيط = ٢${pv} نق = ٢ × ${pv} × ${F(r)} = ${withPi(o, 2 * r, 'سم')}`);
        lines.push(`المساحة = ${pv} نق² = ${pv} × ${F(r)}² = ${withPi(o, r * r, 'سم²')}`);
        lines.push(`المحيط ÷ القطر = ${exact ? 'ط ≈ ٣٫١٤١٦' : pv} دائماً`);
        break;
      }
      case 'sector': {
        const th = thetaDeg(o), k = th / 360;
        lines.push(`نق = ${F(r)} سم ، θ = ${F(th, 1)}° = ${radTxt(th)} راديان`);
        lines.push(`طول القوس = (θ ÷ ٣٦٠) × ٢${pv} نق = ${withPi(o, 2 * r * k, 'سم')}`);
        lines.push(`مساحة القطاع = (θ ÷ ٣٦٠) × ${pv} نق² = ${withPi(o, r * r * k, 'سم²')}`);
        lines.push(`محيط القطاع = ٢نق + طول القوس = ${F(2 * r + 2 * piVal(o) * r * k)} سم`);
        lines.push(`بالراديان: ل = نق θ ، م = ½ نق² θ`);
        break;
      }
      case 'segment': {
        const th = thetaDeg(o), rad = (th * Math.PI) / 180, sg = segment(r, rad), k = th / 360;
        lines.push(`نق = ${F(r)} سم ، θ = ${F(th, 1)}°`);
        lines.push(`مساحة القطاع = (θ ÷ ٣٦٠) × ${pv} نق² = ${F(piVal(o) * r * r * k)} سم²`);
        lines.push(`مساحة المثلث = ½ نق² جا θ = ${F(sg.tri)} سم²`);
        lines.push(`مساحة القطعة = القطاع − المثلث = ${F(piVal(o) * r * r * k - sg.tri)} سم²`);
        lines.push(`طول الوتر أب = ٢ نق جا(θ÷٢) = ${F(sg.chord)} سم`);
        break;
      }
      case 'inscribed': {
        const O = [o.cx, o.cy];
        // القوس أب الذي لا يحوي ج
        const arcAB = onArc(o.a.P, o.a.A, o.a.B) ? degOf(o.a.A - o.a.B) : degOf(o.a.B - o.a.A);
        const insc = ang(P.P, P.A, P.B);
        lines.push(`الزاوية المركزية أمب = ${F(arcAB, 1)}°${arcAB > 180 ? ' (منعكسة)' : ''}`);
        lines.push(`الزاوية المحيطية أجب = ${F(insc, 1)}°`);
        lines.push(`المركزية = ٢ × المحيطية ⇐ ${F(arcAB, 1)} = ٢ × ${F(insc, 1)} ✓`);
        void O;
        break;
      }
      case 'semicircle': {
        lines.push(`أب قطر = ${F(2 * r)} سم`);
        lines.push(`الزاوية أجب = ${F(ang(P.P, P.A, P.B), 1)}° — قائمة دائماً ✓`);
        lines.push('حرّك ج على الدائرة: تبقى الزاوية ٩٠°');
        break;
      }
      case 'sameArc': {
        const p = ang(P.P, P.A, P.B), q = ang(P.Q, P.A, P.B);
        const same = onArc(o.a.P, o.a.B, o.a.A) === onArc(o.a.Q, o.a.B, o.a.A);
        lines.push(`∠أجب = ${F(p, 1)}° ، ∠أدب = ${F(q, 1)}°`);
        lines.push(same ? 'زاويتان محيطيتان على القوس نفسه ⇐ متساويتان ✓' : `ج و د على جهتين ⇐ متكاملتان: ${F(p, 1)} + ${F(q, 1)} = ${F(p + q, 1)}° ✓`);
        break;
      }
      case 'cyclic': {
        const ord = ['A', 'B', 'C', 'D'].slice().sort((x, y) => norm(o.a[x]) - norm(o.a[y]));
        const Q = ord.map((k) => P[k]), an = Q.map((p, i) => ang(p, Q[(i + 3) % 4], Q[(i + 1) % 4]));
        const nm = ord.map((k) => LBL[k]);
        lines.push(`∠${nm[0]} + ∠${nm[2]} = ${F(an[0], 1)} + ${F(an[2], 1)} = ${F(an[0] + an[2], 1)}° ✓`);
        lines.push(`∠${nm[1]} + ∠${nm[3]} = ${F(an[1], 1)} + ${F(an[3], 1)} = ${F(an[1] + an[3], 1)}° ✓`);
        lines.push('الزاويتان المتقابلتان في الرباعي الدائري متكاملتان');
        break;
      }
      case 'tangent': {
        const t = tangents(o);
        if (!t) { lines.push('اسحب النقطة ل إلى خارج الدائرة'); break; }
        const d = t.d / unitOf(), len = t.len / unitOf();
        lines.push(`ل أ = ل ب = √(ل م² − نق²) = √(${F(d)}² − ${F(r)}²) = ${F(len)} سم ✓`);
        lines.push('∠م أ ل = ∠م ب ل = ٩٠° (المماس ⟂ نصف القطر)');
        lines.push(`الزاوية بين المماسين = ${F(t.between, 1)}° ، والمركزية أمب = ${F(180 - t.between, 1)}°`);
        break;
      }
      case 'chord': {
        const c = dist(P.A, P.B) / unitOf(), mid = [(P.A[0] + P.B[0]) / 2, (P.A[1] + P.B[1]) / 2], d = dist(mid, [o.cx, o.cy]) / unitOf();
        lines.push(`العمود من المركز م ن ينصّف الوتر: أن = ن ب = ${F(c / 2)} سم ✓`);
        lines.push(`نق² = ف² + (½ أب)² ⇐ ${F(r)}² = ${F(d)}² + ${F(c / 2)}² ✓`);
        lines.push(`طول الوتر = ${F(c)} سم ، بُعده عن المركز ف = ${F(d)} سم`);
        break;
      }
      case 'chords': {
        const X = segX(P.A, P.B, P.C, P.D);
        if (!X) { lines.push('الوتران أب و جد لا يتقاطعان داخل الدائرة — حرّك النقاط'); break; }
        const u = unitOf(), p1 = (dist(P.A, X) / u) * (dist(X, P.B) / u), p2 = (dist(P.C, X) / u) * (dist(X, P.D) / u);
        lines.push(`أهـ × هـب = ${F(dist(P.A, X) / u)} × ${F(dist(X, P.B) / u)} = ${F(p1)}`);
        lines.push(`جهـ × هـد = ${F(dist(P.C, X) / u)} × ${F(dist(X, P.D) / u)} = ${F(p2)} ✓`);
        lines.push('حاصلا ضرب جزأي الوترين المتقاطعين متساويان');
        break;
      }
      case 'tanChord': {
        const tDir = [Math.sin(o.a.A), Math.cos(o.a.A)]; // اتجاه المماس عند أ (بإحداثيات الشاشة)
        const q = [P.A[0] + tDir[0] * 100, P.A[1] + tDir[1] * 100], q2 = [P.A[0] - tDir[0] * 100, P.A[1] - tDir[1] * 100];
        const pSide = onArc(o.a.P, o.a.A, o.a.B);
        // الزاوية بين المماس والوتر في الجهة المقابلة للنقطة ج
        const t1 = ang(P.A, q, P.B), t2 = ang(P.A, q2, P.B);
        const tc = Math.abs(t1 - ang(P.P, P.A, P.B)) < Math.abs(t2 - ang(P.P, P.A, P.B)) ? t1 : t2;
        lines.push(`الزاوية بين المماس والوتر أب = ${F(tc, 1)}°`);
        lines.push(`الزاوية المحيطية أجب = ${F(ang(P.P, P.A, P.B), 1)}° ✓`);
        lines.push('زاوية المماس والوتر = المحيطية في القطعة المتبادلة');
        void pSide;
        break;
      }
      case 'tangentAt': {
        const x0 = r * Math.cos(o.a.A), y0 = r * Math.sin(o.a.A), X = M.varName('x'), Y = M.varName('y');
        lines.push(`معادلة الدائرة: ${X}² + ${Y}² = ${F(r * r)} ، ونقطة التماس أ(${F(x0)}، ${F(y0)})`);
        if (Math.abs(x0) < 1e-6) lines.push(`نصف القطر م أ رأسي ⇐ المماس أفقي: ${Y} = ${F(y0)}`);
        else if (Math.abs(y0) < 1e-6) lines.push(`نصف القطر م أ أفقي ⇐ المماس رأسي: ${X} = ${F(x0)}`);
        else {
          const m1 = y0 / x0, m2 = -x0 / y0;
          lines.push(`ميل نصف القطر م أ = ${F(y0)} ÷ ${F(x0)} = ${F(m1)}`);
          lines.push(`ميل المماس = −١ ÷ ميل نصف القطر = ${F(m2)} ⇐ ${F(m1)} × ${F(m2)} = −١ ✓ (متعامدان)`);
          lines.push(`معادلة المماس: ${Y} − ${F(y0)} = ${F(m2)}(${X} − ${F(x0)}) ⇐ ${eqLine(-m2, 1, m2 * x0 - y0)}`);
        }
        lines.push(`صيغة عامة: ${F(x0)}${X} + ${F(y0)}${Y} = نق² = ${F(r * r)}`);
        break;
      }
      case 'lineCircle': {
        const c = lineCircleCalc(o);
        lines.push(`الدائرة: ${M.varName('x')}² + ${M.varName('y')}² = ${F(c.r * c.r)} ، والمستقيم: ${eqLine(c.A, c.B, c.C)}`);
        lines.push(`بعد المركز عن المستقيم ف = |ج| ÷ √(أ² + ب²) = ${F(c.d)} سم ، نق = ${F(c.r)} سم`);
        if (c.kind === 'secant') { lines.push(`ف < نق ⇐ المستقيم قاطع: يقطع الدائرة في نقطتين (${F(c.pts[0][0])}، ${F(c.pts[0][1])}) و(${F(c.pts[1][0])}، ${F(c.pts[1][1])})`); lines.push(`طول الوتر = ٢√(نق² − ف²) = ${F(2 * Math.sqrt(c.r * c.r - c.d * c.d))} سم`); }
        else if (c.kind === 'tangent') lines.push(`ف = نق ⇐ المستقيم مماس في (${F(c.pts[0][0])}، ${F(c.pts[0][1])})`);
        else lines.push('ف > نق ⇐ المستقيم لا يقطع الدائرة (خارجها)');
        break;
      }
      case 'pi': {
        lines.push(`القطر = ${F(2 * r)} سم ، المحيط = ط × القطر = ${F(TAU * r)} سم`);
        lines.push('في دورة كاملة تقطع الدائرة مسافة تساوي محيطها');
        lines.push('= ٣ أقطار وجزءاً صغيراً ⇐ ط ≈ ٣٫١٤');
        break;
      }
      case 'slices': {
        const n = o.n || 12;
        lines.push(`قُطّعت الدائرة إلى ${L(n)} قطاعاً ورُتّبت متعاكسة`);
        lines.push(`القاعدة ≈ نصف المحيط = ط نق ، الارتفاع ≈ نق`);
        lines.push(`المساحة ≈ ط نق × نق = ط نق² = ${withPi(o, r * r, 'سم²')}`);
        break;
      }
    }
    return { title, lines };
  }

  /* ---------------- الرسم ---------------- */
  function colors(light) {
    return light
      ? { fill: '#f59f00', fill2: '#4c6ef5', c1: '#1c7ed6', c2: '#d6336c', c3: '#2f9e44', c4: '#e8590c', txt: '#1b2733', card: 'rgba(255,255,255,.93)', cardLine: 'rgba(30,60,110,.25)' }
      : { fill: '#ffc857', fill2: '#74c0fc', c1: '#74c0fc', c2: '#ff8fab', c3: '#8ce99a', c4: '#ffa94d', txt: '#f1f5f2', card: 'rgba(10,20,26,.82)', cardLine: 'rgba(255,255,255,.18)' };
  }
  function draw(ctx, o, board, s) {
    const K = colors(board.isLight), col = board.colorOf(o.color), lw = o.width || 3, fs = 17;
    const font = (sz, b) => `${b ? 'bold ' : ''}${sz}px ${M.fontFamily()}`;
    const P = points(o), O = [o.cx, o.cy];
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const line = (a, b, c, w, dash) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w || lw; if (dash) ctx.setLineDash([8, 6]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.restore(); };
    const text = (t, x, y, c, sz, bold) => { ctx.save(); ctx.font = font(sz || fs, bold); ctx.fillStyle = c || K.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L(t), x, y); ctx.restore(); };
    const lbl = (t, x, y, c, sz) => { // نص بخلفية صغيرة ليقرأ فوق الرسم
      ctx.save(); ctx.font = font(sz || 15, true); const w = ctx.measureText(L(t)).width + 10, hh = (sz || 15) * 1.35;
      ctx.fillStyle = K.card; M.roundRect(ctx, x - w / 2, y - hh / 2, w, hh, 6); ctx.fill();
      ctx.fillStyle = c || K.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L(t), x, y + 1); ctx.restore();
    };
    /** قوس زاوية عند V بين الاتجاهين إلى A و B (الأصغر، أو المنعكسة إن طُلب) مع قيمتها */
    const angleMark = (V, A, B, c, label, rad, reflex) => {
      const a1 = Math.atan2(A[1] - V[1], A[0] - V[0]), a2 = Math.atan2(B[1] - V[1], B[0] - V[0]);
      let d = a2 - a1; while (d <= -Math.PI) d += TAU; while (d > Math.PI) d -= TAU;
      let st = a1, sw = d;
      if (reflex) sw = d > 0 ? d - TAU : d + TAU;
      rad = rad || Math.min(34, o.r * 0.3);
      const right = !reflex && Math.abs(Math.abs(d) - Math.PI / 2) < 0.012;
      ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 2.2;
      if (right) {
        const q = rad * 0.55, u1 = [Math.cos(a1), Math.sin(a1)], u2 = [Math.cos(a2), Math.sin(a2)];
        ctx.beginPath(); ctx.moveTo(V[0] + u1[0] * q, V[1] + u1[1] * q); ctx.lineTo(V[0] + (u1[0] + u2[0]) * q, V[1] + (u1[1] + u2[1]) * q); ctx.lineTo(V[0] + u2[0] * q, V[1] + u2[1] * q); ctx.stroke();
      } else {
        ctx.globalAlpha = 0.22; ctx.beginPath(); ctx.moveTo(V[0], V[1]); ctx.arc(V[0], V[1], rad, st, st + sw, sw < 0); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(V[0], V[1], rad, st, st + sw, sw < 0); ctx.stroke();
      }
      ctx.restore();
      if (label != null) { const m = st + sw / 2, rr = rad + 20; lbl(label, V[0] + Math.cos(m) * rr, V[1] + Math.sin(m) * rr, c, 14); }
    };
    const deg = (x) => `${F(Math.round(x * 10) / 10, 1)}°`;
    const sectorPath = (a0, a1) => { ctx.beginPath(); ctx.moveTo(o.cx, o.cy); ctx.arc(o.cx, o.cy, o.r, -a0, -a1, true); ctx.closePath(); };

    const anim = o.anim && o.anim.t != null ? o.anim : null;
    if (o.scene === 'pi') drawPi(); else if (o.scene === 'slices') drawSlices(); else drawStatic();

    function drawCircle() {
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(o.cx, o.cy, o.r, 0, TAU); ctx.stroke(); ctx.restore();
    }
    function drawStatic() {
      switch (o.scene) {
        case 'basic': {
          ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = K.fill; ctx.beginPath(); ctx.arc(o.cx, o.cy, o.r, 0, TAU); ctx.fill(); ctx.restore();
          drawCircle();
          const R = pt(o, o.a.R), R2 = pt(o, o.a.R + Math.PI);
          line(R2, O, K.c1, 2, true); line(O, R, K.c4, lw);
          lbl('نق', (o.cx + R[0]) / 2 + Math.sin(o.a.R) * 16, (o.cy + R[1]) / 2 + Math.cos(o.a.R) * 16, K.c4);
          lbl('ق', (o.cx + R2[0]) / 2 + Math.sin(o.a.R) * 16, (o.cy + R2[1]) / 2 + Math.cos(o.a.R) * 16, K.c1);
          dot(R, K.c4, 'R');
          break;
        }
        case 'sector': {
          const th = norm(o.a.B - o.a.A) || TAU;
          ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = K.fill; sectorPath(o.a.A, o.a.A + th); ctx.fill(); ctx.restore();
          drawCircle();
          ctx.save(); ctx.strokeStyle = K.fill; ctx.lineWidth = lw + 3; ctx.beginPath(); ctx.arc(o.cx, o.cy, o.r, -o.a.A, -(o.a.A + th), true); ctx.stroke(); ctx.restore();
          line(O, P.A, col); line(O, P.B, col);
          angleMark(O, P.A, P.B, K.c1, `θ = ${deg(th * DEG)}`, null, th > Math.PI);
          const m = o.a.A + th / 2, ap = [o.cx + (o.r + 26) * Math.cos(m), o.cy - (o.r + 26) * Math.sin(m)];
          lbl('ل (القوس)', ap[0], ap[1], K.fill);
          break;
        }
        case 'segment': {
          const th = norm(o.a.B - o.a.A) || TAU;
          ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = K.fill; ctx.beginPath(); ctx.arc(o.cx, o.cy, o.r, -o.a.A, -(o.a.A + th), true); ctx.closePath(); ctx.fill(); ctx.restore();
          ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = K.fill2; ctx.beginPath(); ctx.moveTo(o.cx, o.cy); ctx.lineTo(P.A[0], P.A[1]); ctx.lineTo(P.B[0], P.B[1]); ctx.closePath(); ctx.fill(); ctx.restore();
          drawCircle();
          line(P.A, P.B, K.c4, lw); line(O, P.A, col, 2, true); line(O, P.B, col, 2, true);
          angleMark(O, P.A, P.B, K.c1, `θ = ${deg(th * DEG)}`, null, th > Math.PI);
          break;
        }
        case 'inscribed': {
          drawCircle();
          const reflex = !onArc(o.a.P, o.a.A, o.a.B) ? norm(o.a.B - o.a.A) > Math.PI : norm(o.a.A - o.a.B) > Math.PI;
          line(O, P.A, K.c1, 2.5); line(O, P.B, K.c1, 2.5); line(P.P, P.A, K.c2, 2.5); line(P.P, P.B, K.c2, 2.5);
          const cen = onArc(o.a.P, o.a.A, o.a.B) ? norm(o.a.A - o.a.B) : norm(o.a.B - o.a.A);
          angleMark(O, P.A, P.B, K.c1, deg(cen * DEG), null, reflex);
          angleMark(P.P, P.A, P.B, K.c2, deg(angleAt(P.P, P.A, P.B)));
          break;
        }
        case 'semicircle': {
          ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = K.fill; ctx.beginPath(); ctx.moveTo(P.A[0], P.A[1]); ctx.lineTo(P.P[0], P.P[1]); ctx.lineTo(P.B[0], P.B[1]); ctx.closePath(); ctx.fill(); ctx.restore();
          drawCircle();
          line(P.A, P.B, K.c1, lw); line(P.P, P.A, K.c2, 2.5); line(P.P, P.B, K.c2, 2.5);
          angleMark(P.P, P.A, P.B, K.c3, deg(angleAt(P.P, P.A, P.B)));
          break;
        }
        case 'sameArc': {
          drawCircle();
          ctx.save(); ctx.strokeStyle = K.fill; ctx.lineWidth = lw + 3; const inside = onArc(o.a.P, o.a.A, o.a.B); ctx.beginPath(); if (inside) ctx.arc(o.cx, o.cy, o.r, -o.a.B, -(o.a.B + norm(o.a.A - o.a.B)), true); else ctx.arc(o.cx, o.cy, o.r, -o.a.A, -(o.a.A + norm(o.a.B - o.a.A)), true); ctx.stroke(); ctx.restore();
          line(P.P, P.A, K.c2, 2.5); line(P.P, P.B, K.c2, 2.5); line(P.Q, P.A, K.c1, 2.5); line(P.Q, P.B, K.c1, 2.5);
          angleMark(P.P, P.A, P.B, K.c2, deg(angleAt(P.P, P.A, P.B)));
          angleMark(P.Q, P.A, P.B, K.c1, deg(angleAt(P.Q, P.A, P.B)));
          break;
        }
        case 'cyclic': {
          const ord = ['A', 'B', 'C', 'D'].slice().sort((x, y) => norm(o.a[x]) - norm(o.a[y]));
          const Q = ord.map((k) => P[k]);
          ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = K.fill2; ctx.beginPath(); Q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); ctx.restore();
          drawCircle();
          ctx.save(); ctx.strokeStyle = K.c1; ctx.lineWidth = 2.5; ctx.beginPath(); Q.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke(); ctx.restore();
          Q.forEach((p, i) => angleMark(p, Q[(i + 3) % 4], Q[(i + 1) % 4], i % 2 ? K.c2 : K.c3, deg(angleAt(p, Q[(i + 3) % 4], Q[(i + 1) % 4])), 26));
          break;
        }
        case 'tangent': {
          drawCircle();
          const t = tangents(o), E = extPt(o);
          if (t) {
            const T1 = pt(o, t.a1), T2 = pt(o, t.a2);
            line(E, T1, K.c2, 2.5); line(E, T2, K.c2, 2.5); line(O, T1, K.c1, 2); line(O, T2, K.c1, 2); line(O, E, col, 1.5, true);
            angleMark(T1, O, E, K.c3, null, 16); angleMark(T2, O, E, K.c3, null, 16);
            angleMark(E, T1, T2, K.c4, deg(t.between), 30);
            lbl('أ', T1[0] + (T1[0] - o.cx) * 0.14, T1[1] + (T1[1] - o.cy) * 0.14, K.txt); lbl('ب', T2[0] + (T2[0] - o.cx) * 0.14, T2[1] + (T2[1] - o.cy) * 0.14, K.txt);
            const len = F(t.len / unitOf());
            lbl(len, (E[0] + T1[0]) / 2, (E[1] + T1[1]) / 2 - 14, K.c2, 13); lbl(len, (E[0] + T2[0]) / 2, (E[1] + T2[1]) / 2 + 14, K.c2, 13);
          }
          dot(E, K.c4, 'E', 'ل');
          break;
        }
        case 'chord': {
          drawCircle();
          const mid = [(P.A[0] + P.B[0]) / 2, (P.A[1] + P.B[1]) / 2];
          line(P.A, P.B, K.c4, lw); line(O, mid, K.c1, 2.5); line(O, P.A, col, 1.5, true);
          angleMark(mid, O, P.A, K.c3, null, 14);
          // علامتا التساوي على نصفي الوتر
          [[P.A, mid], [mid, P.B]].forEach(([p, q]) => { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], d = [q[0] - p[0], q[1] - p[1]], l = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / l * 7, d[0] / l * 7]; line([m[0] - n[0], m[1] - n[1]], [m[0] + n[0], m[1] + n[1]], K.c4, 2.5); });
          lbl('ن', mid[0] + (mid[0] - o.cx) * 0.001 + 14, mid[1] + 14, K.txt, 14);
          break;
        }
        case 'chords': {
          drawCircle();
          line(P.A, P.B, K.c2, 2.8); line(P.C, P.D, K.c1, 2.8);
          const X = segX(P.A, P.B, P.C, P.D);
          if (X) { ctx.save(); ctx.fillStyle = K.c4; ctx.beginPath(); ctx.arc(X[0], X[1], 5, 0, TAU); ctx.fill(); ctx.restore(); lbl('هـ', X[0] + 16, X[1] - 16, K.c4, 14); }
          break;
        }
        case 'tangentAt': {
          // محورا إحداثيات خفيفان عبر المركز
          line([o.cx - o.r * 1.35, o.cy], [o.cx + o.r * 1.35, o.cy], K.cardLine, 1.2, true); line([o.cx, o.cy - o.r * 1.35], [o.cx, o.cy + o.r * 1.35], K.cardLine, 1.2, true);
          drawCircle();
          const td = [Math.sin(o.a.A), Math.cos(o.a.A)], ext = o.r * 1.25;
          const q1 = [P.A[0] + td[0] * ext, P.A[1] + td[1] * ext], q2 = [P.A[0] - td[0] * ext, P.A[1] - td[1] * ext];
          line(q1, q2, K.c2, 3); line(O, P.A, K.c1, 2.8);
          angleMark(P.A, O, q1, K.c3, null, 16);
          const rr = o.r / unitOf();
          lbl(`(${F(rr * Math.cos(o.a.A))}، ${F(rr * Math.sin(o.a.A))})`, P.A[0] + (P.A[0] - o.cx) / o.r * 46, P.A[1] + (P.A[1] - o.cy) / o.r * 46 + 20, K.c4, 13);
          lbl('المماس', q1[0], q1[1] - 14, K.c2, 13);
          break;
        }
        case 'lineCircle': {
          drawCircle();
          const c = lineCircleCalc(o), u = unitOf(), W = (p) => [o.cx + p[0] * u, o.cy - p[1] * u];
          const Pw = qW(o, 'P'), Qw = qW(o, 'Q'), dv = [Qw[0] - Pw[0], Qw[1] - Pw[1]], dl = Math.hypot(dv[0], dv[1]) || 1, ex = o.r * 0.35;
          line([Pw[0] - (dv[0] / dl) * ex, Pw[1] - (dv[1] / dl) * ex], [Qw[0] + (dv[0] / dl) * ex, Qw[1] + (dv[1] / dl) * ex], c.kind === 'secant' ? K.c2 : c.kind === 'tangent' ? K.c3 : K.c1, 3);
          const Fw = W(c.foot);
          line(O, Fw, K.c4, 2, true); lbl(`ف = ${F(c.d)}`, (o.cx + Fw[0]) / 2 + 18, (o.cy + Fw[1]) / 2, K.c4, 13);
          if (c.d > 1e-6) angleMark(Fw, O, Pw, K.c4, null, 12);
          c.pts.forEach((p) => { const w = W(p); ctx.save(); ctx.fillStyle = '#ff4d4f'; ctx.beginPath(); ctx.arc(w[0], w[1], 6, 0, TAU); ctx.fill(); ctx.restore(); lbl(`(${F(p[0])}، ${F(p[1])})`, w[0], w[1] - 20, '#ff4d4f', 12); });
          lbl(c.kind === 'secant' ? 'قاطع' : c.kind === 'tangent' ? 'مماس' : 'لا يقطع', Qw[0] + (dv[0] / dl) * (ex + 10), Qw[1] + (dv[1] / dl) * (ex + 10) - 16, K.txt, 13);
          dot(Pw, K.c1, 'P', 'ل'); dot(Qw, K.c1, 'Q', 'ك');
          break;
        }
        case 'tanChord': {
          drawCircle();
          const td = [Math.sin(o.a.A), Math.cos(o.a.A)], ext = o.r * 1.3;
          const q1 = [P.A[0] + td[0] * ext, P.A[1] + td[1] * ext], q2 = [P.A[0] - td[0] * ext, P.A[1] - td[1] * ext];
          line(q1, q2, K.c1, 2.5); line(P.A, P.B, K.c4, 2.5); line(P.P, P.A, K.c2, 2.2); line(P.P, P.B, K.c2, 2.2);
          const ip = angleAt(P.P, P.A, P.B), t1 = angleAt(P.A, q1, P.B);
          const tq = Math.abs(t1 - ip) < Math.abs(180 - t1 - ip) ? q1 : q2;
          angleMark(P.A, tq, P.B, K.c1, deg(angleAt(P.A, tq, P.B)), 30);
          angleMark(P.P, P.A, P.B, K.c2, deg(ip));
          break;
        }
      }
      // المركز والنقاط
      dot(O, col, 'O', 'م', true);
      Object.keys(P).forEach((k) => { if (o.scene === 'semicircle' && k === 'B') { lblAt(P.B, 'ب'); return; } dot(P[k], K.c4, k, LBL[k]); });
      if (o.opts && o.opts.card !== false) drawCard();
    }
    function lblAt(p, t) { const d = [p[0] - o.cx, p[1] - o.cy], l = Math.hypot(d[0], d[1]) || 1; lbl(t, p[0] + (d[0] / l) * 22, p[1] + (d[1] / l) * 22, K.txt, 15); ctx.save(); ctx.fillStyle = K.txt; ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, TAU); ctx.fill(); ctx.restore(); }
    function dot(p, c, key, label, center) {
      const hr = (board.handleR ? board.handleR() : 9) / s;
      ctx.save();
      ctx.fillStyle = c; ctx.strokeStyle = board.isLight ? '#fff' : '#0b1418'; ctx.lineWidth = 2 / s;
      ctx.globalAlpha = center ? 0.9 : 1;
      ctx.beginPath(); ctx.arc(p[0], p[1], center ? hr * 0.75 : hr, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
      if (label) {
        const d = [p[0] - o.cx, p[1] - o.cy], l = Math.hypot(d[0], d[1]);
        const q = center || l < 1 ? [p[0] + 16, p[1] + 18] : [p[0] + (d[0] / l) * (hr + 16), p[1] + (d[1] / l) * (hr + 16)];
        text(label, q[0], q[1], K.txt, 17, true);
      }
      void key;
    }
    function drawCard() {
      const E = o.scene === 'tangent' ? extPt(o) : null;
      const qx = o.scene === 'lineCircle' && o.q ? Math.max(qW(o, 'P')[0], qW(o, 'Q')[0]) + 50 : -Infinity;
      drawCardAt(Math.max(o.cx + o.r + 40, E ? E[0] + 40 : -Infinity, qx), o.cy - o.r);
    }
    function drawPi() {
      const t = anim ? anim.t : 0, C = TAU * o.r, y = o.cy + o.r;
      const x = o.cx + C * t, rot = TAU * t; // تدحرج نحو اليمين (مع عقارب الساعة)
      // خط الأرض والعلامات
      line([o.cx - o.r * 0.3, y], [o.cx + C + o.r * 0.5, y], board.isLight ? '#495057' : '#adb5bd', 2);
      for (let i = 1; i <= 3; i++) { const xi = o.cx + 2 * o.r * i; line([xi, y - 8], [xi, y + 8], K.c1, 2); text(`${L(i)}ق`, xi, y + 22, K.c1, 15, true); }
      // الجزء المفرود من المحيط على الأرض
      ctx.save(); ctx.strokeStyle = K.fill; ctx.lineWidth = lw + 3; ctx.beginPath(); ctx.moveTo(o.cx, y); ctx.lineTo(x, y); ctx.stroke(); ctx.restore();
      // الدائرة المتدحرجة والجزء الذي لم يلمس الأرض بعد
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(x, o.cy, o.r, 0, TAU); ctx.stroke();
      if (t < 0.999) { ctx.strokeStyle = K.fill; ctx.lineWidth = lw + 3; ctx.beginPath(); ctx.arc(x, o.cy, o.r, Math.PI / 2 + rot, Math.PI / 2 + TAU, false); ctx.stroke(); }
      ctx.restore();
      // قطر يدور مع الدائرة، ونقطة البداية
      const dx = Math.cos(Math.PI / 2 + rot) * o.r, dy = Math.sin(Math.PI / 2 + rot) * o.r;
      line([x - dx, o.cy - dy], [x + dx, o.cy + dy], K.c1, 2.5);
      ctx.save(); ctx.fillStyle = K.c2; ctx.beginPath(); ctx.arc(x + dx, o.cy + dy, 7, 0, TAU); ctx.fill(); ctx.restore();
      if (t >= 0.999) { line([o.cx + C, y - 14], [o.cx + C, y + 14], K.c2, 3); lbl('≈ ٣٫١٤ق = ط ق', o.cx + C, y + 46, K.c2, 16); }
      dot([o.cx, o.cy], col, 'O', null, true);
      if (o.opts && o.opts.card !== false && t >= 0.999) drawCardAt(o.cx - o.r, o.cy - o.r - 60 - 34 - 3 * 25);
      else if (t < 0.001) lbl('اضغط «حرّك» لتتدحرج الدائرة دورة كاملة', x, o.cy - o.r - 26, K.txt, 15);
    }
    /** بطاقة القوانين والتعويض (أكبر في وضع السبورة التفاعلية) */
    function drawCardAt(x0, y0) {
      const inf = info(o), k = M.settings.boardMode ? 1.3 : 1, lh = 25 * k;
      ctx.save(); ctx.font = font(15 * k);
      ctx.font = font(16 * k, true); const tw = ctx.measureText(L('⭕ ' + inf.title)).width; ctx.font = font(15 * k);
      const w = Math.max(tw, ...inf.lines.map((t) => ctx.measureText(L(t)).width)) + 28 * k, hh = 34 * k + inf.lines.length * lh;
      ctx.fillStyle = K.card; ctx.strokeStyle = K.cardLine; ctx.lineWidth = 1.2; M.roundRect(ctx, x0, y0, w, hh, 12); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.font = font(16 * k, true); ctx.fillStyle = K.fill; ctx.fillText(L('⭕ ' + inf.title), x0 + w - 14 * k, y0 + 18 * k);
      ctx.font = font(15 * k); ctx.fillStyle = K.txt;
      inf.lines.forEach((t, i) => ctx.fillText(L(t), x0 + w - 14 * k, y0 + 44 * k + i * lh));
      ctx.restore();
    }
    function drawSlices() {
      const n = Math.max(4, Math.min(64, o.n || 12)), t = anim ? anim.t : 0, w = TAU / n;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const c = 2 * o.r * Math.sin(w / 2), h2 = o.r * Math.cos(w / 2);
      const W = (n / 2) * c + c / 2, X0 = o.cx - o.r, T = o.cy - h2 / 2;
      for (let i = 0; i < n; i++) {
        const a0 = i * w, mid = a0 + w / 2;
        const even = i % 2 === 0, k = Math.floor(i / 2);
        const tgt = even ? -Math.PI / 2 : Math.PI / 2;
        let dlt = tgt - mid; while (dlt <= -Math.PI) dlt += TAU; while (dlt > Math.PI) dlt -= TAU;
        const apexT = even ? [X0 + c / 2 + k * c, T] : [X0 + c + k * c, T + h2];
        const ax = o.cx + (apexT[0] - o.cx) * ease, ay = o.cy + (apexT[1] - o.cy) * ease, rr = dlt * ease;
        const gap = (1 - ease) * o.r * 0.03;
        const gx = Math.cos(mid) * gap, gy = -Math.sin(mid) * gap;
        ctx.save(); ctx.beginPath(); ctx.moveTo(ax + gx, ay + gy);
        ctx.arc(ax + gx, ay + gy, o.r, -(a0 + rr), -(a0 + w + rr), true); ctx.closePath();
        ctx.globalAlpha = 0.55; ctx.fillStyle = even ? K.fill : K.fill2; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
      }
      if (ease > 0.98) {
        const yb = T + h2 + 26;
        line([X0 + c / 2, yb], [X0 + c / 2 + (n / 2) * c, yb], K.c4, 2);
        lbl('≈ ط نق (نصف المحيط)', X0 + c / 2 + (n / 4) * c, yb + 20, K.c4, 15);
        line([X0 - 16, T], [X0 - 16, T + h2], K.c3, 2); lbl('نق', X0 - 34, T + h2 / 2, K.c3, 15);
        if (o.opts && o.opts.card !== false) drawCardAt(X0 + W + 50, T - 10);
      } else if (t < 0.001) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(o.cx, o.cy, o.r, 0, TAU); ctx.stroke(); ctx.restore();
        lbl(`اضغط «حرّك» لتقطيع الدائرة إلى ${L(n)} قطاعاً وترتيبها`, o.cx, o.cy - o.r - 26, K.txt, 15);
      }
      dot([o.cx, o.cy], col, 'O', null, true);
    }
    ctx.restore();
  }

  /* ---------------- السحب ---------------- */
  function handles(o) {
    const out = [{ k: 'O', p: [o.cx, o.cy] }];
    if (o.scene === 'pi' || o.scene === 'slices') return out;
    if (o.scene === 'basic') out.push({ k: 'R', p: pt(o, o.a.R) });
    if (o.scene === 'tangent') out.push({ k: 'E', p: extPt(o) });
    if (o.scene === 'lineCircle' && o.q) out.push({ k: 'P', p: qW(o, 'P') }, { k: 'Q', p: qW(o, 'Q') });
    const P = points(o);
    Object.keys(P).forEach((k) => { if (!(o.scene === 'semicircle' && k === 'B')) out.push({ k, p: P[k] }); });
    return out;
  }
  function handleAt(o, x, y, tol) {
    let best = null, bd = tol;
    handles(o).forEach((h) => { const d = Math.hypot(h.p[0] - x, h.p[1] - y); if (d <= bd) { bd = d; best = h.k; } });
    return best;
  }
  /** تحريك نقطة: الزوايا تلتصق بالدرجات الصحيحة ومضاعفات ١٥°، ونصف القطر بأنصاف السنتيمترات */
  function drag(o, k, x, y, dx, dy) {
    const u = unitOf();
    if (k === 'O') { o.cx += dx; o.cy += dy; return; }
    if (k === 'R') {
      const d = Math.hypot(x - o.cx, y - o.cy);
      o.r = Math.max(u / 2, Math.round(d / (u / 2)) * (u / 2));
      o.a.R = snapAng(angOf(o, x, y));
      return;
    }
    if (k === 'E') {
      const d = Math.hypot(x - o.cx, y - o.cy);
      o.e = { k: Math.max(1.08, d / o.r), a: angOf(o, x, y) };
      return;
    }
    if (o.scene === 'lineCircle' && o.q && o.q[k]) { o.q[k] = [Math.round(((x - o.cx) / u) * 10) / 10, Math.round((-(y - o.cy) / u) * 10) / 10]; return; }
    if (o.a[k] != null) o.a[k] = snapAng(angOf(o, x, y));
  }
  function snapAng(a) {
    let d = a * DEG;
    const r15 = Math.round(d / 15) * 15;
    d = Math.abs(d - r15) < 2.5 ? r15 : Math.round(d);
    return d / DEG;
  }
  function bbox(o) {
    const pad = 36;
    if (o.scene === 'pi') return [o.cx - o.r - pad, o.cy - o.r - 200, o.cx + TAU * o.r + o.r + pad, o.cy + o.r + 70];
    if (o.scene === 'slices') return [o.cx - o.r - pad, o.cy - o.r - pad, o.cx - o.r + Math.PI * o.r * 1.1 + 420, o.cy + o.r + pad];
    const b = [o.cx - o.r - pad, o.cy - o.r - pad, o.cx + o.r + pad, o.cy + o.r + pad];
    if (o.scene === 'tangent') { const E = extPt(o); b[0] = Math.min(b[0], E[0] - pad); b[1] = Math.min(b[1], E[1] - pad); b[2] = Math.max(b[2], E[0] + pad); b[3] = Math.max(b[3], E[1] + pad); }
    if (o.scene === 'lineCircle' && o.q) ['P', 'Q'].forEach((k) => { const E = qW(o, k); b[0] = Math.min(b[0], E[0] - pad); b[1] = Math.min(b[1], E[1] - pad); b[2] = Math.max(b[2], E[0] + pad); b[3] = Math.max(b[3], E[1] + pad); });
    return b;
  }
  function hit(o, x, y, tol) {
    const d = Math.hypot(x - o.cx, y - o.cy);
    if (Math.abs(d - o.r) < tol + 4 || d < o.r * 0.25) return true;
    return !!handleAt(o, x, y, tol + 6);
  }

  /* ---------------- الحركة ---------------- */
  function animate(o, dur, onDone) {
    const b = M.board;
    o.anim = { t: 0 };
    const t0 = performance.now();
    dur = dur || 2600;
    const step = (now) => {
      if (!o.anim) return;
      o.anim.t = Math.min(1, (now - t0) / dur);
      b.requestRender();
      if (o.anim.t < 1) requestAnimationFrame(step);
      else { b.changed(); if (onDone) onDone(); }
    };
    requestAnimationFrame(step);
  }
  /** تحريك زاوية القطاع من ٠ إلى قيمتها (مشهد القطاع والقطعة) */
  function sweep(o, dur) {
    const b = M.board, A = o.a.A, th = norm(o.a.B - o.a.A) || TAU, t0 = performance.now();
    dur = dur || 1800;
    const step = (now) => { const t = Math.min(1, (now - t0) / dur); o.a.B = snapAng(A + th * t) ; b.requestRender(); if (t < 1) requestAnimationFrame(step); else { o.a.B = A + th; b.changed(); } };
    requestAnimationFrame(step);
  }

  /* ---------------- أسئلة من الشكل المرسوم ---------------- */
  function quiz(o) {
    const r = rU(o), P = points(o), pv = piVal(o), pt2 = piTxt(o);
    const r2 = (x) => Math.round(x * 100) / 100;
    switch (o.scene) {
      case 'basic': {
        const ask = Math.random() < 0.5;
        return ask ? { q: `دائرة نصف قطرها ${F(r)} سم. أوجد مساحتها (ط ≈ ${pt2 === 'ط' ? '٣٫١٤' : pt2}).`, a: r2((pt2 === 'ط' ? 3.14 : pv) * r * r), steps: [`المساحة = ط نق² = ${pt2 === 'ط' ? '٣٫١٤' : pt2} × ${F(r)}²`] } : { q: `دائرة قطرها ${F(2 * r)} سم. أوجد محيطها (ط ≈ ${pt2 === 'ط' ? '٣٫١٤' : pt2}).`, a: r2((pt2 === 'ط' ? 3.14 : pv) * 2 * r), steps: ['المحيط = ط × القطر'] };
      }
      case 'sector': case 'segment': {
        const th = thetaDeg(o), p = pt2 === 'ط' ? 3.14 : pv, pp = pt2 === 'ط' ? '٣٫١٤' : pt2;
        if (o.scene === 'segment') { const s = segment(r, (th * Math.PI) / 180); return { q: `في دائرة نصف قطرها ${F(r)} سم، وتر يقابل زاوية مركزية ${F(th, 1)}°. أوجد مساحة القطعة الدائرية الصغرى (ط ≈ ${pp}).`, a: r2((th / 360) * p * r * r - s.tri), steps: ['مساحة القطعة = مساحة القطاع − مساحة المثلث', `= (${F(th, 1)}÷٣٦٠) × ${pp} × ${F(r)}² − ½ × ${F(r)}² × جا ${F(th, 1)}°`] }; }
        return Math.random() < 0.5
          ? { q: `قطاع دائري زاويته المركزية ${F(th, 1)}° ونصف قطر دائرته ${F(r)} سم. أوجد طول قوسه (ط ≈ ${pp}).`, a: r2((th / 360) * 2 * p * r), steps: [`ل = (θ÷٣٦٠) × ٢ط نق = (${F(th, 1)}÷٣٦٠) × ٢ × ${pp} × ${F(r)}`] }
          : { q: `قطاع دائري زاويته المركزية ${F(th, 1)}° ونصف قطر دائرته ${F(r)} سم. أوجد مساحته (ط ≈ ${pp}).`, a: r2((th / 360) * p * r * r), steps: [`م = (θ÷٣٦٠) × ط نق² = (${F(th, 1)}÷٣٦٠) × ${pp} × ${F(r)}²`] };
      }
      case 'inscribed': { const ip = Math.round(angleAt(P.P, P.A, P.B)); return { q: `زاوية محيطية قياسها ${L(ip)}°. ما قياس الزاوية المركزية المشتركة معها في القوس؟`, a: 2 * ip, steps: ['المركزية = ٢ × المحيطية'] }; }
      case 'semicircle': return { q: 'أب قطر في الدائرة و ج نقطة عليها. ما قياس الزاوية أجب؟', a: 90, steps: ['الزاوية المحيطية المرسومة في نصف دائرة قائمة'] };
      case 'sameArc': { const p = Math.round(angleAt(P.P, P.A, P.B)); return { q: `ج و د على الدائرة في جهة واحدة من الوتر أب، و∠أجب = ${L(p)}°. ما ∠أدب؟`, a: p, steps: ['الزوايا المحيطية المرسومة على القوس نفسه متساوية'] }; }
      case 'cyclic': { const ord = ['A', 'B', 'C', 'D'].slice().sort((x, y) => norm(o.a[x]) - norm(o.a[y])), Q = ord.map((k) => P[k]); const a0 = Math.round(angleAt(Q[0], Q[3], Q[1])); return { q: `شكل رباعي دائري قياس إحدى زواياه ${L(a0)}°. ما قياس الزاوية المقابلة لها؟`, a: 180 - a0, steps: ['الزاويتان المتقابلتان متكاملتان: ١٨٠ − ' + L(a0)] }; }
      case 'tangent': { const t = tangents(o); if (!t) return null; const d = r2(t.d / unitOf()); return { q: `نقطة ل تبعد ${F(d)} سم عن مركز دائرة نصف قطرها ${F(r)} سم. أوجد طول المماس المرسوم من ل.`, a: r2(Math.sqrt(d * d - r * r)), steps: ['المماس ⟂ نصف القطر ⇐ فيثاغورس', `√(${F(d)}² − ${F(r)}²)`] }; }
      case 'chord': { const c = r2(dist(P.A, P.B) / unitOf()); return { q: `وتر طوله ${F(c)} سم في دائرة نصف قطرها ${F(r)} سم. أوجد بُعده عن المركز.`, a: r2(Math.sqrt(Math.max(0, r * r - (c / 2) * (c / 2)))), steps: ['العمود من المركز ينصّف الوتر', `ف = √(${F(r)}² − ${F(c / 2)}²)`] }; }
      case 'chords': { const X = segX(P.A, P.B, P.C, P.D); if (!X) return null; const u = unitOf(), a = r2(dist(P.A, X) / u), b = r2(dist(X, P.B) / u), c = r2(dist(P.C, X) / u); return { q: `وتران متقاطعان في هـ: أهـ = ${F(a)} ، هـب = ${F(b)} ، جهـ = ${F(c)}. أوجد هـد.`, a: r2((a * b) / c), steps: ['أهـ × هـب = جهـ × هـد', `هـد = ${F(a)} × ${F(b)} ÷ ${F(c)}`] }; }
      case 'tanChord': { const ip = Math.round(angleAt(P.P, P.A, P.B)); return { q: `الزاوية المحيطية أجب = ${L(ip)}°. ما قياس الزاوية بين المماس عند أ والوتر أب (في القطعة المتبادلة)؟`, a: ip, steps: ['زاوية المماس والوتر = الزاوية المحيطية في القطعة المتبادلة'] }; }
      case 'tangentAt': { const x0 = r2(r * Math.cos(o.a.A)), y0 = r2(r * Math.sin(o.a.A)); if (Math.abs(y0) < 1e-6) return { q: `ما معادلة المماس للدائرة س² + ص² = ${F(r2(r * r))} عند (${F(x0)}، ٠)؟`, a: `x=${x0}`, steps: ['المماس رأسي'] }; return { q: `أوجد ميل المماس للدائرة س² + ص² = ${F(r2(x0 * x0 + y0 * y0))} عند النقطة (${F(x0)}، ${F(y0)}).`, a: r2(-x0 / y0), steps: [`ميل نصف القطر = ${F(y0)} ÷ ${F(x0)}`, 'ميل المماس = −١ ÷ ميل نصف القطر', `= −${F(x0)} ÷ ${F(y0)}`] }; }
      case 'lineCircle': { const c = lineCircleCalc(o); return { q: `دائرة مركزها الأصل ونصف قطرها ${F(r)} سم، والمستقيم ${eqLine(c.A, c.B, c.C)}. أوجد بعد المركز عن المستقيم، وحدّد هل المستقيم قاطع أم مماس أم لا يقطع الدائرة.`, a: r2(c.d), steps: ['ف = |أ س₀ + ب ص₀ + ج| ÷ √(أ² + ب²)', `ف = ${F(c.d)} ${c.kind === 'secant' ? '< نق ⇐ قاطع' : c.kind === 'tangent' ? '= نق ⇐ مماس' : '> نق ⇐ لا يقطع'}`] }; }
      default: return { q: `دائرة نصف قطرها ${F(r)} سم. أوجد مساحتها بدلالة ط.`, a: `${r2(r * r)}ط`, steps: ['المساحة = ط نق²'] };
    }
  }

  M.geoTypes = M.geoTypes || {};
  M.circleGeo = { SCENES, create, setScene, points, info, draw, handles, handleAt, drag, bbox, hit, animate, sweep, quiz, measures, sector, segment, angleAt, tangents, segX, onArc, pt, snapAng, thetaDeg };
  M.geoTypes.circ = M.circleGeo;
})();
