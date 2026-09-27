/* ==========================================================================
   لوحة المنهج العُماني: الصفوف ١–١٢، الوحدات والدروس، شرح الدرس، مثال
   محلول، تدريب متكيّف ضمن الدرس، ورقة عمل، وربط بأدوات السبورة
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  M.registerPanel({
    id: 'curriculum', title: 'المنهج العُماني', short: 'المنهج', icon: 'book',
    desc: 'رياضيات الصفوف ١–١٢: شرح، أمثلة محلولة، وتدريب لكل درس',
    build(root) {
      const C = M.curriculum, P = M.practice;
      const top = h('div', { class: 'grade-chips', role: 'tablist' });
      const search = h('input', { class: 'inp', placeholder: '🔎 ابحث عن درس: الكسور، فيثاغورس، التكامل…', type: 'search' });
      const listEl = h('div', { class: 'units' });
      const lessonEl = h('div', { class: 'lesson-view', hidden: true });
      root.append(top, search, listEl, lessonEl);

      const grade = () => M.clamp(+M.settings.gradeNum || 5, 1, 12);
      for (let g = 1; g <= 12; g++) {
        const b = h('button', { class: 'grade-chip', role: 'tab', 'data-g': g, title: C.grade(g).name }, L(g));
        b.onclick = () => { M.settings.gradeNum = g; M.saveSettings(); search.value = ''; renderList(); };
        top.appendChild(b);
      }

      function lessonRow(l) {
        const m = P.lessonMastery(l);
        const st = P.lessonState(l);
        const row = h('button', { class: 'lesson-row' });
        row.innerHTML = `<span class="lr-title">${l.t}</span><span class="lr-meta">${st.total ? `<span class="mini-bar"><i style="width:${m}%"></i></span>${L(m)}٪` : '<span class="lr-new">جديد</span>'}</span>${icon('chevL')}`;
        row.onclick = () => openLesson(l);
        return row;
      }
      function renderList() {
        lessonEl.hidden = true; listEl.hidden = false; search.hidden = false; top.hidden = false;
        M.$$('.grade-chip', top).forEach((b) => b.classList.toggle('active', +b.dataset.g === grade()));
        listEl.innerHTML = '';
        const q = search.value.trim();
        if (q) {
          const res = C.search(q);
          listEl.appendChild(h('div', { class: 'lbl', style: { margin: '8px 2px' } }, res.length ? `نتائج البحث (${L(res.length)})` : 'لا توجد نتائج'));
          res.forEach((l) => {
            const r = lessonRow(l);
            r.querySelector('.lr-title').insertAdjacentHTML('afterbegin', `<small class="lr-grade">ص${L(l.g)}</small> `);
            listEl.appendChild(r);
          });
          return;
        }
        const gr = C.grade(grade());
        const tot = gr.units.reduce((s, u) => s + u.lessons.length, 0);
        const avg = Math.round(gr.units.reduce((s, u) => s + u.lessons.reduce((a, l) => a + P.lessonMastery(l), 0), 0) / tot);
        listEl.appendChild(h('div', { class: 'grade-summary', html: `<b>${gr.name}</b><span>${L(gr.units.length)} وحدات · ${L(tot)} درساً · الإتقان ${L(avg)}٪</span><span class="mini-bar wide"><i style="width:${avg}%"></i></span>` }));
        const openUnits = new Set(M.store.get('openUnits', []));
        const anyOpen = gr.units.some((u) => openUnits.has(u.id));
        gr.units.forEach((u, i) => {
          const det = h('details', { class: 'unit', open: openUnits.has(u.id) || (!anyOpen && i === 0) });
          const sum = h('summary', { html: `<span class="u-num">${L(i + 1)}</span><span>${u.t}</span><small>${L(u.lessons.length)} دروس</small>` });
          det.appendChild(sum);
          u.lessons.forEach((l) => det.appendChild(lessonRow(l)));
          det.addEventListener('toggle', () => { det.open ? openUnits.add(u.id) : openUnits.delete(u.id); M.store.set('openUnits', [...openUnits]); });
          listEl.appendChild(det);
        });
      }
      search.addEventListener('input', M.debounce(renderList, 200));

      function openLesson(l) {
        listEl.hidden = true; search.hidden = true; top.hidden = true; lessonEl.hidden = false;
        lessonEl.innerHTML = '';
        M.store.set('lastLesson', l.id);
        const back = h('button', { class: 'btn sm ghost back-btn', html: icon('chevR') + `<span>${C.grade(l.g).name} · ${l.unit}</span>` });
        back.onclick = renderList;
        const head = h('div', { class: 'lesson-head', html: `<h3>${l.t}</h3>` });
        const expl = h('div', { class: 'card lesson-expl' });
        expl.innerHTML = `<h4>${icon('bulb')} الفكرة الأساسية</h4><p>${l.d}</p>`;
        const concept = M.ai && M.ai.findConcept(l.t + ' ' + l.d);
        if (concept) expl.insertAdjacentHTML('beforeend', `<details class="more"><summary>المزيد عن ${concept.t}</summary>${M.ai.conceptHTML(concept)}</details>`);
        const tools = h('div', { class: 'row lesson-tools' });
        const exB = h('button', { class: 'btn', html: icon('book') + '<span>مثال محلول</span>' });
        const wsB = h('button', { class: 'btn', html: icon('page') + '<span>ورقة عمل</span>' });
        const bdB = h('button', { class: 'btn', html: icon('board') + '<span>اشرح على السبورة</span>' });
        const actB = h('button', { class: 'btn primary', html: icon('sparkles') + '<span>نشاط تفاعلي على السبورة</span>' });
        actB.onclick = () => { M.modes.startLesson(l); if (window.innerWidth < 860) document.querySelector('#drawer').classList.add('collapsed'); };
        tools.append(actB, exB, wsB, bdB);
        if (l.tool) {
          const tb = h('button', { class: 'btn teal', html: icon({ geometry: 'geometry', stats: 'stats', numbers: 'numbers', algebra: 'algebra' }[l.tool]) + '<span>الأداة التفاعلية</span>' });
          tb.onclick = () => M.openPanel(l.tool);
          tools.appendChild(tb);
        }
        const exBox = h('div');
        // خطة التدريس: الاستراتيجية والمواد المحسوسة والنشاط والخطأ الشائع وبطاقة الخروج
        const pd = M.pedagogy && M.pedagogy.forLesson(l);
        const plan = h('details', { class: 'card ped-card' });
        if (pd) {
          plan.innerHTML = `<summary>🧑‍🏫 <b>خطة التدريس والمواد المحسوسة</b></summary>
            <div class="ped-strats">${pd.strats.map((st) => `<div class="ped-strat"><b>${st.icon} ${st.name}</b><span>${st.how}</span></div>`).join('')}</div>
            <div class="ped-sec">🧰 المواد المحسوسة</div><div class="ped-mats">${pd.materials.map((m) => `<span>${m}</span>`).join('')}</div>
            <div class="ped-sec">🪜 خطوات النشاط</div><div class="ped-steps">${pd.steps.map((st, i) => `<div class="ped-step"><i>${L(i + 1)}</i><span>${st}</span></div>`).join('<div class="ped-arrow">⬇</div>')}</div>
            <div class="ped-warn">⚠️ <b>خطأ شائع:</b> ${M.loc(pd.misconception)}</div>
            <div class="ped-exit">🎯 <b>بطاقة الخروج:</b> ${M.loc(pd.exit)}</div>`;
          const mapB = h('button', { class: 'btn sm teal', html: icon('board') + '<span>خريطة الدرس على السبورة</span>' });
          mapB.onclick = () => { let q = null; try { q = P.lessonQuestion(l); } catch (e) { /* */ } M.visual.addLessonMap(l, q, 'center'); };
          plan.appendChild(mapB);
        }
        const practiceHead = h('div', { class: 'lbl', style: { margin: '14px 2px 6px' }, html: `${icon('target')} تدرّب — الأسئلة تتكيّف مع مستواك` });
        const qc = M.questionCard({
          next: () => P.lessonQuestion(l),
          key: l.id,
          label: (q) => `${P.topics[q.topic].name} · المستوى ${L(q.level)}`,
        });
        lessonEl.append(back, head, expl, tools, plan, exBox, practiceHead, qc.el);

        const showExample = () => {
          const st = P.lessonState(l);
          const mid = Math.round((l.lv[0] + l.lv[1]) / 2);
          const skill = M.pick(l.s);
          const q = P.topics[skill].gen(Math.max(st.level, mid));
          exBox.innerHTML = '';
          const res = { title: 'مثال محلول', steps: [q.text].concat(q.steps || []), answer: P.answerText(q) };
          const again = h('button', { class: 'btn sm', html: icon('reset') + '<span>مثال آخر</span>' });
          again.onclick = showExample;
          exBox.appendChild(M.renderResult(res, { strategy: 'steps', extraActions: [again] }));
        };
        exB.onclick = showExample;
        wsB.onclick = () => M.makeWorksheet(l.t, () => P.lessonQuestion(l), 8);
        bdB.onclick = () => {
          const skill = l.s[0];
          const q = P.topics[skill].gen(Math.round((l.lv[0] + l.lv[1]) / 2));
          M.board.addPage('grid');
          if (M.visual) {
            M.visual.addLessonMap(l, q, 'center');
            M.board.addPage('grid');
            M.visual.addFlow({ title: 'مثال محلول: ' + M.htmlToPlain(q.text.replace(/<br>/g, ' ')), steps: q.steps || [], answer: M.practice.answerText(q) });
            M.board.gotoPage(M.board.pi - 1);
            M.toast('أُضيفت خريطة الدرس ثم مثال محلول بالأسهم في الصفحة التالية');
          } else {
            M.board.addText(`📘 ${l.t}\n\n${l.d}\n\nمثال: ${M.htmlToPlain(q.text.replace(/<br>/g, ' '))}\n${(q.steps || []).map((s) => '• ' + M.htmlToPlain(s)).join('\n')}\n∴ ${M.htmlToPlain(M.practice.answerText(q))}`, { size: 26 });
            M.toast('أُضيف شرح الدرس في صفحة جديدة');
          }
        };
        const db = root.closest('.drawer-body'); if (db) db.scrollTop = 0;
      }

      M.on('practice', () => { if (!listEl.hidden) renderList(); });
      let lastG = M.settings.gradeNum;
      M.on('settings', () => { if (M.settings.gradeNum !== lastG) { lastG = M.settings.gradeNum; search.value = ''; if (!listEl.hidden) renderList(); } });
      M.curriculumPanel = { openLesson, renderList };
      renderList();
    },
  });
})();
