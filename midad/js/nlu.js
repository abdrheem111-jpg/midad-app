/* ==========================================================================
   فهم الأسئلة بالعربية دون إنترنت (محرك نوايا محلي)
   يحلّل سؤال المعلم أو الطالب ويحدد المطلوب: حل معادلة، مسألة لفظية
   (نسبة مئوية، سرعة، ربح، تحويل وحدات، أعداد متتالية…)، شرح مفهوم،
   درس من المنهج، تمرين متكيّف، نشاط تدريسي، أو متابعة لسؤال سابق.
   لا يرسل أي بيانات لأي خادم.
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const E = M.math;
  const P = M.mathPlus;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 4 : d);

  /* ---------------- التطبيع ---------------- */
  /** نص مطبّع للمطابقة: دون تشكيل، همزات موحدة، أرقام غربية */
  const K = (s) => M.toWestern(String(s))
    .replace(/[ً-ْـ]/g, '')
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/[؟?!]/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------------- الأعداد بالكلمات ---------------- */
  const UNITS_W = { صفر: 0, واحد: 1, واحده: 1, اثنان: 2, اثنين: 2, اثنتان: 2, اثنتين: 2, ثلاث: 3, ثلاثه: 3, اربع: 4, اربعه: 4, خمس: 5, خمسه: 5, ست: 6, سته: 6, سبع: 7, سبعه: 7, ثمان: 8, ثماني: 8, ثمانيه: 8, تسع: 9, تسعه: 9, عشر: 10, عشره: 10 };
  const TENS_W = { عشرون: 20, عشرين: 20, ثلاثون: 30, ثلاثين: 30, اربعون: 40, اربعين: 40, خمسون: 50, خمسين: 50, ستون: 60, ستين: 60, سبعون: 70, سبعين: 70, ثمانون: 80, ثمانين: 80, تسعون: 90, تسعين: 90 };
  const BIG_W = { مئه: 100, مائه: 100, مئتان: 200, مئتين: 200, الف: 1000, الفا: 1000, الفين: 2000, الفان: 2000, الاف: 1000, مليون: 1e6 };
  const FRAC_W = { نصف: 0.5, ربع: 0.25, ثلث: 1 / 3, خمس_: 0.2 };
  /** يستبدل الأعداد المكتوبة بالكلمات بأرقام (في نص مطبّع) */
  function wordsToDigits(k) {
    const toks = k.split(' ');
    const out = [];
    let i = 0;
    const val = (w) => {
      const s = w.replace(/^و(?=.{2,})/, '');
      if (s in UNITS_W) return { v: UNITS_W[s], t: 'u' };
      if (s in TENS_W) return { v: TENS_W[s], t: 't' };
      if (s in BIG_W) return { v: BIG_W[s], t: 'b' };
      return null;
    };
    while (i < toks.length) {
      let a = val(toks[i]);
      // «و» + عدد بعد كلمة غير عددية ليس عدداً مركّباً
      if (!a) { out.push(toks[i]); i++; continue; }
      let n = a.v, j = i + 1;
      // خمسه عشر = ١٥
      if (a.t === 'u' && n < 10 && toks[j] && /^عشر(ه)?$/.test(toks[j])) { n += 10; j++; }
      // خمسه وعشرون = ٢٥
      if (a.t === 'u' && toks[j] && /^و/.test(toks[j])) { const b = val(toks[j]); if (b && b.t === 't') { n += b.v; j++; } }
      // ثلاث مئه / ثلاثه الاف
      if (toks[j]) { const b = val(toks[j]); if (b && b.t === 'b' && a.t !== 'b' && b.v >= 100) { n *= b.v; j++; } }
      // مئه وخمسون …
      while (toks[j] && /^و/.test(toks[j]) && val(toks[j]) && n >= 100) { const b = val(toks[j]); n += b.v; j++; if (toks[j] && /^و/.test(toks[j]) && b.t === 'u') { const c = val(toks[j]); if (c && c.t === 't') { n += c.v; j++; } } }
      out.push(String(n));
      i = j;
    }
    return out.join(' ');
  }
  /** الأعداد في النص (أرقام أو كلمات) */
  const numsOf = (k) => (wordsToDigits(k).match(/-?\d+(\.\d+)?/g) || []).map(Number);

  /* ---------------- أدوات ---------------- */
  const R = (title, steps, answer, extra) => Object.assign({ title, steps, answer }, extra || {});
  const has = (k, re) => re.test(k);
  const result = (res, source) => ({ type: 'result', result: res, source });
  /** يحاول الحل بمحرك الرياضيات */
  function trySolve(src) {
    try { return E.solve(src); } catch (e) { return null; }
  }
  /** تنظيف مقدمة السؤال قبل التعبير الرياضي */
  const LEAD = /^(من فضلك|لو سمحت|رجاء|ممكن|هل يمكنك|هل تستطيع|ساعدني في|ساعدني)?\s*(حل|حُل|حلّ|أوجد|اوجد|جد|احسب|احسبي|بسط|بسّط|اختصر|فك|وسّع|وسع|ما قيمة|ما ناتج|ما حل|قيمة|ناتج|المعادلة|المتباينة|التعبير|المقدار)(?=[\s:：]|$)\s*[:：]?\s*/;
  const clean = (t) => t.trim().replace(LEAD, '').replace(LEAD, '').replace(/^[^:：=\n]*[:：]\s*(?=[^\n]*[=<>≤≥])/, '').replace(/[؟?]\s*$/, '').trim();

  /* ================= سياق المحادثة ================= */
  const ctx = { lastExpr: null, lastTopic: null, lastResult: null, lastQuestion: null, lastLesson: null };

  /* ================= مطابقة المهارات والدروس ================= */
  const SYN = [
    [/كسر|كسور|بسط ومقام/, ['fracBasic', 'fractions']], [/عشري|عشريه/, ['decimals']], [/نسبه مئويه|مئوي|%|بالمئه/, ['percent']],
    [/جمع|طرح/, ['arith']], [/ضرب|قسمه|جدول الضرب/, ['times', 'muldiv', 'division']], [/اولي|اوليه/, ['primes']], [/عوامل|قواسم|مضاعفات/, ['factors']],
    [/اعداد صحيحه|سالب|سالبه/, ['negatives']], [/تقريب|قرب/, ['rounding']], [/قيمه مكانيه|منزله|خانات/, ['placeValue']], [/وقت|ساعه|زمن/, ['time']], [/نقود|ريال|بيسه/, ['money']],
    [/وحدات|تحويل/, ['units']], [/محيط/, ['perimeter']], [/مساح/, ['area']], [/حجم|حجوم/, ['volume', 'volumes3']], [/اشكال|مضلع/, ['shapes']], [/زاويه|زوايا/, ['angles']],
    [/ترتيب العمليات|اولويات/, ['orderOps']], [/نسبه وتناسب|تناسب|نسبه/, ['ratio']], [/احداثي|مستوي احداثي/, ['coordinates']], [/تحويلات|انعكاس|دوران|انسحاب/, ['transform']],
    [/مقادير جبريه|تعابير جبريه|حدود جبريه/, ['algExpr']], [/صيغه علميه|علميه/, ['sci']], [/فك الاقواس|توزيع|تحليل/, ['expand']], [/متباين/, ['linIneq']],
    [/ميل/, ['slope']], [/دائره|دوائر/, ['circle', 'circleThm']], [/متوازي|توازي/, ['parallel']], [/سرعه|مسافه/, ['speed']], [/ربح|فائده/, ['interest']],
    [/جذور صماء|صماء|كرن/, ['surds']], [/قوانين الاسس|اسس|قوي/, ['expLaws', 'powers']], [/نسب مثلثيه|مثلثات|جا|جتا|ظا/, ['trigRatios']], [/تشابه/, ['similarity']],
    [/داله|دوال|اقتران/, ['functions']], [/مجموعات|مجموعه/, ['sets']], [/احتمال/, ['probability', 'probComb']], [/قانون الجيب|جيب/, ['sineRule']], [/متجه|متجهات/, ['vectors']],
    [/لوغاريتم|لوغاريتمات/, ['logs']], [/معادلات اسيه|اسيه/, ['expEq']], [/متتابعه حسابيه|متسلسله حسابيه/, ['arithSeries']], [/متتابعه هندسيه|متسلسله هندسيه/, ['geoSeries']],
    [/متتابع|متتالي|انماط|نمط/, ['sequences']], [/باقي|نظريه الباقي/, ['remainder']], [/راديان|تقدير دائري/, ['radians']], [/معادلات مثلثيه/, ['trigEq']], [/تباديل|توافيق/, ['perms']],
    [/نهايات|نهايه/, ['limits']], [/مشتق|اشتقاق|تفاضل/, ['derivative']], [/تكامل/, ['integral']], [/مصفوف|محدد/, ['matrices']], [/توزيع|ذي الحدين|طبيعي/, ['distributions']],
    [/مركب|مركبه|تخيلي/, ['complex']], [/فيثاغورس|فيثاغورث|وتر/, ['pythagoras']], [/احصاء|متوسط|وسيط|منوال|مدي/, ['stats', 'groupedMean']],
    [/تربيعي|درجه الثانيه/, ['quadratic']], [/نظام|معادلتين|انظمه/, ['systems']], [/معادل|خطي/, ['linear']], [/مقارنه|اكبر|اصغر/, ['compare']], [/عد|العد/, ['count']],
  ];
  /** أفضل مهارة لنص (أو null) */
  function detectSkill(k) {
    const T = M.practice.topics;
    for (const [re, ids] of SYN) if (re.test(k)) { const id = ids.find((x) => T[x]); if (id) return id; }
    // مطابقة أسماء المهارات مباشرة
    let best = null, bs = 0;
    Object.entries(T).forEach(([id, t]) => {
      const words = K(t.name).split(' ').filter((w) => w.length > 2);
      const s = words.filter((w) => k.includes(w)).length / (words.length || 1);
      if (s > bs) { bs = s; best = id; }
    });
    return bs >= 0.5 ? best : null;
  }
  const GRADE_W = { الاول: 1, الثاني: 2, الثالث: 3, الرابع: 4, الخامس: 5, السادس: 6, السابع: 7, الثامن: 8, التاسع: 9, العاشر: 10, 'الحادي عشر': 11, 'الثاني عشر': 12 };
  function gradeIn(k) {
    for (const w of ['الحادي عشر', 'الثاني عشر']) if (k.includes('الصف ' + w) || k.includes('صف ' + w)) return GRADE_W[w];
    for (const [w, g] of Object.entries(GRADE_W)) if (new RegExp('صف ' + w + '(\\s|$)').test(k) || new RegExp('الصف ' + w + '(\\s|$)').test(k)) return g;
    const m = k.match(/(?:الصف|صف)\s*(\d{1,2})/);
    return m && +m[1] >= 1 && +m[1] <= 12 ? +m[1] : null;
  }
  const STOP = new Set(['درس', 'دروس', 'الدرس', 'اشرح', 'شرح', 'لي', 'عن', 'في', 'من', 'الصف', 'صف', 'ما', 'هو', 'هي', 'اريد', 'ابغي', 'ابي', 'اعطني', 'تمرين', 'تمارين', 'سؤال', 'اسئله', 'على', 'علي', 'مع', 'كيف', 'ادرس', 'افتح', 'وحده', 'الوحده', 'اختبرني', 'حول', 'خطه', 'لعبه', 'تعليميه', 'نشاط', 'نشاطا', 'انشطه', 'استراتيجيه', 'فكره', 'افكار', 'طريقه', 'بطريقه', 'تدريس', 'لتدريس', 'ممتعه', 'اشرح', 'للطلاب', 'الطلاب', 'اقترح', 'ابي', 'ابغى', 'وش', 'ايش', 'تحضير', 'صعب', 'سهل']);
  /** البحث في دروس المنهج بنص مطبّع */
  function findLessons(k, grade) {
    const words = k.split(' ').filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w) && !Object.keys(GRADE_W).includes(w));
    if (!words.length) return [];
    const stem = (w) => w.replace(/^(وال|بال|لل|ال|و|ب)(?=.{3,})/, '').replace(/(ات|ان|ين|ون|ه)$/, '');
    const ws = words.map(stem).filter((w) => w.length > 2);
    const all = M.curriculum.allLessons();
    const scored = all.map((l) => {
      const t = K(l.t), u = K(l.unit), d = K(l.d);
      let s = 0;
      ws.forEach((w) => { if (t.includes(w)) s += 3; else if (u.includes(w)) s += 1.5; else if (d.includes(w)) s += 0.5; });
      if (grade && l.g === grade) s += 2; else if (grade) s -= 3;
      if (!grade && M.settings.gradeNum && l.g === M.settings.gradeNum) s += 0.5;
      return { l, s };
    }).filter((x) => x.s >= 2.5).sort((a, b) => b.s - a.s);
    return scored.slice(0, 6).map((x) => x.l);
  }

  /* ================= أنشطة واستراتيجيات تدريس ================= */
  const ACTIVITIES = [
    (n) => ['🎲 لعبة التحدي بين الفرق', `قسّم الصف إلى فرق، واعرض أسئلة «${n}» من لوحة التمارين على السبورة بالتناوب. كل إجابة صحيحة نقطة، والتلميح يخصم نصف نقطة.`],
    (n) => ['🤝 فكّر – زاوج – شارك', `اطرح مسألة واحدة في «${n}»: يفكر كل طالب دقيقة وحده، ثم يناقش زميله، ثم يعرض ثنائي حلّه على السبورة بقلم الرياضيات ليتحقق التطبيق منه.`],
    (n) => ['🏪 مسألة من الحياة العُمانية', `اربط «${n}» بموقف واقعي: سوق مطرح، رحلة من مسقط إلى صلالة، أسعار بالريال والبيسة، أو مساحة مزرعة نخيل. اطلب من الطلاب صياغة مسألة مشابهة.`],
    (n) => ['🔍 التعلم بالاكتشاف', `ارسم أمثلة على السبورة (أو استخدم أداة الرسم البياني/الهندسة) واطلب من الطلاب ملاحظة النمط في «${n}» قبل أن تذكر القاعدة.`],
    (n) => ['🧩 بطاقات الخطأ الشائع', `اكتب حلاً فيه خطأ مقصود في «${n}» واطلب من الطلاب اكتشافه وتصحيحه — ينمّي التفكير الناقد.`],
    (n) => ['🗺️ خريطة مفاهيم', `ابنِ مع الطلاب خريطة مفاهيم لـ«${n}» على صفحة جديدة: المفهوم في المركز، والقوانين والأمثلة والتطبيقات حوله.`],
    (n) => ['⏱️ التقويم الختامي السريع', `في آخر ٥ دقائق: ورقة عمل من ٥ أسئلة في «${n}» (زر ورقة العمل في الدرس) لقياس مدى تحقق الأهداف.`],
    (n) => ['🎯 التعليم المتمايز', `وزّع الطلاب حسب إتقانهم في لوحة التقدم: مجموعة تتدرب على المستوى ١–٢، وأخرى على ٤–٥ بأسئلة التحدي في «${n}».`],
  ];
  function activitiesFor(name) {
    const pick = M.shuffle ? M.shuffle(ACTIVITIES.slice()) : ACTIVITIES.slice().sort(() => Math.random() - 0.5);
    return pick.slice(0, 4).map((f) => f(name));
  }

  /* ================= المسائل اللفظية ================= */
  // الاحتمالات البسيطة: نرد، قطعة نقود
  function probability(k) {
    if (!/احتمال/.test(k)) return null;
    const n = numsOf(k);
    if (/نرد|حجر النرد|مكعب الارقام/.test(k) && !/حجري|نردين|مرتين/.test(k)) {
      const S = [1, 2, 3, 4, 5, 6];
      let ev = null, name = '';
      if (/زوجي/.test(k)) { ev = S.filter((x) => x % 2 === 0); name = 'عدد زوجي'; }
      else if (/فردي/.test(k)) { ev = S.filter((x) => x % 2); name = 'عدد فردي'; }
      else if (/اولي/.test(k)) { ev = [2, 3, 5]; name = 'عدد أولي'; }
      else if (/اكبر من|اكثر من/.test(k) && n.length) { ev = S.filter((x) => x > n[0]); name = `عدد أكبر من ${L(n[0])}`; }
      else if (/اقل من|اصغر من/.test(k) && n.length) { ev = S.filter((x) => x < n[0]); name = `عدد أقل من ${L(n[0])}`; }
      else if (n.length) { ev = S.filter((x) => x === n[0]); name = `العدد ${L(n[0])}`; }
      if (!ev) return null;
      const p = ev.length / 6;
      return R('احتمال حادثة عند رمي حجر نرد', [`فضاء العينة: {${S.map(L).join('، ')}} ⇐ ${L(6)} نواتج متساوية الإمكانية`, `الحادثة «${name}»: {${ev.map(L).join('، ')}} ⇐ ${L(ev.length)} نواتج`, `الاحتمال = عدد نواتج الحادثة ÷ عدد عناصر فضاء العينة = ${L(ev.length)} ÷ ${L(6)}`], `${M.fracHTML(p)}${p && p !== 1 ? ' ≈ ' + F(p, 3) : ''}`, { kind: 'prob' });
    }
    if (/قطعه نقود|قطعه نقديه|عمله/.test(k)) {
      const times = /مرتين|قطعتين|قطعتي/.test(k) ? 2 : /ثلاث مرات|3 مرات|ثلاث قطع/.test(k) ? 3 : 1;
      const S = times === 1 ? ['ص', 'ك'] : times === 2 ? ['ص ص', 'ص ك', 'ك ص', 'ك ك'] : ['ص ص ص', 'ص ص ك', 'ص ك ص', 'ك ص ص', 'ص ك ك', 'ك ص ك', 'ك ك ص', 'ك ك ك'];
      let ev;
      const cnt = (s, c) => s.split(' ').filter((x) => x === c).length;
      const face = /كتابه/.test(k) ? 'ك' : 'ص';
      if (/صورتين|كتابتين/.test(k)) ev = S.filter((s) => cnt(s, face) === 2);
      else if (/علي الاقل/.test(k)) ev = S.filter((s) => cnt(s, face) >= 1);
      else ev = S.filter((s) => cnt(s, face) === (times === 1 ? 1 : 1));
      const p = ev.length / S.length;
      return R('احتمال حادثة عند رمي قطعة نقود', [`ص = صورة ، ك = كتابة`, `فضاء العينة: {${S.join('، ')}} ⇐ ${L(S.length)} نواتج`, `نواتج الحادثة: ${L(ev.length)}`, `الاحتمال = ${L(ev.length)} ÷ ${L(S.length)}`], M.fracHTML(p), { kind: 'prob' });
    }
    // كرات في كيس
    const bag = k.match(/كيس|صندوق|وعاء/);
    if (bag && n.length >= 2) {
      const total = /مجموع|المجموع|فيه \d+ كره/.test(k) ? Math.max(...n) : n.reduce((s, x) => s + x, 0);
      const target = n[0];
      if (target <= total) {
        const p = target / total;
        return R('الاحتمال', [`عدد الكرات الكلي = ${n.length > 2 || !/مجموع/.test(k) ? n.map(L).join(' + ') + ' = ' : ''}${L(total)}`, `عدد الكرات المطلوبة = ${L(target)} (أول لون مذكور)`, `الاحتمال = ${L(target)} ÷ ${L(total)}`], `${M.fracHTML(p)} ≈ ${F(p, 3)}`, { kind: 'prob' });
      }
    }
    return null;
  }

  const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  function combinatorics(k) {
    const n = numsOf(k);
    const perm = /تباديل|ترتيب|يرتب|ترتيبها|يجلس|بكم طريقه يمكن ترتيب/.test(k);
    const comb = /توافيق|اختيار|يختار|اختر|لجنه|فريق من/.test(k);
    if (!(perm || comb) || !/طريقه|طرق|توافيق|تباديل|عدد/.test(k)) return null;
    if (n.length === 1 && perm) {
      const a = n[0];
      if (a > 20) return null;
      return R('عدد طرق الترتيب (المضروب)', [`عدد طرق ترتيب ${L(a)} عناصر مختلفة = ${L(a)}!`, `${L(a)}! = ${Array.from({ length: a }, (_, i) => L(a - i)).join(' × ')}`], L(fact(a)), { kind: 'perm' });
    }
    if (n.length < 2) return null;
    const N = Math.max(n[0], n[1]), r = Math.min(n[0], n[1]);
    if (N > 60) return null;
    if (comb && !/ترتيب|يرتب/.test(k)) {
      let c = 1; for (let i = 0; i < r; i++) c = (c * (N - i)) / (i + 1);
      return R('التوافيق (الاختيار دون ترتيب)', [`نختار ${L(r)} من ${L(N)} والترتيب غير مهم ⇐ توافيق`, `ق(${L(N)}، ${L(r)}) = ${L(N)}! ÷ (${L(r)}! × ${L(N - r)}!)`], L(Math.round(c)), { kind: 'perm' });
    }
    let p = 1; for (let i = 0; i < r; i++) p *= N - i;
    return R('التباديل (الترتيب مهم)', [`نرتب ${L(r)} من ${L(N)} والترتيب مهم ⇐ تباديل`, `ل(${L(N)}، ${L(r)}) = ${L(N)}! ÷ ${L(N - r)}! = ${Array.from({ length: r }, (_, i) => L(N - i)).join(' × ')}`], L(p), { kind: 'perm' });
  }

  /** مسائل «عدد مجهول» و«أعداد متتالية» */
  function numberPuzzle(raw, k) {
    const n = numsOf(k);
    // أعداد متتالية
    const cons = k.match(/(\d+|ثلاث|ثلاثه|اربع|اربعه|خمس|خمسه|عددان|عددين)\s*(اعداد|عدد)?\s*(صحيحه|زوجيه|فرديه|زوجيان|فرديان|زوجيين|فرديين)?\s*(متتاليه|متتاليان|متتاليين|متتالين)/);
    if (cons && /مجموع/.test(k)) {
      const cntW = { ثلاث: 3, ثلاثه: 3, اربع: 4, اربعه: 4, خمس: 5, خمسه: 5, عددان: 2, عددين: 2 };
      const c = cntW[cons[1]] || +cons[1];
      const odd = /فرديه|فرديان|فرديين/.test(k), even = /زوجيه|زوجيان|زوجيين/.test(k);
      const step = odd || even ? 2 : 1;
      const S = n.filter((x) => x !== c).pop();
      if (!c || S == null) return null;
      const off = (step * c * (c - 1)) / 2;
      const x = (S - off) / c;
      if (!Number.isInteger(x)) return result(R('أعداد متتالية', [`نفرض الأعداد: س، س + ${L(step)}، …`, `المعادلة: ${L(c)}س + ${L(off)} = ${L(S)}`], 'لا توجد أعداد صحيحة متتالية بهذا المجموع'));
      const list = Array.from({ length: c }, (_, i) => x + i * step);
      return result(R('أعداد متتالية', [`نفرض الأعداد: ${list.map((_, i) => (i ? `س + ${L(i * step)}` : 'س')).join('، ')}`, `مجموعها: ${L(c)}س + ${L(off)} = ${L(S)}`, `${L(c)}س = ${L(S - off)} ⇐ س = ${L(x)}`, `التحقق: ${list.map(L).join(' + ')} = ${L(S)} ✓`], list.map(L).join('، '), { kind: 'eq' }));
    }
    // عدد مجهول: تحويل الجملة إلى معادلة
    if (/(^|\s)(عدد|العدد|رقم)(\s|$)/.test(k) && /(اصبح|يصبح|يساوي|تساوي|كان الناتج|الناتج|فكان|يكون|صار|فيصبح|اصبحت)/.test(k)) {
      let s = ' ' + wordsToDigits(k) + ' ';
      const rep = [
        [/(ثلاثه امثال|3 امثال)\s*(ال)?عدد/g, ' 3*x '], [/(ضعف|ضعفي|مثلي)\s*(ال)?عدد/g, ' 2*x '], [/(نصف)\s*(ال)?عدد/g, ' x/2 '], [/(ربع)\s*(ال)?عدد/g, ' x/4 '], [/(ثلث)\s*(ال)?عدد/g, ' x/3 '], [/(مربع)\s*(ال)?عدد/g, ' x^2 '],
        [/(\d+)\s*امثال\s*(ال)?عدد/g, ' $1*x '],
        [/(ما|اوجد|جد|احسب)\s*(هو|قيمه)?\s*(ال)?عدد/g, ' '], [/(عدد|العدد|رقم) ما/g, ' x '], [/(^|\s)(عدد|العدد|رقم)(?=\s|$)/g, ' x '],
        [/(مطروحا|مطروح|مطروحاً)\s*(منه|منها)\s*(\d+(\.\d+)?)/g, ' - $3 '], [/(مضافا|مضاف|مضافاً)\s*(اليه|اليها)\s*(\d+(\.\d+)?)/g, ' + $3 '], [/(مضروبا|مضروب)\s*(في|ب)\s*(\d+(\.\d+)?)/g, ' * $3 '], [/(مقسوما|مقسوم)\s*(علي|على)\s*(\d+(\.\d+)?)/g, ' / $3 '],
        [/(اضيف|اضفنا|اضيفت|نضيف|اضف|يضاف|زيد|زدنا|جمع)\s*(اليه|له|اليها)?\s*(\d+(\.\d+)?)/g, ' + $3 '], [/(\d+(\.\d+)?)\s*(اضيف|اضيفت|يضاف)\s*(اليه|له)/g, ' + $1 '],
        [/(طرح|طرحنا|نطرح|نقص|انقص|انقصنا|يطرح)\s*(منه|منها)?\s*(\d+(\.\d+)?)/g, ' - $3 '], [/(طرح|طرحنا|نطرح|يطرح)\s*(ال)?(x)\s*من\s*(\d+(\.\d+)?)/g, ' $4 - x '],
        [/(ضرب|ضربنا|نضرب|يضرب)\s*(في|ب)\s*(\d+(\.\d+)?)/g, ' * $3 '], [/(قسم|قسمنا|نقسم|يقسم)\s*(علي|على)\s*(\d+(\.\d+)?)/g, ' / $3 '],
        [/(اصبح|يصبح|يساوي|تساوي|كان الناتج|الناتج|فكان|يكون|صار|فيصبح|اصبحت)\s*(الناتج|المجموع|الناتج هو)?/g, ' = '],
        [/\s(ثم|اذا|لو|فان|و)\s/g, ' '],
      ];
      rep.forEach(([re, to]) => (s = s.replace(re, to)));
      // ترتيب الأولوية: (x + 5) * 3 إذا جاء الضرب بعد جمع
      const lhs = s.split('=')[0];
      let expr = lhs.replace(/[^\dx+\-*/^.() ]/g, ' ').replace(/\s+/g, ' ').trim();
      const rhsNums = (s.split('=')[1] || '').match(/-?\d+(\.\d+)?/);
      if (!rhsNums || !/x/.test(expr)) return null;
      // اجعل كل عملية تطبّق على ما قبلها بالتسلسل (كما في الجملة اللفظية)
      const toks = expr.match(/(\d+(\.\d+)?\*x|x\/\d+|x\^2|x|[+\-*/]|\d+(\.\d+)?)/g) || [];
      let acc = '';
      for (let i = 0; i < toks.length; i++) {
        const t = toks[i];
        if (/^[+\-*/]$/.test(t) && toks[i + 1]) { acc = acc ? `(${acc}) ${t} ${toks[i + 1]}` : `${t}${toks[i + 1]}`; i++; }
        else acc = acc ? `${acc} ${t}` : t;
      }
      const eq = `${acc} = ${rhsNums[0]}`.replace(/\*/g, '×');
      const r = trySolve(eq);
      if (!r) return null;
      r.title = 'مسألة لفظية: العدد المجهول';
      r.steps = [`نرمز للعدد المجهول بـ ${M.varName('x')}`, `نترجم الجملة إلى معادلة: ${E.mathSpan(M.loc(eq.replace(/x/g, M.varName('x'))))}`].concat(r.steps || []);
      return result(r, eq);
    }
    return null;
  }

  /** نسب مئوية، ربح، سرعة، تحويل، تقريب… */
  function wordProblem(raw, k) {
    const n = numsOf(k);
    const w = wordsToDigits(k);
    // --- الاحتمالات والعدّ
    const pr = probability(k); if (pr) return result(pr);
    const cb = combinatorics(k); if (cb) return result(cb);
    const np = numberPuzzle(raw, k); if (np) return np;

    // --- الربح البسيط والمركب
    if (/ربح|فائده|فوائد|اودع|استثمر|قرض/.test(k) && n.length >= 3) {
      const rateM = w.match(/(\d+(\.\d+)?)\s*(%|٪|بالمئه|في المئه)/);
      const yrM = w.match(/(\d+(\.\d+)?)\s*(سنوات|سنه|سنين|اعوام|عام)/);
      const rate = rateM ? +rateM[1] : null, yr = yrM ? +yrM[1] : null;
      const rest = n.filter((x) => x !== rate && x !== yr);
      if (rate != null && yr != null && rest.length) {
        const p = Math.max(...rest);
        return result(/مركب/.test(k) ? P.compoundInterest(p, rate, yr) : P.simpleInterest(p, rate, yr));
      }
    }
    // --- النسب المئوية
    const pctM = w.match(/(\d+(\.\d+)?)\s*(%|٪|بالمئه|في المئه)/);
    if (/خصم|تخفيض|تنزيلات/.test(k) && pctM && n.length >= 2) {
      const p = +pctM[1], price = n.find((x) => x !== p);
      const d = (p * price) / 100;
      return result(R('الخصم', [`قيمة الخصم = ${L(p)}٪ × ${F(price)} = ${F(d)}`, `السعر بعد الخصم = ${F(price)} − ${F(d)}`], `${F(price - d)} (وفّرت ${F(d)})`, { kind: 'percent' }));
    }
    if (/ضريبه|زياده بنسبه|زاد بنسبه|ارتفع بنسبه/.test(k) && pctM && n.length >= 2) {
      const p = +pctM[1], base = n.find((x) => x !== p);
      const d = (p * base) / 100;
      return result(R('الزيادة بنسبة مئوية', [`مقدار الزيادة = ${L(p)}٪ × ${F(base)} = ${F(d)}`, `القيمة الجديدة = ${F(base)} + ${F(d)}`], F(base + d), { kind: 'percent' }));
    }
    if (/(زاد|ارتفع|انخفض|نقص|تغير|اصبح)/.test(k) && /من\s*-?\d/.test(w) && /(الي|الى)\s*-?\d/.test(w) && /نسب|%|مئوي/.test(k)) {
      const a = +w.match(/من\s*(-?\d+(\.\d+)?)/)[1], b = +w.match(/(?:الي|الى)\s*(-?\d+(\.\d+)?)/)[1];
      return result(P.percentChange(a, b));
    }
    if (pctM && /(\s|^)من(\s|$)/.test(k) && n.length >= 2 && !/(الي|الى)/.test(k)) {
      const p = +pctM[1], x = n.find((v, i) => i !== n.indexOf(p));
      if (x != null) return result(P.percentOf(p, x));
    }
    if (/(كم|ما|اوجد)\s*(تمثل|تشكل|نسبه|النسبه)/.test(k) && /مئوي|%/.test(k) && n.length >= 2) {
      const [a, b] = n;
      return result(P.whatPercent(Math.min(a, b) === a || /من اصل|من مجموع/.test(k) ? a : a, b));
    }
    // --- النسبة والتناسب
    const ratioM = w.match(/(\d+)\s*[:：]\s*(\d+)(?:\s*[:：]\s*(\d+))?/);
    if (ratioM && /(قسم|وزع|يقسم|توزيع|تقسيم|بنسبه)/.test(k)) {
      const parts = [ratioM[1], ratioM[2], ratioM[3]].filter(Boolean).map(Number);
      const total = n.find((x) => !parts.includes(x)) ?? n.filter((x) => !parts.includes(x))[0];
      if (total != null) return result(P.shareRatio(total, parts));
    }
    if (ratioM && /(بسط|ابسط|اختصر|ابسط صوره)/.test(k)) return result(P.simplifyRatio([ratioM[1], ratioM[2], ratioM[3]].filter(Boolean).map(Number)));

    // --- السرعة والمسافة والزمن
    if (/(سرعه|مسافه|يقطع|قطع|قطعت|تقطع|يسير|تسير|سار|سارت|رحله)/.test(k) && (n.length >= 2 || (n.length === 1 && /ساعتين|نصف ساعه|ربع ساعه/.test(k)))) {
      let d = null, t = null, s = null;
      const spM = w.match(/(\d+(\.\d+)?)\s*(كم\/س|كم\s*\/\s*ساعه|كم في الساعه|كيلومتر في الساعه|كم\/ساعه|م\/ث|متر في الثانيه)/);
      if (spM) s = +spM[1];
      const dM = w.match(/(\d+(\.\d+)?)\s*(كم|كيلومتر|كيلو متر|متر|م)(?!\s*\/|\s*في\s*ال(ساعه|ثانيه))/);
      if (dM && +dM[1] !== s) d = +dM[1];
      const tM = w.match(/(\d+(\.\d+)?)\s*(ساعات|ساعه|ساعتين|ثانيه|ثوان|دقيقه|دقائق)/);
      if (tM) { t = +tM[1]; if (/دقيق/.test(tM[3]) && s != null && !/م\/ث/.test(w)) t = t / 60; }
      if (/ساعتين/.test(k) && t == null) t = 2;
      if (/نصف ساعه/.test(k) && t == null) t = 0.5;
      if (/ربع ساعه/.test(k) && t == null) t = 0.25;
      const ask = k.match(/(كم|ما|اوجد|احسب|جد)\s*(هي|هو)?\s*(ال)?(مسافه|سرعه|زمن|الوقت|وقت|ساعه)/);
      const want = ask ? ask[4] : (d == null ? 'مسافه' : t == null ? 'زمن' : 'سرعه');
      if (/مسافه/.test(want) && s != null && t != null) return result(P.speed(null, t, s));
      if (/(زمن|وقت|ساعه)/.test(want) && d != null && s != null) return result(P.speed(d, null, s));
      if (/سرعه/.test(want) && d != null && t != null) return result(P.speed(d, t, null));
    }
    // --- تحويل الوحدات
    if (/(حول|تحويل|كم|يساوي|تساوي|ب|الي|الى)/.test(k) && n.length >= 1) {
      const m = raw.match(/([\d٠-٩]+(?:[.٫][\d٠-٩]+)?)\s*([^\d٠-٩؟?]+?)\s*(?:إلى|الى|الي|إلي|=|بال|كم)\s*([^\d٠-٩؟?]+?)\s*[؟?]?\s*$/);
      const m2 = raw.match(/كم\s+([^\d٠-٩؟?]+?)\s+(?:في|يوجد في|تساوي|يساوي)\s+([\d٠-٩]+(?:[.٫][\d٠-٩]+)?)\s*([^\d٠-٩؟?]+?)\s*[؟?]?\s*$/);
      let v, from, to;
      if (m) { v = +M.toWestern(m[1]); from = P.findUnit(m[2]); to = P.findUnit(m[3]); }
      if ((!from || !to) && m2) { v = +M.toWestern(m2[2]); to = P.findUnit(m2[1]); from = P.findUnit(m2[3]); }
      if (from && to && from !== to) { try { return result(P.convert(v, from, to)); } catch (e) { /* وحدتان غير متوافقتين */ } }
    }
    // --- التقريب
    if (/(قرب|تقريب|قرّب|لاقرب)/.test(k) && n.length) return result(P.round(n[0], M.toWestern(raw).replace(/[أإآ]/g, 'ا').replace(/لاقرب/g, 'لأقرب')));
    // --- العدد بالحروف والقيمة المكانية
    if (/(بالحروف|بالكلمات|كتابه العدد|اكتب العدد|اقرا العدد)/.test(k) && n.length) return result(R('كتابة العدد بالحروف', [`العدد ${L(n[0])}`], P.toWords(n[0]), { kind: 'words' }));
    if (/(قيمه مكانيه|القيمه المكانيه|منزله الرقم|صيغه ممتده|الصيغه الممتده)/.test(k) && n.length) {
      if (n.length >= 2 && n[0] >= 0 && n[0] <= 9 && String(n[1]).includes(String(n[0]))) {
        const ds = String(Math.floor(n[1])), pos = ds.length - 1 - ds.indexOf(String(n[0]));
        const names = ['الآحاد', 'العشرات', 'المئات', 'الآلاف', 'عشرات الآلاف', 'مئات الآلاف', 'الملايين', 'عشرات الملايين', 'مئات الملايين'];
        return result(R(`القيمة المكانية للرقم ${L(n[0])} في العدد ${L(n[1])}`, [`نعدّ المنازل من اليمين: ${ds.split('').map((d, i) => `${L(d)} (${names[ds.length - 1 - i]})`).join(' ، ')}`], `الرقم ${L(n[0])} في منزلة ${names[pos]} وقيمته ${L(n[0] * Math.pow(10, pos))}`, { kind: 'place' }));
      }
      return result(P.placeValue(n[1] != null && /العدد\s*\S+$/.test(k) ? n[1] : n[0]));
    }
    // --- الوقت
    const times = M.toWestern(raw).match(/\d{1,2}\s*:\s*\d{2}/g);
    if (times && times.length === 2 && /(من|بدا|بدات|انتهي|انتهت|الي|الى|حتي|مده|كم)/.test(k)) {
      const a = P.parseTime(raw.split(/إلى|الى|حتى|حتي|وانتهى|وانتهت|ينتهي|تنتهي/)[0]), b = P.parseTime(times[1]);
      const bb = /مساء|ظهر|عصر/.test(raw.split(times[1].replace(/\d/g, (d) => d))[1] || '') ? b + (b < 720 ? 720 : 0) : b;
      if (a != null && b != null) return result(P.timeDiff(a, bb));
    }
    // --- الصيغة العلمية
    if (/(صيغه علميه|الصيغه العلميه|الصوره العلميه|صوره علميه)/.test(k) && n.length) {
      const e = M.toWestern(raw).match(/(\d+(\.\d+)?)\s*[×x*]\s*10\s*\^\s*(-?\d+)/);
      return result(P.scientific(e ? +e[1] * Math.pow(10, +e[3]) : n[0]));
    }
    // --- الجذور الصماء
    if (/(بسط|ابسط|اختصر)/.test(k) && /√|جذر/.test(k) && n.length === 1) return result(P.simplifySqrt(n[0]));
    // --- المتجهات
    if (/متجه/.test(k) && /(طول|مقدار)/.test(k) && (n.length === 2 || n.length === 3)) return result(P.vector(n));
    // --- العمليات اللفظية البسيطة
    if (n.length === 2) {
      const [a, b] = n;
      if (/(ما|كم|اوجد|احسب)?\s*(مجموع|حاصل جمع|ناتج جمع)/.test(k)) return result(R('المجموع', [`${F(a)} + ${F(b)}`], F(a + b)));
      if (/(الفرق بين|ناتج طرح|حاصل طرح)/.test(k)) return result(R('الفرق', [`${F(Math.max(a, b))} − ${F(Math.min(a, b))}`], F(Math.abs(a - b))));
      if (/(حاصل ضرب|ناتج ضرب)/.test(k)) return result(R('حاصل الضرب', [`${F(a)} × ${F(b)}`], F(a * b)));
      if (/(ناتج قسمه|خارج قسمه|حاصل قسمه)/.test(k) && b) return result(R('ناتج القسمة', [`${F(a)} ÷ ${F(b)}`, Number.isInteger(a / b) ? '' : `الباقي = ${F(a % b)}`].filter(Boolean), M.fracHTML(a / b) + (Number.isInteger(a / b) ? '' : ` ≈ ${F(a / b)}`)));
    }
    if (n.length === 1) {
      const a = n[0];
      if (/^(ما|كم)?\s*(هو|قيمه)?\s*مربع(\s|$)/.test(k) || /مربع العدد/.test(k)) return result(R('مربع العدد', [`${F(a)}² = ${F(a)} × ${F(a)}`], F(a * a)));
      if (/مكعب العدد|^(ما|كم)?\s*(هو)?\s*مكعب\s/.test(k)) return result(R('مكعب العدد', [`${F(a)}³ = ${F(a)} × ${F(a)} × ${F(a)}`], F(a ** 3)));
      if (/(الجذر التربيعي|جذر)/.test(k) && !/تكعيبي/.test(k)) return result(R('الجذر التربيعي', [Number.isInteger(Math.sqrt(a)) ? `${F(Math.sqrt(a))} × ${F(Math.sqrt(a))} = ${F(a)}` : `${F(a)} ليس مربعاً كاملاً`], F(Math.sqrt(a))));
      if (/جذر تكعيبي|الجذر التكعيبي/.test(k)) return result(R('الجذر التكعيبي', [`نبحث عن عدد مكعبه ${F(a)}`], F(Math.cbrt(a))));
      if (/(زوجي ام فردي|فردي ام زوجي|هل .* زوجي|هل .* فردي)/.test(k)) return result(R('زوجي أم فردي؟', [`${F(a)} ÷ ٢ ${a % 2 ? 'يبقى ١' : 'دون باقٍ'}`], a % 2 ? 'فردي' : 'زوجي'));
      if (/هل .* اولي/.test(k) && Number.isInteger(a)) { const f = E.factorize(a); return result(R('هل العدد أولي؟', [E.isPrime(a) ? `${L(a)} لا يقبل القسمة إلا على ١ وعلى نفسه` : `${L(a)} = ${f.map(L).join(' × ')}`], E.isPrime(a) ? 'نعم، عدد أولي' : 'لا، عدد غير أولي (مؤلف)')); }
      if (/(عوامل|قواسم)/.test(k) && /(جميع|كل|اوجد|ما)/.test(k) && !/اوليه/.test(k) && Number.isInteger(a) && a > 0 && a < 1e6) {
        const d = []; for (let i = 1; i <= a; i++) if (a % i === 0) d.push(i);
        return result(R(`عوامل العدد ${L(a)}`, [`نبحث عن الأعداد التي تقسم ${L(a)} دون باقٍ (في أزواج): ${d.slice(0, Math.ceil(d.length / 2)).map((x) => `${L(x)} × ${L(a / x)}`).join('، ')}`], d.map(L).join('، ')));
      }
      if (/(مضاعفات)/.test(k) && Number.isInteger(a)) return result(R(`مضاعفات العدد ${L(a)}`, [`نضرب ${L(a)} في ١، ٢، ٣، …`], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => L(a * i)).join('، ') + '، …'));
    }
    return null;
  }

  /* ================= رياضيات متقدمة بالكلمات ================= */
  const stripDx = (s) => s.replace(/\s*(د\s*س|دس|dx|د ص|d x)\s*$/i, '').replace(/^[:\s]+/, '');
  function advanced(raw, k) {
    const w = M.toWestern(raw);
    // التكامل
    if (/تكامل|∫/.test(raw)) {
      const lim = w.match(/من\s*(-?[\d.]+)\s*(?:إلى|الى|الي|إلي|حتى)\s*(-?[\d.]+)/);
      let expr = raw.replace(/.*?(تكامل|∫)\s*(الدالة|الداله|المقدار)?\s*/, '');
      expr = expr.replace(/من\s*-?[\d٠-٩.٫]+\s*(?:إلى|الى|الي|إلي|حتى)\s*-?[\d٠-٩.٫]+/, '');
      expr = stripDx(expr.replace(/[؟?]/g, '').trim());
      try {
        if (lim) return result(P.definite(expr, +lim[1], +lim[2]), null);
        return result(P.integrate(expr), null);
      } catch (e) { return { type: 'error', error: e.message }; }
    }
    // النهايات
    if (/(^|\s)(نهايه|نها|نهـا)(\s|$)/.test(k) || /تؤول|←|->|→/.test(raw)) {
      const am = w.match(/(?:تؤول\s*(?:إلى|الى|الي)|تقترب\s*من|←|->|→)\s*(-?[\d.]+|∞|ما لا نهاية|مالانهاية|اللانهاية)/);
      if (am) {
        const a = /∞|نهاي/.test(am[1]) ? Infinity : +am[1];
        let expr = raw.replace(/.*?(نهاية|نهايه|نهـا|نها)\s*(الدالة|الداله)?\s*/, '');
        expr = expr.replace(/(عندما|حين|لما)?\s*(س|x|ص)?\s*(تؤول|تقترب|←|->|→).*$/, '').replace(/[؟?]/g, '').trim();
        try { return result(P.limit(expr, a)); } catch (e) { return { type: 'error', error: e.message }; }
      }
    }
    // الاشتقاق
    if (/مشتق|اشتق|تفاضل/.test(k)) {
      let expr = raw.replace(/.*?(المشتقة|مشتقة|المشتقه|مشتقه|اشتق|تفاضل|مشتق)\s*(الأولى|الاولى)?\s*(للدالة|الدالة|للداله|الداله|ل)?\s*/, '').replace(/[؟?]/g, '');
      expr = expr.replace(/(بالنسبة|عند).*$/, '').replace(/^.*?=/, '').replace(/^\s*(د|ق)\s*\(\s*(س|x)\s*\)\s*/, '').trim();
      const at = w.match(/عند\s*(?:س|x)?\s*=?\s*(-?[\d.]+)/);
      try {
        const ast = E.parse(expr);
        if (E.variables(ast).size) {
          const d = E.derivative(ast, 'x');
          const steps = [`الدالة: ${E.toHTML(ast)}`, 'نطبق قواعد الاشتقاق على كل حد: مشتقة سⁿ = ن سⁿ⁻¹، ومشتقة الثابت صفر، ومشتقة جا س = جتا س'];
          let ans = `${E.mathSpan('د′(' + M.varName('x') + ') = ')}${E.toHTML(d)}`;
          if (at) { const v = E.evaluate(d, { x: +at[1] }, M.settings.angle === 'rad' ? 'rad' : 'rad'); steps.push(`نعوّض س = ${L(+at[1])}: د′(${L(+at[1])}) = ${F(v)}`); ans += ` ، د′(${L(+at[1])}) = ${F(v)}`; }
          ctx.lastExpr = expr;
          return result(R('الاشتقاق', steps, ans, { kind: 'deriv' }));
        }
      } catch (e) { /* يستمر */ }
    }
    // باقي القسمة (نظرية الباقي)
    if (/باقي/.test(k) && /(قسمه|يقسم)/.test(k)) {
      const m = raw.match(/(?:قسمة|قسمه)\s*(.+?)\s*(?:على|علي)\s*\(?\s*(?:س|x)\s*([+\-−])\s*([\d٠-٩.٫]+)\s*\)?/);
      if (m) { const a = (m[2] === '+' ? -1 : 1) * +M.toWestern(m[3]); try { return result(P.remainder(m[1], a)); } catch (e) { /* */ } }
    }
    // قسمة كثيرات الحدود
    if (/(اقسم|قسمه|قسّم)/.test(k) && /(س|x)/.test(raw) && /(على|علي)/.test(raw) && !/باقي/.test(k)) {
      const m = raw.match(/(?:اقسم|قسمة|قسمه|قسّم)\s*(.+?)\s*(?:على|علي)\s*(.+?)\s*[؟?]?$/);
      if (m && /(س|x)/.test(m[2])) { try { return result(P.polyDivide(m[1], m[2])); } catch (e) { /* */ } }
    }
    // المصفوفات
    if (/(مصفوف|محدد|معكوس|نظير ضربي)/.test(k) && /[\[\]؛;|]/.test(raw)) {
      const blocks = raw.match(/\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]/g) || [];
      try {
        const mats = blocks.map((b) => P.parseMatrix(b.replace(/\]\s*,?\s*\[/g, ';')));
        const A = mats[0] || P.parseMatrix(raw.replace(/^[^\d\-٠-٩]+/, ''));
        if (/معكوس|نظير ضربي/.test(k)) return result(P.inverse(A));
        if (mats.length === 2 && /(ضرب|اضرب|×)/.test(raw)) return result(P.matMul(mats[0], mats[1]));
        if (mats.length === 2 && /(اطرح|طرح|−|-)/.test(raw) && !/جمع|اجمع/.test(raw)) return result(P.matAdd(mats[0], mats[1], true));
        if (mats.length === 2) return result(P.matAdd(mats[0], mats[1]));
        return result(P.determinant(A));
      } catch (e) { return { type: 'error', error: e.message }; }
    }
    // المتتابعات
    if (/(الحد التالي|الحد الذي يلي|اكمل النمط|اكمل المتتابعه|متتابعه|متتاليه|النمط|نوع المتتابعه|الحد العام)/.test(k)) {
      const list = numsOf(k.replace(/الحد (ال)?(\d+|عاشر|العاشر)/, ''));
      if (list.length >= 3) { try { return result(P.sequence(list)); } catch (e) { /* */ } }
    }
    // اللوغاريتم بالكلمات: لوغاريتم ٨ للأساس ٢
    const lg = k.match(/لوغاريتم\s*(-?[\d.]+)\s*(?:للاساس|بالاساس|اساس)\s*([\d.]+)/);
    if (lg) { try { return result(P.log(+lg[2], +lg[1])); } catch (e) { return { type: 'error', error: e.message }; } }
    // معادلة أسية ٢^س = ٣٢
    const ex = w.match(/^\s*(?:حل\s*)?([\d.]+)\s*\^\s*\(?\s*(?:(\d*)\s*)?(?:س|x)\s*\)?\s*=\s*([\d.]+)\s*$/);
    if (ex) { try { return result(P.expEquation(+ex[1], +ex[3], ex[2] ? +ex[2] : 1)); } catch (e) { /* */ } }
    return null;
  }

  /* ================= الهندسة والإحصاء والأعداد ================= */
  const SHAPE_WORDS = [
    [/منشور|متوازي مستطيلات|صندوق|خزان/, 'box'], [/متوازي اضلاع/, 'para'], [/دائر/, 'circle'], [/مربع/, 'square'], [/مستطيل/, 'rect'], [/مثلث/, 'tri'], [/مكعب/, 'cube'], [/كره|كرة/, 'sphere'], [/اسطوان/, 'cyl'], [/مخروط/, 'cone'], [/شبه منحرف/, 'trap'], [/معين/, 'rhombus'], [/هرم/, 'pyramid'],
  ];
  function shapeCalc(k) {
    const kind = /حجم|سعه/.test(k) ? 'vol' : /محيط/.test(k) ? 'per' : /مساح/.test(k) ? 'area' : null;
    if (!kind) return null;
    const sh = SHAPE_WORDS.find(([re]) => re.test(k));
    if (!sh) return null;
    const n = numsOf(k);
    if (!n.length) return null;
    let [a, b, c] = n;
    const P_ = Math.PI;
    const byDiam = /قطر(ها|ه)?\s*\d/.test(wordsToDigits(k)) && !/نصف قطر|نق/.test(k);
    if (byDiam && /دائر|كره|اسطوان|مخروط/.test(k)) a = a / 2;
    const Fm = (x) => F(x, 3);
    const Rs = (title, law, val, note) => R(title, [note, `القانون: ${law}`].filter(Boolean), `${Fm(val)}${kind === 'area' ? ' وحدة مربعة' : kind === 'vol' ? ' وحدة مكعبة' : ' وحدة'}`, { kind: 'shape', value: val });
    const dn = byDiam ? `نصف القطر = القطر ÷ ٢ = ${Fm(a)}` : null;
    switch (sh[1]) {
      case 'circle': return kind === 'per' ? Rs('محيط الدائرة', `٢ × ط × نق = ٢ × ط × ${Fm(a)}`, 2 * P_ * a, dn) : Rs('مساحة الدائرة', `ط × نق² = ط × ${Fm(a)}²`, P_ * a * a, dn);
      case 'square': return kind === 'per' ? Rs('محيط المربع', `٤ × ل = ٤ × ${Fm(a)}`, 4 * a) : Rs('مساحة المربع', `ل² = ${Fm(a)}²`, a * a);
      case 'rect': if (b == null) return null; return kind === 'per' ? Rs('محيط المستطيل', `٢ × (الطول + العرض) = ٢ × (${Fm(a)} + ${Fm(b)})`, 2 * (a + b)) : Rs('مساحة المستطيل', `الطول × العرض = ${Fm(a)} × ${Fm(b)}`, a * b);
      case 'tri':
        if (kind === 'per' && c != null) return Rs('محيط المثلث', `مجموع الأضلاع = ${Fm(a)} + ${Fm(b)} + ${Fm(c)}`, a + b + c);
        if (kind === 'area' && c != null && /اضلاعه|اطوال اضلاع|هيرون/.test(k)) { const s = (a + b + c) / 2; return Rs('مساحة المثلث (قانون هيرون)', `√(ح(ح−أ)(ح−ب)(ح−جـ)) ، ح = ${Fm(s)}`, Math.sqrt(s * (s - a) * (s - b) * (s - c))); }
        if (kind === 'area' && b != null) return Rs('مساحة المثلث', `½ × القاعدة × الارتفاع = ½ × ${Fm(a)} × ${Fm(b)}`, 0.5 * a * b);
        if (kind === 'per' && /متطابق الاضلاع/.test(k)) return Rs('محيط المثلث المتطابق الأضلاع', `٣ × ل = ٣ × ${Fm(a)}`, 3 * a);
        return null;
      case 'trap': if (c == null) return null; return Rs('مساحة شبه المنحرف', `½ × (القاعدة١ + القاعدة٢) × الارتفاع = ½ × (${Fm(a)} + ${Fm(b)}) × ${Fm(c)}`, 0.5 * (a + b) * c);
      case 'para': if (b == null) return null; return kind === 'per' ? Rs('محيط متوازي الأضلاع', `٢ × (${Fm(a)} + ${Fm(b)})`, 2 * (a + b)) : Rs('مساحة متوازي الأضلاع', `القاعدة × الارتفاع = ${Fm(a)} × ${Fm(b)}`, a * b);
      case 'rhombus': if (kind === 'per') return Rs('محيط المعين', `٤ × ل = ٤ × ${Fm(a)}`, 4 * a); if (b == null) return null; return Rs('مساحة المعين', `½ × ق١ × ق٢ = ½ × ${Fm(a)} × ${Fm(b)}`, 0.5 * a * b);
      case 'cube': return kind === 'vol' ? Rs('حجم المكعب', `ل³ = ${Fm(a)}³`, a ** 3) : kind === 'per' ? null : Rs('المساحة الكلية للمكعب', `٦ × ل² = ٦ × ${Fm(a)}²`, 6 * a * a);
      case 'box': if (c == null) return null; return kind === 'vol' ? Rs('حجم متوازي المستطيلات', `الطول × العرض × الارتفاع = ${Fm(a)} × ${Fm(b)} × ${Fm(c)}`, a * b * c) : Rs('المساحة الكلية لمتوازي المستطيلات', `٢(ل ع + ل ر + ع ر)`, 2 * (a * b + a * c + b * c));
      case 'sphere': return kind === 'vol' ? Rs('حجم الكرة', `⁴⁄₃ × ط × نق³ = ⁴⁄₃ × ط × ${Fm(a)}³`, (4 / 3) * P_ * a ** 3, dn) : Rs('مساحة سطح الكرة', `٤ × ط × نق² = ٤ × ط × ${Fm(a)}²`, 4 * P_ * a * a, dn);
      case 'cyl': if (b == null) return null; return kind === 'vol' ? Rs('حجم الأسطوانة', `ط × نق² × ع = ط × ${Fm(a)}² × ${Fm(b)}`, P_ * a * a * b, dn) : Rs('المساحة الكلية للأسطوانة', `٢ط نق(نق + ع) = ٢ × ط × ${Fm(a)} × (${Fm(a)} + ${Fm(b)})`, 2 * P_ * a * (a + b), dn);
      case 'cone': if (b == null) return null; return kind === 'vol' ? Rs('حجم المخروط', `⅓ × ط × نق² × ع = ⅓ × ط × ${Fm(a)}² × ${Fm(b)}`, (P_ * a * a * b) / 3, dn) : null;
      case 'pyramid': if (b == null) return null; return kind === 'vol' ? Rs('حجم الهرم', `⅓ × مساحة القاعدة × الارتفاع = ⅓ × ${Fm(a)} × ${Fm(b)}`, (a * b) / 3) : null;
    }
    return null;
  }
  function numbersAndStats(raw, k) {
    const n = numsOf(k);
    const w = M.toWestern(raw);
    // ق.م.أ و م.م.أ
    if (/(قاسم|ق\.?م\.?ا|مضاعف مشترك|م\.?م\.?ا|المضاعف المشترك)/.test(k) && n.length >= 2) {
      const ns = n.map((x) => Math.abs(Math.floor(x))).filter(Boolean);
      const g = ns.reduce((a, b) => E.gcd(a, b)), l = ns.reduce((a, b) => E.lcm(a, b));
      const onlyG = /قاسم|ق\.?م\.?ا/.test(k) && !/مضاعف|م\.?م\.?ا/.test(k), onlyL = !/قاسم|ق\.?م\.?ا/.test(k);
      return result(R('القاسم والمضاعف المشترك', ns.map((x) => `${L(x)} = ${E.factorize(x).map(L).join(' × ')}`).concat(['ق.م.أ: حاصل ضرب العوامل المشتركة بأصغر أس ، م.م.أ: حاصل ضرب كل العوامل بأكبر أس']), onlyG ? `ق.م.أ = ${L(g)}` : onlyL ? `م.م.أ = ${L(l)}` : `ق.م.أ = ${L(g)} ، م.م.أ = ${L(l)}`, { kind: 'gcd' }));
    }
    // التحليل إلى عوامل أولية
    if (/(حلل|حلّل|عوامل اوليه|العوامل الاوليه|تحليل)/.test(k) && n.length === 1 && Number.isInteger(n[0]) && n[0] > 1 && !/س|x|ص/.test(w)) {
      const x = n[0], f = E.factorize(x);
      const pw = {}; f.forEach((p) => (pw[p] = (pw[p] || 0) + 1));
      return result(R(`تحليل العدد ${L(x)} إلى عوامله الأولية`, [E.isPrime(x) ? `${L(x)} عدد أولي` : `نقسم على أصغر عدد أولي باستمرار: ${f.map(L).join(' ، ')}`, `بالأسس: ${Object.entries(pw).map(([p, e]) => L(p) + (e > 1 ? `<sup>${L(e)}</sup>` : '')).join(' × ')}`], `${L(x)} = ${f.map(L).join(' × ')}`, { kind: 'factor' }));
    }
    // الإحصاء
    if (/(متوسط|وسيط|منوال|مدي|انحراف|تباين|الوسط الحسابي|المقاييس)/.test(k) && n.length >= 2) {
      const s = E.stats(n);
      const Fm = (x) => F(x, 3);
      const want = /وسيط/.test(k) && !/متوسط|منوال/.test(k) ? 'median' : /منوال/.test(k) && !/متوسط|وسيط/.test(k) ? 'mode' : /(^|\s)(لل|ال)?مدي(\s|$)/.test(k) && !/متوسط|وسيط/.test(k) ? 'range' : /انحراف|تباين/.test(k) ? 'sd' : /متوسط|الوسط/.test(k) && !/وسيط|منوال/.test(k) ? 'mean' : 'all';
      const steps = [`القيم مرتبة تصاعدياً: ${s.sorted.map(Fm).join('، ')} (عددها ${L(s.n)})`];
      if (want === 'mean' || want === 'all' || want === 'sd') steps.push(`المتوسط = المجموع ÷ العدد = ${Fm(s.sum)} ÷ ${L(s.n)} = ${Fm(s.mean)}`);
      if (want === 'median' || want === 'all') steps.push(s.n % 2 ? `الوسيط = القيمة الوسطى (رقم ${L((s.n + 1) / 2)}) = ${Fm(s.median)}` : `العدد زوجي ⇐ الوسيط = متوسط القيمتين الوسطيين = ${Fm(s.median)}`);
      if (want === 'mode' || want === 'all') steps.push(`المنوال (الأكثر تكراراً) = ${s.mode.length ? s.mode.map(Fm).join('، ') : 'لا يوجد'}`);
      if (want === 'range' || want === 'all') steps.push(`المدى = أكبر قيمة − أصغر قيمة = ${Fm(s.max)} − ${Fm(s.min)} = ${Fm(s.range)}`);
      if (want === 'sd' || want === 'all') steps.push(`التباين = ${Fm(s.sdP * s.sdP)} ، الانحراف المعياري = √التباين = ${Fm(s.sdP)}`);
      const ans = { mean: `المتوسط = ${Fm(s.mean)}`, median: `الوسيط = ${Fm(s.median)}`, mode: `المنوال = ${s.mode.length ? s.mode.map(Fm).join('، ') : 'لا يوجد'}`, range: `المدى = ${Fm(s.range)}`, sd: `الانحراف المعياري = ${Fm(s.sdP)}`, all: `المتوسط ${Fm(s.mean)} ، الوسيط ${Fm(s.median)} ، المنوال ${s.mode.length ? s.mode.map(Fm).join('، ') : 'لا يوجد'} ، المدى ${Fm(s.range)}` }[want];
      return result(R('المقاييس الإحصائية', steps, ans, { kind: 'stats', data: n }));
    }
    // الأشكال
    const sc = shapeCalc(k); if (sc) return result(sc);
    // فيثاغورس
    if (/(وتر|فيثاغورس|فيثاغورث|قائم الزاويه)/.test(k) && n.length === 2) {
      const [a, b] = n;
      if (/(ضلع|الضلع الاخر|الضلع الثالث|ساق)/.test(k) && /(وتر|الوتر)(ه|ها)?\s*(طوله)?\s*\d/.test(wordsToDigits(k))) {
        const hyp = +wordsToDigits(k).match(/(?:وتر|الوتر)(?:ه|ها)?\s*(?:طوله)?\s*(\d+(\.\d+)?)/)[1], leg = a === hyp ? b : a;
        if (hyp > leg) return result(R('نظرية فيثاغورس (إيجاد ضلع قائم)', [`الضلع² = الوتر² − الضلع الآخر² = ${F(hyp)}² − ${F(leg)}² = ${F(hyp * hyp - leg * leg)}`], `الضلع = ${F(Math.sqrt(hyp * hyp - leg * leg), 3)}`, { kind: 'pyth' }));
      }
      return result(R('نظرية فيثاغورس', [`في المثلث القائم: الوتر² = مجموع مربعي الضلعين القائمين`, `الوتر² = ${F(a)}² + ${F(b)}² = ${F(a * a + b * b)}`], `الوتر = ${F(Math.hypot(a, b), 3)}`, { kind: 'pyth' }));
    }
    // مجموع زوايا المضلع
    if (/(مجموع (قياسات )?(ال)?زوايا|قياس (ال)?زاويه)/.test(k) && /(مضلع|سداسي|خماسي|ثماني|اضلاع)/.test(k)) {
      const sides = n[0] || ({ خماسي: 5, سداسي: 6, سباعي: 7, ثماني: 8 }[(k.match(/خماسي|سداسي|سباعي|ثماني/) || [])[0]]);
      if (sides >= 3) {
        const sum = (sides - 2) * 180;
        const one = /(منتظم|قياس (ال)?زاويه)/.test(k);
        return result(R('زوايا المضلع', [`مجموع الزوايا الداخلية = (ن − ٢) × ١٨٠° = (${L(sides)} − ٢) × ١٨٠°`, one ? `في المضلع المنتظم: الزاوية الواحدة = ${L(sum)}° ÷ ${L(sides)}` : ''].filter(Boolean), one ? `${F(sum / sides, 2)}°` : `${L(sum)}°`, { kind: 'angles' }));
      }
    }
    // الزاوية الثالثة في المثلث
    if (/مثلث/.test(k) && /زاويه|زاويتان|زاويتين|زوايا/.test(k) && n.length === 2 && !/مساح|محيط/.test(k)) {
      const [a, b] = n;
      if (a + b < 180) return result(R('الزاوية الثالثة في المثلث', ['مجموع زوايا المثلث = ١٨٠°', `الزاوية الثالثة = ١٨٠° − (${L(a)}° + ${L(b)}°)`], `${L(180 - a - b)}°`, { kind: 'angles' }));
    }
    // المتممة والمكملة
    if (/(متممه|المتممه)/.test(k) && n.length === 1) return result(R('الزاوية المتممة', ['الزاويتان المتتامتان مجموعهما ٩٠°', `٩٠° − ${L(n[0])}°`], `${L(90 - n[0])}°`));
    if (/(مكمله|المكمله)/.test(k) && n.length === 1) return result(R('الزاوية المكملة', ['الزاويتان المتكاملتان مجموعهما ١٨٠°', `١٨٠° − ${L(n[0])}°`], `${L(180 - n[0])}°`));
    // المسافة والميل بين نقطتين
    const pts = w.match(/\(\s*-?[\d.]+\s*[,،]\s*-?[\d.]+\s*\)/g);
    if (pts && pts.length === 2) {
      const [p1, p2] = pts.map((p) => p.match(/-?[\d.]+/g).map(Number));
      const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
      const P1 = `(${L(p1[0])}، ${L(p1[1])})`, P2 = `(${L(p2[0])}، ${L(p2[1])})`;
      if (/ميل/.test(k)) return result(R('ميل المستقيم', [`م = (ص٢ − ص١) ÷ (س٢ − س١) = (${L(p2[1])} − ${L(p1[1])}) ÷ (${L(p2[0])} − ${L(p1[0])})`], dx ? M.fracHTML(dy / dx) : 'غير معرّف (مستقيم رأسي)', { kind: 'line' }));
      if (/منتصف/.test(k)) return result(R('نقطة المنتصف', [`م = ((س١ + س٢) ÷ ٢ ، (ص١ + ص٢) ÷ ٢)`], `(${F((p1[0] + p2[0]) / 2)}، ${F((p1[1] + p2[1]) / 2)})`, { kind: 'line' }));
      if (/معادله/.test(k) && dx) {
        const m = dy / dx, c = p1[1] - m * p1[0];
        return result(R('معادلة المستقيم المار بنقطتين', [`الميل م = ${M.fracHTML(m)}`, `ص − ${L(p1[1])} = ${M.fracHTML(m)} (س − ${L(p1[0])})`], E.mathSpan(`ص = ${E.polyToText([c, m], 'x', true)}`), { kind: 'line' }));
      }
      if (/(مسافه|البعد|طول القطعه)/.test(k)) return result(R('المسافة بين نقطتين', [`ف = √((س٢ − س١)² + (ص٢ − ص١)²) = √(${F(dx)}² + ${F(dy)}²) = √${F(dx * dx + dy * dy)}`], F(Math.hypot(dx, dy), 3), { kind: 'line' }));
      return result(R(`النقطتان ${P1} و ${P2}`, [`الميل = ${dx ? M.fracHTML(dy / dx) : 'غير معرّف'}`, `المنتصف = (${F((p1[0] + p2[0]) / 2)}، ${F((p1[1] + p2[1]) / 2)})`], `المسافة = ${F(Math.hypot(dx, dy), 3)}`, { kind: 'line' }));
    }
    return null;
  }

  /* ================= النوايا الحوارية ================= */
  const HELP_HTML = `<p>أنا المعلم الذكي في مِداد، وأعمل بالكامل على جهازك دون إنترنت. أستطيع:</p>
    <ul>
      <li>حل المعادلات والمتباينات والأنظمة وكثيرات الحدود بالخطوات (مثال: <b>حل ٢س² − ٨ = ٠</b>)</li>
      <li>المسائل اللفظية: النسب المئوية والخصم، السرعة والمسافة، الربح، التقسيم بنسبة، الأعداد المتتالية، العدد المجهول</li>
      <li>الهندسة: المساحات والحجوم وفيثاغورس والزوايا والمسافة والميل بين نقطتين</li>
      <li>الإحصاء والاحتمالات والتباديل والتوافيق</li>
      <li>التفاضل والتكامل والنهايات والمصفوفات واللوغاريتمات والمتتابعات</li>
      <li>شرح المفاهيم، وفتح دروس المنهج العُماني، وتمارين تتكيّف مع مستواك</li>
      <li>قراءة ما تكتبه بخط يدك على السبورة وحلّه 📷</li>
      <li>للمعلم: أفكار أنشطة واستراتيجيات لتدريس أي درس</li>
    </ul>`;
  function chat(k) {
    if (/^(السلام عليكم|سلام|مرحبا|اهلا|هلا|صباح الخير|مساء الخير|هاي|السلام)(\s|$)/.test(k) && k.split(' ').length <= 5) {
      return { type: 'text', html: '<p>وعليكم السلام ورحمة الله 👋 أهلاً بك! اكتب مسألة أو سؤالاً رياضياً، أو اطلب تمريناً أو درساً من المنهج.</p>', chips: ['أعطني تمرين', 'ماذا تستطيع أن تفعل؟', 'حل ٣س + ٥ = ٢٠'] };
    }
    if (/^(شكرا|شكرًا|مشكور|جزاك الله|يعطيك العافيه|تسلم|ممتاز|رائع|احسنت)(\s|$)/.test(k) && k.split(' ').length <= 6) {
      return { type: 'text', html: '<p>العفو! سعيد بمساعدتك 🌟 هل تريد تمريناً آخر أو مسألة جديدة؟</p>', chips: ['أعطني تمرين', 'سؤال تحدٍّ'] };
    }
    if (/(ماذا تستطيع|ما الذي تستطيع|وش تقدر|ايش تقدر|كيف استخدم|مساعده|ساعدني|من انت|ما هي قدراتك|ماذا تفعل|اوامر)/.test(k) && !/\d/.test(k)) {
      return { type: 'text', html: HELP_HTML, chips: ['حل س² − ٥س + ٦ = ٠', '٢٠٪ من ٣٥٠', 'اقترح نشاطاً لتدريس الكسور', 'أعطني تمرين'] };
    }
    return null;
  }
  function followUp(k) {
    if (/^(لم افهم|ما فهمت|مافهمت|اشرح اكثر|وضح اكثر|بالتفصيل|اشرح بالتفصيل|ممكن توضيح|اعد الشرح|بسط الشرح|اشرح ببساطه)/.test(k) && ctx.lastResult) {
      return { type: 'result', result: ctx.lastResult, strategy: 'simple', note: 'حسناً، لنمشِ خطوة بخطوة ببطء:' };
    }
    if (/^(سؤال|تمرين)?\s*(اخر|ثاني|غيره|كمان|مره اخري|التالي)$/.test(k) && (ctx.lastTopic || ctx.lastLesson)) {
      return practiceFrom(ctx.lastTopic, ctx.lastLesson);
    }
    if (/^(اصعب|سؤال اصعب|تحدي|سؤال تحدي|تحد)$/.test(k)) return practiceFrom(ctx.lastTopic || M.practice.recommend(), null, 5);
    if (/^(اسهل|سؤال اسهل)$/.test(k)) return practiceFrom(ctx.lastTopic || M.practice.recommend(), null, 1);
    // التعويض في آخر تعبير
    const sub = M.toWestern(k).match(/^(?:عوض|عوّض|اذا كانت|اذا كان|لو كانت|لو|عند|احسب القيمه عند)?\s*(?:س|x)\s*=\s*(-?\d+(?:\.\d+)?)$/);
    if (sub && ctx.lastExpr) {
      try {
        const src = ctx.lastExpr.split('=')[0];
        const ast = E.parse(src);
        const v = E.evaluate(ast, { x: +sub[1] }, M.settings.angle === 'rad' ? 'rad' : 'deg');
        return result(R('التعويض', [`التعبير: ${E.toHTML(ast)}`, `نعوّض ${M.varName('x')} = ${L(+sub[1])}`], F(v)));
      } catch (e) { /* يستمر */ }
    }
    return null;
  }
  function practiceFrom(topic, lesson, level) {
    if (lesson) { const q = M.practice.lessonQuestion(lesson); return { type: 'question', question: q, topic: q.topic, lesson }; }
    const q = M.practice.generate(topic, level);
    return { type: 'question', question: q, topic };
  }

  /* ================= الموزّع الرئيسي ================= */
  /**
   * يفهم السؤال ويعيد:
   *  {type:'result', result, source?} | {type:'concept', concept} | {type:'question', question, topic, lesson?}
   *  {type:'lessons', lessons, grade?} | {type:'activities', name, items, lesson?} | {type:'text', html, chips?} | {type:'error', error} | null
   */
  function understand(raw) {
    const text = mathWords(String(raw || '').trim());
    if (!text) return null;
    const k = K(text);
    const r = route(text, k);
    // تحديث السياق
    if (r) {
      if (r.type === 'result') { ctx.lastResult = r.result; if (r.source) ctx.lastExpr = r.source; }
      if (r.type === 'question') { ctx.lastTopic = r.topic; ctx.lastLesson = r.lesson || null; ctx.lastQuestion = r.question; }
    }
    return r;
  }
  /** تحويل الكلمات الرياضية إلى رموز: «٣ أس ٤» ⇐ ٣^٤ ، «٢٥ تربيع» ⇐ ٢٥^٢ */
  function mathWords(t) {
    return t.replace(/([\d٠-٩)])\s*(?:أس|اس|أُس)\s*([\d٠-٩(])/g, '$1^$2')
      .replace(/([\d٠-٩)])\s*(?:تربيع)(?=\s|$|[؟?])/g, '$1^2').replace(/([\d٠-٩)])\s*(?:تكعيب)(?=\s|$|[؟?])/g, '$1^3');
  }
  function route(text, k) {
    const c = chat(k); if (c) return c;
    // ق(ن، ر) و ل(ن، ر)
    const cm = M.toWestern(text).match(/^\s*(ق|ل|C|P)\s*\(\s*(\d+)\s*[,،]\s*(\d+)\s*\)\s*[؟?]?\s*$/);
    if (cm) { const kind = /ق|C/.test(cm[1]) ? 'توافيق' : 'تباديل'; return result(combinatorics(K(`${kind} ${cm[2]} ${cm[3]} عدد`))); }
    // --- المجسمات والشبكات والأشكال (مختبر الأشكال)
    const SOLID_W = [[/مكعب/, 'cube'], [/متوازي مستطيلات|صندوق/, 'cuboid'], [/منشور ثلاثي/, 'triPrism'], [/منشور سداسي/, 'hexPrism'], [/هرم رباعي|هرم مربع|الهرم(?! الثلاثي)/, 'sqPyramid'], [/هرم ثلاثي|رباعي الاوجه/, 'tetra'], [/اسطوان/, 'cylinder'], [/مخروط ناقص/, 'frustum'], [/مخروط/, 'cone'], [/نصف كره/, 'hemisphere'], [/كره/, 'sphere']];
    if (M.solids && /(^|\s)(ال)?(شبكه|شبكات|افرد|فرد|طي|اطو\S*)(\s|$)/.test(k)) { const sw = SOLID_W.find(([re]) => re.test(k)); if (sw && M.solids.SOLIDS[sw[1]].net) return { type: 'lab', tab: 'nets', key: sw[1], name: M.solids.SOLIDS[sw[1]].name }; }
    if (M.solids && /(اعرض|ارسم|وريني|ورني|اريد ان اري|مجسم|ثلاثي الابعاد|ثلاثيه الابعاد)/.test(k) && !/\d/.test(k)) { const sw = SOLID_W.find(([re]) => re.test(k)); if (sw) return { type: 'lab', tab: 'solids', key: sw[1], name: M.solids.SOLIDS[sw[1]].name }; }
    // الرسم البياني
    if (/(^|\s)(ارسم|مثل بيانيا|التمثيل البياني|مثل الداله|منحني الداله)/.test(k) && /(س|ص|x|y)/.test(text.replace(/ارسم\S*/g, ''))) {
      const expr = text.replace(/^.*?(ارسم|ارسمي|مثّل بيانياً|مثل بيانيا|مثل بيانياً|التمثيل البياني لـ?|التمثيل البياني|منحنى)\s*(الدالة|الداله|المستقيم|المنحنى)?\s*[:：]?\s*/, '').replace(/[؟?]\s*$/, '').trim();
      // ثلاثي الأبعاد: ع = د(س، ص) أو تعبير بدلالة س و ص معاً
      const src = expr.replace(/^\s*(ع|z)\s*=\s*/, '');
      if (/^\s*(ع|z)\s*=/.test(expr) || (/[سx]/.test(src) && /[صy]/.test(src) && !/=/.test(src))) return { type: 'plot3d', expr: src };
      return { type: 'plot', expr, result: trySolve(expr) };
    }
    const f = followUp(k); if (f) return f;
    const grade = gradeIn(k);

    // --- نشاط/استراتيجية تدريس (للمعلم)
    if (/(نشاط|انشطه|استراتيجيه|استراتيجيات|فكره لتدريس|افكار لتدريس|كيف ادرس|كيف اشرح|طريقه تدريس|لعبه تعليميه|خطه درس|تحضير درس)/.test(k)) {
      const lessons = findLessons(k, grade);
      const skill = detectSkill(k);
      const name = lessons[0] ? lessons[0].t : skill ? M.practice.topics[skill].name : (k.replace(/.*(لتدريس|ادرس|اشرح|تدريس|درس)\s*/, '').trim() || 'الدرس');
      return { type: 'activities', name, items: activitiesFor(name), lesson: lessons[0] || null };
    }
    // --- تمرين متكيّف
    if (/(تمرين|تمارين|اختبرني|اختبار|اعطني سؤال|اعطيني سؤال|سؤال تدريبي|سؤال في|اسئله في|تدرب|تدريب|درّبني|دربني|اريد ان اتدرب|امتحني|امتحان)/.test(k)) {
      const lessons = findLessons(k, grade);
      const skill = detectSkill(k);
      if (lessons.length && (!skill || lessons[0].s.includes(skill) || K(lessons[0].t).split(' ').some((w) => w.length > 3 && k.includes(w)))) return practiceFrom(null, lessons[0]);
      if (skill) return practiceFrom(skill, null, /صعب|تحدي|متقدم/.test(k) ? 5 : /سهل|بسيط|مبتدئ/.test(k) ? 1 : undefined);
      if (grade) { const gl = M.curriculum.grade(grade); const all = gl.units.flatMap((u) => u.lessons); return practiceFrom(null, all[Math.floor(Math.random() * all.length)]); }
      return practiceFrom(M.practice.recommend());
    }
    // --- دروس المنهج
    if (/(^|\s)(درس|دروس|الدرس|منهج|المنهج|وحده|الوحده)(\s|$)/.test(k) || (grade && !/\d\s*[+\-×÷*/=]/.test(k))) {
      const lessons = findLessons(k, grade);
      if (lessons.length) return { type: 'lessons', lessons, grade };
      if (grade) return { type: 'lessons', lessons: M.curriculum.grade(grade).units.flatMap((u) => u.lessons).slice(0, 40), grade, all: true };
    }
    // --- سؤال عن مفهوم دون أرقام (اشرح التكامل، ما هو المميز)
    const w0 = M.toWestern(text);
    const asks0 = /(^|\s)(ما هو|ما هي|ماهو|ماهي|ما معني|ما المقصود|اشرح|عرف|تعريف|وضح|لماذا|الفرق بين|ما الفرق)(\s|$)/.test(k);
    if (asks0 && !/\d|س|ص|x/.test(w0.replace(/اساس|سؤال|درس|صف|سهل|س\S{2,}|\S+س\S*/g, ''))) { const c0 = M.ai.findConcept(text); if (c0) return { type: 'concept', concept: c0 }; }
    // --- رياضيات متقدمة بالكلمات
    const adv = advanced(text, k); if (adv) return adv;
    // --- الإحصاء والأعداد والهندسة
    const ns = numbersAndStats(text, k); if (ns) return ns;
    // --- المسائل اللفظية
    const wp = wordProblem(text, k); if (wp) return wp;

    // --- شرح مفهوم
    const concept = M.ai.findConcept(text) || M.ai.findConcept(k);
    const w = M.toWestern(text);
    const asksConcept = /(ما هو|ما هي|ماهو|ماهي|ما معني|ما المقصود|اشرح|عرف|تعريف|وضح|لماذا|متي|الفرق بين|ما الفرق|قانون|قاعده|خصائص)/.test(k);
    const hasMath = /[=<>≤≥]|\d\s*[+\-×÷*/^!]|\d\s*(س|ص)|(س|ص|x)\s*[²³^+\-=]|√|∫|[+\-×÷*/^]\s*\d/.test(w) || /(^|\s)(جا|جتا|ظا|قا|قتا|ظتا|لو|لو_\d+|جذر)\s*\(?\s*[\d٠-٩]/.test(text);
    if (concept && (asksConcept || !hasMath)) return { type: 'concept', concept };

    // --- معادلة أو تعبير رياضي
    if (hasMath || /^[\d\s+\-×÷*/^().√²³٫٪%!]+$/.test(w) || /(^|\s)(جا|جتا|ظا|جذر|لو|لو_)/.test(text) || /حلل|فك|بسط/.test(k) && /(س|ص|x)/.test(text)) {
      let cleaned = clean(text);
      // نظام معادلات في سطر واحد: «س + ص = ١٠ و س - ص = ٢»
      if ((cleaned.match(/=/g) || []).length >= 2 && !cleaned.includes('\n')) cleaned = cleaned.split(/\s+و\s*(?=[^\s])|\s*[،,؛;]\s*/).map((x) => x.trim()).filter(Boolean).join('\n');
      const res = trySolve(cleaned);
      if (res && res.kind === 'line' && res.m != null && /(ميل|مقطع)/.test(k)) {
        res.answer = `الميل = ${M.fracHTML(res.m)} ، المقطع الصادي = ${M.fracHTML(res.b)}`;
      }
      if (res) return result(res, cleaned);
      try { E.solve(cleaned); } catch (e) { return { type: 'error', error: e.message, source: cleaned }; }
    }
    if (concept) return { type: 'concept', concept };
    // --- اقتراح دروس قريبة
    const lessons = findLessons(k, grade);
    if (lessons.length) return { type: 'lessons', lessons, grade, guess: true };
    return null;
  }

  M.nlu = { understand, normalize: K, wordsToDigits, numbersIn: numsOf, detectSkill, findLessons, gradeIn, activitiesFor, context: ctx };
})();
