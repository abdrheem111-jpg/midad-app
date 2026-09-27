/* اختبار التعرّف على الكتابة اليدوية بخطوط اصطناعية متعددة الأساليب */
const T = require('./harness');
const M = T.load('js/core.js', 'js/math-engine.js', 'js/ink-data.js', 'js/ink-hand.js', 'js/ink.js');
const S = require('./ink-styles');
const N = +(process.env.N || 40);
const verbose = !!process.env.V;

function norm(s) {
  return M.toWestern(String(s)).replace(/\s+/g, '').replace(/س/g, 'x').replace(/ص/g, 'y').replace(/−/g, '-')
    .replace(/\((\w+|\d+)\)/g, '$1');
}

/* ---- ١) الرموز المنفردة ---- */
function symbolAccuracy(mode, labels) {
  let ok = 0, tot = 0; const conf = {};
  for (const lab of labels) {
    for (let k = 0; k < N; k++) {
      const strokes = S.writeExpr([lab], { seed: 1000 + k * 17 + lab.charCodeAt(0), h: 40 + (k % 5) * 12, jitter: 1, dir: mode === 'arabic' ? 'rtl' : 'ltr' });
      // رمز منفرد: نمرّر ارتفاعاً مرجعياً (كما في السبورة حيث يُعرف طول الوحدة)
      const r = M.ink.recognize(strokes, { mode, dir: mode === 'arabic' ? 'rtl' : 'ltr', refHeight: 40 + (k % 5) * 12 });
      const got = r.text.trim();
      const exp = lab; // الكاتب العربي يرسم القوس معكوساً بصرياً (كما في الكتابة من اليمين) ويُقرأ منطقياً كما هو
      tot++;
      if (got === exp) ok++;
      else { conf[lab] = conf[lab] || {}; conf[lab][got] = (conf[lab][got] || 0) + 1; }
    }
  }
  const acc = ok / tot;
  console.log(`  ${mode === 'arabic' ? 'الرموز العربية' : 'الرموز الغربية'}: ${(acc * 100).toFixed(1)}٪ (${ok}/${tot})`);
  Object.entries(conf).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y) - Object.values(a[1]).reduce((x, y) => x + y)).slice(0, verbose ? 40 : 10)
    .forEach(([k, v]) => console.log(`     ${k} ⇐ ${Object.entries(v).map(([g, c]) => `"${g}"×${c}`).join(' ')}`));
  return acc;
}

const AR = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '+', '-', '×', '(', ')', 'س', 'ص', '√', '<', '>'];
const WE = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '(', ')', 'y', '<', '>'];
console.log('دقة التعرّف على الرموز المنفردة (' + N + ' عينة لكل رمز، أساليب كتابة متعددة):');
const aAr = symbolAccuracy('arabic', AR);
const aWe = symbolAccuracy('western', WE);
T.check('دقة الرموز العربية ≥ ٩٠٪', aAr >= 0.9, (aAr * 100).toFixed(1) + '٪');
T.check('دقة الرموز الغربية ≥ ٩٠٪', aWe >= 0.9, (aWe * 100).toFixed(1) + '٪');

