/* اختبار استنتاج معادلة المنحنى المرسوم باليد (مع اهتزاز اليد) */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/curvefit.js');
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noisy = (pts, amp) => { let wob = 0; return pts.map(([x, y]) => { wob = wob * 0.85 + (rnd() - 0.5) * amp; return [x + (rnd() - 0.5) * amp * 0.5, y + wob]; }); };
const curve = (f, a, b, n) => Array.from({ length: n || 60 }, (_, i) => { const x = a + ((b - a) * i) / ((n || 60) - 1); return [x, f(x)]; });
const same = (c, e) => e.every((v, i) => Math.abs((c[i] || 0) - v) < 1e-9) && c.slice(e.length).every((v) => Math.abs(v) < 1e-9);
const CASES = [
  ['ص = ٢س + ١', (x) => 2 * x + 1, -3, 3, 'line', [1, 2]],
  ['ص = −س + ٣', (x) => -x + 3, -2, 5, 'line', [3, -1]],
  ['ص = ½س − ٢', (x) => 0.5 * x - 2, -4, 4, 'line', [-2, 0.5]],
  ['ص = ٣', () => 3, -4, 4, 'line', [3]],
  ['ص = س² − ٢', (x) => x * x - 2, -2.5, 2.5, 'quad', [-2, 0, 1]],
  ['ص = −س² + ٤', (x) => -x * x + 4, -2.5, 2.5, 'quad', [4, 0, -1]],
  ['ص = (س − ١)²', (x) => (x - 1) ** 2, -1.5, 3.5, 'quad', [1, -2, 1]],
  ['ص = ½س²', (x) => 0.5 * x * x, -3, 3, 'quad', [0, 0, 0.5]],
  ['ص = س³ − ٣س', (x) => x ** 3 - 3 * x, -2.1, 2.1, 'cubic', [0, -3, 0, 1]],
];
for (const [name, f, a, b, kind, co] of CASES) {
  let ok = 0; const N = 30; const bad = [];
  for (let k = 0; k < N; k++) {
    const span = Math.hypot(b - a, 4);
    const r = M.curveFit.fit(noisy(curve(f, a, b), 0.05 * span));
    if (r && r.kind === kind && same(r.coeffs, co)) ok++; else bad.push(r ? r.eq : 'null');
  }
  console.log(`  ${name.padEnd(14)} ${ok}/${N}${bad.length ? '  أمثلة: ' + [...new Set(bad)].slice(0, 3).join(' | ') : ''}`);
  T.check(`${name}: ≥ ٩٠٪`, ok / N >= 0.9, `${ok}/${N}`);
}

