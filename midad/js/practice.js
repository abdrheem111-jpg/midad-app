/* ==========================================================================
   محرك التدريب المتكيّف: مولّدات أسئلة لكل موضوع بخمسة مستويات،
   تصحيح ذكي للإجابات، ملف تقدّم لكل طالب، وتوصيات تلقائية
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { rand, pick } = M;
  const L = (x) => M.loc(x);
  const V = (v) => M.varName(v || 'x');
  const E = M.math;
  const frac = (n, d) => `<span class="mfrac"><span>${L(n)}</span><span>${L(d)}</span></span>`;
  const nz = (a, b) => { let v; do v = rand(a, b); while (v === 0); return v; };
  const signed = (v) => (v < 0 ? ' - ' + L(-v) : ' + ' + L(v));
  const coefX = (a, v) => (a === 1 ? V(v) : a === -1 ? '-' + V(v) : L(a) + V(v));
  const math = (s) => E.mathSpan(s);

  /* ---------------- المواضيع والمولّدات ---------------- */
  const T = {};

  T.arith = { name: 'الجمع والطرح', group: 'الأعداد', gen(l) {
    let a, b, op;
    if (l === 1) { a = rand(2, 20); b = rand(2, 20); op = '+'; }
    else if (l === 2) { a = rand(20, 99); b = rand(10, 99); op = pick(['+', '-']); if (op === '-' && b > a) [a, b] = [b, a]; }
    else if (l === 3) { a = rand(100, 999); b = rand(100, 999); op = pick(['+', '-']); }
    else if (l === 4) { a = rand(-50, 50); b = rand(-50, 50); op = pick(['+', '-']); }
    else { a = rand(10, 999) / 10; b = rand(10, 999) / 100; op = pick(['+', '-']); }
    const ans = +(op === '+' ? a + b : a - b).toFixed(2);
    const bb = b < 0 ? `(${L(b)})` : L(b);
    return { text: math(`${L(a)} ${op === '-' ? '−' : '+'} ${bb} = ؟`), answer: ans,
      hint: l === 4 ? 'تذكّر: طرح عدد سالب يساوي جمع موجبه.' : l === 5 ? 'رتّب الأعداد بحيث تتحاذى الفواصل العشرية.' : 'اجمع الآحاد أولاً ثم العشرات.',
      steps: [l === 4 && op === '-' ? `${L(a)} − ${bb} = ${L(a)} + (${L(-b)})` : `نحسب ${L(a)} ${op} ${bb}`], };
  } };

  T.muldiv = { name: 'الضرب والقسمة', group: 'الأعداد', gen(l) {
    let a, b, q, text, ans;
    if (l <= 2) { a = rand(2, l === 1 ? 5 : 10); b = rand(2, 10); ans = a * b; text = `${L(a)} × ${L(b)} = ؟`; }
    else if (l === 3) { a = rand(12, 99); b = rand(3, 9); ans = a * b; text = `${L(a)} × ${L(b)} = ؟`; }
    else if (l === 4) { b = rand(3, 9); q = rand(12, 150); a = b * q; ans = q; text = `${L(a)} ÷ ${L(b)} = ؟`; }
    else { a = rand(12, 99); b = rand(12, 99); ans = a * b; text = `${L(a)} × ${L(b)} = ؟`; }
    return { text: math(text), answer: ans, hint: text.includes('÷') ? 'فكّر: أي عدد إذا ضربناه في المقسوم عليه يعطي المقسوم؟' : 'فكّك العدد الأكبر إلى عشرات وآحاد ثم اضرب كلاً منهما.', steps: [`${text.replace('؟', L(ans))}`] };
  } };

  T.fractions = { name: 'الكسور', group: 'الأعداد', gen(l) {
    let a, b, c, d, op;
    if (l === 1) { b = d = rand(3, 9); a = rand(1, b - 1); c = rand(1, b - 1); op = '+'; }
    else if (l === 2) { b = rand(2, 6); d = rand(2, 6); a = rand(1, b); c = rand(1, d); op = '+'; }
    else if (l === 3) { b = rand(2, 8); d = rand(2, 8); a = rand(1, b * 2); c = rand(1, d); op = '-'; }
    else if (l === 4) { b = rand(2, 9); d = rand(2, 9); a = rand(1, 9); c = rand(1, 9); op = '×'; }
    else { b = rand(2, 9); d = rand(2, 9); a = rand(1, 9); c = rand(1, 9); op = '÷'; }
    const n = op === '+' ? a * d + c * b : op === '-' ? a * d - c * b : op === '×' ? a * c : a * d;
    const den = op === '÷' ? b * c : b * d;
    const g = E.gcd(n, den) || 1;
    return { text: math(`${frac(a, b)} ${op} ${frac(c, d)} = ؟`), answer: n / den, fracAns: [n / g, den / g], inputHint: 'اكتب الناتج ككسر مثل ٣/٤ أو كعدد عشري',
      hint: { '+': 'وحّد المقامات أولاً، ثم اجمع البسطين.', '-': 'وحّد المقامات، ثم اطرح البسطين.', '×': 'اضرب البسط في البسط والمقام في المقام.', '÷': 'اقلب الكسر الثاني ثم اضرب.' }[op],
      steps: [op === '÷' ? `${frac(a, b)} × ${frac(d, c)}` : op === '×' ? `${frac(a + '×' + c, b + '×' + d)}` : `نوحّد المقامات: المقام المشترك ${L(b * d)}`, `= ${frac(n, den)} = ${den / g === 1 ? L(n / g) : frac(n / g, den / g)}`] };
  } };

  T.percent = { name: 'النسبة المئوية', group: 'الأعداد', gen(l) {
    let text, ans, steps;
    if (l === 1) { const p = pick([10, 50, 25]); const x = rand(2, 20) * (p === 25 ? 4 : 10); ans = (p * x) / 100; text = `${L(p)}٪ من ${L(x)} = ؟`; steps = [`${frac(p, 100)} × ${L(x)} = ${L(ans)}`]; }
    else if (l === 2) { const p = pick([5, 15, 20, 30, 40, 75]); const x = rand(2, 40) * 20; ans = (p * x) / 100; text = `${L(p)}٪ من ${L(x)} = ؟`; steps = [`${frac(p, 100)} × ${L(x)} = ${L(ans)}`]; }
    else if (l === 3) { const y = rand(2, 20) * 10; const p = pick([10, 20, 25, 40, 50, 75]); const x = (p * y) / 100; ans = p; text = `العدد ${L(x)} يمثّل كم بالمئة من ${L(y)}؟`; steps = [`${frac(x, y)} × ١٠٠ = ${L(p)}٪`]; }
    else if (l === 4) { const x = rand(4, 40) * 10; const p = pick([10, 20, 25, 15]); const up = Math.random() < 0.5; ans = up ? x * (1 + p / 100) : x * (1 - p / 100); text = `سعر سلعة ${L(x)} ريالاً، ${up ? 'زاد' : 'انخفض'} بنسبة ${L(p)}٪. كم أصبح السعر؟`; steps = [`مقدار التغير = ${L(p)}٪ × ${L(x)} = ${L((p * x) / 100)}`, `السعر الجديد = ${L(x)} ${up ? '+' : '−'} ${L((p * x) / 100)} = ${L(ans)}`]; }
    else { const orig = rand(4, 40) * 10; const p = pick([20, 25, 50]); const after = orig * (1 - p / 100); ans = orig; text = `بعد خصم ${L(p)}٪ أصبح السعر ${L(after)} ريالاً. ما السعر الأصلي؟`; steps = [`السعر بعد الخصم = ${L(100 - p)}٪ من الأصلي`, `الأصلي = ${L(after)} ÷ ${L((100 - p) / 100)} = ${L(orig)}`]; }
    return { text, answer: +ans.toFixed(2), hint: 'النسبة المئوية تعني "من كل مئة": حوّلها إلى كسر مقامه ١٠٠.', steps };
  } };

  T.powers = { name: 'الأسس والجذور', group: 'الأعداد', gen(l) {
    let text, ans, steps;
    if (l === 1) { const a = rand(2, 15); ans = a * a; text = `${L(a)}² = ؟`; steps = [`${L(a)} × ${L(a)} = ${L(ans)}`]; }
    else if (l === 2) { const a = rand(2, 15); ans = a; text = `√${L(a * a)} = ؟`; steps = [`${L(a)} × ${L(a)} = ${L(a * a)} ⇐ الجذر = ${L(a)}`]; }
    else if (l === 3) { const a = rand(2, 5), m = rand(1, 4), n = rand(1, 3); ans = Math.pow(a, m + n); text = `${L(a)}<sup>${L(m)}</sup> × ${L(a)}<sup>${L(n)}</sup> = ؟`; steps = [`عند ضرب الأسس المتشابهة نجمع الأسس: ${L(a)}<sup>${L(m + n)}</sup> = ${L(ans)}`]; }
    else if (l === 4) { const a = rand(2, 5), n = rand(1, 3); ans = 1 / Math.pow(a, n); text = `${L(a)}<sup>-${L(n)}</sup> = ؟`; steps = [`الأس السالب يعني المقلوب: ${frac(1, Math.pow(a, n))}`]; }
    else { const a = rand(2, 4), m = rand(2, 3); ans = Math.pow(a, m * 2) ; text = `(${L(a)}<sup>${L(m)}</sup>)<sup>${L(2)}</sup> = ؟`; steps = [`قوة القوة نضرب الأسس: ${L(a)}<sup>${L(m * 2)}</sup> = ${L(ans)}`]; }
    return { text: math(text), answer: ans, hint: 'تذكّر قوانين الأسس: الضرب ⇐ جمع الأسس، القوة للقوة ⇐ ضرب الأسس، الأس السالب ⇐ مقلوب.', steps };
  } };

  T.linear = { name: 'المعادلات الخطية', group: 'الجبر', gen(l) {
    const x = l >= 4 ? nz(-9, 9) : rand(1, 12);
    let text, steps;
    if (l === 1) { const a = rand(1, 20); text = `${V()} + ${L(a)} = ${L(x + a)}`; steps = [`نطرح ${L(a)} من الطرفين: ${V()} = ${L(x + a)} − ${L(a)} = ${L(x)}`]; }
    else if (l === 2) { const a = rand(2, 9); text = `${L(a)}${V()} = ${L(a * x)}`; steps = [`نقسم الطرفين على ${L(a)}: ${V()} = ${L(a * x)} ÷ ${L(a)} = ${L(x)}`]; }
    else if (l === 3) { const a = rand(2, 9), b = nz(-15, 15); text = `${L(a)}${V()}${signed(b)} = ${L(a * x + b)}`; steps = [`ننقل الثابت: ${L(a)}${V()} = ${L(a * x)}`, `نقسم على ${L(a)}: ${V()} = ${L(x)}`]; }
    else if (l === 4) { const a = rand(3, 9), c = rand(1, a - 1), b = nz(-12, 12); const d = a * x + b - c * x; text = `${L(a)}${V()}${signed(b)} = ${coefX(c)}${signed(d)}`; steps = [`نجمع حدود ${V()} في طرف: ${L(a - c)}${V()} = ${L(d - b)}`, `${V()} = ${L(x)}`]; }
    else { const a = rand(2, 5), b = nz(-6, 6), c = rand(1, 4), d = nz(-6, 6); const e = a * (x + b) - c * (x + d); text = `${L(a)}(${V()}${signed(b)}) = ${L(c)}(${V()}${signed(d)})${signed(e)}`; steps = [`نفك الأقواس: ${L(a)}${V()}${signed(a * b)} = ${L(c)}${V()}${signed(c * d + e)}`, `${L(a - c)}${V()} = ${L(c * d + e - a * b)}`, `${V()} = ${L(x)}`]; }
    return { text: math(text) + '<br><small style="color:var(--ui-muted)">أوجد قيمة ' + V() + '</small>', answer: x, hint: 'اعزل المتغير: انقل الحدود الثابتة إلى طرف وحدود المتغير إلى الطرف الآخر، ثم اقسم على المعامل.', steps };
  } };

  T.quadratic = { name: 'المعادلات التربيعية', group: 'الجبر', gen(l) {
    let r1, r2, text, steps, a = 1;
    if (l === 1) { r1 = rand(1, 12); r2 = -r1; text = `${V()}² = ${L(r1 * r1)}`; steps = [`${V()} = ±√${L(r1 * r1)} = ±${L(r1)}`]; }
    else if (l === 2) { r1 = nz(-9, 9); r2 = nz(-9, 9); text = `(${V()}${signed(-r1)})(${V()}${signed(-r2)}) = ٠`; steps = ['حاصل الضرب صفر ⇐ أحد العاملين صفر', `${V()} = ${L(r1)} أو ${V()} = ${L(r2)}`]; }
    else { r1 = nz(-9, 9); r2 = nz(-9, 9); if (l >= 4) a = rand(2, 3); const b = -a * (r1 + r2), c = a * r1 * r2;
      text = `${a === 1 ? '' : L(a)}${V()}²${b ? signed(b).replace(L(Math.abs(b)), Math.abs(b) === 1 ? '' : L(Math.abs(b))) + V() : ''}${c ? signed(c) : ''} = ٠`;
      steps = [`بالتحليل أو بالقانون العام: المميّز = ${L(b * b - 4 * a * c)}`, `${V()} = ${L(r1)} أو ${V()} = ${L(r2)}`]; }
    const roots = [...new Set([r1, r2])].sort((p, q) => p - q);
    return { text: math(text) + '<br><small style="color:var(--ui-muted)">أوجد كل الحلول (افصل بينها بفاصلة)</small>', answer: roots, multi: true, hint: 'حاول تحليل الطرف إلى قوسين: ابحث عن عددين حاصل ضربهما الحد الثابت ومجموعهما معامل ' + V() + '.', steps };
  } };

  T.systems = { name: 'أنظمة المعادلات', group: 'الجبر', gen(l) {
    const x = l >= 3 ? nz(-8, 8) : rand(1, 10), y = l >= 3 ? nz(-8, 8) : rand(1, 10);
    let a1 = 1, b1 = 1, a2 = 1, b2 = -1;
    if (l >= 2) { a1 = rand(1, 3); b1 = rand(1, 3); a2 = rand(1, 3); b2 = -rand(1, 3); }
    if (l >= 4) { a1 = nz(-5, 5); b1 = nz(-5, 5); a2 = nz(-5, 5); b2 = nz(-5, 5); if (a1 * b2 - a2 * b1 === 0) b2 += 1; }
    if (a1 * b2 - a2 * b1 === 0) { a2 = a1 + 1; }
    const eq = (a, b) => `${coefX(a, 'x')}${b < 0 ? ' - ' : ' + '}${Math.abs(b) === 1 ? '' : L(Math.abs(b))}${V('y')}`;
    return { text: math(`${eq(a1, b1)} = ${L(a1 * x + b1 * y)}`) + '<br>' + math(`${eq(a2, b2)} = ${L(a2 * x + b2 * y)}`) + `<br><small style="color:var(--ui-muted)">اكتب الحل: ${V('x')} ، ${V('y')}</small>`,
      answer: [x, y], ordered: true, hint: 'استخدم الحذف: اضرب المعادلتين في أعداد تجعل معامل أحد المتغيرين متساوياً، ثم اطرح.', steps: [`بالحذف أو التعويض: ${V('x')} = ${L(x)} ، ${V('y')} = ${L(y)}`] };
  } };

  T.pythagoras = { name: 'نظرية فيثاغورس', group: 'الهندسة', gen(l) {
    const tri = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15]]);
    const k = l <= 2 ? 1 : rand(1, 3);
    const [a, b, c] = tri.map((v) => v * k);
    if (l <= 2 || l === 5) {
      const bb = l === 5 ? rand(2, 9) : b, aa = l === 5 ? rand(2, 9) : a;
      const ans = Math.hypot(aa, bb);
      return { text: `مثلث قائم ضلعا القائمة ${L(aa)} و ${L(bb)}. ما طول الوتر؟${l === 5 ? ' (قرّب لمنزلتين عشريتين)' : ''}`, answer: +ans.toFixed(2), tol: 0.02, hint: 'الوتر² = مجموع مربعي ضلعي القائمة.', steps: [`الوتر² = ${L(aa)}² + ${L(bb)}² = ${L(aa * aa + bb * bb)}`, `الوتر = √${L(aa * aa + bb * bb)} ≈ ${M.fmt(ans, 2)}`] };
    }
    return { text: `مثلث قائم طول وتره ${L(c)} وأحد ضلعي القائمة ${L(a)}. ما طول الضلع الآخر؟`, answer: b, hint: 'الضلع² = الوتر² − الضلع المعلوم².', steps: [`الضلع² = ${L(c)}² − ${L(a)}² = ${L(c * c - a * a)}`, `الضلع = ${L(b)}`] };
  } };

  T.area = { name: 'المساحات والمحيطات', group: 'الهندسة', gen(l) {
    const shapes = l <= 1 ? ['rect', 'square'] : l === 2 ? ['rect', 'tri'] : l === 3 ? ['tri', 'circleA', 'para'] : l === 4 ? ['circleC', 'trap', 'circleA'] : ['comp', 'trap'];
    const s = pick(shapes);
    const a = rand(2, 15), b = rand(2, 12), c = rand(2, 10);
    switch (s) {
      case 'square': return { text: `مربع طول ضلعه ${L(a)} سم. ما مساحته؟`, answer: a * a, hint: 'مساحة المربع = الضلع × الضلع.', steps: [`${L(a)} × ${L(a)} = ${L(a * a)} سم²`] };
      case 'rect': return Math.random() < 0.5
        ? { text: `مستطيل طوله ${L(a)} سم وعرضه ${L(b)} سم. ما مساحته؟`, answer: a * b, hint: 'مساحة المستطيل = الطول × العرض.', steps: [`${L(a)} × ${L(b)} = ${L(a * b)} سم²`] }
        : { text: `مستطيل طوله ${L(a)} سم وعرضه ${L(b)} سم. ما محيطه؟`, answer: 2 * (a + b), hint: 'محيط المستطيل = ٢ × (الطول + العرض).', steps: [`٢ × (${L(a)} + ${L(b)}) = ${L(2 * (a + b))} سم`] };
      case 'tri': return { text: `مثلث طول قاعدته ${L(a * 2)} سم وارتفاعه ${L(b)} سم. ما مساحته؟`, answer: a * b, hint: 'مساحة المثلث = ½ × القاعدة × الارتفاع.', steps: [`½ × ${L(a * 2)} × ${L(b)} = ${L(a * b)} سم²`] };
      case 'para': return { text: `متوازي أضلاع طول قاعدته ${L(a)} سم وارتفاعه ${L(b)} سم. ما مساحته؟`, answer: a * b, hint: 'مساحة متوازي الأضلاع = القاعدة × الارتفاع.', steps: [`${L(a)} × ${L(b)} = ${L(a * b)} سم²`] };
      case 'circleA': return { text: `دائرة نصف قطرها ${L(c)} سم. ما مساحتها؟ (استخدم ط ≈ ٣٫١٤)`, answer: +(3.14 * c * c).toFixed(2), tol: 0.01, hint: 'مساحة الدائرة = ط × نق².', steps: [`٣٫١٤ × ${L(c)}² = ${M.fmt(3.14 * c * c, 2)} سم²`] };
      case 'circleC': return { text: `دائرة نصف قطرها ${L(c)} سم. ما محيطها؟ (استخدم ط ≈ ٣٫١٤)`, answer: +(2 * 3.14 * c).toFixed(2), tol: 0.01, hint: 'محيط الدائرة = ٢ × ط × نق.', steps: [`٢ × ٣٫١٤ × ${L(c)} = ${M.fmt(6.28 * c, 2)} سم`] };
      case 'trap': return { text: `شبه منحرف قاعدتاه ${L(a + 4)} سم و ${L(a)} سم وارتفاعه ${L(b * 2)} سم. ما مساحته؟`, answer: (a + 2) * b * 2, hint: 'مساحة شبه المنحرف = ½ × (مجموع القاعدتين) × الارتفاع.', steps: [`½ × (${L(a + 4)} + ${L(a)}) × ${L(b * 2)} = ${L((a + 2) * b * 2)} سم²`] };
      default: return { text: `شكل مركّب من مستطيل ${L(a)} × ${L(b)} سم يعلوه مثلث قاعدته ${L(a)} سم وارتفاعه ${L(c * 2)} سم. ما المساحة الكلية؟`, answer: a * b + a * c, hint: 'قسّم الشكل إلى أجزاء بسيطة واجمع مساحاتها.', steps: [`المستطيل: ${L(a * b)} ، المثلث: ½ × ${L(a)} × ${L(c * 2)} = ${L(a * c)}`, `المجموع = ${L(a * b + a * c)} سم²`] };
    }
  } };

  T.angles = { name: 'الزوايا', group: 'الهندسة', gen(l) {
    if (l === 1) { const a = rand(10, 80); return { text: `زاويتان متتامتان، إحداهما ${L(a)}°. ما قياس الأخرى؟`, answer: 90 - a, hint: 'الزاويتان المتتامتان مجموعهما ٩٠°.', steps: [`٩٠ − ${L(a)} = ${L(90 - a)}°`] }; }
    if (l === 2) { const a = rand(20, 160); return { text: `زاويتان متكاملتان، إحداهما ${L(a)}°. ما قياس الأخرى؟`, answer: 180 - a, hint: 'الزاويتان المتكاملتان مجموعهما ١٨٠°.', steps: [`١٨٠ − ${L(a)} = ${L(180 - a)}°`] }; }
    if (l === 3) { const a = rand(30, 80), b = rand(30, 80); return { text: `في مثلث، قياس زاويتين ${L(a)}° و ${L(b)}°. ما قياس الزاوية الثالثة؟`, answer: 180 - a - b, hint: 'مجموع زوايا المثلث ١٨٠°.', steps: [`١٨٠ − ${L(a)} − ${L(b)} = ${L(180 - a - b)}°`] }; }
    if (l === 4) { const n = rand(5, 10); return { text: `ما مجموع قياسات الزوايا الداخلية لمضلع عدد أضلاعه ${L(n)}؟`, answer: (n - 2) * 180, hint: 'مجموع الزوايا الداخلية = (ن − ٢) × ١٨٠°.', steps: [`(${L(n)} − ٢) × ١٨٠ = ${L((n - 2) * 180)}°`] }; }
    const n = pick([5, 6, 8, 9, 10, 12]);
    return { text: `ما قياس الزاوية الداخلية الواحدة في مضلع منتظم عدد أضلاعه ${L(n)}؟`, answer: ((n - 2) * 180) / n, hint: 'اقسم مجموع الزوايا الداخلية على عدد الأضلاع.', steps: [`(${L(n)} − ٢) × ١٨٠ ÷ ${L(n)} = ${M.fmt(((n - 2) * 180) / n)}°`] };
  } };

  T.stats = { name: 'الإحصاء', group: 'الإحصاء', gen(l) {
    const n = rand(4, 5 + l);
    let data = Array.from({ length: n }, () => rand(1, 10 + l * 5));
    const kind = l <= 1 ? 'range' : l === 2 ? pick(['mean', 'range']) : l === 3 ? pick(['median', 'mean']) : l === 4 ? pick(['mode', 'median']) : pick(['mean', 'median']);
    if (kind === 'mean') { const s = data.reduce((a, b) => a + b, 0); data[0] += (n - (s % n)) % n; }
    if (kind === 'mode') { data[1] = data[0]; data[2] = data[0]; }
    const st = E.stats(data);
    const ans = kind === 'mean' ? st.mean : kind === 'median' ? st.median : kind === 'mode' ? st.mode[0] : st.range;
    const name = { mean: 'المتوسط الحسابي', median: 'الوسيط', mode: 'المنوال', range: 'المدى' }[kind];
    const hint = { mean: 'اجمع القيم ثم اقسم على عددها.', median: 'رتّب القيم تصاعدياً ثم اختر القيمة الوسطى.', mode: 'المنوال هو القيمة الأكثر تكراراً.', range: 'المدى = أكبر قيمة − أصغر قيمة.' }[kind];
    return { text: `أوجد <b>${name}</b> للبيانات:<br>${data.map(L).join('، ')}`, answer: ans, hint, steps: [`الترتيب: ${st.sorted.map(L).join('، ')}`, `${name} = ${M.fmt(ans)}`] };
  } };

  T.probability = { name: 'الاحتمالات', group: 'الإحصاء', gen(l) {
    if (l <= 2) {
      const r = rand(1, 8), b = rand(1, 8), g = l === 2 ? rand(1, 6) : 0;
      const tot = r + b + g;
      const g2 = E.gcd(r, tot);
      return { text: `كيس فيه ${L(r)} كرات حمراء و ${L(b)} زرقاء${g ? ` و ${L(g)} خضراء` : ''}. سُحبت كرة عشوائياً. ما احتمال أن تكون حمراء؟`, answer: r / tot, inputHint: 'اكتب الاحتمال ككسر مثل ٢/٥', hint: 'الاحتمال = عدد النواتج المرغوبة ÷ عدد النواتج الكلي.', steps: [`${frac(r, tot)} = ${frac(r / g2, tot / g2)}`] };
    }
    if (l === 3) { const ev = pick([['عدداً زوجياً', 3], ['عدداً أكبر من ٤', 2], ['عدداً أولياً', 3], ['العدد ٦', 1]]); return { text: `عند رمي حجر نرد مرة واحدة، ما احتمال ظهور ${ev[0]}؟`, answer: ev[1] / 6, hint: 'حجر النرد له ٦ نواتج متساوية الاحتمال.', steps: [`${frac(ev[1], 6)}`] }; }
    if (l === 4) { const s = rand(4, 10); const ways = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1][s]; return { text: `عند رمي حجري نرد، ما احتمال أن يكون المجموع ${L(s)}؟`, answer: ways / 36, hint: 'عدد النواتج الكلي ٣٦. عُدّ الأزواج التي مجموعها المطلوب.', steps: [`عدد الطرق = ${L(ways)} ⇐ الاحتمال ${frac(ways, 36)}`] }; }
    return { text: 'عند رمي قطعة نقود ثلاث مرات، ما احتمال ظهور الشعار مرتين بالضبط؟', answer: 3 / 8, hint: 'عدد النواتج ٢³ = ٨. عُدّ النواتج التي فيها شعاران بالضبط.', steps: ['النواتج المرغوبة: ش ش ك، ش ك ش، ك ش ش = ٣ ⇐ ' + frac(3, 8)] };
  } };

  T.sequences = { name: 'الأنماط والمتتابعات', group: 'الجبر', gen(l) {
    if (l <= 2) { const a = rand(1, 20), d = l === 1 ? rand(2, 5) : nz(-9, 9); const s = [0, 1, 2, 3].map((i) => a + i * d); return { text: `ما الحد التالي في المتتابعة؟<br>${s.map(L).join('، ')}، …`, answer: a + 4 * d, hint: 'ابحث عن الفرق الثابت بين كل حدين متتاليين.', steps: [`الفرق الثابت = ${L(d)} ⇐ ${L(s[3])} ${d < 0 ? '−' : '+'} ${L(Math.abs(d))} = ${L(a + 4 * d)}`] }; }
    if (l === 3) { const a = rand(1, 5), r = rand(2, 3); const s = [0, 1, 2, 3].map((i) => a * Math.pow(r, i)); return { text: `ما الحد التالي في المتتابعة؟<br>${s.map(L).join('، ')}، …`, answer: a * Math.pow(r, 4), hint: 'هل تضرب كل حد في عدد ثابت؟', steps: [`النسبة الثابتة = ${L(r)} ⇐ ${L(s[3])} × ${L(r)} = ${L(a * Math.pow(r, 4))}`] }; }
    if (l === 4) { const a = rand(1, 10), d = rand(2, 7), n = rand(10, 30); return { text: `متتابعة حسابية حدها الأول ${L(a)} وأساسها ${L(d)}. ما الحد رقم ${L(n)}؟`, answer: a + (n - 1) * d, hint: 'الحد النوني = الحد الأول + (ن − ١) × الأساس.', steps: [`${L(a)} + (${L(n)} − ١) × ${L(d)} = ${L(a + (n - 1) * d)}`] }; }
    const s = [1, 2, 3, 4].map((i) => i * i + 1);
    return { text: `ما الحد التالي في المتتابعة؟<br>${s.map(L).join('، ')}، …`, answer: 26, hint: 'انظر إلى الفروق بين الحدود… ثم إلى الفروق بين الفروق.', steps: ['القاعدة: ن² + ١ ⇐ الحد الخامس = ٢٥ + ١ = ٢٦'] };
  } };

  const ORDER = ['arith', 'muldiv', 'fractions', 'percent', 'powers', 'linear', 'quadratic', 'systems', 'sequences', 'pythagoras', 'area', 'angles', 'stats', 'probability'];

  /* ---------------- الملف الشخصي ---------------- */
  const load = () => M.store.get('practice', { current: M.settings.student || 'طالب', students: {} });
  let db = load();
  const save = () => M.store.set('practice', db);
  function student(name) {
    name = name || db.current;
    if (!db.students[name]) db.students[name] = { topics: {}, xp: 0, bestStreak: 0, streak: 0, history: [] };
    return db.students[name];
  }
  /** حالة مهارة أو درس. range = [أدنى مستوى، أعلى مستوى] للدروس */
  function topicState(t, name, range) {
    const s = student(name);
    if (!s.topics[t]) s.topics[t] = { level: range ? range[0] : 1, up: 0, down: 0, correct: 0, total: 0 };
    const st = s.topics[t];
    if (range) { st.min = range[0]; st.max = range[1]; st.level = M.clamp(st.level, range[0], range[1]); }
    return st;
  }
  function mastery(t, name, range) {
    const st = topicState(t, name, range);
    if (!st.total) return 0;
    const acc = st.correct / st.total;
    const lo = st.min || 1, hi = st.max || 5;
    const pos = hi > lo ? (st.level - lo) / (hi - lo) : Math.min(1, (st.correct - (st.total - st.correct)) / 4 + 0.25);
    return Math.round(Math.max(0, Math.min(1, pos * 0.6 + acc * 0.4 * Math.min(1, st.total / 5))) * 100);
  }

  /* ---------------- التصحيح ---------------- */
  const UNIT_WORDS = /(سم|مم|ملم|كم|كجم|كغ|جم|غ|مل|لتر|م²|م٢|سم²|سم٢|سم³|سم٣|م³|م٣|وحدة مربعة|وحدة|ريال(اً|ات)?|ر\.ع|بيسة|دقيقة|دقائق|ساعة|ساعات|ثانية|درجة|°|٪|%)/g;
  /** قيمة عددية من نص الإجابة (يدعم الكسور والجذور والتعابير) */
  function parseNum(p) {
    p = p.replace(/^[^=]*=\s*/, '').replace(UNIT_WORDS, ' ').replace(/[()]/g, (c) => c).trim();
    if (!p) return NaN;
    const m = p.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
    if (m) return +m[1] / +m[2];
    const mixed = p.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
    if (/^-?\d+(\.\d+)?e[-+]?\d+$/i.test(p)) return Number(p);
    try { const ast = E.parse(p); if (E.variables(ast).size) return NaN; return E.evaluate(ast, {}, 'deg'); } catch (e) { return NaN; }
  }
  function splitParts(s) {
    s = M.toWestern(String(s)).replace(/\s+/g, ' ').trim().replace(/^[\(\[{]|[\)\]}]$/g, '');
    return s.split(/[,;:،]| و | أو |\s+او\s+/).map((p) => p.trim()).filter(Boolean);
  }
  function parseTimeAns(s) {
    const m = M.toWestern(s).match(/(\d{1,2})\s*[:.]\s*(\d{1,2})/);
    if (m) return +m[1] * 60 + +m[2];
    const h = M.toWestern(s).match(/(\d+)\s*ساع/), mi = M.toWestern(s).match(/(\d+)\s*دق/);
    if (h || mi) return (h ? +h[1] * 60 : 0) + (mi ? +mi[1] : 0);
    return NaN;
  }
  /** مقارنة تعبيرين جبريين بالتعويض بقيم عشوائية */
  function sameExpr(a, b) {
    let A, B;
    try { A = E.parse(a); B = E.parse(b); } catch (e) { return null; }
    const vars = new Set([...E.variables(A), ...E.variables(B)]);
    for (let t = 0; t < 6; t++) {
      const sc = {}; vars.forEach((v) => (sc[v] = Math.random() * 4 - 1.7 + t * 0.37));
      let x, y;
      try { x = E.evaluate(A, sc, 'rad'); y = E.evaluate(B, sc, 'rad'); } catch (e) { return null; }
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (Math.abs(x - y) > 1e-6 * Math.max(1, Math.abs(y))) return false;
    }
    return true;
  }
  function checkAnswer(q, input) {
    const raw = String(input || '').trim();
    if (!raw) return { ok: false, invalid: true };
    const type = q.type || (Array.isArray(q.answer) ? (q.ordered ? 'pair' : 'set') : 'num');
    const tol = (x) => Math.max(1e-12, (q.tol || 0.001) * (Math.abs(x) >= 1 ? Math.abs(x) : Math.max(Math.abs(x), 1e-9)), Math.abs(x) < 1 && Math.abs(x) > 1e-3 ? 5e-4 : 0);
    if (type === 'choice') {
      const w = M.toWestern(raw).trim();
      const idx = q.choices.findIndex((c) => M.toWestern(String(c)).trim() === w);
      const n = /^\d+$/.test(w) ? +w - 1 : -1;
      return { ok: idx === q.answer || (idx < 0 && n === q.answer) };
    }
    if (type === 'time') { const v = parseTimeAns(raw); return Number.isFinite(v) ? { ok: v === q.answer } : { ok: false, invalid: true }; }
    if (type === 'expr') {
      const r = sameExpr(M.toWestern(raw).replace(/^[^=]*=/, ''), q.answer);
      if (r === null) return { ok: false, invalid: true };
      if (r && q.mustFactor && !/\(.*\)/.test(raw)) return { ok: false, hint: 'الإجابة صحيحة القيمة لكن المطلوب كتابتها محللة إلى عوامل (بين أقواس)' };
      return { ok: r };
    }
    if (type === 'ineq') {
      let rel;
      try { rel = E.parseRelation(raw); } catch (e) { return { ok: false, invalid: true }; }
      if (!rel.rel || rel.rel === '=') return { ok: false, invalid: true };
      let r = rel.rel, lhs = rel.lhs, rhs = rel.rhs;
      if (lhs.t !== 'var' && rhs.t === 'var') { [lhs, rhs] = [rhs, lhs]; r = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[r]; }
      if (lhs.t !== 'var') return { ok: false, invalid: true };
      let v; try { v = E.evaluate(rhs, {}, 'deg'); } catch (e) { return { ok: false, invalid: true }; }
      return { ok: r === q.answer.rel && Math.abs(v - q.answer.v) <= tol(q.answer.v) };
    }
    const vals = splitParts(raw).map(parseNum);
    if (!vals.length || vals.some((v) => !Number.isFinite(v))) return { ok: false, invalid: true };
    if (type === 'set' || type === 'pair') {
      const exp = q.answer.slice();
      if (vals.length !== exp.length) return { ok: false };
      if (type === 'pair') return { ok: exp.every((e, i) => Math.abs(e - vals[i]) <= tol(e)) };
      const got = vals.slice().sort((a, b) => a - b);
      return { ok: exp.slice().sort((a, b) => a - b).every((e, i) => Math.abs(e - got[i]) <= tol(e)) };
    }
    const ok = vals.length === 1 && Math.abs(vals[0] - q.answer) <= tol(q.answer);
    if (ok && q.mustSimplify) {
      const m = M.toWestern(raw).match(/(-?\d+)\s*\/\s*(\d+)/);
      if (m && E.gcd(+m[1], +m[2]) !== 1) return { ok: false, hint: 'القيمة صحيحة لكن الكسر ليس في أبسط صورة' };
    }
    return { ok };
  }
  const REL_AR = { '<': '<', '>': '>', '<=': '≤', '>=': '≥' };
  /** نص الإجابة للعرض */
  function answerText(q) {
    const type = q.type || (Array.isArray(q.answer) ? (q.ordered ? 'pair' : 'set') : 'num');
    if (q.display) return q.display;
    if (type === 'choice') return q.choices[q.answer];
    if (type === 'time') return q.timeFmt === 'dur' ? `${L(Math.floor(q.answer / 60))} ساعة و${L(q.answer % 60)} دقيقة` : M.mathPlus.fmtTime(q.answer);
    if (type === 'expr') return E.mathSpan(M.htmlToPlain ? E.toText(E.parse(q.answer)) : q.answer);
    if (type === 'ineq') return E.mathSpan(`${M.varName('x')} ${REL_AR[q.answer.rel]} ${M.fmt(q.answer.v)}`);
    if (q.fracAns) return q.fracAns[1] === 1 ? L(q.fracAns[0]) : `${L(q.fracAns[0])}/${L(q.fracAns[1])}`;
    if (type === 'pair') return `(${q.answer.map((v) => M.fmt(v)).join('، ')})`;
    if (Array.isArray(q.answer)) return q.answer.map((v) => M.fmt(v)).join(' ، ');
    const f = M.toFraction(q.answer, 100);
    return f && f.d !== 1 && Math.abs(q.answer) < 1 ? `${L(f.n)}/${L(f.d)} (${M.fmt(q.answer, 3)})` : M.fmt(q.answer, 3);
  }
  /** إجابة نموذجية بصيغة الإدخال (للاختبارات الآلية) */
  function answerKey(q) {
    const type = q.type || (Array.isArray(q.answer) ? (q.ordered ? 'pair' : 'set') : 'num');
    if (type === 'choice') return q.choices[q.answer];
    if (type === 'time') return q.timeFmt === 'dur' ? `${Math.floor(q.answer / 60)} ساعة ${q.answer % 60} دقيقة` : `${Math.floor(q.answer / 60)}:${String(q.answer % 60).padStart(2, '0')}`;
    if (type === 'expr') return q.answer;
    if (type === 'ineq') return `x ${q.answer.rel} ${q.answer.v}`;
    if (Array.isArray(q.answer)) return q.answer.join(', ');
    return String(q.answer);
  }

  /* ---------------- الواجهة البرمجية ---------------- */
  M.practice = {
    topics: T, order: ORDER,
    get db() { return db; },
    student, topicState, mastery, checkAnswer, answerText, answerKey, sameExpr,
    setStudent(name) { db.current = name; student(name); save(); M.emit('practice'); },
    students() { return Object.keys(db.students); },
    removeStudent(name) { delete db.students[name]; if (db.current === name) db.current = Object.keys(db.students)[0] || 'طالب'; save(); M.emit('practice'); },
    /** سؤال لدرس من المنهج (مستوى متكيّف ضمن نطاق الدرس) */
    lessonQuestion(lesson) {
      const st = topicState(lesson.id, null, lesson.lv);
      const skill = M.pick(lesson.s);
      const q = T[skill].gen(st.level);
      q.topic = skill; q.level = st.level; q.lesson = lesson.id;
      return q;
    },
    lessonMastery: (lesson, name) => mastery(lesson.id, name, lesson.lv),
    lessonState: (lesson, name) => topicState(lesson.id, name, lesson.lv),
    generate(t, level) {
      const st = topicState(t);
      const lv = level || st.level;
      const q = T[t].gen(lv);
      q.topic = t; q.level = lv;
      return q;
    },
    /** تسجيل الإجابة وتكييف المستوى. usedHint يقلل الأثر */
    record(t, correct, usedHint) { // t: معرّف مهارة أو درس
      const s = student(), st = topicState(t);
      st.total++;
      let event = null;
      if (correct) {
        st.correct++;
        st.down = 0;
        st.up += usedHint ? 0.5 : 1;
        s.streak++;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        s.xp += 10 * st.level + (usedHint ? 0 : 5);
        if (st.up >= 2 && st.level < (st.max || 5)) { st.level++; st.up = 0; event = 'up'; }
      } else {
        st.up = 0;
        st.down++;
        s.streak = 0;
        if (st.down >= 2 && st.level > (st.min || 1)) { st.level--; st.down = 0; event = 'down'; }
      }
      s.history.push({ t, ok: !!correct, lv: st.level, at: Date.now() });
      if (s.history.length > 300) s.history.shift();
      save();
      M.emit('practice');
      return event;
    },
    /** الموضوع الموصى به: أضعف موضوع مُجرَّب، أو أول موضوع لم يُجرّب */
    recommend() {
      const s = student();
      const tried = ORDER.filter((t) => s.topics[t] && s.topics[t].total);
      const weak = tried.filter((t) => mastery(t) < 60).sort((a, b) => mastery(a) - mastery(b));
      if (weak.length) return weak[0];
      const fresh = ORDER.find((t) => !tried.includes(t));
      return fresh || tried.sort((a, b) => mastery(a) - mastery(b))[0] || 'arith';
    },
    /** تقرير عن الطالب (يُرسل للمعلم الذكي) */
    report(name) {
      const s = student(name);
      return ORDER.filter((t) => s.topics[t] && s.topics[t].total).map((t) => `${T[t].name}: المستوى ${s.topics[t].level}/5، صحيح ${s.topics[t].correct} من ${s.topics[t].total}`).join('\n') || 'لا توجد بيانات تدريب بعد';
    },
    /** اكتشاف الموضوع من نص */
    detectTopic(text) {
      const map = [
        [/تربيع|درجة الثانية|س²|x\^?2/, 'quadratic'], [/نظام|معادلتين/, 'systems'], [/معادل|خطي/, 'linear'], [/كسر|كسور/, 'fractions'],
        [/نسب|مئوي|٪|%/, 'percent'], [/أس|جذر|قوى/, 'powers'], [/فيثاغورس|وتر/, 'pythagoras'], [/مساح|محيط/, 'area'], [/زاوي|زوايا/, 'angles'],
        [/متوسط|وسيط|منوال|إحصاء|مدى/, 'stats'], [/احتمال|نرد|عملة/, 'probability'], [/متتابع|نمط|أنماط/, 'sequences'], [/ضرب|قسمة/, 'muldiv'], [/جمع|طرح/, 'arith'],
      ];
      for (const [re, t] of map) if (re.test(text)) return t;
      return null;
    },
  };
})();
