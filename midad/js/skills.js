/* ==========================================================================
   مكتبة المهارات: مولّدات أسئلة لكل مهارات منهج الرياضيات (الصفوف ١–١٢)
   كل مهارة: gen(level ١–٥) ⇐ {text, answer, type?, hint, steps}
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const E = M.math, P = M.mathPlus;
  const T = M.practice.topics;
  const { rand, pick } = M;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 3 : d);
  const V = (v) => M.varName(v || 'x');
  const ms = (s) => E.mathSpan(s);
  const frac = (n, d) => `<span class="mfrac"><span>${L(n)}</span><span>${L(d)}</span></span>`;
  const nz = (a, b) => { let v; do v = rand(a, b); while (v === 0); return v; };
  const sg = (v) => (v < 0 ? ' - ' + L(-v) : ' + ' + L(v));
  const cx = (a, v) => (a === 1 ? V(v) : a === -1 ? '-' + V(v) : L(a) + V(v));
  const r2 = (x) => Math.round(x * 100) / 100;
  const small = (txt) => `<br><small style="color:var(--ui-muted)">${txt}</small>`;
  const add = (id, name, group, gen) => { T[id] = { name, group, gen }; };
  const byLevel = (l, arr) => arr[Math.min(arr.length, l) - 1];

  /* ======================= الصفوف ١–٤ ======================= */
  add('count', 'العد والترتيب', 'الأعداد', (l) => {
    const max = byLevel(l, [20, 100, 1000, 10000, 100000]);
    const step = byLevel(l, [1, pick([2, 5, 10]), pick([10, 100]), pick([100, 1000]), pick([1000, 5000])]);
    const start = rand(1, Math.max(1, Math.floor(max / step) - 5)) * step;
    const seq = [0, 1, 2, 3].map((i) => start + i * step);
    const back = Math.random() < 0.3;
    if (back) return { text: `ما العدد الذي يأتي قبل ${L(start)} مباشرة في العد بمقدار ${L(step)}؟`, answer: start - step, hint: `اطرح ${L(step)} من ${L(start)}`, steps: [`${L(start)} − ${L(step)} = ${L(start - step)}`] };
    return { text: `أكمل العد: ${seq.map(L).join('، ')}، ؟`, answer: start + 4 * step, hint: `العد يزيد ${L(step)} في كل مرة`, steps: [`${L(seq[3])} + ${L(step)} = ${L(start + 4 * step)}`] };
  });

  add('compare', 'مقارنة الأعداد وترتيبها', 'الأعداد', (l) => {
    const max = byLevel(l, [20, 100, 1000, 100000, 1e7]);
    if (l >= 4 && Math.random() < 0.5) {
      const a = r2(rand(1, 999) / 100), b = r2(rand(1, 999) / 100);
      if (a === b) return T.compare.gen(l);
      return { text: `أيهما أكبر: ${F(a)} أم ${F(b)}؟`, answer: Math.max(a, b), hint: 'قارن الأجزاء الصحيحة أولاً ثم الأعشار ثم الأجزاء من مئة', steps: [`${F(Math.max(a, b))} > ${F(Math.min(a, b))}`] };
    }
    const nums = []; while (nums.length < 4) { const n = rand(1, max); if (!nums.includes(n)) nums.push(n); }
    const kind = pick(['max', 'min']);
    const ans = kind === 'max' ? Math.max(...nums) : Math.min(...nums);
    return { text: `ما ${kind === 'max' ? 'أكبر' : 'أصغر'} عدد من الأعداد: ${nums.map(L).join('، ')}؟`, answer: ans, hint: 'قارن عدد المنازل أولاً، ثم قارن الأرقام من اليسار (المنزلة الأعلى)', steps: [`الترتيب التصاعدي: ${nums.slice().sort((a, b) => a - b).map(L).join('، ')}`] };
  });

  add('placeValue', 'القيمة المكانية', 'الأعداد', (l) => {
    const digits = byLevel(l, [2, 3, 4, 6, 7]);
    let n = rand(Math.pow(10, digits - 1), Math.pow(10, digits) - 1);
    const s = String(n);
    const pos = rand(0, s.length - 1);
    const d = +s[pos];
    if (d === 0) return T.placeValue.gen(l);
    const val = d * Math.pow(10, s.length - 1 - pos);
    const names = ['الآحاد', 'العشرات', 'المئات', 'الآلاف', 'عشرات الآلاف', 'مئات الآلاف', 'الملايين'];
    if (l >= 3 && Math.random() < 0.35) {
      return { text: `اكتب العدد بالأرقام:<br><b>${P.toWords(n)}</b>`, answer: n, hint: 'ابدأ بأكبر منزلة واكتب صفراً في المنازل الفارغة', steps: [`${P.toWords(n)} = ${L(n)}`] };
    }
    return { text: `ما القيمة المكانية للرقم ${L(d)} في العدد ${L(n)}؟`, answer: val, hint: 'حدّد منزلة الرقم (آحاد، عشرات، مئات...) ثم اضربه في قيمة المنزلة', steps: [`الرقم ${L(d)} في منزلة ${names[s.length - 1 - pos]} ⇐ قيمته ${L(val)}`] };
  });

  add('times', 'جداول الضرب', 'الأعداد', (l) => {
    const a = rand(2, byLevel(l, [5, 10, 10, 12, 12])), b = rand(2, byLevel(l, [5, 5, 10, 12, 12]));
    if (l >= 3 && Math.random() < 0.4) return { text: ms(`${L(a)} × ؟ = ${L(a * b)}`), answer: b, hint: `ما العدد الذي نضربه في ${L(a)} لنحصل على ${L(a * b)}؟ (أو اقسم ${L(a * b)} ÷ ${L(a)})`, steps: [`${L(a * b)} ÷ ${L(a)} = ${L(b)}`] };
    return { text: ms(`${L(a)} × ${L(b)} = ؟`), answer: a * b, hint: `الضرب جمع متكرر: ${L(a)} مجموعات في كل منها ${L(b)}`, steps: [`${L(a)} × ${L(b)} = ${L(a * b)}`] };
  });

  add('division', 'القسمة والباقي', 'الأعداد', (l) => {
    const b = rand(2, byLevel(l, [5, 9, 9, 12, 25]));
    const q = rand(2, byLevel(l, [10, 12, 99, 250, 400]));
    if (l >= 3 && Math.random() < 0.5) {
      const r = rand(1, b - 1); const a = b * q + r;
      return { text: `ما باقي قسمة ${L(a)} على ${L(b)}؟`, answer: r, hint: 'أوجد أكبر مضاعف للمقسوم عليه لا يتجاوز المقسوم، ثم اطرح', steps: [`${L(a)} = ${L(b)} × ${L(q)} + ${L(r)} ⇐ الباقي ${L(r)}`] };
    }
    return { text: ms(`${L(b * q)} ÷ ${L(b)} = ؟`), answer: q, hint: `فكّر: ${L(b)} × ؟ = ${L(b * q)}`, steps: [`${L(b)} × ${L(q)} = ${L(b * q)} ⇐ الناتج ${L(q)}`] };
  });

  add('fracBasic', 'الكسور البسيطة', 'الأعداد', (l) => {
    if (l <= 2) {
      const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 3], [2, 3], [1, 5], [1, 10]]);
      const whole = d * rand(2, l === 1 ? 5 : 12);
      return { text: `${frac(n, d)} العدد ${L(whole)} = ؟`, answer: (whole / d) * n, hint: `اقسم ${L(whole)} على ${L(d)} ثم اضرب في ${L(n)}`, steps: [`${L(whole)} ÷ ${L(d)} = ${L(whole / d)}`, `${L(whole / d)} × ${L(n)} = ${L((whole / d) * n)}`] };
    }
    if (l === 3) {
      const d = rand(3, 12), n = rand(1, d - 1), k = rand(2, 6);
      return { text: `أكمل الكسر المكافئ: ${frac(n, d)} = ${frac('؟', d * k)}`, answer: n * k, hint: `بكم ضربنا المقام؟ اضرب البسط في العدد نفسه`, steps: [`المقام ضُرب في ${L(k)} ⇐ البسط ${L(n)} × ${L(k)} = ${L(n * k)}`] };
    }
    const d = rand(4, 24), g = rand(2, 6), n0 = rand(1, d - 1);
    const n = n0 * g, dd = d * g;
    const gg = E.gcd(n, dd);
    return { text: `بسّط الكسر ${frac(n, dd)} إلى أبسط صورة`, answer: n / dd, fracAns: [n / gg, dd / gg], inputHint: 'مثال: ٣/٤', hint: 'اقسم البسط والمقام على القاسم المشترك الأكبر', steps: [`ق.م.أ(${L(n)}، ${L(dd)}) = ${L(gg)}`, `${frac(n / gg, dd / gg)}`], mustSimplify: true };
  });

  add('time', 'الوقت والزمن', 'القياس', (l) => {
    if (l === 1) { const h = rand(2, 6); return { text: `كم دقيقة في ${L(h)} ساعات؟`, answer: h * 60, hint: 'الساعة = ٦٠ دقيقة', steps: [`${L(h)} × ٦٠ = ${L(h * 60)}`] }; }
    if (l === 2) { const m = rand(2, 9) * 15; return { text: `حوّل ${L(m)} دقيقة إلى ساعات ودقائق`, answer: m, type: 'time', timeFmt: 'dur', inputHint: 'مثال: ٢ ساعة ١٥ دقيقة', hint: 'كل ٦٠ دقيقة = ساعة واحدة', steps: [`${L(m)} = ${L(Math.floor(m / 60))} × ٦٠ + ${L(m % 60)}`] }; }
    const start = rand(6, 14) * 60 + pick([0, 10, 15, 20, 30, 40, 45, 50]);
    const dur = rand(1, 4) * 60 + pick([0, 15, 20, 30, 35, 45, 50]);
    if (l === 3) return { text: `بدأ درس الساعة ${P.fmtTime(start)} واستمر ${L(Math.floor(dur / 60))} ساعة و${L(dur % 60)} دقيقة. متى انتهى؟`, answer: (start + dur) % 1440, type: 'time', inputHint: 'مثال: ١١:٣٠', hint: 'أضف الساعات أولاً ثم الدقائق، وإذا زادت الدقائق على ٦٠ أضف ساعة', steps: [`${P.fmtTime(start)} + ${L(Math.floor(dur / 60))}:${L(String(dur % 60).padStart(2, '0'))} = ${P.fmtTime((start + dur) % 1440)}`] };
    return { text: `انطلقت حافلة من مسقط الساعة ${P.fmtTime(start)} ووصلت نزوى الساعة ${P.fmtTime(start + dur)}. كم استغرقت الرحلة؟`, answer: dur, type: 'time', timeFmt: 'dur', inputHint: 'مثال: ٢ ساعة ١٥ دقيقة', hint: 'اطرح وقت الانطلاق من وقت الوصول', steps: [`المدة = ${L(Math.floor(dur / 60))} ساعة و${L(dur % 60)} دقيقة`] };
  });

  add('money', 'النقود (الريال العُماني والبيسة)', 'القياس', (l) => {
    if (l <= 2) { const r = rand(1, l === 1 ? 5 : 20); const b = l === 1 ? 0 : pick([100, 250, 500, 750]); return { text: `كم بيسة في ${L(r)} ريال${b ? ' و' + L(b) + ' بيسة' : ''}؟`, answer: r * 1000 + b, hint: 'الريال العُماني = ١٠٠٠ بيسة', steps: [`${L(r)} × ١٠٠٠ ${b ? '+ ' + L(b) : ''} = ${L(r * 1000 + b)} بيسة`] }; }
    const price = rand(2, 40) * 50 + pick([0, 250, 500]); const paid = Math.ceil((price + 1) / 1000) * 1000 + (l >= 4 ? 1000 : 0);
    if (l === 3) return { text: `اشترت مريم كتاباً بسعر ${L(price)} بيسة ودفعت ${L(paid / 1000)} ريال. كم بيسة الباقي؟`, answer: paid - price, hint: 'حوّل الريالات إلى بيسات ثم اطرح', steps: [`${L(paid)} − ${L(price)} = ${L(paid - price)} بيسة`] };
    const n = rand(3, 12), each = rand(2, 30) * 50;
    return { text: `ثمن الدفتر ${L(each)} بيسة. كم ريالاً ثمن ${L(n)} دفاتر؟`, answer: (n * each) / 1000, hint: 'اضرب ثم حوّل البيسات إلى ريالات (اقسم على ١٠٠٠)', steps: [`${L(n)} × ${L(each)} = ${L(n * each)} بيسة = ${F((n * each) / 1000)} ريال`] };
  });

  add('units', 'القياس والتحويل بين الوحدات', 'القياس', (l) => {
    const sets = [
      [['م', 'سم', 100], ['كم', 'م', 1000], ['سم', 'مم', 10]],
      [['كجم', 'جم', 1000], ['لتر', 'مل', 1000], ['ساعة', 'دقيقة', 60]],
      [['م', 'مم', 1000], ['طن', 'كجم', 1000], ['دقيقة', 'ثانية', 60]],
      [['كم', 'سم', 100000], ['يوم', 'ساعة', 24], ['م٢', 'سم٢', 10000]],
      [['هكتار', 'م٢', 10000], ['م٣', 'لتر', 1000], ['أسبوع', 'ساعة', 168]],
    ];
    const [big, sm, k] = pick(sets[l - 1]);
    if (Math.random() < 0.5) { const v = l >= 3 ? rand(11, 99) / 10 : rand(2, 20); return { text: `${F(v)} ${big} = ؟ ${sm}`, answer: r2(v * k), hint: `١ ${big} = ${L(k)} ${sm} ⇐ اضرب في ${L(k)}`, steps: [`${F(v)} × ${L(k)} = ${F(v * k)} ${sm}`] }; }
    const v = rand(2, 40) * (k >= 100 ? k / 10 : k) * (l >= 3 ? 1 : 1);
    return { text: `${F(v)} ${sm} = ؟ ${big}`, answer: r2(v / k), hint: `للتحويل إلى وحدة أكبر نقسم على ${L(k)}`, steps: [`${F(v)} ÷ ${L(k)} = ${F(v / k)} ${big}`] };
  });

  add('perimeter', 'المحيط', 'الهندسة', (l) => {
    const a = rand(2, 15), b = rand(2, 12), c = rand(3, 10);
    if (l === 1) return { text: `مربع طول ضلعه ${L(a)} سم. ما محيطه؟`, answer: 4 * a, hint: 'محيط المربع = ٤ × طول الضلع', steps: [`٤ × ${L(a)} = ${L(4 * a)} سم`] };
    if (l === 2) return { text: `مستطيل طوله ${L(a + 3)} سم وعرضه ${L(b)} سم. ما محيطه؟`, answer: 2 * (a + 3 + b), hint: 'المحيط = ٢ × (الطول + العرض)', steps: [`٢ × (${L(a + 3)} + ${L(b)}) = ${L(2 * (a + 3 + b))} سم`] };
    if (l === 3) return { text: `مثلث أطوال أضلاعه ${L(a)} سم و${L(b + 3)} سم و${L(c + 4)} سم. ما محيطه؟`, answer: a + b + c + 7, hint: 'المحيط = مجموع أطوال الأضلاع', steps: [`${L(a)} + ${L(b + 3)} + ${L(c + 4)} = ${L(a + b + c + 7)} سم`] };
    if (l === 4) { const p = 2 * (a + b + 4); return { text: `مستطيل محيطه ${L(p)} سم وطوله ${L(a + 4)} سم. ما عرضه؟`, answer: b, hint: 'نصف المحيط = الطول + العرض', steps: [`نصف المحيط = ${L(p / 2)}`, `العرض = ${L(p / 2)} − ${L(a + 4)} = ${L(b)} سم`] }; }
    const n = rand(5, 10); return { text: `مضلع منتظم عدد أضلاعه ${L(n)} وطول ضلعه ${L(c)} سم. ما محيطه؟`, answer: n * c, hint: 'المضلع المنتظم أضلاعه متساوية', steps: [`${L(n)} × ${L(c)} = ${L(n * c)} سم`] };
  });

  add('shapes', 'الأشكال والمجسمات', 'الهندسة', (l) => {
    const items2 = [['المثلث', 'أضلاع', 3], ['المربع', 'رؤوس', 4], ['المستطيل', 'أضلاع', 4], ['الخماسي', 'أضلاع', 5], ['السداسي', 'رؤوس', 6], ['الثماني', 'أضلاع', 8]];
    const items3 = [['المكعب', 'أوجه', 6], ['المكعب', 'أحرف', 12], ['المكعب', 'رؤوس', 8], ['متوازي المستطيلات', 'أوجه', 6], ['الهرم الرباعي', 'رؤوس', 5], ['الهرم الرباعي', 'أوجه', 5], ['المنشور الثلاثي', 'أوجه', 5], ['المنشور الثلاثي', 'أحرف', 9], ['الهرم الثلاثي', 'أحرف', 6], ['الأسطوانة', 'أوجه مستوية', 2]];
    if (l >= 4) {
      const [name, props] = pick([['مثلث', ['ثلاثة أضلاع', 'مجموع زواياه ١٨٠°']], ['متوازي أضلاع', ['كل ضلعين متقابلين متوازيان ومتساويان']], ['معيّن', ['أضلاعه الأربعة متساوية وقطراه متعامدان']], ['شبه منحرف', ['له ضلعان متوازيان فقط']], ['مستطيل', ['زواياه الأربع قوائم وقطراه متساويان']]]);
      const choices = M.shuffle(['مثلث', 'متوازي أضلاع', 'معيّن', 'شبه منحرف', 'مستطيل']).slice(0, 4);
      if (!choices.includes(name)) choices[0] = name;
      return { text: `ما الشكل الرباعي أو المضلع الذي: ${props[0]}؟`, type: 'choice', choices, answer: choices.indexOf(name), hint: 'تذكّر خصائص الأضلاع والزوايا والأقطار لكل شكل', steps: [`${name}: ${props.join('، ')}`] };
    }
    const [name, what, n] = pick(l <= 1 ? items2 : l === 2 ? items2.concat(items3.slice(0, 4)) : items3);
    return { text: `كم عدد ${what} ${name}؟`, answer: n, hint: 'تخيّل الشكل وعُدّ بعناية، أو ارسمه على السبورة', steps: [`عدد ${what} ${name} = ${L(n)}`] };
  });

  add('rounding', 'التقريب والتقدير', 'الأعداد', (l) => {
    if (l <= 3) {
      const place = byLevel(l, [10, 100, 1000]);
      const n = rand(place, place * 99);
      if (n % place === 0) return T.rounding.gen(l);
      const name = { 10: 'عشرة', 100: 'مئة', 1000: 'ألف' }[place];
      return { text: `قرّب العدد ${L(n)} لأقرب ${name}`, answer: Math.round(n / place) * place, hint: `انظر إلى الرقم على يمين منزلة ${name}: ٥ فأكثر نقرب للأعلى`, steps: [`${L(n)} ≈ ${L(Math.round(n / place) * place)}`] };
    }
    const x = rand(1000, 99999) / 1000;
    const k = l === 4 ? 1 : 2;
    const res = Math.round(x * Math.pow(10, k)) / Math.pow(10, k);
    return { text: `قرّب ${F(x, 4)} لأقرب ${k === 1 ? 'منزلة عشرية واحدة' : 'منزلتين عشريتين'}`, answer: res, hint: 'انظر إلى الرقم الذي يلي منزلة التقريب', steps: [`${F(x, 4)} ≈ ${F(res, 3)}`] };
  });

  /* ======================= الصفوف ٥–٦ ======================= */
  add('negatives', 'الأعداد السالبة', 'الأعداد', (l) => {
    if (l <= 2) { const t = rand(-8, 8), d = rand(3, 12); const up = Math.random() < 0.5; return { text: `كانت درجة الحرارة ${L(t)}° ثم ${up ? 'ارتفعت' : 'انخفضت'} ${L(d)} درجات. كم أصبحت؟`, answer: up ? t + d : t - d, hint: 'استعن بخط الأعداد: الارتفاع إلى اليمين والانخفاض إلى اليسار', steps: [`${L(t)} ${up ? '+' : '−'} ${L(d)} = ${L(up ? t + d : t - d)}`] }; }
    const a = nz(-20, 20), b = nz(-20, 20), op = pick(l === 3 ? ['+', '−'] : ['×', '÷', '+', '−']);
    let ans, text;
    if (op === '÷') { ans = nz(-9, 9); text = `${L(a * ans)} ÷ (${L(a)})`; }
    else { ans = op === '+' ? a + b : op === '−' ? a - b : a * b; text = `${L(a)} ${op} (${L(b)})`; }
    return { text: ms(text + ' = ؟'), answer: ans, hint: op === '×' || op === '÷' ? 'إشارتان متشابهتان ⇐ موجب، مختلفتان ⇐ سالب' : 'طرح سالب = جمع موجب', steps: [`${text} = ${L(ans)}`] };
  });

  add('factors', 'العوامل والمضاعفات', 'الأعداد', (l) => {
    if (l === 1) { const n = pick([12, 18, 20, 24, 30, 36, 16, 28]); return { text: `كم عدد عوامل العدد ${L(n)}؟`, answer: E.divisors(n).length, hint: 'اكتب أزواج العوامل: ١ × ... ، ٢ × ... ، حتى تتكرر', steps: [`العوامل: ${E.divisors(n).map(L).join('، ')}`] }; }
    const a = rand(2, 12) * rand(1, 4), b = rand(2, 12) * rand(1, 4);
    if (a === b) return T.factors.gen(l);
    if (l === 2 || (l >= 4 && Math.random() < 0.5)) return { text: `ما القاسم المشترك الأكبر (ق.م.أ) للعددين ${L(a)} و${L(b)}؟`, answer: E.gcd(a, b), hint: 'اكتب عوامل كل عدد وابحث عن أكبر عامل مشترك', steps: [`ق.م.أ = ${L(E.gcd(a, b))}`] };
    return { text: `ما المضاعف المشترك الأصغر (م.م.أ) للعددين ${L(a)} و${L(b)}؟`, answer: E.lcm(a, b), hint: 'اكتب مضاعفات العدد الأكبر حتى تجد مضاعفاً يقبل القسمة على الآخر', steps: [`م.م.أ = ${L(E.lcm(a, b))}`] };
  });

  add('primes', 'الأعداد الأولية والتحليل', 'الأعداد', (l) => {
    if (l === 1) { const n = pick([10, 20, 30]); const c = Array.from({ length: n }, (_, i) => i + 1).filter(E.isPrime).length; return { text: `كم عدداً أولياً يقع بين ١ و${L(n)}؟`, answer: c, hint: 'العدد الأولي له عاملان فقط: ١ ونفسه (والعدد ١ ليس أولياً)', steps: [`الأعداد الأولية: ${Array.from({ length: n }, (_, i) => i + 1).filter(E.isPrime).map(L).join('، ')}`] }; }
    if (l === 2) { const nums = M.shuffle([rand(2, 50), rand(2, 50), rand(2, 50), pick([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47])]); const p = nums.filter(E.isPrime); if (p.length !== 1) return T.primes.gen(l); return { text: `أيّ الأعداد التالية أولي؟ ${nums.map(L).join('، ')}`, type: 'choice', choices: nums.map(L), answer: nums.indexOf(p[0]), hint: 'اختبر القسمة على ٢، ٣، ٥، ٧', steps: [`${L(p[0])} عدد أولي`] }; }
    const n = pick([2, 3, 5]) * pick([2, 3, 7]) * pick([2, 5, 11, 13]) * (l >= 4 ? pick([3, 7]) : 1);
    const f = E.factorize(n);
    return { text: `ما أكبر عامل أولي للعدد ${L(n)}؟`, answer: Math.max(...f), hint: 'حلّل العدد باستخدام شجرة العوامل', steps: [`${L(n)} = ${f.map(L).join(' × ')}`] };
  });

  add('decimals', 'الأعداد العشرية', 'الأعداد', (l) => {
    const a = rand(11, 999) / 10, b = rand(11, 99) / 10;
    const ops = byLevel(l, [['+'], ['+', '−'], ['×'], ['×', '÷'], ['÷']]);
    const op = pick(ops);
    let ans, text;
    if (op === '÷') { const q = rand(12, 99) / 10; const d = pick([2, 4, 5, 0.5, 0.2, 0.4]); ans = q; text = `${F(r2(q * d), 4)} ÷ ${F(d)}`; }
    else if (op === '×') { const x = rand(11, 99) / 10, y = l >= 4 ? rand(11, 99) / 10 : rand(2, 9); ans = +(x * y).toFixed(4); text = `${F(x)} × ${F(y)}`; }
    else { ans = +(op === '+' ? a + b : a - b).toFixed(4); text = `${F(a)} ${op} ${F(b)}`; }
    return { text: ms(text + ' = ؟'), answer: ans, hint: op === '×' ? 'اضرب دون الفاصلة ثم ضع الفاصلة بعدد منازل العاملين معاً' : op === '÷' ? 'حوّل المقسوم عليه إلى عدد صحيح بضرب العددين في ١٠ أو ١٠٠' : 'حاذِ الفواصل العشرية فوق بعضها', steps: [`${text} = ${F(ans, 4)}`] };
  });

  add('fdp', 'الكسور والأعداد العشرية والنسب المئوية', 'الأعداد', (l) => {
    const [n, d] = pick([[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [1, 8], [3, 8], [1, 10], [7, 10], [1, 20], [3, 20], [9, 25]]);
    const kind = byLevel(l, ['dec', 'pct', pick(['dec', 'pct']), 'pctToFrac', 'decToFrac']);
    if (kind === 'dec') return { text: `اكتب ${frac(n, d)} كعدد عشري`, answer: n / d, hint: `اقسم البسط على المقام: ${L(n)} ÷ ${L(d)}`, steps: [`${L(n)} ÷ ${L(d)} = ${F(n / d, 4)}`] };
    if (kind === 'pct') return { text: `اكتب ${frac(n, d)} كنسبة مئوية`, answer: (n / d) * 100, hint: 'حوّل الكسر إلى مقام ١٠٠ أو اضرب في ١٠٠٪', steps: [`${frac(n, d)} × ١٠٠ = ${F((n / d) * 100)}٪`] };
    const g = E.gcd(n, d);
    if (kind === 'pctToFrac') return { text: `اكتب ${F((n / d) * 100)}٪ ككسر في أبسط صورة`, answer: n / d, fracAns: [n / g, d / g], inputHint: 'مثال: ٣/٤', hint: 'اكتب النسبة على ١٠٠ ثم بسّط', steps: [`${frac((n / d) * 100, 100)} = ${frac(n, d)}`] };
    return { text: `اكتب ${F(n / d, 4)} ككسر في أبسط صورة`, answer: n / d, fracAns: [n / g, d / g], inputHint: 'مثال: ٣/٤', hint: 'اكتب العدد على ١٠ أو ١٠٠ أو ١٠٠٠ ثم بسّط', steps: [`${F(n / d, 4)} = ${frac(n, d)}`] };
  });

  add('orderOps', 'ترتيب العمليات', 'الأعداد', (l) => {
    const a = rand(2, 9), b = rand(2, 9), c = rand(2, 9), d = rand(1, 5);
    const forms = byLevel(l, [
      [`${a} + ${b} × ${c}`], [`(${a} + ${b}) × ${c}`, `${a * c} ÷ ${c} + ${b}`], [`${a} + ${b} × ${c} - ${d}`, `(${a + b}) × ${c} ÷ ${c}`],
      [`${a}^2 + ${b} × ${c}`, `(${a} + ${b})^2 - ${c}`], [`${a} × (${b} + ${c})^2 ÷ ${a}`, `${a * 4} ÷ (${b} - ${b - 2}) + ${c}^2`],
    ]);
    const f = pick(forms);
    const v = E.evaluate(E.parse(f), {}, 'deg');
    return { text: ms(E.toText(E.parse(f), true) + ' = ؟'), answer: v, hint: 'الأقواس أولاً، ثم الأسس، ثم الضرب والقسمة، ثم الجمع والطرح', steps: [`الناتج = ${L(v)}`] };
  });

  add('ratio', 'النسبة والتناسب', 'الأعداد', (l) => {
    if (l === 1) { const a = rand(2, 9) * 2, b = rand(2, 9) * 2; const g = E.gcd(a, b); return { text: `بسّط النسبة ${L(a)} : ${L(b)}`, answer: [a / g, b / g], type: 'pair', display: `${L(a / g)} : ${L(b / g)}`, inputHint: 'مثال: ٢ : ٣', hint: 'اقسم الحدين على القاسم المشترك الأكبر', steps: [`ق.م.أ = ${L(g)} ⇐ ${L(a / g)} : ${L(b / g)}`] }; }
    if (l === 2) { const a = rand(1, 5), b = rand(1, 5), k = rand(2, 12); return { text: `النسبة بين عدد البنين والبنات ${L(a)} : ${L(b)}. إذا كان عدد البنين ${L(a * k)} فكم عدد البنات؟`, answer: b * k, hint: 'أوجد قيمة الجزء الواحد', steps: [`الجزء الواحد = ${L(a * k)} ÷ ${L(a)} = ${L(k)}`, `البنات = ${L(b)} × ${L(k)} = ${L(b * k)}`] }; }
    if (l === 3) { const a = rand(1, 5), b = rand(1, 5), k = rand(3, 20); const tot = (a + b) * k; return { text: `قسّم ${L(tot)} ريالاً بين أحمد وسالم بنسبة ${L(a)} : ${L(b)}. كم نصيب أحمد؟`, answer: a * k, hint: 'اجمع أجزاء النسبة ثم أوجد قيمة الجزء', steps: [`مجموع الأجزاء = ${L(a + b)}`, `الجزء = ${L(tot)} ÷ ${L(a + b)} = ${L(k)}`, `نصيب أحمد = ${L(a)} × ${L(k)} = ${L(a * k)}`] }; }
    if (l === 4) { const price = rand(2, 9) * 100, n = rand(2, 6), m = rand(7, 15); return { text: `ثمن ${L(n)} أقلام ${L(price * n)} بيسة. كم ثمن ${L(m)} أقلام؟ (تناسب طردي)`, answer: price * m, hint: 'أوجد ثمن القلم الواحد أولاً', steps: [`ثمن القلم = ${L(price * n)} ÷ ${L(n)} = ${L(price)}`, `${L(m)} × ${L(price)} = ${L(price * m)} بيسة`] }; }
    const w = rand(2, 6), d = rand(4, 12); const k = w * d; const w2 = pick(E.divisors(k).filter((x) => x !== w && x > 1 && x < k)) || w * 2;
    return { text: `يُنهي ${L(w)} عمال عملاً في ${L(d)} أيام. في كم يوماً يُنهيه ${L(w2)} عمال؟ (تناسب عكسي)`, answer: k / w2, hint: 'في التناسب العكسي: حاصل الضرب ثابت', steps: [`${L(w)} × ${L(d)} = ${L(k)} يوم-عامل`, `${L(k)} ÷ ${L(w2)} = ${F(k / w2)} يوم`] };
  });

  add('coordinates', 'المستوى الإحداثي', 'الهندسة', (l) => {
    if (l === 1) { const x = rand(1, 9), y = rand(1, 9); const k = pick(['x', 'y']); return { text: `ما ${k === 'x' ? 'الإحداثي السيني' : 'الإحداثي الصادي'} للنقطة ${M.pointStr(x, y)}؟`, answer: k === 'x' ? x : y, hint: 'النقطة تُكتب (السيني، الصادي): الأفقي أولاً ثم الرأسي', steps: [`${k === 'x' ? 'السيني' : 'الصادي'} = ${L(k === 'x' ? x : y)}`] }; }
    const x1 = rand(-8, 8), y1 = rand(-8, 8), x2 = rand(-8, 8), y2 = rand(-8, 8);
    if (l === 2) { const dx = Math.abs(x2 - x1); return { text: `ما المسافة بين النقطتين ${M.pointStr(x1, y1)} و${M.pointStr(x2, y1)}؟`, answer: dx, hint: 'النقطتان على خط أفقي واحد: اطرح الإحداثيين السينيين', steps: [`|${L(x2)} − ${L(x1)}| = ${L(dx)}`] }; }
    if (l === 3) { const quad = (x, y) => (x > 0 && y > 0 ? 1 : x < 0 && y > 0 ? 2 : x < 0 && y < 0 ? 3 : 4); const x = nz(-9, 9), y = nz(-9, 9); return { text: `في أي ربع تقع النقطة ${M.pointStr(x, y)}؟ (اكتب رقم الربع)`, answer: quad(x, y), hint: 'الربع الأول (+،+)، الثاني (−،+)، الثالث (−،−)، الرابع (+،−)', steps: [`الربع ${L(quad(x, y))}`] }; }
    if (l === 4) { const ax = 2 * rand(-5, 5), ay = 2 * rand(-5, 5), bx = 2 * rand(-5, 5), by = 2 * rand(-5, 5); return { text: `أوجد نقطة منتصف القطعة الواصلة بين ${M.pointStr(ax, ay)} و${M.pointStr(bx, by)}`, answer: [(ax + bx) / 2, (ay + by) / 2], type: 'pair', inputHint: 'مثال: (٢، -٣)', hint: 'المنتصف = (متوسط السينات، متوسط الصادات)', steps: [`((${L(ax)} + ${L(bx)}) ÷ ٢، (${L(ay)} + ${L(by)}) ÷ ٢) = ${M.pointStr((ax + bx) / 2, (ay + by) / 2)}`] }; }
    const [a, b, c] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10]]);
    const px = rand(-5, 5), py = rand(-5, 5);
    return { text: `ما المسافة بين النقطتين ${M.pointStr(px, py)} و${M.pointStr(px + a, py + b)}؟`, answer: c, hint: 'المسافة = √((س٢ − س١)² + (ص٢ − ص١)²)', steps: [`√(${L(a)}² + ${L(b)}²) = √${L(c * c)} = ${L(c)}`] };
  });

  add('transform', 'التحويلات الهندسية', 'الهندسة', (l) => {
    const x = nz(-8, 8), y = nz(-8, 8);
    const kinds = byLevel(l, [['ry'], ['ry', 'rx'], ['ry', 'rx', 'tr'], ['r90', 'r180', 'tr'], ['r90', 'r270', 'dil']]);
    const k = pick(kinds);
    const a = rand(-5, 5), b = rand(-5, 5), s = pick([2, 3]);
    const map = { ry: [-x, y, 'انعكاس في محور الصادات: (س، ص) ⇐ (−س، ص)', 'الانعكاس في محور الصادات'], rx: [x, -y, 'انعكاس في محور السينات: (س، ص) ⇐ (س، −ص)', 'الانعكاس في محور السينات'], tr: [x + a, y + b, `انسحاب بمقدار (${L(a)}، ${L(b)}): نضيف ${L(a)} للسيني و${L(b)} للصادي`, `الانسحاب بمقدار (${L(a)}، ${L(b)})`], r90: [-y, x, 'دوران ٩٠° عكس عقارب الساعة حول الأصل: (س، ص) ⇐ (−ص، س)', 'الدوران ٩٠° حول نقطة الأصل (عكس عقارب الساعة)'], r180: [-x, -y, 'دوران ١٨٠°: (س، ص) ⇐ (−س، −ص)', 'الدوران ١٨٠° حول نقطة الأصل'], r270: [y, -x, 'دوران ٢٧٠° (أو ٩٠° مع عقارب الساعة): (س، ص) ⇐ (ص، −س)', 'الدوران ٢٧٠° حول نقطة الأصل'], dil: [s * x, s * y, `تمدد مركزه الأصل ومعامله ${L(s)}: نضرب الإحداثيين في ${L(s)}`, `التمدد الذي مركزه الأصل ومعامله ${L(s)}`] };
    const [nx, ny, rule, name] = map[k];
    return { text: `ما صورة النقطة ${M.pointStr(x, y)} تحت ${name}؟`, answer: [nx, ny], type: 'pair', inputHint: 'مثال: (٣، -٢)', hint: rule, steps: [rule, `الصورة: ${M.pointStr(nx, ny)}`] };
  });

  add('volume', 'الحجم ومساحة السطح', 'الهندسة', (l) => {
    const a = rand(2, 12), b = rand(2, 10), c = rand(2, 9);
    if (l === 1) return { text: `مكعب طول حرفه ${L(c)} سم. ما حجمه؟`, answer: c ** 3, hint: 'حجم المكعب = ل × ل × ل', steps: [`${L(c)}³ = ${L(c ** 3)} سم³`] };
    if (l === 2) return { text: `متوازي مستطيلات أبعاده ${L(a)} سم و${L(b)} سم و${L(c)} سم. ما حجمه؟`, answer: a * b * c, hint: 'الحجم = الطول × العرض × الارتفاع', steps: [`${L(a)} × ${L(b)} × ${L(c)} = ${L(a * b * c)} سم³`] };
    if (l === 3) return { text: `ما المساحة الكلية لسطح مكعب طول حرفه ${L(c)} سم؟`, answer: 6 * c * c, hint: 'للمكعب ٦ أوجه مربعة متطابقة', steps: [`٦ × ${L(c)}² = ${L(6 * c * c)} سم²`] };
    if (l === 4) return { text: `ما المساحة الكلية لسطح متوازي مستطيلات أبعاده ${L(a)} و${L(b)} و${L(c)} سم؟`, answer: 2 * (a * b + a * c + b * c), hint: 'المساحة الكلية = ٢(ل ع + ل ر + ع ر)', steps: [`٢(${L(a * b)} + ${L(a * c)} + ${L(b * c)}) = ${L(2 * (a * b + a * c + b * c))} سم²`] };
    const v = a * b * c; return { text: `حوض على شكل متوازي مستطيلات حجمه ${L(v)} سم³، طوله ${L(a)} سم وعرضه ${L(b)} سم. ما ارتفاعه؟`, answer: c, hint: 'الارتفاع = الحجم ÷ (الطول × العرض)', steps: [`${L(v)} ÷ (${L(a)} × ${L(b)}) = ${L(c)} سم`] };
  });

  add('algExpr', 'التعابير الجبرية', 'الجبر', (l) => {
    const x = rand(-5, 9), a = nz(-6, 9), b = nz(-9, 9), c = nz(-5, 5);
    if (l <= 2) { const e = l === 1 ? `${L(Math.abs(a))}س${sg(b)}` : `${L(a)}س${sg(b)}`; const val = (l === 1 ? Math.abs(a) : a) * x + b; return { text: `أوجد قيمة التعبير ${ms(e.replace(/س/g, V()))} عندما ${ms(V() + ' = ' + L(x))}`, answer: val, hint: `عوّض بـ ${L(x)} مكان ${V()} ثم احسب`, steps: [`${e.replace(/س/g, '(' + L(x) + ')')} = ${L(val)}`] }; }
    if (l === 3) { const p = rand(2, 9), q = rand(2, 9), r = rand(1, 5); return { text: `بسّط: ${ms(`${L(p)}${V()} + ${L(q)}${V()} - ${L(r)}${V()}`)}`, answer: `${p + q - r}x`, type: 'expr', inputHint: 'مثال: ٥س', hint: 'اجمع معاملات الحدود المتشابهة', steps: [`(${L(p)} + ${L(q)} − ${L(r)})${V()} = ${L(p + q - r)}${V()}`] }; }
    if (l === 4) { const p = rand(2, 7), q = nz(-9, 9), r = rand(2, 7), s = nz(-9, 9); return { text: `بسّط: ${ms(`${L(p)}${V()}${sg(q)} + ${L(r)}${V()}${sg(s)}`)}`, answer: `${p + r}x + ${q + s}`, type: 'expr', hint: 'اجمع حدود المتغير معاً والأعداد الثابتة معاً', steps: [`${L(p + r)}${V()}${sg(q + s)}`] }; }
    return { text: `أوجد قيمة ${ms(`${L(a)}${V()}² ${sg(b)}${V()}${sg(c)}`)} عندما ${ms(V() + ' = ' + L(x))}`, answer: a * x * x + b * x + c, hint: 'احسب الأس أولاً ثم الضرب ثم الجمع', steps: [`${L(a)}(${L(x)})² ${sg(b)}(${L(x)})${sg(c)} = ${L(a * x * x + b * x + c)}`] };
  });

  /* ======================= الصفوف ٧–٨ ======================= */
  add('sci', 'الصيغة العلمية', 'الأعداد', (l) => {
    const m = rand(11, 99) / 10, e = l <= 2 ? rand(3, 7) : l === 3 ? -rand(2, 6) : rand(-6, 9);
    const n = +(m * Math.pow(10, e)).toPrecision(6);
    if (l <= 3) return { text: `اكتب العدد ${F(n, 10)} بالصيغة العلمية (اكتب الأس فقط: ${F(m)} × ١٠^؟)`, answer: e, hint: 'عُدّ المنازل التي تتحركها الفاصلة حتى يصبح العدد بين ١ و ١٠', steps: [`${F(n, 10)} = ${F(m)} × ١٠<sup>${L(e)}</sup>`] };
    const m2 = rand(11, 49) / 10, e2 = rand(-3, 4);
    const prod = m * m2 * Math.pow(10, e + e2);
    return { text: `احسب واكتب الناتج بالصيغة العلمية: (${F(m)} × ١٠<sup>${L(e)}</sup>) × (${F(m2)} × ١٠<sup>${L(e2)}</sup>)`, answer: +prod.toPrecision(6), tol: 0.001, inputHint: 'مثال: ٣٫٢ × ١٠^٥', display: P.scientific(+prod.toPrecision(6)).answer, hint: 'اضرب المعاملين واجمع الأسس، ثم عدّل المعامل ليكون بين ١ و ١٠', steps: [`${F(m * m2)} × ١٠<sup>${L(e + e2)}</sup>`, `= ${M.htmlToPlain ? '' : ''}${P.scientific(+prod.toPrecision(6)).answer}`] };
  });

  add('expand', 'فك الأقواس والتحليل', 'الجبر', (l) => {
    const a = nz(-6, 6), b = nz(-9, 9), c = nz(-9, 9), k = rand(2, 7);
    if (l === 1) return { text: `فكّ الأقواس: ${ms(`${L(k)}(${V()}${sg(b)})`)}`, answer: `${k}x + ${k * b}`, type: 'expr', hint: 'اضرب العدد خارج القوس في كل حد داخله', steps: [`${L(k)}${V()}${sg(k * b)}`] };
    if (l === 2) return { text: `فكّ وبسّط: ${ms(`(${V()}${sg(b)})(${V()}${sg(c)})`)}`, answer: `x^2 + ${b + c}x + ${b * c}`, type: 'expr', hint: 'اضرب كل حد في القوس الأول في كل حد في القوس الثاني', steps: [`${V()}²${sg(b + c)}${V()}${sg(b * c)}`] };
    if (l === 3) { const g = rand(2, 6), p = rand(1, 7); return { text: `حلّل بإخراج العامل المشترك: ${ms(`${L(g * k)}${V()}${sg(g * p)}`)}`, answer: `${g}(${k}x + ${p})`, type: 'expr', mustFactor: true, hint: 'أوجد ق.م.أ للمعاملات وأخرجه خارج القوس', steps: [`${L(g)}(${L(k)}${V()} + ${L(p)})`] }; }
    if (l === 4) { const r1 = nz(-9, 9), r2x = nz(-9, 9); return { text: `حلّل: ${ms(`${V()}²${sg(-(r1 + r2x))}${V()}${sg(r1 * r2x)}`.replace(/ \+ ٠س| - ٠س/, ''))}`, answer: `(x - ${r1})(x - ${r2x})`, type: 'expr', mustFactor: true, hint: `ابحث عن عددين حاصل ضربهما ${L(r1 * r2x)} ومجموعهما ${L(r1 + r2x)}`, steps: [`(${V()}${sg(-r1)})(${V()}${sg(-r2x)})`] }; }
    const p = rand(2, 9); return { text: `حلّل (فرق بين مربعين): ${ms(`${V()}² - ${L(p * p)}`)}`, answer: `(x - ${p})(x + ${p})`, type: 'expr', mustFactor: true, hint: 'أ² − ب² = (أ − ب)(أ + ب)', steps: [`(${V()} − ${L(p)})(${V()} + ${L(p)})`] };
  });

  add('linIneq', 'المتباينات الخطية', 'الجبر', (l) => {
    const x = rand(-6, 9), a = byLevel(l, [1, rand(2, 6), rand(2, 6), -rand(2, 6), -rand(2, 6)]), b = nz(-10, 10);
    const rel = pick(['<', '>', '<=', '>=']);
    const REL = { '<': '<', '>': '>', '<=': '≤', '>=': '≥' };
    const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
    const final = a < 0 ? flip[rel] : rel;
    return { text: `حلّ المتباينة: ${ms(`${cx(a)}${sg(b)} ${REL[rel]} ${L(a * x + b)}`)}`, answer: { rel: final, v: x }, type: 'ineq', inputHint: 'مثال: س > ٣', hint: a < 0 ? 'انتبه: عند القسمة على عدد سالب تنعكس إشارة المتباينة' : 'حلّها مثل المعادلة', steps: [`${cx(a)} ${REL[rel]} ${L(a * x)}`, a < 0 ? 'نقسم على عدد سالب ⇐ نعكس الإشارة' : `نقسم على ${L(a)}`, `${V()} ${REL[final]} ${L(x)}`] };
  });

  add('slope', 'الميل ومعادلة المستقيم', 'الجبر', (l) => {
    const m = nz(-4, 4), c = rand(-8, 8), x1 = rand(-5, 5), x2 = x1 + rand(1, 5);
    if (l <= 2) return { text: `ما ميل المستقيم المار بالنقطتين ${M.pointStr(x1, m * x1 + c)} و${M.pointStr(x2, m * x2 + c)}؟`, answer: m, hint: 'الميل = (ص٢ − ص١) ÷ (س٢ − س١)', steps: [`(${L(m * x2 + c)} − ${L(m * x1 + c)}) ÷ (${L(x2)} − ${L(x1)}) = ${L(m)}`] };
    if (l === 3) return { text: `ما ميل المستقيم ${ms(`${V('y')} = ${cx(m)}${sg(c)}`)}؟ وما مقطعه الصادي؟ (اكتب الميل ثم المقطع)`, answer: [m, c], type: 'pair', inputHint: 'مثال: ٢، -٣', hint: 'في الصورة ص = م س + ب: م هو الميل وب هو المقطع الصادي', steps: [`الميل = ${L(m)} ، المقطع = ${L(c)}`] };
    if (l === 4) return { text: `أوجد معادلة المستقيم الذي ميله ${L(m)} ويمر بالنقطة ${M.pointStr(x1, m * x1 + c)}`, answer: `${m}x + ${c}`, type: 'expr', inputHint: 'اكتب: ص = ...', hint: 'عوّض في ص = م س + ب لإيجاد ب', steps: [`${L(m * x1 + c)} = ${L(m)} × ${L(x1)} + ب ⇐ ب = ${L(c)}`, `${V('y')} = ${cx(m)}${sg(c)}`] };
    const m2 = -1 / m;
    return { text: `ما ميل المستقيم العمودي على المستقيم ${ms(`${V('y')} = ${cx(m)}${sg(c)}`)}؟`, answer: m2, hint: 'حاصل ضرب ميلي المستقيمين المتعامدين = −١', steps: [`م٢ = −١ ÷ ${L(m)} = ${M.fracHTML(m2)}`] };
  });

  add('circle', 'الدائرة: المحيط والمساحة', 'الهندسة', (l) => {
    const r = rand(2, 14);
    if (l === 1) return { text: `دائرة نصف قطرها ${L(r)} سم. ما قطرها؟`, answer: 2 * r, hint: 'القطر = ٢ × نصف القطر', steps: [`٢ × ${L(r)} = ${L(2 * r)} سم`] };
    if (l === 2) return { text: `ما محيط دائرة نصف قطرها ${L(r)} سم؟ (ط ≈ ٣٫١٤)`, answer: r2(2 * 3.14 * r), tol: 0.005, hint: 'المحيط = ٢ ط نق', steps: [`٢ × ٣٫١٤ × ${L(r)} = ${F(2 * 3.14 * r)}`] };
    if (l === 3) return { text: `ما مساحة دائرة نصف قطرها ${L(r)} سم؟ (ط ≈ ٣٫١٤)`, answer: r2(3.14 * r * r), tol: 0.005, hint: 'المساحة = ط نق²', steps: [`٣٫١٤ × ${L(r)}² = ${F(3.14 * r * r)}`] };
    if (l === 4) { const d = 2 * r; return { text: `ما مساحة دائرة قطرها ${L(d)} سم؟ اكتب الإجابة بدلالة ط`, answer: `${r * r}pi`, type: 'expr', inputHint: `مثال: ٢٥ط`, hint: 'أوجد نصف القطر أولاً ثم المساحة = ط نق²', steps: [`نق = ${L(r)} ⇐ المساحة = ${L(r * r)}ط`] }; }
    const C = r2(2 * 3.14 * r); return { text: `محيط دائرة ${F(C)} سم. ما نصف قطرها؟ (ط ≈ ٣٫١٤)`, answer: r, tol: 0.01, hint: 'نق = المحيط ÷ (٢ ط)', steps: [`${F(C)} ÷ ٦٫٢٨ = ${L(r)}`] };
  });

  add('parallel', 'الزوايا والمستقيمات المتوازية', 'الهندسة', (l) => {
    const a = rand(35, 145);
    const kinds = byLevel(l, [['vert', 'supp'], ['corr', 'alt'], ['corr', 'alt', 'co'], ['co', 'ext'], ['ext', 'iso']]);
    const k = pick(kinds);
    const Q = {
      vert: [`زاويتان متقابلتان بالرأس، قياس إحداهما ${L(a)}°. ما قياس الأخرى؟`, a, 'الزاويتان المتقابلتان بالرأس متساويتان'],
      supp: [`زاويتان متجاورتان على خط مستقيم، قياس إحداهما ${L(a)}°. ما قياس الأخرى؟`, 180 - a, 'الزوايا على خط مستقيم مجموعها ١٨٠°'],
      corr: [`مستقيمان متوازيان قطعهما قاطع. قياس إحدى الزاويتين المتناظرتين ${L(a)}°. ما قياس الأخرى؟`, a, 'الزاويتان المتناظرتان متساويتان'],
      alt: [`مستقيمان متوازيان قطعهما قاطع. قياس زاوية ${L(a)}°. ما قياس الزاوية المتبادلة معها داخلياً؟`, a, 'الزاويتان المتبادلتان داخلياً متساويتان'],
      co: [`مستقيمان متوازيان قطعهما قاطع. قياس زاوية ${L(a)}°. ما قياس الزاوية الداخلية الواقعة معها في جهة واحدة من القاطع؟`, 180 - a, 'الزاويتان الداخليتان في جهة واحدة متكاملتان (مجموعهما ١٨٠°)'],
      ext: (() => { const b = rand(30, 80), c = rand(30, 80); return [`في مثلث، زاويتان داخليتان ${L(b)}° و${L(c)}°. ما قياس الزاوية الخارجية المجاورة للزاوية الثالثة؟`, b + c, 'الزاوية الخارجية = مجموع الزاويتين الداخليتين البعيدتين']; })(),
      iso: (() => { const v = rand(20, 140); return [`مثلث متطابق الضلعين قياس زاوية رأسه ${L(v)}°. ما قياس إحدى زاويتي القاعدة؟`, (180 - v) / 2, 'زاويتا القاعدة في المثلث المتطابق الضلعين متساويتان']; })(),
    }[k];
    return { text: Q[0], answer: Q[1], hint: Q[2], steps: [Q[2], `القياس = ${F(Q[1])}°`] };
  });

  add('speed', 'السرعة والمسافة والزمن', 'القياس', (l) => {
    const s = rand(4, 12) * 10, t = byLevel(l, [rand(2, 5), rand(2, 5), rand(2, 6) + 0.5, rand(2, 5), rand(2, 5)]);
    const d = s * t;
    const kind = byLevel(l, ['d', pick(['d', 's']), pick(['s', 't']), 't', 'avg']);
    if (kind === 'd') return { text: `تسير سيارة بسرعة ${L(s)} كم/ساعة لمدة ${F(t)} ساعات. ما المسافة؟`, answer: d, hint: 'المسافة = السرعة × الزمن', steps: [`${L(s)} × ${F(t)} = ${F(d)} كم`] };
    if (kind === 's') return { text: `قطع قطار ${F(d)} كم في ${F(t)} ساعات. ما سرعته المتوسطة بالكيلومتر لكل ساعة؟`, answer: s, hint: 'السرعة = المسافة ÷ الزمن', steps: [`${F(d)} ÷ ${F(t)} = ${L(s)} كم/ساعة`] };
    if (kind === 't') return { text: `المسافة من مسقط إلى صلالة نحو ${F(d)} كم. كم ساعة تستغرق الرحلة بسرعة ${L(s)} كم/ساعة؟`, answer: t, hint: 'الزمن = المسافة ÷ السرعة', steps: [`${F(d)} ÷ ${L(s)} = ${F(t)} ساعة`] };
    const s2 = s + 20, t2 = rand(1, 3); return { text: `سار شخص ${L(t)} ساعات بسرعة ${L(s)} كم/ساعة ثم ${L(t2)} ساعة بسرعة ${L(s2)} كم/ساعة. ما السرعة المتوسطة للرحلة كلها؟ (قرّب لمنزلة عشرية)`, answer: Math.round(((s * t + s2 * t2) / (t + t2)) * 10) / 10, tol: 0.01, hint: 'السرعة المتوسطة = المسافة الكلية ÷ الزمن الكلي', steps: [`(${L(s * t)} + ${L(s2 * t2)}) ÷ ${L(t + t2)} = ${F((s * t + s2 * t2) / (t + t2), 1)}`] };
  });

  add('interest', 'الربح والخسارة والفائدة', 'الأعداد', (l) => {
    const p = rand(2, 20) * 100, r = pick([2, 3, 4, 5, 6, 8, 10]), t = rand(1, 5);
    if (l <= 2) { const cost = rand(10, 90) * 10, pr = pick([10, 20, 25, 50]); return { text: `اشترى تاجر سلعة بمبلغ ${L(cost)} ريالاً وباعها بربح ${L(pr)}٪. بكم باعها؟`, answer: cost * (1 + pr / 100), hint: 'سعر البيع = التكلفة + الربح', steps: [`الربح = ${L(pr)}٪ × ${L(cost)} = ${F((cost * pr) / 100)}`, `سعر البيع = ${F(cost * (1 + pr / 100))}`] }; }
    if (l === 3) return { text: `أودعت ليلى ${L(p)} ريال في بنك بفائدة بسيطة ${L(r)}٪ سنوياً. كم الفائدة بعد ${L(t)} سنوات؟`, answer: (p * r * t) / 100, hint: 'الفائدة البسيطة = المبلغ × النسبة × الزمن ÷ ١٠٠', steps: [`${L(p)} × ${L(r)} × ${L(t)} ÷ ١٠٠ = ${F((p * r * t) / 100)}`] };
    if (l === 4) return { text: `أُودع مبلغ ${L(p)} ريال بفائدة بسيطة ${L(r)}٪. كم يصبح المبلغ (الجملة) بعد ${L(t)} سنوات؟`, answer: p + (p * r * t) / 100, hint: 'الجملة = المبلغ + الفائدة', steps: [`الفائدة = ${F((p * r * t) / 100)}`, `الجملة = ${F(p + (p * r * t) / 100)}`] };
    const A = p * Math.pow(1 + r / 100, t);
    return { text: `أُودع ${L(p)} ريال بفائدة مركبة ${L(r)}٪ سنوياً. كم يصبح المبلغ بعد ${L(t)} سنوات؟ (قرّب لمنزلتين)`, answer: Math.round(A * 100) / 100, tol: 0.0005, hint: 'الجملة = المبلغ × (١ + ر/١٠٠)^ن', steps: [`${L(p)} × (${F(1 + r / 100)})<sup>${L(t)}</sup> = ${F(A, 2)}`] };
  });

  /* ======================= الصفوف ٩–١٠ ======================= */
  add('surds', 'الجذور الصماء', 'الأعداد', (l) => {
    const sq = pick([4, 9, 16, 25, 36, 49]), inside = pick([2, 3, 5, 6, 7]), n = sq * inside;
    if (l <= 2) return { text: `بسّط: √${L(n)}`, answer: Math.sqrt(n), display: `${L(Math.sqrt(sq))}√${L(inside)}`, inputHint: 'مثال: ٣√٢', hint: 'اكتب العدد كحاصل ضرب مربع كامل في عدد آخر', steps: [`√${L(n)} = √${L(sq)} × √${L(inside)} = ${L(Math.sqrt(sq))}√${L(inside)}`] };
    if (l === 3) { const a = rand(2, 6), b = rand(2, 6); return { text: `بسّط: ${L(a)}√${L(inside)} + ${L(b)}√${L(inside)}`, answer: (a + b) * Math.sqrt(inside), display: `${L(a + b)}√${L(inside)}`, hint: 'الجذور المتشابهة تُجمع مثل الحدود المتشابهة', steps: [`${L(a + b)}√${L(inside)}`] }; }
    if (l === 4) { const a = rand(2, 7), b = rand(2, 7); return { text: `احسب: √${L(a)} × √${L(b * b * a)}`, answer: a * b, hint: '√أ × √ب = √(أب)', steps: [`√${L(a * b * b * a)} = ${L(a * b)}`] }; }
    return { text: `أنطِق مقام الكسر: ${frac(inside * 2, '√' + L(inside))}`, answer: 2 * Math.sqrt(inside), display: `٢√${L(inside)}`, hint: 'اضرب البسط والمقام في الجذر نفسه', steps: [`${frac(inside * 2 + '√' + inside, inside)} = ٢√${L(inside)}`] };
  });

  add('expLaws', 'قوانين الأسس', 'الأعداد', (l) => {
    const a = rand(2, 5), m = rand(2, 7), n = rand(1, 5);
    const forms = byLevel(l, [
      [[`${a}^${m} × ${a}^${n}`, m + n, 'نجمع الأسس عند الضرب']],
      [[`${a}^${m + n} ÷ ${a}^${n}`, m, 'نطرح الأسس عند القسمة'], [`(${a}^${n})^2`, 2 * n, 'نضرب الأسس (قوة القوة)']],
      [[`${a}^0`, 0, 'أي عدد غير الصفر أسه صفر = ١'], [`${a}^-${n}`, -n, 'الأس السالب = المقلوب']],
      [[`${a}^${m} × ${a}^-${n}`, m - n, 'نجمع الأسس'], [`(${a}^${m} × ${a}^${n}) ÷ ${a}^${m}`, n, 'نجمع ثم نطرح']],
      [[`(${a * a})^(1/2)`, 1, 'الأس ½ يعني الجذر التربيعي'], [`(${a ** 3})^(2/3)`, 2, 'الأس الكسري: الجذر ثم القوة']],
    ]);
    const [f, e, rule] = pick(forms);
    const val = E.evaluate(E.parse(f), {}, 'deg');
    return { text: `احسب قيمة: ${ms(E.toText(E.parse(f), true))}`, answer: val, hint: rule, steps: [rule, `${L(a)}<sup>${L(e)}</sup> = ${M.fracHTML(val)}`] };
  });

  add('trigRatios', 'النسب المثلثية في المثلث القائم', 'الهندسة', (l) => {
    const ang = pick([20, 25, 30, 35, 40, 50, 55, 60, 65, 70]), hyp = rand(5, 20);
    const rad = (ang * Math.PI) / 180;
    if (l === 1) { const [a, b, c] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]]); return { text: `مثلث قائم: الضلع المقابل للزاوية θ = ${L(a)} والوتر = ${L(c)}. ما جا θ؟`, answer: a / c, inputHint: 'كسر أو عدد عشري', hint: 'جا = المقابل ÷ الوتر', steps: [`${frac(a, c)}`] }; }
    if (l === 2) { const k = pick(['sin', 'cos', 'tan']); const v = k === 'sin' ? Math.sin(rad) : k === 'cos' ? Math.cos(rad) : Math.tan(rad); return { text: `أوجد ${ {sin: 'جا', cos: 'جتا', tan: 'ظا'}[k] } ${L(ang)}° لأقرب ٣ منازل عشرية`, answer: Math.round(v * 1000) / 1000, tol: 0.002, hint: 'استخدم الآلة الحاسبة بوضع الدرجات', steps: [`≈ ${F(v, 3)}`] }; }
    if (l === 3) { const opp = hyp * Math.sin(rad); return { text: `مثلث قائم وتره ${L(hyp)} سم، وإحدى زاويتيه الحادتين ${L(ang)}°. أوجد طول الضلع المقابل لهذه الزاوية (لأقرب منزلتين)`, answer: r2(opp), tol: 0.003, hint: 'المقابل = الوتر × جا الزاوية', steps: [`${L(hyp)} × جا ${L(ang)}° = ${F(opp, 2)}`] }; }
    if (l === 4) { const adj = rand(4, 15); const opp = adj * Math.tan(rad); return { text: `مثلث قائم فيه الضلع المجاور لزاوية ${L(ang)}° طوله ${L(adj)} سم. أوجد طول الضلع المقابل (لأقرب منزلتين)`, answer: r2(opp), tol: 0.003, hint: 'ظا = المقابل ÷ المجاور', steps: [`${L(adj)} × ظا ${L(ang)}° = ${F(opp, 2)}`] }; }
    const [a, , c] = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]]);
    const th = (Math.asin(a / c) * 180) / Math.PI;
    return { text: `مثلث قائم: الضلع المقابل للزاوية θ = ${L(a)} والوتر = ${L(c)}. أوجد θ بالدرجات (لأقرب منزلة عشرية)`, answer: Math.round(th * 10) / 10, tol: 0.003, hint: 'θ = جا⁻¹(المقابل ÷ الوتر)', steps: [`θ = جا⁻¹(${frac(a, c)}) ≈ ${F(th, 1)}°`] };
  });

  add('similarity', 'التشابه ومعامل القياس', 'الهندسة', (l) => {
    const k = byLevel(l, [2, pick([2, 3]), pick([1.5, 2.5, 3]), pick([2, 3]), pick([2, 3])]);
    const a = rand(3, 10);
    if (l <= 3) return { text: `مثلثان متشابهان معامل التشابه بينهما ${F(k)}. إذا كان طول ضلع في المثلث الصغير ${L(a)} سم، فما طول الضلع المناظر في المثلث الكبير؟`, answer: a * k, hint: 'اضرب في معامل التشابه', steps: [`${L(a)} × ${F(k)} = ${F(a * k)} سم`] };
    if (l === 4) { const A = a * a; return { text: `مضلعان متشابهان معامل التشابه ${L(k)}. مساحة الصغير ${L(A)} سم². ما مساحة الكبير؟`, answer: A * k * k, hint: 'نسبة المساحات = مربع معامل التشابه', steps: [`${L(A)} × ${L(k)}² = ${L(A * k * k)} سم²`] }; }
    return { text: `مجسمان متشابهان معامل التشابه ${L(k)}. حجم الصغير ${L(a)} سم³. ما حجم الكبير؟`, answer: a * k ** 3, hint: 'نسبة الحجوم = مكعب معامل التشابه', steps: [`${L(a)} × ${L(k)}³ = ${L(a * k ** 3)} سم³`] };
  });

  add('volumes3', 'حجوم الأسطوانة والمخروط والكرة', 'الهندسة', (l) => {
    const r = rand(2, 10), h = rand(3, 15);
    const kinds = byLevel(l, ['cyl', 'cyl', 'cone', 'sphere', pick(['csa', 'ssa'])]);
    const Q = {
      cyl: [`أسطوانة نصف قطر قاعدتها ${L(r)} سم وارتفاعها ${L(h)} سم. ما حجمها بدلالة ط؟`, `${r * r * h}pi`, 'الحجم = ط نق² ع'],
      cone: [`مخروط نصف قطر قاعدته ${L(r)} سم وارتفاعه ${L(3 * h)} سم. ما حجمه بدلالة ط؟`, `${r * r * h}pi`, 'الحجم = ⅓ ط نق² ع'],
      sphere: [`كرة نصف قطرها ${L(3 * r)} سم. ما حجمها بدلالة ط؟`, `${4 * 9 * r ** 3}pi`, 'الحجم = ⁴⁄₃ ط نق³'],
      csa: [`ما المساحة الجانبية لأسطوانة نصف قطرها ${L(r)} سم وارتفاعها ${L(h)} سم بدلالة ط؟`, `${2 * r * h}pi`, 'المساحة الجانبية = ٢ ط نق ع'],
      ssa: [`ما مساحة سطح كرة نصف قطرها ${L(r)} سم بدلالة ط؟`, `${4 * r * r}pi`, 'مساحة سطح الكرة = ٤ ط نق²'],
    }[kinds];
    return { text: Q[0], answer: Q[1], type: 'expr', inputHint: 'مثال: ٧٥ط', hint: Q[2], steps: [Q[2], `= ${M.loc(Q[1].replace('pi', 'ط'))}`] };
  });

  add('sector', 'طول القوس ومساحة القطاع والقطعة', 'الهندسة', (l) => {
    const r = rand(2, 12), th = pick([30, 45, 60, 72, 90, 120, 135, 150, 210, 240, 270]);
    const k = th / 360;
    if (l === 1) return { text: `قطاع دائري زاويته المركزية ${L(th)}° ونصف قطر دائرته ${L(r)} سم. أوجد طول قوسه. (ط ≈ ٣٫١٤)`, answer: r2(k * 2 * 3.14 * r), tol: 0.01, hint: 'طول القوس = (θ ÷ ٣٦٠) × ٢ ط نق', steps: [`(${L(th)} ÷ ٣٦٠) × ٢ × ٣٫١٤ × ${L(r)} = ${F(r2(k * 2 * 3.14 * r))} سم`] };
    if (l === 2) return { text: `قطاع دائري زاويته المركزية ${L(th)}° ونصف قطر دائرته ${L(r)} سم. أوجد مساحته. (ط ≈ ٣٫١٤)`, answer: r2(k * 3.14 * r * r), tol: 0.01, hint: 'مساحة القطاع = (θ ÷ ٣٦٠) × ط نق²', steps: [`(${L(th)} ÷ ٣٦٠) × ٣٫١٤ × ${L(r)}² = ${F(r2(k * 3.14 * r * r))} سم²`] };
    if (l === 3) return { text: `أوجد محيط قطاع دائري زاويته ${L(th)}° ونصف قطره ${L(r)} سم. (ط ≈ ٣٫١٤)`, answer: r2(2 * r + k * 2 * 3.14 * r), tol: 0.01, hint: 'محيط القطاع = ٢ نق + طول القوس', steps: [`طول القوس = ${F(r2(k * 2 * 3.14 * r))}`, `المحيط = ٢ × ${L(r)} + ${F(r2(k * 2 * 3.14 * r))} = ${F(r2(2 * r + k * 2 * 3.14 * r))} سم`] };
    if (l === 4) { const t = pick([0.5, 1, 1.2, 1.5, 2, 2.5]); return { text: `قوس في دائرة نصف قطرها ${L(r)} سم يقابل زاوية مركزية قياسها ${F(t)} راديان. أوجد طول القوس ومساحة القطاع (اكتب طول القوس).`, answer: r2(r * t), tol: 0.01, hint: 'بالراديان: ل = نق × θ ، م = ½ نق² θ', steps: [`ل = ${L(r)} × ${F(t)} = ${F(r2(r * t))} سم`, `م = ½ × ${L(r)}² × ${F(t)} = ${F(r2(0.5 * r * r * t))} سم²`] }; }
    const t2 = pick([60, 90, 120]), rad = (t2 * Math.PI) / 180, seg = 0.5 * r * r * (rad - Math.sin(rad));
    return { text: `وتر في دائرة نصف قطرها ${L(r)} سم يقابل زاوية مركزية ${L(t2)}°. أوجد مساحة القطعة الدائرية الصغرى (قرّب لأقرب جزء من مئة).`, answer: r2(seg), tol: 0.02, hint: 'مساحة القطعة = مساحة القطاع − مساحة المثلث = ½ نق² (θ − جا θ) بالراديان', steps: [`القطاع = ${F(r2(0.5 * r * r * rad))}`, `المثلث = ½ × ${L(r)}² × جا ${L(t2)}° = ${F(r2(0.5 * r * r * Math.sin(rad)))}`, `القطعة = ${F(r2(seg))} سم²`] };
  });

  add('circleThm', 'نظريات الدائرة', 'الهندسة', (l) => {
    const a = rand(20, 80);
    const Q = byLevel(l, [
      [`زاوية محيطية قياسها ${L(a)}° تقابل قوساً. ما قياس الزاوية المركزية المقابلة للقوس نفسه؟`, 2 * a, 'الزاوية المركزية = ضعف الزاوية المحيطية المشتركة معها في القوس'],
      [`زاوية مركزية قياسها ${L(2 * a)}°. ما قياس الزاوية المحيطية المرسومة على القوس نفسه؟`, a, 'المحيطية = نصف المركزية'],
      [`ما قياس الزاوية المحيطية المرسومة في نصف دائرة؟`, 90, 'الزاوية المحيطية المرسومة في نصف دائرة قائمة'],
      [`شكل رباعي دائري قياس إحدى زواياه ${L(a + 40)}°. ما قياس الزاوية المقابلة لها؟`, 140 - a, 'الزاويتان المتقابلتان في الشكل الرباعي الدائري متكاملتان'],
      [`مماس لدائرة يلتقي بنصف القطر عند نقطة التماس. ما قياس الزاوية بينهما؟`, 90, 'المماس عمودي على نصف القطر عند نقطة التماس'],
    ]);
    return { text: Q[0], answer: Q[1], hint: Q[2], steps: [Q[2], `= ${L(Q[1])}°`] };
  });

  add('functions', 'الدوال', 'الجبر', (l) => {
    const a = nz(-5, 5), b = nz(-9, 9), x = rand(-4, 6);
    if (l <= 2) { const c = rand(-3, 3); return { text: `إذا كانت ${ms(`د(${V()}) = ${cx(a)}${sg(b)}`)} فأوجد د(${L(x)})`, answer: a * x + b, hint: `عوّض ${V()} = ${L(x)}`, steps: [`${L(a)} × ${L(x)}${sg(b)} = ${L(a * x + b)}`] }; }
    if (l === 3) return { text: `إذا كانت ${ms(`د(${V()}) = ${V()}²${sg(b)}`)} فأوجد د(${L(x)})`, answer: x * x + b, hint: 'عوّض ثم احسب', steps: [`(${L(x)})²${sg(b)} = ${L(x * x + b)}`] };
    if (l === 4) { const c2 = nz(-4, 4); const g = x * c2; return { text: `إذا كانت ${ms(`د(${V()}) = ${cx(a)}${sg(b)}`)} و${ms(`هـ(${V()}) = ${cx(c2)}`)} فأوجد د(هـ(${L(x)}))`, answer: a * g + b, hint: 'احسب هـ(س) أولاً ثم عوّض الناتج في د', steps: [`هـ(${L(x)}) = ${L(g)}`, `د(${L(g)}) = ${L(a * g + b)}`] }; }
    const y = a * x + b; return { text: `إذا كانت ${ms(`د(${V()}) = ${cx(a)}${sg(b)}`)} فأوجد د⁻¹(${L(y)})`, answer: x, hint: 'حلّ المعادلة د(س) = القيمة المعطاة', steps: [`${cx(a)}${sg(b)} = ${L(y)} ⇐ ${V()} = ${L(x)}`] };
  });

  add('sets', 'المجموعات وأشكال فن', 'الإحصاء', (l) => {
    const a = rand(10, 30), b = rand(10, 30), both = rand(2, Math.min(a, b) - 1);
    if (l <= 2) return { text: `في صف: ${L(a)} طالباً يحبون كرة القدم، و${L(b)} يحبون السلة، و${L(both)} يحبون الاثنين. كم طالباً يحب إحدى اللعبتين على الأقل؟`, answer: a + b - both, hint: 'ن(أ ∪ ب) = ن(أ) + ن(ب) − ن(أ ∩ ب)', steps: [`${L(a)} + ${L(b)} − ${L(both)} = ${L(a + b - both)}`] };
    if (l === 3) return { text: `إذا كان ن(أ) = ${L(a)}، ن(ب) = ${L(b)}، ن(أ ∪ ب) = ${L(a + b - both)}، فما ن(أ ∩ ب)؟`, answer: both, hint: 'ن(أ ∩ ب) = ن(أ) + ن(ب) − ن(أ ∪ ب)', steps: [`${L(a)} + ${L(b)} − ${L(a + b - both)} = ${L(both)}`] };
    const tot = a + b - both + rand(2, 10);
    return { text: `في مجموعة من ${L(tot)} طالباً: ${L(a)} يدرسون الفيزياء، ${L(b)} الكيمياء، و${L(both)} المادتين. كم طالباً لا يدرس أياً منهما؟`, answer: tot - (a + b - both), hint: 'أوجد عدد من يدرس مادة واحدة على الأقل ثم اطرحه من الكل', steps: [`${L(tot)} − ${L(a + b - both)} = ${L(tot - (a + b - both))}`] };
  });

  add('probComb', 'الاحتمالات المركبة', 'الإحصاء', (l) => {
    if (l <= 2) return { text: 'رُميت قطعة نقود وحجر نرد معاً. ما احتمال ظهور شعار وعدد زوجي؟', answer: 1 / 4, inputHint: 'كسر', hint: 'الحدثان مستقلان: ل(أ و ب) = ل(أ) × ل(ب)', steps: [`${frac(1, 2)} × ${frac(3, 6)} = ${frac(1, 4)}`] };
    const r = rand(2, 6), b = rand(2, 6), t = r + b;
    if (l === 3) return { text: `كيس فيه ${L(r)} كرات حمراء و${L(b)} زرقاء. سُحبت كرة وأُعيدت ثم سُحبت أخرى. ما احتمال أن تكون الاثنتان حمراوين؟`, answer: (r / t) ** 2, inputHint: 'كسر', hint: 'مع الإرجاع: الحدثان مستقلان', steps: [`${frac(r, t)} × ${frac(r, t)} = ${frac(r * r, t * t)}`] };
    if (l === 4) return { text: `كيس فيه ${L(r)} كرات حمراء و${L(b)} زرقاء. سُحبت كرتان دون إرجاع. ما احتمال أن تكونا حمراوين؟`, answer: (r / t) * ((r - 1) / (t - 1)), inputHint: 'كسر', hint: 'دون إرجاع: يتغير العدد في السحبة الثانية', steps: [`${frac(r, t)} × ${frac(r - 1, t - 1)} = ${frac(r * (r - 1), t * (t - 1))}`] };
    return { text: `احتمال نجاح طالب في الرياضيات ${F(0.8)} وفي العلوم ${F(0.7)} (مستقلان). ما احتمال نجاحه في مادة واحدة على الأقل؟`, answer: 1 - 0.2 * 0.3, hint: 'ل(واحدة على الأقل) = ١ − ل(لا شيء)', steps: [`١ − (٠٫٢ × ٠٫٣) = ${F(0.94)}`] };
  });

  add('sineRule', 'قانون الجيب وجيب التمام', 'الهندسة', (l) => {
    const b = rand(5, 15), c = rand(5, 15), A = pick([40, 50, 60, 70, 100, 120]);
    if (l <= 2) { const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos((A * Math.PI) / 180)); return { text: `في المثلث أ ب جـ: ب = ${L(b)}، جـ = ${L(c)}، ∠أ = ${L(A)}°. أوجد طول الضلع أ (لأقرب منزلتين)`, answer: r2(a), tol: 0.003, hint: 'قانون جيب التمام: أ² = ب² + جـ² − ٢ب جـ جتا أ', steps: [`أ = √(${L(b * b)} + ${L(c * c)} − ${L(2 * b * c)} جتا ${L(A)}°) ≈ ${F(a, 2)}`] }; }
    if (l === 3) { const B = pick([30, 40, 45, 50]), C = pick([60, 70, 75]), a = rand(6, 15); const bb = (a * Math.sin((B * Math.PI) / 180)) / Math.sin(((180 - B - C) * Math.PI) / 180); return { text: `في المثلث أ ب جـ: أ = ${L(a)}، ∠ب = ${L(B)}°، ∠جـ = ${L(C)}°. أوجد ب (لأقرب منزلتين)`, answer: r2(bb), tol: 0.003, hint: 'أوجد ∠أ أولاً ثم استخدم قانون الجيب: أ/جا أ = ب/جا ب', steps: [`∠أ = ${L(180 - B - C)}°`, `ب = ${L(a)} × جا ${L(B)}° ÷ جا ${L(180 - B - C)}° ≈ ${F(bb, 2)}`] }; }
    const area = 0.5 * b * c * Math.sin((A * Math.PI) / 180);
    return { text: `أوجد مساحة المثلث الذي فيه ضلعان طولاهما ${L(b)} و${L(c)} والزاوية المحصورة بينهما ${L(A)}° (لأقرب منزلتين)`, answer: r2(area), tol: 0.003, hint: 'المساحة = ½ أ ب جا جـ', steps: [`½ × ${L(b)} × ${L(c)} × جا ${L(A)}° ≈ ${F(area, 2)}`] };
  });

  add('vectors', 'المتجهات', 'الهندسة', (l) => {
    const a = [nz(-6, 6), nz(-6, 6)], b = [nz(-6, 6), nz(-6, 6)];
    if (l <= 2) return { text: `إذا كان أ = (${L(a[0])}، ${L(a[1])}) و ب = (${L(b[0])}، ${L(b[1])}) فأوجد أ + ب`, answer: [a[0] + b[0], a[1] + b[1]], type: 'pair', inputHint: 'مثال: (٣، -٢)', hint: 'اجمع المركبات المتناظرة', steps: [`(${L(a[0] + b[0])}، ${L(a[1] + b[1])})`] };
    if (l === 3) { const [x, y, m] = pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [-8, 6, 10]]); return { text: `ما طول المتجه (${L(x)}، ${L(y)})؟`, answer: m, hint: 'الطول = √(س² + ص²)', steps: [`√(${L(x * x)} + ${L(y * y)}) = ${L(m)}`] }; }
    if (l === 4) return { text: `إذا كان أ = (${L(a[0])}، ${L(a[1])}) و ب = (${L(b[0])}، ${L(b[1])}) فأوجد الضرب القياسي أ · ب`, answer: a[0] * b[0] + a[1] * b[1], hint: 'أ · ب = أ₁ب₁ + أ₂ب₂', steps: [`${L(a[0] * b[0])} + ${L(a[1] * b[1])} = ${L(a[0] * b[0] + a[1] * b[1])}`] };
    const k = nz(-3, 3); return { text: `إذا كان أ = (${L(a[0])}، ${L(a[1])}) فأوجد ${L(k)}أ − ب حيث ب = (${L(b[0])}، ${L(b[1])})`, answer: [k * a[0] - b[0], k * a[1] - b[1]], type: 'pair', hint: 'اضرب كل مركبة في العدد ثم اطرح', steps: [`(${L(k * a[0] - b[0])}، ${L(k * a[1] - b[1])})`] };
  });

  add('groupedMean', 'المتوسط لبيانات مبوّبة', 'الإحصاء', (l) => {
    const k = byLevel(l, [3, 4, 4, 5, 5]), w = pick([5, 10]);
    const f = Array.from({ length: k }, () => rand(1, 12));
    const mids = f.map((_, i) => i * w + w / 2);
    const mean = mids.reduce((s, m, i) => s + m * f[i], 0) / f.reduce((a, b) => a + b, 0);
    const rows = f.map((x, i) => `${L(i * w)}–${L((i + 1) * w)}: ${L(x)}`).join(' ، ');
    return { text: `أوجد المتوسط التقديري للبيانات المبوّبة (الفئة: التكرار):<br>${rows}<br>(قرّب لمنزلتين)`, answer: r2(mean), tol: 0.002, hint: 'المتوسط = مجموع (مركز الفئة × التكرار) ÷ مجموع التكرارات', steps: [`مراكز الفئات: ${mids.map(L).join('، ')}`, `المتوسط ≈ ${F(mean, 2)}`] };
  });

  /* ======================= الصفوف ١١–١٢ ======================= */
  add('logs', 'اللوغاريتمات', 'الجبر', (l) => {
    const b = pick([2, 3, 5, 10]), e = rand(2, b === 10 ? 4 : 5);
    if (l <= 2) return { text: `احسب: ${ms(`لو<sub>${L(b)}</sub> ${L(b ** e)}`)}`, answer: e, hint: `اسأل: ${L(b)} أس كم يساوي ${L(b ** e)}؟`, steps: [`${L(b)}<sup>${L(e)}</sup> = ${L(b ** e)}`] };
    if (l === 3) return { text: `احسب: ${ms(`لو ${L(2)} + لو ${L(50)}`)}`, answer: 2, hint: 'لو أ + لو ب = لو (أب)', steps: ['لو (٢ × ٥٠) = لو ١٠٠ = ٢'] };
    if (l === 4) return { text: `حلّ: ${ms(`لو<sub>${L(b)}</sub> ${V()} = ${L(e)}`)}`, answer: b ** e, hint: 'حوّل إلى الصورة الأسية', steps: [`${V()} = ${L(b)}<sup>${L(e)}</sup> = ${L(b ** e)}`] };
    const x = rand(2, 9); return { text: `حلّ: ${ms(`لو ${V()} + لو ${L(x)} = لو ${L(x * 7)}`)}`, answer: 7, hint: 'اجمع اللوغاريتمين ثم ساوِ ما داخلهما', steps: [`لو (${L(x)}${V()}) = لو ${L(7 * x)} ⇐ ${V()} = ٧`] };
  });

  add('expEq', 'المعادلات الأسية', 'الجبر', (l) => {
    const b = pick([2, 3, 5]), x = rand(1, 5), c = rand(1, 3);
    if (l <= 2) return { text: `حلّ: ${ms(`${L(b)}<sup>${V()}</sup> = ${L(b ** x)}`)}`, answer: x, hint: `اكتب ${L(b ** x)} كقوة للأساس ${L(b)}`, steps: [`${L(b ** x)} = ${L(b)}<sup>${L(x)}</sup> ⇐ ${V()} = ${L(x)}`] };
    if (l === 3) return { text: `حلّ: ${ms(`${L(b)}<sup>${V()} + ${L(c)}</sup> = ${L(b ** (x + c))}`)}`, answer: x, hint: 'ساوِ الأسس بعد توحيد الأساس', steps: [`${V()} + ${L(c)} = ${L(x + c)} ⇐ ${V()} = ${L(x)}`] };
    if (l === 4) return { text: `حلّ: ${ms(`${L(b * b)}<sup>${V()}</sup> = ${L(b ** (2 * x))}`)}`, answer: x, hint: `اكتب ${L(b * b)} = ${L(b)}²`, steps: [`${L(b)}^(٢${V()}) = ${L(b)}<sup>${L(2 * x)}</sup> ⇐ ${V()} = ${L(x)}`] };
    const k = rand(3, 20); const v = Math.log(k) / Math.log(b);
    return { text: `حلّ باستخدام اللوغاريتمات: ${ms(`${L(b)}<sup>${V()}</sup> = ${L(k)}`)} (لأقرب ٣ منازل)`, answer: Math.round(v * 1000) / 1000, tol: 0.0005, hint: 'س = لو ك ÷ لو ب', steps: [`${V()} = لو ${L(k)} ÷ لو ${L(b)} ≈ ${F(v, 3)}`] };
  });

  add('arithSeries', 'المتتابعات والمتسلسلات الحسابية', 'الجبر', (l) => {
    const a = rand(-5, 15), d = nz(-5, 7), n = rand(8, 30);
    if (l <= 2) return { text: `متتابعة حسابية حدها الأول ${L(a)} وأساسها ${L(d)}. ما الحد رقم ${L(n)}؟`, answer: a + (n - 1) * d, hint: 'حـن = أ + (ن − ١) د', steps: [`${L(a)} + ${L(n - 1)} × ${L(d)} = ${L(a + (n - 1) * d)}`] };
    if (l === 3) return { text: `أوجد مجموع أول ${L(n)} حداً من المتتابعة الحسابية التي حدها الأول ${L(a)} وأساسها ${L(d)}`, answer: (n / 2) * (2 * a + (n - 1) * d), hint: 'جـن = ن/٢ × (٢أ + (ن − ١) د)', steps: [`${L(n)}/٢ × (${L(2 * a)} + ${L(n - 1)} × ${L(d)}) = ${L((n / 2) * (2 * a + (n - 1) * d))}`] };
    if (l === 4) { const t5 = a + 4 * d, t12 = a + 11 * d; return { text: `متتابعة حسابية حدها الخامس ${L(t5)} وحدها الثاني عشر ${L(t12)}. ما أساسها؟`, answer: d, hint: 'الفرق بين الحدين = (١٢ − ٥) × الأساس', steps: [`(${L(t12)} − ${L(t5)}) ÷ ٧ = ${L(d)}`] }; }
    return { text: `أوجد مجموع الأعداد الصحيحة من ١ إلى ${L(n * 10)}`, answer: (n * 10 * (n * 10 + 1)) / 2, hint: 'المجموع = ن(ن + ١) ÷ ٢', steps: [`${L(n * 10)} × ${L(n * 10 + 1)} ÷ ٢ = ${L((n * 10 * (n * 10 + 1)) / 2)}`] };
  });

  add('geoSeries', 'المتتابعات والمتسلسلات الهندسية', 'الجبر', (l) => {
    const a = rand(1, 6), r = pick([2, 3, -2]), n = rand(4, 8);
    if (l <= 2) return { text: `متتابعة هندسية حدها الأول ${L(a)} وأساسها ${L(r)}. ما الحد رقم ${L(n)}؟`, answer: a * r ** (n - 1), hint: 'حـن = أ × رⁿ⁻¹', steps: [`${L(a)} × ${L(r)}<sup>${L(n - 1)}</sup> = ${L(a * r ** (n - 1))}`] };
    if (l === 3) return { text: `أوجد مجموع أول ${L(n)} حدود من المتتابعة الهندسية: ${L(a)}، ${L(a * r)}، ${L(a * r * r)}، …`, answer: (a * (r ** n - 1)) / (r - 1), hint: 'جـن = أ (رⁿ − ١) ÷ (ر − ١)', steps: [`${L(a)} × (${L(r)}<sup>${L(n)}</sup> − ١) ÷ (${L(r)} − ١) = ${L((a * (r ** n - 1)) / (r - 1))}`] };
    const rr = pick([0.5, 0.25, -0.5, 1 / 3]), aa = rand(2, 12);
    return { text: `أوجد مجموع المتسلسلة الهندسية اللانهائية التي حدها الأول ${L(aa)} وأساسها ${F(rr)}`, answer: aa / (1 - rr), hint: 'بما أن |ر| < ١: جـ∞ = أ ÷ (١ − ر)', steps: [`${L(aa)} ÷ (١ − ${F(rr)}) = ${F(aa / (1 - rr))}`] };
  });

  add('remainder', 'نظرية الباقي والعوامل', 'الجبر', (l) => {
    const c = [nz(-9, 9), nz(-6, 6), rand(-4, 4), 1];
    const a = nz(-3, 3);
    const val = c.reduce((s, k, j) => s + k * a ** j, 0);
    if (l <= 3) return { text: `أوجد باقي قسمة ${ms(E.polyToText(c, 'x', true))} على ${ms(`(${V()}${sg(-a)})`)}`, answer: val, hint: `حسب نظرية الباقي: الباقي = د(${L(a)})`, steps: [`د(${L(a)}) = ${L(val)}`] };
    const k = -c.slice(0, 3).reduce((s, x, j) => s + x * a ** j, 0) / a ** 3;
    if (!Number.isInteger(k)) return T.remainder.gen(3);
    const c2 = [c[0], c[1], c[2]];
    return { text: `ما قيمة ك التي تجعل ${ms(`(${V()}${sg(-a)})`)} عاملاً من عوامل ${ms(`ك${V()}³ + ` + E.polyToText(c2, 'x', true))}؟`, answer: k, hint: `عوّض ${V()} = ${L(a)} وساوِ الناتج بالصفر`, steps: [`ك(${L(a)})³ + ${L(c2.reduce((s, x, j) => s + x * a ** j, 0))} = ٠ ⇐ ك = ${L(k)}`] };
  });

  add('radians', 'القياس الدائري (الراديان)', 'الهندسة', (l) => {
    const degs = [30, 45, 60, 90, 120, 135, 150, 180, 210, 270, 300, 360];
    const d = pick(degs);
    if (l <= 2) return { text: `حوّل ${L(d)}° إلى راديان (بدلالة ط)`, answer: `${d}/180*pi`, type: 'expr', inputHint: 'مثال: ط/٣', hint: 'نضرب في ط/١٨٠', steps: [`${L(d)} × ط/١٨٠ = ${M.fracHTML(d / 180)}ط`] };
    if (l === 3) return { text: `حوّل ${M.fracHTML(d / 180)}ط راديان إلى درجات`, answer: d, hint: 'نضرب في ١٨٠/ط', steps: [`= ${L(d)}°`] };
    const r = rand(3, 12), th = pick([Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2]);
    if (l === 4) return { text: `أوجد طول قوس في دائرة نصف قطرها ${L(r)} سم تقابله زاوية مركزية ${M.fracHTML(th / Math.PI)}ط راديان (بدلالة ط)`, answer: `${r * (th / Math.PI)}*pi`, type: 'expr', hint: 'طول القوس = نق × θ', steps: [`${L(r)} × ${M.fracHTML(th / Math.PI)}ط`] };
    return { text: `أوجد مساحة القطاع الدائري: نق = ${L(r)} سم، θ = ${M.fracHTML(th / Math.PI)}ط (بدلالة ط)`, answer: `${0.5 * r * r * (th / Math.PI)}*pi`, type: 'expr', hint: 'مساحة القطاع = ½ نق² θ', steps: [`½ × ${L(r * r)} × ${M.fracHTML(th / Math.PI)}ط`] };
  });

  add('trigEq', 'المعادلات المثلثية', 'الجبر', (l) => {
    const opts = byLevel(l, [
      [['جا س = ½', [30, 150]], ['جتا س = ½', [60, 300]]],
      [['جا س = ١', [90]], ['ظا س = ١', [45, 225]], ['جتا س = -١', [180]]],
      [['٢جا س = √٣', [60, 120]], ['٢جتا س + ١ = ٠', [120, 240]]],
      [['جا س = -½', [210, 330]], ['ظا س = √٣', [60, 240]], ['√٢ جتا س = ١', [45, 315]]],
      [['٢جا²س = ١', [45, 135, 225, 315]], ['جا س جتا س = ٠', [0, 90, 180, 270]]],
    ]);
    const [eq, sol] = pick(opts);
    return { text: `حلّ المعادلة ${ms(eq.replace(/س/g, V()))} حيث ٠° ≤ ${V()} < ٣٦٠° (اكتب كل الحلول)`, answer: sol, type: 'set', inputHint: 'مثال: ٣٠، ١٥٠', hint: 'أوجد الزاوية المرجعية ثم حدّد الأرباع التي تكون فيها الدالة بالإشارة المطلوبة', steps: [`الحلول: ${sol.map((s) => L(s) + '°').join('، ')}`] };
  });

  add('perms', 'التباديل والتوافيق', 'الإحصاء', (l) => {
    const n = rand(5, 10), r = rand(2, Math.min(4, n - 1));
    const fact = (k) => (k <= 1 ? 1 : k * fact(k - 1));
    if (l <= 2) return { text: `بكم طريقة يمكن ترتيب ${L(r + 2)} كتب مختلفة على رف؟`, answer: fact(r + 2), hint: 'عدد طرق ترتيب ن عنصراً = ن!', steps: [`${L(r + 2)}! = ${L(fact(r + 2))}`] };
    if (l === 3) return { text: `بكم طريقة يمكن اختيار رئيس ونائب له من بين ${L(n)} طلاب؟`, answer: n * (n - 1), hint: 'الترتيب مهم ⇐ تباديل ل(ن، ٢)', steps: [`${L(n)} × ${L(n - 1)} = ${L(n * (n - 1))}`] };
    if (l === 4) return { text: `بكم طريقة يمكن اختيار لجنة من ${L(r)} طلاب من بين ${L(n)} طلاب؟`, answer: P.nCr(n, r), hint: 'الترتيب غير مهم ⇐ توافيق ق(ن، ر)', steps: [`ق(${L(n)}، ${L(r)}) = ${L(P.nCr(n, r))}`] };
    return { text: `ما معامل ${ms(V() + '<sup>' + L(r) + '</sup>')} في مفكوك ${ms(`(${V()} + ١)<sup>${L(n)}</sup>`)}؟`, answer: P.nCr(n, r), hint: 'نظرية ذات الحدين: المعامل = ق(ن، ر)', steps: [`ق(${L(n)}، ${L(r)}) = ${L(P.nCr(n, r))}`] };
  });

  add('limits', 'النهايات', 'التفاضل والتكامل', (l) => {
    const a = nz(-5, 5), b = nz(-5, 5);
    if (l <= 2) { const m = rand(2, 6); return { text: `أوجد: نهـا س←${L(a)} (${ms(`${L(m)}${V()}${sg(b)}`)})`, answer: m * a + b, hint: 'الدالة متصلة: عوّض مباشرة', steps: [`${L(m)} × ${L(a)}${sg(b)} = ${L(m * a + b)}`] }; }
    if (l === 3) return { text: `أوجد: نهـا س←${L(a)} ${frac(`${V()}² − ${L(a * a)}`, `${V()}${sg(-a)}`)}`, answer: 2 * a, hint: 'حلّل البسط (فرق بين مربعين) واختصر', steps: [`= نهـا (${V()}${sg(a)}) = ${L(2 * a)}`] };
    if (l === 4) { const c = rand(2, 7), d = rand(2, 7); return { text: `أوجد: نهـا س←∞ ${frac(`${L(c)}${V()}² + ${L(b * b)}`, `${L(d)}${V()}² − ${V()}`)}`, answer: c / d, hint: 'الدرجتان متساويتان: النهاية = نسبة المعاملين الرئيسيين', steps: [`${frac(c, d)}`] }; }
    return { text: `أوجد: نهـا س←٠ ${frac(`جا(${L(Math.abs(b))}${V()})`, V())}`, answer: Math.abs(b), hint: 'نهـا جا(ك س)/س = ك عندما س ← ٠', steps: [`= ${L(Math.abs(b))}`] };
  });

  add('derivative', 'الاشتقاق وتطبيقاته', 'التفاضل والتكامل', (l) => {
    const a = nz(-5, 6), b = nz(-8, 8), c = rand(-9, 9), x = rand(-3, 4), n = rand(2, 5);
    if (l === 1) return { text: `أوجد مشتقة ${ms(`د(${V()}) = ${cx(a)}<sup>${L(n)}</sup>`)}`, answer: `${a * n}x^${n - 1}`, type: 'expr', inputHint: 'مثال: ١٢س^٣', hint: 'مشتقة أ سⁿ = ن أ سⁿ⁻¹', steps: [`${L(a * n)}${V()}<sup>${L(n - 1)}</sup>`] };
    if (l === 2) return { text: `أوجد مشتقة ${ms(`د(${V()}) = ${cx(a)}³${sg(b)}${V()}${sg(c)}`)}`, answer: `${3 * a}x^2 + ${b}`, type: 'expr', hint: 'اشتق كل حد على حدة، ومشتقة الثابت صفر', steps: [`${L(3 * a)}${V()}²${sg(b)}`] };
    if (l === 3) return { text: `أوجد ميل المماس لمنحنى ${ms(`ص = ${cx(a)}²${sg(b)}${V()}`)} عند ${ms(V() + ' = ' + L(x))}`, answer: 2 * a * x + b, hint: 'الميل = قيمة المشتقة عند النقطة', steps: [`ص′ = ${L(2 * a)}${V()}${sg(b)}`, `عند ${V()} = ${L(x)}: ${L(2 * a * x + b)}`] };
    if (l === 4) { const h = nz(-4, 4), k2 = rand(-5, 5), A = pick([1, -1, 2]); return { text: `أوجد الإحداثي السيني للنقطة الحرجة للمنحنى ${ms(`ص = ${cx(A)}²${sg(-2 * A * h)}${V()}${sg(k2)}`)}`, answer: h, hint: 'النقطة الحرجة: ص′ = ٠', steps: [`ص′ = ${L(2 * A)}${V()}${sg(-2 * A * h)} = ٠ ⇐ ${V()} = ${L(h)}`] }; }
    const k = rand(2, 5); return { text: `أوجد مشتقة ${ms(`ص = (${L(k)}${V()}${sg(b)})<sup>${L(n)}</sup>`)}`, answer: `${n * k}(${k}x + ${b})^${n - 1}`, type: 'expr', hint: 'قاعدة السلسلة: اشتق الخارج ثم اضرب في مشتقة الداخل', steps: [`${L(n)} × ${L(k)} (${L(k)}${V()}${sg(b)})<sup>${L(n - 1)}</sup>`] };
  });

  add('integral', 'التكامل وتطبيقاته', 'التفاضل والتكامل', (l) => {
    const a = rand(1, 6), b = rand(-5, 6), n = rand(1, 4), lo = rand(0, 2), hi = lo + rand(1, 3);
    if (l === 1) return { text: `أوجد التكامل: ${ms(`∫ ${L(a * (n + 1))}${V()}<sup>${L(n)}</sup> د${V()}`)} (أهمل ثابت التكامل)`, answer: `${a}x^${n + 1}`, type: 'expr', hint: '∫ سⁿ د س = سⁿ⁺¹ ÷ (ن + ١)', steps: [`${L(a)}${V()}<sup>${L(n + 1)}</sup> + ث`] };
    if (l === 2) return { text: `أوجد: ${ms(`∫ (${L(2 * a)}${V()}${sg(b)}) د${V()}`)} (أهمل ثابت التكامل)`, answer: `${a}x^2 + ${b}x`, type: 'expr', hint: 'كامل كل حد على حدة', steps: [`${L(a)}${V()}²${sg(b)}${V()} + ث`] };
    const f = (x) => a * x * x + b;
    const val = (a * (hi ** 3 - lo ** 3)) / 3 + b * (hi - lo);
    if (l <= 4) return { text: `احسب التكامل المحدود: ${ms(`∫<sub>${L(lo)}</sub><sup>${L(hi)}</sup> (${cx(a)}²${sg(b)}) د${V()}`)}`, answer: val, tol: 0.001, hint: 'أوجد الدالة الأصلية ثم عوّض بالحد العلوي ناقص الحد السفلي', steps: [`[${L(a)}${V()}³/٣${sg(b)}${V()}] من ${L(lo)} إلى ${L(hi)} = ${M.fracHTML(val)}`] };
    const r = rand(1, 5); return { text: `أوجد المساحة المحصورة بين منحنى ${ms(`ص = ${L(r * r)} − ${V()}²`)} ومحور السينات`, answer: (4 * r ** 3) / 3, tol: 0.001, hint: `المنحنى يقطع المحور عند ±${L(r)}؛ كامل بين الحدين`, steps: [`∫ من −${L(r)} إلى ${L(r)} = ${M.fracHTML((4 * r ** 3) / 3)}`] };
  });

  add('matrices', 'المصفوفات والمحددات', 'الجبر', (l) => {
    const m = () => nz(-6, 6);
    if (l <= 2) { const A = [[m(), m()], [m(), m()]]; return { text: `أوجد محدد المصفوفة ${P.matHTML(A)}`, answer: A[0][0] * A[1][1] - A[0][1] * A[1][0], hint: 'المحدد = أ د − ب جـ', steps: [`(${L(A[0][0])})(${L(A[1][1])}) − (${L(A[0][1])})(${L(A[1][0])}) = ${L(A[0][0] * A[1][1] - A[0][1] * A[1][0])}`] }; }
    if (l === 3) { const A = [[m(), m()], [m(), m()]], B = [[m(), m()], [m(), m()]]; const C = P.matMul(A, B).value; return { text: `إذا كانت أ = ${P.matHTML(A)} ، ب = ${P.matHTML(B)} فما العنصر في الصف الأول والعمود الأول من أ × ب؟`, answer: C[0][0], hint: 'اضرب الصف الأول من أ في العمود الأول من ب واجمع', steps: [`(${L(A[0][0])})(${L(B[0][0])}) + (${L(A[0][1])})(${L(B[1][0])}) = ${L(C[0][0])}`] }; }
    if (l === 4) { const k = rand(2, 5), x = rand(-4, 4); const A = [[k, x], [2, 1]]; return { text: `ما قيمة س التي تجعل المصفوفة ${P.matHTML([[k, 'س'], [2, 1]])} منفردة (ليس لها معكوس)؟`, answer: k / 2, hint: 'المصفوفة منفردة عندما يكون محددها صفراً', steps: [`${L(k)} × ١ − ٢س = ٠ ⇐ س = ${M.fracHTML(k / 2)}`] }; }
    const A = [[m(), m(), m()], [m(), m(), m()], [m(), m(), m()]];
    return { text: `أوجد محدد المصفوفة ${P.matHTML(A)}`, answer: P.det(A), hint: 'افكك المحدد على الصف الأول', steps: [`= ${L(P.det(A))}`] };
  });

  add('distributions', 'التوزيعات الاحتمالية', 'الإحصاء', (l) => {
    if (l <= 2) { const n = rand(3, 6), k = rand(0, n); return { text: `رُميت قطعة نقود ${L(n)} مرات. ما احتمال ظهور الشعار ${L(k)} مرات بالضبط؟ (لأقرب ٤ منازل)`, answer: Math.round(P.nCr(n, k) * 0.5 ** n * 1e4) / 1e4, tol: 0.001, hint: 'ل(س = ر) = ق(ن، ر) لʳ (١−ل)ⁿ⁻ʳ', steps: [`ق(${L(n)}، ${L(k)}) × (½)<sup>${L(n)}</sup> = ${F(P.nCr(n, k) * 0.5 ** n, 4)}`] }; }
    if (l === 3) { const n = rand(10, 50), p = pick([0.2, 0.25, 0.4, 0.5]); return { text: `متغير عشوائي ذو حدين: ن = ${L(n)} ، ل = ${F(p)}. ما توقّعه (الوسط)؟`, answer: n * p, hint: 'التوقع = ن × ل', steps: [`${L(n)} × ${F(p)} = ${F(n * p)}`] }; }
    const mu = rand(50, 80), s = pick([5, 10]), z = pick([1, 2]);
    const pr = l === 4 ? P.normCdf(z) : P.normCdf(z) - P.normCdf(-z);
    return { text: l === 4 ? `درجات اختبار تتبع توزيعاً طبيعياً وسطه ${L(mu)} وانحرافه المعياري ${L(s)}. ما احتمال أن تقل درجة طالب عن ${L(mu + z * s)}؟ (لأقرب ٤ منازل)` : `في توزيع طبيعي وسطه ${L(mu)} وانحرافه ${L(s)}، ما احتمال وقوع قيمة بين ${L(mu - z * s)} و${L(mu + z * s)}؟ (لأقرب ٤ منازل)`, answer: Math.round(pr * 1e4) / 1e4, tol: 0.002, hint: 'حوّل إلى الدرجة المعيارية ع = (س − μ) ÷ σ', steps: [`ع = ${L(z)} ⇐ الاحتمال ≈ ${F(pr, 4)}`] };
  });

  add('complex', 'الأعداد المركبة', 'الجبر', (l) => {
    const a = nz(-6, 6), b = nz(-6, 6), c = nz(-6, 6), d = nz(-6, 6);
    const iu = M.settings.vars === 'arabic' ? 'ت' : 'i';
    const z = (x, y) => `${L(x)} ${y < 0 ? '−' : '+'} ${L(Math.abs(y))}${iu}`;
    if (l <= 2) return { text: `أوجد مجموع العددين المركبين (${z(a, b)}) + (${z(c, d)}). اكتب الجزء الحقيقي ثم التخيلي`, answer: [a + c, b + d], type: 'pair', inputHint: 'مثال: ٣، -٢', hint: 'اجمع الحقيقي مع الحقيقي والتخيلي مع التخيلي', steps: [`${z(a + c, b + d)}`] };
    if (l === 3) { const [x, y, m] = pick([[3, 4, 5], [5, 12, 13], [6, 8, 10], [-8, 15, 17]]); return { text: `ما مقياس العدد المركب ${z(x, y)}؟`, answer: m, hint: '|أ + ب' + iu + '| = √(أ² + ب²)', steps: [`√(${L(x * x)} + ${L(y * y)}) = ${L(m)}`] }; }
    return { text: `أوجد حاصل الضرب (${z(a, b)})(${z(c, d)}). اكتب الجزء الحقيقي ثم التخيلي`, answer: [a * c - b * d, a * d + b * c], type: 'pair', hint: `${iu}² = −١`, steps: [`${z(a * c - b * d, a * d + b * c)}`] };
  });

  M.skillsReady = true;
})();