// ---- عائلات الدوال الأخرى ----
const FAM = [
  ['ص = |س|', (x) => Math.abs(x), -3, 3, 'abs', (r) => r.params.a === 1 && r.params.h === 0 && r.params.k === 0],
  ['ص = ٢|س − ١| − ٣', (x) => 2 * Math.abs(x - 1) - 3, -1.5, 3.5, 'abs', (r) => r.params.a === 2 && r.params.h === 1 && r.params.k === -3],
  ['ص = −|س + ٢| + ٤', (x) => -Math.abs(x + 2) + 4, -5, 1, 'abs', (r) => r.params.a === -1 && r.params.h === -2 && r.params.k === 4],
  ['ص = √س', (x) => Math.sqrt(x), 0, 9, 'sqrt', (r) => r.params.a === 1 && r.params.h === 0 && r.params.k === 0],
  ['ص = ٢√(س − ١) + ١', (x) => 2 * Math.sqrt(x - 1) + 1, 1, 7, 'sqrt', (r) => r.params.a === 2 && r.params.h === 1 && r.params.k === 1],
  ['ص = ٢^س', (x) => 2 ** x, -3, 3, 'exp', (r) => r.params.b === 2 && r.params.a === 1 && r.params.k === 0],
  ['ص = (½)^س', (x) => 0.5 ** x, -3, 3, 'exp', (r) => r.params.b === 0.5 && r.params.a === 1],
  ['ص = ٣^س − ٢', (x) => 3 ** x - 2, -2.5, 1.8, 'exp', (r) => r.params.b === 3 && r.params.k === -2],
  ['ص = لوهـ(س)', (x) => Math.log(x), 0.15, 8, 'log'],
  ['ص = لو₂(س)', (x) => Math.log2(x), 0.2, 8, 'log'],
  ['ص = جا(س)', (x) => Math.sin(x), -6.5, 6.5, 'sin', (r) => /جا/.test(r.eq) && r.params.B === 1 && Math.abs(r.params.A - 1) < 1e-9],
  ['ص = ٢جتا(س)', (x) => 2 * Math.cos(x), -6.5, 6.5, 'sin', (r) => /جتا/.test(r.eq) && r.params.A === 2],
  ['ص = جا(٢س) + ١', (x) => Math.sin(2 * x) + 1, -3.3, 3.3, 'sin', (r) => r.params.B === 2 && r.params.D === 1],
  ['ص = ١/س (فرع)', (x) => 1 / x, 0.25, 4, 'rational', (r) => r.params.a === 1 && r.params.h === 0 && r.params.k === 0],
  ['ص = ٢/(س − ١) + ١', (x) => 2 / (x - 1) + 1, 1.3, 6, 'rational', (r) => r.params.a === 2 && r.params.h === 1 && r.params.k === 1],
];
// مستويان من اهتزاز اليد: معتاد (يجب أن ينجح) وخشن (للاطلاع)
for (const [lvl, amp, must] of [['معتاد', 0.02, true], ['خشن', 0.035, false]]) {
  let famOk = 0, famTot = 0;
  console.log(`  — اهتزاز ${lvl}:`);
  for (const [name, f, a, b, kind, chk] of FAM) {
    let ok = 0; const N = 25; const bad = [];
    for (let k = 0; k < N; k++) {
      const ys = curve(f, a, b).map((p) => p[1]);
      const span = Math.hypot(b - a, Math.max(...ys) - Math.min(...ys));
      const r = M.curveFit.fit(noisy(curve(f, a, b, 70), amp * span));
      if (r && r.kind === kind && (!chk || chk(r))) ok++; else bad.push(r ? `${r.kind}: ${r.eq}` : 'null');
    }
    famOk += ok; famTot += N;
    console.log(`    ${name.padEnd(18)} ${ok}/${N}${bad.length ? '  أمثلة: ' + [...new Set(bad)].slice(0, 2).join(' | ') : ''}`);
    if (must) T.check(`${name} (اهتزاز معتاد): ≥ ٨٠٪`, ok / N >= 0.8, `${ok}/${N}`);
  }
  console.log(`    الإجمالي (${lvl}): ${(100 * famOk / famTot).toFixed(1)}٪`);
}
// تحديد نوع الدالة مسبقاً يرفع الدقة حتى مع الاهتزاز الخشن
(() => {
  let ok = 0;
  for (let k = 0; k < 25; k++) { const r = M.curveFit.fit(noisy(curve(Math.sqrt, 0, 9, 70), 0.035 * 9.5), { only: 'sqrt' }); if (r && r.kind === 'sqrt' && r.params.a === 1 && r.params.h === 0) ok++; }
  console.log(`  √س مع تحديد النوع مسبقاً (اهتزاز خشن): ${ok}/25`);
  T.check('تحديد النوع مسبقاً ≥ ٨٠٪ حتى مع الاهتزاز الخشن', ok >= 20, ok);
})();
// الدوائر
(() => {
  let ok = 0;
  for (let k = 0; k < 30; k++) {
    const pts = Array.from({ length: 70 }, (_, i) => { const t = (2 * Math.PI * i) / 66; return [1 + 2 * Math.cos(t), -1 + 2 * Math.sin(t)]; });
    const r = M.curveFit.fit(noisy(pts, 0.12));
    if (r && r.kind === 'circle' && r.center[0] === 1 && r.center[1] === -1 && r.r === 2) ok++;
  }
  console.log(`  دائرة مركزها (١، −١) ونصف قطرها ٢: ${ok}/30`);
  T.check('الدائرة ≥ ٩٠٪', ok >= 27, ok);
})();
// أشكال ليست دوال يجب ألا تُعطى معادلة خاطئة
(() => {
  const square = [[0, 0], [3, 0], [3, 3], [0, 3], [0, 0.1]].flatMap((p, i, arr) => i ? curve((x) => 0, 0, 0, 1).map(() => p) : [p]);
  const zig = Array.from({ length: 40 }, (_, i) => [i * 0.15, i % 2 ? 1.5 : 0]);
  const loop = Array.from({ length: 60 }, (_, i) => { const t = (3 * Math.PI * i) / 59; return [t * 0.4 + Math.cos(t), Math.sin(t)]; });
  const sq = Array.from({ length: 80 }, (_, i) => { const s = i / 20, e = Math.floor(s), u = s - e; return [[u * 3, 0], [3, u * 3], [3 - u * 3, 3], [0, 3 - u * 3]][e % 4]; });
  [['مربع', sq], ['متعرّج', zig], ['حلقة', loop]].forEach(([n, p]) => { const r = M.curveFit.fit(p); T.check(`${n}: لا يُعطى معادلة`, !r || r.kind === 'vline' ? !r : false, r && r.eq); });
  void square;
})();
process.exitCode = T.report('اختبار معادلات المنحنيات المرسومة');
