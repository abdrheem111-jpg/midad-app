/* اختبار تحويل الشبكات المرسومة إلى مجسمات: كل شبكات المكعب الإحدى عشرة، وشبكات غير صالحة، وبقية المجسمات */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/solids.js', 'js/netfold.js');
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const U = 40;
const jit = (polys, a) => polys.map((p) => p.map(([x, y]) => [x + (rnd() - 0.5) * a, y + (rnd() - 0.5) * a]));
const cells = (list, size, ox, oy) => list.map(([c, r]) => [[ox + c * size, oy + r * size], [ox + (c + 1) * size, oy + r * size], [ox + (c + 1) * size, oy + (r + 1) * size], [ox + c * size, oy + (r + 1) * size]]);
const rel = (a, b) => Math.abs(a - b) / b;
const CUBE_NETS = [];
for (const [a, b] of [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]]) CUBE_NETS.push([[0, 1], [1, 1], [2, 1], [3, 1], [a, 0], [b, 2]]);
for (const b of [1, 2, 3]) CUBE_NETS.push([[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [b, 2]]);
CUBE_NETS.push([[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]]);
CUBE_NETS.push([[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]]);
CUBE_NETS.forEach((net, i) => {
  const size = U * (2 + rnd() * 2);
  const r = M.netFold.detect(jit(cells(net, size, 100, 80), size * 0.03), { unit: U });
  const a = size / U;
  T.check(`شبكة المكعب رقم ${i + 1} تنطوي إلى مكعب`, r.ok && r.key === 'cube' && rel(r.volume, a ** 3) < 0.08, `${r.message || ''} ${r.volume}`);
});
// شبكات من ٦ مربعات لا تصنع مكعباً
[
  ['مستطيل ٢×٣', [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]],
  ['خمسة في صف', [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1]]],
  ['حرف L مزدوج', [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1]]],
].forEach(([n, net]) => { const r = M.netFold.detect(cells(net, 100, 0, 0), { unit: U }); T.check(`${n}: يُرفض مع شرح السبب`, !r.ok && !!r.message, r.message); });
// متوازي المستطيلات
(() => {
  const l = 4 * U, w = 2 * U, h = 1.5 * U;
  const R = (x, y, W, H) => [[x, y], [x + W, y], [x + W, y + H], [x, y + H]];
  const net = [R(0, 0, l, w), R(0, -h, l, h), R(0, w, l, h), R(0, w + h, l, w), R(-h, 0, h, w), R(l, 0, h, w)];
  const r = M.netFold.detect(jit(net, 2), { unit: U });
  T.check('متوازي المستطيلات', r.ok && r.key === 'cuboid' && rel(r.volume, 4 * 2 * 1.5) < 0.05, `${r.message} ${r.volume}`);
})();
// هرم رباعي: قاعدة ومثلثات ارتفاعها الجانبي s
(() => {
  const a = 3 * U, s = 2.5 * U;
  const net = [[[0, 0], [a, 0], [a, a], [0, a]], [[0, 0], [a / 2, -s], [a, 0]], [[a, 0], [a + s, a / 2], [a, a]], [[a, a], [a / 2, a + s], [0, a]], [[0, a], [-s, a / 2], [0, 0]]];
  const r = M.netFold.detect(jit(net, 2), { unit: U });
  const H = Math.sqrt(2.5 ** 2 - 1.5 ** 2);
  T.check('هرم رباعي', r.ok && r.key === 'pyramid4' && rel(r.volume, (9 * H) / 3) < 0.05, `${r.message} ${r.volume}`);
  // مثلثات قصيرة جداً
  const bad = [[[0, 0], [a, 0], [a, a], [0, a]], [[0, 0], [a / 2, -a * 0.4], [a, 0]], [[a, 0], [a + a * 0.4, a / 2], [a, a]], [[a, a], [a / 2, a * 1.4], [0, a]], [[0, a], [-a * 0.4, a / 2], [0, 0]]];
  const rb = M.netFold.detect(bad, { unit: U });
  T.check('هرم بمثلثات قصيرة يُرفض مع شرح', !rb.ok && /قصيرة/.test(rb.message), rb.message);
})();
// منشور ثلاثي ومنشور سداسي من شبكات مختلفة الترتيب
(() => {
  const a = 2 * U, h = 3 * U, t = (a * Math.sqrt(3)) / 2;
  const R = (x) => [[x, 0], [x + a, 0], [x + a, h], [x, h]];
  const net = [R(0), R(a), R(2 * a), [[a, 0], [a + a / 2, -t], [2 * a, 0]], [[a, h], [2 * a, h], [a + a / 2, h + t]]];
  const r = M.netFold.detect(jit(net, 1.5), { unit: U });
  T.check('منشور ثلاثي (المثلثان على المستطيل الأوسط)', r.ok && r.key === 'prism3' && rel(r.volume, (Math.sqrt(3) / 4) * 4 * 3) < 0.05, `${r.message} ${r.volume}`);
  const hexNet = []; for (let i = 0; i < 6; i++) hexNet.push([[i * a, 0], [(i + 1) * a, 0], [(i + 1) * a, h], [i * a, h]]);
  const hx = (cx, cy, up) => Array.from({ length: 6 }, (_, i) => { const q = (PI) => 0; void q; const ang = (Math.PI / 3) * i; return [cx + a * Math.cos(ang), cy + (up ? -1 : 1) * a * Math.sin(ang)]; });
  const ap = (a * Math.sqrt(3)) / 2;
  hexNet.push(hx(2 * a + a / 2, -ap, true).map(([x, y]) => [x, y]), hx(3 * a + a / 2, h + ap, false));
  const rh = M.netFold.detect(jit(hexNet, 1.5), { unit: U });
  T.check('منشور سداسي', rh.ok && rh.key === 'prism6' && rel(rh.volume, ((3 * Math.sqrt(3)) / 2) * 4 * 3) < 0.05, `${rh.message} ${rh.volume}`);
})();
// رباعي الأوجه وثماني الأوجه
(() => {
  const a = 3 * U, t = (a * Math.sqrt(3)) / 2;
  const tet = [[[0, 0], [a, 0], [a / 2, t]], [[0, 0], [a / 2, -t], [a, 0]], [[a, 0], [1.5 * a, t], [a / 2, t]], [[a / 2, t], [-a / 2, t], [0, 0]]];
  const r = M.netFold.detect(jit(tet, 1.5), { unit: U });
  T.check('رباعي الأوجه', r.ok && r.key === 'tetra' && rel(r.volume, 27 / (6 * Math.SQRT2)) < 0.05, `${r.message} ${r.volume}`);
  // شبكة ثماني الأوجه: شريط من ٨ مثلثات متعاقبة ليس شبكة صالحة؛ نستخدم الترتيب المعروف (٦ في شريط + مثلثان)
  const strip = []; for (let i = 0; i < 6; i++) { const x = (i >> 1) * a + (i % 2 ? a / 2 : 0); strip.push(i % 2 ? [[x, t], [x + a, t], [x + a / 2, 0]] : [[x, 0], [x + a, 0], [x + a / 2, t]]); }
  strip.push([[a / 2, t], [1.5 * a, t], [a, 2 * t]]); strip.push([[a, 0], [2 * a, 0], [1.5 * a, -t]]);
  const ro = M.netFold.detect(jit(strip, 1.5), { unit: U });
  T.check('ثماني الأوجه', ro.ok && ro.key === 'octa' && rel(ro.volume, (Math.SQRT2 / 3) * 27) < 0.06, `${ro.message} ${ro.volume}`);
})();
// أسطوانة
(() => {
  const r = 1 * U, W = 2 * Math.PI * r, H = 3 * U;
  const res = M.netFold.detect([[[0, 0], [W, 0], [W, H], [0, H]]], { unit: U, circles: [{ c: [W / 2, -r], r }, { c: [W / 2, H + r], r }] });
  T.check('أسطوانة (مستطيل + دائرتان)', res.ok && res.key === 'cylinder' && rel(res.volume, Math.PI * 3) < 0.01, res.message);
  const bad = M.netFold.detect([[[0, 0], [W / 2, 0], [W / 2, H], [0, H]]], { unit: U, circles: [{ c: [W / 4, -r], r }, { c: [W / 4, H + r], r }] });
  T.check('أسطوانة بمستطيل قصير تُرفض مع ذكر المحيط', !bad.ok && /محيط/.test(bad.message), bad.message);
})();
// أوجه منفصلة
(() => { const r = M.netFold.detect(cells([[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [5, 5]], 100, 0, 0), { unit: U }); T.check('وجه منفصل يُرفض', !r.ok && /ملتصقة/.test(r.message), r.message); })();
// الطي التدريجي: مسطحة عند ٠
(() => { const r = M.netFold.detect(cells(CUBE_NETS[0], 100, 0, 0), { unit: U }); T.check('الشبكة مسطحة عند بداية الطي', M.netFold.foldAt(r, 0).every((f) => f.p.every((p) => Math.abs(p[1]) < 1e-9))); })();
process.exitCode = T.report('اختبار تحويل الشبكات إلى مجسمات');
