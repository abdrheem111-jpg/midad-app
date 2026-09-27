/* اختبار محرك الرياضيات بمسائل من المنهج (الصفوف ١–١٢) */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/math-plus.js');
const E = M.math, P = M.mathPlus;

const near = (a, b, tol) => Math.abs(a - b) <= (tol || 1e-6) * Math.max(1, Math.abs(b));
function nums(res) {
  if (res.roots) return res.roots.slice().sort((a, b) => a - b);
  if (res.sol) return res.sol;
  if (res.value !== undefined) return [res.value];
  return [];
}
function expectNums(name, res, exp, tol) {
  const got = nums(res);
  const ok = got.length === exp.length && exp.every((e, i) => near(got[i], e, tol));
  T.check(name, ok, `المتوقع ${JSON.stringify(exp)} ، الناتج ${JSON.stringify(got)} | ${T.west(res.answer)}`);
}
function expectText(name, res, sub) {
  const a = T.west(res.answer);
  T.check(name, a.includes(sub), `المتوقع أن يحتوي "${sub}" ، الناتج "${a}"`);
}
const solve = (s) => E.solve(s);

/* ---- الحساب والأعداد (الصفوف ١–٦) ---- */
[
  ['٥ + ٧', 12], ['٢٣ + ٤٨', 71], ['٩٠٠ - ٤٥٦', 444], ['٧ × ٨', 56], ['١٤٤ ÷ ١٢', 12], ['٣٫٥ + ٢٫٢٥', 5.75],
  ['٣ + ٤ × ٥', 23], ['(٣ + ٤) × ٥', 35], ['٢^١٠', 1024], ['√٢٢٥', 15], ['٥!', 120], ['-٨ + ٣', -5], ['-٣ × -٤', 12],
  ['٢٥٪ × ٨٠', 20], ['١/٢ + ١/٣', 5 / 6], ['٣/٤ × ٨', 6], ['١٢ ÷ ٣/٤', 16], ['٠٫١ + ٠٫٢', 0.3], ['2*(3+4)^2', 98], ['10 - 2 - 3', 5],
  ['12 / 2 / 3', 2], ['2^3^2', 512], ['-2^2', -4], ['(-2)^2', 4], ['|−٧|', 7], ['∛٢٧', 3], ['٦ ÷ ٢(١ + ٢)', 9],
  ['جا(٣٠)', 0.5], ['جتا(٦٠)', 0.5], ['ظا(٤٥)', 1], ['جا(٩٠)', 1], ['جتا(١٨٠)', -1], ['لو(١٠٠٠)', 3], ['لو_٢(٣٢)', 5], ['لوهـ(هـ)', 1], ['ln(e^3)', 3],
].forEach(([s, v]) => expectNums('حساب: ' + s, solve(s), [v]));

/* ---- المعادلات الخطية (الصفوف ٦–٨) ---- */
[
  ['س + ٥ = ١٢', [7]], ['٣س = ٢١', [7]], ['٢س + ٣ = ١١', [4]], ['٥س - ٧ = ٣س + ٩', [8]], ['٣(س - ٢) = ٢س + ١', [7]],
  ['س/٤ = ٣', [12]], ['(س + ٣)/٢ = ٥', [7]], ['٠٫٥س + ٢ = ٥', [6]], ['٢(٣س - ١) - ٤ = ٣(س + ٢)', [4]], ['7 - 2x = 3x - 8', [3]],
  ['x/3 + x/6 = 5', [10]], ['ص - ٤ = ١٠', [14]], ['٤ع = -٢٠', [-5]],
].forEach(([s, r]) => expectNums('خطية: ' + s, solve(s), r));

/* ---- التربيعية وكثيرات الحدود (الصفوف ٩–١١) ---- */
[
  ['س² - ٥س + ٦ = ٠', [2, 3]], ['س² = ٤٩', [-7, 7]], ['س² - ٩ = ٠', [-3, 3]], ['٢س² + ٣س - ٢ = ٠', [-2, 0.5]], ['س² - ٦س + ٩ = ٠', [3]],
  ['س² + ٤س = ٠', [-4, 0]], ['(س - ١)(س + ٤) = ٠', [-4, 1]], ['س(س - ٣) = ١٠', [-2, 5]], ['٣س² = ٢٧', [-3, 3]], ['x^2 - 2x - 1 = 0', [1 - Math.SQRT2, 1 + Math.SQRT2]],
  ['س³ - ٦س² + ١١س - ٦ = ٠', [1, 2, 3]], ['س³ - ٨ = ٠', [2]], ['س⁴ - ٥س² + ٤ = ٠', [-2, -1, 1, 2]], ['٢^س = ٣٢', [5]], ['٣^(س+١) = ٨١', [3]],
  ['√(س + ٣) = ٤', [13]], ['|س - ٢| = ٥', [-3, 7]], ['لو(س) = ٢', [100]],
].forEach(([s, r]) => expectNums('معادلة: ' + s, solve(s), r, 1e-5));
T.check('تربيعية بلا حل حقيقي', T.west(solve('س² + ١ = ٠').answer).includes('لا توجد حلول حقيقية'));

