/* ==========================================================================
   تحويل شبكة مرسومة على السبورة إلى مجسم ثلاثي الأبعاد:
   ١) إيجاد الأحرف المشتركة بين الأوجه المرسومة
   ٢) التعرّف على نوع المجسم من الأوجه (مكعب، متوازي مستطيلات، منشور، هرم،
      رباعي الأوجه، ثماني الأوجه، أسطوانة)
   ٣) طيّ الشبكة كما رسمها المستخدم تماماً (أي ترتيب صحيح للأوجه) بزاوية بين
      كل وجهين = الزاوية بين عموديهما في المجسم
   ٤) التحقق من أن الشبكة تنغلق فعلاً (وإلا نشرح السبب)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const PI = Math.PI;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const shoelaceSigned = (p) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
  const centroid = (p) => p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
  const med = (a) => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)] || 0; };

  /** تصنيف وجه مضلع */
  function faceInfo(pts) {
    const n = pts.length, s = pts.map((p, i) => dist(p, pts[(i + 1) % n]));
    const eq = Math.max(...s) / Math.min(...s) < 1.15;
    return { n, sides: s, eq, area: Math.abs(shoelaceSigned(pts)) };
  }

  /** الأحرف المشتركة: لكل زوج من الأوجه نبحث عن ضلعين متطابقين الطرفين */
  function adjacency(faces, tol) {
    const adj = faces.map(() => []);
    for (let a = 0; a < faces.length; a++) for (let b = a + 1; b < faces.length; b++) {
      const A = faces[a], B = faces[b];
      let found = null;
      for (let i = 0; i < A.length && !found; i++) {
        const p = A[i], q = A[(i + 1) % A.length];
        for (let j = 0; j < B.length && !found; j++) {
          const r = B[j], s = B[(j + 1) % B.length];
          if ((dist(p, s) < tol && dist(q, r) < tol) || (dist(p, r) < tol && dist(q, s) < tol)) found = { ea: [i, (i + 1) % A.length], eb: [j, (j + 1) % B.length] };
        }
      }
      if (found) { adj[a].push({ to: b, mine: found.ea, theirs: found.eb }); adj[b].push({ to: a, mine: found.eb, theirs: found.ea }); }
    }
    return adj;
  }

  /* ---------------- أنواع المجسمات ---------------- */
  // زاوية الطي بين وجهين = الزاوية بين العموديين الخارجيين في المجسم
  function solidType(infos) {
    const cnt = {}; infos.forEach((f) => (cnt[f.n] = (cnt[f.n] || 0) + 1));
    const total = infos.length;
    const tris = cnt[3] || 0, quads = cnt[4] || 0;
    const kinds = Object.keys(cnt).map(Number);
    // منشور: k أوجه رباعية + وجهان k-ضلعياً (k = 4 ⇐ متوازي مستطيلات/مكعب)
    if (quads === 6 && total === 6) {
      const allSq = infos.every((f) => f.eq);
      return { key: allSq ? 'cube' : 'cuboid', name: allSq ? 'مكعب' : 'متوازي مستطيلات', fold: () => PI / 2, vef: [8, 12, 6] };
    }
    for (const k of kinds) {
      if (k === 4 || k < 3) continue;
      if (cnt[k] === 2 && quads === k && total === k + 2) {
        const nm = { 3: 'منشور ثلاثي', 5: 'منشور خماسي', 6: 'منشور سداسي', 7: 'منشور سباعي', 8: 'منشور ثماني' }[k] || `منشور ${k}`;
        return { key: 'prism' + k, name: nm, k, fold: (fa, fb) => (fa.n === 4 && fb.n === 4 ? (2 * PI) / k : PI / 2), vef: [2 * k, 3 * k, k + 2] };
      }
    }
    if (tris === 4 && total === 4) return { key: 'tetra', name: 'هرم ثلاثي (رباعي الأوجه)', fold: () => Math.acos(-1 / 3), vef: [4, 6, 4], regularTri: true };
    if (tris === 8 && total === 8) return { key: 'octa', name: 'ثماني الأوجه المنتظم', fold: () => Math.acos(1 / 3), vef: [6, 12, 8], regularTri: true };
    // هرم: قاعدة k-ضلعية + k مثلثات
    for (const k of kinds) {
      if (k < 3) continue;
      if (k !== 3 && cnt[k] === 1 && tris === k && total === k + 1) {
        const nm = { 4: 'هرم رباعي', 5: 'هرم خماسي', 6: 'هرم سداسي' }[k] || `هرم ${k}`;
        return { key: 'pyramid' + k, name: nm, k, pyramid: true, vef: [k + 1, 2 * k, k + 1] };
      }
    }
    return null;
  }

  /**
   * polys: مضلعات بإحداثيات السبورة. circles: [{c:[x,y], r}] للأسطوانة. unit: طول الوحدة
   * يعيد { ok, name, key, faces(for foldNet), vef, area, message? }
   */
  function detect(polys, opts) {
    opts = opts || {};
    const u = opts.unit || 40;
    const circles = (opts.circles || []).map((c) => ({ c: [c.c[0] / u, c.c[1] / u], r: c.r / u }));
    let faces = polys.map((p) => p.map(([x, y]) => [x / u, y / u]));
    // أسطوانة: مستطيل + دائرتان
    if (circles.length === 2 && faces.length === 1 && faces[0].length === 4) return cylinder(faces[0], circles);
    if (circles.length && faces.length) return { ok: false, message: 'الشبكة تحتوي دوائر ومضلعات بعدد لا يطابق مجسماً أعرفه (الأسطوانة = مستطيل ودائرتان).' };
    if (faces.length < 4) return { ok: false, message: 'حدّد أوجه الشبكة كلها (أربعة أوجه على الأقل).' };
    // توحيد الاتجاه (عكس عقارب الساعة) لتتوافق الأحرف المشتركة
    faces = faces.map((p) => (shoelaceSigned(p) < 0 ? p.slice().reverse() : p));
    const infos = faces.map(faceInfo);
    const edge = med(infos.flatMap((f) => f.sides));
    const adj = adjacency(faces, Math.max(0.12 * edge, opts.tol || 0));
    // الاتصال
    const seen = new Set([0]), stack = [0];
    while (stack.length) { const a = stack.pop(); adj[a].forEach((e) => { if (!seen.has(e.to)) { seen.add(e.to); stack.push(e.to); } }); }
    if (seen.size !== faces.length) return { ok: false, message: 'بعض أوجه الشبكة غير ملتصقة ببقيتها — ارسم الأوجه بحيث يشترك كل وجه في ضلع كامل مع جاره.' };
    const type = solidType(infos);
    if (!type) return { ok: false, message: `لم أتعرّف على مجسم بهذه الأوجه (${describe(infos)}).` };
    // زوايا الطي للهرم من أبعاده المرسومة
    if (type.pyramid) {
      const bi = infos.findIndex((f) => f.n === type.k);
      const baseSide = med(infos[bi].sides), ap = baseSide / (2 * Math.tan(PI / type.k));
      // الارتفاع الجانبي = ارتفاع المثلث على ضلع القاعدة
      const slants = infos.map((f, i) => (f.n === 3 ? (2 * f.area) / baseSide : null)).filter((x) => x != null);
      const s = med(slants);
      if (s <= ap * 1.02) return { ok: false, message: 'المثلثات قصيرة جداً فلا تلتقي رؤوسها — اجعل ارتفاع المثلث أكبر من نصف ضلع القاعدة.' };
      const H = Math.sqrt(s * s - ap * ap);
      const nb = [0, -1, 0], nl = (phi) => { const v = [H * Math.cos(phi), ap, H * Math.sin(phi)], l = Math.hypot(...v); return v.map((x) => x / l); };
      const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
      const baseLat = ang(nb, nl(0)), latLat = ang(nl(0), nl((2 * PI) / type.k));
      type.fold = (fa, fb) => (fa.n === 3 && fb.n === 3 ? latLat : baseLat);
      type.height = H;
    }
    // شجرة الطي: الجذر أكثر الأوجه جيراناً (وللهرم: القاعدة)
    let root = 0;
    if (type.pyramid) root = infos.findIndex((f) => f.n === type.k);
    else faces.forEach((_, i) => { if (adj[i].length > adj[root].length) root = i; });
    const order = [root], parent = { [root]: -1 }, hinge = {};
    for (let q = 0; q < order.length; q++) {
      const a = order[q];
      adj[a].forEach((e) => { if (!(e.to in parent)) { parent[e.to] = a; hinge[e.to] = e.theirs; order.push(e.to); } });
    }
    const idx = {}; order.forEach((f, i) => (idx[f] = i));
    const netFaces = order.map((f) => ({ pts: faces[f], parent: parent[f] < 0 ? -1 : idx[parent[f]], hinge: hinge[f], fold: parent[f] < 0 ? 0 : type.fold(infos[parent[f]], infos[f]), color: (M.solids && M.solids.COLORS[idx[f] % M.solids.COLORS.length]) }));
    // التحقق من الانغلاق
    const folded = M.solids.foldNet(netFaces, 1);
    const tolV = 0.1 * edge;
    const verts = []; folded.forEach((f, fi) => f.p.forEach((p) => verts.push([p, fi])));
    const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const openV = verts.filter(([p, fi]) => new Set(verts.filter(([q]) => d3(p, q) < tolV).map(([, g]) => g)).size < 3).length;
    const cents = folded.map((f) => f.p.reduce((a, p) => [a[0] + p[0] / f.p.length, a[1] + p[1] / f.p.length, a[2] + p[2] / f.p.length], [0, 0, 0]));
    let overlap = false;
    for (let i = 0; i < cents.length; i++) for (let j = i + 1; j < cents.length; j++) if (d3(cents[i], cents[j]) < 0.15 * edge) overlap = true;
    const area = infos.reduce((s, f) => s + f.area, 0);
    const res = { ok: !openV && !overlap, key: type.key, name: type.name, faces: netFaces, vef: type.vef, area, edge, height: type.height };
    if (overlap) res.message = `هذا الترتيب لا يصنع ${type.name}: عند الطي يقع وجهان فوق بعضهما ويبقى جانب مفتوح. جرّب ترتيباً آخر للأوجه!`;
    else if (openV) res.message = `الأوجه لا تلتقي تماماً عند الطي — تأكد أن أطوال الأضلاع المتلاقية متساوية.`;
    if (res.ok) res.volume = meshVolume(folded);
    return res;
  }
  function describe(infos) {
    const nm = { 3: 'مثلث', 4: 'رباعي', 5: 'خماسي', 6: 'سداسي' };
    const cnt = {}; infos.forEach((f) => (cnt[f.n] = (cnt[f.n] || 0) + 1));
    return Object.entries(cnt).map(([n, c]) => `${M.loc(c)} ${nm[n] || n + ' أضلاع'}`).join('، ');
  }
  function meshVolume(faces) {
    const all = faces.flatMap((f) => f.p), c = all.reduce((a, q) => [a[0] + q[0] / all.length, a[1] + q[1] / all.length, a[2] + q[2] / all.length], [0, 0, 0]);
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    let V = 0;
    faces.forEach((f) => { for (let i = 1; i + 1 < f.p.length; i++) { const a = sub(f.p[0], c), b = sub(f.p[i], c), d = sub(f.p[i + 1], c), x = cross(b, d); V += Math.abs(a[0] * x[0] + a[1] * x[1] + a[2] * x[2]) / 6; } });
    return V;
  }
  function cylinder(rect, circles) {
    const s = [dist(rect[0], rect[1]), dist(rect[1], rect[2])];
    const r = (circles[0].r + circles[1].r) / 2;
    const circ = 2 * PI * r;
    const [W, H] = Math.abs(s[0] - circ) < Math.abs(s[1] - circ) ? [s[0], s[1]] : [s[1], s[0]];
    if (Math.abs(W - circ) / circ > 0.25) return { ok: false, message: `لتصبح أسطوانة يجب أن يساوي طول المستطيل محيط الدائرة: ٢ط نق ≈ ${M.fmt(circ, 2)} ، لكنه ${M.fmt(W, 2)}.` };
    return { ok: true, key: 'cylinder', name: 'أسطوانة', cylinder: { r, h: H }, area: W * H + 2 * PI * r * r, volume: PI * r * r * H, vef: null };
  }
  /** أوجه الشبكة مطوية بنسبة t */
  function foldAt(res, t) {
    if (res.cylinder) return M.solids.netFaces('cylinder', res.cylinder, t);
    return M.solids.foldNet(res.faces, t);
  }

  M.netFold = { detect, foldAt, adjacency };
})();
