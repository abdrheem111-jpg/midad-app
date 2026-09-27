/* اختبار المجسمات: الحجم والمساحة من القوانين مقابل القياس المباشر من الأوجه، وانغلاق الشبكات عند الطي */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/solids.js');
const S = M.solids;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function meshArea(faces) { let A = 0; faces.forEach((f) => { for (let i = 1; i + 1 < f.p.length; i++) { const c = cross(sub(f.p[i], f.p[0]), sub(f.p[i + 1], f.p[0])); A += Math.hypot(...c) / 2; } }); return A; }
// الحجم بمبرهنة التباعد، مع توجيه كل وجه للخارج بالنسبة لمركز المجسم (كل المجسمات هنا محدّبة)
function meshVolume(faces) {
  const all = faces.flatMap((f) => f.p); const c = all.reduce((a, q) => [a[0] + q[0] / all.length, a[1] + q[1] / all.length, a[2] + q[2] / all.length], [0, 0, 0]);
  let V = 0;
  faces.forEach((f) => { for (let i = 1; i + 1 < f.p.length; i++) { const a = sub(f.p[0], c), b = sub(f.p[i], c), d = sub(f.p[i + 1], c); V += Math.abs(dot(a, cross(b, d))) / 6; } });
  return V;
}
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-9, Math.abs(b));
const val = (rows, name) => (rows.find((r) => r.name === name) || {}).value;

for (const [key, def] of Object.entries(S.SOLIDS)) {
  for (let k = 0; k < 20; k++) {
    // أبعاد عشوائية ضمن المدى
    const p = Object.fromEntries(def.params.map((q) => [q.k, +(q.min + Math.random() * (q.max - q.min)).toFixed(2)]));
    if (key === 'frustum' && p.r2 >= p.r1) p.r2 = p.r1 * 0.5;
    const faces = def.build(p).faces;
    const rows = def.calc(p);
    const curved = !def.vef;
    const tol = curved ? 0.02 : 1e-6;
    const V = val(rows, 'الحجم');
    T.check(`${def.name}: الحجم يطابق القياس من الأوجه`, rel(meshVolume(faces), V) < tol, `${meshVolume(faces).toFixed(4)} ≠ ${V.toFixed(4)} ${JSON.stringify(p)}`);
    const A = val(rows, 'المساحة الكلية') ?? val(rows, 'مساحة السطح');
    T.check(`${def.name}: المساحة الكلية تطابق القياس من الأوجه`, rel(meshArea(faces), A) < tol, `${meshArea(faces).toFixed(4)} ≠ ${A.toFixed(4)} ${JSON.stringify(p)}`);
    if (def.vef) {
      const [v, e, f] = def.vef;
      T.check(`${def.name}: صيغة أويلر ر − ح + و = ٢`, v - e + f === 2 && faces.length === f, `${faces.length} وجه`);
    }
  }
}

// الشبكات: عند الطي الكامل يجب أن تنغلق وتطابق المجسم
for (const [key, def] of Object.entries(S.SOLIDS)) {
  if (!def.net) continue;
  for (let k = 0; k < 10; k++) {
    const p = Object.fromEntries(def.params.map((q) => [q.k, +(q.min + Math.random() * (q.max - q.min)).toFixed(2)]));
    const flat = S.netFaces(def.net, p, 0);
    T.check(`${def.name}: الشبكة مسطحة عند البداية`, flat.every((f) => f.p.every((q) => Math.abs(q[1]) < 1e-6)));
    const folded = S.netFaces(def.net, p, 1);
    const solidA = val(def.calc(p), 'المساحة الكلية');
    T.check(`${def.name}: مساحة الشبكة = المساحة الكلية للمجسم`, rel(meshArea(flat), solidA) < (def.vef ? 1e-6 : 0.02), `${meshArea(flat).toFixed(3)} ≠ ${solidA.toFixed(3)}`);
    T.check(`${def.name}: الشبكة المطوية فوق الأرض`, folded.every((f) => f.p.every((q) => q[1] > -1e-6)));
    if (def.vef) {
      // كل رأس بعد الطي يلتقي فيه ٣ أوجه على الأقل (المجسم مغلق)
      const pts = []; folded.forEach((f, fi) => f.p.forEach((q) => pts.push([q, fi])));
      const closed = pts.every(([q, fi]) => new Set(pts.filter(([r]) => Math.hypot(...sub(q, r)) < 1e-6).map(([, g]) => g)).size >= 3);
      T.check(`${def.name}: الشبكة تنغلق إلى مجسم`, closed);
      T.check(`${def.name}: حجم الشبكة المطوية = حجم المجسم`, rel(meshVolume(folded), val(def.calc(p), 'الحجم')) < 1e-6, `${meshVolume(folded).toFixed(4)}`);
    } else {
      T.check(`${def.name}: حجم الشبكة المطوية ≈ حجم المجسم`, rel(meshVolume(folded), val(def.calc(p), 'الحجم')) < 0.03, `${meshVolume(folded).toFixed(3)} ≠ ${val(def.calc(p), 'الحجم').toFixed(3)}`);
    }
  }
}
process.exitCode = T.report('اختبار المجسمات والشبكات');
