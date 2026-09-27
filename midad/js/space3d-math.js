/* ==========================================================================
   رياضيات الفضاء ثلاثي الأبعاد (نقية وقابلة للاختبار):
   فهم ما يكتبه المعلم (سطح ع = د(س، ص)، مستوى، كرة، نقطة، مستقيم)،
   والتقاطعات (مستقيم ∩ مستوى، مستوى ∩ مستوى، مستقيم ∩ مستقيم، مستقيم ∩ كرة، مستوى ∩ كرة،
   سطح ∩ مستوى، سطح ∩ سطح)، والمسافات والزوايا، وقصّ المستويات والمستقيمات بصندوق العرض
   الإحداثيات رياضية: (س، ص، ع) = (x, y, z) والمحور ع رأسي
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const E = M.math;
  const EPS = 1e-9;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const unit = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const r6 = (x) => Math.round(x * 1e6) / 1e6;
  const F = (x, d) => M.fmt(r6(x), d == null ? 2 : d);
  const P3 = (p) => `(${F(p[0])}، ${F(p[1])}، ${F(p[2])})`;

  /* ---------------- فهم المدخلات ---------------- */
  const NUM = '[-+−]?\\s*\\d+(?:\\.\\d+)?(?:\\s*/\\s*\\d+)?';
  const num = (s) => { s = s.replace(/−/g, '-').replace(/\s+/g, ''); if (s.includes('/')) { const [a, b] = s.split('/'); return +a / +b; } return +s; };
  const PT = `\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\)`;
  function evalRel(rel) {
    const f = (x, y, z) => E.evaluate(rel.lhs, { x, y, z }, 'rad') - (rel.rhs ? E.evaluate(rel.rhs, { x, y, z }, 'rad') : 0);
    return f;
  }
  /** معاملات دالة من الدرجة الأولى أو الثانية في س، ص، ع (بالتقييم العددي) */
  function quadCoeffs(f) {
    const f0 = f(0, 0, 0), c = {};
    const ax = ['x', 'y', 'z'], e = (i, t) => { const p = [0, 0, 0]; p[i] = t; return f(...p); };
    ax.forEach((k, i) => { const fp = e(i, 1), fm = e(i, -1); c[k + '2'] = (fp + fm - 2 * f0) / 2; c[k] = (fp - fm) / 2; });
    [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => { const p = [0, 0, 0]; p[i] = 1; p[j] = 1; c[ax[i] + ax[j]] = f(...p) - f0 - c[ax[i]] - c[ax[j]] - c[ax[i] + '2'] - c[ax[j] + '2']; });
    c.k = f0;
    // تحقق أن الدالة فعلاً من الدرجة الثانية على الأكثر
    const model = (x, y, z) => c.k + c.x * x + c.y * y + c.z * z + c.x2 * x * x + c.y2 * y * y + c.z2 * z * z + c.xy * x * y + c.xz * x * z + c.yz * y * z;
    const ok = [[0.7, -1.3, 2.1], [-2.2, 0.4, 1.7], [1.9, 2.3, -0.8], [3.1, -2.7, 0.6]].every((p) => Math.abs(model(...p) - f(...p)) < 1e-6 * (1 + Math.abs(f(...p))));
    return ok ? c : null;
  }
  /**
   * يحوّل نصاً إلى كائن ثلاثي الأبعاد:
   * «ع = س² + ص²» سطح ، «٢س + ص − ع = ٤» مستوى ، «س² + ص² + ع² = ٩» كرة ،
   * «أ(١، ٢، ٣)» نقطة ، «مستقيم (٠،٠،٠) (٢،١،٣)» مستقيم يمر بنقطتين ، «(١،٢،٣) + ت(١،٠،٢)» مستقيم بمتجه اتجاه
   */
  function parse(text) {
    const raw = String(text || '').trim();
    if (!raw) throw new Error('اكتب دالة أو معادلة أو نقطة');
    const w = M.toWestern(raw).replace(/،/g, ',').replace(/−/g, '-');
    // مستقيم بمتجه اتجاه: (p) + t(d)
    let m = w.match(new RegExp(`^(?:مستقيم|line)?\\s*${PT}\\s*\\+\\s*(?:t|ت|ر|k|ك)\\s*\\*?\\s*${PT}\\s*$`, 'i'));
    if (m) { const p = [num(m[1]), num(m[2]), num(m[3])], d = [num(m[4]), num(m[5]), num(m[6])]; if (len(d) < EPS) throw new Error('متجه الاتجاه لا يمكن أن يكون صفراً'); return { t: 'line', p, d, src: raw }; }
    // مستقيم يمر بنقطتين
    m = w.match(new RegExp(`^(?:مستقيم|line)\\s*([^\\s(]*)\\s*${PT}\\s*(?:و|,)?\\s*([^\\s(]*)\\s*${PT}\\s*$`, 'i'));
    if (m) { const a = [num(m[2]), num(m[3]), num(m[4])], b = [num(m[6]), num(m[7]), num(m[8])]; if (len(sub(b, a)) < EPS) throw new Error('النقطتان متطابقتان'); return { t: 'line', p: a, d: sub(b, a), src: raw }; }
    // نقطة
    m = w.match(new RegExp(`^([^\\s(=]{0,3})\\s*${PT}$`));
    if (m) return { t: 'pt', name: m[1] || '', p: [num(m[2]), num(m[3]), num(m[4])], src: raw };
    // سطح: ع = د(س، ص)
    const zm = w.match(/^\s*(ع|z)\s*=\s*(.+)$/);
    if (zm) {
      const ast = E.parse(zm[2]);
      const vs = new Set(); E.variables(ast, vs);
      if ([...vs].some((v) => !['x', 'y'].includes(v))) {
        // قد تكون مستوى مثل ع = ٢ع…؛ نعاملها كعلاقة عامة
      } else {
        // سطح مستوٍ؟ (ع = أ س + ب ص + ج)
        const f = (x, y) => E.evaluate(ast, { x, y }, 'rad');
        const lin = quadCoeffs((x, y) => f(x, y) - 0);
        if (lin && Math.abs(lin.x2) + Math.abs(lin.y2) + Math.abs(lin.xy) < 1e-9 && Number.isFinite(lin.k)) return { t: 'plane', n: [-lin.x, -lin.y, 1], d: lin.k, src: raw };
        return { t: 'surf', expr: zm[2], src: raw };
      }
    }
    const rel = E.parseRelation(w);
    if (!rel.rel) {
      // تعبير بدلالة س و ص فقط ⇐ سطح ع = …
      const vs = new Set(); E.variables(rel.lhs, vs);
      if ([...vs].every((v) => ['x', 'y'].includes(v))) return parse('z = ' + w);
      throw new Error('اكتب معادلة فيها «=»، مثل: س + ص + ع = ٤');
    }
    if (rel.rel !== '=') throw new Error('المتباينات في الفضاء غير مدعومة بعد — اكتب معادلة');
    const vs = new Set(); E.variables(rel.lhs, vs); E.variables(rel.rhs, vs);
    if ([...vs].some((v) => !['x', 'y', 'z'].includes(v))) throw new Error('استخدم المتغيرات س، ص، ع فقط');
    const f = evalRel(rel);
    const c = quadCoeffs(f);
    if (c) {
      const quad = Math.abs(c.x2) + Math.abs(c.y2) + Math.abs(c.z2) + Math.abs(c.xy) + Math.abs(c.xz) + Math.abs(c.yz);
      if (quad < 1e-9) {
        const n = [c.x, c.y, c.z];
        if (len(n) < EPS) throw new Error('هذه ليست معادلة مستوى');
        return { t: 'plane', n, d: -c.k, src: raw };
      }
      // كرة: معاملات المربعات متساوية ولا حدود مختلطة
      if (Math.abs(c.x2 - c.y2) < 1e-9 && Math.abs(c.y2 - c.z2) < 1e-9 && Math.abs(c.xy) + Math.abs(c.xz) + Math.abs(c.yz) < 1e-9 && Math.abs(c.x2) > EPS) {
        const k = c.x2, cen = [-c.x / (2 * k), -c.y / (2 * k), -c.z / (2 * k)], r2 = dot(cen, cen) - c.k / k;
        if (r2 <= 0) throw new Error('نصف قطر الكرة غير حقيقي');
        return { t: 'sphere', c: cen, r: Math.sqrt(r2), src: raw };
      }
    }
    // علاقة يمكن حلّها لـ ع؟ (ع وحدها في طرف)
    if (rel.lhs && rel.lhs.t === 'var' && (rel.lhs.v === 'z' || rel.lhs.name === 'z')) return parse('z = ' + w.split('=')[1]);
    throw new Error('لم أتعرّف على الشكل — جرّب: ع = س² + ص² أو س + ص + ع = ٤ أو س² + ص² + ع² = ٩');
  }

  /* ---------------- وصف كل كائن ---------------- */
  function planeEq(o) {
    const X = M.varName('x'), Y = M.varName('y');
    const terms = [[o.n[0], X], [o.n[1], Y], [o.n[2], 'ع']].filter(([k]) => Math.abs(k) > 1e-9);
    let s = '';
    terms.forEach(([k, v], i) => { const a = Math.abs(k), sg = k < 0 ? '−' : '+'; s += (i === 0 ? (k < 0 ? '−' : '') : ` ${sg} `) + (Math.abs(a - 1) < 1e-9 ? '' : F(a)) + v; });
    return `${s} = ${F(o.d)}`;
  }
  function describe(o) {
    switch (o.t) {
      case 'pt': return `${o.name || 'نقطة'} ${P3(o.p)}`;
      case 'line': return `مستقيم: ${P3(o.p)} + ت${P3(o.d)}`;
      case 'plane': return `مستوى: ${planeEq(o)}`;
      case 'sphere': return `كرة: المركز ${P3(o.c)} ، نق = ${F(o.r)}`;
      case 'surf': return `سطح: ع = ${M.loc(o.expr)}`;
      default: return '';
    }
  }

  /* ---------------- التقاطعات والعلاقات ---------------- */
  const angDeg = (c) => (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  function linePlane(l, pl) {
    const nd = dot(pl.n, l.d), np = dot(pl.n, l.p);
    const ang = 90 - angDeg(Math.abs(nd) / (len(pl.n) * len(l.d)));
    if (Math.abs(nd) < 1e-9) return Math.abs(np - pl.d) < 1e-9 ? { kind: 'inside', text: 'المستقيم يقع في المستوى' } : { kind: 'parallel', text: `المستقيم يوازي المستوى — البعد بينهما ${F(Math.abs(np - pl.d) / len(pl.n))}` };
    const t = (pl.d - np) / nd, P = add(l.p, mul(l.d, t));
    return { kind: 'point', pts: [P], text: `يتقاطعان في النقطة ${P3(P)} ، والزاوية بين المستقيم والمستوى ${F(ang, 1)}°` };
  }
  function planePlane(a, b) {
    const u = cross(a.n, b.n), uu = dot(u, u);
    const ang = angDeg(Math.abs(dot(a.n, b.n)) / (len(a.n) * len(b.n)));
    if (uu < 1e-12) {
      // متوازيان أو منطبقان
      const k = len(b.n) / len(a.n) * Math.sign(dot(a.n, b.n));
      const same = Math.abs(b.d - a.d * k) < 1e-9;
      return same ? { kind: 'same', text: 'المستويان منطبقان' } : { kind: 'parallel', text: `المستويان متوازيان — البعد بينهما ${F(Math.abs(b.d / len(b.n) - (a.d * Math.sign(dot(a.n, b.n))) / len(a.n)))}` };
    }
    const n1n2 = dot(a.n, b.n), P = mul(add(mul(a.n, a.d * dot(b.n, b.n) - b.d * n1n2), mul(b.n, b.d * dot(a.n, a.n) - a.d * n1n2)), 1 / uu);
    return { kind: 'line', line: { p: P, d: u }, text: `يتقاطعان في مستقيم: ${P3(P)} + ت${P3(u)} ، والزاوية بينهما ${F(ang, 1)}°` };
  }
  function threePlanes(a, b, c) {
    const det = dot(a.n, cross(b.n, c.n));
    if (Math.abs(det) < 1e-9) return null;
    const P = mul(add(add(mul(cross(b.n, c.n), a.d), mul(cross(c.n, a.n), b.d)), mul(cross(a.n, b.n), c.d)), 1 / det);
    return { kind: 'point', pts: [P], text: `المستويات الثلاثة تلتقي في نقطة واحدة ${P3(P)} (حل نظام ثلاث معادلات)` };
  }
  function lineLine(a, b) {
    const w0 = sub(a.p, b.p), A = dot(a.d, a.d), Bv = dot(a.d, b.d), C = dot(b.d, b.d), D = dot(a.d, w0), Ev = dot(b.d, w0), den = A * C - Bv * Bv;
    if (Math.abs(den) < 1e-12) {
      const dd = len(cross(w0, a.d)) / len(a.d);
      return dd < 1e-9 ? { kind: 'same', text: 'المستقيمان منطبقان' } : { kind: 'parallel', text: `المستقيمان متوازيان — البعد بينهما ${F(dd)}` };
    }
    const s = (Bv * Ev - C * D) / den, t = (A * Ev - Bv * D) / den;
    const P = add(a.p, mul(a.d, s)), Q = add(b.p, mul(b.d, t)), dd = len(sub(P, Q));
    const ang = angDeg(Math.abs(Bv) / Math.sqrt(A * C));
    if (dd < 1e-7) return { kind: 'point', pts: [P], text: `يتقاطعان في النقطة ${P3(P)} ، والزاوية بينهما ${F(ang, 1)}°` };
    return { kind: 'skew', seg: [P, Q], text: `مستقيمان متخالفان (لا يتقاطعان ولا يتوازيان) — أقصر بعد بينهما ${F(dd)}` };
  }
  function lineSphere(l, s) {
    const w = sub(l.p, s.c), A = dot(l.d, l.d), Bq = 2 * dot(l.d, w), C = dot(w, w) - s.r * s.r, disc = Bq * Bq - 4 * A * C;
    if (disc < -1e-9) return { kind: 'none', text: 'المستقيم لا يقطع الكرة' };
    if (Math.abs(disc) < 1e-9) { const P = add(l.p, mul(l.d, -Bq / (2 * A))); return { kind: 'point', pts: [P], text: `المستقيم يمسّ الكرة في ${P3(P)}` }; }
    const r = Math.sqrt(disc), P = add(l.p, mul(l.d, (-Bq - r) / (2 * A))), Q = add(l.p, mul(l.d, (-Bq + r) / (2 * A)));
    return { kind: 'point', pts: [P, Q], text: `المستقيم يقطع الكرة في ${P3(P)} و${P3(Q)} — طول الوتر ${F(len(sub(P, Q)))}` };
  }
  function planeSphere(pl, s) {
    const nn = len(pl.n), dd = (dot(pl.n, s.c) - pl.d) / nn;
    if (Math.abs(dd) > s.r + 1e-9) return { kind: 'none', text: `المستوى لا يقطع الكرة (البعد ${F(Math.abs(dd))} > نق)` };
    const cen = sub(s.c, mul(pl.n, dd / nn)), rr = Math.sqrt(Math.max(0, s.r * s.r - dd * dd));
    if (rr < 1e-7) return { kind: 'point', pts: [cen], text: `المستوى يمسّ الكرة في ${P3(cen)}` };
    return { kind: 'circle', circle: { c: cen, r: rr, n: pl.n }, text: `يتقاطعان في دائرة مركزها ${P3(cen)} ونصف قطرها ${F(rr)}` };
  }
  function pointPlane(p, pl) { const d = (dot(pl.n, p.p) - pl.d) / len(pl.n); return Math.abs(d) < 1e-9 ? { kind: 'on', text: `${p.name || 'النقطة'} تقع على المستوى` } : { kind: 'dist', text: `بعد ${p.name || 'النقطة'} عن المستوى = ${F(Math.abs(d))}` }; }
  function pointLine(p, l) { const d = len(cross(sub(p.p, l.p), l.d)) / len(l.d); return d < 1e-9 ? { kind: 'on', text: `${p.name || 'النقطة'} تقع على المستقيم` } : { kind: 'dist', text: `بعد ${p.name || 'النقطة'} عن المستقيم = ${F(d)}` }; }
  function pointPoint(a, b) { const d = len(sub(a.p, b.p)), m = mul(add(a.p, b.p), 0.5); return { kind: 'dist', text: `البعد بين ${a.name || 'النقطتين'}${b.name ? ' و' + b.name : ''} = ${F(d)} ، ونقطة المنتصف ${P3(m)}` }; }

  /** دالة ارتفاع السطح */
  function surfFn(o) { const ast = E.parse(o.expr); return (x, y) => { try { return E.evaluate(ast, { x, y }, 'rad'); } catch (e) { return NaN; } }; }
  /** منحنى تقاطع بخوارزمية المربعات المتحركة لـ h(س، ص) = ٠، والارتفاع من z(س، ص) */
  function contour(h, z, R, n) {
    n = n || 60;
    const segs = [], st = (2 * R) / n, g = [];
    for (let i = 0; i <= n; i++) { g.push([]); for (let j = 0; j <= n; j++) g[i].push(h(-R + i * st, -R + j * st)); }
    const lerp = (x0, y0, v0, x1, y1, v1) => { const t = v0 / (v0 - v1); return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]; };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = -R + i * st, y0 = -R + j * st, x1 = x0 + st, y1 = y0 + st;
      const v = [g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]];
      if (v.some((q) => !Number.isFinite(q))) continue;
      const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], pts = [];
      for (let k = 0; k < 4; k++) { const a = v[k], b = v[(k + 1) % 4]; if ((a < 0) !== (b < 0)) pts.push(lerp(c[k][0], c[k][1], a, c[(k + 1) % 4][0], c[(k + 1) % 4][1], b)); }
      for (let k = 0; k + 1 < pts.length; k += 2) {
        const A = pts[k], Bp = pts[k + 1], za = z(A[0], A[1]), zb = z(Bp[0], Bp[1]);
        if (Number.isFinite(za) && Number.isFinite(zb) && Math.abs(za) <= R * 1.6 && Math.abs(zb) <= R * 1.6) segs.push([[A[0], A[1], za], [Bp[0], Bp[1], zb]]);
      }
    }
    return segs;
  }
  function surfPlane(s, pl, R) {
    const f = surfFn(s);
    const h = Math.abs(pl.n[2]) > 1e-9 ? (x, y) => f(x, y) - (pl.d - pl.n[0] * x - pl.n[1] * y) / pl.n[2] : (x, y) => pl.n[0] * x + pl.n[1] * y - pl.d;
    const segs = contour(h, f, R);
    return segs.length ? { kind: 'curve', segs, text: `يتقاطعان في منحنى (${Math.abs(pl.n[0]) + Math.abs(pl.n[1]) < 1e-9 ? 'خط كنتوري: ع = ' + F(pl.d / pl.n[2]) : 'مقطع مستوٍ'}) — مرسوم بالأحمر` } : { kind: 'none', text: 'لا يتقاطعان في مدى العرض' };
  }
  function surfSurf(a, b, R) {
    const f = surfFn(a), g = surfFn(b);
    const segs = contour((x, y) => f(x, y) - g(x, y), f, R);
    return segs.length ? { kind: 'curve', segs, text: 'يتقاطع السطحان في منحنى — مرسوم بالأحمر' } : { kind: 'none', text: 'لا يتقاطعان في مدى العرض' };
  }
  function lineSurf(l, s, R) {
    const f = surfFn(s), pts = [];
    const g = (t) => { const P = add(l.p, mul(l.d, t)); return P[2] - f(P[0], P[1]); };
    const span = (R * 4) / (len(l.d) || 1), N = 800;
    let prev = g(-span);
    for (let i = 1; i <= N; i++) {
      const t1 = -span + (2 * span * i) / N, v = g(t1), t0 = -span + (2 * span * (i - 1)) / N;
      if (Number.isFinite(prev) && Number.isFinite(v) && (prev < 0) !== (v < 0)) {
        let a = t0, b = t1, fa = prev;
        for (let k = 0; k < 50; k++) { const mdl = (a + b) / 2, fm = g(mdl); if ((fa < 0) === (fm < 0)) { a = mdl; fa = fm; } else b = mdl; }
        const P = add(l.p, mul(l.d, (a + b) / 2));
        if (Math.max(Math.abs(P[0]), Math.abs(P[1])) <= R) pts.push(P);
      }
      prev = v;
    }
    return pts.length ? { kind: 'point', pts, text: `يقطع المستقيم السطح في ${pts.map(P3).join(' و')}` } : { kind: 'none', text: 'المستقيم لا يقطع السطح في مدى العرض' };
  }
  /** العلاقة بين كائنين (بالترتيب المناسب) */
  function relate(a, b, R) {
    const k = [a.t, b.t].sort().join('-');
    const pick = (t) => (a.t === t ? a : b), other = (t) => (a.t === t ? b : a);
    switch (k) {
      case 'line-plane': return linePlane(pick('line'), pick('plane'));
      case 'plane-plane': return planePlane(a, b);
      case 'line-line': return lineLine(a, b);
      case 'line-sphere': return lineSphere(pick('line'), pick('sphere'));
      case 'plane-sphere': return planeSphere(pick('plane'), pick('sphere'));
      case 'plane-pt': return pointPlane(pick('pt'), pick('plane'));
      case 'line-pt': return pointLine(pick('pt'), pick('line'));
      case 'pt-pt': return pointPoint(a, b);
      case 'plane-surf': return surfPlane(pick('surf'), pick('plane'), R);
      case 'surf-surf': return surfSurf(a, b, R);
      case 'line-surf': return lineSurf(pick('line'), pick('surf'), R);
      case 'pt-sphere': { const s = pick('sphere'), p = pick('pt'), d = len(sub(p.p, s.c)); return { kind: 'dist', text: Math.abs(d - s.r) < 1e-9 ? `${p.name || 'النقطة'} على سطح الكرة` : `${p.name || 'النقطة'} ${d < s.r ? 'داخل' : 'خارج'} الكرة (بعدها عن المركز ${F(d)})` }; }
      case 'pt-surf': { const s = pick('surf'), p = pick('pt'), z = surfFn(s)(p.p[0], p.p[1]); return { kind: 'dist', text: Math.abs(z - p.p[2]) < 1e-9 ? `${p.name || 'النقطة'} على السطح` : `${p.name || 'النقطة'} ${p.p[2] > z ? 'فوق' : 'تحت'} السطح (السطح عندها ع = ${F(z)})` }; }
      case 'sphere-sphere': { const d = len(sub(b.c, a.c)); if (d > a.r + b.r + 1e-9 || d < Math.abs(a.r - b.r) - 1e-9 || d < 1e-9) return { kind: 'none', text: 'الكرتان لا تتقاطعان' }; const x = (d * d + a.r * a.r - b.r * b.r) / (2 * d), rr = Math.sqrt(Math.max(0, a.r * a.r - x * x)), u = unit(sub(b.c, a.c)), c = add(a.c, mul(u, x)); return { kind: 'circle', circle: { c, r: rr, n: u }, text: `تتقاطع الكرتان في دائرة مركزها ${P3(c)} ونصف قطرها ${F(rr)}` }; }
      default: void other; return null;
    }
  }

  /* ---------------- القصّ بصندوق العرض ---------------- */
  /** مضلع تقاطع المستوى مع المكعب [−R، R]³ */
  function planeBox(pl, R) {
    const V = [];
    for (let i = 0; i < 8; i++) V.push([i & 1 ? R : -R, i & 2 ? R : -R, i & 4 ? R : -R]);
    const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const pts = [];
    edges.forEach(([i, j]) => {
      const a = V[i], b = V[j], fa = dot(pl.n, a) - pl.d, fb = dot(pl.n, b) - pl.d;
      if (Math.abs(fa) < 1e-12) pts.push(a);
      if ((fa < 0) !== (fb < 0) && Math.abs(fa - fb) > 1e-12) pts.push(add(a, mul(sub(b, a), fa / (fa - fb))));
    });
    const uniq = []; pts.forEach((p) => { if (!uniq.some((q) => len(sub(p, q)) < 1e-7)) uniq.push(p); });
    if (uniq.length < 3) return [];
    const c = mul(uniq.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / uniq.length);
    const u = unit(sub(uniq[0], c)), v = unit(cross(pl.n, u));
    return uniq.sort((p, q) => Math.atan2(dot(sub(p, c), v), dot(sub(p, c), u)) - Math.atan2(dot(sub(q, c), v), dot(sub(q, c), u)));
  }
  /** جزء المستقيم داخل الصندوق */
  function lineBox(l, R) {
    let t0 = -Infinity, t1 = Infinity;
    for (let i = 0; i < 3; i++) {
      if (Math.abs(l.d[i]) < 1e-12) { if (Math.abs(l.p[i]) > R) return null; continue; }
      let a = (-R - l.p[i]) / l.d[i], b = (R - l.p[i]) / l.d[i]; if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    }
    if (t0 > t1) return null;
    return [add(l.p, mul(l.d, t0)), add(l.p, mul(l.d, t1))];
  }

  M.space3dMath = { parse, describe, planeEq, relate, threePlanes, planeBox, lineBox, surfFn, contour, P3, v: { add, sub, mul, dot, cross, len, unit } };
})();