/* ---- المعادلات المثلثية (الصفان ١١–١٢) ---- */
expectNums('جا س = ½', solve('جا س = ٠٫٥'), [30, 150], 1e-5);
expectNums('جتا س = ٠', solve('جتا س = ٠'), [90, 270], 1e-5);
expectNums('٢جا س - ١ = ٠', solve('٢جا س - ١ = ٠'), [30, 150], 1e-5);
expectNums('ظا س = ١', solve('ظا س = ١'), [45, 225], 1e-5);

/* ---- المتباينات ---- */
expectText('٣س - ٤ > ٨', solve('٣س - ٤ > ٨'), 'س > 4');
expectText('-٢س + ١ ≤ ٧', solve('-٢س + ١ ≤ ٧'), 'س ≥ -3');
expectText('س² - ٩ < ٠', solve('س² - ٩ < ٠'), '(-3, 3)');
expectText('س² - ٤ ≥ ٠', solve('س² - ٤ ≥ ٠'), '(-∞, -2] ∪ [2, ∞)');

/* ---- الأنظمة ---- */
[
  [['س + ص = ١٠', '٢س - ص = ٢'], [4, 6]], [['٣س + ٢ص = ١٢', 'س - ص = -١'], [2, 3]], [['x + y + z = 6', 'x - y + z = 2', '2x + y - z = 1'], [1, 2, 3]],
  [['ص = ٢س + ١', 'ص = -س + ٧'], [2, 5]],
].forEach(([eqs, r]) => { const res = solve(eqs.join('\n')); T.check('نظام: ' + eqs.join(' ، '), res.sol && r.every((e, i) => near(res.sol[i], e)), JSON.stringify(res.sol) + ' | ' + T.west(res.answer)); });

/* ---- التبسيط والتحليل ---- */
expectText('فك (س+٣)²', solve('(س + ٣)²'), 'س^2 + 6س + 9');
expectText('فك (س-٢)(س+٥)', solve('(س - ٢)(س + ٥)'), 'س^2 + 3س - 10');
expectText('تحليل س²-٥س+٦', solve('س² - ٥س + ٦'), '(س - 2)(س - 3)');
expectText('فرق مربعين', solve('س² - ١٦'), '(س + 4)(س - 4)');

/* ---- الاشتقاق (الصف ١٢) ---- */
function derivCheck(src, points) {
  const d = E.derivative(E.parse(src), 'x');
  const f = (x) => E.evaluate(E.parse(src), { x }, 'rad');
  const ok = points.every((x) => { const h = 1e-5; const num = (f(x + h) - f(x - h)) / (2 * h); return near(E.evaluate(d, { x }, 'rad'), num, 1e-4); });
  T.check('اشتقاق: ' + src, ok, E.toText(d));
}
['س³ - ٣س', '٥س⁴ + ٢س - ٧', 'جا(س)', 'جتا(٢س)', 'هـ^(٣س)', 'لوهـ(س)', 'س × جا(س)', '(س² + ١)/(س - ١)', '(٢س + ١)^٥', '√(س)', 'ظا(س)', 'س^٢ × هـ^س'].forEach((s) => derivCheck(s, [0.7, 1.3, 2.1]));

