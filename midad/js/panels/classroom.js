/* ==========================================================================
   لوحة الصف والاستراتيجيات: أدوات إدارة الصف (مؤقت، اختيار عشوائي،
   مجموعات، نقاط، ستارة، كشاف، نرد) + استراتيجيات تدريس + قوالب للسبورة
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  const DEFAULT_NAMES = 'أحمد\nسارة\nمحمد\nفاطمة\nعلي\nمريم\nخالد\nنورة\nيوسف\nهدى\nعمر\nليلى';
  const names = () => (M.store.get('classNames', DEFAULT_NAMES) || '').split('\n').map((s) => s.trim()).filter(Boolean);

  M.registerPanel({
    id: 'class', title: 'الصف والاستراتيجيات', short: 'الصف', icon: 'users',
    desc: 'أدوات إدارة الصف واستراتيجيات التعلم النشط',
    build(root) {
      const tools = h('div', { class: 'card' });
      tools.innerHTML = `<h4>${icon('users')} أدوات الصف</h4>`;
      const tiles = h('div', { class: 'tool-tiles' });
      [
        ['timer', 'المؤقت', openTimer], ['face', 'اختيار بالكاميرا', () => M.cameraPicker.open()], ['shuffle', 'عجلة الأسماء', openPicker], ['users', 'المجموعات', openGroups],
        ['trophy', 'لوحة النقاط', openScoreboard], ['curtain', 'الستارة', openCurtain], ['spotlight', 'الكشّاف', openSpotlight],
        ['dice', 'النرد', openDice], ['heart', 'إشارات الفهم', openTraffic], ['sparkles', 'خطة درس ذكية', lessonPlan],
      ].forEach(([ic, t, fn]) => { const b = h('button', { class: 'tile', html: icon(ic) + `<span>${t}</span>` }); b.onclick = fn; tiles.appendChild(b); });
      tools.appendChild(tiles);

      const namesCard = h('div', { class: 'card' });
      namesCard.innerHTML = `<h4>${icon('book')} أسماء الطلاب</h4><div class="hint">اسم في كل سطر — تُستخدم في الاختيار العشوائي والمجموعات، وتُحفظ على جهازك.</div>`;
      const ta = h('textarea', { class: 'inp', rows: 4 }, names().join('\n'));
      ta.addEventListener('input', M.debounce(() => M.store.set('classNames', ta.value), 300));
      namesCard.appendChild(ta);

      const strat = h('div', { class: 'card' });
      strat.innerHTML = `<h4>${icon('bulb')} استراتيجيات التعلّم النشط</h4><div class="hint">انقر أي استراتيجية لرؤية خطواتها وتطبيقها مباشرة على السبورة مع المؤقت.</div>`;
      const grid = h('div', { class: 'strat-grid' });
      STRATEGIES.forEach((s) => {
        const b = h('button', { class: 'strat', html: `<b>${s.icon} ${s.name}</b><span>${s.short}</span>` });
        b.onclick = () => openStrategy(s);
        grid.appendChild(b);
      });
      strat.appendChild(grid);

      const tpl = h('div', { class: 'card' });
      tpl.innerHTML = `<h4>${icon('layers')} قوالب جاهزة للسبورة</h4>`;
      const tchips = h('div', { class: 'chips' });
      Object.entries(TEMPLATES).forEach(([k, t]) => { const c = h('button', { class: 'chip' }, t.name); c.onclick = () => { M.board.addPage(t.bg || 'plain'); t.draw(); M.toast('تمت إضافة القالب في صفحة جديدة'); }; tchips.appendChild(c); });
      tpl.appendChild(tchips);

      root.append(tools, strat, tpl, namesCard);
    },
  });

  /* ================= الصوت ================= */
  let actx = null;
  function beep(freq, dur, times) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      for (let i = 0; i < (times || 1); i++) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = freq || 880;
        const t0 = actx.currentTime + i * (dur + 0.12);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
      }
    } catch (e) { /* لا صوت */ }
  }

  /* ================= المؤقت ================= */
  let timerW = null;
  function openTimer(minutes, label) {
    if (timerW) timerW.close();
    const body = h('div');
    const disp = h('div', { class: 'timer-display' }, '٠٥:٠٠');
    const lab = h('div', { style: { textAlign: 'center', fontWeight: 700, color: 'var(--accent)', minHeight: '20px' } }, label || '');
    const presets = h('div', { class: 'row', style: { justifyContent: 'center', margin: '6px 0' } });
    const ctrl = h('div', { class: 'row', style: { justifyContent: 'center' } });
    const play = h('button', { class: 'btn primary sm', html: icon('play') });
    const reset = h('button', { class: 'btn sm', html: icon('reset') });
    const up = h('button', { class: 'btn sm' }, '+٣٠ث');
    ctrl.append(play, reset, up);
    body.append(lab, disp, presets, ctrl);
    let total = (typeof minutes === 'number' ? minutes : 5) * 60, left = total, running = false, iv = null;
    [1, 2, 3, 5, 10, 15].forEach((m) => { const b = h('button', { class: 'chip' }, L(m) + 'د'); b.onclick = () => { total = left = m * 60; stop(); render(); }; presets.appendChild(b); });
    const render = () => {
      const mm = Math.floor(Math.max(0, left) / 60), ss = Math.max(0, left) % 60;
      disp.textContent = L(String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'));
      disp.classList.toggle('urgent', left <= 10 && left > 0);
      disp.classList.toggle('done', left <= 0);
    };
    const stop = () => { running = false; clearInterval(iv); play.innerHTML = icon('play'); };
    const start = () => {
      if (left <= 0) left = total;
      running = true; play.innerHTML = icon('pause');
      iv = setInterval(() => {
        left--;
        if (left <= 3 && left > 0) beep(660, 0.12);
        if (left <= 0) { stop(); beep(880, 0.35, 3); disp.textContent = 'انتهى الوقت!'; disp.classList.add('done'); return; }
        render();
      }, 1000);
    };
    play.onclick = () => (running ? stop() : start());
    reset.onclick = () => { stop(); left = total; render(); };
    up.onclick = () => { left += 30; total = Math.max(total, left); render(); };
    render();
    timerW = M.floatWidget({ title: 'المؤقت', icon: 'timer', body, y: 14, onClose: () => { stop(); timerW = null; } });
    if (typeof minutes === 'number') start();
  }

  /* ================= الاختيار العشوائي (عجلة) ================= */
  function openPicker() {
    let list = names();
    if (list.length < 2) return M.toast('أضف أسماء الطلاب أولاً في لوحة الصف');
    const wrap = h('div', { class: 'wheel-wrap' });
    const cv = h('canvas', { width: 720, height: 720 });
    const win = h('div', { class: 'wheel-winner' }, 'من سيكون صاحب الحظ؟ 🎯');
    const row = h('div', { class: 'row', style: { justifyContent: 'center' } });
    const spin = h('button', { class: 'btn primary', html: icon('shuffle') + '<span>أدِر العجلة</span>' });
    const rm = h('label', { class: 'row', style: { gap: '6px', fontSize: '13px' } }, h('input', { type: 'checkbox', checked: true }), 'استبعد من اختير');
    row.append(spin, rm);
    wrap.append(cv, win, row);
    M.modal({ title: 'اختيار طالب عشوائياً', icon: 'shuffle', body: wrap });
    const ctx = cv.getContext('2d');
    let ang = 0;
    const cols = M.seriesColors();
    const draw = () => {
      const n = list.length, R = 340, c = 360;
      ctx.clearRect(0, 0, 720, 720);
      for (let i = 0; i < n; i++) {
        const a0 = ang + (i * 2 * Math.PI) / n, a1 = a0 + (2 * Math.PI) / n;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.moveTo(c, c); ctx.arc(c, c, R, a0, a1); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.save(); ctx.translate(c, c); ctx.rotate((a0 + a1) / 2);
        ctx.fillStyle = '#0b1117'; ctx.font = `bold ${n > 16 ? 22 : 30}px Tajawal, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
        ctx.fillText(list[i], R - 24, 0); ctx.restore();
      }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c, c, 36, 0, Math.PI * 2); ctx.fill();
      // المؤشر (أعلى)
      ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.moveTo(c, 40); ctx.lineTo(c - 22, 0); ctx.lineTo(c + 22, 0); ctx.closePath(); ctx.fill();
    };
    draw();
    let spinning = false;
    spin.onclick = () => {
      if (spinning || list.length < 1) return;
      spinning = true;
      const start = ang, total = Math.PI * 2 * (5 + Math.random() * 3) + Math.random() * Math.PI * 2, dur = 4200, t0 = performance.now();
      let lastTick = 0;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        ang = start + total * e;
        const seg = Math.floor(ang / ((2 * Math.PI) / list.length));
        if (seg !== lastTick) { lastTick = seg; if (p < 0.95) beep(1200, 0.02); }
        draw();
        if (p < 1) requestAnimationFrame(step);
        else {
          spinning = false;
          const n = list.length;
          const pointer = -Math.PI / 2;
          let rel = ((pointer - ang) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
          const idx = Math.floor(rel / ((2 * Math.PI) / n));
          const name = list[idx];
          win.textContent = '🎉 ' + name;
          beep(880, 0.2, 2);
          if (rm.querySelector('input').checked && list.length > 1) setTimeout(() => { list = list.filter((_, i) => i !== idx); draw(); }, 1400);
        }
      };
      requestAnimationFrame(step);
    };
  }

  /* ================= المجموعات ================= */
  function openGroups() {
    const list = names();
    if (list.length < 2) return M.toast('أضف أسماء الطلاب أولاً');
    const wrap = h('div');
    const row = h('div', { class: 'row' });
    const mode = h('select', { class: 'sel', style: { width: '150px' } }, h('option', { value: 'count' }, 'عدد المجموعات'), h('option', { value: 'size' }, 'حجم المجموعة'));
    const n = h('input', { class: 'inp', type: 'number', min: 2, value: 3, style: { width: '80px' } });
    const go = h('button', { class: 'btn primary', html: icon('shuffle') + '<span>وزّع</span>' });
    const toB = h('button', { class: 'btn', html: icon('board') + '<span>إلى السبورة</span>' });
    row.append(mode, n, go, toB);
    const out = h('div', { class: 'groups', style: { marginTop: '12px' } });
    wrap.append(row, out);
    let groups = [];
    const make = () => {
      const k = Math.max(2, +n.value || 3);
      const sh = M.shuffle(list);
      const count = mode.value === 'count' ? Math.min(k, sh.length) : Math.ceil(sh.length / k);
      groups = Array.from({ length: count }, () => []);
      sh.forEach((s, i) => groups[i % count].push(s));
      out.innerHTML = groups.map((g, i) => `<div class="group"><b>المجموعة ${L(i + 1)}</b>${g.map((s) => `<div>${M.esc(s)}</div>`).join('')}</div>`).join('');
    };
    go.onclick = make;
    toB.onclick = () => { M.board.addText(groups.map((g, i) => `المجموعة ${L(i + 1)}: ${g.join('، ')}`).join('\n'), { size: 26 }); M.toast('تمت الإضافة'); };
    make();
    M.modal({ title: 'تقسيم المجموعات', icon: 'users', body: wrap, size: 'lg' });
  }

  /* ================= لوحة النقاط ================= */
  function openScoreboard() {
    const body = h('div', { style: { minWidth: '260px' } });
    const teams = M.store.get('teams', [{ n: 'الفريق الأول', s: 0 }, { n: 'الفريق الثاني', s: 0 }]);
    const list = h('div');
    const save = () => M.store.set('teams', teams);
    const render = () => {
      list.innerHTML = '';
      const max = Math.max(...teams.map((t) => t.s));
      teams.forEach((t, i) => {
        const row = h('div', { class: 'score-team' });
        const name = h('input', { value: t.n });
        name.oninput = () => { t.n = name.value; save(); };
        const minus = h('button', { class: 'icon-btn sm', html: icon('minus') });
        const pts = h('div', { class: 'pts', style: { color: t.s === max && max > 0 ? 'var(--accent)' : '' } }, L(t.s));
        const plus = h('button', { class: 'icon-btn sm', html: icon('plus') });
        minus.onclick = () => { t.s--; save(); render(); };
        plus.onclick = () => { t.s++; save(); beep(990, 0.08); render(); };
        row.append(name, minus, pts, plus);
        list.appendChild(row);
      });
    };
    const acts = h('div', { class: 'row', style: { marginTop: '6px' } });
    const add = h('button', { class: 'btn sm', html: icon('plus') + '<span>فريق</span>' });
    const reset = h('button', { class: 'btn sm ghost', html: icon('reset') + '<span>تصفير</span>' });
    add.onclick = () => { if (teams.length < 6) { teams.push({ n: 'فريق ' + L(teams.length + 1), s: 0 }); save(); render(); } };
    reset.onclick = () => { teams.forEach((t) => (t.s = 0)); save(); render(); };
    acts.append(add, reset);
    body.append(list, acts);
    render();
    M.floatWidget({ title: 'لوحة النقاط', icon: 'trophy', body, x: 20, y: 80 });
  }

  /* ================= الستارة ================= */
  function openCurtain() {
    const root = M.$('#overlays');
    const cur = h('div', { class: 'curtain', style: { height: '100%' } });
    const grip = h('div', { class: 'grip', html: '<span>⇕ اسحب لكشف السبورة</span>' });
    const x = h('button', { html: icon('close'), title: 'إغلاق' });
    grip.appendChild(x);
    cur.appendChild(grip);
    root.appendChild(cur);
    let drag = false;
    grip.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; drag = true; grip.setPointerCapture(e.pointerId); });
    grip.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const r = root.getBoundingClientRect();
      cur.style.height = M.clamp(e.clientY - r.top, 0, r.height) + 'px';
    });
    grip.addEventListener('pointerup', () => (drag = false));
    x.onclick = () => cur.remove();
  }

  /* ================= الكشّاف ================= */
  function openSpotlight() {
    const root = M.$('#overlays');
    const el = h('div', { class: 'spot' });
    const exit = h('button', { class: 'btn sm spot-exit', html: icon('close') + '<span>إنهاء الكشّاف (Esc)</span>' });
    root.append(el, exit);
    let r = 140, px = root.clientWidth / 2, py = root.clientHeight / 2;
    const paint = () => { el.style.background = `radial-gradient(circle ${r}px at ${px}px ${py}px, transparent 0, transparent ${r - 2}px, rgba(0,0,0,.88) ${r}px)`; };
    el.addEventListener('pointermove', (e) => { const b = root.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top; paint(); });
    el.addEventListener('wheel', (e) => { e.preventDefault(); r = M.clamp(r - e.deltaY * 0.3, 40, 600); paint(); }, { passive: false });
    const close = () => { el.remove(); exit.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    exit.onclick = close;
    paint();
    M.toast('حرّك المؤشر لتسليط الضوء، واستخدم العجلة لتغيير الحجم');
  }

  /* ================= النرد ================= */
  const PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]] };
  const dieSVG = (v) => `<svg viewBox="0 0 100 100" width="84" height="84"><rect x="4" y="4" width="92" height="92" rx="18" fill="#fffdf6" stroke="#caa94d" stroke-width="3"/>${PIPS[v].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#1b2330"/>`).join('')}</svg>`;
  function openDice() {
    const body = h('div', { style: { textAlign: 'center' } });
    const faces = h('div', { class: 'row', style: { justifyContent: 'center', gap: '10px' } });
    const sum = h('div', { style: { fontWeight: 800, fontSize: '20px', margin: '6px 0' } });
    const row = h('div', { class: 'row', style: { justifyContent: 'center' } });
    const cnt = h('select', { class: 'sel', style: { width: '90px' } }, h('option', { value: 1 }, 'حجر واحد'), h('option', { value: 2, selected: true }, 'حجران'), h('option', { value: 3 }, 'ثلاثة'));
    const roll = h('button', { class: 'btn primary', html: icon('dice') + '<span>ارمِ</span>' });
    row.append(cnt, roll);
    body.append(faces, sum, row);
    const doRoll = () => {
      const n = +cnt.value;
      let k = 0;
      const iv = setInterval(() => {
        const vals = Array.from({ length: n }, () => M.rand(1, 6));
        faces.innerHTML = vals.map(dieSVG).join('');
        if (++k > 10) { clearInterval(iv); sum.textContent = n > 1 ? 'المجموع = ' + L(vals.reduce((a, b) => a + b, 0)) : ''; beep(700, 0.1); }
      }, 70);
    };
    roll.onclick = doRoll;
    doRoll();
    M.floatWidget({ title: 'النرد', icon: 'dice', body, y: 90 });
  }

  /* ================= إشارات الفهم ================= */
  function openTraffic() {
    const body = h('div', { style: { minWidth: '240px' } });
    const counts = { g: 0, y: 0, r: 0 };
    const row = h('div', { class: 'row', style: { justifyContent: 'space-around' } });
    const bar = h('div', { style: { display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginTop: '10px', background: 'var(--ui-raised)' } });
    const render = () => {
      const t = counts.g + counts.y + counts.r || 1;
      bar.innerHTML = `<i style="width:${(counts.g / t) * 100}%;background:#5fd08a"></i><i style="width:${(counts.y / t) * 100}%;background:#f2b134"></i><i style="width:${(counts.r / t) * 100}%;background:#ef6b6b"></i>`;
      M.$$('i', bar).forEach((i) => (i.style.display = 'block'));
    };
    [['g', '#5fd08a', 'فهمت'], ['y', '#f2b134', 'لست متأكداً'], ['r', '#ef6b6b', 'أحتاج مساعدة']].forEach(([k, c, t]) => {
      const b = h('button', { class: 'btn', style: { flexDirection: 'column', height: 'auto', padding: '8px', gap: '4px' } });
      const n = h('b', { style: { fontSize: '22px' } }, '٠');
      b.innerHTML = `<span style="width:26px;height:26px;border-radius:50%;background:${c};display:block"></span><span style="font-size:12px">${t}</span>`;
      b.appendChild(n);
      b.onclick = () => { counts[k]++; n.textContent = L(counts[k]); render(); };
      row.appendChild(b);
    });
    body.append(h('div', { class: 'hint', style: { fontSize: '12px', color: 'var(--ui-muted)', marginBottom: '6px' } }, 'يرفع كل طالب إشارته، وانقر لعدّها:'), row, bar);
    render();
    M.floatWidget({ title: 'إشارات الفهم', icon: 'heart', body, x: 20, y: 200 });
  }

  function lessonPlan() {
    M.prompt('خطة درس ذكية', 'موضوع الدرس (مثال: جمع الكسور غير المتشابهة)').then((topic) => {
      if (!topic) return;
      M.tutor.send(`صمّم خطة درس رياضيات تفاعلية لمدة ٤٥ دقيقة عن: "${topic}" للمرحلة ${M.settings.grade}.\nتشمل: الأهداف، التهيئة (٥ د)، العرض باستخدام أدوات السبورة الذكية، نشاطين للتعلم النشط من الاستراتيجيات (فكر-زاوج-شارك، الرؤوس المرقمة، الكرسي الساخن...)، التمايز للمتعثرين والمتفوقين، التقويم الختامي وبطاقة خروج من ٣ أسئلة مع الإجابات.`);
    });
  }

  /* ================= الاستراتيجيات ================= */
  const STRATEGIES = [
    { name: 'فكّر - زاوج - شارك', icon: '🤝', short: 'تفكير فردي ثم ثنائي ثم مشاركة الصف', steps: ['فكّر (١ دقيقة): يفكر كل طالب في المسألة بمفرده ويكتب فكرته.', 'زاوج (٢ دقيقة): يناقش كل طالب زميله ويتفقان على حل.', 'شارك (٢ دقيقة): تعرض بعض الأزواج حلولها على الصف.'], timer: 5, board: 'فكّر ← زاوج ← شارك\n١) فكّر بمفردك (١ د)\n٢) ناقش زميلك (٢ د)\n٣) شارك الصف (٢ د)' },
    { name: 'الرؤوس المرقّمة', icon: '🔢', short: 'كل عضو مسؤول عن فهم المجموعة', steps: ['قسّم الصف إلى مجموعات رباعية، ولكل طالب رقم من ١ إلى ٤.', 'اطرح سؤالاً، وتتعاون كل مجموعة لتتأكد أن جميع أفرادها يعرفون الإجابة.', 'اختر رقماً عشوائياً (استخدم النرد) ليجيب صاحبه من كل مجموعة.'], timer: 4, action: 'groups' },
    { name: 'الكرسي الساخن', icon: '🪑', short: 'طالب يجيب عن أسئلة زملائه', steps: ['يجلس طالب على "الكرسي الساخن" أمام الصف.', 'يطرح زملاؤه أسئلة عن المفهوم (مثلاً: خصائص المثلث المتطابق الضلعين).', 'يجيب الطالب ويبرر، ويتبادل الطلاب الأدوار.'], timer: 5, action: 'picker' },
    { name: 'العصف الذهني', icon: '🧠', short: 'توليد أكبر عدد من الأفكار والحلول', steps: ['اكتب المسألة أو السؤال المفتوح في وسط السبورة.', 'يقترح الطلاب أكبر عدد من الأفكار دون نقد.', 'صنّفوا الأفكار معاً واختاروا الأفضل.'], timer: 5, template: 'mindmap' },
    { name: 'أعواد المثلجات', icon: '🍭', short: 'اختيار عشوائي يُشرك الجميع', steps: ['يُكتب اسم كل طالب على عود (هنا: العجلة الرقمية).', 'اطرح السؤال أولاً، وأمهل الطلاب وقتاً للتفكير.', 'اختر اسماً عشوائياً ليجيب — الجميع يستعد لأن أي أحد قد يُختار.'], action: 'picker' },
    { name: 'اكتشف الخطأ', icon: '🔍', short: 'حل فيه خطأ مقصود يكتشفه الطلاب', steps: ['يُعرض على السبورة حل لمسألة يحتوي خطأً مقصوداً.', 'يعمل الطلاب في أزواج لاكتشاف الخطأ وتفسير سببه.', 'يصحح الطلاب الحل ويناقشون كيف يتجنبون الخطأ.'], timer: 3, action: 'mistake' },
    { name: 'جدول التعلّم KWL', icon: '📋', short: 'ماذا أعرف؟ ماذا أريد؟ ماذا تعلمت؟', steps: ['في بداية الدرس: يكتب الطلاب ما يعرفونه عن الموضوع.', 'ثم ما يريدون معرفته.', 'في نهاية الدرس: يكملون عمود "ماذا تعلمت".'], template: 'kwl' },
    { name: 'نموذج فراير', icon: '🧩', short: 'بناء فهم عميق للمفاهيم والمصطلحات', steps: ['اكتب المفهوم في المنتصف (مثل: العدد الأولي).', 'املأ الأقسام الأربعة: التعريف، الخصائص، أمثلة، لا أمثلة.', 'ناقش الأمثلة المضادة لتعميق الفهم.'], template: 'frayer' },
    { name: 'التحدي السريع', icon: '⚡', short: 'سباق حساب ذهني بمؤقت', steps: ['تُعرض مجموعة مسائل حساب ذهني على السبورة.', 'يحل الطلاب أكبر عدد خلال دقيقتين.', 'راجعوا الإجابات معاً واحتفلوا بالتحسن.'], timer: 2, action: 'sprint' },
    { name: 'التعلّم بالاكتشاف', icon: '🔭', short: 'يستنتج الطلاب القاعدة بأنفسهم', steps: ['افتح مختبر الهندسة وارسم مثلثاً مع قياس زواياه.', 'اطلب من الطلاب تحريك الرؤوس وملاحظة مجموع الزوايا.', 'يصوغ الطلاب القاعدة بأنفسهم: مجموع زوايا المثلث ١٨٠°.'], action: 'geo' },
    { name: 'فن المقارنة (جدول T)', icon: '⚖️', short: 'مقارنة مفهومين أو طريقتين حل', steps: ['اختر مفهومين للمقارنة (مثل: المساحة والمحيط).', 'يملأ الطلاب أوجه الشبه والاختلاف في الجدول.', 'يستنتجون متى نستخدم كلاً منهما.'], template: 'tchart' },
    { name: 'بطاقة الخروج', icon: '🚪', short: 'تقويم سريع في آخر الحصة', steps: ['قبل نهاية الحصة بخمس دقائق تُعرض ٣ أسئلة قصيرة.', 'يجيب كل طالب بمفرده على ورقة صغيرة.', 'استخدم النتائج لتخطيط الدرس القادم.'], timer: 5, action: 'exit' },
    { name: 'إشارات المرور', icon: '🚦', short: 'تقويم ذاتي فوري لمستوى الفهم', steps: ['يرفع كل طالب بطاقة: أخضر (فهمت)، أصفر (غير متأكد)، أحمر (أحتاج مساعدة).', 'اجمع الإشارات بسرعة لتعرف حالة الصف.', 'وجّه المتفوقين لمساعدة زملائهم أصحاب البطاقات الحمراء.'], action: 'traffic' },
    { name: 'التعلّم التعاوني (جيجسو)', icon: '🧑‍🤝‍🧑', short: 'كل عضو خبير في جزء', steps: ['قسّم الموضوع إلى أجزاء (مثل: مساحة المثلث، المستطيل، الدائرة).', 'يتخصص كل طالب في جزء مع خبراء من المجموعات الأخرى.', 'يعود كل خبير لمجموعته ويعلّمهم ما تعلمه.'], timer: 10, action: 'groups' },
  ];
  function openStrategy(s) {
    const body = h('div');
    body.innerHTML = `<p style="color:var(--ui-muted);margin-top:0">${s.short}</p><ol class="steps">${s.steps.map((x) => `<li>${x}</li>`).join('')}</ol>`;
    const row = h('div', { class: 'row', style: { marginTop: '10px' } });
    const go = h('button', { class: 'btn primary', html: icon('play') + '<span>طبّق الآن</span>' });
    go.onclick = () => {
      m.close();
      if (s.board) { M.board.addPage('plain'); M.board.addText(s.icon + ' ' + s.board, { size: 32 }); }
      if (s.template) { M.board.addPage('plain'); TEMPLATES[s.template].draw(); }
      if (s.timer) openTimer(s.timer, s.name);
      ({ groups: openGroups, picker: openPicker, mistake: deliberateMistake, sprint: sprint, geo: () => { M.openPanel('geometry'); M.toast('افتح مختبر الهندسة واستخدم "مثال: مثلث"'); }, exit: () => M.openPanel('practice'), traffic: openTraffic }[s.action] || (() => {}))();
    };
    const ai = h('button', { class: 'btn', html: icon('sparkles') + '<span>اقترح نشاطاً بهذه الاستراتيجية</span>' });
    ai.onclick = () => { m.close(); M.tutor.send(`اقترح نشاطاً رياضياً عملياً بخطوات واضحة يطبّق استراتيجية "${s.name}" للمرحلة ${M.settings.grade}، مع مسائل جاهزة وإجاباتها.`); };
    row.append(go, ai);
    body.appendChild(row);
    const m = M.modal({ title: s.icon + ' ' + s.name, body });
  }

  function deliberateMistake() {
    const a = M.rand(2, 7), x = M.rand(2, 9), b = M.rand(3, 15), c = a * x + b;
    const wrong = (c + b) / a;
    const V = M.varName('x');
    const lines = [
      '🔍 اكتشف الخطأ في هذا الحل:',
      `${L(a)}${V} + ${L(b)} = ${L(c)}`,
      `${L(a)}${V} = ${L(c)} + ${L(b)}     ← الخطوة ١`,
      `${L(a)}${V} = ${L(c + b)}`,
      `${V} = ${M.fmt(wrong)}`,
    ];
    M.board.addPage('lines');
    M.board.addText(lines.join('\n'), { size: 32 });
    M.toast('الحل الصحيح: ' + V + ' = ' + L(x) + ' (الخطأ: جمع ' + L(b) + ' بدلاً من طرحه)', { time: 7000 });
  }
  function sprint() {
    const qs = [];
    for (let i = 0; i < 12; i++) {
      const op = M.pick(['+', '−', '×']);
      const a = M.rand(2, op === '×' ? 12 : 50), b = M.rand(2, op === '×' ? 12 : 50);
      qs.push(`${L(Math.max(a, b))} ${op} ${L(Math.min(a, b))} = ____`);
    }
    M.board.addPage('grid');
    M.board.addText('⚡ التحدي السريع\n' + qs.map((q, i) => `${L(i + 1)}) ${q}`).join('\n'), { size: 28 });
  }

  /* ================= القوالب ================= */
  function addObjs(objs) {
    const B = M.board;
    B.commit();
    objs.forEach((o) => { o.id = Math.random().toString(36).slice(2, 10); o.color = o.color || B.color; o.width = o.width || 2.5; B.objects.push(o); });
    B.changed();
  }
  function centered(text, x, y, size) {
    const t = { type: 'text', x, y, text, size: size || 26 };
    const b = M.boardUtil.bbox(t);
    t.x += (b[2] - b[0]) / 2; t.y -= (b[3] - b[1]) / 2;
    return t;
  }
  const TEMPLATES = {
    kwl: { name: 'جدول KWL', draw() {
      const [cx, cy] = M.board.viewCenter(); const W = 900, H = 460, x0 = cx - W / 2, y0 = cy - H / 2;
      const o = [{ type: 'rect', x1: x0, y1: y0, x2: x0 + W, y2: y0 + H }, { type: 'line', x1: x0 + W / 3, y1: y0, x2: x0 + W / 3, y2: y0 + H }, { type: 'line', x1: x0 + (2 * W) / 3, y1: y0, x2: x0 + (2 * W) / 3, y2: y0 + H }, { type: 'line', x1: x0, y1: y0 + 60, x2: x0 + W, y2: y0 + 60 }];
      ['ماذا أعرف؟', 'ماذا أريد أن أعرف؟', 'ماذا تعلّمت؟'].forEach((t, i) => o.push(centered(t, x0 + W - (i + 0.5) * (W / 3), y0 + 30, 26)));
      addObjs(o);
    } },
    frayer: { name: 'نموذج فراير', draw() {
      const [cx, cy] = M.board.viewCenter(); const W = 820, H = 520, x0 = cx - W / 2, y0 = cy - H / 2;
      const o = [{ type: 'rect', x1: x0, y1: y0, x2: x0 + W, y2: y0 + H }, { type: 'line', x1: cx, y1: y0, x2: cx, y2: y0 + H }, { type: 'line', x1: x0, y1: cy, x2: x0 + W, y2: cy }, { type: 'ellipse', x1: cx - 130, y1: cy - 55, x2: cx + 130, y2: cy + 55, fill: true, color: 'c1' }];
      o.push(centered('المفهوم', cx, cy, 30));
      [['التعريف', x0 + W * 0.75, y0 + 30], ['الخصائص', x0 + W * 0.25, y0 + 30], ['أمثلة', x0 + W * 0.75, y0 + H - 30], ['لا أمثلة', x0 + W * 0.25, y0 + H - 30]].forEach(([t, x, y]) => o.push(centered(t, x, y, 24)));
      addObjs(o);
    } },
    tchart: { name: 'جدول المقارنة', draw() {
      const [cx, cy] = M.board.viewCenter(); const W = 800, H = 480, x0 = cx - W / 2, y0 = cy - H / 2;
      const o = [{ type: 'line', x1: x0, y1: y0 + 60, x2: x0 + W, y2: y0 + 60, width: 3.5 }, { type: 'line', x1: cx, y1: y0, x2: cx, y2: y0 + H, width: 3.5 }];
      o.push(centered('المفهوم الأول', cx + W / 4, y0 + 28, 26), centered('المفهوم الثاني', cx - W / 4, y0 + 28, 26));
      addObjs(o);
    } },
    mindmap: { name: 'خريطة ذهنية', draw() {
      const [cx, cy] = M.board.viewCenter(); const o = [{ type: 'ellipse', x1: cx - 120, y1: cy - 50, x2: cx + 120, y2: cy + 50, fill: true, color: 'c1', width: 3 }];
      o.push(centered('الفكرة الرئيسية', cx, cy, 26));
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2) / 6 - Math.PI / 2, R = 280;
        const x = cx + R * Math.cos(a) * 1.3, y = cy + R * Math.sin(a);
        o.push({ type: 'line', x1: cx + 120 * Math.cos(a), y1: cy + 50 * Math.sin(a), x2: x - 85 * Math.cos(a), y2: y - 38 * Math.sin(a), color: 'c' + (2 + (i % 5)) });
        o.push({ type: 'ellipse', x1: x - 85, y1: y - 38, x2: x + 85, y2: y + 38, color: 'c' + (2 + (i % 5)) });
      }
      addObjs(o);
    } },
    venn: { name: 'أشكال فن', draw() {
      const [cx, cy] = M.board.viewCenter(); const r = 190;
      addObjs([{ type: 'ellipse', x1: cx - r - 110, y1: cy - r, x2: cx + r - 110, y2: cy + r, fill: true, color: 'c3' }, { type: 'ellipse', x1: cx - r + 110, y1: cy - r, x2: cx + r + 110, y2: cy + r, fill: true, color: 'c2' }, { type: 'rect', x1: cx - r - 170, y1: cy - r - 50, x2: cx + r + 170, y2: cy + r + 50 }, centered('أ', cx + 170, cy - r - 25, 28), centered('ب', cx - 170, cy - r - 25, 28), centered('ش', cx + r + 150, cy - r - 25, 24)]);
    } },
    coord: { name: 'مستوى إحداثي', bg: 'coord', draw() { M.board.resetView(); } },
    graphPaper: { name: 'ورقة رسم بياني', bg: 'grid', draw() {} },
    iso: { name: 'ورق متساوي القياس (للمجسمات)', bg: 'iso', draw() {} },
  };
  M.classroom = { openPicker };
})();
