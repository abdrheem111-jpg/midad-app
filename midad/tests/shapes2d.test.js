/* اختبار الأشكال ثنائية الأبعاد: المحيط والمساحة بالقانون مقابل القياس من الشكل المرسوم */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/shapes2d.js');
const { SHAPES } = M.shapes2d;
const shoelace = (p) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2;
const perim = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + Math.hypot(r[0] - q[0], r[1] - q[1]); }, 0);
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-9, Math.abs(b));
for (const [key, S] of Object.entries(SHAPES)) {
  let n = 0;
  for (let k = 0; k < 200 && n < 40; k++) {
    const p = Object.fromEntries(S.params.map((q) => [q.k, q.step >= 1 ? Math.round(q.min + Math.random() * (q.max - q.min)) : +(q.min + Math.random() * (q.max - q.min)).toFixed(2)]));
    if (S.valid && S.valid(p)) continue;
    n++;
    const g = S.geo(p), rows = S.calc(p);
    let pts = g.pts; if (g.curved && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-9) pts = pts.slice(0, -1);
    const area = shoelace(pts) - (g.hole ? shoelace(g.hole.slice(0, -1)) : 0);
    const Arow = rows.find((r) => /^المساحة/.test(r.name));
    const tol = g.curved ? 0.003 : 1e-9;
    T.check(`${S.name}: المساحة`, rel(area, Arow.value) < tol, `${area.toFixed(4)} ≠ ${Arow.value.toFixed(4)} ${JSON.stringify(p)}`);
    const Prow = rows.find((r) => /^المحيط/.test(r.name));
    if (Prow && !g.hole) T.check(`${S.name}: المحيط`, rel(perim(pts), Prow.value) < (g.curved ? 0.003 : 1e-9), `${perim(pts).toFixed(4)} ≠ ${Prow.value.toFixed(4)} ${JSON.stringify(p)}`);
    T.check(`${S.name}: كل القيم أعداد صحيحة التعريف`, rows.every((r) => Number.isFinite(r.value)));
  }
}
T.check('متباينة المثلث تُرفض', !!SHAPES.tri.valid({ a: 1, b: 2, c: 5 }));
process.exitCode = T.report('اختبار الأشكال ثنائية الأبعاد');
