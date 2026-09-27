/* ==========================================================================
   الفضاء ثلاثي الأبعاد على السبورة:
   - محاور س ص ع بتدريج (تُخفى وتُظهر) وأرضية شبكية ومناظر جاهزة
   - دوال ومستويات: سطوح ع = د(س، ص)، مستويات، كرات، مستقيمات، نقاط تُعدَّل أرقامها بسهولة
     مع التقاطعات والمسافات والزوايا تلقائياً
   - مجسمات بمنزلقات وقوانين
   - لوح شبكات دقيق بالمليمتر (أدوات مستطيل/مثلث/دائرة/تعديل، قياسات حية) ومساعد يرسم شبكة أي مجسم ثم يطويها
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const S3 = () => M.space3dMath;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 2 : d);
  const B = () => M.board;
  const E3 = (p) => [p[0], p[2], p[1]]; // (س، ص، ع) ⇐ إحداثيات المحرك (ع رأسي)
  const COLS = ['#4dabf7', '#f59f00', '#51cf66', '#cc5de8', '#22b8cf', '#ff922b', '#94d82d', '#f06595'];
  const RED = '#ff4d4f';
  const uid = () => Math.random().toString(36).slice(2, 10);
  const section = (t) => h('div', { class: 'mode-sec' }, t);
  const chipRow = (list, onPick, cls) => { const r = h('div', { class: 'mode-chips ' + (cls || '') }); list.forEach(([k, t]) => { const b = h('button', { class: 'chip', 'data-k': k }, t); b.onclick = () => onPick(k, b, r); r.appendChild(b); }); return r; };
  let S = null;

  function sceneOf(page) {
    if (!page.space3d) page.space3d = {};
    const sc = page.space3d;
    sc.items = sc.items || [];
    sc.objs = sc.objs || [];
    sc.view = Object.assign({ axes: true, grid: true, inter: true, R: 5 }, sc.view || {});
    sc.net = sc.net || { polys: [], circles: [] };
    if (!sc.net.u) { sc.net.polys = sc.net.polys.map((p) => p.map(([x, y]) => [x / 24, y / 24])); sc.net.circles = sc.net.circles.map((c) => ({ c: [c.c[0] / 24, c.c[1] / 24], r: c.r / 24 })); sc.net.u = 'cm'; }
    sc.net.sectors = sc.net.sectors || [];
    return sc;
  }

  /* ================= بناء المشهد ================= */
  function buildScene(sc, light) {
    const R = sc.view.R, faces = [], lines = [], labels = [], texts = [];
    const ax = light ? '#334' : 'rgba(255,255,255,.8)';
    // المجسمات والشبكات المطوية (صف على محور س)
    let x = 0;
    const solidFaces = [], solidLabels = [];
    sc.items.forEach((it) => {
      let fs;
      if (it.kind === 'solid') fs = M.solids.solidScene(it.key, it.params).faces;
      else if (it.kind === 'snet') fs = M.solids.netFaces(it.key, it.params, it.t == null ? 1 : it.t);
      else { const res = M.netFold.detect(it.polys, { unit: 1, circles: it.circles }); if (!res.ok) return; fs = M.netFold.foldAt(res, it.t == null ? 1 : it.t); }
      if (!fs.length) return;
      const xs = fs.flatMap((f) => f.p.map((p) => p[0])), zs = fs.flatMap((f) => f.p.map((p) => p[2])), ys = fs.flatMap((f) => f.p.map((p) => p[1]));
      const x0 = Math.min(...xs), x1 = Math.max(...xs), zc = (Math.min(...zs) + Math.max(...zs)) / 2, dx = x - x0;
      fs.forEach((f) => solidFaces.push(Object.assign({}, f, { p: f.p.map((p) => [p[0] + dx, p[1], p[2] - zc]) })));
      solidLabels.push({ p: [dx + (x0 + x1) / 2, Math.max(...ys) + 0.6, 0], text: it.name, size: 13 });
      x += x1 - x0 + 1.5;
    });
    if (solidFaces.length) { const cx = x / 2 - 0.75; solidFaces.forEach((f) => { f.p = f.p.map((p) => [p[0] - cx, p[1], p[2]]); faces.push(f); }); solidLabels.forEach((l) => { l.p[0] -= cx; labels.push(l); }); }
    // المحاور بتدريج
    if (sc.view.axes) {
      const A = R * 1.18, st = R > 7 ? 2 : 1, tk = R * 0.03;
      lines.push({ a: [-A, 0, 0], b: [A, 0, 0], color: '#ef6b6b', width: 2, front: false }, { a: [0, 0, -A], b: [0, 0, A], color: '#5fd08a', width: 2 }, { a: [0, -A, 0], b: [0, A, 0], color: '#6aa9ff', width: 2 });
      labels.push({ p: [A + 0.45, 0, 0], text: M.varName('x'), color: '#ef6b6b', size: 16 }, { p: [0, 0, A + 0.45], text: M.varName('y'), color: '#5fd08a', size: 16 }, { p: [0, A + 0.45, 0], text: 'ع', color: '#6aa9ff', size: 16 });
      for (let i = -Math.floor(R); i <= Math.floor(R); i += st) {
        if (!i) continue;
        lines.push({ a: [i, -tk, 0], b: [i, tk, 0], color: '#ef6b6b', width: 1.5 }, { a: [0, -tk, i], b: [0, tk, i], color: '#5fd08a', width: 1.5 }, { a: [-tk, i, 0], b: [tk, i, 0], color: '#6aa9ff', width: 1.5 });
        labels.push({ p: [i, -tk * 5, 0], text: String(i), size: 10, bgc: false, color: '#ef6b6b' }, { p: [0, -tk * 5, i], text: String(i), size: 10, bgc: false, color: '#5fd08a' }, { p: [-tk * 5, i, 0], text: String(i), size: 10, bgc: false, color: '#6aa9ff' });
      }
      labels.push({ p: [0.25, -0.3, 0.25], text: 'و', size: 11, bgc: false, color: ax });
    }
    if (sc.view.grid) {
      const gc = light ? 'rgba(30,60,110,.13)' : 'rgba(255,255,255,.09)';
      for (let i = -Math.floor(R); i <= Math.floor(R); i++) lines.push({ a: [i, 0, -R], b: [i, 0, R], color: gc, width: 1 }, { a: [-R, 0, i], b: [R, 0, i], color: gc, width: 1 });
    }
    // الكائنات الرياضية
    const vis = sc.objs.filter((o) => o.on !== false);
    vis.forEach((o, idx) => {
      const col = o.color || COLS[idx % COLS.length];
      const nm = L(String(sc.objs.indexOf(o) + 1));
      try {
        if (o.t === 'surf') {
          const f = S3().surfFn(o);
          const s = M.G3.surface(f, R, R > 6 ? 30 : 36, R * 4);
          s.faces.forEach((fc) => { if (fc.p.every((p) => Math.abs(p[1]) <= R)) faces.push(Object.assign(fc, { alpha: 0.9, edge: true, edgeColor: 'rgba(0,0,0,.14)', edgeWidth: 0.4 })); });
          labels.push({ p: E3([R * 0.8, R * 0.8, M.clamp(f(R * 0.8, R * 0.8), -R, R)]), text: `${nm}) ع = ${o.expr}`, color: col, size: 12 });
        } else if (o.t === 'plane') {
          const poly = S3().planeBox(o, R);
          if (poly.length >= 3) {
            // تقسيم المستوى إلى مثلثات صغيرة ليصح ترتيب العمق مع المستويات والمجسمات المتقاطعة
            const tris = [];
            for (let k = 1; k + 1 < poly.length; k++) tris.push([poly[0], poly[k], poly[k + 1]]);
            const V = S3().v, mid = (a, c) => V.mul(V.add(a, c), 0.5);
            const split = (t, d) => { if (!d) { faces.push({ p: t.map(E3), color: col, alpha: 0.42, edge: false }); return; } const [a, bq, c] = t, ab = mid(a, bq), bc = mid(bq, c), ca = mid(c, a); [[a, ab, ca], [ab, bq, bc], [ca, bc, c], [ab, bc, ca]].forEach((q) => split(q, d - 1)); };
            tris.forEach((t) => split(t, 3));
            poly.forEach((q, k) => lines.push({ a: E3(q), b: E3(poly[(k + 1) % poly.length]), color: col, width: 2 }));
            const c = poly.reduce((s, p) => S3().v.add(s, p), [0, 0, 0]).map((v) => v / poly.length);
            labels.push({ p: E3(c), text: `${nm}) ${S3().planeEq(o)}`, color: col, size: 12 });
          }
        } else if (o.t === 'sphere') {
          const n = 28, m = 16;
          for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
            const P = (a, b) => E3([o.c[0] + o.r * Math.sin(b) * Math.cos(a), o.c[1] + o.r * Math.sin(b) * Math.sin(a), o.c[2] + o.r * Math.cos(b)]);
            const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI, b0 = (j / m) * Math.PI, b1 = ((j + 1) / m) * Math.PI;
            faces.push({ p: [P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1)], color: col, alpha: 0.5, edge: false });
          }
          labels.push({ p: E3([o.c[0], o.c[1], o.c[2] + o.r + 0.4]), text: `${nm}) كرة نق = ${F(o.r)}`, color: col, size: 12 });
        } else if (o.t === 'line') {
          const seg = S3().lineBox(o, R * 1.1);
          if (seg) { lines.push({ a: E3(seg[0]), b: E3(seg[1]), color: col, width: 3.2 }); labels.push({ p: E3(seg[1]), text: `${nm}) مستقيم`, color: col, size: 12 }); }
        } else if (o.t === 'pt') {
          const p = o.p, s = Math.max(0.09, R * 0.018);
          const c = E3(p), cube = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map((q) => [c[0] + q[0] * s, c[1] + q[1] * s, c[2] + q[2] * s]);
          [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]].forEach((q) => faces.push({ p: q.map((k) => cube[k]), color: col, edge: false }));
          // خطوط الإسقاط: من النقطة إلى المستوى س ص ثم إلى المحورين
          const dash = light ? 'rgba(40,50,70,.55)' : 'rgba(255,255,255,.45)';
          lines.push({ a: c, b: E3([p[0], p[1], 0]), color: dash, width: 1.2, dash: true }, { a: E3([p[0], p[1], 0]), b: E3([p[0], 0, 0]), color: dash, width: 1.2, dash: true }, { a: E3([p[0], p[1], 0]), b: E3([0, p[1], 0]), color: dash, width: 1.2, dash: true });
          labels.push({ p: [c[0], c[1] + s * 4, c[2]], text: `${o.name || ''}${S3().P3(p)}`, color: col, size: 13 });
        }
      } catch (e) { texts.push(`⚠️ ${nm}: ${e.message}`); }
    });
    // التقاطعات والعلاقات
    const rel = [];
    for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
      let r = null;
      try { r = S3().relate(vis[i], vis[j], R); } catch (e) { r = null; }
      if (!r) continue;
      rel.push({ a: sc.objs.indexOf(vis[i]) + 1, b: sc.objs.indexOf(vis[j]) + 1, text: r.text });
      if (!sc.view.inter) continue;
      (r.pts || []).forEach((P) => { const c = E3(P), s = Math.max(0.12, R * 0.022); const oct = [[s, 0, 0], [-s, 0, 0], [0, s, 0], [0, -s, 0], [0, 0, s], [0, 0, -s]].map((q) => [c[0] + q[0], c[1] + q[1], c[2] + q[2]]); [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]].forEach((q) => faces.push({ p: q.map((k) => oct[k]), color: RED, edge: false })); labels.push({ p: [c[0], c[1] - s * 3.5, c[2]], text: S3().P3(P), color: RED, size: 12 }); });
      if (r.line) { const seg = S3().lineBox(r.line, R); if (seg) lines.push({ a: E3(seg[0]), b: E3(seg[1]), color: RED, width: 3.6, front: true }); }
      if (r.segs) r.segs.forEach(([a, b]) => lines.push({ a: E3(a), b: E3(b), color: RED, width: 3, front: true }));
      if (r.seg) lines.push({ a: E3(r.seg[0]), b: E3(r.seg[1]), color: RED, width: 2, dash: true, front: true });
      if (r.circle) {
        const { c, r: rr, n } = r.circle, V = S3().v, u = V.unit(Math.abs(n[0]) < 0.9 ? V.cross(n, [1, 0, 0]) : V.cross(n, [0, 1, 0])), w = V.unit(V.cross(n, u));
        let prev = null;
        for (let k = 0; k <= 64; k++) { const a = (k / 64) * 2 * Math.PI, P = V.add(c, V.add(V.mul(u, rr * Math.cos(a)), V.mul(w, rr * Math.sin(a)))); if (prev) lines.push({ a: E3(prev), b: E3(P), color: RED, width: 3, front: true }); prev = P; }
      }
    }
    // ثلاثة مستويات
    const planes = vis.filter((o) => o.t === 'plane');
    if (planes.length === 3) { const r = S3().threePlanes(...planes); if (r) rel.push({ a: 0, b: 0, text: r.text }); }
    return { scene: { faces, lines, labels }, rel, texts };
  }

  /* ================= الواجهة ================= */
  function open(preset) {
    preset = preset || {};
    close();
    const b = B(), sc = sceneOf(b.page);
    const light = M.settings.theme === 'white';
    const wrap = h('div', { class: 'space3d' });
    const view = h('div', { class: 'space-view' });
    const cv = h('canvas');
    const vtools = h('div', { class: 'space-vtools' });
    view.append(cv, vtools);
    const side = h('div', { class: 'space-side' });
    wrap.append(view, side);
    M.$('#overlays').appendChild(wrap);
    wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
    wrap.addEventListener('keydown', (e) => e.stopPropagation());
    const v = new M.View3D(cv, { light, pitch: 0.5, yaw: -0.7 });
    S = { wrap, v, anim: null, sc };
    document.body.classList.add('in-space');
    const tb = (ic, title, fn, on) => { const x = h('button', { class: 'icon-btn sm' + (on ? ' on' : ''), title, html: typeof ic === 'string' && ic.length > 2 ? icon(ic) : `<b>${ic}</b>` }); x.onclick = () => fn(x); vtools.appendChild(x); return x; };
    const toggle = (key) => (x) => { sc.view[key] = !sc.view[key]; x.classList.toggle('on', sc.view[key]); draw(false); };
    tb('function', 'إظهار/إخفاء المحاور', toggle('axes'), sc.view.axes);
    tb('grid', 'إظهار/إخفاء الأرضية الشبكية', toggle('grid'), sc.view.grid);
    tb('target', 'إظهار/إخفاء التقاطعات', toggle('inter'), sc.view.inter);
    const setView = (yaw, pitch) => { v.yaw = yaw; v.pitch = pitch; v.request(); };
    tb('ع', 'منظر علوي (من فوق)', () => setView(0, 1.52));
    tb('س', 'منظر أمامي', () => setView(0, 0.02));
    tb('ص', 'منظر جانبي', () => setView(-Math.PI / 2, 0.02));
    tb('cube', 'منظر مجسّم', () => setView(-0.7, 0.5));
    tb('rotate', 'دوران تلقائي', (x) => { v.opts.autoRotate = !v.opts.autoRotate; x.classList.toggle('on', v.opts.autoRotate); v.request(); });
    tb('reset', 'ملاءمة العرض', () => draw(true));
    tb('image', 'صورة على السبورة', () => { const url = v.toDataURL(); const img = new Image(); img.onload = () => { exit(); b.addImage(url, img.width / (v.dpr || 1), img.height / (v.dpr || 1)); }; img.src = url; });
    tb('close', 'العودة إلى السبورة', () => exit());
    let relBox = null;
    function draw(fit) {
      const out = buildScene(sc, light);
      v.setScene(out.scene, fit);
      if (fit && !out.scene.faces.length && !out.scene.lines.length) { v.target = [0, 0, 0]; v.dist = 14; }
      if (relBox) renderRel(out);
      b.changed();
    }
    S.draw = draw;
    function renderRel(out) {
      relBox.innerHTML = '';
      if (!out.rel.length && !out.texts.length) return;
      relBox.appendChild(h('b', {}, '🔍 التقاطعات والعلاقات:'));
      out.texts.forEach((t) => relBox.appendChild(h('div', { class: 'err' }, t)));
      out.rel.forEach((r) => relBox.appendChild(h('div', { class: 'rel-row' }, h('span', { class: 'rel-pair' }, r.a ? `${L(r.a)} ↔ ${L(r.b)}` : '١ ، ٢ ، ٣'), h('span', {}, L(r.text)))));
    }

    // التبويبات
    const tabs = h('div', { class: 'seg-ctl' });
    const pane = h('div');
    side.append(h('div', { class: 'space-title', html: `${icon('cube')}<b>الفضاء ثلاثي الأبعاد</b>` }), tabs, pane);
    const T = [['graph', 'دوال ومستويات'], ['solids', 'مجسمات'], ['net', 'الشبكات']];
    let tab = preset.tab || (sc.items.length && !sc.objs.length ? 'solids' : 'graph');
    const setTab = (k) => { tab = k; M.$$('button', tabs).forEach((q, i) => q.classList.toggle('active', T[i][0] === k)); renderPane(); };
    T.forEach(([k, t]) => { const x = h('button', { class: tab === k ? 'active' : '' }, t); x.onclick = () => setTab(k); tabs.appendChild(x); });
    function renderPane() { relBox = null; pane.innerHTML = ''; if (tab === 'graph') graphPane(); else if (tab === 'solids') solidsPane(); else netPane(); }

    /* ---------- دوال ومستويات ---------- */
    function graphPane() {
      const inp = h('input', { class: 'inp mode-inp', placeholder: 'ع = س² + ص² ، س + ص + ع = ٤ ، أ(١، ٢، ٣)', dir: 'rtl' });
      const go = h('button', { class: 'btn primary sm', html: icon('plus') + '<span>أضف</span>' });
      const addIt = (txt) => {
        try {
          const o = S3().parse(txt);
          o.id = uid(); o.on = true; o.color = COLS[sc.objs.length % COLS.length];
          if (o.t === 'pt' && !o.name) o.name = 'أبجدهوزحطيكلمن'[sc.objs.filter((q) => q.t === 'pt').length % 14];
          sc.objs.push(o); inp.value = ''; draw(sc.objs.length === 1); renderPane();
        } catch (e) { M.toast(e.message, { type: 'warn', time: 4500 }); }
      };
      go.onclick = () => inp.value.trim() && addIt(inp.value);
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && inp.value.trim()) addIt(inp.value); });
      pane.append(section('✍️ اكتب دالة أو مستوى أو كرة أو نقطة أو مستقيماً:'), h('div', { class: 'mode-row' }, inp, go));
      pane.appendChild(chipRow([
        ['ع = س² + ص²', 'مجسم مكافئ'], ['ع = جا(س) × جتا(ص)', 'سطح موجي'], ['ع = س² − ص²', 'سرج'], ['س + ص + ع = ٤', 'مستوى'], ['ع = ١', 'مستوى أفقي'],
        ['س² + ص² + ع² = ٩', 'كرة'], ['أ(٢، ١، ٣)', 'نقطة'], ['مستقيم (٠، ٠، ٠) (٢، ١، ٣)', 'مستقيم بنقطتين'], ['(١، −١، ٠) + ت(١، ٢، ٢)', 'مستقيم بمتجه'],
      ], (k) => addIt(k)));
      // مدى العرض
      const rr = h('div', { class: 'lab-slider' });
      const rng = h('input', { type: 'range', min: 2, max: 12, step: 1, value: sc.view.R });
      const rv = h('input', { class: 'inp', type: 'number', min: 2, max: 12, step: 1, value: sc.view.R });
      const setR = (x) => { sc.view.R = M.clamp(+x || 5, 2, 12); rng.value = sc.view.R; rv.value = sc.view.R; draw(true); };
      rng.oninput = () => setR(rng.value); rv.onchange = () => setR(rv.value);
      rr.append(h('label', {}, 'مدى العرض (±)'), rng, rv);
      pane.appendChild(rr);
      // القائمة
      const list = h('div', { class: 'space-items' });
      sc.objs.forEach((o, i) => list.appendChild(objCard(o, i)));
      pane.appendChild(list);
      if (!sc.objs.length) pane.appendChild(h('div', { class: 'hint' }, '💡 أضف سطحين أو مستويين أو مستقيماً ومستوى، وسأحسب التقاطع وأرسمه بالأحمر مع الزاوية والبعد.'));
      relBox = h('div', { class: 'space-rel' });
      pane.appendChild(relBox);
      draw(false);
    }
    function numIn(label, get, set, step) {
      const box = h('div', { class: 'num3' });
      const val = h('input', { class: 'inp', type: 'number', step: step || 0.5, value: +(+get()).toFixed(3) });
      const apply = (x) => { if (!Number.isFinite(+x)) return; set(+x); val.value = +(+x).toFixed(3); draw(false); };
      const mk = (t, d) => { const bt = h('button', { class: 'icon-btn sm' }, t); bt.onclick = () => apply(+val.value + d * (step || 0.5)); return bt; };
      val.onchange = () => apply(val.value);
      val.addEventListener('keydown', (e) => e.stopPropagation());
      box.append(h('label', {}, label), mk('−', -1), val, mk('+', 1));
      return box;
    }
    function objCard(o, i) {
      const card = h('div', { class: 'space-item obj' + (o.on === false ? ' off' : '') });
      const head = h('div', { class: 'obj-head' });
      const sw = h('button', { class: 'obj-sw', title: 'غيّر اللون', style: `background:${o.color}` });
      sw.onclick = () => { o.color = COLS[(COLS.indexOf(o.color) + 1) % COLS.length]; sw.style.background = o.color; draw(false); };
      const title = h('span', { class: 'obj-t' }, `${L(i + 1)}) ${L(S3().describe(o))}`);
      const eye = h('button', { class: 'icon-btn sm', title: 'إظهار/إخفاء', html: icon(o.on === false ? 'moon' : 'point') });
      eye.onclick = () => { o.on = o.on === false; card.classList.toggle('off', o.on === false); draw(false); };
      const del = h('button', { class: 'icon-btn sm', title: 'حذف', html: icon('trash') });
      del.onclick = () => { sc.objs.splice(i, 1); draw(false); renderPane(); };
      head.append(sw, title, eye, del);
      card.appendChild(head);
      const ed = h('div', { class: 'obj-ed' });
      const upT = () => { title.textContent = `${L(i + 1)}) ${L(S3().describe(o))}`; };
      const n3 = (arr, names, step) => names.forEach((nm, k) => ed.appendChild(numIn(nm, () => arr[k], (x) => { arr[k] = x; upT(); }, step)));
      const X = M.varName('x'), Y = M.varName('y');
      if (o.t === 'pt') n3(o.p, [X, Y, 'ع']);
      else if (o.t === 'line') { ed.appendChild(h('small', {}, 'نقطة عليه:')); n3(o.p, [X, Y, 'ع']); ed.appendChild(h('small', {}, 'متجه الاتجاه:')); n3(o.d, [X, Y, 'ع']); }
      else if (o.t === 'plane') { n3(o.n, [`معامل ${X}`, `معامل ${Y}`, 'معامل ع']); ed.appendChild(numIn('الثابت', () => o.d, (x) => { o.d = x; upT(); })); }
      else if (o.t === 'sphere') { ed.appendChild(h('small', {}, 'المركز:')); n3(o.c, [X, Y, 'ع']); ed.appendChild(numIn('نق', () => o.r, (x) => { o.r = Math.max(0.1, x); upT(); }, 0.25)); }
      else if (o.t === 'surf') {
        const ex = h('input', { class: 'inp', value: M.loc(o.expr), dir: 'rtl' });
        ex.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') ex.blur(); });
        ex.onchange = () => { try { const p = S3().parse('ع = ' + ex.value); if (p.t !== 'surf' && p.t !== 'plane') throw new Error('اكتب ع بدلالة س و ص'); Object.keys(o).forEach((k) => { if (!['id', 'color', 'on'].includes(k)) delete o[k]; }); Object.assign(o, p); upT(); draw(false); } catch (e) { M.toast(e.message, { type: 'warn' }); } };
        ed.append(h('label', {}, 'ع ='), ex);
      }
      card.appendChild(ed);
      return card;
    }

    /* ---------- المجسمات ---------- */
    function solidsPane() {
      pane.appendChild(section('اختر مجسماً لإضافته إلى الفضاء:'));
      pane.appendChild(chipRow(Object.entries(M.solids.SOLIDS).map(([k, s]) => [k, s.name]), (k) => { sc.items.push({ kind: 'solid', key: k, name: M.solids.SOLIDS[k].name, params: M.solids.defaults(k) }); draw(true); renderPane(); }));
      const list = h('div', { class: 'space-items' });
      sc.items.forEach((it, i) => {
        const card = h('details', { class: 'space-item' });
        if (i === sc.items.length - 1) card.open = true;
        const sum = h('summary', { html: `${icon(it.kind === 'solid' ? 'cube' : 'layers')}<b>${it.name}</b>` });
        const del = h('button', { class: 'icon-btn sm', title: 'حذف', html: icon('trash') });
        del.onclick = (e) => { e.preventDefault(); sc.items.splice(i, 1); draw(true); renderPane(); };
        sum.appendChild(del);
        card.appendChild(sum);
        if (it.kind === 'solid') {
          const Sd = M.solids.SOLIDS[it.key];
          const rows = h('div', { class: 'lab-rows' });
          const upd = () => { draw(false); rows.innerHTML = Sd.calc(it.params).map((r) => `<div class="lab-row"><div class="n">${r.name}</div><div class="v">${L(r.display || F(r.value))}</div><div class="f">${r.formula}</div></div>`).join(''); };
          Sd.params.forEach((q) => {
            const r = h('div', { class: 'lab-slider' });
            const rng = h('input', { type: 'range', min: q.min, max: q.max, step: q.step, value: it.params[q.k] });
            const val = h('input', { class: 'inp', type: 'number', min: q.min, max: q.max, step: q.step, value: it.params[q.k] });
            const set = (x) => { it.params[q.k] = +x; rng.value = x; val.value = x; upd(); };
            rng.oninput = () => set(rng.value); val.onchange = () => set(val.value);
            r.append(h('label', {}, q.label), rng, val); card.appendChild(r);
          });
          if (Sd.net) { const nb = h('button', { class: 'btn sm ghost', html: icon('layers') + '<span>ارسم شبكته في لوح الشبكات</span>' }); nb.onclick = () => { S.netPreset = { key: it.key, params: Object.assign({}, it.params) }; setTab('net'); }; card.appendChild(nb); }
          card.appendChild(rows); upd();
        } else {
          const rng = h('input', { type: 'range', min: 0, max: 100, value: Math.round((it.t == null ? 1 : it.t) * 100) });
          rng.oninput = () => { it.t = rng.value / 100; draw(false); };
          card.append(h('div', { class: 'lab-slider' }, h('label', {}, 'الطيّ ٪'), rng));
        }
        list.appendChild(card);
      });
      pane.appendChild(list);
      if (!sc.items.length) pane.appendChild(h('div', { class: 'hint' }, 'أضف مجسماً، أو ارسم شبكة في تبويب «الشبكات» لتنطوي هنا.'));
    }

    /* ---------- لوح الشبكات الدقيق ---------- */
    function netPane() {
      const net = sc.net;
      const W = 316, H = 330;
      const pad = h('canvas', { class: 'net-pad' });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      pad.width = W * dpr; pad.height = H * dpr; pad.style.aspectRatio = `${W} / ${H}`;
      const ctx = pad.getContext('2d');
      const st = { tool: 'pen', prec: 0.5, zs: 24, ox: -0.5, oy: -0.5, sel: -1, meas: true, tri: [], hist: [] };
      if (S.netState) Object.assign(st, S.netState, { tri: [], hist: S.netState.hist || [] });
      S.netState = st;
      const status = h('div', { class: 'net-status' });
      const toolRow = chipRow([['pen', '✏️ قلم ذكي'], ['rect', '▭ مستطيل'], ['tri', '△ مثلث'], ['circle', '◯ دائرة'], ['edit', '✋ تعديل'], ['pan', '🖐 تحريك']], (k, bt, r) => { st.tool = k; st.tri = []; M.$$('.chip', r).forEach((c) => c.classList.toggle('active', c === bt)); paint(); }, 'net-tools');
      M.$$('.chip', toolRow).forEach((c) => c.classList.toggle('active', c.dataset.k === st.tool));
      const precRow = chipRow([['1', '١ سم'], ['0.5', '٠٫٥ سم'], ['0.1', '١ مم']], (k, bt, r) => { st.prec = +k; M.$$('.chip', r).forEach((c) => c.classList.toggle('active', c === bt)); if (+k === 0.1 && st.zs < 40) { st.zs = 44; } paint(); }, 'net-prec');
      M.$$('.chip', precRow).forEach((c) => c.classList.toggle('active', +c.dataset.k === st.prec));
      const zoomRow = h('div', { class: 'mode-row net-zoom' });
      const zb = (t, f) => { const x = h('button', { class: 'btn sm ghost' }, t); x.onclick = f; zoomRow.appendChild(x); return x; };
      zb('🔍 +', () => zoomAt(1.25)); zb('🔍 −', () => zoomAt(0.8)); zb('ملاءمة', () => fitView());
      const measB = zb('📏 القياسات', () => { st.meas = !st.meas; measB.classList.toggle('on', st.meas); paint(); }); measB.classList.toggle('on', st.meas);
      const editor = h('div', { class: 'net-editor' });
      const acts = h('div', { class: 'mode-row foot' });
      const ab = (ic, t, f, cls) => { const x = h('button', { class: 'btn sm ' + (cls || 'ghost'), html: icon(ic) + `<span>${t}</span>` }); x.onclick = f; acts.appendChild(x); return x; };
      const foldB = ab('cube', 'اطوِها في الفضاء', () => fold(), 'primary');
      ab('undo', 'تراجع', () => { const s = st.hist.pop(); if (s) { Object.assign(net, JSON.parse(s)); st.sel = -1; paint(); check(); } });
      ab('eraser', 'امسح', () => { snap(); net.polys = []; net.circles = []; net.sectors = []; net.gen = null; st.sel = -1; paint(); check(); });
      ab('board', 'انقلها إلى السبورة بقياساتها', () => toBoard());
      // المساعد
      const helper = h('div', { class: 'net-helper' });
      pane.append(section('✍️ لوح الشبكات الدقيق (١ مربع كبير = ١ سم):'), toolRow, precRow, pad, zoomRow, status, editor, acts, helper);

      const snap = () => { st.hist.push(JSON.stringify({ polys: net.polys, circles: net.circles, sectors: net.sectors, gen: net.gen || null })); if (st.hist.length > 60) st.hist.shift(); };
      const toPx = ([x, y]) => [(x - st.ox) * st.zs, (y - st.oy) * st.zs];
      const toCm = ([px, py]) => [px / st.zs + st.ox, py / st.zs + st.oy];
      const pos = (e) => { const r = pad.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; };
      const rnd = (v) => Math.round(v / st.prec) * st.prec;
      const snapPt = (pc) => {
        // الالتصاق برأس موجود أولاً (بمسافة ١٠ بكسل) ثم بشبكة الدقة المختارة
        let best = null, bd = 10 / st.zs;
        net.polys.forEach((p) => p.forEach((q) => { const d = Math.hypot(q[0] - pc[0], q[1] - pc[1]); if (d < bd) { bd = d; best = q; } }));
        if (best) return best.slice();
        return [+rnd(pc[0]).toFixed(3), +rnd(pc[1]).toFixed(3)];
      };
      const lenTxt = (a, b) => `${F(Math.hypot(b[0] - a[0], b[1] - a[1]), 2)}`;
      function zoomAt(k) { const cx = st.ox + W / st.zs / 2, cy = st.oy + H / st.zs / 2; st.zs = M.clamp(st.zs * k, 8, 90); st.ox = cx - W / st.zs / 2; st.oy = cy - H / st.zs / 2; paint(); }
      function fitView() {
        const pts = net.polys.flat().concat(net.circles.flatMap((c) => [[c.c[0] - c.r, c.c[1] - c.r], [c.c[0] + c.r, c.c[1] + c.r]])).concat(net.sectors.flatMap((s) => [[s.c[0] - s.R, s.c[1] - s.R], [s.c[0] + s.R, s.c[1] + s.R]]));
        if (!pts.length) { st.zs = 24; st.ox = -0.5; st.oy = -0.5; paint(); return; }
        const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
        st.zs = M.clamp(Math.min((W - 40) / (x1 - x0 || 1), (H - 40) / (y1 - y0 || 1)), 8, 90);
        st.ox = (x0 + x1) / 2 - W / st.zs / 2; st.oy = (y0 + y1) / 2 - H / st.zs / 2; paint();
      }
      function paint(preview) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const lt = M.settings.theme === 'white';
        ctx.fillStyle = lt ? '#fbfaf6' : '#1b332c'; ctx.fillRect(0, 0, W, H);
        // الشبكة: مليمترات، أنصاف سنتيمترات، سنتيمترات، كل ٥ سم
        const gl = (step, col, wdt) => { if (step * st.zs < 3.5) return; ctx.strokeStyle = col; ctx.lineWidth = wdt; ctx.beginPath(); const x0 = Math.floor(st.ox / step) * step, y0 = Math.floor(st.oy / step) * step; for (let x = x0; x <= st.ox + W / st.zs; x += step) { const px = Math.round((x - st.ox) * st.zs) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, H); } for (let y = y0; y <= st.oy + H / st.zs; y += step) { const py = Math.round((y - st.oy) * st.zs) + 0.5; ctx.moveTo(0, py); ctx.lineTo(W, py); } ctx.stroke(); };
        const g = lt ? '30,60,110' : '255,255,255';
        gl(0.1, `rgba(${g},.06)`, 1); gl(0.5, `rgba(${g},.1)`, 1); gl(1, `rgba(${g},.2)`, 1); gl(5, `rgba(${g},.34)`, 1.4);
        // مسطرة السنتيمترات
        ctx.fillStyle = `rgba(${g},.55)`; ctx.font = `10px ${M.fontFamily()}`; ctx.textAlign = 'center';
        const cmStep = st.zs < 14 ? 5 : st.zs < 26 ? 2 : 1;
        for (let x = Math.ceil(st.ox / cmStep) * cmStep; x <= st.ox + W / st.zs; x += cmStep) ctx.fillText(L(x), (x - st.ox) * st.zs, 10);
        const cols = M.solids.COLORS;
        const edgeLabel = (a, b, cen) => {
          const pa = toPx(a), pb = toPx(b), m = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
          let nx = -(pb[1] - pa[1]), ny = pb[0] - pa[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
          if (cen) { const c = toPx(cen); if ((m[0] - c[0]) * nx + (m[1] - c[1]) * ny < 0) { nx = -nx; ny = -ny; } }
          if (Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) < 22) return;
          const t = L(lenTxt(a, b));
          ctx.font = `bold 10.5px ${M.fontFamily()}`; const tw = ctx.measureText(t).width;
          const x = m[0] + nx * 9, y = m[1] + ny * 9;
          ctx.fillStyle = lt ? 'rgba(255,255,255,.85)' : 'rgba(10,20,20,.75)'; ctx.fillRect(x - tw / 2 - 2, y - 7, tw + 4, 13);
          ctx.fillStyle = lt ? '#1c3d6e' : '#ffe08a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
        };
        net.polys.forEach((p, i) => {
          ctx.beginPath(); p.forEach((q, j) => { const [x, y] = toPx(q); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath();
          ctx.fillStyle = cols[i % cols.length] + (st.sel === i ? '88' : '4d'); ctx.fill();
          ctx.strokeStyle = st.sel === i ? '#fff' : cols[i % cols.length]; ctx.lineWidth = st.sel === i ? 3 : 2; ctx.stroke();
          if (st.meas) { const cen = p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]); p.forEach((q, j) => edgeLabel(q, p[(j + 1) % p.length], cen)); }
          if (st.tool === 'edit') p.forEach((q) => { const [x, y] = toPx(q); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); });
        });
        net.circles.forEach((c, i) => {
          const [x, y] = toPx(c.c); ctx.beginPath(); ctx.arc(x, y, c.r * st.zs, 0, 7); ctx.fillStyle = '#f2b1344d'; ctx.fill(); ctx.strokeStyle = st.sel === 1000 + i ? '#fff' : '#f2b134'; ctx.lineWidth = 2; ctx.stroke();
          if (st.meas) { ctx.strokeStyle = '#f2b134'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + c.r * st.zs, y); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = lt ? '#1c3d6e' : '#ffe08a'; ctx.font = `bold 10.5px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.fillText(L(`نق ${F(c.r, 2)}`), x + (c.r * st.zs) / 2, y - 7); }
        });
        net.sectors.forEach((s) => { const [x, y] = toPx(s.c); ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, s.R * st.zs, s.a0, s.a1); ctx.closePath(); ctx.fillStyle = '#4dabf74d'; ctx.fill(); ctx.strokeStyle = '#4dabf7'; ctx.lineWidth = 2; ctx.stroke(); if (st.meas) { ctx.fillStyle = lt ? '#1c3d6e' : '#ffe08a'; ctx.font = `bold 10.5px ${M.fontFamily()}`; ctx.textAlign = 'center'; const am = (s.a0 + s.a1) / 2; ctx.fillText(L(`ل ${F(s.R, 2)} ، ${F(((s.a1 - s.a0) * 180) / Math.PI, 1)}°`), x + Math.cos(am) * s.R * st.zs * 0.55, y + Math.sin(am) * s.R * st.zs * 0.55); } });
        // المعاينة الحية
        if (preview) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
          if (preview.stroke) { ctx.setLineDash([]); ctx.beginPath(); preview.stroke.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
          if (preview.poly) { ctx.beginPath(); preview.poly.forEach((q, j) => { const [x, y] = toPx(q); j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); if (preview.closed) ctx.closePath(); ctx.stroke(); ctx.setLineDash([]); preview.poly.forEach((q, j) => { if (j + 1 < preview.poly.length || preview.closed) edgeLabel(q, preview.poly[(j + 1) % preview.poly.length]); }); }
          if (preview.circle) { const [x, y] = toPx(preview.circle.c); ctx.beginPath(); ctx.arc(x, y, preview.circle.r * st.zs, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
          if (preview.label) { ctx.font = `bold 13px ${M.fontFamily()}`; ctx.textAlign = 'center'; const t = L(preview.label), tw = ctx.measureText(t).width; ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(W / 2 - tw / 2 - 6, H - 26, tw + 12, 20); ctx.fillStyle = '#fff'; ctx.fillText(t, W / 2, H - 12); }
          ctx.setLineDash([]);
        }
        st.tri.forEach((q) => { const [x, y] = toPx(q); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); });
      }
      function check() {
        const n = net.polys.length + net.circles.length + net.sectors.length;
        if (net.gen) {
          const Sd = M.solids.SOLIDS[net.gen.key], tot = Sd.calc(net.gen.params).find((r) => /الكلية|السطح/.test(r.name));
          status.innerHTML = `🧊 <b>شبكة ${Sd.name}</b> — مساحتها = المساحة الكلية للمجسم${tot ? ` = <b>${L(F(tot.value))} سم²</b>` : ''}. اضغط «اطوِها».`; foldB.disabled = false; return { ok: true };
        }
        if (n < 3) { status.innerHTML = `الأوجه: ${L(n)} — ارسم الأوجه بالأدوات أو اطلب من المساعد أدناه أن يرسم الشبكة.`; foldB.disabled = true; return null; }
        const res = M.netFold.detect(net.polys, { unit: 1, circles: net.circles });
        foldB.disabled = !res.ok;
        status.innerHTML = res.ok ? `🧊 <b>شبكة ${res.name}!</b> مساحتها الكلية ${L(F(res.area))} سم² — اضغط «اطوِها».` : `الأوجه: ${L(n)} — ${M.esc(res.message || '')}`;
        return res;
      }
      function renderEditor() {
        editor.innerHTML = '';
        if (st.sel < 0) return;
        const row = h('div', { class: 'mode-row net-ed' });
        if (st.sel >= 1000) {
          const c = net.circles[st.sel - 1000]; if (!c) return;
          row.append(numIn('نق (سم)', () => c.r, (x) => { snap(); c.r = Math.max(0.1, x); paint(); check(); }, st.prec));
        } else {
          const p = net.polys[st.sel]; if (!p) return;
          const isRect = p.length === 4 && p.every((q, i) => { const a = p[(i + 3) % 4], b = p[(i + 1) % 4]; return Math.abs((q[0] - a[0]) * (b[0] - q[0]) + (q[1] - a[1]) * (b[1] - q[1])) < 1e-6; }) && p.every((q, i) => Math.abs(q[0] - p[(i + 1) % 4][0]) < 1e-9 || Math.abs(q[1] - p[(i + 1) % 4][1]) < 1e-9);
          if (isRect) {
            const x0 = Math.min(...p.map((q) => q[0])), y0 = Math.min(...p.map((q) => q[1]));
            const wv = Math.max(...p.map((q) => q[0])) - x0, hv = Math.max(...p.map((q) => q[1])) - y0;
            const setWH = (w2, h2) => { snap(); net.polys[st.sel] = [[x0, y0], [x0 + w2, y0], [x0 + w2, y0 + h2], [x0, y0 + h2]]; net.gen = null; paint(); check(); };
            row.append(numIn('العرض (سم)', () => wv, (x) => setWH(Math.max(0.1, x), hv), st.prec), numIn('الارتفاع (سم)', () => hv, (x) => setWH(wv, Math.max(0.1, x)), st.prec));
          } else row.appendChild(h('small', {}, 'الأضلاع: ' + L(p.map((q, i) => lenTxt(q, p[(i + 1) % p.length])).join(' ، ')) + ' سم — اسحب الرؤوس لتعديلها'));
        }
        const del = h('button', { class: 'btn sm ghost', html: icon('trash') + '<span>احذف الوجه</span>' });
        del.onclick = () => { snap(); if (st.sel >= 1000) net.circles.splice(st.sel - 1000, 1); else net.polys.splice(st.sel, 1); net.gen = null; st.sel = -1; renderEditor(); paint(); check(); };
        row.appendChild(del);
        editor.appendChild(row);
      }
      // التفاعل
      let drag = null;
      pad.addEventListener('pointerdown', (e) => {
        try { pad.setPointerCapture(e.pointerId); } catch (err) { /* */ }
        const px = pos(e), pc = toCm(px);
        if (st.tool === 'pan') { drag = { k: 'pan', px, ox: st.ox, oy: st.oy }; return; }
        if (st.tool === 'pen') { drag = { k: 'pen', stroke: [px] }; return; }
        if (st.tool === 'rect' || st.tool === 'circle') { drag = { k: st.tool, a: snapPt(pc), b: snapPt(pc) }; return; }
        if (st.tool === 'tri') {
          st.tri.push(snapPt(pc));
          if (st.tri.length === 3) { snap(); net.polys.push(st.tri.slice()); net.gen = null; st.tri = []; check(); }
          paint({ poly: st.tri.length ? st.tri.concat([snapPt(pc)]) : null }); return;
        }
        if (st.tool === 'edit') {
          // رأس (مع كل الرؤوس المطابقة له في الأوجه المجاورة) أو وجه أو دائرة
          const tol = 10 / st.zs;
          let hit = null;
          net.polys.forEach((p, i) => p.forEach((q, j) => { if (!hit && Math.hypot(q[0] - pc[0], q[1] - pc[1]) < tol) hit = { i, j, q: q.slice() }; }));
          if (hit) { snap(); drag = { k: 'vertex', q0: hit.q }; st.sel = hit.i; renderEditor(); return; }
          const inside = (p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { if ((p[i][1] > pc[1]) !== (p[j][1] > pc[1]) && pc[0] < ((p[j][0] - p[i][0]) * (pc[1] - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; } return c; };
          const fi = net.polys.findIndex(inside), ci = net.circles.findIndex((c) => Math.hypot(c.c[0] - pc[0], c.c[1] - pc[1]) < c.r);
          if (fi >= 0) { snap(); st.sel = fi; drag = { k: 'move', last: snapPt(pc), i: fi }; }
          else if (ci >= 0) { snap(); st.sel = 1000 + ci; drag = { k: 'movec', last: snapPt(pc), i: ci }; }
          else st.sel = -1;
          renderEditor(); paint();
        }
      });
      pad.addEventListener('pointermove', (e) => {
        const px = pos(e), pc = toCm(px);
        if (st.tool === 'tri' && st.tri.length && !drag) { paint({ poly: st.tri.concat([snapPt(pc)]) }); return; }
        if (!drag) return;
        if (drag.k === 'pan') { st.ox = drag.ox - (px[0] - drag.px[0]) / st.zs; st.oy = drag.oy - (px[1] - drag.px[1]) / st.zs; paint(); return; }
        if (drag.k === 'pen') { drag.stroke.push(px); paint({ stroke: drag.stroke }); return; }
        if (drag.k === 'rect') { drag.b = snapPt(pc); const [a, b2] = [drag.a, drag.b]; paint({ poly: [a, [b2[0], a[1]], b2, [a[0], b2[1]]], closed: true, label: `${F(Math.abs(b2[0] - a[0]), 2)} × ${F(Math.abs(b2[1] - a[1]), 2)} سم` }); return; }
        if (drag.k === 'circle') { const r = Math.max(st.prec, +rnd(Math.hypot(pc[0] - drag.a[0], pc[1] - drag.a[1])).toFixed(3)); drag.r = r; paint({ circle: { c: drag.a, r }, label: `نق = ${F(r, 2)} سم` }); return; }
        if (drag.k === 'vertex') {
          const np = snapPtExcl(pc, drag.q0);
          net.polys.forEach((p) => p.forEach((q) => { if (Math.abs(q[0] - drag.q0[0]) < 1e-9 && Math.abs(q[1] - drag.q0[1]) < 1e-9) { q[0] = np[0]; q[1] = np[1]; } }));
          drag.q0 = np.slice(); net.gen = null; paint(); renderEditor(); return;
        }
        if (drag.k === 'move' || drag.k === 'movec') {
          const np = [+rnd(pc[0]).toFixed(3), +rnd(pc[1]).toFixed(3)], dx = np[0] - drag.last[0], dy = np[1] - drag.last[1];
          if (!dx && !dy) return;
          drag.last = np;
          if (drag.k === 'move') net.polys[drag.i] = net.polys[drag.i].map(([x, y]) => [+(x + dx).toFixed(3), +(y + dy).toFixed(3)]);
          else { const c = net.circles[drag.i]; c.c = [+(c.c[0] + dx).toFixed(3), +(c.c[1] + dy).toFixed(3)]; }
          net.gen = null; paint();
        }
      });
      const snapPtExcl = (pc, excl) => { let best = null, bd = 10 / st.zs; net.polys.forEach((p) => p.forEach((q) => { if (Math.abs(q[0] - excl[0]) < 1e-9 && Math.abs(q[1] - excl[1]) < 1e-9) return; const d = Math.hypot(q[0] - pc[0], q[1] - pc[1]); if (d < bd) { bd = d; best = q; } })); return best ? best.slice() : [+rnd(pc[0]).toFixed(3), +rnd(pc[1]).toFixed(3)]; };
      const up = () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (d.k === 'pen') {
          const s = d.stroke;
          const r = s.length > 5 ? M.shapeRec.recognize(s, { scale: 1 }) : null;
          if (r && r.obj) {
            const o = r.obj;
            snap(); net.gen = null;
            if (o.type === 'ellipse') { const c = snapPt(toCm([(o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2])); net.circles.push({ c, r: Math.max(st.prec, +rnd(Math.abs(o.x2 - o.x1) / 2 / st.zs).toFixed(3)) }); }
            else { const pts = o.type === 'rect' ? [[o.x1, o.y1], [o.x2, o.y1], [o.x2, o.y2], [o.x1, o.y2]] : o.pts; if (pts && pts.length >= 3 && pts.length <= 8) net.polys.push(pts.map((q) => snapPt(toCm(q)))); else st.hist.pop(); }
          } else M.toast('لم أتعرّف على الوجه — ارسم مضلعاً مغلقاً أو دائرة، أو استخدم أداة المستطيل والمثلث والدائرة', { time: 2500 });
        } else if (d.k === 'rect') {
          const w2 = Math.abs(d.b[0] - d.a[0]), h2 = Math.abs(d.b[1] - d.a[1]);
          if (w2 >= st.prec - 1e-9 && h2 >= st.prec - 1e-9) { snap(); net.gen = null; const x0 = Math.min(d.a[0], d.b[0]), y0 = Math.min(d.a[1], d.b[1]); net.polys.push([[x0, y0], [x0 + w2, y0], [x0 + w2, y0 + h2], [x0, y0 + h2]]); }
        } else if (d.k === 'circle' && d.r) { snap(); net.gen = null; net.circles.push({ c: d.a, r: d.r }); }
        paint(); check(); renderEditor();
      };
      pad.addEventListener('pointerup', up); pad.addEventListener('pointercancel', up);
      pad.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.12 : 0.89); }, { passive: false });

      /* ---- المساعد: يرسم شبكة المجسم بالقياسات الدقيقة ---- */
      const NETABLE = ['cube', 'cuboid', 'triPrism', 'hexPrism', 'sqPyramid', 'tetra', 'cylinder', 'cone'];
      let hk = (S.netPreset && S.netPreset.key) || 'cuboid', hp = (S.netPreset && S.netPreset.params) || M.solids.defaults(hk);
      S.netPreset = null;
      function renderHelper() {
        helper.innerHTML = '';
        helper.appendChild(section('🤖 مساعد رسم الشبكة: اختر المجسم وقياساته وأنا أرسمها بدقة'));
        const chips = chipRow(NETABLE.map((k) => [k, M.solids.SOLIDS[k].name]), (k) => { hk = k; hp = M.solids.defaults(k); renderHelper(); }, 'net-solids');
        M.$$('.chip', chips).forEach((c) => c.classList.toggle('active', c.dataset.k === hk));
        helper.appendChild(chips);
        M.solids.SOLIDS[hk].params.forEach((q) => helper.appendChild(numIn(q.label + ' (سم)', () => hp[q.k], (x) => { hp[q.k] = M.clamp(x, 0.2, 20); }, st.prec)));
        const r = h('div', { class: 'mode-row foot' });
        const b1 = h('button', { class: 'btn sm primary', html: icon('play') + '<span>ارسمها خطوة خطوة</span>' });
        const b2 = h('button', { class: 'btn sm ghost', html: icon('wand') + '<span>ارسمها فوراً</span>' });
        b1.onclick = () => genNet(true); b2.onclick = () => genNet(false);
        r.append(b1, b2); helper.appendChild(r);
      }
      /** أوجه الشبكة بالسنتيمتر مع وصف كل وجه */
      function netFacesOf(key, p) {
        const out = [];
        const polyDesc = (pts) => { const L2 = pts.map((q, i) => Math.hypot(pts[(i + 1) % pts.length][0] - q[0], pts[(i + 1) % pts.length][1] - q[1])); if (pts.length === 4) return `مستطيل ${F(Math.max(L2[0], L2[1]), 2)} × ${F(Math.min(L2[0], L2[1]), 2)} سم`; if (pts.length === 3) return `مثلث أضلاعه ${L2.map((x) => F(x, 2)).join(' ، ')} سم`; return `مضلع ${L(pts.length)} أضلاع طول ضلعه ${F(L2[0], 2)} سم`; };
        if (key === 'cylinder') {
          const W2 = 2 * Math.PI * p.r;
          out.push({ poly: [[0, 2 * p.r], [W2, 2 * p.r], [W2, 2 * p.r + p.h], [0, 2 * p.r + p.h]], desc: `الوجه الجانبي: مستطيل طوله = محيط القاعدة ٢ط نق = ${F(W2, 2)} سم وعرضه ع = ${F(p.h, 2)} سم` });
          out.push({ circle: { c: [p.r, p.r], r: p.r }, desc: `القاعدة العليا: دائرة نق = ${F(p.r, 2)} سم تلامس المستطيل` });
          out.push({ circle: { c: [p.r, 3 * p.r + p.h], r: p.r }, desc: `القاعدة السفلى: دائرة نق = ${F(p.r, 2)} سم` });
          return out;
        }
        if (key === 'cone') {
          const s = Math.hypot(p.r, p.h), th = (2 * Math.PI * p.r) / s;
          out.push({ sector: { c: [s, s], R: s, a0: Math.PI / 2 - th / 2, a1: Math.PI / 2 + th / 2 }, desc: `السطح الجانبي: قطاع دائري نصف قطره = الراسم ل = √(نق² + ع²) = ${F(s, 2)} سم وزاويته = (نق ÷ ل) × ٣٦٠ = ${F((th * 180) / Math.PI, 1)}°` });
          out.push({ circle: { c: [s, s + s + p.r], r: p.r }, desc: `القاعدة: دائرة نق = ${F(p.r, 2)} سم تلامس القوس` });
          return out;
        }
        const faces = M.solids.NETS[key](p);
        faces.forEach((f, i) => out.push({ poly: f.pts.map(([x, z]) => [x, z]), desc: `الوجه ${L(i + 1)}${f.name ? ' (' + f.name + ')' : ''}: ${polyDesc(f.pts)}` }));
        return out;
      }
      function genNet(stepwise) {
        const fs = netFacesOf(hk, hp);
        // إزاحة لتبدأ الشبكة من (١، ١)
        const pts = fs.flatMap((f) => f.poly || (f.circle ? [[f.circle.c[0] - f.circle.r, f.circle.c[1] - f.circle.r]] : [[f.sector.c[0] - f.sector.R, f.sector.c[1] - f.sector.R]]));
        const mx = Math.min(...pts.map((q) => q[0])), my = Math.min(...pts.map((q) => q[1])), dx = 1 - mx, dy = 1 - my;
        const sh = (q) => [+(q[0] + dx).toFixed(4), +(q[1] + dy).toFixed(4)];
        snap(); net.polys = []; net.circles = []; net.sectors = []; st.sel = -1;
        net.gen = { key: hk, params: Object.assign({}, hp) };
        const addF = (f) => { if (f.poly) net.polys.push(f.poly.map(sh)); else if (f.circle) net.circles.push({ c: sh(f.circle.c), r: f.circle.r }); else net.sectors.push(Object.assign({}, f.sector, { c: sh(f.sector.c) })); };
        const all = fs.slice();
        // ملاءمة العرض للشبكة كاملة قبل الرسم
        all.forEach(addF); fitView(); net.polys = []; net.circles = []; net.sectors = [];
        if (!stepwise) { all.forEach(addF); paint(); check(); status.innerHTML += '<br>' + all.map((f) => '• ' + L(f.desc)).join('<br>'); return; }
        let k = 0;
        const next = () => {
          if (k >= all.length || !pad.isConnected) { check(); return; }
          addF(all[k]); paint(); status.innerHTML = `✏️ ${L(all[k].desc)}`; k++;
          setTimeout(next, 1100);
        };
        next();
      }
      function fold() {
        const res = check(); if (!res || !res.ok) return;
        let item;
        if (net.gen) item = { kind: 'snet', key: net.gen.key, params: net.gen.params, name: 'شبكة ' + M.solids.SOLIDS[net.gen.key].name, t: 0 };
        else item = { kind: 'net', name: 'شبكة ' + res.name, polys: net.polys.map((p) => p.map((q) => q.slice())), circles: net.circles.map((c) => ({ c: c.c.slice(), r: c.r })), t: 0 };
        sc.items.push(item);
        cancelAnimationFrame(S.anim);
        const t0 = performance.now();
        draw(true);
        const step = (now) => { const u = Math.min(1, (now - t0) / 2400); item.t = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; draw(false); if (u < 1 && wrap.isConnected) S.anim = requestAnimationFrame(step); else M.toast(`🎉 انطوت الشبكة إلى ${item.name.replace('شبكة ', '')}!`); };
        S.anim = requestAnimationFrame(step);
        setTimeout(() => { if (S && S.wrap === wrap) setTab('solids'); }, 2500);
      }
      /** نقل الشبكة إلى السبورة: ١ سم = وحدة السبورة */
      function toBoard() {
        const bd = B(), u = bd.unit, [vx, vy] = bd.viewCenter();
        const all = net.polys.flat().concat(net.circles.map((c) => c.c)).concat(net.sectors.map((s) => s.c));
        if (!all.length) return M.toast('اللوح فارغ', { type: 'warn' });
        const cx = (Math.min(...all.map((q) => q[0])) + Math.max(...all.map((q) => q[0]))) / 2, cy = (Math.min(...all.map((q) => q[1])) + Math.max(...all.map((q) => q[1]))) / 2;
        const P = (q) => [vx + (q[0] - cx) * u, vy + (q[1] - cy) * u];
        const out = [];
        const cols = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
        net.polys.forEach((p, i) => {
          out.push({ type: 'poly', pts: p.map(P), color: cols[i % cols.length], width: 2.5, fill: true });
          const cen = p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]);
          p.forEach((q, j) => { const r2 = p[(j + 1) % p.length], m = P([(q[0] + r2[0]) / 2, (q[1] + r2[1]) / 2]), c = P(cen); const d = Math.hypot(m[0] - c[0], m[1] - c[1]) || 1; out.push({ type: 'text', x: m[0] + ((m[0] - c[0]) / d) * 14 + 16, y: m[1] + ((m[1] - c[1]) / d) * 14 - 9, text: M.loc(lenTxt(q, r2)), size: 14, color: 'c0' }); });
        });
        net.circles.forEach((c) => { const [x, y] = P(c.c), r = c.r * u; out.push({ type: 'ellipse', x1: x - r, y1: y - r, x2: x + r, y2: y + r, color: 'c4', width: 2.5, fill: true }, { type: 'text', x: x + 30, y: y - 8, text: M.loc(`نق = ${F(c.r, 2)}`), size: 14, color: 'c0' }); });
        net.sectors.forEach((s) => { const pts = [P(s.c)]; for (let k = 0; k <= 40; k++) { const a = s.a0 + ((s.a1 - s.a0) * k) / 40; pts.push(P([s.c[0] + s.R * Math.cos(a), s.c[1] + s.R * Math.sin(a)])); } out.push({ type: 'poly', pts, color: 'c1', width: 2.5, fill: true }); });
        exit();
        bd.commit(); out.forEach((o) => { o.id = uid(); bd.objects.push(o); }); bd.changed();
        M.toast('✓ نُقلت الشبكة إلى السبورة: كل ١ سم = وحدة واحدة على الشبكة');
      }
      renderHelper();
      if (!net.polys.length && !net.circles.length) fitView(); else paint();
      check(); renderEditor();
      if (S.autoNet) { S.autoNet = false; genNet(true); }
    }

    if (preset.solid) sc.items.push({ kind: 'solid', key: preset.solid, name: M.solids.SOLIDS[preset.solid].name, params: M.solids.defaults(preset.solid) });
    if (preset.add) [].concat(preset.add).forEach((t) => { try { const o = S3().parse(t); o.id = uid(); o.on = true; o.color = COLS[sc.objs.length % COLS.length]; sc.objs.push(o); } catch (e) { /* */ } });
    renderPane();
    draw(true);
  }
  function close() { document.body.classList.remove('in-space'); if (S) { cancelAnimationFrame(S.anim); S.v.destroy(); S.wrap.remove(); S = null; } }
  function exit() { close(); const b = B(); if (b.page.bg === 'space3d') b.setBackground(b.page.prevBg && b.page.prevBg !== 'space3d' ? b.page.prevBg : 'grid'); }

  M.space3d = { open, close, exit, isOpen: () => !!S, sceneOf, buildScene, _S: () => S };
})();
