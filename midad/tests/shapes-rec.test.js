/* اختبار التعرّف على الأشكال المرسومة باليد (اهتزاز، دوران، أحجام، نقطة بداية عشوائية) */
const T = require('./harness');
const M = T.load('js/core.js', 'js/shape-rec.js');
const R = M.shapeRec;
let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const PI = Math.PI;
const rot = (pts, a, c) => pts.map(([x, y]) => [c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]);
/** رسم يدوي لمضلع مغلق: تقسيم الأضلاع، اهتزاز، بداية عشوائية، فجوة/تجاوز بسيط عند الإغلاق */
function hand(poly, closed, amp) {
  const pts = [];
  const n = poly.length, segs = closed ? n : n - 1;
  const start = closed ? Math.floor(rnd() * n) : 0;
  for (let k = 0; k < segs; k++) {
    const a = poly[(start + k) % n], b = poly[(start + k + 1) % n];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(4, Math.round(L / 6));
    for (let i = 0; i < m; i++) pts.push([a[0] + ((b[0] - a[0]) * i) / m, a[1] + ((b[1] - a[1]) * i) / m]);
  }
  if (closed) { const e = poly[start]; pts.push([e[0] + (rnd() - 0.5) * amp * 3, e[1] + (rnd() - 0.5) * amp * 3]); } else pts.push(poly[n - 1]);
  let w = 0;
  return pts.map(([x, y]) => { w = w * 0.8 + (rnd() - 0.5) * amp; return [x + w + (rnd() - 0.5) * amp * 0.4, y - w * 0.7 + (rnd() - 0.5) * amp * 0.4]; });
}
const circlePts = (rx, ry, n) => Array.from({ length: n || 40 }, (_, i) => [rx * Math.cos((2 * PI * i) / (n || 40)), ry * Math.sin((2 * PI * i) / (n || 40))]);
const reg = (n, r, a0) => Array.from({ length: n }, (_, i) => [r * Math.cos(a0 + (2 * PI * i) / n), r * Math.sin(a0 + (2 * PI * i) / n)]);
const GEN = {
  square: (s) => [[-s, -s], [s, -s], [s, s], [-s, s]],
  rect: (s) => [[-s * 1.7, -s], [s * 1.7, -s], [s * 1.7, s], [-s * 1.7, s]],
  rhombus: (s) => [[0, -s * 1.5], [s, 0], [0, s * 1.5], [-s, 0]],
  para: (s) => [[-s * 1.5, -s * 0.8], [s * 1.1, -s * 0.8], [s * 1.7, s * 0.8], [-s * 0.9, s * 0.8]],
  trap: (s) => [[-s * 0.8, -s * 0.9], [s * 0.8, -s * 0.9], [s * 1.8, s * 0.9], [-s * 1.8, s * 0.9]],
  kite: (s) => [[0, -s * 2.2], [s * 1.1, -s * 1.1], [0, s * 1.4], [-s * 1.1, -s * 1.1]],
  rtri: (s) => [[-s * 1.2, -s * 1.3], [-s * 1.2, s], [s * 1.6, s]],
  equiTri: (s) => reg(3, s * 1.3, -PI / 2),
  isoTri: (s) => [[0, -s * 1.8], [s * 0.9, s], [-s * 0.9, s]],
  // مثلث مختلف الأضلاع زواياه ٣٠° و٥٠° و١٠٠°
  triangle: (s) => { const c = 3 * s, b = (c * Math.sin((50 * PI) / 180)) / Math.sin((100 * PI) / 180); return [[-c / 2, s], [c / 2, s], [-c / 2 + b * Math.cos((30 * PI) / 180), s - b * Math.sin((30 * PI) / 180)]]; },
  pent: (s) => reg(5, s * 1.3, -PI / 2),
  hex: (s) => reg(6, s * 1.3, 0),
  oct: (s) => reg(8, s * 1.4, PI / 8),
  star: (s) => Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? s * 0.55 : s * 1.5, a = -PI / 2 + (PI * i) / 5; return [r * Math.cos(a), r * Math.sin(a)]; }),
  circle: (s) => circlePts(s * 1.3, s * 1.3),
  ellipse: (s) => circlePts(s * 1.9, s * 1.05),
};
const ALLOW = { rect: ['rect'], square: ['square'], circle: ['circle'], ellipse: ['ellipse'] };
const RES = {};
for (const [k, g] of Object.entries(GEN)) {
  let ok = 0; const N = 60; const conf = {};
  for (let i = 0; i < N; i++) {
    const s = 40 + rnd() * 80;
    const axisOnly = k === 'rect' || k === 'square' ? rnd() < 0.5 : false;
    const ang = axisOnly ? 0 : (rnd() - 0.5) * (k === 'trap' || k === 'kite' || k === 'isoTri' || k === 'triangle' || k === 'pent' || k === 'star' ? 0.8 : 2 * PI);
    const poly = rot(g(s), ang, [400, 300]);
    const r = R.recognize(hand(poly, true, s * 0.05), { scale: 1 });
    const got = r ? r.kind : 'null';
    if ((ALLOW[k] || [k]).includes(got)) ok++; else conf[got] = (conf[got] || 0) + 1;
  }
  RES[k] = ok / N;
  console.log(`  ${R.NAMES[k].padEnd(22)} ${ok}/${N}${Object.keys(conf).length ? '   ⇐ ' + Object.entries(conf).map(([a, b]) => `${a}×${b}`).join(' ') : ''}`);
}
const avg = Object.values(RES).reduce((a, b) => a + b, 0) / Object.keys(RES).length;
console.log(`  المتوسط: ${(avg * 100).toFixed(1)}٪`);
T.check('متوسط دقة التعرّف على الأشكال ≥ ٩٠٪', avg >= 0.9, (avg * 100).toFixed(1));
Object.entries(RES).forEach(([k, v]) => T.check(`${R.NAMES[k]} ≥ ٧٥٪`, v >= 0.75, (v * 100).toFixed(0)));

