/* ==========================================================================
   بطاقة السؤال التفاعلية (مشتركة): عرض سؤال، إدخال الإجابة أو الاختيار،
   التحقق، التلميح، الحل، التسجيل في ملف الطالب، والانتقال للتالي
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  /**
   * opts: { next(): q  — يولّد سؤالاً جديداً
   *         key: مفتاح التسجيل (مهارة أو درس)
   *         label(q): عنوان صغير فوق السؤال
   *         auto: الانتقال التلقائي بعد الإجابة الصحيحة
   *         compact: حجم أصغر (للمحادثة)
   *         onAnswer(ok, event) }
   */
  M.questionCard = function (opts) {
    const P = M.practice;
    const card = h('div', { class: 'card q-card' + (opts.compact ? ' compact' : '') });
    const lvl = h('div', { class: 'q-level' });
    const lab = h('div', { class: 'lbl' });
    const text = h('div', { class: 'q-text' });
    const choices = h('div', { class: 'q-choices' });
    const row = h('div', { class: 'row q-input-row' });
    const ans = h('input', { class: 'inp grow math-inp', placeholder: 'إجابتك', autocomplete: 'off', dir: 'auto' });
    const chk = h('button', { class: 'btn primary', html: icon('check') + '<span>تحقّق</span>' });
    row.append(ans, chk);
    const keys = h('div', { class: 'q-keys' });
    ['س', 'ص', '-', '/', '،', '√', 'ط', '^', '(', ')', '<', '>', '≤', '≥', ':'].forEach((k) => {
      const b = h('button', { class: 'chip', tabindex: -1 }, k);
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.onclick = () => { const s = ans.selectionStart || ans.value.length; ans.value = ans.value.slice(0, s) + k + ans.value.slice(ans.selectionEnd || s); ans.selectionStart = ans.selectionEnd = s + k.length; ans.focus(); };
      keys.appendChild(b);
    });
    const fb = h('div', { class: 'q-feedback' });
    const acts = h('div', { class: 'row q-acts' });
    const hintB = h('button', { class: 'btn sm ghost', html: icon('bulb') + '<span>تلميح</span>' });
    const solB = h('button', { class: 'btn sm ghost', html: '<span>الحل</span>' });
    const boardB = h('button', { class: 'btn sm ghost', title: 'اعرض السؤال على السبورة', html: icon('board') + '<span>السبورة</span>' });
    const nextB = h('button', { class: 'btn sm', html: '<span>التالي</span>' + icon('chevL') });
    acts.append(hintB, solB, boardB, nextB);
    card.append(lvl, lab, text, choices, row, keys, fb, acts);

    let q = null, tries = 0, usedHint = false, done = false;
    function show(newQ) {
      q = newQ || opts.next();
      tries = 0; usedHint = false; done = false;
      lvl.innerHTML = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= q.level ? 'on' : ''}"></i>`).join('');
      lab.innerHTML = opts.label ? opts.label(q) : '';
      text.innerHTML = q.text;
      fb.className = 'q-feedback'; fb.innerHTML = '';
      choices.innerHTML = '';
      const isChoice = q.type === 'choice';
      row.style.display = isChoice ? 'none' : '';
      keys.style.display = isChoice ? 'none' : '';
      if (isChoice) {
        q.choices.forEach((c, i) => {
          const b = h('button', { class: 'btn choice' }, String(c));
          b.onclick = () => { if (done) return; ans.value = String(c); check(b); };
          choices.appendChild(b);
        });
      }
      ans.value = '';
      ans.placeholder = q.inputHint || (q.type === 'set' ? 'افصل الحلول بفاصلة: ٢، ٣' : q.type === 'pair' ? 'مثال: (٢، ٣)' : q.type === 'expr' ? 'اكتب التعبير، مثال: ٣س + ٢' : q.type === 'ineq' ? 'مثال: س > ٣' : 'إجابتك');
      if (!opts.noFocus && !isChoice && window.innerWidth > 860) setTimeout(() => ans.focus(), 30);
    }
    function check(choiceBtn) {
      if (!q || done) return;
      const r = P.checkAnswer(q, ans.value);
      if (r.invalid) { fb.className = 'q-feedback bad'; fb.textContent = 'صيغة الإجابة غير واضحة — ' + ans.placeholder; return; }
      tries++;
      if (r.ok) {
        done = true;
        const ev = opts.key ? P.record(opts.key, true, usedHint || tries > 1, q) : null;
        fb.className = 'q-feedback ok';
        fb.innerHTML = M.pick(['ممتاز! 🎉', 'أحسنت! 👏', 'إجابة رائعة! ⭐', 'عمل متقن! 💪', 'صحيح تماماً ✔']) + (ev === 'up' ? '<br>🚀 ارتقيت إلى مستوى أعلى!' : '');
        if (choiceBtn) choiceBtn.classList.add('right');
        if (opts.onAnswer) opts.onAnswer(true, ev);
        if (opts.auto !== false) setTimeout(() => { if (done && card.isConnected) show(); }, ev === 'up' ? 2000 : 1200);
      } else if (tries === 1 && !r.hint) {
        fb.className = 'q-feedback bad';
        fb.innerHTML = `ليست صحيحة، حاول مرة أخرى.<br>💡 ${q.hint}`;
        usedHint = true;
        if (choiceBtn) choiceBtn.classList.add('wrong');
      } else if (r.hint && tries === 1) {
        tries = 0;
        fb.className = 'q-feedback bad'; fb.textContent = r.hint;
      } else {
        done = true;
        const ev = opts.key ? P.record(opts.key, false, false, q) : null;
        fb.className = 'q-feedback bad';
        fb.innerHTML = `الإجابة الصحيحة: <b>${P.answerText(q)}</b><br><span class="q-steps">${M.visual && (q.steps || []).length ? M.visual.flowHTML(q.steps, null, { compact: true }).outerHTML : (q.steps || []).join('<br>')}</span>${ev === 'down' ? '<br><span style="color:var(--ui-muted)">سنتدرّب على مستوى أسهل قليلاً لتثبيت الفهم.</span>' : ''}`;
        if (choiceBtn) choiceBtn.classList.add('wrong');
        M.$$('.choice', choices).forEach((b, i) => i === q.answer && b.classList.add('right'));
        if (opts.onAnswer) opts.onAnswer(false, ev);
      }
    }
    chk.onclick = () => check();
    ans.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done ? show() : check(); } });
    hintB.onclick = () => { if (!q) return; usedHint = true; fb.className = 'q-feedback'; fb.innerHTML = '💡 ' + q.hint; };
    solB.onclick = () => {
      if (!q) return;
      if (!done) { done = true; if (opts.key) P.record(opts.key, false, false, q); }
      fb.className = 'q-feedback';
      fb.innerHTML = `الإجابة: <b>${P.answerText(q)}</b><br><span class="q-steps">${M.visual && (q.steps || []).length ? M.visual.flowHTML(q.steps, null, { compact: true }).outerHTML : (q.steps || []).join('<br>')}</span>`;
    };
    boardB.onclick = () => { if (q) { M.board.addText(M.htmlToPlain(q.text.replace(/<br>/g, '\n')), { size: 34 }); M.toast('عُرض السؤال على السبورة'); } };
    nextB.onclick = () => show();
    show(opts.first);
    return { el: card, show, get q() { return q; } };
  };

  /** ورقة عمل: عدد من الأسئلة على صفحة جديدة + مفتاح الإجابات */
  M.makeWorksheet = function (title, gen, n) {
    n = n || 8;
    const qs = []; const seen = new Set();
    for (let i = 0, guard = 0; qs.length < n && guard < n * 10; guard++) {
      const q = gen();
      const key = M.htmlToPlain(q.text);
      if (seen.has(key)) continue;
      seen.add(key); qs.push(q); i++;
    }
    const lines = [`📝 ورقة عمل: ${title}`, `الاسم: ................................    التاريخ: ..........`, ''];
    qs.forEach((q, i) => lines.push(`${L(i + 1)}) ${M.htmlToPlain(q.text.replace(/<br>/g, ' — '))}`, ''));
    M.board.addPage('lines');
    M.board.addText(lines.join('\n'), { size: 24 });
    const key = qs.map((q, i) => `<li>${M.htmlToPlain(q.text.replace(/<br>/g, ' — ')).slice(0, 80)} ⇐ <b>${M.practice.answerText(q)}</b></li>`).join('');
    M.toast('تم إنشاء ورقة العمل في صفحة جديدة', { time: 7000, action: { label: 'مفتاح الإجابات', fn: () => M.modal({ title: 'مفتاح الإجابات — ' + title, icon: 'check', body: `<ol class="steps">${key}</ol>`, size: 'lg' }) } });
    return qs;
  };
})();
