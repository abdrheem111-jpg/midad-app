/* ==========================================================================
   التعرّف على الكتابة اليدوية الرياضية (دون إنترنت)
   - مصنّف بالجيران الأقرب على صور مُنعّمة للرموز (قوالب من هياكل حروف ١١ خطاً
     + أمثلة خط المستخدم التي يتعلّمها التطبيق)
   - تجزئة الخطوط إلى رموز بالبرمجة الديناميكية
   - تحليل التخطيط: الكسور، الأسس، الجذور، = و ÷، الأسطر، والاتجاه العربي
   ========================================================================== */
(function () {
  'use strict';
  const M = (window.M = window.M || {});
  const G = 20; // دقة الشبكة
  const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const isArDigit = (c) => AR_DIGITS.includes(c);
  const isWDigit = (c) => /^[0-9]$/.test(c);
  const isDigit = (c) => isArDigit(c) || isWDigit(c);
  const toW = (c) => (isArDigit(c) ? String(AR_DIGITS.indexOf(c)) : c);
  const MODE_LABELS = {
    arabic: ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '+', '-', '×', '÷', '=', '(', ')', '/', '<', '>', '√', 'س', 'ص', '٫'],
    western: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '×', '÷', '=', '(', ')', '/', '<', '>', '√', 'x', 'y'],
  };

  /* ---------------- الهندسة المساعدة ---------------- */
  function bboxOf(strokes) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of strokes) for (const [x, y] of s) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    let dm = 0, idx = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]; const L = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > dm) { dm = d; idx = i; } }
    if (dm > eps) { const a = rdp(pts.slice(0, idx + 1), eps), b2 = rdp(pts.slice(idx), eps); return a.slice(0, -1).concat(b2); }
    return [pts[0], pts[pts.length - 1]];
  }
  /** مجموع أطوال المقاطع شبه الرأسية مقابل البقية (يتحمّل انحناء الساق والشرطة العلوية) */
  function stemInfo(s) {
    const b = bboxOf([s]);
    const simp = rdp(s, Math.max(b.w, b.h) * 0.05);
    let vert = 0, other = 0;
    for (let i = 1; i < simp.length; i++) {
      const dx = simp[i][0] - simp[i - 1][0], dy = simp[i][1] - simp[i - 1][1];
      const L2 = Math.hypot(dx, dy);
      let ang = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI); if (ang > 90) ang = 180 - ang;
      if (ang > 65) vert += L2; else other += L2;
    }
    // انحناء الجزء السفلي (يميّز القوس عن الخط المستقيم) وموقع الشرطة
    const topP = s.reduce((a, p) => (p[1] < a[1] ? p : a)), botP = s.reduce((a, p) => (p[1] > a[1] ? p : a));
    const L = Math.hypot(botP[0] - topP[0], botP[1] - topP[1]) || 1;
    let bow = 0, flagLow = 0;
    for (const p of s) {
      if (p[1] > b.y0 + b.h * 0.25) {
        const d = Math.abs((botP[0] - topP[0]) * (topP[1] - p[1]) - (topP[0] - p[0]) * (botP[1] - topP[1])) / L;
        if (d > bow) bow = d;
      }
    }
    for (let i = 1; i < simp.length; i++) {
      const dx = simp[i][0] - simp[i - 1][0], dy = simp[i][1] - simp[i - 1][1];
      let ang = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI); if (ang > 90) ang = 180 - ang;
      if (ang <= 65 && Math.min(simp[i][1], simp[i - 1][1]) > b.y0 + b.h * 0.35) flagLow += Math.hypot(dx, dy);
    }
    return { vert, other, b, bow: bow / (b.h || 1), flagLow };
  }
  function pathLen(s) { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; }
  function straightness(s) {
    const [ax, ay] = s[0], [bx, by] = s[s.length - 1];
    const L = Math.hypot(bx - ax, by - ay) || 1;
    let dev = 0;
    for (const [x, y] of s) dev = Math.max(dev, Math.abs((bx - ax) * (ay - y) - (ax - x) * (by - ay)) / L);
    return { dev: dev / L, chord: L, len: pathLen(s), ang: Math.atan2(by - ay, bx - ax) };
  }

  /* ---------------- استخراج السمات ---------------- */
  // صورة مُنعّمة ٢٠×٢٠ + أربع قنوات لاتجاه الخط (٠° ، ٤٥° ، ٩٠° ، ١٣٥°) بدقة ١٠×١٠
  const D = 10;
  function splatTo(grid, n, x, y, w) {
    const gx = (x + 0.5) * (n - 3) + 1, gy = (y + 0.5) * (n - 3) + 1;
    const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy;
    const add = (i, j, q) => { if (i >= 0 && j >= 0 && i < n && j < n) grid[j * n + i] += q * w; };
    add(ix, iy, (1 - fx) * (1 - fy)); add(ix + 1, iy, fx * (1 - fy)); add(ix, iy + 1, (1 - fx) * fy); add(ix + 1, iy + 1, fx * fy);
  }
  function blurN(grid, n) {
    const t = new Float32Array(n * n), o = new Float32Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; t[i] = (grid[i] * 2 + (x > 0 ? grid[i - 1] : 0) + (x < n - 1 ? grid[i + 1] : 0)) / 4; }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x; o[i] = (t[i] * 2 + (y > 0 ? t[i - n] : 0) + (y < n - 1 ? t[i + n] : 0)) / 4; }
    return o;
  }
  function unit(v) { let m = 0; for (let i = 0; i < v.length; i++) { v[i] = Math.sqrt(Math.max(0, v[i])); m += v[i] * v[i]; } m = Math.sqrt(m) || 1; for (let i = 0; i < v.length; i++) v[i] /= m; return v; }
  /** تطبيع خطوط مجموعة: مركز في الأصل ومقياس بأكبر بُعد */
  function normStrokes(strokes) {
    const b = bboxOf(strokes);
    const sc = Math.max(b.w, b.h) || 1;
    return { strokes: strokes.map((s) => s.map(([x, y]) => [(x - b.cx) / sc, (y - b.cy) / sc])), aspect: (b.w || 1e-3) / (b.h || 1e-3), bbox: b };
  }
  function densifyStroke(s) {
    if (s.length === 1) return [s[0]];
    const out = [];
    for (let i = 1; i < s.length; i++) {
      const [ax, ay] = s[i - 1], [bx, by] = s[i];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.015));
      for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    }
    out.push(s[s.length - 1]);
    return out;
  }
  function densify(strokes) { return strokes.flatMap(densifyStroke); }
  /** السمات من خطوط مطبّعة */
  function featNorm(nstrokes) {
    const img = new Float32Array(G * G);
    const dir = [0, 1, 2, 3].map(() => new Float32Array(D * D));
    for (const s of nstrokes) {
      const d = densifyStroke(s);
      for (let i = 0; i < d.length; i++) {
        splatTo(img, G, d[i][0], d[i][1], 1);
        if (i > 0) {
          const dx = d[i][0] - d[i - 1][0], dy = d[i][1] - d[i - 1][1];
          if (!dx && !dy) continue;
          let th = Math.atan2(dy, dx); if (th < 0) th += Math.PI; if (th >= Math.PI) th -= Math.PI;
          for (let k = 0; k < 4; k++) {
            let df = Math.abs(th - (k * Math.PI) / 4); if (df > Math.PI / 2) df = Math.PI - df;
            const wgt = Math.max(0, Math.cos(df * 2));
            if (wgt > 0.01) splatTo(dir[k], D, (d[i][0] + d[i - 1][0]) / 2, (d[i][1] + d[i - 1][1]) / 2, wgt);
          }
        }
      }
    }
    const I = unit(blurN(blurN(img, G), G));
    const dcat = new Float32Array(4 * D * D);
    dir.forEach((g, k) => dcat.set(blurN(g, D), k * D * D));
    return { img: I, dir: unit(dcat) };
  }
  function featFromStrokes(strokes) {
    const n = normStrokes(strokes);
    const f = featNorm(n.strokes);
    return { img: f.img, dir: f.dir, aspect: n.aspect, bbox: n.bbox };
  }

  /* ---------------- قاعدة القوالب ---------------- */
  let DB = null;
  function transformStrokes(strokes, rot, shx, sy) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const t = strokes.map((st) => st.map(([x, y]) => { const X = x + shx * y, Y = y * sy; return [X * c - Y * s, X * s + Y * c]; }));
    return normStrokes(t);
  }
  const AUG = [[0, 0, 1], [0.12, 0, 1], [-0.12, 0, 1], [0, 0.22, 1], [0, -0.22, 1], [0, 0, 0.8], [0, 0, 1.22], [0.08, -0.15, 0.9], [-0.06, 0.15, 1.1]];
  function addTemplate(label, strokes, weight, augs, extra) {
    for (const [r, sh, sy] of augs) {
      const t = transformStrokes(strokes, r, sh, sy);
      const f = featNorm(t.strokes);
      DB.push(Object.assign({ label, img: f.img, dir: f.dir, aspect: t.aspect, w: weight }, extra || {}));
    }
  }
  function buildDB() {
    DB = [];
    for (const src of [M.inkData || {}, M.inkHand || {}]) {
      for (const [label, list] of Object.entries(src)) for (const [, paths] of list) addTemplate(label, paths, src === M.inkHand ? 1.05 : 1, AUG);
    }
    const user = (M.store && M.store.get('inkUser', {})) || {};
    for (const [label, list] of Object.entries(user)) for (const strokes of list) addTemplate(label, strokes, 1.25, [[0, 0, 1], [0.07, 0, 1], [-0.07, 0, 1], [0, 0.12, 1]], { user: true });
    return DB;
  }

  /* ---------------- التصنيف ---------------- */
  function classify(strokes, opts) {
    if (!DB) buildDB();
    const allowed = new Set(opts.labels);
    const { img, dir, aspect, bbox } = featFromStrokes(strokes);
    const la = Math.log(aspect);
    const scored = [];
    for (const t of DB) {
      if (!allowed.has(t.label)) continue;
      let d1 = 0, d2 = 0; const ti = t.img, td = t.dir;
      for (let i = 0; i < ti.length; i++) d1 += ti[i] * img[i];
      for (let i = 0; i < td.length; i++) d2 += td[i] * dir[i];
      const s = (0.45 * d1 + 0.55 * d2) * t.w - 0.1 * Math.abs(Math.log(t.aspect) - la);
      scored.push([s, t.label]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    const votes = {};
    scored.slice(0, 7).forEach(([s, l], i) => { votes[l] = (votes[l] || 0) + s * (1 - i * 0.08); });
    const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    const best = ranked[0];
    const top = scored.find((x) => x[1] === best[0]);
    return { label: best[0], score: top ? top[0] : 0, alts: ranked.slice(1, 4).map((r) => r[0]), bbox };
  }

  /** قواعد هندسية للرموز البسيطة (أدق من المصنّف لها) */
  function ruleSymbol(strokes, H, opts) {
    const b = bboxOf(strokes);
    const size = Math.max(b.w, b.h);
    const ar = opts.mode === 'arabic';
    if (strokes.length === 1 || size < H * 0.2) {
      if (size < H * 0.22) {
        // نقطة صغيرة: صفر عربي أو فاصلة عشرية
        const s = strokes[0];
        const st = s.length > 2 ? straightness(s) : { dev: 0, chord: 0 };
        if (ar && st.chord > size * 0.7 && b.h > b.w * 1.3 && size > H * 0.12) return { label: '٫', score: 0.9 };
        return { label: ar ? '٠' : '.', score: 0.95, dot: true };
      }
    }
    if (strokes.length === 1) {
      const s = strokes[0];
      // خط رأسي طويل (قد يكون منحنياً قليلاً أو بشرطة صغيرة في الأعلى): ١ أو 1
      const si = stemInfo(s);
      if (si.vert > b.h * 0.85 && si.other < b.h * 0.26 && si.flagLow < b.h * 0.05 && si.bow < 0.07 && b.w < b.h * 0.34 && b.h > H * 0.4) return { label: ar ? '١' : '1', score: 0.9, vline: true };
      const st = straightness(s);
      if (st.dev < 0.09 && st.chord > H * 0.25) {
        let a = Math.abs((st.ang * 180) / Math.PI); if (a > 90) a = 180 - a; // ٠ = أفقي ، ٩٠ = رأسي
        if (a < 20) return { label: '-', score: 0.95, hline: true };
        if (a > 68) return { label: ar ? '١' : '1', score: 0.9, vline: true };
        if (a > 25 && a < 65 && !ar) return { label: '/', score: 0.8 };
        if (a > 25 && a < 65 && ar && a < 60) return { label: '/', score: 0.75 };
      }
    }
    return null;
  }

  /** تمييز بنيوي بين الرموز المتشابهة (أسنان ٣/٢، حلقة ص/س، ذراع الجذر) */
  function refine(r, grp, H, opts) {
    const n = normStrokes(grp);
    const pts = densify(n.strokes);
    const top = Math.min(...pts.map((p) => p[1])), bot = Math.max(...pts.map((p) => p[1]));
    const hgt = bot - top || 1;
    // عدد التعرجات في الجزء العلوي
    const zig = () => {
      const thr = 0.065;
      let rev = 0, dirY = 0, ext = null;
      for (const s of n.strokes) {
        const d = densifyStroke(s).filter((p) => p[1] < top + hgt * 0.42);
        for (let i = 1; i < d.length; i++) {
          const dy = d[i][1] - d[i - 1][1];
          if (Math.abs(dy) < 1e-6) continue;
          const sgn = Math.sign(dy);
          if (!dirY) { dirY = sgn; ext = d[i][1]; continue; }
          // تغيّر الاتجاه يُحسب فقط إذا ابتعد عن آخر قمة/قاع بمقدار كافٍ (تجاهل الاهتزاز)
          if (sgn === dirY) { if ((dirY > 0 && d[i][1] > ext) || (dirY < 0 && d[i][1] < ext)) ext = d[i][1]; }
          else if (Math.abs(d[i][1] - ext) > thr) { rev++; dirY = sgn; ext = d[i][1]; }
        }
      }
      return rev;
    };
    const hasLoop = () => {
      for (const s of n.strokes) {
        const d = densifyStroke(s);
        for (let i = 0; i < d.length; i++) for (let j = i + 12; j < d.length; j++) {
          if (Math.hypot(d[i][0] - d[j][0], d[i][1] - d[j][1]) > 0.05 || d[i][0] < -0.2) continue;
          const seg = d.slice(i, j + 1);
          const w = Math.max(...seg.map((p) => p[0])) - Math.min(...seg.map((p) => p[0])), hh = Math.max(...seg.map((p) => p[1])) - Math.min(...seg.map((p) => p[1]));
          if (w > 0.2 && hh > 0.12) return true;
        }
      }
      return false;
    };
    const topBar = () => {
      // خط أفقي طويل في الأعلى
      for (const s of n.strokes) {
        const d = densifyStroke(s);
        let run = 0, best = 0;
        for (let i = 1; i < d.length; i++) {
          const dx = d[i][0] - d[i - 1][0], dy = d[i][1] - d[i - 1][1];
          if (Math.abs(dy) < Math.abs(dx) * 0.3 && d[i][1] < top + hgt * 0.25) { run += Math.abs(dx); best = Math.max(best, run); } else run = 0;
        }
        if (best > 0.38) return true;
      }
      return false;
    };
    /** وجود حلقة مغلقة ضمن نطاق رأسي معيّن (نسبة من الارتفاع) */
    const loopIn = (y0f, y1f) => {
      for (const st of n.strokes) {
        const d = densifyStroke(st);
        for (let i = 0; i < d.length; i++) for (let j = i + 10; j < d.length; j++) {
          if (Math.hypot(d[i][0] - d[j][0], d[i][1] - d[j][1]) > 0.06) continue;
          const seg = d.slice(i, j + 1);
          const ys = seg.map((p) => p[1]), xs = seg.map((p) => p[0]);
          const sy0 = Math.min(...ys), sy1 = Math.max(...ys);
          if (Math.max(...xs) - Math.min(...xs) > 0.2 && sy1 - sy0 > 0.15 && (sy0 + sy1) / 2 > top + hgt * y0f && (sy0 + sy1) / 2 < top + hgt * y1f) return true;
        }
      }
      return false;
    };
    const hSeg = () => {
      let best = 0;
      for (const st of n.strokes) {
        const sp = rdp(st, 0.05);
        for (let i = 1; i < sp.length; i++) {
          const dx = sp[i][0] - sp[i - 1][0], dy = sp[i][1] - sp[i - 1][1];
          if (Math.abs(dy) < Math.abs(dx) * 0.36) best = Math.max(best, Math.abs(dx));
        }
      }
      return best;
    };
    const L = r.label;
    const allow = (x) => opts.labels.includes(x);
    if ((L === '6' || L === '8') && allow('8')) r.label = loopIn(0, 0.5) && loopIn(0.5, 1) ? '8' : '6';
    if ((L === '4' || L === 'y') && allow('4')) {
      const w = Math.max(...pts.map((p) => p[0])) - Math.min(...pts.map((p) => p[0]));
      r.label = hSeg() > w * 0.5 ? '4' : 'y';
    }
    if ((L === '٢' || L === '٣') && allow('٣')) {
      // ٢ له سنّ واحدة (انعكاسان)، و٣ له سنّان (٤ انعكاسات)؛ عند ٣ انعكاسات نثق بالمصنّف
      const z = zig();
      r.label = z >= 4 ? '٣' : z <= 2 ? '٢' : L;
    }
    if ((L === 'س' || L === 'ص') && allow('ص')) r.label = hasLoop() ? 'ص' : 'س';
    if (['٢', '٤', '٧', '7', '√', '2', '٣', 'ص'].includes(L) && allow('√') && topBar() && n.aspect > 0.7) {
      const pts2 = densify(n.strokes);
      const lowPt = pts2.reduce((a, b) => (b[1] > a[1] ? b : a));
      if (lowPt[0] < 0.1) r.label = '√';
    }
    return r;
  }

  /** هل الخط رأسي (مع السماح بشرطة صغيرة)؟ */
  function isVertical(s) {
    const si = stemInfo(s);
    return si.vert > si.b.h * 0.82 && si.other < si.b.h * 0.3 && si.bow < 0.08 && si.b.w < si.b.h * 0.4;
  }
  function isClosedCurve(s) {
    const b = bboxOf([s]);
    const sz = Math.max(b.w, b.h) || 1;
    const [ax, ay] = s[0], [bx, by] = s[s.length - 1];
    return Math.hypot(ax - bx, ay - by) < sz * 0.35 && pathLen(s) > sz * 2.2;
  }
  /** قواعد الرموز ذات الخطين المستقيمين: = و + و × ، و١ بقاعدة ، و٩ بحلقة وساق */
  function pairRule(grp, H, opts) {
    const bx = grp.map((s) => bboxOf([s]));
    // ١ أو 1 بقاعدة: خط رأسي وشرطة قصيرة أسفله
    for (const [v, h] of [[0, 1], [1, 0]]) {
      const hb = bx[h], vb = bx[v];
      if (isVertical(grp[v]) && hb.h < hb.w * 0.4 && hb.w < vb.h * 0.75 && Math.abs(hb.cy - vb.y1) < H * 0.15 && vb.cx > hb.x0 - H * 0.1 && vb.cx < hb.x1 + H * 0.1) return { label: opts.mode === 'arabic' ? '١' : '1', score: 0.9 };
      // ٩ أو 9: حلقة مغلقة في أعلى ساق رأسية ملاصقة لها
      if (isVertical(grp[v]) && isClosedCurve(grp[h]) && hb.cy < vb.cy && hb.y1 < vb.y1 - vb.h * 0.25 && Math.abs((hb.x1 + hb.x0) / 2 - vb.cx) < hb.w * 0.8 && hb.x1 > vb.x0 - H * 0.1 && hb.x0 < vb.x1 + H * 0.1) return { label: opts.mode === 'arabic' ? '٩' : '9', score: 0.9 };
    }
    const st = grp.map((s) => (s.length > 1 ? straightness(s) : null));
    if (st.some((x) => !x || x.dev > 0.14 || x.chord < H * 0.18)) return null;
    const ang = st.map((x) => { let a = Math.abs((x.ang * 180) / Math.PI); return a > 90 ? 180 - a : a; });
    const [b1, b2] = grp.map((s) => bboxOf([s]));
    const xo = (Math.min(b1.x1, b2.x1) - Math.max(b1.x0, b2.x0)) / Math.max(1, Math.min(b1.w, b2.w));
    const yo = Math.min(b1.y1, b2.y1) - Math.max(b1.y0, b2.y0);
    if (ang[0] < 22 && ang[1] < 22 && xo > 0.45 && Math.abs(b1.cy - b2.cy) > H * 0.12 && Math.abs(b1.cy - b2.cy) < H * 0.8) return { label: '=', score: 0.97 };
    const hv = (ang[0] < 25 && ang[1] > 62) || (ang[1] < 25 && ang[0] > 62);
    if (hv && xo > 0.2 && yo > -H * 0.05) {
      // يجب أن يتقاطعا قرب المنتصف
      const hb = ang[0] < 25 ? b1 : b2, vb = ang[0] < 25 ? b2 : b1;
      if (vb.cx > hb.x0 && vb.cx < hb.x1 && hb.cy > vb.y0 && hb.cy < vb.y1) return { label: '+', score: 0.96 };
    }
    const diag = ang.every((a) => a > 25 && a < 65);
    if (diag) {
      const s1 = Math.sign(Math.tan(st[0].ang)), s2 = Math.sign(Math.tan(st[1].ang));
      // يجب أن يتقاطعا قرب منتصف كل منهما (يميّز × عن y)
      const seg = (st2, g) => [g[0], g[g.length - 1]];
      const [p1, p2] = seg(st[0], grp[0]), [p3, p4] = seg(st[1], grp[1]);
      const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
      if (Math.abs(d) > 1e-9) {
        const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
        const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
        if (s1 !== s2 && t > 0.22 && t < 0.78 && u > 0.22 && u < 0.78) return { label: '×', score: 0.95 };
      }
    }
    return null;
  }

  /* ---------------- التجزئة ---------------- */
  function overlapX(a, b, tol) { return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > -tol; }
  function segment(strokes, H, opts) {
    const n = strokes.length;
    const best = new Array(n + 1).fill(Infinity), back = new Array(n + 1).fill(0), sym = new Array(n + 1).fill(null);
    best[0] = 0;
    const boxes = strokes.map((s) => bboxOf([s]));
    for (let i = 1; i <= n; i++) {
      for (let k = 1; k <= Math.min(2, i); k++) { // لا يحتاج أي رمز في المجموعة أكثر من خطين
        const grp = strokes.slice(i - k, i);
        if (k > 1) {
          const gb = boxes.slice(i - k, i);
          const uni = { x0: Math.min(...gb.map((b) => b.x0)), x1: Math.max(...gb.map((b) => b.x1)), y0: Math.min(...gb.map((b) => b.y0)), y1: Math.max(...gb.map((b) => b.y1)) };
          if ((uni.x1 - uni.x0) > H * 2 || (uni.y1 - uni.y0) > H * 2.5) continue;
          const pr = k === 2 ? pairRule(grp, H, opts) : null;
          if (!pr) {
            if (grp.every((st2) => st2.length > 1 && isVertical(st2))) continue; // خطان رأسيان متجاوران (مثل ١١) ليسا رمزاً واحداً
            // تداخل أفقي حقيقي بين كل خط وبقية المجموعة
            const ovl = (a, b) => (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) / Math.max(1, Math.min(a.w, b.w));
            let ok = true;
            const near = (a, b) => a.x0 <= b.x1 + H * 0.05 && b.x0 <= a.x1 + H * 0.05 && a.y0 <= b.y1 + H * 0.05 && b.y0 <= a.y1 + H * 0.05;
            for (let j = 0; j < gb.length && ok; j++) ok = gb.some((o, q) => q !== j && (ovl(gb[j], o) > 0.3 || near(gb[j], o)));
            if (!ok) continue;
            const touches = (a, b) => a.x0 <= b.x1 + H * 0.06 && b.x0 <= a.x1 + H * 0.06 && a.y0 <= b.y1 + H * 0.06 && b.y0 <= a.y1 + H * 0.06;
            if (gb.some((b, q) => Math.max(b.w, b.h) < H * 0.22 && !gb.some((o, j) => j !== q && touches(b, o)))) continue;
            if (grp.some((s, q) => s.length > 1 && gb[q].w > H * 0.75 && gb[q].h < gb[q].w * 0.25 && straightness(s).dev < 0.1)) continue;
            let vok = true;
            for (let j = 0; j < gb.length && vok; j++) vok = gb.some((o, q) => q !== j && Math.min(o.y1, gb[j].y1) - Math.max(o.y0, gb[j].y0) > -H * 0.15);
            if (!vok) continue;
            // رقمان متجاوران بطول كامل دون تداخل أفقي (مثل ٧٨ أو ٤٩) ليسا رمزاً واحداً
            if (k === 2) {
              const [a, b] = gb, uh = uni.y1 - uni.y0;
              if (a.h > uh * 0.72 && b.h > uh * 0.72 && ovl(a, b) < 0.12 && a.w > H * 0.18 && b.w > H * 0.18) continue;
            }
          }
        }
        const r = recognizeGroup(grp, H, opts);
        // تكلفة لكل رمز + تكلفة إضافية لكل خط زائد: الدمج لا يفوز إلا إذا كان الرمز المدموج مقنعاً
        const cost = best[i - k] + (1 - r.score) + 0.3 + (k - 1) * 0.12;
        if (cost < best[i]) { best[i] = cost; back[i] = k; sym[i] = r; }
      }
    }
    const out = [];
    for (let i = n; i > 0; i -= back[i]) {
      const k = back[i];
      const grp = strokes.slice(i - k, i);
      out.unshift(Object.assign({}, sym[i], { strokes: grp, bbox: bboxOf(grp) }));
    }
    return out;
  }
  const cache = new Map();
  function recognizeGroup(grp, H, opts) {
    const key = grp.map((s) => { const e = s[s.length - 1]; return s.length + ':' + s[0][0].toFixed(1) + ',' + s[0][1].toFixed(1) + ',' + e[0].toFixed(1) + ',' + e[1].toFixed(1); }).join('|') + opts.mode + '@' + H.toFixed(1);
    if (cache.has(key)) return cache.get(key);
    let r = grp.length === 1 ? ruleSymbol(grp, H, opts) : grp.length === 2 ? pairRule(grp, H, opts) : null;
    if (!r && grp.length > 1) {
      const small = grp.map((s) => bboxOf([s])).filter((b) => Math.max(b.w, b.h) < H * 0.22).length;
      if (small === grp.length) r = { label: 'dots', score: 0.2 };
    }
    if (!r) r = refine(classify(grp, opts), grp, H, opts);
    if (cache.size > 4000) cache.clear();
    cache.set(key, r);
    return r;
  }

  /* ---------------- تحليل التخطيط ---------------- */
  function median(a) { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; }
  /** ارتفاع السطر المرجعي: من الخطوط الرأسية الطويلة نسبياً (الأرقام والحروف) */
  function refHeight(strokes) {
    const hs = strokes.map((s) => bboxOf([s]).h).filter((h) => h > 0).sort((a, b) => a - b);
    if (!hs.length) return 30;
    const q = hs[Math.min(hs.length - 1, Math.floor(hs.length * 0.75))];
    return q || 30;
  }

  function buildLayout(symbols, H, opts) {
    let syms = symbols.map((s) => Object.assign({}, s, { kind: 'sym' }));
    // = : خطان أفقيان متراكبان
    syms = mergePairs(syms, (a, b) => a.label === '-' && b.label === '-' && overlapFrac(a.bbox, b.bbox) > 0.5 && Math.abs(a.bbox.cy - b.bbox.cy) < H * 0.7 && Math.abs(a.bbox.w - b.bbox.w) < Math.max(a.bbox.w, b.bbox.w) * 0.6, '=');
    // ÷ : خط أفقي مع نقطتين فوقه وتحته
    syms.filter((s) => s.label === '-').forEach((bar) => {
      const dots = syms.filter((s) => (s.dot || s.label === '٠' || s.label === '.') && s.bbox.cx > bar.bbox.x0 && s.bbox.cx < bar.bbox.x1 && Math.abs(s.bbox.cy - bar.bbox.cy) < H * 0.7);
      const above = dots.find((d) => d.bbox.cy < bar.bbox.cy), below = dots.find((d) => d.bbox.cy > bar.bbox.cy);
      if (above && below && bar.bbox.w < H * 1.5) {
        bar.label = '÷'; bar.strokes = bar.strokes.concat(above.strokes, below.strokes);
        syms = syms.filter((s) => s !== above && s !== below);
      }
    });
    // الكسور: شرطة طويلة فوقها وتحتها رموز
    const bars = syms.filter((s) => s.label === '-' && s.bbox.w > H * 0.6).sort((a, b) => b.bbox.w - a.bbox.w);
    for (const bar of bars) {
      if (!syms.includes(bar)) continue;
      const inX = (s) => s !== bar && s.bbox.cx > bar.bbox.x0 - H * 0.1 && s.bbox.cx < bar.bbox.x1 + H * 0.1;
      const num = syms.filter((s) => inX(s) && s.bbox.y1 < bar.bbox.cy + H * 0.1 && bar.bbox.cy - s.bbox.y1 < H * 1.2);
      const den = syms.filter((s) => inX(s) && s.bbox.y0 > bar.bbox.cy - H * 0.1 && s.bbox.y0 - bar.bbox.cy < H * 1.2);
      if (num.length && den.length) {
        const parts = num.concat(den, [bar]);
        const bb = unionBox(parts.map((p) => p.bbox));
        const comp = { kind: 'frac', num: buildLayout(num, H, opts), den: buildLayout(den, H, opts), bbox: bb, label: 'frac', strokes: parts.flatMap((p) => p.strokes || []) };
        syms = syms.filter((s) => !parts.includes(s));
        syms.push(comp);
      }
    }
    // الجذر: ما يقع تحت ذراعه
    syms.filter((s) => s.label === '√').forEach((rt) => {
      const inside = syms.filter((s) => s !== rt && s.bbox.cx > rt.bbox.x0 + rt.bbox.w * 0.25 && s.bbox.cx < rt.bbox.x1 && s.bbox.cy > rt.bbox.y0 && s.bbox.cy < rt.bbox.y1 + H * 0.1);
      if (inside.length) {
        const comp = { kind: 'root', inner: buildLayout(inside, H, opts), bbox: rt.bbox, label: 'root', strokes: [rt].concat(inside).flatMap((p) => p.strokes || []) };
        syms = syms.filter((s) => s !== rt && !inside.includes(s));
        syms.push(comp);
      }
    });
    return syms;
  }
  function overlapFrac(a, b) { const o = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0); return o / Math.max(1, Math.min(a.w, b.w)); }
  function unionBox(bs) {
    const x0 = Math.min(...bs.map((b) => b.x0)), y0 = Math.min(...bs.map((b) => b.y0)), x1 = Math.max(...bs.map((b) => b.x1)), y1 = Math.max(...bs.map((b) => b.y1));
    return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function mergePairs(syms, test, label) {
    const used = new Set(); const out = [];
    for (let i = 0; i < syms.length; i++) {
      if (used.has(i)) continue;
      let merged = false;
      for (let j = i + 1; j < syms.length && !merged; j++) {
        if (used.has(j)) continue;
        if (test(syms[i], syms[j])) {
          used.add(j); merged = true;
          out.push(Object.assign({}, syms[i], { label, bbox: unionBox([syms[i].bbox, syms[j].bbox]), strokes: syms[i].strokes.concat(syms[j].strokes), score: Math.min(syms[i].score, syms[j].score) }));
        }
      }
      if (!merged) out.push(syms[i]);
    }
    return out;
  }

  const MIRROR = { '(': ')', ')': '(', '<': '>', '>': '<' };
  const OPS = ['+', '-', '×', '÷', '=', '<', '>'];
  const isVar = (c) => ['س', 'ص', 'x', 'y'].includes(c);
  /** تحويل قائمة رموز (سطر أو جزء) إلى نص رياضي */
  function serialize(syms, H, dir, mode, orderOut) {
    if (!syms.length) return '';
    // ترتيب القراءة
    let order = syms.slice().sort((a, b) => (dir === 'rtl' ? b.bbox.cx - a.bbox.cx : a.bbox.cx - b.bbox.cx));
    // الأعداد تُقرأ من اليسار لليمين حتى في الاتجاه العربي
    if (dir === 'rtl') {
      const out = []; let run = [];
      const flush = () => { out.push(...run.reverse()); run = []; };
      for (const s of order) {
        const numeric = s.kind === 'sym' && (isDigit(s.label) || s.label === '٫' || s.label === '.' || (s.label === '/' && run.length));
        const last = run[run.length - 1];
        // الصفر العربي نقطة في منتصف السطر: نقارن موضعه بامتداد الرقم المجاور لا بقاعدته
        const isDot = (x) => x.dot || x.label === '٠' || x.label === '.' || x.label === '٫';
        const sameLine = last && (isDot(s) || isDot(last)
          ? (() => { const d = isDot(s) ? s : last, o = isDot(s) ? last : s; return isDot(o) ? Math.abs(d.bbox.cy - o.bbox.cy) < H * 0.4 : d.bbox.cy > o.bbox.y0 - H * 0.1 && d.bbox.cy < o.bbox.y1 + H * 0.1; })()
          : Math.abs(s.bbox.y1 - last.bbox.y1) < H * 0.45);
        if (numeric && (!run.length || sameLine)) run.push(s);
        else { flush(); if (numeric) run.push(s); else out.push(s); }
      }
      flush();
      order = out;
    }
    // الرموز إلى وحدات مع كشف الأسس
    const toks = [];
    let prev = null;
    for (let i = 0; i < order.length; i++) {
      const s = order[i];
      if (s.kind === 'frac') { toks.push({ v: `(${serialize(s.num, H, dir, mode)})/(${serialize(s.den, H, dir, mode)})`, k: 'atom' }); prev = s; continue; }
      if (s.kind === 'root') { toks.push({ v: `√(${serialize(s.inner, H, dir, mode)})`, k: 'atom' }); prev = s; continue; }
      let v = s.label;
      if (dir === 'rtl' && MIRROR[v]) v = MIRROR[v];
      const baseOk = prev && (prev.kind !== 'sym' || /[0-9٠-٩سصxy×)]/.test(prev.label));
      const raised = baseOk && s.kind === 'sym' && (isDigit(s.label) || isVar(s.label)) && s.bbox.y1 < prev.bbox.cy + prev.bbox.h * 0.08 && s.bbox.y0 < prev.bbox.y0 - prev.bbox.h * 0.2 && (s.bbox.h < Math.max(prev.bbox.h * 1.3, H * 0.95) || (s.bbox.y1 <= prev.bbox.y0 + prev.bbox.h * 0.2 && s.bbox.h < H * 1.6));
      if (raised) {
        let ex = s.label; let j = i + 1;
        while (j < order.length && order[j].kind === 'sym' && isDigit(order[j].label) && order[j].bbox.y1 < prev.bbox.cy + prev.bbox.h * 0.08) { ex += order[j].label; j++; }
        toks.push({ v: '^' + (ex.length > 1 ? `(${ex})` : ex), k: 'sup' });
        if (orderOut) orderOut.push(...order.slice(i, j));
        i = j - 1;
        continue;
      }
      if (orderOut) orderOut.push(s);
      toks.push({ v, k: OPS.includes(v) ? 'op' : isDigit(v) ? 'num' : 'atom' });
      prev = s;
    }
    // س أو ×؟ في الوضع الغربي: × بين عددين، وإلا فهو المتغير x
    if (mode !== 'arabic') {
      toks.forEach((t, i) => {
        if (t.v !== '×' && t.v !== 'x') return;
        const p = toks[i - 1], n = toks[i + 1];
        const pNum = p && (p.k === 'num' || p.v === ')' || (p.k === 'atom' && p.v !== '('));
        const nNum = n && (n.k === 'num' || n.v === '(' || n.v.startsWith('√'));
        if (pNum && nNum) { t.v = '×'; t.k = 'op'; } else { t.v = 'x'; t.k = 'atom'; }
      });
    }
    let str = '';
    toks.forEach((t) => { str += t.k === 'op' ? ` ${t.v} ` : t.v; });
    return str.replace(/\s+/g, ' ').trim();
  }

  /** تقسيم الرموز إلى أسطر بحسب الفراغات الرأسية */
  function splitRows(syms, H) {
    const sorted = syms.slice().sort((a, b) => a.bbox.y0 - b.bbox.y0);
    const rows = [];
    for (const s of sorted) {
      const r = rows.find((row) => s.bbox.y0 < row.y1 + H * 0.55 && s.bbox.y1 > row.y0 - H * 0.55);
      if (r) { r.items.push(s); r.y0 = Math.min(r.y0, s.bbox.y0); r.y1 = Math.max(r.y1, s.bbox.y1); }
      else rows.push({ items: [s], y0: s.bbox.y0, y1: s.bbox.y1 });
    }
    // دمج الأسطر المتداخلة بعد التوسع
    rows.sort((a, b) => a.y0 - b.y0);
    const merged = [];
    for (const r of rows) {
      const last = merged[merged.length - 1];
      if (last && r.y0 < last.y1 + H * 0.25) { last.items.push(...r.items); last.y1 = Math.max(last.y1, r.y1); }
      else merged.push(r);
    }
    return merged.map((r) => r.items);
  }

  /** تحديد الاتجاه تلقائياً: هل يسبق المعامل العددي المتغير من اليمين؟ */
  function detectDir(syms, mode) {
    let rtl = 0, ltr = 0;
    const s = syms.filter((x) => x.kind === 'sym').sort((a, b) => a.bbox.cx - b.bbox.cx);
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i], b = s[i + 1];
      const onBase = (d, v) => d.bbox.y1 > v.bbox.cy && d.bbox.h > v.bbox.h * 0.6;
      if (isDigit(a.label) && /[سصxy]/.test(b.label) && onBase(a, b)) ltr++;
      if (/[سصxy]/.test(a.label) && isDigit(b.label) && onBase(b, a)) rtl++;
    }
    if (rtl > ltr) return 'rtl';
    if (ltr > rtl) return 'ltr';
    return mode === 'arabic' ? 'rtl' : 'ltr';
  }

  /**
   * التعرّف على الكتابة
   * strokes: [[[x,y],...], ...] بترتيب الكتابة
   * opts: { mode: 'arabic'|'western', dir: 'rtl'|'ltr'|'auto' }
   */
  function recognize(strokes, opts) {
    opts = Object.assign({ mode: 'arabic', dir: 'auto' }, opts || {});
    opts.labels = MODE_LABELS[opts.mode] || MODE_LABELS.arabic;
    strokes = strokes.filter((s) => s && s.length).map((s) => (s.length === 1 ? [s[0], [s[0][0] + 0.5, s[0][1] + 0.5]] : s));
    if (!strokes.length) return { text: '', display: '', symbols: [], rows: [] };
    const H = opts.refHeight || refHeight(strokes);
    const t0 = Date.now();
    const symbols = segment(strokes, H, opts);
    const layout = buildLayout(symbols, H, opts);
    const rows = splitRows(layout, H);
    const order = [];
    let dirUsed = opts.dir;
    const texts = rows.map((row) => { const d = opts.dir === 'auto' ? detectDir(row, opts.mode) : opts.dir; dirUsed = d; return serialize(row, H, d, opts.mode, order); });
    const text = texts.join('\n');
    const conf = symbols.length ? symbols.reduce((s, x) => s + Math.max(0, Math.min(1, x.score)), 0) / symbols.length : 0;
    return {
      text,
      display: text,
      western: M.toWestern ? M.toWestern(text).replace(/س/g, 'x').replace(/ص/g, 'y') : text,
      symbols, order, dir: dirUsed, rows: texts, confidence: conf, ms: Date.now() - t0,
    };
  }

  /* ---------------- التعلّم من خط المستخدم ---------------- */
  function learn(label, strokes) {
    if (!M.store) return;
    const user = M.store.get('inkUser', {});
    const n = normStrokes(strokes);
    (user[label] = user[label] || []).push(n.strokes.map((s) => s.map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)])));
    if (user[label].length > 30) user[label].shift();
    M.store.set('inkUser', user);
    DB = null; cache.clear();
  }
  /** تعلّم من تصحيح المستخدم: يطابق الرموز المتعرَّف عليها مع النص المصحح */
  function learnFromCorrection(result, corrected) {
    const order = (result.order || []).filter((s) => s.kind === 'sym' && s.strokes);
    const toks = [...String(corrected).replace(/\s+/g, '')].filter((c) => !'^*()'.includes(c));
    const flat = order.filter((s) => !'()'.includes(s.label));
    if (flat.length !== toks.length) return 0;
    let n = 0;
    flat.forEach((s, i) => {
      const c = toks[i];
      if (c !== s.label && Object.values(MODE_LABELS).some((l) => l.includes(c))) { learn(c, s.strokes); n++; }
    });
    return n;
  }
  function userStats() {
    const u = (M.store && M.store.get('inkUser', {})) || {};
    return Object.fromEntries(Object.entries(u).map(([k, v]) => [k, v.length]));
  }
  function resetUser() { if (M.store) M.store.del('inkUser'); DB = null; cache.clear(); }

  M.ink = { recognize, learn, learnFromCorrection, userStats, resetUser, labels: MODE_LABELS, _classify: classify, _build: buildDB, warm: () => { if (!DB) buildDB(); } };
})();
