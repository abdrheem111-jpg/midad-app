/* ==========================================================================
   الترحيب في أول تشغيل (الدور والصف) + البحث السريع (Ctrl+K)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  /* ---------------- البحث السريع ---------------- */
  const ACTIONS = [
    ['صفحة جديدة', 'pageAdd', () => M.board.addPage(), 'اضافه صفحه جديده سبوره'],
    ['قلم الرياضيات (يقرأ خط يدك ويحل)', 'wand', () => M.setTool('mathpen'), 'قلم كتابه يدويه تعرف خط'],
    ['اقرأ السبورة وحلّها', 'camera', () => M.tutor && M.tutor.analyzeBoard(), 'حلل السبوره قراءه'],
    ['وضع المستوى الإحداثي: دوال ومتباينات ومنزلقات', 'function', () => M.modes.open('coord'), 'مستوى احداثي دوال دالة تربيعية خطية اسية لوغاريتمية مثلثية متباينة منزلق'],
    ['الفضاء ثلاثي الأبعاد: مجسمات ورسم شبكات', 'cube', () => M.modes.open('space3d'), 'فضاء ثلاثي الابعاد مجسمات شبكه شبكات رسم'],
    ['الدائرة التفاعلية: المساحة، القطاع، طول القوس، القطعة، النظريات', 'circleLab', () => M.modes.open('circle'), 'دائره دائرة قطاع قوس قطعه محيط مساحه نصف قطر مماس وتر زاويه مركزيه محيطيه رباعي دائري ط باي راديان'],
    ['اختبار قلم السبورة التفاعلية (Promethean)', 'pen', () => M.boardUX.penTest(), 'قلم سبوره تفاعليه بروميثيان اكتف بورد اختبار لمس'],
    ['تثبيت مِداد كتطبيق على الجهاز أو السبورة', 'download', () => M.installApp.guide(), 'تثبيت تطبيق تنزيل برنامج سطح المكتب دون انترنت'],
    ['الفضاء ثلاثي الأبعاد: دوال ومستويات وتقاطعات', 'cube', () => M.modes.open('space3d', { tab: 'graph' }), 'ثلاثي الابعاد دالة سطح مستوى مستويات تقاطع محاور نقطة مستقيم كرة'],
    ['مساعد رسم الشبكات بالمليمتر', 'layers', () => M.modes.open('space3d', { tab: 'net' }), 'شبكة شبكات رسم دقيق مليمتر مساعد مكعب اسطوانه مخروط'],
    ['وضع الكسور', 'percent', () => M.modes.open('fractions'), 'كسور كسر تمثيل نسبه'],
    ['وضع خط الأعداد', 'dash', () => M.modes.open('numberline'), 'خط الاعداد سالبه صحيحه'],
    ['وضع البيانات والإحصاء', 'stats', () => M.modes.open('data'), 'احصاء بيانات متوسط اعمده'],
    ['مختبر المجسمات (ثلاثي الأبعاد)', 'cube', () => M.lab.open('solids'), 'مجسم مجسمات ثلاثي الابعاد مكعب اسطوانه هرم كره مخروط حجم'],
    ['شبكات المجسمات وطيّها', 'layers', () => M.lab.open('nets'), 'شبكه شبكات طي فرد مكعب'],
    ['الأشكال المستوية: المحيط والمساحة', 'geometry', () => M.lab.open('shapes'), 'اشكال مساحه محيط مربع مستطيل مثلث دائره'],
    ['رسم دالة ثلاثية الأبعاد', 'function', () => M.lab.open('graph3d'), 'رسم ثلاثي سطح ع'],
    ['الاختيار العشوائي بالكاميرا', 'face', () => M.cameraPicker.open(), 'كاميرا اختيار عشوائي طالب وجوه'],
    ['عجلة الأسماء', 'shuffle', () => M.classroom.openPicker(), 'عجله اسماء اختيار عشوائي'],
    ['المستوى الإحداثي (ارسم منحنى لتظهر معادلته)', 'function', () => { M.board.page.bg = 'coord'; M.board.resetView(); M.emit('page', { index: M.board.pi, count: M.board.pages.length, bg: 'coord' }); M.setTool('pen'); }, 'مستوى احداثي محاور منحنى معادله رسم بياني'],
    ['درّب التطبيق على خط يدي', 'pen', () => M.inkUI.openTrainer(), 'تدريب خط اليد'],
    ['حفظ الدرس كملف', 'download', () => document.querySelector('[data-act="save-file"]').click(), 'حفظ ملف'],
    ['تصدير الصفحة كصورة', 'image', () => M.board.exportPNG(), 'صوره تصدير png'],
    ['الإعدادات', 'settings', () => document.querySelector('[data-act="settings"]').click(), 'اعدادات خط ارقام'],
    ['مسح محتوى الصفحة', 'eraser', () => M.board.clearPage(), 'مسح تنظيف'],
  ];
  function openSearch() {
    if (document.querySelector('.cmdk')) return;
    const K = M.nlu.normalize;
    const wrap = h('div', { class: 'cmdk' });
    const inp = h('input', { class: 'inp cmdk-input', placeholder: 'ابحث عن درس أو أداة، أو اكتب مسألة ليحلّها المعلم الذكي…', dir: 'auto', autocomplete: 'off' });
    const list = h('div', { class: 'cmdk-list', role: 'listbox' });
    wrap.append(inp, list, h('div', { class: 'hint cmdk-foot' }, '↑ ↓ للتنقل · Enter للفتح · Esc للإغلاق'));
    let items = [], sel = 0;
    const m = M.modal({ title: 'بحث سريع', icon: 'search', body: wrap, size: 'cmdk-modal' });
    const go = (it) => { m.close(); setTimeout(it.run, 30); };
    function render() {
      const q = inp.value.trim(), k = K(q);
      items = [];
      if (q) {
        // مسألة أو سؤال ⇐ المعلم الذكي (أولاً إن كان فيه أرقام أو رموز)
        const ask = { ic: 'sparkles', t: `اسأل المعلم الذكي: «${q}»`, s: 'حل، شرح، تمرين…', run: () => M.tutor.send(q) };
        const mathy = /[\d٠-٩=+×÷^√]/.test(q) || q.split(/\s+/).length > 3;
        if (mathy) items.push(ask);
        M.nlu.findLessons(k).slice(0, 6).forEach((l) => items.push({ ic: 'book', t: l.t, s: `الصف ${L(l.g)} · ${l.unit}`, run: () => { M.openPanel('curriculum'); M.curriculumPanel.openLesson(l); } }));
        M.panels.filter((p) => K(p.title + ' ' + (p.desc || '')).includes(k)).forEach((p) => items.push({ ic: p.icon, t: p.title, s: p.desc || '', run: () => M.openPanel(p.id) }));
        ACTIONS.filter(([t, , , kw]) => K(t + ' ' + kw).includes(k) || k.split(' ').some((w) => w.length > 2 && K(t + ' ' + kw).includes(w))).forEach(([t, ic, run]) => items.push({ ic, t, s: 'أمر', run }));
        const c = M.ai.findConcept(q);
        if (c) items.splice(mathy ? 1 : Math.min(items.length, 2), 0, { ic: 'bulb', t: `شرح: ${c.t}`, s: c.d.slice(0, 70) + '…', run: () => M.tutor.send('ما هو ' + c.t) });
        if (!mathy) items.push(ask);
      } else {
        const g = M.settings.gradeNum || 5;
        M.curriculum.grade(g).units.slice(0, 2).forEach((u) => u.lessons.slice(0, 3).forEach((l) => items.push({ ic: 'book', t: l.t, s: `الصف ${L(l.g)} · ${u.t}`, run: () => { M.openPanel('curriculum'); M.curriculumPanel.openLesson(l); } })));
        M.panels.forEach((p) => items.push({ ic: p.icon, t: p.title, s: p.desc || '', run: () => M.openPanel(p.id) }));
      }
      sel = 0;
      list.innerHTML = '';
      items.slice(0, 14).forEach((it, i) => {
        const b = h('button', { class: 'cmdk-item' + (i === sel ? ' active' : ''), role: 'option', html: `${icon(it.ic)}<span class="t">${M.esc(it.t)}</span><small>${M.esc(it.s)}</small>` });
        b.onclick = () => go(it);
        b.onpointermove = () => { sel = i; mark(); };
        list.appendChild(b);
      });
      if (!items.length) list.innerHTML = '<div class="hint" style="padding:12px">لا نتائج</div>';
    }
    function mark() { M.$$('.cmdk-item', list).forEach((b, i) => b.classList.toggle('active', i === sel)); const a = list.children[sel]; if (a && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' }); }
    inp.addEventListener('input', M.debounce ? M.debounce(render, 60) : render);
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, Math.min(items.length, 14) - 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (inp.value.trim() && M.debounce) render(); if (items[sel]) go(items[sel]); }
      else if (e.key === 'Escape') m.close();
    });
    render();
    setTimeout(() => inp.focus(), 50);
  }
  M.openSearch = openSearch;

  /* ---------------- الترحيب في أول تشغيل ---------------- */
  function welcome() {
    const s = M.settings;
    let role = s.role || 'teacher', grade = +s.gradeNum || 5, nums = s.numerals || 'arabic';
    const wrap = h('div', { class: 'onb' });
    wrap.innerHTML = `
      <div class="onb-hero">
        <div class="onb-logo">${icon('board')}</div>
        <div><h2>مرحباً بك في مِداد</h2><p>السبورة الرياضية الذكية للمنهج العُماني — من الصف الأول إلى الثاني عشر، وتعمل بالكامل دون إنترنت.</p></div>
      </div>
      <div class="onb-feats">
        <div>${icon('wand')}<b>اكتب بخط يدك</b><span>قلم الرياضيات يقرأ ما تكتبه ويحلّه فوراً</span></div>
        <div>${icon('book')}<b>كل دروس المنهج</b><span>شرح وأمثلة وتمارين متكيّفة لكل درس</span></div>
        <div>${icon('sparkles')}<b>سبورة تفهمك</b><span>اكتب أو ارسم فيسألك: حل؟ رسم؟ معادلة؟ مجسم ثلاثي الأبعاد؟</span></div>
      </div>`;
    const sec = (title) => { const d = h('div', { class: 'onb-sec' }); d.appendChild(h('div', { class: 'onb-t' }, title)); wrap.appendChild(d); return d; };
    const choice = (parent, opts, cur, onPick, cls) => {
      const row = h('div', { class: 'onb-row ' + (cls || '') });
      opts.forEach(([v, t]) => {
        const b = h('button', { class: 'onb-opt' + (v === cur ? ' active' : '') }, t);
        b.onclick = () => { M.$$('.onb-opt', row).forEach((x) => x.classList.remove('active')); b.classList.add('active'); onPick(v); };
        row.appendChild(b);
      });
      parent.appendChild(row);
    };
    choice(sec('أنا:'), [['teacher', '👩‍🏫 معلم / معلمة'], ['student', '🧑‍🎓 طالب / طالبة'], ['parent', '👪 ولي أمر']], role, (v) => (role = v));
    choice(sec('الصف الدراسي:'), M.curriculum.grades.map((g) => [g.g, L(g.g)]), grade, (v) => (grade = v), 'grades');
    choice(sec('شكل الأرقام:'), [['arabic', '١٢٣ عربية'], ['western', '123 غربية']], nums, (v) => (nums = v));
    const start = h('button', { class: 'btn primary onb-go', html: '<span>ابدأ</span>' + icon('chevL') });
    wrap.appendChild(start);
    wrap.appendChild(h('div', { class: 'onb-credit' }, 'تصميم وفكرة: أ. عبدالرحيم مبارك الرحبي'));
    const m = M.modal({ title: 'أهلاً وسهلاً', icon: 'star', body: wrap, size: 'onb-modal', onClose: () => { if (!M.settings.role) { M.settings.role = role; M.saveSettings(); } } });
    start.onclick = () => {
      Object.assign(M.settings, { role, gradeNum: grade, numerals: nums, inkDigits: nums === 'western' ? 'western' : 'arabic' });
      M.saveSettings();
      M.emit('page', { index: M.board.pi, count: M.board.pages.length, bg: M.board.page.bg });
      m.close();
      if (window.innerWidth > 860) M.openPanel(role === 'student' ? 'practice' : 'curriculum');
      M.toast(role === 'student' ? 'بالتوفيق! ابدأ من التدريب أو اسأل المعلم الذكي ✨' : 'جاهز! اختر درساً من المنهج أو اكتب بقلم الرياضيات ✍️', { time: 5000 });
    };
  }
  if (!M.settings.role && !/[?&]noonb/.test(location.search)) setTimeout(welcome, 600);
  M.onboarding = { show: welcome };
})();
