/* اختبار كل مولّدات الأسئلة: كل مهارة × كل مستوى × مئات الأسئلة */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/math-plus.js', 'js/practice.js', 'js/skills.js');
M.htmlToPlain = (h) => T.strip(h);
const P = M.practice;
const N = +(process.env.N || 250);
const bad = /NaN|undefined|Infinity|null|\[object/;
let total = 0;
for (const id of Object.keys(P.topics)) {
  for (let l = 1; l <= 5; l++) {
    let fails = 0;
    for (let k = 0; k < N; k++) {
      total++;
      let q;
      try { q = P.topics[id].gen(l); } catch (e) { T.check(`${id} م${l} توليد`, false, e.stack.split('\n').slice(0, 2).join(' ')); fails++; break; }
      const where = `${id} م${l}: ${T.strip(q.text).slice(0, 70)}`;
      const blob = q.text + ' ' + (q.steps || []).join(' ') + ' ' + (q.hint || '') + ' ' + (q.display || '');
      if (bad.test(blob)) { T.check(where + ' (نص فيه قيمة غير صالحة)', false, T.strip(blob).slice(0, 160)); if (++fails > 3) break; continue; }
      if (!q.hint || !q.steps || !q.steps.length) { T.check(where + ' (بلا تلميح/خطوات)', false); if (++fails > 3) break; continue; }
      const type = q.type || (Array.isArray(q.answer) ? (q.ordered ? 'pair' : 'set') : 'num');
      if (type === 'num' && !Number.isFinite(q.answer)) { T.check(where + ' (إجابة غير عددية)', false, String(q.answer)); if (++fails > 3) break; continue; }
      if (type === 'choice' && !(q.answer >= 0 && q.answer < q.choices.length)) { T.check(where + ' (اختيار غير صالح)', false); if (++fails > 3) break; continue; }
      const key = P.answerKey(q);
      const r = P.checkAnswer(q, key);
      if (!r.ok) { T.check(where + ' (الإجابة الصحيحة رُفضت)', false, `المفتاح "${key}" ⇐ ${JSON.stringify(r)}`); if (++fails > 3) break; continue; }
      // الإجابة الصحيحة بالأرقام العربية أيضاً
      const arKey = M.loc(key).replace(/x/g, 'س').replace(/y/g, 'ص').replace(/pi/g, 'ط');
      if (type !== 'choice' && !P.checkAnswer(q, arKey).ok) { T.check(where + ' (رُفضت بالأرقام العربية)', false, arKey); if (++fails > 3) break; continue; }
      // إجابة خاطئة يجب أن تُرفض
      let wrong = null;
      if (type === 'num') wrong = String(q.answer + (Math.abs(q.answer) > 10 ? Math.round(Math.abs(q.answer) * 0.1) + 1 : 1));
      else if (type === 'set' || type === 'pair') wrong = q.answer.map((v, i) => (i === 0 ? v + 1 : v)).join(', ');
      else if (type === 'time') wrong = `${Math.floor((q.answer + 7) / 60)}:${String((q.answer + 7) % 60).padStart(2, '0')}`;
      else if (type === 'expr') wrong = `(${q.answer}) + 1`;
      else if (type === 'choice') wrong = q.choices[(q.answer + 1) % q.choices.length];
      if (wrong && q.choices && type === 'choice' && q.choices[q.answer] === wrong) wrong = null;
      if (wrong && P.checkAnswer(q, wrong).ok) { T.check(where + ' (قُبلت إجابة خاطئة)', false, wrong); if (++fails > 3) break; continue; }
      T.check(where, true);
    }
  }
}
console.log(`عدد المهارات: ${Object.keys(P.topics).length} ، الأسئلة المختبرة: ${total}`);
process.exitCode = T.report('اختبار مولّدات الأسئلة');
