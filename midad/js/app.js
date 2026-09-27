/* ==========================================================================
   التطبيق: ربط الواجهة — شريط الأدوات، الخصائص، الرموز، اللوحات، الإعدادات
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { $, $$, h, icon } = M;

  /* ---------------- السمة ---------------- */
  function applyTheme() {
    document.body.dataset.theme = M.settings.theme;
    document.body.dataset.font = M.settings.font || 'tajawal';
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = M.settings.theme === 'white' ? '#ffffff' : '#111a22';
  }
  applyTheme();

  /* ---------------- السبورة ---------------- */
  const board = (M.board = new M.Board($('#board'), $('#boardWrap')));

  /* ---------------- شريط الأدوات ---------------- */
  const TOOLS = [
    [
      { id: 'select', icon: 'select', name: 'تحديد وتحريك', key: 'V' },
      { id: 'pan', icon: 'pan', name: 'تحريك السبورة (أو اضغط المسافة)', key: 'H' },
    ],
    [
      { id: 'pen', icon: 'pen', name: 'قلم', key: 'P' },
      { id: 'mathpen', icon: 'wand', name: 'قلم الرياضيات: اكتب بيدك ويقرؤه التطبيق ويحلّه', key: 'W' },
      { id: 'highlighter', icon: 'highlighter', name: 'قلم تظليل', key: 'M' },
      { id: 'eraser', icon: 'eraser', name: 'ممحاة', key: 'E' },
      { id: 'laser', icon: 'laser', name: 'مؤشر ليزر', key: 'L' },
      { id: 'text', icon: 'text', name: 'نص', key: 'T' },
    ],
    [
      { id: 'line', icon: 'line', name: 'قطعة مستقيمة (Shift للزوايا)', key: '1' },
      { id: 'arrow', icon: 'arrow', name: 'سهم / متجه', key: '2' },
      { id: 'rect', icon: 'rect', name: 'مستطيل (Shift لمربع)', key: '3' },
      { id: 'ellipse', icon: 'ellipse', name: 'دائرة / قطع ناقص', key: '4' },
      { id: 'triangle', icon: 'triangle', name: 'مثلث', key: '5' },
      { id: 'rtri', icon: 'rtri', name: 'مثلث قائم', key: '6' },
      { id: 'polygon', icon: 'polygon', name: 'مضلع منتظم', key: '7' },
    ],
    [
      { id: 'compass', icon: 'compass', name: 'فرجار (دائرة بمركز ونصف قطر)', key: '8' },
      { id: 'measure', icon: 'measure', name: 'قياس الطول', key: '9' },
      { id: 'angle', icon: 'angle', name: 'قياس الزاوية (٣ نقرات)', key: '0' },
      { id: 'circlelab', icon: 'circleLab', name: 'الدائرة التفاعلية: قطاع، قوس، زوايا، نظريات', act: () => M.modes.open('circle') },
    ],
    [
      { id: 'ruler', icon: 'ruler', name: 'مسطرة عائمة', toggle: true, act: () => M.tools.toggleRuler() },
      { id: 'protractor', icon: 'protractor', name: 'منقلة عائمة', toggle: true, act: () => M.tools.toggleProtractor() },
      { id: 'image', icon: 'image', name: 'إدراج صورة', act: () => $('#imageInput').click() },
    ],
  ];
  const toolbar = $('#toolbar');
  TOOLS.forEach((group) => {
    const g = h('div', { class: 'tool-group' });
    group.forEach((t) => {
      const b = h('button', { class: 'tool', 'data-tool': t.id, title: t.name + (t.key ? ` (${t.key})` : ''), 'aria-label': t.name });
      b.innerHTML = icon(t.icon) + (t.key && t.key.length === 1 && /[A-Z]/.test(t.key) ? `<span class="kbd">${t.key}</span>` : '');
      b.onclick = () => (t.act ? t.act() : setTool(t.id));
      g.appendChild(b);
    });
    toolbar.appendChild(g);
  });
  function setTool(id) {
    board.setTool(id);
    $$('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === id));
    $('#sidesCtl').classList.toggle('show', id === 'polygon');
    if (id === 'angle') M.toast('انقر ثلاث نقرات: نقطة على الضلع الأول، ثم الرأس، ثم نقطة على الضلع الثاني');
    if (id === 'mathpen') M.toast('✍️ اكتب مسألة بيدك وتوقّف لحظة — سأقرؤها وأعرض عليك حلّها');
  }
  M.setTool = setTool;
  M.on('tool', (id) => setTool(id));
  M.on('overlay-tools', () => {
    $('.tool[data-tool=ruler]').classList.toggle('on', M.tools.isOpen('ruler'));
    $('.tool[data-tool=protractor]').classList.toggle('on', M.tools.isOpen('protractor'));
  });

  /* ---------------- شريط الخصائص ---------------- */
  function buildSwatches() {
    const sw = $('#swatches');
    sw.innerHTML = '';
    board.palette().forEach((c, i) => {
      const tok = 'c' + i;
      const b = h('button', { class: 'swatch' + (board.color === tok ? ' active' : ''), style: { background: c }, title: 'لون', 'aria-label': 'لون ' + (i + 1) });
      b.onclick = () => {
        board.color = tok;
        buildSwatches();
  M.on('color', () => buildSwatches());
        if (board.selected.size) board.recolorSelected(tok);
      };
      sw.appendChild(b);
    });
  }
  buildSwatches();
  const wr = $('#widthRange');
  const updWidth = () => { board.width = +wr.value; $('#widthDot').style.setProperty('--w', Math.max(3, Math.min(22, board.width)) + 'px'); };
  wr.addEventListener('input', updWidth);
  updWidth();
  const toggleChip = (el, ic, label, get, set) => {
    el.innerHTML = icon(ic) + (label ? `<span>${label}</span>` : '');
    const sync = () => el.classList.toggle('on', !!get());
    el.onclick = () => { set(!get()); sync(); };
    sync();
    return sync;
  };
  toggleChip($('#fillBtn'), 'fill', '', () => board.fill, (v) => (board.fill = v));
  toggleChip($('#dashBtn'), 'dash', '', () => board.dash, (v) => (board.dash = v));
  toggleChip($('#snapBtn'), 'grid', '', () => board.snap, (v) => { board.snap = v; M.toast(v ? 'الالتصاق بالشبكة: مفعّل' : 'الالتصاق بالشبكة: متوقف'); });
  toggleChip($('#inkBtn'), 'wand', 'ذكي', () => M.settings.smartInk, (v) => { M.settings.smartInk = v; M.saveSettings(); M.toast(v ? 'التعرّف الذكي على الأشكال: مفعّل ✨' : 'التعرّف الذكي: متوقف'); });
  $('#sidesInp').addEventListener('input', (e) => (board.sides = M.clamp(+e.target.value || 6, 3, 12)));
  $('#symBtn').innerHTML = icon('keyboard') + '<span>رموز</span>';
  $('#symBtn').onclick = () => $('#symbols').classList.toggle('show');

  /* ---------------- لوحة الرموز العربية ---------------- */
  const SYMBOLS = {
    'الأرقام': '٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ ٫ ٪ ، ؛ ( ) [ ] { }'.split(' '),
    'العمليات': '+ − × ÷ = ≠ ≈ < > ≤ ≥ ± √ ∛ ² ³ ⁿ ∞ ! |'.split(' '),
    'المتغيرات': 'س ص ع ل م ن ك أ ب جـ د هـ ط θ α β Δ ∑ ∫ ∂'.split(' '),
    'الهندسة': '° ∠ △ □ ○ ⊥ ∥ ≅ ~ ↔ → ⟂ π ⌒ ∴ ∵'.split(' '),
    'الدوال': ['جا', 'جتا', 'ظا', 'قا', 'قتا', 'ظتا', 'لو', 'لوهـ', 'د(س)', 'ق(س)', 'ص =', 'نق', 'مح', 'م'],
    'المجموعات': '∈ ∉ ⊂ ⊃ ⊆ ∪ ∩ ∅ ط ص ح ن ∀ ∃ ⇐ ⇔ ¬'.split(' '),
  };
  (function buildSymbols() {
    const root = $('#symbols');
    const tabs = h('div', { class: 'sym-tabs' });
    const grid = h('div', { class: 'sym-grid' });
    const hint = h('div', { class: 'sym-hint' }, 'اختر أداة النص ثم انقر على السبورة، واستخدم الرموز لإدراجها. أو انقر رمزاً لوضعه وسط السبورة.');
    const show = (k) => {
      $$('button', tabs).forEach((b) => b.classList.toggle('active', b.textContent === k));
      grid.innerHTML = '';
      SYMBOLS[k].forEach((s) => {
        const b = h('button', { title: s }, s);
        b.addEventListener('pointerdown', (e) => e.preventDefault()); // لا تفقد تركيز محرر النص
        b.onclick = () => {
          if (board.insertAtCursor(s)) return;
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && active !== document.body) {
            const st = active.selectionStart || 0;
            active.value = active.value.slice(0, st) + s + active.value.slice(active.selectionEnd || st);
            active.selectionStart = active.selectionEnd = st + s.length;
            active.dispatchEvent(new Event('input', { bubbles: true }));
            return;
          }
          board.addText(s, { size: 40 });
        };
        grid.appendChild(b);
      });
    };
    Object.keys(SYMBOLS).forEach((k) => { const b = h('button', {}, k); b.onclick = () => show(k); tabs.appendChild(b); });
    root.append(tabs, grid, hint);
    show('العمليات');
  })();

  /* ---------------- شريط التحديد ---------------- */
  const selBar = $('#selBar');
  const selIcons = { read: 'sparkles', dup: 'copy', front: 'layers', color: 'fill', del: 'trash' };
  $$('button', selBar).forEach((b) => (b.innerHTML = icon(selIcons[b.dataset.sel])));
  selBar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    ({ read: () => M.inkUI.openReader(board.selectedObjs()), dup: () => board.duplicateSelected(), front: () => board.reorderSelected(true), color: () => board.recolorSelected(board.color), del: () => board.deleteSelected() })[b.dataset.sel]();
  });
  M.on('selection', ({ count, bbox }) => {
    if (!count || !bbox) { selBar.classList.remove('show'); return; }
    const [sx, sy] = board.toScreen((bbox[0] + bbox[2]) / 2, bbox[1]);
    selBar.style.right = board.w - sx + 'px';
    selBar.style.top = Math.max(50, sy) + 'px';
    selBar.classList.add('show');
  });

  /* ---------------- الأزرار العامة ---------------- */
  const ACT_ICONS = {
    undo: 'undo', redo: 'redo', 'prev-page': 'chevR', 'next-page': 'chevL', 'add-page': 'pageAdd',
    'file-menu': 'save', theme: 'moon', fullscreen: 'fullscreen', settings: 'settings', about: 'info', drawer: 'menu', search: 'search',
    'zoom-in': 'zoomIn', 'zoom-out': 'zoomOut', 'zoom-fit': 'fullscreen',
  };
  $$('[data-act]').forEach((b) => { if (ACT_ICONS[b.dataset.act] && !b.innerHTML.trim()) b.innerHTML = icon(ACT_ICONS[b.dataset.act]); });
  const MENU_ITEMS = {
    'save-file': ['download', 'حفظ الدرس كملف'],
    'open-file': ['upload', 'فتح درس محفوظ'],
    'export-png': ['image', 'تصدير الصفحة كصورة'],
    print: ['print', 'طباعة / PDF لكل الصفحات'],
    'dup-page': ['copy', 'تكرار الصفحة'],
    'del-page': ['trash', 'حذف الصفحة'],
    'clear-page': ['eraser', 'مسح محتوى الصفحة'],
  };
  Object.entries(MENU_ITEMS).forEach(([k, [ic, t]]) => { const b = $(`[data-act="${k}"]`); if (b) b.innerHTML = icon(ic) + `<span>${t}</span>`; });
  $('.ai-quick').innerHTML = icon('camera') + '<span>حلّل السبورة</span>';

  const actions = {
    undo: () => board.undo(),
    redo: () => board.redo(),
    'prev-page': () => board.gotoPage(board.pi - 1),
    'next-page': () => { if (board.pi === board.pages.length - 1) board.addPage(); else board.gotoPage(board.pi + 1); },
    'add-page': () => board.addPage(),
    'dup-page': () => board.duplicatePage(),
    'del-page': () => board.deletePage(),
    'clear-page': () => board.clearPage(),
    'file-menu': (e) => { e.stopPropagation(); $('#fileMenu').classList.toggle('open'); },
    'save-file': saveFile,
    'open-file': () => $('#fileInput').click(),
    'export-png': () => board.exportPNG(),
    print: printAll,
    theme: () => {
      const order = ['chalk', 'night', 'white'];
      M.settings.theme = order[(order.indexOf(M.settings.theme) + 1) % 3];
      M.saveSettings(); applyTheme(); buildSwatches(); board.requestRender();
      M.toast({ chalk: 'سبورة طباشير خضراء', night: 'سبورة ليلية', white: 'سبورة بيضاء' }[M.settings.theme]);
    },
    fullscreen: () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); else document.exitFullscreen(); },
    settings: openSettings,
    search: () => M.openSearch && M.openSearch(),
    about: openAbout,
    drawer: () => $('#drawer').classList.toggle('collapsed'),
    'zoom-in': () => board.zoomBy(1.2),
    'zoom-out': () => board.zoomBy(1 / 1.2),
    'zoom-reset': () => board.resetView(),
    'zoom-fit': () => board.fitContent(),
    'ai-board': () => { openPanel('tutor'); setTimeout(() => M.tutor && M.tutor.analyzeBoard(), 50); },
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b && actions[b.dataset.act]) { actions[b.dataset.act](e); if (b.closest('.menu')) $('#fileMenu').classList.remove('open'); return; }
    if (!e.target.closest('.dropdown')) $('#fileMenu').classList.remove('open');
  });

  M.on('page', ({ index, count, bg }) => {
    $('#pageLabel').textContent = `${M.loc(index + 1)} / ${M.loc(count)}`;
    $$('#bgPicker button').forEach((b) => b.classList.toggle('active', b.dataset.bg === bg));
  });
  M.on('zoom', (s) => ($('#zoomLabel').textContent = M.loc(Math.round(s * 100)) + '٪'));

  /* ---------------- الخلفيات ---------------- */
  const BGS = [['plain', 'فارغة', 'rect'], ['grid', 'مربعات', 'grid'], ['coord', 'مستوى إحداثي', 'function'], ['dots', 'نقاط', 'dice'], ['lines', 'مسطّرة', 'menu'], ['iso', 'متساوية القياس', 'triangle'], ['polar', 'قطبية', 'target'], ['space3d', 'فضاء ثلاثي الأبعاد', 'cube']];
  BGS.forEach(([id, name, ic]) => {
    const b = h('button', { 'data-bg': id, title: name, html: icon(ic) + `<span>${name}</span>` });
    b.onclick = () => board.setBackground(id);
    $('#bgPicker').appendChild(b);
  });
  M.emit('page', { index: board.pi, count: board.pages.length, bg: board.page.bg });
  M.emit('zoom', board.view.s);

  /* ---------------- الملفات ---------------- */
  function saveFile() {
    const data = JSON.stringify(board.toJSON());
    M.saveFile(`درس-مداد-${new Date().toISOString().slice(0, 10)}.midad.json`, data, 'application/json').then((ok) => ok && M.toast('تم حفظ الدرس'));
  }
  $('#fileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { board.fromJSON(JSON.parse(r.result)); M.toast('تم فتح الدرس'); }
      catch (err) { M.toast('الملف غير صالح', { type: 'warn' }); }
    };
    r.readAsText(f);
    e.target.value = '';
  });
  function loadImageFile(f) {
    if (!f || !f.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        // تصغير الصور الكبيرة لتوفير المساحة
        const k = Math.min(1, 1600 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = img.width * k; cv.height = img.height * k;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        board.addImage(cv.toDataURL('image/jpeg', 0.88), cv.width, cv.height);
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  }
  $('#imageInput').addEventListener('change', (e) => { loadImageFile(e.target.files[0]); e.target.value = ''; });
  $('#boardWrap').addEventListener('dragover', (e) => e.preventDefault());
  $('#boardWrap').addEventListener('drop', (e) => { e.preventDefault(); loadImageFile(e.dataTransfer.files[0]); });
  window.addEventListener('paste', (e) => {
    if (M.isTyping()) return;
    const item = [...(e.clipboardData || {}).items || []].find((i) => i.type.startsWith('image/'));
    if (item) loadImageFile(item.getAsFile());
    else {
      const t = e.clipboardData.getData('text');
      if (t) board.addText(t, { size: 28 });
    }
  });
  function printAll() {
    const area = h('div', { id: 'printArea' });
    board.pages.forEach((p) => area.appendChild(h('img', { src: board.renderPageToCanvas(p, 1.5).toDataURL('image/png') })));
    document.body.appendChild(area);
    setTimeout(() => { window.print(); area.remove(); }, 300);
  }

  /* ---------------- اختصارات لوحة المفاتيح ---------------- */
  const KEYMAP = {};
  TOOLS.flat().forEach((t) => { if (t.key && !t.act) KEYMAP[t.key.toLowerCase()] = t.id; });
  // مفاتيح لوحة المفاتيح العربية المقابلة
  const AR_KEYS = { 'ر': 'v', 'ا': 'h', 'ح': 'p', 'ة': 'm', 'ث': 'e', 'م': 'l', 'ف': 't', 'ص': 'w' };
  window.addEventListener('keydown', (e) => {
    if (M.isTyping()) return;
    const k = (AR_KEYS[e.key] || e.key).toLowerCase();
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (k === 'z' || e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? board.redo() : board.undo(); }
      else if (k === 'y' || e.code === 'KeyY') { e.preventDefault(); board.redo(); }
      else if (e.code === 'KeyS') { e.preventDefault(); saveFile(); }
      else if (e.code === 'KeyK') { e.preventDefault(); M.openSearch && M.openSearch(); }
      else if (e.code === 'KeyA') { e.preventDefault(); board.selectAll(); }
      else if (e.code === 'KeyD') { e.preventDefault(); board.duplicateSelected(); }
      else if (e.key === '=' || e.key === '+') { e.preventDefault(); board.zoomBy(1.2); }
      else if (e.key === '-') { e.preventDefault(); board.zoomBy(1 / 1.2); }
      else if (e.key === '0') { e.preventDefault(); board.resetView(); }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { board.deleteSelected(); return; }
    if (e.key === 'Escape') { board.selected.clear(); board.emitSelection(); $('#symbols').classList.remove('show'); return; }
    if (e.key === 'PageDown' || e.key === 'ArrowLeft' && e.altKey) { actions['next-page'](); return; }
    if (e.key === 'PageUp' || e.key === 'ArrowRight' && e.altKey) { actions['prev-page'](); return; }
    if (e.key === 'F11') return;
    if (e.key === '/' || e.key === '؟') { e.preventDefault(); M.openSearch && M.openSearch(); return; }
    if (KEYMAP[k]) setTool(KEYMAP[k]);
  });

  /* ---------------- اللوحات الجانبية ---------------- */
  const drawer = $('#drawer'), tabs = $('#drawerTabs'), body = $('#drawerBody');
  const built = {};
  let current = null;
  M.panels.forEach((p) => {
    const b = h('button', { class: 'drawer-tab', 'data-panel': p.id, role: 'tab', title: p.title, html: icon(p.icon) + `<span>${p.short || p.title}</span>` });
    b.onclick = () => (current === p.id && !drawer.classList.contains('collapsed') ? drawer.classList.add('collapsed') : openPanel(p.id));
    tabs.appendChild(b);
  });
  function openPanel(id) {
    const p = M.panels.find((x) => x.id === id);
    if (!p) return;
    drawer.classList.remove('collapsed');
    current = id;
    $$('.drawer-tab').forEach((b) => b.classList.toggle('active', b.dataset.panel === id));
    Object.values(built).forEach((el) => (el.style.display = 'none'));
    if (!built[id]) {
      const el = h('div', { class: 'panel', 'data-panel': id });
      const head = h('div', { class: 'panel-head', html: `${icon(p.icon)}<div><h2>${p.title}</h2>${p.desc ? `<p>${p.desc}</p>` : ''}</div>` });
      el.appendChild(head);
      const content = h('div');
      el.appendChild(content);
      body.appendChild(el);
      built[id] = el;
      try { p.build(content); } catch (err) { console.error(err); content.innerHTML = `<div class="err">تعذّر تحميل اللوحة: ${M.esc(err.message)}</div>`; }
    }
    built[id].style.display = '';
    if (p.onShow) p.onShow();
    M.store.set('panel', id);
  }
  M.openPanel = openPanel;
  if (window.innerWidth > 860) openPanel(M.store.get('panel', 'curriculum'));
  else { drawer.classList.add('collapsed'); }

  /* ---------------- الإعدادات ---------------- */
  function openSettings() {
    const s = M.settings;
    const wrap = h('div');
    const row = (title, sub, ctl) => { const r = h('div', { class: 'set-row' }); r.innerHTML = `<div class="t"><b>${title}</b><span>${sub}</span></div>`; r.appendChild(ctl); wrap.appendChild(r); };
    const select = (key, opts, onChange) => {
      const el = h('select', { class: 'sel' });
      opts.forEach(([v, t]) => el.appendChild(h('option', { value: v, selected: s[key] === v }, t)));
      el.onchange = () => { s[key] = el.value; M.saveSettings(); onChange && onChange(); };
      return el;
    };
    row('شكل الأرقام', 'الأرقام العربية المشرقية أو الأرقام الغربية', select('numerals', [['arabic', '٠ ١ ٢ ٣ (عربية)'], ['western', '0 1 2 3 (غربية)']], () => { M.emit('page', { index: board.pi, count: board.pages.length, bg: board.page.bg }); M.emit('zoom', board.view.s); }));
    row('رموز المتغيرات', 'الترميز العربي (س، ص، جا) أو اللاتيني (x, y, sin)', select('vars', [['arabic', 'س ، ص ، جا'], ['latin', 'x , y , sin']]));
    row('وحدة الزوايا', 'للآلة الحاسبة وحل المعادلات المثلثية', select('angle', [['deg', 'الدرجات °'], ['rad', 'الراديان']]));
    row('لون السبورة', 'اختر الخلفية المريحة لصفك', select('theme', [['chalk', 'سبورة طباشير خضراء'], ['night', 'سبورة ليلية زرقاء'], ['white', 'سبورة بيضاء']], () => { applyTheme(); buildSwatches(); board.requestRender(); }));
    const gsel = h('select', { class: 'sel' });
    M.curriculum.grades.forEach((g) => gsel.appendChild(h('option', { value: g.g, selected: +s.gradeNum === g.g }, g.name)));
    gsel.onchange = () => { s.gradeNum = +gsel.value; M.saveSettings(); };
    row('الصف الدراسي', 'يفتح المنهج على دروس هذا الصف ويقترح المعلم الذكي تمارينه', gsel);
    const unit = h('input', { class: 'inp', type: 'number', min: 20, max: 100, value: s.unit });
    unit.onchange = () => { s.unit = M.clamp(+unit.value || 40, 20, 100); M.saveSettings(); board.requestRender(); };
    row('طول الوحدة', 'عدد البكسلات لكل وحدة قياس على السبورة', unit);
    row('أرقام الكتابة اليدوية', 'الأرقام التي تكتبها بيدك على السبورة (تساعد القراءة على الدقة)', select('inkDigits', [['arabic', 'عربية ١٢٣ (يمين ⇐ يسار)'], ['western', 'غربية 123 (يسار ⇐ يمين)'], ['auto', 'تلقائي']]));
    const asSel = h('select', { class: 'sel' });
    [['on', 'مفعّل — يقترح عليّ ما يناسب'], ['off', 'متوقف']].forEach(([v, t]) => asSel.appendChild(h('option', { value: v, selected: (s.assist === false ? 'off' : 'on') === v }, t)));
    asSel.onchange = () => { s.assist = asSel.value === 'on'; M.saveSettings(); if (!s.assist && M.assist) M.assist.hide(); };
    row('المساعد الذكي', 'عند الكتابة أو الرسم أو التحديد يسألك: تريد حلاً؟ رسماً؟ معادلة المنحنى؟ طيّ الشبكة؟', asSel);
    const shapeReset = h('button', { class: 'btn sm ghost', html: icon('reset') + '<span>انسَ ما تعلّمته من أشكالي</span>' });
    shapeReset.onclick = () => { M.store.set('shapeUser', []); M.toast('تم مسح أمثلة الأشكال التي تعلّمها التطبيق'); };
    row('الأشكال التي علّمتها للتطبيق', `عدد الأمثلة المحفوظة: ${M.loc(M.store.get('shapeUser', []).length)}`, shapeReset);
    const trainB = h('button', { class: 'btn sm', html: icon('pen') + '<span>درّب التطبيق على خطي</span>' });
    trainB.onclick = () => M.inkUI.openTrainer();
    row('خط يدك', 'علّم التطبيق طريقة كتابتك للأرقام والرموز ليقرأها بدقة أعلى', trainB);
    row('خط الكتابة', 'خط الواجهة والنصوص على السبورة (كلها مضمّنة وتعمل دون إنترنت)', select('font', [['tajawal', 'تجوّل Tajawal'], ['cairo', 'القاهرة Cairo'], ['almarai', 'المراعي Almarai'], ['naskh', 'نسخ Noto Naskh'], ['kufi', 'كوفي Reem Kufi']], () => { applyTheme(); board.requestRender(); }));
    if (M.boardUX) M.boardUX.settingsRows(wrap, row, select);
    const reset = h('button', { class: 'btn sm', html: icon('reset') + '<span>مسح كل البيانات المحلية</span>' });
    reset.onclick = async () => {
      if (!(await M.confirm('سيتم مسح كل الصفحات والإعدادات وتقدّم الطلاب من هذا الجهاز. هل أنت متأكد؟', 'امسح كل شيء'))) return;
      ['board', 'view', 'settings', 'practice', 'panel', 'classNames', 'chat'].forEach((k) => M.store.del(k));
      location.reload();
    };
    row('إعادة الضبط', 'حذف البيانات المحفوظة على هذا الجهاز', reset);
    M.modal({ title: 'الإعدادات', icon: 'settings', body: wrap });
  }

  function openAbout() {
    const feats = [
      ['pen', 'سبورة ذكية تتعرف على الأشكال المرسومة باليد'],
      ['algebra', 'حل المعادلات والمتباينات والأنظمة بالخطوات'],
      ['function', 'رسم الدوال مع معاملات متغيرة وتحليل كامل'],
      ['geometry', 'مختبر هندسي تفاعلي وقياسات حيّة'],
      ['numbers', 'الأعداد والكسور والتحليل بصرياً'],
      ['stats', 'الإحصاء والاحتمالات والمحاكاة'],
      ['sparkles', 'معلم ذكي يقرأ السبورة ويشرح بالعربية'],
      ['target', 'تدريب متكيّف يتابع مستوى كل طالب'],
      ['users', 'استراتيجيات تدريس وأدوات إدارة الصف'],
      ['keyboard', 'أرقام ورموز رياضية عربية كاملة'],
    ];
    const body = `
      <div class="about">
        <svg class="big-logo" viewBox="0 0 64 64"><use href="#logo-mark"/></svg>
        <h2>مِداد</h2>
        <div style="color:var(--ui-muted)">السبورة الرياضية الذكية — الإصدار ${M.loc(M.APP.version)}</div>
        <div class="designer">تصميم وفكرة<br><b>${M.APP.designer}</b></div>
        <p style="margin:0;color:var(--ui-soft)">منصّة عربية متكاملة تساعد المعلم والطالب على تعليم الرياضيات وتعلّمها بتفاعل وذكاء.</p>
        <div class="feature-list">${feats.map(([i, t]) => `<div>${icon(i)}<span>${t}</span></div>`).join('')}</div>
        <h4 style="margin:18px 0 4px">اختصارات لوحة المفاتيح</h4>
        <div class="kbd-list">
          <div><kbd>P</kbd> قلم</div><div><kbd>E</kbd> ممحاة</div>
          <div><kbd>V</kbd> تحديد</div><div><kbd>T</kbd> نص</div>
          <div><kbd>L</kbd> ليزر</div><div><kbd>1</kbd>–<kbd>0</kbd> الأشكال والقياس</div>
          <div><kbd>Ctrl</kbd>+<kbd>Z</kbd> تراجع</div><div><kbd>Ctrl</kbd>+<kbd>S</kbd> حفظ</div>
          <div><kbd>مسافة</kbd> + سحب: تحريك</div><div><kbd>Ctrl</kbd>+عجلة: تكبير</div>
          <div><kbd>Delete</kbd> حذف المحدد</div><div><kbd>PageDown</kbd> الصفحة التالية</div>
        </div>
      </div>`;
    M.modal({ title: 'عن مِداد', icon: 'info', body, size: 'lg' });
  }

  /* ---------------- الخطوط ---------------- */
  const loadFont = () => {
    if (!document.fonts) return;
    const fam = M.fontFamily().split(',')[0];
    Promise.all([document.fonts.load(`16px ${fam}`, 'سبورة 123'), document.fonts.load(`bold 16px ${fam}`, 'سبورة 123')]).then(() => board.requestRender(), () => {});
  };
  if (document.fonts) document.fonts.ready.then(() => board.requestRender());
  loadFont();
  M.on('settings', loadFont);

  /* ---------------- البداية ---------------- */
  setTool('pen');
  window.addEventListener('load', () => setTimeout(() => $('#splash').classList.add('hide'), 900));
  setTimeout(() => $('#splash').classList.add('hide'), 2500);

  // تطبيق قابل للتثبيت (يعمل دون اتصال)
  if (M.inArtifact) { const pb = $('[data-act="print"]'); if (pb) pb.remove(); }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !M.inArtifact) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
