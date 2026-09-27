/* اختبار خريطة المنهج: كل درس مرتبط بمهارات موجودة وتُولّد أسئلة صحيحة ضمن نطاقه */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/math-plus.js', 'js/practice.js', 'js/skills.js', 'js/curriculum.js');
M.htmlToPlain = (h) => T.strip(h);
const C = M.curriculum, P = M.practice;
let lessons = 0;
T.check('١٢ صفاً', C.grades.length === 12);
C.grades.forEach((g) => {
  T.check(`${g.name} فيه وحدات`, g.units.length >= 3, g.units.length);
  g.units.forEach((u) => u.lessons.forEach((l) => {
    lessons++;
    T.check(`${l.id} عنوان وشرح`, l.t && l.d && l.d.length > 10);
    l.s.forEach((s) => T.check(`${l.id} المهارة ${s} موجودة`, !!P.topics[s]));
    T.check(`${l.id} نطاق مستويات صالح`, l.lv[0] >= 1 && l.lv[1] <= 5 && l.lv[0] <= l.lv[1], JSON.stringify(l.lv));
    for (let k = 0; k < 40; k++) {
      const q = P.lessonQuestion(l);
      T.check(`${l.id} سؤال ضمن النطاق`, q.level >= l.lv[0] && q.level <= l.lv[1]);
      T.check(`${l.id} الإجابة الصحيحة مقبولة`, P.checkAnswer(q, P.answerKey(q)).ok, T.strip(q.text));
    }
  }));
});
// التكيّف: إجابتان صحيحتان ترفعان المستوى ضمن النطاق فقط
const l = C.grades[8].units[0].lessons[0];
const st0 = P.lessonState(l).level;
for (let i = 0; i < 20; i++) P.record(l.id, true);
T.check('التكيّف لا يتجاوز أعلى مستوى للدرس', P.lessonState(l).level === l.lv[1], `${st0} ⇐ ${P.lessonState(l).level}`);
for (let i = 0; i < 20; i++) P.record(l.id, false);
T.check('التكيّف لا ينزل تحت أدنى مستوى للدرس', P.lessonState(l).level === l.lv[0]);
T.check('البحث في المنهج', C.search('فيثاغورس').length >= 1 && C.search('الكسور').length >= 3);
console.log('عدد الدروس:', lessons);
process.exitCode = T.report('اختبار المنهج العُماني');
