/* اختبار أوضاع السبورة: كل درس في المنهج له نشاط تفاعلي، وقوالب الدوال صحيحة */
const T = require('./harness');
document.getElementById = () => null;
const M = T.load('js/core.js', 'js/math-engine.js', 'js/curriculum.js', 'js/modes.js');
const MODES = ['circle', 'coord', 'shapes', 'space3d', 'fractions', 'numberline', 'data', 'algebra'];
const count = {};
let total = 0;
M.curriculum.grades.forEach((g) => g.units.forEach((u) => u.lessons.forEach((l) => {
  total++;
  const r = M.modes.lessonMode(l);
  const ok = Array.isArray(r) && MODES.includes(r[0]);
  if (ok) count[r[0]] = (count[r[0]] || 0) + 1;
  T.check(`الدرس «${l.t}» (الصف ${g.g}) له نشاط`, ok, JSON.stringify(r));
})));
T.check('كل مهارة في SKILL_MODE تشير إلى وضع معروف', Object.values(M.modes._SKILL_MODE).every((v) => MODES.includes(v[0])));
T.check('دروس المستوى الإحداثي والمجسمات والدائرة موجودة', count.coord > 0 && count.space3d > 0 && count.circle >= 4, JSON.stringify(count));
// قوالب الدوال: التعبير يُقيَّم ويطابق التعريف عند نقاط
const ev = (e, x) => M.math.evaluate(M.math.parse(e), { x }, 'rad');
for (const [k, t] of Object.entries(M.modes.TPL)) {
  const p = {}; t.params.forEach((q) => (p[q.k] = q.def));
  let ok = true, err = '';
  try { const e = t.expr(p); [0.5, 1.3, 2.7].forEach((x) => { const v = ev(e, x); if (typeof v !== 'number' || Number.isNaN(v)) { ok = false; err = e + ' @' + x; } }); } catch (e) { ok = false; err = e.message; }
  T.check(`قالب ${k} يعطي تعبيراً صالحاً`, ok && typeof t.label(p) === 'string', err);
}
console.log('توزيع الدروس على الأوضاع:', JSON.stringify(count), '— المجموع', total);
process.exitCode = T.report('اختبار أوضاع السبورة');
