/* اختبار المساعد الذكي: فهم ما كُتب أو حُدّد واقتراح الخطوة التالية المناسبة */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/solids.js', 'js/shape-rec.js', 'js/netfold.js', 'js/assist-core.js');
const A = M.assistCore;
const CASES = [
  ['٢س + ٣ = ١١', 'equation', 'solve'], ['س² - ٥س + ٦ = ٠', 'equation', 'solve', (r) => r.deg === 2 && r.sugg.some((s) => s.id === 'factor_eq')],
  ['ص = ٢س + ١', 'function', 'graph', (r) => r.deg === 1], ['ص = س² - ٤', 'function', 'graph', (r) => r.deg === 2], ['ص = جا(س)', 'function', 'graph'],
  ['٢س + ص = ٦', 'relation', 'graph_rel'], ['س + ص = ٧\n٢س - ص = ٥', 'system', 'solve'], ['٣س - ٢ > ٧', 'ineq', 'solve', (r) => r.sugg.some((s) => s.id === 'numberline')],
  ['س² - ٩', 'expr', 'simplify', (r) => r.sugg.some((s) => s.id === 'factor')], ['(س + ٢)(س - ٣)', 'expr', 'simplify'], ['٣/٤', 'fraction', 'fraction_viz'],
  ['١٢ × ١٥ + ٧', 'calc', 'calc'], ['٤ ٨ ١٥ ١٦ ٢٣ ٤٢', 'data', 'stats'], ['ع = س² + ص²', 'surface', 'graph3d'], ['٢ + ٢ = ٤', 'check', 'solve'],
];
for (const [t, kind, first, extra] of CASES) {
  const r = A.analyzeText(t);
  const primary = r && (r.sugg.find((s) => s.primary) || r.sugg[0]).id;
  T.check(`«${t}» ⇐ ${kind} / ${first}`, r && r.kind === kind && primary === first && (!extra || extra(r)), r && `${r.kind} ${primary}`);
}
// المتباينات عددياً
const iv = (t) => JSON.stringify(A.solveIneq(t).intervals);
T.check('٣س − ٢ > ٧ ⇐ س > ٣', iv('3x-2>7') === JSON.stringify([[3, null]]).replace('null', 'Infinity') || (A.solveIneq('3x-2>7').intervals.length === 1 && A.solveIneq('3x-2>7').intervals[0][0] === 3 && A.solveIneq('3x-2>7').intervals[0][1] === Infinity), iv('3x-2>7'));
T.check('س² − ٤ < ٠ ⇐ −٢ < س < ٢', (() => { const r = A.solveIneq('x^2-4<0').intervals; return r.length === 1 && r[0][0] === -2 && r[0][1] === 2; })(), iv('x^2-4<0'));
T.check('س² − ٤ ≥ ٠ ⇐ فترتان مغلقتان', (() => { const r = A.solveIneq('x^2-4>=0'); return r.intervals.length === 2 && r.inclusive; })(), iv('x^2-4>=0'));
// التحديد على السبورة
const sq = (x, y, s) => ({ type: 'poly', pts: [[x, y], [x + s, y], [x + s, y + s], [x, y + s]] });
const cube = [[0, 1], [1, 1], [2, 1], [3, 1], [1, 0], [1, 2]].map(([c, r]) => sq(c * 80, r * 80, 80));
T.check('تحديد شبكة مكعب ⇐ اقتراح الطي', A.analyzeSelection(cube, { unit: 40 }).kind === 'net');
T.check('تحديد ٦ مربعات لا تصنع مكعباً ⇐ شرح السبب', A.analyzeSelection([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]].map(([c, r]) => sq(c * 80, r * 80, 80)), { unit: 40 }).kind === 'badnet');
T.check('تحديد مربع واحد ⇐ قياسات وتحويلات', (() => { const r = A.analyzeSelection([sq(0, 0, 100)]); return r.kind === 'shape' && r.shapeKind === 'square' && ['measure', 'reflect', 'rotate', 'translate', 'symmetry'].every((k) => r.sugg.some((s) => s.id === k)); })());
T.check('تحديد دالتين ⇐ التقاطع', A.analyzeSelection([{ type: 'fn', expr: 'x' }, { type: 'fn', expr: 'x^2' }]).kind === 'fn2');
T.check('تحديد مستقيمين متلاقيين ⇐ قياس الزاوية', A.analyzeSelection([{ type: 'line', x1: 0, y1: 0, x2: 100, y2: 0 }, { type: 'line', x1: 0, y1: 0, x2: 60, y2: -80 }]).sugg[0].id === 'angle');
T.check('تحديد نص رياضي ⇐ تحليل النص', A.analyzeSelection([{ type: 'text', text: 'ص = س² − ١' }]).kind === 'function');
// محاور التماثل
const hexPts = Array.from({ length: 6 }, (_, i) => [100 * Math.cos((i * Math.PI) / 3), 100 * Math.sin((i * Math.PI) / 3)]);
T.check('السداسي المنتظم له ٦ محاور تماثل', A.symmetryAxes({ type: 'poly', pts: hexPts }).count === 6 && A.symmetryAxes({ type: 'poly', pts: hexPts }).lines.length === 6);
T.check('المربع ٤ محاور، المستطيل ٢، المثلث المتطابق الأضلاع ٣', A.symmetryAxes({ type: 'rect', x1: 0, y1: 0, x2: 100, y2: 100 }).count === 4 && A.symmetryAxes({ type: 'rect', x1: 0, y1: 0, x2: 200, y2: 100 }).count === 2 && A.symmetryAxes({ type: 'poly', pts: [[0, 0], [100, 0], [50, 86.6025]] }).count === 3);
T.check('دائرة على المستوى الإحداثي ⇐ معادلة الدائرة', A.analyzeSelection([{ type: 'ellipse', x1: -80, y1: -80, x2: 80, y2: 80 }], { coord: true }).sugg.some((s) => s.id === 'circle_eq'));
T.check('مضلع على المستوى الإحداثي ⇐ إحداثيات الرؤوس', A.analyzeSelection([sq(0, 0, 80)], { coord: true }).sugg.some((s) => s.id === 'vertex_coords'));
T.check('متباينة بمتغيرين ⇐ تظليل المنطقة', A.analyzeText('ص > ٢س + ١').kind === 'ineq_xy' && A.analyzeText('ص > ٢س + ١').sugg[0].id === 'region');
T.check('نظام متباينات ⇐ المنطقة المشتركة', A.analyzeText('ص ≥ س\nص < ٤').kind === 'ineq_system');
T.check('متباينة بدلالة س ⇐ خيار المستوى الإحداثي', A.analyzeText('س ≤ ٣').sugg.some((s) => s.id === 'region'));
process.exitCode = T.report('اختبار المساعد الذكي');