/* ---- ٢) تعابير كاملة ---- */
const EXPRS = [
  // [tokens, المتوقع، الوضع]
  [['٢', 'س', '+', '٣', '=', '١', '١'], '2x+3=11', 'arabic'],
  [['٥', '+', '٧'], '5+7', 'arabic'],
  [['١', '٢', '×', '٤'], '12×4', 'arabic'],
  [['٣', 'س', '-', '٤', '=', '٨'], '3x-4=8', 'arabic'],
  [['س', { sup: ['٢'] }, '-', '٩', '=', '٠'], 'x^2-9=0', 'arabic'],
  [['٢', '٥', '÷', '٥'], '25÷5', 'arabic'],
  [[{ frac: [['٣'], ['٤']] }, '+', { frac: [['١'], ['٢']] }], '3/4+1/2', 'arabic'],
  [['ص', '=', '٢', 'س', '+', '١'], 'y=2x+1', 'arabic'],
  [['(', '٣', '+', '٤', ')', '×', '٢'], '(3+4)×2', 'arabic'],
  [['٧', '٨', '-', '٤', '٩'], '78-49', 'arabic'],
  [['√', '٩'], '√9', 'arabic', true],
  [['٦', 'س', '=', '٤', '٢'], '6x=42', 'arabic'],
  [['٤', 'س', '+', '٨', '=', '٢', '٠'], '4x+8=20', 'arabic'],
  [['١', '٠', '٥', '-', '٣', '٠'], '105-30', 'arabic'],
  [['٢', 'س', '<', '٨'], '2x<8', 'arabic'],
  [['2', 'x', '+', '3', '=', '1', '1'], '2x+3=11', 'western'],
  [['4', '5', '+', '1', '7'], '45+17', 'western'],
  [['x', { sup: ['2'] }, '+', '1'], 'x^2+1', 'western'],
  [['8', '×', '6'], '8×6', 'western'],
  [[{ frac: [['6'], ['8']] }], '6/8', 'western'],
  [['3', '(', 'x', '-', '2', ')'], '3(x-2)', 'western'],
];
console.log('دقة التعرّف على التعابير الكاملة:');
let eOk = 0, eTot = 0;
for (const [toks, exp, mode, skip] of EXPRS) {
  if (skip) continue;
  let ok = 0;
  const bad = [];
  for (let k = 0; k < Math.ceil(N / 2); k++) {
    const strokes = S.writeExpr(toks, { seed: 5000 + k * 31, dir: mode === 'arabic' ? 'rtl' : 'ltr', h: 38 + (k % 4) * 10 });
    const r = M.ink.recognize(strokes, { mode, dir: 'auto' });
    if (norm(r.text) === norm(exp)) ok++; else bad.push(r.text);
  }
  const n = Math.ceil(N / 2);
  eOk += ok; eTot += n;
  console.log(`  ${exp.padEnd(12)} ${mode === 'arabic' ? 'عربي' : 'غربي'}: ${ok}/${n}${bad.length ? '   أمثلة الخطأ: ' + [...new Set(bad)].slice(0, 3).join(' | ') : ''}`);
}
const eAcc = eOk / eTot;
console.log(`  الإجمالي: ${(eAcc * 100).toFixed(1)}٪`);
T.check('دقة التعابير ≥ ٨٠٪', eAcc >= 0.8, (eAcc * 100).toFixed(1) + '٪');

/* ---- ٣) التعلّم من خط المستخدم ---- */
(() => {
  // رمز غريب الشكل: يعلّمه المستخدم ثم يُتعرَّف عليه
  const weird = [[[0, 0], [30, 40], [0, 40], [30, 0]]];
  const before = M.ink.recognize(weird, { mode: 'arabic', refHeight: 40 }).text;
  for (let i = 0; i < 3; i++) M.ink.learn('٧', weird.map((s) => s.map(([x, y]) => [x + i, y + i * 0.5])));
  const after = M.ink.recognize(weird, { mode: 'arabic', refHeight: 40 }).text;
  T.check('التعلّم من خط المستخدم', after === '٧', `قبل: ${before} ، بعد: ${after}`);
  M.ink.resetUser();
})();

/* ---- ٤) السرعة ---- */
(() => {
  const strokes = S.writeExpr(['٣', 'س', { sup: ['٢'] }, '+', '٥', 'س', '-', '٢', '=', '٠'], { seed: 99 });
  M.ink.recognize(strokes, { mode: 'arabic' });
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) M.ink.recognize(strokes.map((s) => s.map(([x, y]) => [x + i * 0.01, y])), { mode: 'arabic' });
  const ms = (Date.now() - t0) / 5;
  console.log(`  زمن التعرّف على تعبير من ${strokes.length} خطاً: ${ms.toFixed(0)} مللي ثانية`);
  T.check('السرعة < ٤٠٠ مللي ثانية', ms < 400, ms.toFixed(0));
})();

process.exitCode = T.report('اختبار التعرّف على الكتابة اليدوية');
