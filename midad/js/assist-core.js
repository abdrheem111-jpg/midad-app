/* ==========================================================================
   المساعد الذكي — التحليل: يفهم ما كتبه المعلم أو رسمه أو حدّده على السبورة
   ويقترح الخطوة التالية المناسبة (حل، رسم، تحليل، قياس، تحويل هندسي، طيّ شبكة…)
   منطق خالص دون واجهة (قابل للاختبار)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const E = M.math;

  const S = (id, label, icon, extra) => Object.assign({ id, label, icon }, extra || {});
  const isVarX = (set) => set.size === 1 && set.has('x');

  /** تحليل نص رياضي (مكتوب بخط اليد أو بأداة النص) */
  function analyzeText(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    const w = M.toWestern(text);
    // قائمة أعداد ⇐ إحصاء
    const nums = w.replace(/[،,؛;]/g, ' ').trim().split(/\s+/);
    if (nums.length >= 3 && nums.every((x) => /^-?\d+(\.\d+)?$/.test(x))) {
      return { kind: 'data', head: `قائمة من ${M.loc(nums.length)} قيم — ماذا أفعل بها؟`, data: nums.map(Number), sugg: [S('stats', 'المتوسط والوسيط والمنوال', 'stats', { primary: true }), S('barchart', 'مثّلها بالأعمدة', 'stats'), S('sort', 'رتّبها تصاعدياً', 'shuffle')] };
    }
    const lines = text.split(/\n|؛/).map((l) => l.trim()).filter(Boolean);
    // نظام متباينات ⇐ تظليل مناطق الحل وتقاطعها
    if (lines.length >= 2 && lines.every((l) => /[<>≤≥]/.test(l))) {
      return { kind: 'ineq_system', head: `نظام من ${M.loc(lines.length)} متباينات — أظلل منطقة الحل المشتركة؟`, lines, sugg: [S('region_all', 'ظلّل منطقة الحل على المستوى الإحداثي', 'function', { primary: true })] };
    }
    // نظام معادلات
    if (lines.length >= 2 && lines.every((l) => /=/.test(l))) {
      const sugg = [S('solve', 'حلّ النظام', 'check', { primary: true }), S('graph_system', 'ارسم المستقيمات ونقطة التقاطع', 'function')];
      return { kind: 'system', head: `نظام من ${M.loc(lines.length)} معادلات — هل تريد حلّه أو رسمه؟`, lines, sugg };
    }
    let rel;
    try { rel = E.parseRelation(text); } catch (e) { return { kind: 'unknown', head: 'لم أفهم هذا التعبير — هل تريد أن أشرحه؟', sugg: [S('ask', 'اسأل المعلم الذكي', 'sparkles', { primary: true })] }; }
    const vars = new Set();
    try { E.variables(rel.lhs, vars); if (rel.rhs) E.variables(rel.rhs, vars); } catch (e) { /* */ }
    // ع = د(س، ص)
    if (rel.rel === '=' && rel.lhs.t === 'var' && rel.lhs.n === 'z') return { kind: 'surface', head: 'دالة بمتغيرين — أرسمها سطحاً ثلاثي الأبعاد؟', expr: text.split('=').slice(1).join('='), sugg: [S('graph3d', 'ارسمها ثلاثية الأبعاد', 'cube', { primary: true })] };
    // متباينة
    if (rel.rel && rel.rel !== '=') {
      if (isVarX(vars)) return { kind: 'ineq', head: 'متباينة — أحلّها أم أمثّلها؟', sugg: [S('solve', 'حلّ المتباينة', 'check', { primary: true }), S('numberline', 'على خط الأعداد', 'dash'), S('region', 'على المستوى الإحداثي', 'function'), S('graph_ineq', 'ارسم الطرفين', 'function')] };
      if (vars.has('y')) return { kind: 'ineq_xy', head: 'متباينة بمتغيرين — أظلل منطقة الحل على المستوى الإحداثي؟', sugg: [S('region', 'ظلّل منطقة الحل', 'function', { primary: true }), S('solve', 'اكتبها بصورة ص …', 'algebra')] };
      return { kind: 'ineq2', head: 'متباينة — هل أحلّها؟', sugg: [S('solve', 'حلّ', 'check', { primary: true })] };
    }
    if (rel.rel === '=') {
      // ص = د(س)
      if (rel.lhs.t === 'var' && rel.lhs.n === 'y' && !E.variables(rel.rhs).has('y')) {
        const rv = E.variables(rel.rhs);
        if (rv.size <= 1 && (rv.size === 0 || rv.has('x'))) {
          const c = safeCoeffs(rel.rhs);
          const deg = c ? c.length - 1 : null;
          const nm = deg === 1 ? 'دالة خطية (مستقيم)' : deg === 2 ? 'دالة تربيعية (قطع مكافئ)' : deg === 0 ? 'دالة ثابتة' : 'دالة';
          const sugg = [S('graph', 'ارسمها على المستوى الإحداثي', 'function', { primary: true }), S('props', deg === 2 ? 'الرأس والأصفار والمقطع' : 'الأصفار والمقطع الصادي', 'target'), S('table', 'جدول قيم', 'grid'), S('deriv_graph', 'ارسم مشتقتها', 'wand')];
          if (deg === 1) sugg.splice(1, 1, S('props', 'الميل والمقطعان', 'target'));
          return { kind: 'function', head: `${nm} — هل أرسمها؟`, expr: text.split('=').slice(1).join('='), deg, sugg };
        }
      }
      if (vars.has('x') && vars.has('y')) return { kind: 'relation', head: 'معادلة بمتغيرين — أرسمها أو أعزل ص؟', sugg: [S('graph_rel', 'ارسمها', 'function', { primary: true }), S('solve', 'اكتبها بصورة ص = …', 'algebra')] };
      if (isVarX(vars)) {
        let deg = null;
        try { const c = safeCoeffs({ t: 'op', op: '-', a: rel.lhs, b: { t: 'paren', a: rel.rhs } }); deg = c ? c.length - 1 : null; } catch (e) { /* */ }
        const nm = deg === 1 ? 'معادلة من الدرجة الأولى' : deg === 2 ? 'معادلة من الدرجة الثانية' : deg === 3 ? 'معادلة تكعيبية' : 'معادلة';
        const sugg = [S('solve', 'حلّها خطوة بخطوة', 'check', { primary: true }), S('graph_eq', 'حلّها بيانياً (ارسم الطرفين)', 'function')];
        if (deg === 2) sugg.push(S('factor_eq', 'حلّل إلى عوامل', 'algebra'), S('discriminant', 'احسب المميّز', 'hash'));
        sugg.push(S('check_value', 'تحقّق من قيمة لـ س', 'target'));
        return { kind: 'equation', head: `${nm} — ماذا تريد؟`, deg, sugg };
      }
      if (!vars.size) return { kind: 'check', head: 'هل هذه المساواة صحيحة؟', sugg: [S('solve', 'تحقّق منها', 'check', { primary: true })] };
    }
    // تعبير دون مساواة
    if (!rel.rel) {
      if (!vars.size) {
        const fr = w.replace(/\s/g, '').match(/^(\d+)\/(\d+)$/);
        if (fr && +fr[2] > 0 && +fr[2] <= 24) return { kind: 'fraction', head: `الكسر ${M.loc(fr[1])}/${M.loc(fr[2])} — أمثّله أم أبسّطه؟`, n: +fr[1], d: +fr[2], sugg: [S('fraction_viz', 'مثّله بالدائرة والشريط', 'target', { primary: true }), S('solve', 'بسّطه وحوّله إلى عشري ونسبة', 'percent')] };
        return { kind: 'calc', head: 'تعبير عددي — أحسبه؟', sugg: [S('calc', 'احسب الناتج', 'check', { primary: true }), S('solve', 'بالخطوات', 'algebra')] };
      }
      if (isVarX(vars)) {
        const c = safeCoeffs(rel.lhs);
        const sugg = [S('simplify', 'بسّط / فكّ الأقواس', 'algebra', { primary: true }), S('graph', 'ارسمه كدالة', 'function'), S('deriv', 'اشتقّه', 'wand')];
        if (c && c.length === 3) sugg.splice(1, 0, S('factor', 'حلّل إلى عوامل', 'algebra'));
        sugg.push(S('check_value', 'احسب قيمته عند س = …', 'target'));
        return { kind: 'expr', head: 'تعبير جبري — ماذا تريد؟', expr: text, sugg };
      }
      return { kind: 'expr2', head: 'تعبير جبري — أبسّطه؟', sugg: [S('simplify', 'بسّطه', 'algebra', { primary: true })] };
    }
    return { kind: 'unknown', head: 'هل أساعدك في هذا؟', sugg: [S('ask', 'اسأل المعلم الذكي', 'sparkles', { primary: true })] };
  }
  function safeCoeffs(ast) { try { return E.polyCoeffs(ast, 'x', 6); } catch (e) { return null; } }

  /* ---------------- تحليل العناصر المحددة على السبورة ---------------- */
  const isPoly = (o) => o.type === 'poly' || o.type === 'rect';
  const polyPts = (o) => (o.type === 'rect' ? [[o.x1, o.y1], [o.x2, o.y1], [o.x2, o.y2], [o.x1, o.y2]] : o.pts);
  const isCircle = (o) => o.type === 'ellipse' && Math.abs(Math.abs(o.x2 - o.x1) - Math.abs(o.y2 - o.y1)) / Math.max(Math.abs(o.x2 - o.x1), 1) < 0.08;

  function analyzeSelection(objs, ctx) {
    ctx = ctx || {};
    if (!objs || !objs.length) return null;
    const polys = objs.filter(isPoly), circles = objs.filter(isCircle), fns = objs.filter((o) => o.type === 'fn'), lines = objs.filter((o) => o.type === 'line'), texts = objs.filter((o) => o.type === 'text'), strokes = objs.filter((o) => o.type === 'stroke');
    // شبكة مجسم
    if ((polys.length >= 4 && polys.length === objs.length) || (polys.length === 1 && circles.length === 2 && objs.length === 3)) {
      const res = M.netFold.detect(polys.map(polyPts), { unit: ctx.unit || 40, circles: circles.map((c) => ({ c: [(c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2], r: Math.abs(c.x2 - c.x1) / 2 })) });
      if (res.ok) return { kind: 'net', head: `🧊 هذه شبكة ${res.name}! أطويها لك مجسماً ثلاثي الأبعاد؟`, net: res, sugg: [S('fold3d', 'حوّلها إلى مجسم ثلاثي الأبعاد', 'cube', { primary: true }), S('net_area', 'المساحة الكلية للشبكة', 'grid')] };
      return { kind: 'badnet', head: 'تبدو محاولة لرسم شبكة مجسم…', net: res, sugg: [S('why_net', 'لماذا لا تنطوي؟', 'bulb', { primary: true }), S('fold3d_try', 'جرّب الطي ورَ ما يحدث', 'cube')] };
    }
    if (fns.length === 1 && lines.length === 1 && objs.length === 2) return { kind: 'fnline', head: 'منحنى ومستقيم — أوجد نقاط التقاطع؟', sugg: [S('intersect_line', 'نقاط التقاطع', 'target', { primary: true })] };
    if (fns.length === 2 && objs.length === 2) return { kind: 'fn2', head: 'دالتان — أوجد نقاط التقاطع؟', sugg: [S('intersect', 'نقاط التقاطع', 'target', { primary: true }), S('props', 'خصائص كل دالة', 'function')] };
    if (fns.length === 1 && objs.length === 1) {
      const o = fns[0];
      if (o.vline != null) return { kind: 'vline', head: 'مستقيم رأسي', sugg: [S('props', 'معادلته وخصائصه', 'target', { primary: true })] };
      return { kind: 'fn', head: `${M.prettyPow(M.loc(o.label || 'دالة'))} — ماذا تريد أن تعرف؟`, sugg: [S('props', 'الأصفار والرأس والمقطع', 'target', { primary: true }), S('tangent', 'المماس عند نقطة (اسحبها على المنحنى)', 'point'), S('table', 'جدول قيم', 'grid'), S('deriv_graph', 'ارسم المشتقة', 'wand'), S('open_algebra', 'افتحها بمنزلقات', 'function')] };
    }
    if (lines.length === 2 && objs.length === 2) {
      const [a, b] = lines, P = (l) => [[l.x1, l.y1], [l.x2, l.y2]];
      const tol = 18;
      const share = P(a).some((p) => P(b).some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol));
      return { kind: 'lines', head: share ? 'مستقيمان يلتقيان — أقيس الزاوية بينهما؟' : 'مستقيمان — أقيس الزاوية بينهما أو أوجد التقاطع؟', sugg: [S('angle', 'قِس الزاوية', 'angle', { primary: true }), S('parallel', 'هل هما متوازيان أم متعامدان؟', 'geometry')] };
    }
    if (objs.length === 1 && objs[0].type === 'circ') return { kind: 'circ', head: '⭕ الدائرة التفاعلية — ماذا تريد؟', sugg: [S('circ_open', 'القطاع والقوس والنظريات', 'circleLab', { primary: true }), S('circ_quiz', 'سؤال على هذا الشكل', 'bulb')] };
    if (objs.length === 1 && objs[0].type === 'compass') return { kind: 'shape', shapeKind: 'circle', head: 'دائرة — ماذا تريد؟', sugg: [S('circle_lab', 'اجعلها تفاعلية: قطاع، قوس، زوايا، نظريات', 'circleLab', { primary: true })] };
    if (objs.length === 1 && (isPoly(objs[0]) || objs[0].type === 'ellipse')) {
      const o = objs[0];
      const kind = shapeKind(o);
      const nm = M.shapeRec.NAMES[kind] || 'الشكل';
      const sugg = [S('measure', 'القياسات (المحيط والمساحة والزوايا)', 'measure', { primary: true }), S('reflect', 'انعكاس', 'mirror'), S('rotate', 'دوران ٩٠°', 'rotate'), S('translate', 'انسحاب', 'move'), S('dilate', 'تكبير ×٢', 'scale'), S('symmetry', 'محاور التماثل', 'dash')];
      if (o.type === 'poly' && o.pts.length === 3) sugg.splice(1, 0, S('tri_angles', 'مجموع زوايا المثلث', 'angle'));
      if (kind === 'circle') { sugg[0].primary = false; sugg.unshift(S('circle_lab', 'اجعلها تفاعلية: قطاع، قوس، زوايا، نظريات', 'circleLab', { primary: true })); }
      if (ctx.coord && kind === 'circle') sugg.splice(2, 0, S('circle_eq', 'معادلة الدائرة', 'function'));
      if (ctx.coord && o.type !== 'ellipse') sugg.splice(1, 0, S('vertex_coords', 'إحداثيات الرؤوس', 'point'));
      return { kind: 'shape', shapeKind: kind, head: `${nm} — ماذا تريد؟`, sugg };
    }
    const mathTexts = texts.filter((t) => /[=+\-×÷*/^√<>]|\d\s*[سص]/.test(M.toWestern(t.text)));
    if (mathTexts.length && mathTexts.length === objs.length) {
      const a = analyzeText(mathTexts.map((t) => t.text).join('\n'));
      if (a) return Object.assign(a, { source: 'text' });
    }
    if (strokes.length && strokes.length === objs.length) return { kind: 'ink', head: 'كتابة يدوية — أقرؤها وأحلّها؟', sugg: [S('read_ink', 'اقرأ ما كتبت', 'sparkles', { primary: true })] };
    if (polys.length >= 2 && polys.length === objs.length) return { kind: 'shapes', head: `${M.loc(polys.length)} أشكال — ماذا تريد؟`, sugg: [S('measure_all', 'مساحة كل شكل', 'measure', { primary: true }), S('why_net', 'هل هي شبكة مجسم؟', 'cube')] };
    return null;
  }
  /** نوع الشكل من هندسته */
  function shapeKind(o) {
    if (o.type === 'ellipse') return isCircle(o) ? 'circle' : 'ellipse';
    if (o.type === 'rect') return Math.abs(Math.abs(o.x2 - o.x1) - Math.abs(o.y2 - o.y1)) / Math.max(1, Math.abs(o.x2 - o.x1)) < 0.06 ? 'square' : 'rect';
    const p = o.pts;
    if (o.smooth) return 'ellipse';
    if (p.length === 10) return 'star';
    const n = p.length, s = p.map((q, i) => Math.hypot(p[(i + 1) % n][0] - q[0], p[(i + 1) % n][1] - q[1]));
    const eq = Math.max(...s) / Math.min(...s) < 1.04, ang = p.map((_, i) => M.shapeRec._angleAt(p, i)), ideal = ((n - 2) * 180) / n;
    if (n >= 5 && n <= 8 && eq && ang.every((a) => Math.abs(a - ideal) < 3)) return { 5: 'pent', 6: 'hex', 7: 'hept', 8: 'oct' }[n];
    if (n === 3 || n === 4) return M.shapeRec.fromVertices(p).kind;
    return 'polygon';
  }
  /** محاور التماثل لشكل (خطوط بإحداثيات السبورة) */
  function symmetryAxes(o) {
    const kind = shapeKind(o);
    const p = o.type === 'rect' ? polyPts(o) : o.pts;
    const c = o.type === 'ellipse' ? [(o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2] : p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
    const R = o.type === 'ellipse' ? Math.max(Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1)) * 0.6 : Math.max(...p.map((q) => Math.hypot(q[0] - c[0], q[1] - c[1]))) * 1.2;
    const line = (ang) => [[c[0] - R * Math.cos(ang), c[1] - R * Math.sin(ang)], [c[0] + R * Math.cos(ang), c[1] + R * Math.sin(ang)]];
    const through = (q) => line(Math.atan2(q[1] - c[1], q[0] - c[0]));
    const mid = (i) => [(p[i][0] + p[(i + 1) % p.length][0]) / 2, (p[i][1] + p[(i + 1) % p.length][1]) / 2];
    switch (kind) {
      case 'circle': return { count: Infinity, lines: [0, 1, 2, 3, 4, 5].map((k) => line((k * Math.PI) / 6)) };
      case 'ellipse': return { count: 2, lines: o.type === 'ellipse' ? [line(0), line(Math.PI / 2)] : [through(p[0]), through(p[Math.floor(p.length / 4)])] };
      case 'square': return { count: 4, lines: o.type === 'rect' ? [line(0), line(Math.PI / 2), line(Math.PI / 4), line(-Math.PI / 4)] : [through(p[0]), through(p[1]), through(mid(0)), through(mid(1))] };
      case 'rect': return { count: 2, lines: o.type === 'rect' ? [line(0), line(Math.PI / 2)] : [through(mid(0)), through(mid(1))] };
      case 'rhombus': return { count: 2, lines: [through(p[0]), through(p[1])] };
      case 'equiTri': return { count: 3, lines: [0, 1, 2].map((i) => through(p[i])) };
      case 'isoTri': case 'kite': {
        // المحور يمر بالرأس الذي يتساوى بُعداه عن جاريه
        const n = p.length; let best = 0, bd = Infinity;
        for (let i = 0; i < n; i++) { const a = Math.hypot(p[i][0] - p[(i + 1) % n][0], p[i][1] - p[(i + 1) % n][1]), b = Math.hypot(p[i][0] - p[(i - 1 + n) % n][0], p[i][1] - p[(i - 1 + n) % n][1]); const d = Math.abs(a - b) / Math.max(a, b); if (d < bd) { bd = d; best = i; } }
        return { count: 1, lines: [through(p[best])] };
      }
      case 'pent': case 'hex': case 'hept': case 'oct': case 'star': {
        const n = kind === 'star' ? 5 : p.length, pts = kind === 'star' ? p.filter((_, i) => i % 2 === 0) : p;
        const out = pts.map((q) => through(q));
        if (n % 2 === 0) for (let i = 0; i < n / 2; i++) out.push(through(mid(i)));
        return { count: n, lines: n % 2 === 0 ? out.slice(0, n / 2).concat(out.slice(n)) : out };
      }
      case 'trap': return { count: 0, lines: [], note: 'شبه المنحرف له محور تماثل فقط إذا كان متطابق الساقين' };
      default: return { count: 0, lines: [] };
    }
  }

  /** حل متباينة بدلالة س عددياً: فترات الحل */
  function solveIneq(text) {
    const rel = E.parseRelation(text);
    const f = E.compile({ t: 'op', op: '-', a: rel.lhs, b: { t: 'paren', a: rel.rhs } });
    const roots = E.findRoots((x) => f(x), -1000, 1000, 20000).map((r) => Math.round(r * 1e6) / 1e6);
    const pts = [-Infinity].concat(roots, [Infinity]);
    const test = (x) => { const v = f(x); return rel.rel === '<' ? v < 0 : rel.rel === '>' ? v > 0 : rel.rel === '<=' ? v <= 1e-9 : rel.rel === '>=' ? v >= -1e-9 : false; };
    const inclusive = rel.rel === '<=' || rel.rel === '>=';
    const intervals = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1];
      const m = !Number.isFinite(a) ? b - 1 : !Number.isFinite(b) ? a + 1 : (a + b) / 2;
      if (test(m)) intervals.push([a, b]);
    }
    // دمج الفترات المتلاصقة عند جذر مضمَّن
    const merged = [];
    intervals.forEach((iv) => { const last = merged[merged.length - 1]; if (last && last[1] === iv[0] && inclusive) last[1] = iv[1]; else merged.push(iv.slice()); });
    return { intervals: merged, roots, inclusive };
  }

  M.assistCore = { analyzeText, analyzeSelection, shapeKind, symmetryAxes, solveIneq, polyPts };
})();
