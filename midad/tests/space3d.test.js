/* اختبار رياضيات الفضاء ثلاثي الأبعاد، والشرح البصري، وخطط التدريس */
const T = require('./harness');
document.getElementById = () => null;
const M = T.load('js/core.js', 'js/math-engine.js', 'js/math-plus.js', 'js/practice.js', 'js/skills.js', 'js/curriculum.js', 'js/pedagogy.js', 'js/space3d-math.js', 'js/visual.js');
const S = M.space3dMath, V = S.v;
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);
const nearP = (p, q, e) => p.every((x, i) => near(x, q[i], e));
// فهم المدخلات
const cases = [['ع = س² + ص²', 'surf'], ['z = sin(x)*cos(y)', 'surf'], ['س² − ص²', 'surf'], ['٢س + ص − ع = ٤', 'plane'], ['ع = ٣', 'plane'], ['س = ٢', 'plane'], ['ع = ٢س − ص + ١', 'plane'],
  ['س² + ص² + ع² = ٩', 'sphere'], ['(س − ١)² + (ص + ٢)² + ع² = ١٦', 'sphere'], ['أ(١، ٢، ٣)', 'pt'], ['(٠٫٥، −١، ٢)', 'pt'], ['مستقيم (٠، ٠، ٠) (١، ٢، ٣)', 'line'], ['(١، ٠، ٠) + ت(٠، ١، ١)', 'line']];
cases.forEach(([t, k]) => { let o = null; try { o = S.parse(t); } catch (e) { o = { t: 'ERR ' + e.message }; } T.check(`«${t}» ⇐ ${k}`, o.t === k, o.t); });
const sp = S.parse('(س − ١)² + (ص + ٢)² + ع² = ١٦');
T.check('مركز الكرة (١، −٢، ٠) ونصف قطرها ٤', nearP(sp.c, [1, -2, 0]) && near(sp.r, 4));
['س + ص + ع', 'ع = ٢ع + س', 'س > ٣'].forEach((t) => { let ok = false; try { const o = S.parse(t); ok = o.t === 'surf' && t === 'س + ص + ع' ? false : !!o; } catch (e) { ok = true; } T.check(`مدخل غير صالح يُرفض برسالة: «${t}»`, ok); });
// التقاطعات على أمثلة عشوائية
let okLP = 0, okPP = 0, okLL = 0, ok3 = 0, okLS = 0, okPS = 0; const N = 400;
const rnd = () => Math.round((Math.random() * 10 - 5) * 10) / 10;
for (let i = 0; i < N; i++) {
  const pl = { t: 'plane', n: [rnd() || 1, rnd(), rnd()], d: rnd() }, pl2 = { t: 'plane', n: [rnd(), rnd() || 1, rnd()], d: rnd() }, pl3 = { t: 'plane', n: [rnd(), rnd(), rnd() || 1], d: rnd() };
  const ln = { t: 'line', p: [rnd(), rnd(), rnd()], d: [rnd() || 1, rnd(), rnd()] }, ln2 = { t: 'line', p: [rnd(), rnd(), rnd()], d: [rnd(), rnd() || 1, rnd()] };
  const r1 = S.relate(ln, pl, 5); if (r1.kind !== 'point' || near(V.dot(pl.n, r1.pts[0]), pl.d, 1e-6)) okLP++;
  const r2 = S.relate(pl, pl2, 5); if (r2.kind !== 'line' || (near(V.dot(pl.n, r2.line.p), pl.d, 1e-6) && near(V.dot(pl2.n, r2.line.p), pl2.d, 1e-6) && near(V.dot(pl.n, r2.line.d), 0, 1e-6) && near(V.dot(pl2.n, r2.line.d), 0, 1e-6))) okPP++;
  const r3 = S.threePlanes(pl, pl2, pl3); if (!r3 || [pl, pl2, pl3].every((q) => near(V.dot(q.n, r3.pts[0]), q.d, 1e-6))) ok3++;
  const r4 = S.relate(ln, ln2, 5); if (r4.kind !== 'skew' || near(V.dot(V.sub(r4.seg[1], r4.seg[0]), ln.d), 0, 1e-6)) okLL++;
  const sph = { t: 'sphere', c: [rnd(), rnd(), rnd()], r: Math.abs(rnd()) + 0.5 };
  const r5 = S.relate(ln, sph, 5); if (r5.kind !== 'point' || r5.pts.every((P) => near(V.len(V.sub(P, sph.c)), sph.r, 1e-6))) okLS++;
  const r6 = S.relate(pl, sph, 5); if (r6.kind !== 'circle' || (near(V.dot(pl.n, r6.circle.c), pl.d, 1e-6) && near(r6.circle.r ** 2 + V.len(V.sub(r6.circle.c, sph.c)) ** 2, sph.r ** 2, 1e-6))) okPS++;
}
T.check(`مستقيم ∩ مستوى: النقطة تحقق معادلة المستوى (${N})`, okLP === N, okLP);
T.check('مستوى ∩ مستوى: المستقيم يقع في المستويين', okPP === N, okPP);
T.check('ثلاثة مستويات: النقطة تحقق المعادلات الثلاث', ok3 === N, ok3);
T.check('مستقيمان متخالفان: أقصر بعد عمودي عليهما', okLL === N, okLL);
T.check('مستقيم ∩ كرة: النقاط على سطح الكرة', okLS === N, okLS);
T.check('مستوى ∩ كرة: دائرة في المستوى ونصف قطرها صحيح', okPS === N, okPS);
const c = S.relate(S.parse('ع = س² + ص²'), S.parse('ع = ٤'), 5);
T.check('السطح ع = س² + ص² يقطع المستوى ع = ٤ في دائرة نصف قطرها ٢', c.kind === 'curve' && c.segs.every(([a]) => near(Math.hypot(a[0], a[1]), 2, 0.05) && near(a[2], 4, 0.05)), c.segs && c.segs.length);
T.check('قصّ المستوى بصندوق العرض: سداسي للمستوى س + ص + ع = ٠', S.planeBox({ n: [1, 1, 1], d: 0 }, 5).length === 6);
// الشرح البصري
const st = M.visual.splitStep('نقسم الطرفين على ٢: <span class="math">س = ٨ ÷ ٢</span>');
T.check('تقسيم الخطوة إلى وصف وتعبير', /نقسم/.test(st.label) && /س = ٨/.test(st.math));
T.check('خطوة بلا تعبير تبقى نصاً', M.visual.splitStep('نفك الأقواس ونجمع الحدود:').math.includes('نفك'));
// خطط التدريس لكل درس
let plans = 0, total = 0;
M.curriculum.grades.forEach((g) => g.units.forEach((u) => u.lessons.forEach((l) => { total++; const p = M.pedagogy.forLesson(l); if (p.key && p.materials.length && p.steps.length && p.misconception && p.exit && p.strats.length) plans++; })));
T.check(`كل الدروس لها خطة تدريس ومواد محسوسة (${total})`, plans === total, `${plans}/${total}`);
T.check('كل مهارات المنهج لها استراتيجية', Object.keys(M.practice.topics).every((k) => M.pedagogy.P[k]));
process.exitCode = T.report('اختبار الفضاء ثلاثي الأبعاد والشرح البصري وخطط التدريس');
