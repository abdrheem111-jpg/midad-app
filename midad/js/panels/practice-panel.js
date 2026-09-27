/* ==========================================================================
   لوحة التدريب المتكيّف: حسب الصف والدرس، ملفات طلاب، توصية ذكية،
   مراجعة شاملة، لوحة إتقان، تقرير الصف، بطاقة خروج
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  M.registerPanel({
    id: 'practice', title: 'التدريب المتكيّف', short: 'التدريب', icon: 'target',
    desc: 'أسئلة ترتقي بمستوى كل طالب تلقائياً حسب أدائه',
    build(root) {
      const P = M.practice, C = M.curriculum;
      const grade = () => M.clamp(+M.settings.gradeNum || 5, 1, 12);
      const lessons = () => C.grade(grade()).units.flatMap((u) => u.lessons);

      /* الطالب */
      const stuCard = h('div', { class: 'card' });
      const stuRow = h('div', { class: 'row' });
      const stuSel = h('select', { class: 'sel grow', 'aria-label': 'الطالب' });
      const addStu = h('button', { class: 'btn sm', html: icon('plus') + '<span>طالب</span>' });
      const report = h('button', { class: 'btn sm', html: icon('users') + '<span>تقرير الصف</span>' });
      stuRow.append(stuSel, addStu, report);
      const stats = h('div', { class: 'stat-grid', style: { marginTop: '10px' } });
      stuCard.append(stuRow, stats);

      /* الاختيار */
      const pick = h('div', { class: 'card' });
      pick.innerHTML = `<h4>${icon('book')} ماذا نتدرّب اليوم؟</h4>`;
      const gRow = h('div', { class: 'row' });
      const gSel = h('select', { class: 'sel', style: { width: '130px' }, 'aria-label': 'الصف' });
      for (let g = 1; g <= 12; g++) gSel.appendChild(h('option', { value: g }, C.grade(g).name));
      const lSel = h('select', { class: 'sel grow', 'aria-label': 'الدرس' });
      gRow.append(gSel, lSel);
      const bRow = h('div', { class: 'row', style: { marginTop: '8px' } });
      const recBtn = h('button', { class: 'btn sm teal', html: icon('sparkles') + '<span>توصية ذكية</span>' });
      const mixBtn = h('button', { class: 'btn sm', html: icon('shuffle') + '<span>مراجعة شاملة للصف</span>' });
      bRow.append(recBtn, mixBtn);
      const recText = h('div', { class: 'hint', style: { marginTop: '6px' } });
      pick.append(gRow, bRow, recText);

      const qWrap = h('div');

      /* الإتقان */
      const mCard = h('div', { class: 'card' });
      mCard.innerHTML = `<h4>${icon('stats')} لوحة الإتقان</h4>`;
      const mastery = h('div', { class: 'mastery' });
      mCard.appendChild(mastery);

      /* بطاقة الخروج */
      const exitCard = h('div', { class: 'card' });
      exitCard.innerHTML = `<h4>${icon('page')} بطاقة الخروج</h4><div class="hint">ثلاثة أسئلة سريعة في نهاية الحصة لقياس الفهم — تُعرض على السبورة مع مفتاح الإجابات.</div>`;
      const exitB = h('button', { class: 'btn block', html: icon('board') + '<span>أنشئ بطاقة خروج للدرس المختار</span>' });
      exitCard.appendChild(exitB);

      root.append(stuCard, pick, qWrap, mCard, exitCard);

      let mode = 'lesson';
      const current = () => C.lesson(lSel.value) || lessons()[0];

      function fillLessons() {
        gSel.value = grade();
        lSel.innerHTML = '';
        C.grade(grade()).units.forEach((u) => {
          const og = h('optgroup', { label: u.t });
          u.lessons.forEach((l) => og.appendChild(h('option', { value: l.id }, l.t)));
          lSel.appendChild(og);
        });
      }
      function recommend() {
        const ls = lessons();
        const fresh = ls.find((l) => !P.lessonState(l).total);
        const weak = ls.filter((l) => P.lessonState(l).total && P.lessonMastery(l) < 70).sort((a, b) => P.lessonMastery(a) - P.lessonMastery(b))[0];
        return weak || fresh || ls.slice().sort((a, b) => P.lessonMastery(a) - P.lessonMastery(b))[0];
      }
      function renderStudents() {
        stuSel.innerHTML = '';
        const names = P.students();
        if (!names.includes(P.db.current)) names.unshift(P.db.current);
        names.forEach((n) => stuSel.appendChild(h('option', { value: n, selected: n === P.db.current }, n)));
        const s = P.student();
        const acc = s.history.length ? Math.round((s.history.filter((x) => x.ok).length / s.history.length) * 100) : 0;
        const ls = lessons();
        const done = ls.filter((l) => P.lessonMastery(l) >= 70).length;
        stats.innerHTML = [['نقاط الخبرة', L(s.xp)], ['سلسلة الصحيح', L(s.streak) + ' 🔥'], ['أفضل سلسلة', L(s.bestStreak)], ['الأسئلة', L(s.history.length)], ['الدقة', L(acc) + '٪'], ['دروس متقنة', `${L(done)}/${L(ls.length)}`]]
          .map(([k, v]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
      }
      function renderMastery() {
        mastery.innerHTML = '';
        lessons().forEach((l) => {
          const m = P.lessonMastery(l), st = P.lessonState(l);
          const row = h('button', { class: 'mastery-row', title: `المستوى ${st.level} — صحيح ${st.correct} من ${st.total}` });
          row.innerHTML = `<span>${l.t}</span><div class="bar"><i style="width:${m}%"></i></div><span style="text-align:left;font-weight:700">${st.total ? L(m) + '٪' : '—'}</span>`;
          row.onclick = () => { mode = 'lesson'; lSel.value = l.id; newCard(); };
          mastery.appendChild(row);
        });
        const r = recommend();
        recText.innerHTML = `🎯 التوصية لـ <b>${M.esc(P.db.current)}</b>: <b>${r.t}</b>`;
      }
      let qc = null;
      function newCard() {
        qWrap.innerHTML = '';
        qc = M.questionCard({
          next: () => {
            const l = mode === 'mix' ? M.pick(lessons()) : current();
            const q = P.lessonQuestion(l);
            q.lessonTitle = l.t;
            return q;
          },
          key: null,
          label: (q) => `${q.lessonTitle} · المستوى ${L(q.level)}`,
          onAnswer: (ok) => { P.record(qc.q.lesson, ok); },
        });
        qWrap.appendChild(qc.el);
      }

      gSel.onchange = () => { M.settings.gradeNum = +gSel.value; M.saveSettings(); fillLessons(); lSel.value = recommend().id; newCard(); renderStudents(); renderMastery(); };
      lSel.onchange = () => { mode = 'lesson'; newCard(); };
      recBtn.onclick = () => { mode = 'lesson'; lSel.value = recommend().id; newCard(); M.toast('اخترنا الدرس الأنسب لمستواك'); };
      mixBtn.onclick = () => { mode = 'mix'; newCard(); M.toast('مراجعة شاملة: أسئلة من كل دروس الصف'); };
      stuSel.onchange = () => P.setStudent(stuSel.value);
      addStu.onclick = async () => { const n = await M.prompt('إضافة طالب', 'اسم الطالب'); if (n && n.trim()) { P.setStudent(n.trim()); M.toast('مرحباً ' + n.trim()); } };
      report.onclick = openReport;
      exitB.onclick = () => {
        const l = current();
        const qs = [1, 2, 3].map(() => P.lessonQuestion(l));
        M.board.addPage('plain');
        M.board.addText([`📝 بطاقة الخروج — ${l.t}`].concat(qs.map((x, i) => `${L(i + 1)}) ${M.htmlToPlain(x.text.replace(/<br>/g, ' '))}`)).join('\n\n'), { size: 30 });
        const keyTxt = qs.map((x, i) => `${L(i + 1)}) ${P.answerText(x)}`).join(' ، ');
        M.toast('تم إنشاء بطاقة الخروج في صفحة جديدة', { time: 7000, action: { label: 'الإجابات', fn: () => M.modal({ title: 'مفتاح الإجابات', icon: 'check', body: `<p style="font-size:18px;line-height:2">${keyTxt}</p>`, size: 'sm' }) } });
      };

      function openReport() {
        const names = P.students();
        if (!names.length) return M.toast('لا توجد بيانات طلاب بعد');
        const ls = lessons();
        let html = `<p class="hint">${C.grade(grade()).name} — نسبة الإتقان لكل درس</p><div style="overflow-x:auto"><table class="tbl"><tr><th>الطالب</th>` + ls.map((l) => `<th style="font-size:11px;min-width:70px">${l.t}</th>`).join('') + '<th>نقاط</th></tr>';
        names.forEach((n) => {
          html += `<tr><td style="font-weight:700;white-space:nowrap">${M.esc(n)}</td>` + ls.map((l) => {
            const st = P.lessonState(l, n), m = P.lessonMastery(l, n);
            const c = !st.total ? 'transparent' : m >= 70 ? 'color-mix(in srgb, var(--ok) 30%, transparent)' : m >= 40 ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'color-mix(in srgb, var(--danger) 30%, transparent)';
            return `<td style="background:${c}">${st.total ? L(m) + '٪' : '—'}</td>`;
          }).join('') + `<td>${L(P.student(n).xp)}</td></tr>`;
        });
        html += '</table></div><p class="hint" style="margin-top:10px">🟩 متقن (٧٠٪ فأكثر) · 🟨 في تقدّم · 🟥 يحتاج دعماً</p>';
        const wrap = h('div', { html });
        const tips = h('div', { class: 'card', style: { marginTop: '10px' } });
        const weak = ls.map((l) => ({ l, avg: names.reduce((s, n) => s + P.lessonMastery(l, n), 0) / names.length, tried: names.some((n) => P.lessonState(l, n).total) })).filter((x) => x.tried).sort((a, b) => a.avg - b.avg).slice(0, 3);
        tips.innerHTML = `<h4>${icon('bulb')} توصيات للمعلم</h4>` + (weak.length ? `<ul>${weak.map((x) => `<li>درس <b>${x.l.t}</b>: متوسط الإتقان ${L(Math.round(x.avg))}٪ — ${x.avg < 40 ? 'يحتاج إعادة شرح بمثال محسوس ونشاط تعاوني' : 'يحتاج مزيداً من التدريب الموجّه'}</li>`).join('')}</ul>` : '<p>لا توجد بيانات كافية بعد.</p>');
        wrap.appendChild(tips);
        const del = h('button', { class: 'btn sm', html: icon('trash') + `<span>حذف بيانات ${M.esc(P.db.current)}</span>` });
        del.onclick = async () => { m.close(); if (await M.confirm('حذف بيانات الطالب ' + P.db.current + '؟', 'احذف')) P.removeStudent(P.db.current); };
        wrap.appendChild(h('div', { class: 'row', style: { marginTop: '8px' } }, del));
        const m = M.modal({ title: 'تقرير الصف', icon: 'users', body: wrap, size: 'xl' });
      }

      M.on('practice', () => { renderStudents(); renderMastery(); });
      M.on('settings', () => { if (+gSel.value !== grade()) { fillLessons(); renderStudents(); renderMastery(); } });
      fillLessons();
      lSel.value = recommend().id;
      renderStudents();
      renderMastery();
      newCard();
    },
  });
})();
