/* ==========================================================================
   التعرّف الذكي على الأشكال المرسومة باليد + التعلّم من تصحيحات المستخدم
   يحوّل الرسم إلى شكل هندسي دقيق ويصنّفه (مربع، مستطيل، معين، متوازي أضلاع،
   شبه منحرف، طائرة ورقية، مثلث قائم/متطابق الضلعين/متطابق الأضلاع، مضلعات
   منتظمة، نجمة، دائرة، قطع ناقص، سهم، مستقيم) ويحسب قياساته
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const PI = Math.PI;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function distToSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    let dm = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) { const d = distToSeg(pts[i], pts[0], pts[pts.length - 1]); if (d > dm) { dm = d; idx = i; } }
    if (dm > eps) { const a = rdp(pts.slice(0, idx + 1), eps), b = rdp(pts.slice(idx), eps); return a.slice(0, -1).concat(b); }
    return [pts[0], pts[pts.length - 1]];
  }
  const bboxOf = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
  const pathLen = (pts) => pts.reduce((s, p, i) => (i ? s + dist(p, pts[i - 1]) : 0), 0);
  const centroid = (pts) => pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
  const shoelace = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
  /** الزاوية الداخلية عند الرأس i (بالدرجات) */
  function angleAt(v, i) {
    const n = v.length, a = v[(i - 1 + n) % n], b = v[i], c = v[(i + 1) % n];
    const u = [a[0] - b[0], a[1] - b[1]], w = [c[0] - b[0], c[1] - b[1]];
    return (Math.acos(Math.max(-1, Math.min(1, (u[0] * w[0] + u[1] * w[1]) / ((Math.hypot(...u) * Math.hypot(...w)) || 1)))) * 180) / PI;
  }
  const dirOf = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
  /** الفرق بين اتجاهي مستقيمين (بين ٠ و ٩٠ درجة) */
  const lineDiff = (t1, t2) => { let d = Math.abs(((t1 - t2) * 180) / PI) % 180; return d > 90 ? 180 - d : d; };
  function resample(pts, n) {
    const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + dist(pts[i], pts[i - 1]));
    const L = d[d.length - 1] || 1, out = []; let j = 0;
    for (let k = 0; k < n; k++) { const t = (L * k) / (n - 1); while (j < d.length - 2 && d[j + 1] < t) j++; const u = (t - d[j]) / ((d[j + 1] - d[j]) || 1); const q = pts[j + 1] || pts[j]; out.push([pts[j][0] + (q[0] - pts[j][0]) * u, pts[j][1] + (q[1] - pts[j][1]) * u]); }
    return out;
  }

  /** قطع ناقص بالمحاور الرئيسية (PCA): المركز، نصفا المحورين، الزاوية، والخطأ النسبي */
  function fitEllipse(pts) {
    const c = centroid(pts);
    let sxx = 0, syy = 0, sxy = 0;
    pts.forEach(([x, y]) => { const dx = x - c[0], dy = y - c[1]; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), co = Math.cos(th), si = Math.sin(th);
    const loc = pts.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; return [dx * co + dy * si, -dx * si + dy * co]; });
    const a = (Math.max(...loc.map((q) => q[0])) - Math.min(...loc.map((q) => q[0]))) / 2, b = (Math.max(...loc.map((q) => q[1])) - Math.min(...loc.map((q) => q[1]))) / 2;
    const rr = loc.map(([x, y]) => Math.hypot(x / (a || 1), y / (b || 1)));
    const mr = rr.reduce((q, r) => q + r, 0) / rr.length;
    const res = Math.sqrt(rr.reduce((q, r) => q + (r - mr) ** 2, 0) / rr.length);
    return a >= b ? { c, a: a * mr, b: b * mr, th, res } : { c, a: b * mr, b: a * mr, th: th + PI / 2, res };
  }

  /* ---------------- أسماء الأشكال ---------------- */
  const NAMES = {
    line: 'مستقيم', arrow: 'سهم', circle: 'دائرة', ellipse: 'قطع ناقص', triangle: 'مثلث', rtri: 'مثلث قائم الزاوية', isoTri: 'مثلث متطابق الضلعين', equiTri: 'مثلث متطابق الأضلاع',
    square: 'مربع', rect: 'مستطيل', rhombus: 'معين', para: 'متوازي أضلاع', trap: 'شبه منحرف', kite: 'طائرة ورقية', quad: 'شكل رباعي',
    pent: 'خماسي منتظم', hex: 'سداسي منتظم', hept: 'سباعي منتظم', oct: 'ثماني منتظم', polygon: 'مضلع', star: 'نجمة خماسية', freehand: 'رسم حر',
  };
  const REG_KEYS = { 5: 'pent', 6: 'hex', 7: 'hept', 8: 'oct' };

  /* ---------------- تسوية المضلعات إلى أشكال دقيقة ---------------- */
  function regular(n, c, R, rot) { return Array.from({ length: n }, (_, i) => { const a = rot + (2 * PI * i) / n; return [c[0] + R * Math.cos(a), c[1] + R * Math.sin(a)]; }); }
  function snapRect(v, square) {
    // اتجاه الضلع الأول معدّلاً بمتوسط اتجاهات الأضلاع (بترديد ٩٠°)
    let sx = 0, sy = 0;
    v.forEach((p, i) => { const t = dirOf(p, v[(i + 1) % 4]) * 4; sx += Math.cos(t); sy += Math.sin(t); });
    let th = Math.atan2(sy, sx) / 4;
    if (Math.abs((th * 180) / PI) < 6) th = 0;
    const c = centroid(v), cos = Math.cos(th), sin = Math.sin(th);
    const loc = v.map((p) => [(p[0] - c[0]) * cos + (p[1] - c[1]) * sin, -(p[0] - c[0]) * sin + (p[1] - c[1]) * cos]);
    let w = (Math.max(...loc.map((q) => q[0])) - Math.min(...loc.map((q) => q[0]))), h = (Math.max(...loc.map((q) => q[1])) - Math.min(...loc.map((q) => q[1])));
    if (square) w = h = (w + h) / 2;
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [c[0] + x * cos - y * sin, c[1] + x * sin + y * cos]);
    return { pts: corners, axis: th === 0 };
  }
  function classifyTriangle(v) {
    const s = [dist(v[0], v[1]), dist(v[1], v[2]), dist(v[2], v[0])];
    const ang = [0, 1, 2].map((i) => angleAt(v, i));
    const mx = Math.max(...s), mn = Math.min(...s);
    if (mx / mn < 1.14 && ang.every((a) => Math.abs(a - 60) < 12)) {
      const c = centroid(v), R = s.reduce((a, b) => a + b) / 3 / Math.sqrt(3);
      return { key: 'equiTri', pts: regular(3, c, R, dirOf(c, v[0])) };
    }
    const ri = ang.findIndex((a) => Math.abs(a - 90) < 8);
    if (ri >= 0) {
      // الرأس القائم ثابت، والضلعان عموديان تماماً
      const B = v[ri], A = v[(ri + 2) % 3], C = v[(ri + 1) % 3];
      const t1 = dirOf(B, A), la = dist(B, A), lc = dist(B, C);
      const sgn = Math.sin(dirOf(B, C) - t1) >= 0 ? 1 : -1;
      const t2 = t1 + sgn * (PI / 2);
      const pts = [];
      pts[(ri + 2) % 3] = [B[0] + la * Math.cos(t1), B[1] + la * Math.sin(t1)];
      pts[ri] = B;
      pts[(ri + 1) % 3] = [B[0] + lc * Math.cos(t2), B[1] + lc * Math.sin(t2)];
      return { key: 'rtri', pts, right: ri };
    }
    for (let i = 0; i < 3; i++) {
      const a = s[i], b = s[(i + 1) % 3];
      if (Math.abs(a - b) / Math.max(a, b) < 0.1) {
        // الضلعان المتساويان يلتقيان عند الرأس (i+1)
        const apex = v[(i + 1) % 3], P = v[i], Q = v[(i + 2) % 3];
        const m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], bd = dirOf(P, Q), nrm = [-Math.sin(bd), Math.cos(bd)];
        const hgt = (apex[0] - m[0]) * nrm[0] + (apex[1] - m[1]) * nrm[1];
        const pts = v.slice(); pts[(i + 1) % 3] = [m[0] + nrm[0] * hgt, m[1] + nrm[1] * hgt];
        return { key: 'isoTri', pts };
      }
    }
    return { key: 'triangle', pts: v };
  }
  function classifyQuad(v) {
    const ang = [0, 1, 2, 3].map((i) => angleAt(v, i));
    const s = [0, 1, 2, 3].map((i) => dist(v[i], v[(i + 1) % 4]));
    const d = [0, 1, 2, 3].map((i) => dirOf(v[i], v[(i + 1) % 4]));
    const par02 = lineDiff(d[0], d[2]) < 10, par13 = lineDiff(d[1], d[3]) < 10;
    const eqAll = Math.max(...s) / Math.min(...s) < 1.15;
    if (ang.every((a) => Math.abs(a - 90) < 13)) {
      const sq = Math.max(...s) / Math.min(...s) < 1.13;
      const r = snapRect(v, sq);
      return { key: sq ? 'square' : 'rect', pts: r.pts, axis: r.axis };
    }
    if (par02 && par13) {
      // متوازي أضلاع: نثبت ثلاثة رؤوس ونحسب الرابع
      const A = v[0], B = v[1], C = v[2];
      let pts = [A, B, C, [A[0] + C[0] - B[0], A[1] + C[1] - B[1]]];
      if (eqAll) {
        // معين: نجعل الضلعين متساويين حول المركز مع الحفاظ على القطرين
        const c = centroid(v), d1 = dirOf(v[0], v[2]), l1 = dist(v[0], v[2]) / 2, l2 = dist(v[1], v[3]) / 2;
        pts = [[c[0] - l1 * Math.cos(d1), c[1] - l1 * Math.sin(d1)], [c[0] + l2 * Math.sin(d1), c[1] - l2 * Math.cos(d1)], [c[0] + l1 * Math.cos(d1), c[1] + l1 * Math.sin(d1)], [c[0] - l2 * Math.sin(d1), c[1] + l2 * Math.cos(d1)]];
        if (Math.sign((pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[1][1] - pts[0][1]) * (pts[2][0] - pts[0][0])) !== Math.sign((v[1][0] - v[0][0]) * (v[2][1] - v[0][1]) - (v[1][1] - v[0][1]) * (v[2][0] - v[0][0]))) pts = [pts[0], pts[3], pts[2], pts[1]];
        return { key: 'rhombus', pts };
      }
      return { key: 'para', pts };
    }
    if (par02 || par13) return { key: 'trap', pts: v };
    // طائرة ورقية: زوجان من الأضلاع المتجاورة متساويان
    const eq = (a, b) => Math.abs(a - b) / Math.max(a, b) < 0.12;
    if ((eq(s[0], s[1]) && eq(s[2], s[3])) || (eq(s[1], s[2]) && eq(s[3], s[0]))) return { key: 'kite', pts: v };
    return { key: 'quad', pts: v };
  }

  /** قياسات مضلع أو دائرة بوحدات السبورة */
  function measure(res, unit) {
    const u = unit || 40;
    if (res.kind === 'circle' || res.kind === 'ellipse') {
      const rx = Math.abs(res.obj.x2 - res.obj.x1) / 2 / u, ry = Math.abs(res.obj.y2 - res.obj.y1) / 2 / u;
      if (res.kind === 'circle') return { r: rx, area: PI * rx * rx, perimeter: 2 * PI * rx };
      const h = ((rx - ry) / (rx + ry)) ** 2;
      return { a: Math.max(rx, ry), b: Math.min(rx, ry), area: PI * rx * ry, perimeter: PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))) };
    }
    if (res.kind === 'line' || res.kind === 'arrow') return { length: Math.hypot(res.obj.x2 - res.obj.x1, res.obj.y2 - res.obj.y1) / u };
    const p = res.obj.pts || (res.obj.type === 'rect' ? [[res.obj.x1, res.obj.y1], [res.obj.x2, res.obj.y1], [res.obj.x2, res.obj.y2], [res.obj.x1, res.obj.y2]] : null);
    if (!p) return {};
    const sides = p.map((q, i) => dist(q, p[(i + 1) % p.length]) / u);
    return { sides, angles: p.map((_, i) => angleAt(p, i)), area: shoelace(p) / (u * u), perimeter: sides.reduce((a, b) => a + b, 0) };
  }

  /* ---------------- التعلّم من المستخدم ---------------- */
  function descriptor(pts) {
    const r = resample(pts, 48);
    const b = bboxOf(r), w = b[2] - b[0] || 1, h = b[3] - b[1] || 1, D = Math.hypot(w, h);
    const closed = dist(pts[0], pts[pts.length - 1]) / D;
    const c = centroid(r), rs = r.map((p) => dist(p, c)), mr = rs.reduce((a, x) => a + x, 0) / rs.length;
    const circ = Math.sqrt(rs.reduce((a, x) => a + (x - mr) ** 2, 0) / rs.length) / (mr || 1);
    const nv = Math.min(12, rdp(r.concat(closed < 0.25 ? [r[0]] : []), D * 0.07).length);
    const hist = new Array(8).fill(0);
    for (let i = 1; i < r.length; i++) { const t = dirOf(r[i - 1], r[i]); hist[Math.floor((((t + PI) / (2 * PI)) * 8) % 8)] += 1 / r.length; }
    let turn = 0; for (let i = 2; i < r.length; i++) { let a = dirOf(r[i - 1], r[i]) - dirOf(r[i - 2], r[i - 1]); while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; turn += Math.abs(a); }
    return [Math.log(w / h), closed * 2, circ * 3, nv / 3, turn / (2 * PI)].concat(hist.map((x) => x * 2));
  }
  const dd = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
  function userMatch(pts, samples) {
    if (!samples || !samples.length) return null;
    const d = descriptor(pts);
    let best = null;
    for (const s of samples) { const x = dd(d, s.d); if (!best || x < best.x) best = { x, label: s.label }; }
    return best && best.x < 0.55 ? best.label : null;
  }
  /** بناء شكل من اسمه ضمن الإطار المحيط بالرسم (للأشكال التي علّمها المستخدم) */
  function buildFromLabel(label, pts) {
    const b = bboxOf(pts), c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], w = b[2] - b[0], h = b[3] - b[1];
    const R = Math.max(w, h) / 2;
    const poly = (p) => ({ type: 'poly', pts: p });
    switch (label) {
      case 'freehand': return null;
      case 'line': return { type: 'line', x1: pts[0][0], y1: pts[0][1], x2: pts[pts.length - 1][0], y2: pts[pts.length - 1][1] };
      case 'arrow': return { type: 'arrow', x1: pts[0][0], y1: pts[0][1], x2: pts[pts.length - 1][0], y2: pts[pts.length - 1][1] };
      case 'circle': { const r = (w + h) / 4; return { type: 'ellipse', x1: c[0] - r, y1: c[1] - r, x2: c[0] + r, y2: c[1] + r }; }
      case 'ellipse': return { type: 'ellipse', x1: b[0], y1: b[1], x2: b[2], y2: b[3] };
      case 'rect': return { type: 'rect', x1: b[0], y1: b[1], x2: b[2], y2: b[3] };
      case 'square': { const s = (w + h) / 4; return { type: 'rect', x1: c[0] - s, y1: c[1] - s, x2: c[0] + s, y2: c[1] + s }; }
      case 'triangle': case 'isoTri': return poly([[c[0], b[1]], [b[2], b[3]], [b[0], b[3]]]);
      case 'equiTri': return poly(regular(3, c, R, -PI / 2));
      case 'rtri': return Object.assign(poly([[b[0], b[1]], [b[0], b[3]], [b[2], b[3]]]), { rightAngle: 1 });
      case 'rhombus': return poly([[c[0], b[1]], [b[2], c[1]], [c[0], b[3]], [b[0], c[1]]]);
      case 'para': return poly([[b[0] + w * 0.25, b[1]], [b[2], b[1]], [b[2] - w * 0.25, b[3]], [b[0], b[3]]]);
      case 'trap': return poly([[b[0] + w * 0.25, b[1]], [b[2] - w * 0.25, b[1]], [b[2], b[3]], [b[0], b[3]]]);
      case 'kite': return poly([[c[0], b[1]], [b[2], b[1] + h * 0.35], [c[0], b[3]], [b[0], b[1] + h * 0.35]]);
      case 'pent': return poly(regular(5, c, R, -PI / 2));
      case 'hex': return poly(regular(6, c, R, 0));
      case 'hept': return poly(regular(7, c, R, -PI / 2));
      case 'oct': return poly(regular(8, c, R, PI / 8));
      case 'star': return poly(starPts(c, R, R * 0.4, -PI / 2));
      default: return null;
    }
  }
  const starPts = (c, R, r, rot) => Array.from({ length: 10 }, (_, i) => { const a = rot + (PI * i) / 5, q = i % 2 ? r : R; return [c[0] + q * Math.cos(a), c[1] + q * Math.sin(a)]; });

  /* ---------------- التعرّف ---------------- */
  /**
   * pts: نقاط الخط. opts: { scale: تكبير العرض، unit، samples: أمثلة المستخدم }
   * يعيد { kind, label, obj } أو null (يبقى رسماً حراً)
   */
  function recognize(pts, opts) {
    opts = opts || {};
    if (!pts || pts.length < 6) return null;
    const b = bboxOf(pts), D = Math.hypot(b[2] - b[0], b[3] - b[1]);
    if (D * (opts.scale || 1) < 30) return null;
    const out = (kind, obj, extra) => Object.assign({ kind, label: NAMES[kind], obj }, extra || {});
    // ما علّمه المستخدم أولاً
    const um = userMatch(pts, opts.samples);
    if (um) { const obj = buildFromLabel(um, pts); return um === 'freehand' || !obj ? { kind: 'freehand', label: NAMES.freehand, obj: null, learned: true } : out(um, obj, { learned: true }); }
    const L = pathLen(pts), A = pts[0], Z = pts[pts.length - 1], d = dist(A, Z);
    // مستقيم
    let maxDev = 0; for (const p of pts) maxDev = Math.max(maxDev, distToSeg(p, A, Z));
    if (d / L > 0.92 && maxDev / L < 0.05) {
      let [x2, y2] = Z;
      const t = (dirOf(A, Z) * 180) / PI, ta = ((t % 180) + 180) % 180;
      if (ta < 5 || ta > 175) y2 = A[1]; else if (Math.abs(ta - 90) < 5) x2 = A[0];
      return out('line', { type: 'line', x1: A[0], y1: A[1], x2, y2 });
    }
    // سهم مرسوم بخط واحد: ساق ثم رأس على شكل V
    if (d > 0.25 * D) {
      const s = rdp(pts, D * 0.06);
      if (s.length >= 4 && s.length <= 6) {
        const shaft = dist(s[0], s[1]);
        const tail = s.slice(1);
        const near = tail.filter((q) => dist(q, s[1]) < shaft * 0.5).length === tail.length;
        const barbs = tail.slice(1).map((q) => dist(q, s[1]));
        if (shaft > 0.6 * D && near && barbs.some((x) => x > shaft * 0.08)) {
          const angOK = tail.slice(1).every((q) => { if (dist(q, s[1]) < shaft * 0.05) return true; const a = lineDiff(dirOf(s[1], q), dirOf(s[1], s[0])); return a > 12 && a < 75; });
          if (angOK) return out('arrow', { type: 'arrow', x1: s[0][0], y1: s[0][1], x2: s[1][0], y2: s[1][1] });
        }
      }
    }
    if (d > 0.25 * D) return null;
    // شكل مغلق
    const c = centroid(pts), rs = pts.map((p) => dist(p, c)), mr = rs.reduce((a, r) => a + r, 0) / rs.length;
    const sd = Math.sqrt(rs.reduce((a, r) => a + (r - mr) ** 2, 0) / rs.length);
    const closed = pts.concat([pts[0]]);
    let verts = rdp(closed, D * 0.065).slice(0, -1);
    verts = verts.filter((v, i) => i === 0 || dist(v, verts[i - 1]) > D * 0.1);
    if (verts.length > 2 && dist(verts[0], verts[verts.length - 1]) < D * 0.1) verts.pop();
    // حذف الرؤوس شبه المستقيمة (زاوية قريبة من ١٨٠)
    for (let k = 0; k < 3 && verts.length > 3; k++) { const i = verts.findIndex((_, j) => angleAt(verts, j) > 162); if (i < 0) break; verts.splice(i, 1); }
    // مقارنة نموذجين: قطع ناقص (بالمحاور الرئيسية) مقابل مضلع رؤوسه verts
    const rsm = resample(closed, 72);
    const E = fitEllipse(rsm);
    const polyRes = Math.sqrt(rsm.reduce((a, p) => { let m = Infinity; verts.forEach((v, i) => { m = Math.min(m, distToSeg(p, v, verts[(i + 1) % verts.length])); }); return a + m * m; }, 0) / rsm.length) / (E.a || 1);
    // الدوائر المرسومة باليد خطؤها أقل من ~٠٫٠٣، والمضلعات المنتظمة (٥–٨ أضلاع) أعلى من ~٠٫٠٤
    const smooth = E.res < 0.075 && (verts.length > 4 || E.res < 0.04) && !(verts.length <= 8 && (polyRes < E.res * 0.8 || (verts.length >= 5 && E.res > 0.037)));
    if (opts.debug) opts.debug.push({ n: verts.length, eres: +E.res.toFixed(3), pres: +polyRes.toFixed(3) });
    if (smooth) {
      const cx = E.c[0], cy = E.c[1];
      if (E.b / E.a > 0.86) { const r = (E.a + E.b) / 2; return out('circle', { type: 'ellipse', x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r }); }
      const deg = Math.abs(((E.th * 180) / PI) % 90);
      if (deg < 7 || deg > 83) { const ax = deg > 45 ? [E.b, E.a] : [E.a, E.b]; return out('ellipse', { type: 'ellipse', x1: cx - ax[0], y1: cy - ax[1], x2: cx + ax[0], y2: cy + ax[1] }); }
      const pts2 = Array.from({ length: 72 }, (_, i) => { const t = (2 * PI * i) / 72, x = E.a * Math.cos(t), y = E.b * Math.sin(t); return [cx + x * Math.cos(E.th) - y * Math.sin(E.th), cy + x * Math.sin(E.th) + y * Math.cos(E.th)]; });
      return out('ellipse', { type: 'poly', pts: pts2, smooth: true });
    }
    const n = verts.length;
    if (n === 3) { const t = classifyTriangle(verts); return out(t.key, Object.assign({ type: 'poly', pts: t.pts }, t.key === 'rtri' ? { rightAngle: 1 } : {})); }
    if (n === 4) {
      const q = classifyQuad(verts);
      if ((q.key === 'rect' || q.key === 'square') && q.axis) { const bb = bboxOf(q.pts); return out(q.key, { type: 'rect', x1: bb[0], y1: bb[1], x2: bb[2], y2: bb[3] }); }
      return out(q.key, { type: 'poly', pts: q.pts });
    }
    // نجمة: ١٠ رؤوس بأنصاف أقطار متناوبة
    if (n === 10) {
      const rr = verts.map((v) => dist(v, c)), odd = rr.filter((_, i) => i % 2), even = rr.filter((_, i) => !(i % 2));
      const mo = odd.reduce((a, x) => a + x, 0) / 5, me = even.reduce((a, x) => a + x, 0) / 5;
      const [Rout, Rin, first] = mo > me ? [mo, me, 1] : [me, mo, 0];
      if (Rin / Rout < 0.7) return out('star', { type: 'poly', pts: starPts(c, Rout, Rin, dirOf(c, verts[first])) });
    }
    if (n >= 5 && n <= 8) {
      const s = verts.map((v, i) => dist(v, verts[(i + 1) % n])), ms = s.reduce((a, x) => a + x, 0) / n;
      const cv = Math.sqrt(s.reduce((a, x) => a + (x - ms) ** 2, 0) / n) / ms;
      const ideal = ((n - 2) * 180) / n;
      if (cv < 0.2 && verts.every((_, i) => Math.abs(angleAt(verts, i) - ideal) < 22)) {
        const R = verts.reduce((a, v) => a + dist(v, c), 0) / n;
        return out(REG_KEYS[n], { type: 'poly', pts: regular(n, c, R, dirOf(c, verts[0])) });
      }
      return out('polygon', { type: 'poly', pts: verts }, { label: `مضلع ${['', '', '', '', '', 'خماسي', 'سداسي', 'سباعي', 'ثماني'][n]}` });
    }
    if (sd / mr < 0.16) return out('ellipse', { type: 'ellipse', x1: b[0], y1: b[1], x2: b[2], y2: b[3] });
    return null;
  }

  /** دمج مستقيمات متتالية تتلاقى أطرافها في مضلع مغلق (رسم شكل بعدة خطوط) */
  function closeLines(lines, tol) {
    if (lines.length < 3 || lines.length > 8) return null;
    const segs = lines.map((l) => [[l.x1, l.y1], [l.x2, l.y2]]);
    const used = [0], chain = [segs[0][0], segs[0][1]];
    while (used.length < segs.length) {
      const end = chain[chain.length - 1];
      let found = -1, rev = false;
      segs.forEach((sg, i) => { if (found >= 0 || used.includes(i)) return; if (dist(sg[0], end) < tol) found = i; else if (dist(sg[1], end) < tol) { found = i; rev = true; } });
      if (found < 0) return null;
      used.push(found);
      chain.push(rev ? segs[found][0] : segs[found][1]);
    }
    if (dist(chain[0], chain[chain.length - 1]) > tol) return null;
    // الرؤوس: متوسط نهايتي كل خطين متلاقيين
    const n = segs.length, v = [];
    for (let i = 0; i < n; i++) v.push(chain[i]);
    return v;
  }
  /** تسوية مضلع مغلق من رؤوسه (بعد دمج خطوط) */
  function fromVertices(v) {
    const out = (kind, obj) => ({ kind, label: NAMES[kind], obj });
    if (v.length === 3) { const t = classifyTriangle(v); return out(t.key, Object.assign({ type: 'poly', pts: t.pts }, t.key === 'rtri' ? { rightAngle: 1 } : {})); }
    if (v.length === 4) { const q = classifyQuad(v); if ((q.key === 'rect' || q.key === 'square') && q.axis) { const bb = bboxOf(q.pts); return out(q.key, { type: 'rect', x1: bb[0], y1: bb[1], x2: bb[2], y2: bb[3] }); } return out(q.key, { type: 'poly', pts: q.pts }); }
    return { kind: 'polygon', label: 'مضلع', obj: { type: 'poly', pts: v } };
  }

  M.shapeRec = { recognize, measure, descriptor, buildFromLabel, closeLines, fromVertices, NAMES, _angleAt: angleAt };
})();
