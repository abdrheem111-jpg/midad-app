/* ==========================================================================
   لوحة «مختبر الأشكال والمجسمات»: أشكال مستوية وأبعادها، مجسمات ثلاثية
   الأبعاد، طيّ الشبكات إلى مجسمات، ورسم الدوال ثلاثية الأبعاد ع = د(س، ص)
   كل الأبعاد قابلة للتحكم والقوانين تتحدّث فوراً
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 2 : d);
  const TABS = [['shapes', 'أشكال مستوية'], ['solids', 'مجسمات'], ['nets', 'الشبكات'], ['graph3d', 'رسم ثلاثي الأبعاد']];
  const UNITS = [['وحدة', 'وحدة'], ['سم', 'سم'], ['م', 'م']];
  const state = { tab: 'shapes', shape: 'rect', solid: 'cuboid', net: 'cube', unit: 'وحدة', params: {}, fold: 0, expr: 'س² − ص²', R: 4, transparent: false, auto: false };
  const unitTxt = (k) => (k === 0 || k == null ? '' : state.unit === 'وحدة' ? (k === 1 ? ' وحدة' : k === 2 ? ' وحدة مربعة' : ' وحدة مكعبة') : ` ${state.unit}${k === 2 ? '²' : k === 3 ? '³' : ''}`);
  const isLight = () => M.settings.theme === 'white';

  function paramsFor(kind, key) {
    const id = kind + ':' + key;
    if (!state.params[id]) state.params[id] = kind === 'shape' ? M.shapes2d.defaults(key) : M.solids.defaults(key);
    return state.params[id];
  }

  /* ---------------- واجهة عامة قابلة للتكرار (في اللوحة وفي نافذة مكبّرة) ---------------- */
  function buildLab(root, big) {
    root.innerHTML = '';
    const tabs = h('div', { class: 'seg-ctl lab-tabs' });
    const stage = h('div', { class: 'lab-stage' + (big ? ' big' : '') });
    const cv = h('canvas', { class: 'lab-canvas' });
    const tools = h('div', { class: 'lab-stage-tools' });
    stage.append(cv, tools);
    const picker = h('div', { class: 'lab-picker' });
    const controls = h('div', { class: 'lab-controls' });
    const results = h('div', { class: 'lab-results' });
    const acts = h('div', { class: 'row lab-acts' });
    const side = h('div', { class: 'lab-side' }, picker, controls, results, acts);
    const body = h('div', { class: 'lab-body' + (big ? ' big' : '') }, stage, side);
    root.append(tabs, body);
    TABS.forEach(([k, t]) => {
      const b = h('button', { class: state.tab === k ? 'active' : '' }, t);
      b.onclick = () => { state.tab = k; M.$$('button', tabs).forEach((x) => x.classList.toggle('active', x === b)); render(); };
      tabs.appendChild(b);
    });
    let v3 = null, anim = null;
    const tb = (ic, title, fn, on) => { const b = h('button', { class: 'icon-btn sm' + (on ? ' on' : ''), title, html: icon(ic) }); b.onclick = () => fn(b); tools.appendChild(b); return b; };

    function ensure3D() {
      if (!v3) { v3 = new M.View3D(cv, { light: isLight(), autoRotate: state.auto }); root._v3 = v3; }
      v3.opts.light = isLight();
      v3.opts.autoRotate = state.auto;
      return v3;
    }
    function drop3D() { if (v3) { v3.destroy(); v3 = null; root._v3 = null; } const c2 = cv.getContext('2d'); c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, cv.width, cv.height); }

    function slider(q, obj, onChange) {
      const wrap = h('div', { class: 'lab-slider' });
      const lab = h('label', {}, q.label);
      const rng = h('input', { type: 'range', min: q.min, max: q.max, step: q.step, value: obj[q.k] });
      const num = h('input', { class: 'inp', type: 'number', min: q.min, max: q.max, step: q.step, value: obj[q.k] });
      const set = (v) => { v = M.clamp(+v || q.min, q.min, 1000); obj[q.k] = v; rng.value = v; num.value = v; onChange(); };
      rng.oninput = () => set(rng.value);
      num.onchange = () => set(num.value);
      wrap.append(lab, rng, num);
      return wrap;
    }
    function unitSel() {
      const s = h('select', { class: 'sel sm lab-unit', title: 'وحدة القياس' });
      UNITS.forEach(([v, t]) => s.appendChild(h('option', { value: v, selected: state.unit === v }, t)));
      s.onchange = () => { state.unit = s.value; render(); };
      return s;
    }
    function showRows(rows, extra) {
      results.innerHTML = '';
      const tbl = h('div', { class: 'lab-rows' });
      rows.forEach((r) => {
        const val = r.display || (F(r.value, r.unit === 3 ? 2 : 2) + unitTxt(r.unit));
        tbl.appendChild(h('div', { class: 'lab-row', html: `<div class="n">${r.name}</div><div class="f">${r.formula}${r.subst ? ` <span>= ${M.loc(r.subst)}</span>` : ''}</div><div class="v">${M.loc(val)}</div>` }));
      });
      results.appendChild(tbl);
      if (extra) results.insertAdjacentHTML('beforeend', extra);
    }
    function chooser(list, cur, onPick) {
      picker.innerHTML = '';
      const g = h('div', { class: 'lab-choices' });
      list.forEach(([k, name]) => {
        const b = h('button', { class: 'chip' + (k === cur ? ' active' : '') }, name);
        b.onclick = () => onPick(k);
        g.appendChild(b);
      });
      picker.appendChild(g);
    }

    /* ---------- الأشكال المستوية ---------- */
    function draw2D() {
      const S = M.shapes2d.SHAPES[state.shape], p = paramsFor('shape', state.shape);
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(50, r.width) * dpr; cv.height = Math.max(50, r.height) * dpr;
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width, H = r.height;
      ctx.clearRect(0, 0, W, H);
      const err = S.valid && S.valid(p);
      const light = isLight();
      const ink = light ? '#1b2330' : '#f4f1e8';
      if (err) { ctx.fillStyle = '#ef6b6b'; ctx.font = `bold 14px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.fillText('⚠ ' + err, W / 2, H / 2); return; }
      const g = S.geo(p);
      const all = g.pts.concat(g.hole || []);
      const xs = all.map((q) => q[0]), ys = all.map((q) => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const pad = 42, k = Math.min((W - 2 * pad) / (x1 - x0 || 1), (H - 2 * pad) / (y1 - y0 || 1));
      const T = ([x, y]) => [W / 2 + (x - (x0 + x1) / 2) * k, H / 2 - (y - (y0 + y1) / 2) * k];
      // شبكة الوحدات
      ctx.strokeStyle = light ? 'rgba(30,60,110,.08)' : 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
      const step = k >= 18 ? 1 : k >= 6 ? 5 : 10;
      for (let gx = Math.floor(x0 - 20); gx <= x1 + 20; gx += step) { const [sx] = T([gx, 0]); if (sx < 0 || sx > W) continue; ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke(); }
      for (let gy = Math.floor(y0 - 20); gy <= y1 + 20; gy += step) { const [, sy] = T([0, gy]); if (sy < 0 || sy > H) continue; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke(); }
      // الشكل
      const path = (pts) => { pts.forEach((q, i) => { const [sx, sy] = T(q); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); }); ctx.closePath(); };
      ctx.beginPath(); path(g.pts); if (g.hole) path(g.hole.slice().reverse());
      ctx.fillStyle = 'rgba(56,201,180,.22)'; ctx.fill('evenodd');
      ctx.strokeStyle = '#38c9b4'; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.stroke();
      const dashed = (a, b, col) => { ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = col || '#f2b134'; ctx.lineWidth = 1.8; ctx.beginPath(); const [ax, ay] = T(a), [bx, by] = T(b); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.restore(); };
      if (g.height) dashed(g.height[0], g.height[1]);
      if (g.radius) dashed(g.radius[0], g.radius[1]);
      (g.diag || []).forEach(([a, b]) => dashed(a, b, '#6aa9ff'));
      // زوايا قائمة
      (g.right || []).forEach((i) => {
        const n = g.pts.length, P0 = T(g.pts[i]), A = T(g.pts[(i + 1) % n]), B = T(g.pts[(i - 1 + n) % n]);
        const u = (Q) => { const d = Math.hypot(Q[0] - P0[0], Q[1] - P0[1]) || 1; return [(Q[0] - P0[0]) / d, (Q[1] - P0[1]) / d]; };
        const a = u(A), b = u(B), s = 12;
        ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(P0[0] + a[0] * s, P0[1] + a[1] * s); ctx.lineTo(P0[0] + (a[0] + b[0]) * s, P0[1] + (a[1] + b[1]) * s); ctx.lineTo(P0[0] + b[0] * s, P0[1] + b[1] * s); ctx.stroke();
      });
      if (!g.curved) g.pts.forEach((q) => { const [sx, sy] = T(q); ctx.fillStyle = '#f2b134'; ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, 7); ctx.fill(); });
      // التسميات
      ctx.font = `bold 13px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      (g.labels || []).forEach((lb) => {
        let [sx, sy] = T(lb.p);
        // إزاحة التسمية إلى خارج الشكل قليلاً
        const cx = W / 2, cy = H / 2, d = Math.hypot(sx - cx, sy - cy) || 1;
        if (lb.kind !== 'ang') { sx += ((sx - cx) / d) * 14; sy += ((sy - cy) / d) * 14; }
        const txt = M.loc(lb.text + (lb.kind === 'dim' && state.unit !== 'وحدة' ? ' ' + state.unit : ''));
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = light ? 'rgba(255,255,255,.9)' : 'rgba(10,18,26,.78)'; M.roundRect(ctx, sx - tw / 2 - 6, sy - 11, tw + 12, 22, 7); ctx.fill();
        ctx.fillStyle = light ? '#123' : '#fff'; ctx.fillText(txt, sx, sy + 1);
      });
      if (g.apLabel) { const [sx, sy] = T(g.height[1]); ctx.fillStyle = '#f2b134'; ctx.fillText(M.loc(g.apLabel), sx, sy + 16); }
    }
    function renderShapes() {
      drop3D();
      tools.innerHTML = '';
      chooser(Object.entries(M.shapes2d.SHAPES).map(([k, s]) => [k, s.name]), state.shape, (k) => { state.shape = k; render(); });
      const S = M.shapes2d.SHAPES[state.shape], p = paramsFor('shape', state.shape);
      controls.innerHTML = '';
      const upd = () => { draw2D(); const err = S.valid && S.valid(p); if (err) results.innerHTML = `<div class="err">${err}</div>`; else showRows(S.calc(p)); };
      S.params.forEach((q) => controls.appendChild(slider(q, p, upd)));
      controls.appendChild(h('div', { class: 'row lab-unit-row' }, h('span', { class: 'lbl' }, 'الوحدة:'), unitSel()));
      acts.innerHTML = '';
      const tob = h('button', { class: 'btn sm primary', html: icon('board') + '<span>ارسمه على السبورة</span>' });
      tob.onclick = () => shapeToBoard(state.shape, p);
      acts.append(tob, askBtn(() => `${S.name}: ${S.params.map((q) => `${q.label} = ${F(p[q.k])}`).join('، ')}`));
      upd();
    }

    /* ---------- المجسمات ---------- */
    function renderSolids() {
      tools.innerHTML = '';
      const v = ensure3D();
      chooser(Object.entries(M.solids.SOLIDS).map(([k, s]) => [k, s.name]), state.solid, (k) => { state.solid = k; render(); });
      const S = M.solids.SOLIDS[state.solid], p = paramsFor('solid', state.solid);
      controls.innerHTML = '';
      let first = true;
      const upd = () => {
        const sc = M.solids.solidScene(state.solid, p);
        if (state.transparent) sc.faces.forEach((f) => (f.alpha = 0.35));
        v.setScene(sc, first); first = false;
        const vef = S.vef ? `<div class="lab-vef"><span>الرؤوس <b>${L(S.vef[0])}</b></span><span>الأحرف <b>${L(S.vef[1])}</b></span><span>الأوجه <b>${L(S.vef[2])}</b></span><span class="euler">أويلر: ${L(S.vef[0])} − ${L(S.vef[1])} + ${L(S.vef[2])} = ٢ ✓</span></div>` : '';
        showRows(S.calc(p), vef);
      };
      S.params.forEach((q) => controls.appendChild(slider(q, p, upd)));
      controls.appendChild(h('div', { class: 'row lab-unit-row' }, h('span', { class: 'lbl' }, 'الوحدة:'), unitSel()));
      tb('fill', 'شفاف / معتم (لرؤية الأحرف الخلفية)', (b) => { state.transparent = !state.transparent; b.classList.toggle('on', state.transparent); upd(); }, state.transparent);
      tb('rotate', 'دوران تلقائي', (b) => { state.auto = !state.auto; b.classList.toggle('on', state.auto); v.opts.autoRotate = state.auto; v.request(); }, state.auto);
      tb('reset', 'إعادة ضبط العرض', () => v.fit());
      acts.innerHTML = '';
      const tob = h('button', { class: 'btn sm primary', html: icon('board') + '<span>صورة على السبورة</span>' });
      tob.onclick = () => snapToBoard(v, S.name, S.calc(p));
      const netB = S.net ? h('button', { class: 'btn sm', html: icon('layers') + '<span>اعرض شبكته</span>' }) : null;
      if (netB) netB.onclick = () => { state.net = state.solid; state.fold = 0; state.tab = 'nets'; syncTabs(); render(); };
      acts.append(tob);
      if (netB) acts.append(netB);
      acts.append(askBtn(() => `${S.name}: ${S.params.map((q) => `${q.label} = ${F(p[q.k])}`).join('، ')}`));
      upd();
    }

    /* ---------- الشبكات ---------- */
    function renderNets() {
      tools.innerHTML = '';
      const v = ensure3D();
      const withNets = Object.entries(M.solids.SOLIDS).filter(([, s]) => s.net);
      if (!M.solids.SOLIDS[state.net] || !M.solids.SOLIDS[state.net].net) state.net = 'cube';
      chooser(withNets.map(([k, s]) => [k, s.name]), state.net, (k) => { state.net = k; state.fold = 0; render(); });
      const S = M.solids.SOLIDS[state.net], p = paramsFor('solid', state.net);
      controls.innerHTML = '';
      const foldQ = { k: 'fold', label: 'الطيّ ٪', min: 0, max: 100, step: 1 };
      const fo = { fold: Math.round(state.fold * 100) };
      let first = true;
      const upd = () => {
        state.fold = fo.fold / 100;
        const faces = M.solids.netFaces(state.net, p, state.fold);
        if (state.transparent) faces.forEach((f) => (f.alpha = 0.45));
        v.setScene({ faces, lines: [], labels: [] }, first);
        if (first) { v.target = [v.target[0], Math.max(1, v.target[1]), v.target[2]]; v.pitch = 0.75; }
        first = false;
        const rows = S.calc(p);
        const tot = rows.find((r) => r.name === 'المساحة الكلية');
        showRows([Object.assign({}, tot, { name: 'مساحة الشبكة = المساحة الكلية للمجسم' })].concat(rows.filter((r) => r.name === 'الحجم')), `<div class="hint">حرّك منزلق «الطيّ» أو اضغط تشغيل لترى كيف تنطوي الشبكة المستوية لتصبح ${S.name}. مساحة الشبكة لا تتغير أثناء الطي — وهي نفسها المساحة الكلية.</div>`);
      };
      const fs = slider(foldQ, fo, upd);
      controls.appendChild(fs);
      S.params.forEach((q) => controls.appendChild(slider(q, p, upd)));
      const play = h('button', { class: 'btn sm teal', html: icon('play') + '<span>اطوِ الشبكة</span>' });
      play.onclick = () => {
        cancelAnimationFrame(anim);
        const from = state.fold, to = from > 0.5 ? 0 : 1, t0 = performance.now(), dur = 2200;
        play.innerHTML = icon('play') + `<span>${to ? 'جارٍ الطي…' : 'جارٍ الفتح…'}</span>`;
        const step = (now) => {
          const u = Math.min(1, (now - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
          fo.fold = Math.round((from + (to - from) * e) * 100);
          const rng = fs.querySelector('input[type=range]'), num = fs.querySelector('input[type=number]'); rng.value = fo.fold; num.value = fo.fold;
          upd();
          if (u < 1 && root.isConnected) anim = requestAnimationFrame(step);
          else play.innerHTML = icon('play') + `<span>${to ? 'افتح الشبكة' : 'اطوِ الشبكة'}</span>`;
        };
        anim = requestAnimationFrame(step);
      };
      controls.appendChild(h('div', { class: 'row' }, play, h('span', { class: 'lbl' }, 'الوحدة:'), unitSel()));
      tb('fill', 'شفاف / معتم', (b) => { state.transparent = !state.transparent; b.classList.toggle('on', state.transparent); upd(); }, state.transparent);
      tb('rotate', 'دوران تلقائي', (b) => { state.auto = !state.auto; b.classList.toggle('on', state.auto); v.opts.autoRotate = state.auto; v.request(); }, state.auto);
      tb('reset', 'إعادة ضبط العرض', () => { first = true; upd(); });
      acts.innerHTML = '';
      const tob = h('button', { class: 'btn sm primary', html: icon('board') + '<span>صورة على السبورة</span>' });
      tob.onclick = () => snapToBoard(v, 'شبكة ' + S.name, []);
      acts.append(tob);
      upd();
    }

    /* ---------- رسم ثلاثي الأبعاد ---------- */
    function renderGraph3D() {
      tools.innerHTML = '';
      const v = ensure3D();
      picker.innerHTML = '';
      const inp = h('input', { class: 'inp math-inp', value: state.expr, dir: 'rtl', placeholder: 'ع = س² + ص²' });
      const ex = h('div', { class: 'lab-choices' });
      [['س² + ص²', 'مجسم مكافئ'], ['س² − ص²', 'سرج'], ['جا(س) × جتا(ص)', 'أمواج'], ['√(٩ − س² − ص²)', 'نصف كرة'], ['٢س − ص + ١', 'مستوى'], ['جا(√(س² + ص²))', 'تموّج دائري'], ['س × ص ÷ ٣', 'قطع زائدي']].forEach(([e, n]) => {
        const b = h('button', { class: 'chip', title: e }, n);
        b.onclick = () => { inp.value = e; go(); };
        ex.appendChild(b);
      });
      picker.append(h('div', { class: 'row' }, h('b', { class: 'lab-z' }, 'ع ='), inp), ex);
      controls.innerHTML = '';
      const ro = { R: state.R };
      const upd = () => go();
      controls.appendChild(slider({ k: 'R', label: 'مدى س و ص (±)', min: 1, max: 10, step: 0.5 }, ro, () => { state.R = ro.R; upd(); }));
      let first = true;
      function go() {
        state.expr = inp.value;
        const src = inp.value.replace(/^\s*(ع|z)\s*=\s*/, '');
        results.innerHTML = '';
        let ast;
        try { ast = M.math.parse(src); } catch (e) { results.innerHTML = `<div class="err">${M.esc(e.message)}</div>`; return; }
        const f = (x, y) => M.math.evaluate(ast, { x, y }, 'rad');
        const surf = M.G3.surface(f, state.R, 36, state.R * 3);
        if (!surf.faces.length) { results.innerHTML = '<div class="err">الدالة غير معرّفة في هذا المدى</div>'; return; }
        const ax = M.G3.axes(state.R * 1.25);
        v.setScene(M.G3.merge({ faces: surf.faces }, ax), first); first = false;
        results.innerHTML = `<div class="lab-rows"><div class="lab-row"><div class="n">الدالة</div><div class="f">ع = ${M.esc(M.loc(src))}</div><div class="v"></div></div><div class="lab-row"><div class="n">أصغر قيمة لـ ع في المدى</div><div class="f"></div><div class="v">${F(surf.zmin)}</div></div><div class="lab-row"><div class="n">أكبر قيمة لـ ع في المدى</div><div class="f"></div><div class="v">${F(surf.zmax)}</div></div></div><div class="hint">اسحب للتدوير، واستخدم العجلة أو إصبعين للتكبير. الألوان تدل على الارتفاع: الأزرق منخفض والأحمر مرتفع.</div>`;
      }
      inp.addEventListener('input', M.debounce(go, 350));
      inp.addEventListener('keydown', (e) => e.stopPropagation());
      tb('rotate', 'دوران تلقائي', (b) => { state.auto = !state.auto; b.classList.toggle('on', state.auto); v.opts.autoRotate = state.auto; v.request(); }, state.auto);
      tb('reset', 'إعادة ضبط العرض', () => v.fit());
      acts.innerHTML = '';
      const tob = h('button', { class: 'btn sm primary', html: icon('board') + '<span>صورة على السبورة</span>' });
      tob.onclick = () => snapToBoard(v, 'ع = ' + M.loc(state.expr.replace(/^\s*(ع|z)\s*=\s*/, '')), []);
      acts.append(tob);
      go();
    }

    function syncTabs() { M.$$('button', tabs).forEach((b, i) => b.classList.toggle('active', TABS[i][0] === state.tab)); }
    function render() {
      cancelAnimationFrame(anim);
      syncTabs();
      stage.classList.toggle('is3d', state.tab !== 'shapes');
      ({ shapes: renderShapes, solids: renderSolids, nets: renderNets, graph3d: renderGraph3D })[state.tab]();
      if (!big) {
        const ex = h('button', { class: 'icon-btn sm', title: 'تكبير المختبر', html: icon('fullscreen') });
        ex.onclick = () => openBig();
        tools.appendChild(ex);
      }
    }
    if (window.ResizeObserver) new ResizeObserver(() => { if (state.tab === 'shapes' && root.isConnected) draw2D(); }).observe(stage);
    root._render = render;
    render();
    return { render, get v3() { return v3; } };
  }

  function askBtn(textFn) {
    const b = h('button', { class: 'btn sm ghost', html: icon('sparkles') + '<span>اشرح لي</span>' });
    b.onclick = () => M.tutor && M.tutor.send(textFn());
    return b;
  }

  /* ---------------- إلى السبورة ---------------- */
  function shapeToBoard(key, p) {
    const S = M.shapes2d.SHAPES[key];
    if (S.valid && S.valid(p)) return M.toast(S.valid(p), { type: 'warn' });
    const B = M.board, g = S.geo(p), u = B.unit;
    const xs = g.pts.map((q) => q[0]), ys = g.pts.map((q) => q[1]);
    const cx0 = (Math.min(...xs) + Math.max(...xs)) / 2, cy0 = (Math.min(...ys) + Math.max(...ys)) / 2;
    const [cx, cy] = B.viewCenter();
    const W = (q) => [cx + (q[0] - cx0) * u, cy - (q[1] - cy0) * u];
    const id = () => Math.random().toString(36).slice(2, 10);
    B.commit();
    const col = B.color;
    const objs = [{ id: id(), type: 'poly', pts: g.pts.map(W), color: col, width: 3, fill: true }];
    if (g.hole) objs.push({ id: id(), type: 'poly', pts: g.hole.map(W), color: col, width: 3 });
    const dashLine = (a, b2) => { const A = W(a), Bq = W(b2); objs.push({ id: id(), type: 'line', x1: A[0], y1: A[1], x2: Bq[0], y2: Bq[1], color: 'c4', width: 2, dash: true }); };
    if (g.height) dashLine(g.height[0], g.height[1]);
    if (g.radius) dashLine(g.radius[0], g.radius[1]);
    (g.diag || []).forEach(([a, b2]) => dashLine(a, b2));
    (g.labels || []).forEach((lb) => { const [x, y] = W(lb.p); objs.push({ id: id(), type: 'text', x: x + 30, y: y + 4, text: M.loc(lb.text), size: 20, color: 'c4' }); });
    const rows = S.calc(p).filter((r) => /المحيط|المساحة/.test(r.name));
    const bx = Math.max(...g.pts.map(W).map((q) => q[0]));
    objs.push({ id: id(), type: 'text', x: bx + 260, y: cy - 40, text: M.loc([S.name].concat(rows.map((r) => `${r.name} = ${r.formula}${r.subst ? ' = ' + r.subst : ''} = ${r.display || F(r.value) + unitTxt(r.unit)}`)).join('\n')), size: 20, color: col });
    objs.forEach((o) => B.objects.push(o));
    B.changed();
    M.toast('تم رسم الشكل بأبعاده الحقيقية على السبورة ✓');
  }
  function snapToBoard(v, title, rows) {
    const url = v.toDataURL();
    const img = new Image();
    img.onload = () => {
      M.board.addImage(url, img.width / (v.dpr || 1), img.height / (v.dpr || 1));
      if (rows && rows.length) M.board.addText([title].concat(rows.map((r) => `${r.name} = ${r.display || F(r.value) + unitTxt(r.unit)}`)).join('\n'), { size: 20 });
      M.toast('أُضيفت الصورة إلى السبورة');
    };
    img.src = url;
  }

  function openBig() {
    const wrap = h('div', { class: 'lab-big' });
    const m = M.modal({ title: 'مختبر الأشكال والمجسمات', icon: 'cube', body: wrap, size: 'xl lab-modal', onClose: () => { if (wrap._v3) wrap._v3.destroy(); if (panelLab) panelLab.render(); } });
    buildLab(wrap, true);
    return m;
  }

  let panelLab = null;
  M.registerPanel({
    id: 'lab', title: 'مختبر الأشكال والمجسمات', short: 'المجسمات', icon: 'cube',
    desc: 'أشكال مستوية ومجسمات وشبكات ورسوم ثلاثية الأبعاد — تحكّم في الأبعاد وشاهد القوانين',
    build(root) { panelLab = buildLab(root, false); },
    onShow() { if (panelLab) setTimeout(() => panelLab.render(), 30); },
  });

  /** فتح المختبر على عنصر محدد من خارج اللوحة (المعلم الذكي، البحث…) */
  M.lab = {
    open(tab, key, params) {
      state.tab = tab || state.tab;
      if (tab === 'shapes' && key) state.shape = key;
      if (tab === 'solids' && key) state.solid = key;
      if (tab === 'nets' && key) { state.net = key; state.fold = 0; }
      if (tab === 'graph3d' && key) state.expr = key;
      if (params && key) Object.assign(paramsFor(tab === 'shapes' ? 'shape' : 'solid', key), params);
      M.openPanel('lab');
      if (panelLab) panelLab.render();
    },
    openBig,
    state,
  };
})();