// مستقيم وسهم
(() => {
  let ok = 0, okA = 0;
  for (let i = 0; i < 40; i++) {
    const a = rnd() * 2 * PI, L = 120 + rnd() * 200, A = [300, 300], B = [300 + L * Math.cos(a), 300 + L * Math.sin(a)];
    const r = R.recognize(hand([A, B], false, 3), { scale: 1 });
    if (r && r.kind === 'line') ok++;
    const hd = L * 0.2, t = Math.atan2(B[1] - A[1], B[0] - A[0]);
    const b1 = [B[0] - hd * Math.cos(t - 0.5), B[1] - hd * Math.sin(t - 0.5)], b2 = [B[0] - hd * Math.cos(t + 0.5), B[1] - hd * Math.sin(t + 0.5)];
    const ra = R.recognize(hand([A, B, b1, B, b2], false, 2), { scale: 1 });
    if (ra && ra.kind === 'arrow') okA++;
  }
  console.log(`  مستقيم ${ok}/40 ، سهم ${okA}/40`);
  T.check('المستقيم ≥ ٩٥٪', ok >= 38, ok); T.check('السهم ≥ ٨٥٪', okA >= 34, okA);
})();
// الرسم الحر لا يتحول إلى شكل
(() => {
  let fp = 0;
  for (let i = 0; i < 40; i++) {
    const pts = []; let x = 300, y = 300;
    for (let k = 0; k < 60; k++) { x += (rnd() - 0.5) * 40; y += (rnd() - 0.3) * 30; pts.push([x, y]); }
    const r = R.recognize(pts, { scale: 1 }); if (r && r.kind !== 'freehand') fp++;
  }
  // حرف/كتابة: خط متعرج مفتوح
  const s = Array.from({ length: 50 }, (_, i) => [300 + i * 6, 300 + Math.sin(i * 0.9) * 30]);
  const r = R.recognize(s, { scale: 1 });
  console.log(`  رسم عشوائي تحوّل خطأً إلى شكل: ${fp}/40 ، موجة: ${r ? r.kind : 'بقيت حرة'}`);
  T.check('الرسم الحر يبقى حراً غالباً (≥ ٨٥٪)', fp <= 6, fp);
})();
// دقة التسوية: المربع المستوي زواياه ٩٠° تماماً وأضلاعه متساوية
(() => {
  const poly = rot(GEN.square(60), 0.4, [300, 300]);
  const r = R.recognize(hand(poly, true, 3), { scale: 1 });
  const m = R.measure(r, 40);
  T.check('المربع بعد التسوية: زوايا ٩٠° وأضلاع متساوية', r.kind === 'square' && m.angles.every((a) => Math.abs(a - 90) < 1e-6) && Math.max(...m.sides) - Math.min(...m.sides) < 1e-6, JSON.stringify(m.angles));
  const t = R.recognize(hand(rot(GEN.rtri(60), 1.1, [300, 300]), true, 3), { scale: 1 });
  const mt = R.measure(t, 40);
  T.check('المثلث القائم بعد التسوية فيه زاوية ٩٠° تماماً', t.kind === 'rtri' && mt.angles.some((a) => Math.abs(a - 90) < 1e-6), JSON.stringify(mt.angles));
})();
// التعلّم: شكل يعلّمه المستخدم (رسم «قلب» يُحفظ كرسم حر، ومثلث مائل جداً يُعلَّم أنه مثلث قائم)
(() => {
  const weird = Array.from({ length: 40 }, (_, i) => { const t = (2 * PI * i) / 39; return [300 + 60 * Math.sin(t) ** 3, 300 - (50 * Math.cos(t) - 20 * Math.cos(2 * t) - 8 * Math.cos(3 * t))]; });
  const before = R.recognize(weird, { scale: 1 });
  const samples = [{ label: 'freehand', d: R.descriptor(weird) }];
  const after = R.recognize(weird.map(([x, y]) => [x * 1.1 + 5, y * 1.05]), { scale: 1, samples });
  T.check('التعلّم: الشكل الذي صحّحه المستخدم إلى «رسم حر» يبقى حراً', after && after.kind === 'freehand', `قبل: ${before && before.kind}`);
  const tri = hand(rot(GEN.triangle(60), 0.2, [300, 300]), true, 2);
  const s2 = [{ label: 'rtri', d: R.descriptor(tri) }];
  const r2 = R.recognize(hand(rot(GEN.triangle(62), 0.22, [310, 305]), true, 2), { scale: 1, samples: s2 });
  T.check('التعلّم: يطبّق التصنيف الذي علّمه المستخدم على رسم مشابه', r2 && r2.kind === 'rtri', r2 && r2.kind);
})();
// دمج خطوط منفصلة في مثلث
(() => {
  const L = (a, b) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
  const v = R.closeLines([L([0, 0], [100, 0]), L([100, 0], [3, 98]), L([0, 102], [0, 2])], 10);
  T.check('دمج ثلاثة مستقيمات متلاقية في مثلث', v && v.length === 3 && R.fromVertices(v).kind === 'rtri', v && R.fromVertices(v).kind);
})();
process.exitCode = T.report('اختبار التعرّف على الأشكال');