/* ---- التكامل (الصف ١٢) ---- */
function integralCheck(src) {
  let r;
  try { r = P.integrate(src); } catch (e) { T.check('تكامل: ' + src, false, e.message); return; }
  const f = (x) => E.evaluate(E.parse(src), { x }, 'rad');
  const Fx = (x) => E.evaluate(r.ast, { x }, 'rad');
  const ok = [0.6, 1.4, 2.2].every((x) => { const h = 1e-5; return near((Fx(x + h) - Fx(x - h)) / (2 * h), f(x), 1e-4); });
  T.check('تكامل: ' + src, ok, E.toText(r.ast));
}
['س²', '٣س² + ٢س - ٥', '٤', '١/س', 'جا(س)', 'جتا(٣س)', 'هـ^(٢س)', '(٢س + ١)^٣', '√س', '٦س^٥ - ٤س³', 'قا(س)^٢', '٢^س', '٥/(٢س + ١)', 'x^-2'].forEach(integralCheck);
[['س²', 0, 3, 9], ['٢س + ١', 1, 4, 18], ['جا(س)', 0, Math.PI, 2], ['١/س', 1, Math.E, 1], ['س³ - س', -1, 1, 0], ['هـ^(-س^٢)', 0, 1, 0.746824]].forEach(([s, a, b, v]) => expectNums(`تكامل محدود ${s} من ${a} إلى ${b}`, P.definite(s, a, b), [v], 1e-4));

/* ---- النهايات (الصفان ١١–١٢) ---- */
[['(س² - ٤)/(س - ٢)', 2, 4], ['(س² - ٩)/(س + ٣)', -3, -6], ['٣س + ١', 2, 7], ['جا(س)/س', 0, 1], ['(س³ - ١)/(س - ١)', 1, 3], ['(٢س² + ١)/(س² - ٣)', Infinity, 2], ['(س + ١)/(س² + ٥)', Infinity, 0], ['(1+1/x)^x', Infinity, Math.E]]
  .forEach(([s, a, v]) => expectNums(`نهاية ${s} عند ${a}`, P.limit(s, a), [v], 1e-3));

/* ---- قسمة كثيرات الحدود ونظرية الباقي ---- */
(() => { const r = P.polyDivide('س³ - ٢س² + ٤', 'س - ٣'); T.check('قسمة طويلة خارج', JSON.stringify(r.q) === JSON.stringify([3, 1, 1]), JSON.stringify(r.q)); T.check('قسمة طويلة باقي', r.r[0] === 13, JSON.stringify(r.r)); })();
(() => { const r = P.polyDivide('٢س³ + ٣س² - ١١س - ٦', '٢س + ١'); T.check('قسمة على ٢س+١', Math.abs(r.r[0]) < 1e-9, JSON.stringify(r)); })();
expectNums('نظرية الباقي', P.remainder('س³ - ٤س + ٦', 2), [6]);
expectNums('نظرية العوامل', P.remainder('س³ - ٦س² + ١١س - ٦', 3), [0]);

/* ---- المصفوفات (الصف ١٢) ---- */
expectNums('محدد ٢×٢', P.determinant(P.parseMatrix('3 8; 4 6')), [-14]);
expectNums('محدد ٣×٣', P.determinant(P.parseMatrix('6 1 1; 4 -2 5; 2 8 7')), [-306]);
(() => { const r = P.inverse(P.parseMatrix('4 7; 2 6')); T.check('معكوس ٢×٢', near(r.value[0][0], 0.6) && near(r.value[0][1], -0.7) && near(r.value[1][0], -0.2) && near(r.value[1][1], 0.4), JSON.stringify(r.value)); })();
(() => { const A = P.parseMatrix('2 0 1; 1 3 2; 1 1 2'); const r = P.inverse(A); const I = P.matMul(A, r.value).value; T.check('معكوس ٣×٣', I.every((row, i) => row.every((x, j) => near(x, i === j ? 1 : 0, 1e-9))), JSON.stringify(I)); })();
(() => { const r = P.matMul(P.parseMatrix('1 2; 3 4'), P.parseMatrix('5 6; 7 8')); T.check('ضرب مصفوفات', JSON.stringify(r.value) === '[[19,22],[43,50]]', JSON.stringify(r.value)); })();

/* ---- المتتابعات ---- */
expectNums('حسابية', { value: P.sequence([3, 7, 11, 15]).next }, [19]);
expectNums('هندسية', { value: P.sequence([2, 6, 18, 54]).next }, [162]);
expectNums('تربيعية', { value: P.sequence([2, 5, 10, 17]).next }, [26]);
expectNums('هندسية كسرية', { value: P.sequence([16, 8, 4, 2]).next }, [1]);

