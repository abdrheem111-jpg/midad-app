/* ==========================================================================
   لوحة المعلم الذكي: محادثة رياضية بالعربية تعمل بالكامل على الجهاز دون
   إنترنت — تفهم السؤال (M.nlu)، وتحل بالخطوات، وتشرح، وتفتح الدروس، وتدرّب
   بأسئلة متكيّفة، وتقرأ الكتابة اليدوية على السبورة، وتقترح أنشطة للمعلم
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  const STRATS = [
    ['steps', 'خطوة بخطوة'], ['socratic', 'سقراطي (أسئلة موجّهة)'], ['hints', 'تلميحات فقط'], ['simple', 'تبسيط للمبتدئين'], ['challenge', 'تحدٍّ للمتفوقين'],
  ];
  const SUGGEST = [
    'حل ٢س² - ٨ = ٠', 'سيارة سرعتها ٩٠ كم/س سارت ٣ ساعات، كم المسافة؟', '٢٠٪ من ٣٥٠', 'ما هو المميّز؟', 'أعطني تمرين في الكسور',
    'مساحة دائرة نصف قطرها ٧', 'ثلاثة أعداد متتالية مجموعها ٤٨', 'اقترح نشاطاً لتدريس الكسور',
  ];
  // عبارات ودّية لتنويع الردود
  const OPEN = ['إليك الحل:', 'لنحلّها معاً:', 'تفضّل، الحل بالخطوات:', 'حسناً، هكذا نفكّر فيها:'];

  let chat, input;

  M.registerPanel({
    id: 'tutor', title: 'المعلم الذكي', short: 'المعلم الذكي', icon: 'sparkles',
    desc: 'اسأل بالعربية: يحل ويشرح ويدرّب ويقرأ خط يدك — دون إنترنت',
    build(root) {
      const wrap = h('div', { class: 'tutor' });
      const status = h('div', { class: 'ai-status', html: '<span class="led on"></span><span>يعمل على جهازك دون إنترنت — خصوصية تامة ولا تكلفة استخدام</span>' });
      const modes = h('div', { class: 'tutor-modes' });
      STRATS.forEach(([k, t]) => {
        const c = h('button', { class: 'chip' + (M.settings.aiStrategy === k ? ' active' : ''), title: 'استراتيجية التدريس' }, t);
        c.onclick = () => { M.settings.aiStrategy = k; M.saveSettings(); M.$$('.chip', modes).forEach((x) => x.classList.toggle('active', x === c)); M.toast('أسلوب التدريس: ' + t); };
        modes.appendChild(c);
      });
      chat = h('div', { class: 'chat' });
      const comp = h('div', { class: 'composer' });
      input = h('textarea', { placeholder: 'اكتب سؤالك أو مسألتك بالعربية… (Enter للإرسال)', rows: 1 });
      const sendBtn = h('button', { class: 'btn primary', title: 'إرسال', html: icon('send') });
      const cam = h('button', { class: 'btn', title: 'اقرأ ما على السبورة وحلّه', html: icon('camera') });
      comp.append(input, cam, sendBtn);
      wrap.append(status, modes, chat, comp);
      root.appendChild(wrap);

      input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      input.addEventListener('input', () => { input.style.height = '44px'; input.style.height = Math.min(140, input.scrollHeight) + 'px'; });
      sendBtn.onclick = () => send();
      cam.onclick = () => analyzeBoard();
      welcome();
    },
  });

  /* ---------------- عناصر المحادثة ---------------- */
  function bot(html) {
    const m = h('div', { class: 'msg bot' });
    m.innerHTML = `<div class="who">${icon('sparkles')} المعلم الذكي</div>`;
    const body = h('div', { class: 'body' });
    if (typeof html === 'string') body.innerHTML = html; else if (html) body.appendChild(html);
    m.appendChild(body);
    chat.appendChild(m);
    requestAnimationFrame(() => (chat.scrollTop = chat.scrollHeight));
    return body;
  }
  function user(text, img) {
    const m = h('div', { class: 'msg user' });
    m.textContent = text;
    if (img) m.appendChild(h('img', { src: img, alt: 'لقطة السبورة' }));
    chat.appendChild(m);
    chat.scrollTop = chat.scrollHeight;
  }
  /** صف أزرار اقتراحات: نص يُرسل، أو [نص، دالة] */
  function chips(body, list) {
    if (!list || !list.length) return;
    const sg = h('div', { class: 'suggest' });
    list.forEach((it) => {
      const [label, fn] = Array.isArray(it) ? it : [it, null];
      const c = h('button', { class: 'chip' }, label);
      c.onclick = () => (fn ? fn() : send(label));
      sg.appendChild(c);
    });
    body.appendChild(sg);
  }

  function welcome() {
    const g = M.settings.gradeNum;
    const body = bot(`<p>أهلاً بك! أنا <b>المعلم الذكي</b> في مِداد 👋</p>
      <p>اكتب أي مسألة أو سؤال رياضي بالعربية: أحل المعادلات والمسائل اللفظية بالخطوات، وأشرح المفاهيم، وأفتح دروس المنهج العُماني، وأقرأ ما تكتبه بخط يدك على السبورة، وأعطيك تمارين تتكيّف مع مستواك.</p>
      <p style="color:var(--ui-muted);font-size:13px">اختر أسلوب التدريس من الأعلى — «سقراطي» يقودك للحل بالأسئلة، و«تحدٍّ» يضيف سؤالاً أصعب بعد كل حل.</p>`);
    const list = SUGGEST.slice();
    if (g) list.splice(4, 0, `تمرين للصف ${['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'][g]}`);
    chips(body, list.concat([['📷 اقرأ السبورة وحلّها', analyzeBoard]]));
  }

  /* ---------------- عرض الأنواع ---------------- */
  function renderQuestion(body, r) {
    const P = M.practice;
    const lesson = r.lesson;
    const intro = lesson ? `سؤال من درس <b>${lesson.t}</b> (الصف ${L(lesson.g)}) بمستوى يناسبك:` : `إليك سؤالاً في <b>${P.topics[r.topic].name}</b> مناسباً لمستواك الحالي:`;
    body.insertAdjacentHTML('beforeend', `<p>${intro}</p>`);
    const qc = M.questionCard({
      first: r.question,
      next: () => (lesson ? P.lessonQuestion(lesson) : P.generate(r.topic)),
      key: lesson ? lesson.id : r.topic,
      label: (q) => `${P.topics[q.topic].name} · المستوى ${L(q.level)}`,
      compact: true, noFocus: window.innerWidth < 860,
    });
    body.appendChild(qc.el);
    if (lesson && M.curriculumPanel) chips(body, [['📖 افتح الدرس', () => { M.openPanel('curriculum'); M.curriculumPanel.openLesson(lesson); }]]);
  }

  function renderResult(body, r, text) {
    const res = r.result;
    const strategy = r.strategy || M.settings.aiStrategy;
    if (r.note) body.insertAdjacentHTML('beforeend', `<p>${r.note}</p>`);
    else if (strategy === 'socratic') body.insertAdjacentHTML('beforeend', '<p>🤔 قبل أن أكشف الحل: ما أول خطوة تخطر ببالك؟ فكّر فيها ثم اكشف الخطوات واحدة واحدة.</p>');
    else if (strategy === 'hints') body.insertAdjacentHTML('beforeend', '<p>💡 سأعطيك الخطوة الأولى فقط، وحاول إكمال الحل بنفسك. اكشف المزيد عند الحاجة.</p>');
    else body.insertAdjacentHTML('beforeend', `<p>${M.pick(OPEN)}</p>`);
    const extra = [];
    if (r.source && ['eq', 'ineq', 'poly', 'line', 'system', 'quad', 'linear'].includes(res.kind) && M.algebra) {
      const g = h('button', { class: 'btn sm', html: icon('function') + '<span>افتح في الجبر</span>' });
      g.onclick = () => { M.openPanel('algebra'); M.algebra.solve(r.source); };
      extra.push(g);
    }
    if (res.kind === 'stats' && res.data && M.openPanel) {
      const g = h('button', { class: 'btn sm', html: icon('stats') + '<span>افتح في الإحصاء</span>' });
      g.onclick = () => { M.openPanel('stats'); if (M.statsPanel && M.statsPanel.setData) M.statsPanel.setData(res.data); };
      extra.push(g);
    }
    body.appendChild(M.renderResult(res, { strategy: strategy === 'simple' ? 'steps' : strategy, extraActions: extra }));
    if (strategy === 'simple' || r.strategy === 'simple') {
      body.insertAdjacentHTML('beforeend', `<div class="hint" style="margin-top:8px">🧒 <b>بلغة بسيطة:</b> ${simpleWords(res)}</div>`);
    }
    // اقتراحات متابعة
    const skill = M.nlu.detectSkill(M.nlu.normalize(`${res.title || ''} ${text || ''}`));
    const list = [];
    if (skill) list.push([`تمرّن على ${M.practice.topics[skill].name}`, () => { const q = M.nlu.understand(`تمرين في ${M.practice.topics[skill].name}`); renderAny(bot(''), q && q.type === 'question' ? q : { type: 'question', question: M.practice.generate(skill), topic: skill }); }]);
    list.push(['لم أفهم، اشرح أكثر']);
    if (strategy === 'challenge' && skill) {
      body.insertAdjacentHTML('beforeend', '<p style="margin-top:10px">🏆 <b>تحدٍّ:</b> جرّب هذا السؤال الأصعب:</p>');
      renderQuestion(body, { question: M.practice.generate(skill, 5), topic: skill });
    }
    chips(body, list);
  }
  /** شرح مبسّط بكلمات عامة حسب نوع المسألة */
  function simpleWords(res) {
    const k = res.kind;
    const T = {
      eq: 'المعادلة مثل الميزان: ما نفعله في طرف نفعله في الطرف الآخر حتى يبقى المجهول وحده.',
      linear: 'المعادلة مثل الميزان: ما نفعله في طرف نفعله في الطرف الآخر حتى يبقى المجهول وحده.',
      quad: 'المعادلة التربيعية فيها س²، ولها غالباً حلّان: نحلّلها إلى قوسين أو نستخدم القانون العام.',
      poly: 'نجمع الحدود المتشابهة معاً (السينات مع السينات والأعداد مع الأعداد) لنحصل على أبسط صورة.',
      ineq: 'المتباينة مثل المعادلة، لكن الجواب مجموعة أعداد لا عدداً واحداً. وانتبه: الضرب في سالب يقلب الإشارة.',
      system: 'لدينا مجهولان ومعادلتان: نتخلّص من مجهول بالجمع أو التعويض، ثم نجد الآخر.',
      percent: 'النسبة المئوية تعني «من كل ١٠٠». فـ ٢٠٪ تعني ٢٠ من كل ١٠٠.',
      speed: 'السرعة تخبرنا كم نقطع في الساعة الواحدة. فإذا عرفنا اثنين من (المسافة، السرعة، الزمن) وجدنا الثالث.',
      shape: 'نعوّض الأطوال في قانون الشكل خطوة خطوة. المساحة لما بداخل الشكل، والمحيط لطول حدوده.',
      stats: 'المتوسط: نجمع ونقسم على العدد. الوسيط: القيمة في المنتصف بعد الترتيب. المنوال: الأكثر تكراراً.',
      prob: 'الاحتمال = عدد النتائج التي نريدها ÷ عدد كل النتائج الممكنة.',
      ratio: 'نجمع أجزاء النسبة لنعرف كم «جزءاً» عندنا، ثم نقسم المجموع عليها لنعرف قيمة الجزء الواحد.',
      units: 'من وحدة كبيرة إلى صغيرة نضرب (العدد يكبر)، ومن صغيرة إلى كبيرة نقسم (العدد يصغر).',
      deriv: 'المشتقة تقيس سرعة تغيّر الدالة. لكل حد: ننزل الأس ونضربه في المعامل ثم نطرح من الأس واحداً.',
      calc: 'نحسب بالترتيب: الأقواس أولاً، ثم الأسس، ثم الضرب والقسمة، ثم الجمع والطرح.',
    };
    return T[k] || 'اقرأ الخطوات واحدة واحدة، وتأكد أنك فهمت كل خطوة قبل الانتقال للتي بعدها. يمكنك أيضاً أن تطلب «تمرين» مشابه للتدرّب.';
  }

  function renderAny(body, r, text) {
    if (!r) {
      body.innerHTML = `<p>لم أفهم السؤال تماماً 🤔 جرّب إحدى هذه الصيغ:</p>
        <ul><li>حل معادلة: <b>حل ٣س + ٥ = ٢٠</b></li><li>مسألة لفظية: <b>كم ١٥٪ من ٢٠٠</b> أو <b>سيارة قطعت ١٢٠ كم في ساعتين فما سرعتها</b></li>
        <li>شرح مفهوم: <b>ما هو الميل؟</b></li><li>درس أو تمرين: <b>دروس الصف السابع</b> أو <b>تمرين في الكسور</b></li></ul>`;
      chips(body, ['ماذا تستطيع أن تفعل؟']);
      return;
    }
    switch (r.type) {
      case 'text':
        body.insertAdjacentHTML('beforeend', r.html);
        chips(body, r.chips);
        break;
      case 'result':
        renderResult(body, r, text);
        break;
      case 'concept': {
        const c = r.concept;
        body.insertAdjacentHTML('beforeend', M.ai.conceptHTML(c));
        const list = [];
        if (c.try) list.push([`جرّب مثالاً: ${c.try}`, () => send(c.try)]);
        const skill = M.nlu.detectSkill(M.nlu.normalize(c.t + ' ' + c.k.join(' ')));
        if (skill) list.push([`تمرّن على ${M.practice.topics[skill].name}`, () => renderAny(bot(''), { type: 'question', question: M.practice.generate(skill), topic: skill })]);
        const ls = M.nlu.findLessons(M.nlu.normalize(c.t));
        if (ls[0] && M.curriculumPanel) list.push([`📖 درس: ${ls[0].t}`, () => { M.openPanel('curriculum'); M.curriculumPanel.openLesson(ls[0]); }]);
        chips(body, list);
        break;
      }
      case 'question':
        renderQuestion(body, r);
        break;
      case 'lessons': {
        const title = r.guess ? 'لم أجد مسألة لأحلها، لكن هذه دروس قد تفيدك:' : r.all ? `دروس الصف ${L(r.grade)}:` : 'وجدت هذه الدروس في المنهج:';
        body.insertAdjacentHTML('beforeend', `<p>${title}</p>`);
        const list = h('div', { class: 'lesson-list' });
        r.lessons.forEach((l) => {
          const row = h('button', { class: 'lesson-row' }, h('span', { class: 'lesson-g' }, 'ص' + L(l.g)), h('span', { class: 'lesson-t' }, l.t), h('small', {}, l.unit));
          row.onclick = () => { if (M.curriculumPanel) { M.openPanel('curriculum'); M.curriculumPanel.openLesson(l); } };
          list.appendChild(row);
        });
        body.appendChild(list);
        if (r.lessons[0] && !r.all) chips(body, [[`تمرين في: ${r.lessons[0].t}`, () => renderAny(bot(''), { type: 'question', question: M.practice.lessonQuestion(r.lessons[0]), topic: null, lesson: r.lessons[0] })]]);
        break;
      }
      case 'activities': {
        body.insertAdjacentHTML('beforeend', `<p>أفكار لتدريس <b>${M.esc(r.name)}</b> بطريقة تفاعلية 👩‍🏫:</p>` + r.items.map(([t, d]) => `<div class="card" style="padding:10px 12px;margin:6px 0"><b>${t}</b><div style="margin-top:4px;font-size:14px">${d}</div></div>`).join(''));
        const list = [['أفكار أخرى', () => renderAny(bot(''), { type: 'activities', name: r.name, items: M.nlu.activitiesFor(r.name), lesson: r.lesson })]];
        if (r.lesson) {
          list.push([`📖 افتح درس ${r.lesson.t}`, () => { M.openPanel('curriculum'); M.curriculumPanel.openLesson(r.lesson); }]);
          list.push(['📝 ورقة عمل على السبورة', () => M.makeWorksheet(r.lesson.t, () => M.practice.lessonQuestion(r.lesson), 8)]);
        }
        chips(body, list);
        break;
      }
      case 'plot': {
        // دالة بدلالة س ⇐ على السبورة مباشرة، وإلا في لوحة الجبر
        const onBoard = /^\s*(ص|y)\s*=/.test(r.expr) || !/=/.test(r.expr) ? M.board.addGraph(r.expr, { focus: true }) : null;
        if (onBoard) body.insertAdjacentHTML('beforeend', `<p>📈 رسمتُ <span class="math">${M.esc(M.loc(r.expr))}</span> على المستوى الإحداثي في السبورة.</p>`);
        else {
          let ok = false;
          if (M.algebra && M.algebra.graphText) { M.openPanel('algebra'); ok = M.algebra.graphText(r.expr); }
          body.insertAdjacentHTML('beforeend', ok ? `<p>📈 رسمتُ <span class="math">${M.esc(M.loc(r.expr))}</span> في لوحة الجبر والدوال.</p>` : '<p class="hint">لم أتمكن من رسم هذا التعبير — اكتبه بصيغة مثل ص = ٢س + ١</p>');
        }
        if (r.result) body.appendChild(M.renderResult(r.result, { strategy: 'steps' }));
        chips(body, [['افتحها في لوحة الجبر (منزلقات وجدول قيم)', () => { M.openPanel('algebra'); M.algebra.graphText(r.expr); }]]);
        break;
      }
      case 'plot3d': {
        body.insertAdjacentHTML('beforeend', `<p>🧊 رسمتُ السطح <span class="math">ع = ${M.esc(M.loc(r.expr))}</span> في مختبر المجسمات — اسحب لتدويره.</p>`);
        M.lab.open('graph3d', r.expr);
        chips(body, [['كبّر العرض', () => M.lab.openBig()]]);
        break;
      }
      case 'lab': {
        M.lab.open(r.tab, r.key);
        body.insertAdjacentHTML('beforeend', r.tab === 'nets' ? `<p>🧩 فتحتُ شبكة <b>${r.name}</b> في مختبر المجسمات — اضغط «اطوِ الشبكة» لتراها تتحول إلى مجسم.</p>` : `<p>🧊 فتحتُ <b>${r.name}</b> في مختبر المجسمات — غيّر الأبعاد بالمنزلقات وشاهد المساحة والحجم يتغيران.</p>`);
        const sd = M.solids.SOLIDS[r.key];
        const list = [['كبّر العرض', () => M.lab.openBig()]];
        if (sd.net && r.tab !== 'nets') list.push(['اعرض الشبكة', () => M.lab.open('nets', r.key)]);
        chips(body, list);
        break;
      }
      case 'error':
        body.insertAdjacentHTML('beforeend', `<p>لم أتمكن من فهم التعبير الرياضي: <span class="err">${M.esc(r.error)}</span></p><p style="font-size:13px;color:var(--ui-muted)">جرّب كتابته بصيغة مثل: ٢س + ٣ = ٧ أو س² - ٤ = ٠ ، أو صِف المسألة بالكلمات.</p>`);
        break;
      default:
        renderAny(body, null);
    }
  }

  function send(textArg) {
    const text = (textArg != null ? String(textArg) : input.value).trim();
    if (!text) return;
    if (textArg == null) { input.value = ''; input.style.height = '44px'; }
    user(text);
    const body = bot('');
    let r = null;
    try { r = M.nlu.understand(text); } catch (e) { r = { type: 'error', error: e.message }; }
    renderAny(body, r, text);
    requestAnimationFrame(() => (chat.scrollTop = chat.scrollHeight));
  }

  /* ---------------- قراءة السبورة ---------------- */
  function analyzeBoard() {
    const B = M.board;
    const snap = B.snapshot(900);
    user('اقرأ ما على السبورة وحلّه', snap);
    const d = M.ai.describeBoard();
    const body = bot('');
    if (d.empty) { body.innerHTML = '<p>السبورة فارغة حالياً. اكتب مسألة بالقلم أو بقلم الرياضيات ✍️ أو ارسم شكلاً، ثم اطلب القراءة.</p>'; return; }
    body.insertAdjacentHTML('beforeend', `<p><b>ما أراه على السبورة:</b> ${Object.entries(d.counts).map(([k, v]) => `${k} (${L(v)})`).join('، ')}</p>`);
    if (d.lines.length) body.insertAdjacentHTML('beforeend', `<p><b>قياسات الأشكال:</b></p><ul>${d.lines.map((l) => `<li>${l}</li>`).join('')}</ul>`);
    d.results.forEach(({ src, r }) => body.appendChild(M.renderResult(Object.assign({}, r, { title: 'مسألة مكتوبة: ' + M.esc(src) }))));
    // الكتابة اليدوية
    const hand = M.inkUI && M.inkUI.readBoard();
    if (hand && hand.res.text) {
      const rows = hand.res.rows.length ? hand.res.rows : [hand.res.text];
      body.insertAdjacentHTML('beforeend', `<p>✍️ <b>قرأتُ من خط يدك:</b> ${rows.map((t) => `<span class="math" dir="ltr">${M.esc(t)}</span>`).join(' ، ')} <small style="color:var(--ui-muted)">(${L(hand.res.ms)} مللي ثانية)</small></p>`);
      let solved = 0;
      const multi = rows.length > 1 && rows.every((t) => /=/.test(t)) && /[صy]/.test(rows.join(''));
      const srcs = multi ? [rows.join('\n')] : rows;
      srcs.forEach((t) => {
        try { const r = M.math.solve(t); body.appendChild(M.renderResult(Object.assign({}, r, { title: (r.title || 'الحل') + ' — ' + M.esc(t.replace(/\n/g, ' ، ')) }))); solved++; } catch (e) { /* ليس سطراً رياضياً */ }
      });
      chips(body, [['✏️ صحّح القراءة', () => M.inkUI.openReader()], ['درّب التطبيق على خطي', () => M.inkUI.openTrainer()]]);
      if (!solved) body.insertAdjacentHTML('beforeend', '<p class="hint">لم أجد معادلة قابلة للحل في القراءة — اضغط «صحّح القراءة» لتعديلها.</p>');
    } else if (!d.results.length && !d.lines.length) {
      body.insertAdjacentHTML('beforeend', '<p class="hint">💡 اكتب المسألة بقلم الرياضيات ✍️ لأقرأها فور توقفك عن الكتابة، أو بأداة النص.</p>');
    }
  }

  M.tutor = { analyzeBoard, send: (t) => { M.openPanel('tutor'); send(t); } };
})();