/* ---- الجذور الصماء، الصيغة العلمية، التقريب ---- */
(() => { const r = P.simplifySqrt(72); T.check('√٧٢ = ٦√٢', r.out === 6 && r.inside === 2); })();
(() => { const r = P.simplifySqrt(50); T.check('√٥٠ = ٥√٢', r.out === 5 && r.inside === 2); })();
(() => { const r = P.scientific(45000); T.check('صيغة علمية ٤٥٠٠٠', r.m === 4.5 && r.e === 4); })();
(() => { const r = P.scientific(0.00032); T.check('صيغة علمية ٠٫٠٠٠٣٢', near(r.m, 3.2) && r.e === -4); })();
expectNums('تقريب لأقرب عشرة', P.round(347, 'لأقرب عشرة'), [350]);
expectNums('تقريب لأقرب مئة', P.round(2451, 'لأقرب مئة'), [2500]);
expectNums('تقريب لأقرب ألف', P.round(7499, 'لأقرب ألف'), [7000]);
expectNums('تقريب منزلتين', P.round(3.14159, 'لأقرب منزلتين عشريتين'), [3.14]);
expectNums('تقريب منزلة واحدة', P.round(2.46, 'لأقرب منزلة عشرية واحدة'), [2.5]);

/* ---- الوحدات والنقود العمانية ---- */
[[3, 'كم', 'م', 3000], [250, 'سم', 'م', 2.5], [2.5, 'كجم', 'جم', 2500], [1500, 'مل', 'لتر', 1.5], [3, 'ساعة', 'دقيقة', 180], [2, 'ريال', 'بيسة', 2000], [750, 'بيسة', 'ريال', 0.75], [1, 'هكتار', 'م٢', 10000]]
  .forEach(([v, a, b, r]) => expectNums(`تحويل ${v} ${a} إلى ${b}`, P.convert(v, a, b), [r]));

/* ---- النسبة والنسبة المئوية والربح والسرعة ---- */
(() => { const r = P.shareRatio(60, [2, 3]); T.check('تقسيم ٦٠ بنسبة ٢:٣', r.value[0] === 24 && r.value[1] === 36); })();
expectNums('نسبة التغير', P.percentChange(80, 100), [25]);
expectNums('ربح بسيط', P.simpleInterest(1000, 5, 3), [150]);
expectNums('سرعة', P.speed(120, 2, null), [60]);
expectNums('زمن', P.speed(150, null, 50), [3]);

/* ---- الاحتمالات ---- */
expectNums('توافيق ق(٥،٢)', { value: P.nCr(5, 2) }, [10]);
expectNums('ذو الحدين', P.binomial(10, 0.5, 5), [0.24609375], 1e-6);
expectNums('طبيعي ضمن انحراف', P.normal(0, 1, -1, 1), [0.6827], 1e-3);
expectNums('طبيعي أقل من المتوسط', P.normal(50, 10, -Infinity, 50), [0.5], 1e-6);

/* ---- المتجهات ---- */
expectNums('طول متجه', P.vector([3, 4]), [5]);
expectNums('ضرب قياسي', P.vector([1, 2], [3, 4]), [11]);

/* ---- الأعداد بالحروف ---- */
[[0, 'صفر'], [7, 'سبعة'], [15, 'خمسة عشر'], [21, 'واحد وعشرون'], [100, 'مئة'], [245, 'مئتان وخمسة وأربعون'], [1000, 'ألف'], [2000, 'ألفان'], [3000, 'ثلاثة آلاف'], [11000, 'أحد عشر ألفاً'], [1250000, 'مليون ومئتان وخمسون ألفاً'], [2024, 'ألفان وأربعة وعشرون']]
  .forEach(([n, w]) => T.check(`بالحروف ${n}`, P.toWords(n) === w, P.toWords(n)));

/* ---- الإحصاء ---- */
(() => { const s = E.stats([3, 5, 7, 7, 9]); T.check('إحصاء', s.mean === 6.2 && s.median === 7 && s.mode[0] === 7 && s.range === 6); })();
(() => { const s = E.stats([2, 4, 4, 4, 5, 5, 7, 9]); T.check('انحراف معياري', near(s.sdP, 2)); })();
(() => { const r = E.regression([[1, 2], [2, 4], [3, 6]]); T.check('انحدار', near(r.m, 2) && near(r.b, 0) && near(r.r, 1)); })();

/* ---- الوقت ---- */
(() => { const r = P.timeDiff(P.parseTime('٨:١٥'), P.parseTime('١١:٤٥')); T.check('مدة زمنية', r.value === 210, r.value); })();

process.exitCode = T.report('اختبار المحرك الرياضي');
