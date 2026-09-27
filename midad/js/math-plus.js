/* ==========================================================================
   محرك الرياضيات المتقدم (للصفوف ١–١٢): التكامل، النهايات، قسمة كثيرات
   الحدود، المصفوفات، المتتابعات، اللوغاريتمات، الجذور الصماء، التحويل بين
   الوحدات، التقريب، النسبة والتناسب، التوزيعات الاحتمالية، الأعداد بالحروف
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const E = M.math;
  const P = (M.mathPlus = {});
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(x, d == null ? 4 : d);
  const FH = (x) => M.fracHTML(x);
  const V = (v) => M.varName(v || 'x');
  const ms = (s) => E.mathSpan(s);
  const num = (v) => ({ t: 'num', v });
  const op = (o, a, b) => ({ t: 'op', op: o, a, b });
  const fn = (f, a) => ({ t: 'fn', f, a });
  const unparen = (n) => { while (n && n.t === 'paren') n = n.a; return n; };
  const hasVar = (n, v) => E.variables(n).has(v);
  const evalC = (n) => E.evaluate(n, {}, 'rad');
  const r9 = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x);

  /* ================= التكامل ================= */
  /** تفكيك التعبير إلى حدود جمع */
  function terms(n, sign, out) {
    out = out || []; sign = sign || 1;
    n = unparen(n);
    if (n.t === 'op' && (n.op === '+' || n.op === '-')) { terms(n.a, sign, out); terms(n.b, n.op === '-' ? -sign : sign, out); }
    else if (n.t === 'neg') terms(n.a, -sign, out);
    else out.push({ sign, node: n });
    return out;
  }
  /** فصل المعامل الثابت: node = k × rest */
  function splitConst(n, v) {
    n = unparen(n);
    if (!hasVar(n, v)) return { k: evalC(n), rest: null };
    if (n.t === 'neg') { const s = splitConst(n.a, v); return { k: -s.k, rest: s.rest }; }
    if (n.t === 'op' && n.op === '*') {
      const a = splitConst(n.a, v), b = splitConst(n.b, v);
      const rest = a.rest && b.rest ? op('*', a.rest, b.rest) : a.rest || b.rest;
      return { k: a.k * b.k, rest };
    }
    if (n.t === 'op' && n.op === '/') {
      if (!hasVar(n.b, v)) { const a = splitConst(n.a, v); return { k: a.k / evalC(n.b), rest: a.rest }; }
      if (!hasVar(n.a, v)) return { k: evalC(n.a), rest: op('^', n.b, num(-1)) };
    }
    return { k: 1, rest: n };
  }
  /** هل التعبير خطي (أ س + ب)؟ يعيد [أ، ب] */
  function linear(n, v) {
    const c = E.polyCoeffs(n, v, 2);
    if (!c || c.length > 2) return null;
    return [c[1] || 0, c[0] || 0];
  }
  const X = (v) => ({ t: 'var', n: v });

  function integrateTerm(node, v) {
    const { k, rest } = splitConst(node, v);
    const K = (ast) => E.simplify(op('*', num(k), ast));
    if (!rest) return { ast: K(X(v)), rule: 'تكامل الثابت: ∫ك د' + V(v) + ' = ك' + V(v) };
    const r = unparen(rest);
    // كثيرة حدود
    const pc = E.polyCoeffs(r, v, 6);
    if (pc && pc.length > 1) {
      let res = null;
      pc.forEach((c, j) => {
        if (!c) return;
        const t = op('*', num(r9((k * c) / (j + 1))), op('^', X(v), num(j + 1)));
        res = res ? op('+', res, t) : t;
      });
      return { ast: E.simplify(res), rule: `قاعدة القوة: ∫${V(v)}ⁿ د${V(v)} = ${V(v)}ⁿ⁺¹ ÷ (ن + ١)` };
    }
    // (خطي)^ن أو جذر الخطي
    let base = null, n = null;
    if (r.t === 'op' && r.op === '^' && !hasVar(r.b, v)) { base = unparen(r.a); n = evalC(r.b); }
    else if (r.t === 'fn' && r.f === 'sqrt') { base = unparen(r.a); n = 0.5; }
    else if (r.t === 'var' && r.n === v) { base = r; n = 1; }
    if (base) {
      const lin = linear(base, v);
      if (lin && lin[0]) {
        const [a] = lin;
        if (Math.abs(n + 1) < 1e-12) return { ast: K(op('*', num(r9(1 / a)), fn('ln', fn('abs', base)))), rule: `∫ ١ ÷ ${V(v)} د${V(v)} = لوهـ|${V(v)}|` };
        return { ast: K(op('*', num(r9(1 / (a * (n + 1)))), op('^', base, num(r9(n + 1))))), rule: 'قاعدة القوة مع الدالة الخطية الداخلية' };
      }
    }
    // الدوال المثلثية والأسية لدالة خطية
    if (r.t === 'fn') {
      const lin = linear(r.a, v);
      if (lin && lin[0]) {
        const a = lin[0], inner = r.a;
        switch (r.f) {
          case 'sin': return { ast: K(op('*', num(r9(-1 / a)), fn('cos', inner))), rule: '∫ جا س د س = -جتا س' };
          case 'cos': return { ast: K(op('*', num(r9(1 / a)), fn('sin', inner))), rule: '∫ جتا س د س = جا س' };
          case 'exp': return { ast: K(op('*', num(r9(1 / a)), fn('exp', inner))), rule: '∫ هـ^س د س = هـ^س' };
        }
      }
    }
    if (r.t === 'op' && r.op === '^') {
      const b = unparen(r.a);
      // sec²
      if (b.t === 'fn' && b.f === 'sec' && !hasVar(r.b, v) && evalC(r.b) === 2) {
        const lin = linear(b.a, v);
        if (lin && lin[0]) return { ast: K(op('*', num(r9(1 / lin[0])), fn('tan', b.a))), rule: '∫ قا² س د س = ظا س' };
      }
      // هـ^(خطي) أو أ^(خطي)
      if (!hasVar(b, v)) {
        const lin = linear(r.b, v);
        const c = evalC(b);
        if (lin && lin[0] && c > 0 && c !== 1) {
          const factor = 1 / (lin[0] * Math.log(c));
          return { ast: K(op('*', num(r9(factor)), r)), rule: b.t === 'const' ? '∫ هـ^س د س = هـ^س' : '∫ أ^س د س = أ^س ÷ لوهـ أ' };
        }
      }
    }
    return null;
  }

  /** التكامل غير المحدود مع الخطوات */
  P.integrate = function (src, v) {
    v = v || 'x';
    const ast = typeof src === 'string' ? E.parse(src) : src;
    const ts = terms(ast);
    const steps = [`الدالة المراد تكاملها: ${E.toHTML(ast)}`];
    if (ts.length > 1) steps.push('تكامل المجموع = مجموع التكاملات، نكامل كل حد على حدة:');
    let res = null;
    for (const t of ts) {
      const r = integrateTerm(t.node, v);
      if (!r) throw new Error('لا يمكن إيجاد التكامل رمزياً لهذا الحد: ' + M.htmlToPlain(E.toHTML(t.node)) + ' — جرّب التكامل المحدود لحسابه عددياً');
      const piece = t.sign < 0 ? { t: 'neg', a: r.ast } : r.ast;
      steps.push(`∫ ${E.toHTML(t.sign < 0 ? { t: 'neg', a: t.node } : t.node)} د${V(v)} = ${E.toHTML(E.simplify(piece))} <small style="color:var(--ui-muted)">(${r.rule})</small>`);
      res = res ? op('+', res, piece) : piece;
    }
    let out = res;
    for (let i = 0; i < 4; i++) out = E.simplify(out);
    return { title: 'التكامل غير المحدود', steps, answer: `${E.toHTML(out)} + ث`, ast: out, kind: 'integral' };
  };

  function simpson(f, a, b, n) {
    n = n || 2000;
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
    return (s * h) / 3;
  }
  /** التكامل المحدود */
  P.definite = function (src, a, b, v) {
    v = v || 'x';
    const ast = typeof src === 'string' ? E.parse(src) : src;
    const f = (x) => { try { return E.evaluate(ast, { [v]: x }, 'rad'); } catch (e) { return NaN; } };
    let steps = [], value, anti = null;
    try { anti = P.integrate(ast, v); } catch (e) { anti = null; }
    if (anti) {
      const Fx = (x) => E.evaluate(anti.ast, { [v]: x }, 'rad');
      const Fb = Fx(b), Fa = Fx(a);
      value = Fb - Fa;
      steps = anti.steps.concat([
        `الدالة الأصلية: ق(${V(v)}) = ${E.toHTML(anti.ast)}`,
        `نطبق النظرية الأساسية للتفاضل والتكامل: ∫ من ${F(a)} إلى ${F(b)} = ق(${F(b)}) - ق(${F(a)})`,
        `= ${F(Fb)} - (${F(Fa)}) = ${FH(r9(value))}`,
      ]);
    } else {
      value = simpson(f, a, b);
      steps = [`الدالة: ${E.toHTML(ast)}`, 'لا توجد دالة أصلية بسيطة، نحسب التكامل عددياً بطريقة سمبسون (٢٠٠٠ فترة)'];
    }
    if (!Number.isFinite(value)) throw new Error('التكامل غير معرّف في هذه الفترة');
    // المساحة الهندسية
    const area = simpson((x) => Math.abs(f(x)), a, b, 2000);
    if (Math.abs(area - Math.abs(value)) > 1e-4) steps.push(`ملاحظة: المنحنى يقطع محور ${V('x')} في الفترة، لذا المساحة الكلية بين المنحنى والمحور = ${F(area)}`);
    return { title: 'التكامل المحدود', steps, answer: FH(r9(+value.toFixed(10))) + (M.toFraction(value) && M.toFraction(value).d !== 1 ? ` ≈ ${F(value)}` : ''), value, kind: 'integral' };
  };

  /* ================= النهايات ================= */
  P.limit = function (src, a, v) {
    v = v || 'x';
    const ast = typeof src === 'string' ? E.parse(src) : src;
    const f = (x) => { try { return E.evaluate(ast, { [v]: x }, 'rad'); } catch (e) { return NaN; } };
    const aTxt = a === Infinity ? '∞' : a === -Infinity ? '−∞' : F(a);
    const steps = [`النهاية: نهـا ${V(v)}←${aTxt} ${E.toHTML(ast)}`];
    if (Number.isFinite(a)) {
      const direct = f(a);
      if (Number.isFinite(direct)) {
        steps.push(`بالتعويض المباشر: ${V(v)} = ${F(a)} ⇐ ${F(direct)}`);
        return { title: 'النهاية', steps, answer: FH(r9(direct)), value: direct, kind: 'limit' };
      }
      const u = unparen(ast);
      if (u.t === 'op' && u.op === '/') {
        let N = E.polyCoeffs(u.a, v), D = E.polyCoeffs(u.b, v);
        const val = (c, x) => c.reduce((s, k, j) => s + k * Math.pow(x, j), 0);
        if (N && D && Math.abs(val(N, a)) < 1e-9 && Math.abs(val(D, a)) < 1e-9) {
          steps.push(`بالتعويض المباشر نحصل على ٠ ÷ ٠ (كمية غير معيّنة)، فنحلل ونختصر العامل (${V(v)} ${a < 0 ? '+' : '-'} ${F(Math.abs(a))})`);
          let guard = 0;
          while (Math.abs(val(N, a)) < 1e-9 && Math.abs(val(D, a)) < 1e-9 && guard++ < 5) { N = synth(N, a).q; D = synth(D, a).q; }
          steps.push(`بعد الاختصار: ${ms(E.polyToText(N, v, true))} ÷ ${ms(E.polyToText(D, v, true))}`);
          const dv = val(D, a);
          if (Math.abs(dv) > 1e-12) {
            const res = val(N, a) / dv;
            steps.push(`نعوّض ${V(v)} = ${F(a)}: ${F(val(N, a))} ÷ ${F(dv)} = ${FH(r9(res))}`);
            return { title: 'النهاية', steps, answer: FH(r9(res)), value: res, kind: 'limit' };
          }
        }
      }
      // جدول قيم من الجهتين
      const left = [], right = [];
      for (let k = 1; k <= 6; k++) { const h = Math.pow(10, -k); left.push(f(a - h)); right.push(f(a + h)); }
      steps.push(`نقترب عددياً: من اليسار ${left.slice(1, 5).map((x) => F(x)).join('، ')} … ، ومن اليمين ${right.slice(1, 5).map((x) => F(x)).join('، ')} …`);
      const L1 = left[5], R1 = right[5];
      if (Number.isFinite(L1) && Number.isFinite(R1) && Math.abs(L1 - R1) < 1e-3 * Math.max(1, Math.abs(L1))) {
        const res = r9(+((L1 + R1) / 2).toFixed(6));
        steps.push('النهايتان من الجهتين متساويتان');
        return { title: 'النهاية', steps, answer: FH(res) + ' (تقريباً)', value: res, kind: 'limit' };
      }
      if (Math.abs(L1) > 1e5 && Math.abs(R1) > 1e5) {
        const s1 = Math.sign(L1), s2 = Math.sign(R1);
        return { title: 'النهاية', steps: steps.concat(['القيم تكبر بلا حدود قرب النقطة']), answer: s1 === s2 ? (s1 > 0 ? '∞' : '−∞') : 'غير موجودة (النهايتان من الجهتين مختلفتان)', value: s1 === s2 ? s1 * Infinity : NaN, kind: 'limit' };
      }
      return { title: 'النهاية', steps: steps.concat(['النهاية من اليمين ≠ النهاية من اليسار']), answer: 'غير موجودة', value: NaN, kind: 'limit' };
    }
    // عند اللانهاية
    const s = Math.sign(a);
    const u = unparen(ast);
    if (u.t === 'op' && u.op === '/') {
      const N = E.polyCoeffs(u.a, v), D = E.polyCoeffs(u.b, v);
      if (N && D) {
        const n = N.length - 1, d = D.length - 1;
        steps.push(`دالة نسبية: درجة البسط ${L(n)} ودرجة المقام ${L(d)}`);
        if (n < d) { steps.push('درجة البسط أقل ⇐ النهاية = ٠'); return { title: 'النهاية', steps, answer: L(0), value: 0, kind: 'limit' }; }
        if (n === d) { const r = N[n] / D[d]; steps.push(`الدرجتان متساويتان ⇐ النهاية = نسبة المعاملين الرئيسيين = ${F(N[n])} ÷ ${F(D[d])}`); return { title: 'النهاية', steps, answer: FH(r9(r)), value: r, kind: 'limit' }; }
        const sg = Math.sign(N[n] / D[d]) * (((n - d) % 2 && s < 0) ? -1 : 1);
        steps.push('درجة البسط أكبر ⇐ الدالة تكبر بلا حدود');
        return { title: 'النهاية', steps, answer: sg > 0 ? '∞' : '−∞', value: sg * Infinity, kind: 'limit' };
      }
    }
    const vals = [1e2, 1e4, 1e6, 1e8].map((x) => f(s * x));
    steps.push(`نعوّض قيماً كبيرة: ${vals.map((x) => F(x)).join('، ')}`);
    const last = vals[3];
    if (Math.abs(last) > 1e12) return { title: 'النهاية', steps, answer: last > 0 ? '∞' : '−∞', value: Math.sign(last) * Infinity, kind: 'limit' };
    const res = r9(+last.toFixed(5));
    return { title: 'النهاية', steps, answer: FH(res) + (Math.abs(vals[2] - vals[3]) > 1e-4 ? ' (تقريباً)' : ''), value: res, kind: 'limit' };
  };

  /* ================= قسمة كثيرات الحدود ================= */
  /** القسمة التركيبية على (س - أ): المعاملات من الأعلى درجة؟ هنا c[j] معامل س^j */
  function synth(c, a) {
    const hi = c.slice().reverse(); // من الأعلى
    const row = [hi[0]];
    for (let i = 1; i < hi.length; i++) row.push(hi[i] + row[i - 1] * a);
    const rem = row.pop();
    return { q: row.reverse().map(r9), r: r9(rem), table: row };
  }
  P.synth = synth;
  /** قسمة كثيرة حدود على أخرى (قسمة طويلة) */
  P.polyDivide = function (numSrc, denSrc, v) {
    v = v || 'x';
    const Nc = E.polyCoeffs(E.parse(numSrc), v), Dc = E.polyCoeffs(E.parse(denSrc), v);
    if (!Nc || !Dc) throw new Error('أدخل كثيرتي حدود في متغير واحد');
    if (Dc.length === 1 && !Dc[0]) throw new Error('لا يمكن القسمة على صفر');
    const steps = [`المقسوم: ${ms(E.polyToText(Nc, v, true))} ، المقسوم عليه: ${ms(E.polyToText(Dc, v, true))}`];
    let R = Nc.slice();
    const q = new Array(Math.max(1, Nc.length - Dc.length + 1)).fill(0);
    const dd = Dc.length - 1;
    let guard = 0;
    while (R.length - 1 >= dd && R.some((x) => Math.abs(x) > 1e-12) && guard++ < 20) {
      const deg = R.length - 1;
      const coef = r9(R[deg] / Dc[dd]);
      q[deg - dd] = coef;
      const termTxt = E.polyToText(Array.from({ length: deg - dd + 1 }, (_, i) => (i === deg - dd ? coef : 0)), v, true);
      steps.push(`نقسم الحد الرئيسي: ${ms(E.polyToText(Array.from({ length: deg + 1 }, (_, i) => (i === deg ? R[deg] : 0)), v, true))} ÷ ${ms(E.polyToText(Array.from({ length: dd + 1 }, (_, i) => (i === dd ? Dc[dd] : 0)), v, true))} = ${ms(termTxt)}، ثم نضرب ونطرح`);
      for (let i = 0; i <= dd; i++) R[i + deg - dd] = r9(R[i + deg - dd] - coef * Dc[i]);
      R.pop();
      while (R.length > 1 && Math.abs(R[R.length - 1]) < 1e-12) R.pop();
    }
    const rem = R.length ? R : [0];
    const qTxt = E.polyToText(q, v, true), rTxt = E.polyToText(rem, v, true);
    return { title: 'قسمة كثيرات الحدود', steps, answer: `خارج القسمة = ${ms(qTxt)} ، الباقي = ${ms(rTxt)}`, q, r: rem, kind: 'polydiv' };
  };
  /** نظرية الباقي والعوامل */
  P.remainder = function (src, a, v) {
    v = v || 'x';
    const c = E.polyCoeffs(E.parse(src), v);
    if (!c) throw new Error('أدخل كثيرة حدود');
    const s = synth(c, a);
    const val = c.reduce((sum, k, j) => sum + k * Math.pow(a, j), 0);
    const steps = [
      `كثيرة الحدود: د(${V(v)}) = ${ms(E.polyToText(c, v, true))}`,
      `نظرية الباقي: باقي القسمة على (${V(v)} ${a < 0 ? '+' : '-'} ${F(Math.abs(a))}) = د(${F(a)})`,
      `د(${F(a)}) = ${F(r9(val))}`,
      `بالقسمة التركيبية: المعاملات ${c.slice().reverse().map((x) => F(x)).join('  ')} ⇐ الصف الناتج ${s.q.slice().reverse().map((x) => F(x)).join('  ')} | ${F(s.r)}`,
      `خارج القسمة: ${ms(E.polyToText(s.q, v, true))}`,
    ];
    const factor = Math.abs(val) < 1e-9;
    steps.push(factor ? `الباقي صفر ⇐ (${V(v)} ${a < 0 ? '+' : '-'} ${F(Math.abs(a))}) عامل من عوامل د(${V(v)}) (نظرية العوامل) ✓` : 'الباقي ليس صفراً ⇐ ليس عاملاً');
    return { title: 'نظرية الباقي والعوامل', steps, answer: `الباقي = ${FH(r9(val))}${factor ? ' ⇐ عامل ✓' : ''}`, value: val, kind: 'remainder' };
  };
  /** تحليل كثيرة حدود كاملاً (جذور نسبية) */
  P.factorPoly = function (c, v) {
    v = v || 'x';
    let work = c.slice();
    const roots = [];
    const lead = work[work.length - 1];
    if (!work.every((x) => Number.isInteger(x))) return null;
    let guard = 0;
    while (work.length > 3 && guard++ < 8) {
      const c0 = work[0], cn = work[work.length - 1];
      if (c0 === 0) { roots.push(0); work.shift(); continue; }
      const ps = E.divisors(Math.abs(c0)), qs = E.divisors(Math.abs(cn));
      let found = null;
      outer: for (const p of ps) for (const q of qs) for (const sg of [1, -1]) {
        const r = (sg * p) / q;
        const s = synth(work, r);
        if (Math.abs(s.r) < 1e-9) { found = r; work = s.q; break outer; }
      }
      if (found == null) break;
      roots.push(found);
    }
    return { roots, rest: work, lead };
  };

  /* ================= المصفوفات ================= */
  P.parseMatrix = function (s) {
    s = M.toWestern(String(s)).replace(/[\[\]{}()]/g, ' ');
    const rows = s.split(/\n|;|؛|\|/).map((r) => (r.match(/-?\d+(\.\d+)?(\/\d+)?/g) || []).map((x) => (x.includes('/') ? +x.split('/')[0] / +x.split('/')[1] : +x))).filter((r) => r.length);
    if (!rows.length) throw new Error('المصفوفة فارغة');
    if (rows.some((r) => r.length !== rows[0].length)) throw new Error('كل صفوف المصفوفة يجب أن تكون بالطول نفسه');
    return rows;
  };
  const matHTML = (A) => `<span class="matrix">${A.map((r) => `<span>${r.map((x) => `<i>${FH(r9(x))}</i>`).join('')}</span>`).join('')}</span>`;
  P.matHTML = matHTML;
  function det(A) {
    const n = A.length;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    let d = 0;
    for (let j = 0; j < n; j++) d += (j % 2 ? -1 : 1) * A[0][j] * det(minor(A, 0, j));
    return d;
  }
  function minor(A, i, j) { return A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j)); }
  P.det = det;
  P.determinant = function (A) {
    const n = A.length;
    if (A.some((r) => r.length !== n)) throw new Error('المحدد يُحسب للمصفوفات المربعة فقط');
    const steps = [`المصفوفة: ${matHTML(A)}`];
    if (n === 2) steps.push(`|أ| = (${F(A[0][0])})(${F(A[1][1])}) - (${F(A[0][1])})(${F(A[1][0])})`);
    else if (n === 3) {
      steps.push('نفك المحدد على الصف الأول:');
      for (let j = 0; j < 3; j++) steps.push(`${j % 2 ? '−' : '+'} ${F(A[0][j])} × ${matHTML(minor(A, 0, j))} = ${j % 2 ? '−' : '+'} ${F(A[0][j])} × ${F(det(minor(A, 0, j)))}`);
    } else steps.push('نفك المحدد بالعوامل المرافقة على الصف الأول');
    const d = r9(det(A));
    return { title: 'محدد المصفوفة', steps, answer: `|أ| = ${FH(d)}`, value: d, kind: 'matrix' };
  };
  P.inverse = function (A) {
    const n = A.length;
    if (A.some((r) => r.length !== n)) throw new Error('المعكوس للمصفوفات المربعة فقط');
    const d = det(A);
    const steps = [`المصفوفة: ${matHTML(A)}`, `المحدد = ${F(r9(d))}`];
    if (Math.abs(d) < 1e-12) return { title: 'معكوس المصفوفة', steps: steps.concat(['المحدد = ٠ ⇐ المصفوفة منفردة ليس لها معكوس']), answer: 'لا يوجد معكوس', kind: 'matrix' };
    let inv;
    if (n === 2) {
      inv = [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
      steps.push(`نبدّل عنصري القطر الرئيسي ونغيّر إشارتي القطر الآخر ثم نقسم على المحدد: ١/${F(r9(d))} × ${matHTML([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]])}`);
    } else {
      const cof = A.map((row, i) => row.map((_, j) => ((i + j) % 2 ? -1 : 1) * det(minor(A, i, j))));
      const adj = cof[0].map((_, j) => cof.map((r) => r[j]));
      inv = adj.map((r) => r.map((x) => x / d));
      steps.push(`مصفوفة العوامل المرافقة (المدوّر): ${matHTML(adj)}`, `المعكوس = المرافقة ÷ المحدد`);
    }
    return { title: 'معكوس المصفوفة', steps, answer: matHTML(inv.map((r) => r.map(r9))), value: inv, kind: 'matrix' };
  };
  P.matMul = function (A, B) {
    if (A[0].length !== B.length) throw new Error('عدد أعمدة الأولى يجب أن يساوي عدد صفوف الثانية');
    const C = A.map((row) => B[0].map((_, j) => r9(row.reduce((s, x, k) => s + x * B[k][j], 0))));
    return { title: 'ضرب المصفوفات', steps: [`${matHTML(A)} × ${matHTML(B)}`, 'كل عنصر = مجموع حواصل ضرب عناصر الصف في عناصر العمود المقابل'], answer: matHTML(C), value: C, kind: 'matrix' };
  };
  P.matAdd = function (A, B, sub) {
    if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('يجب أن تكون المصفوفتان بالرتبة نفسها');
    const C = A.map((r, i) => r.map((x, j) => r9(sub ? x - B[i][j] : x + B[i][j])));
    return { title: sub ? 'طرح المصفوفات' : 'جمع المصفوفات', steps: [`${matHTML(A)} ${sub ? '−' : '+'} ${matHTML(B)}`, 'نجمع (أو نطرح) العناصر المتناظرة'], answer: matHTML(C), value: C, kind: 'matrix' };
  };

  /* ================= المتتابعات ================= */
  P.sequence = function (list) {
    const a = list;
    if (a.length < 3) throw new Error('أدخل ثلاثة حدود على الأقل');
    const d = a.slice(1).map((x, i) => r9(x - a[i]));
    const steps = [`الحدود: ${a.map((x) => F(x)).join('، ')}`, `الفروق بين الحدود المتتالية: ${d.map((x) => F(x)).join('، ')}`];
    if (d.every((x) => Math.abs(x - d[0]) < 1e-9)) {
      const D = d[0], a1 = a[0];
      steps.push(`الفرق ثابت = ${F(D)} ⇐ متتابعة حسابية`);
      steps.push(`الحد العام: حـن = أ + (ن - ١)د = ${F(a1)} + (ن - ١) × ${F(D)} = ${F(D)}ن ${a1 - D < 0 ? '-' : '+'} ${F(Math.abs(a1 - D))}`);
      const n = a.length;
      steps.push(`مجموع أول ${L(n)} حدود: جـن = ن÷٢ × (٢أ + (ن-١)د) = ${F((n / 2) * (2 * a1 + (n - 1) * D))}`);
      return { title: 'متتابعة حسابية', steps, answer: `الحد التالي = ${F(r9(a[a.length - 1] + D))}`, next: a[a.length - 1] + D, type: 'arith', d: D, kind: 'seq' };
    }
    if (a.every((x) => x !== 0)) {
      const r = a.slice(1).map((x, i) => x / a[i]);
      if (r.every((x) => Math.abs(x - r[0]) < 1e-9)) {
        const R = r9(r[0]), a1 = a[0];
        steps.push(`النسبة بين كل حدين متتاليين ثابتة = ${FH(R)} ⇐ متتابعة هندسية`);
        steps.push(`الحد العام: حـن = أ × رⁿ⁻¹ = ${F(a1)} × (${FH(R)})ⁿ⁻¹`);
        if (Math.abs(R) < 1) steps.push(`بما أن |ر| < ١ فمجموع المتسلسلة اللانهائية = أ ÷ (١ - ر) = ${F(a1 / (1 - R))}`);
        return { title: 'متتابعة هندسية', steps, answer: `الحد التالي = ${F(r9(a[a.length - 1] * R))}`, next: a[a.length - 1] * R, type: 'geo', r: R, kind: 'seq' };
      }
    }
    const d2 = d.slice(1).map((x, i) => r9(x - d[i]));
    if (d2.length && d2.every((x) => Math.abs(x - d2[0]) < 1e-9)) {
      steps.push(`الفروق الثانية ثابتة = ${F(d2[0])} ⇐ متتابعة تربيعية (حدها العام من الدرجة الثانية)`);
      const A = d2[0] / 2, B = d[0] - 3 * A, C = a[0] - A - B;
      steps.push(`الحد العام: حـن = ${ms(E.polyToText([C, B, A], 'n', true))}`);
      const n = a.length + 1;
      return { title: 'متتابعة تربيعية', steps, answer: `الحد التالي = ${F(r9(A * n * n + B * n + C))}`, next: A * n * n + B * n + C, type: 'quad', kind: 'seq' };
    }
    return { title: 'متتابعة', steps: steps.concat(['لم أجد نمطاً حسابياً أو هندسياً أو تربيعياً']), answer: 'النمط غير واضح', kind: 'seq' };
  };

  /* ================= الجذور الصماء والصيغة العلمية ================= */
  P.simplifySqrt = function (n) {
    n = Math.floor(Math.abs(n));
    let out = 1, inside = n;
    for (let k = Math.floor(Math.sqrt(n)); k > 1; k--) if (n % (k * k) === 0) { out = k; inside = n / (k * k); break; }
    const txt = inside === 1 ? L(out) : `${out > 1 ? L(out) : ''}√${L(inside)}`;
    return {
      title: `تبسيط √${L(n)}`,
      steps: out > 1 ? [`نبحث عن أكبر مربع كامل يقسم ${L(n)}: ${L(out * out)}`, `√${L(n)} = √(${L(out * out)} × ${L(inside)}) = √${L(out * out)} × √${L(inside)} = ${txt}`] : [`${L(n)} لا يقبل القسمة على مربع كامل غير الواحد`],
      answer: `${txt} ≈ ${F(Math.sqrt(n))}`, out, inside, kind: 'surd',
    };
  };
  P.scientific = function (x) {
    if (x === 0) return { title: 'الصيغة العلمية', steps: [], answer: L(0), kind: 'sci' };
    const e = Math.floor(Math.log10(Math.abs(x)));
    const m = r9(+(x / Math.pow(10, e)).toFixed(10));
    return { title: 'الصيغة العلمية', steps: [`نحرّك الفاصلة العشرية ${L(Math.abs(e))} منزلة إلى ${e >= 0 ? 'اليسار' : 'اليمين'} حتى يصبح العدد بين ١ و ١٠`, `المعامل = ${F(m, 8)} ، الأس = ${L(e)}`], answer: ms(`${F(m, 8)} × ١٠<sup>${L(e)}</sup>`), m, e, kind: 'sci' };
  };

  /* ================= التقريب ================= */
  const PLACES = [['ألف', 1000], ['الألف', 1000], ['مئة', 100], ['مائة', 100], ['المئة', 100], ['عشرة', 10], ['العشرة', 10], ['آحاد', 1], ['عدد صحيح', 1]];
  P.round = function (x, how) {
    how = how || '';
    let res, label;
    const dp = how.match(/(\d+)\s*(منزل|منازل)/) || (/منزلة عشرية واحدة|جزء من عشرة|أقرب عشر\b/.test(how) ? [0, 1] : /منزلتين|جزء من مئة/.test(how) ? [0, 2] : /ثلاث منازل|جزء من ألف/.test(how) ? [0, 3] : null);
    const sf = how.match(/(\d+)\s*(أرقام معنوية|رقم معنوي|أرقام ذات دلالة)/);
    if (sf) { const k = +sf[1]; res = +x.toPrecision(k); label = `لأقرب ${L(k)} أرقام معنوية`; }
    else if (dp) { const k = +dp[1]; res = Math.round(x * Math.pow(10, k)) / Math.pow(10, k); label = `لأقرب ${L(k)} منزلة عشرية`; }
    else {
      const p = PLACES.find(([w]) => how.includes(w)) || ['عدد صحيح', 1];
      res = Math.round(x / p[1]) * p[1]; label = `لأقرب ${p[0].replace(/^ال/, '')}`;
    }
    return { title: 'التقريب', steps: [`نقرّب ${F(x, 8)} ${label}`, 'ننظر إلى الرقم على يمين منزلة التقريب: إذا كان ٥ أو أكثر نزيد ١، وإلا يبقى كما هو'], answer: F(r9(res), 8), value: res, kind: 'round' };
  };

  /* ================= التحويل بين الوحدات ================= */
  const UNITS = {
    // الطول (بالمتر)
    'ملم': ['len', 0.001], 'مم': ['len', 0.001], 'مليمتر': ['len', 0.001], 'ملليمتر': ['len', 0.001],
    'سم': ['len', 0.01], 'سنتيمتر': ['len', 0.01], 'سنتمتر': ['len', 0.01], 'دسم': ['len', 0.1],
    'م': ['len', 1], 'متر': ['len', 1], 'أمتار': ['len', 1], 'كم': ['len', 1000], 'كيلومتر': ['len', 1000], 'كيلو متر': ['len', 1000],
    // الكتلة (بالجرام)
    'ملغ': ['mass', 0.001], 'ملجم': ['mass', 0.001], 'مليجرام': ['mass', 0.001],
    'جم': ['mass', 1], 'غ': ['mass', 1], 'جرام': ['mass', 1], 'غرام': ['mass', 1],
    'كجم': ['mass', 1000], 'كغ': ['mass', 1000], 'كيلوجرام': ['mass', 1000], 'كيلوغرام': ['mass', 1000], 'كيلو': ['mass', 1000], 'طن': ['mass', 1e6],
    // السعة (باللتر)
    'مل': ['vol', 0.001], 'ملل': ['vol', 0.001], 'مليلتر': ['vol', 0.001], 'لتر': ['vol', 1], 'ل': ['vol', 1], 'سم٣': ['vol', 0.001], 'سم3': ['vol', 0.001], 'م٣': ['vol', 1000], 'م3': ['vol', 1000],
    // الزمن (بالثانية)
    'ثانية': ['time', 1], 'ثوان': ['time', 1], 'ثواني': ['time', 1], 'ث': ['time', 1], 'دقيقة': ['time', 60], 'دقائق': ['time', 60], 'د': ['time', 60],
    'ساعة': ['time', 3600], 'ساعات': ['time', 3600], 'يوم': ['time', 86400], 'أيام': ['time', 86400], 'أسبوع': ['time', 604800], 'أسابيع': ['time', 604800],
    // المساحة (بالمتر المربع)
    'سم٢': ['area', 1e-4], 'سم2': ['area', 1e-4], 'م٢': ['area', 1], 'م2': ['area', 1], 'كم٢': ['area', 1e6], 'كم2': ['area', 1e6], 'هكتار': ['area', 1e4],
    // النقود (بالبيسة) — العملة العُمانية
    'بيسة': ['money', 1], 'بيسات': ['money', 1], 'ريال': ['money', 1000], 'ريالات': ['money', 1000], 'ر.ع': ['money', 1000], 'ريال عماني': ['money', 1000],
  };
  const UNIT_KEYS = Object.keys(UNITS).sort((a, b) => b.length - a.length);
  const KIND_AR = { len: 'الطول', mass: 'الكتلة', vol: 'السعة', time: 'الزمن', area: 'المساحة', money: 'النقود' };
  P.findUnit = function (s) {
    s = s.trim();
    for (const k of UNIT_KEYS) if (s === k || s.startsWith(k + ' ') || s.endsWith(' ' + k) || s === 'ال' + k) return k;
    for (const k of UNIT_KEYS) if (k.length > 1 && s.includes(k)) return k;
    return null;
  };
  P.convert = function (value, from, to) {
    const a = UNITS[from], b = UNITS[to];
    if (!a || !b) throw new Error('وحدة غير معروفة');
    if (a[0] !== b[0]) throw new Error('لا يمكن التحويل بين وحدتي ' + KIND_AR[a[0]] + ' و' + KIND_AR[b[0]]);
    const k = a[1] / b[1];
    const res = r9(+(value * k).toPrecision(12));
    return { title: 'التحويل بين الوحدات (' + KIND_AR[a[0]] + ')', steps: [k >= 1 ? `١ ${from} = ${F(k, 8)} ${to} ⇐ نضرب في ${F(k, 8)}` : `١ ${to} = ${F(1 / k, 8)} ${from} ⇐ نقسم على ${F(1 / k, 8)}`, `${F(value, 8)} ${from} = ${F(res, 8)} ${to}`], answer: `${F(res, 8)} ${to}`, value: res, kind: 'units' };
  };

  /* ================= النسبة والتناسب والنسبة المئوية ================= */
  P.shareRatio = function (total, parts) {
    const sum = parts.reduce((s, x) => s + x, 0);
    const shares = parts.map((p) => r9((total * p) / sum));
    return { title: 'التقسيم بنسبة', steps: [`مجموع أجزاء النسبة = ${parts.map(L).join(' + ')} = ${L(sum)}`, `قيمة الجزء الواحد = ${F(total)} ÷ ${L(sum)} = ${F(total / sum)}`].concat(parts.map((p, i) => `النصيب ${L(i + 1)} = ${L(p)} × ${F(total / sum)} = ${F(shares[i])}`)), answer: shares.map((s) => F(s)).join(' : '), value: shares, kind: 'ratio' };
  };
  P.simplifyRatio = function (parts) {
    const g = parts.reduce((a, b) => E.gcd(a, b));
    const s = parts.map((p) => p / g);
    return { title: 'تبسيط النسبة', steps: [`ق.م.أ = ${L(g)} ، نقسم كل حد عليه`], answer: s.map(L).join(' : '), value: s, kind: 'ratio' };
  };
  P.percentOf = (p, x) => ({ title: 'نسبة مئوية من عدد', steps: [`${L(p)}٪ من ${F(x)} = ${L(p)} ÷ ١٠٠ × ${F(x)}`], answer: F(r9((p * x) / 100)), value: (p * x) / 100, kind: 'percent' });
  P.percentChange = (a, b) => { const c = ((b - a) / a) * 100; return { title: 'النسبة المئوية للتغير', steps: [`التغير = ${F(b)} - ${F(a)} = ${F(b - a)}`, `النسبة = التغير ÷ القيمة الأصلية × ١٠٠ = ${F(b - a)} ÷ ${F(a)} × ١٠٠`], answer: `${F(Math.abs(c), 3)}٪ ${c >= 0 ? 'زيادة' : 'نقصان'}`, value: c, kind: 'percent' }; };
  P.whatPercent = (a, b) => ({ title: 'النسبة المئوية', steps: [`النسبة = ${F(a)} ÷ ${F(b)} × ١٠٠`], answer: F(r9((a / b) * 100), 3) + '٪', value: (a / b) * 100, kind: 'percent' });
  P.simpleInterest = (p, r, t) => { const i = (p * r * t) / 100; return { title: 'الربح البسيط', steps: [`الربح = المبلغ × النسبة × الزمن ÷ ١٠٠ = ${F(p)} × ${F(r)} × ${F(t)} ÷ ١٠٠`, `الجملة = ${F(p)} + ${F(i)} = ${F(p + i)}`], answer: `الربح = ${F(i)} ، الجملة = ${F(p + i)}`, value: i, kind: 'interest' }; };
  P.compoundInterest = (p, r, t) => { const A = p * Math.pow(1 + r / 100, t); return { title: 'الربح المركب', steps: [`الجملة = المبلغ × (١ + ر÷١٠٠)^ن = ${F(p)} × (${F(1 + r / 100)})<sup>${F(t)}</sup>`], answer: `الجملة = ${F(A, 3)} ، الربح = ${F(A - p, 3)}`, value: A, kind: 'interest' }; };
  P.speed = function (d, t, s) {
    if (d == null) { const r = s * t; return { title: 'المسافة', steps: ['المسافة = السرعة × الزمن', `${F(s)} × ${F(t)} = ${F(r)}`], answer: F(r), value: r, kind: 'speed' }; }
    if (t == null) { const r = d / s; return { title: 'الزمن', steps: ['الزمن = المسافة ÷ السرعة', `${F(d)} ÷ ${F(s)} = ${F(r)}`], answer: F(r), value: r, kind: 'speed' }; }
    const r = d / t; return { title: 'السرعة', steps: ['السرعة = المسافة ÷ الزمن', `${F(d)} ÷ ${F(t)} = ${F(r)}`], answer: F(r), value: r, kind: 'speed' };
  };

  /* ================= اللوغاريتمات والأسس ================= */
  P.log = function (base, x) {
    if (!(x > 0) || !(base > 0) || base === 1) throw new Error('اللوغاريتم معرّف لعدد موجب وأساس موجب ≠ ١');
    const v = Math.log(x) / Math.log(base);
    const vr = r9(+v.toFixed(10));
    const steps = [`لو${base === 10 ? '' : '_' + F(base)} ${F(x)} = ص يعني ${F(base)}^ص = ${F(x)}`];
    if (Number.isInteger(vr)) steps.push(`بما أن ${F(base)}<sup>${L(vr)}</sup> = ${F(x)}`);
    else steps.push(`بقانون تغيير الأساس: = لوهـ ${F(x)} ÷ لوهـ ${F(base)}`);
    return { title: 'اللوغاريتم', steps, answer: F(vr, 6), value: v, kind: 'log' };
  };
  P.expEquation = function (a, b, c) { // a^x = b  (مع معامل اختياري c: a^(c x))
    const x = Math.log(b) / Math.log(a) / (c || 1);
    const xr = r9(+x.toFixed(10));
    return { title: 'معادلة أسية', steps: [`نأخذ اللوغاريتم للطرفين: ${c && c !== 1 ? F(c) : ''}${V()} × لو ${F(a)} = لو ${F(b)}`, `${V()} = لو ${F(b)} ÷ ${c && c !== 1 ? '(' + F(c) + ' × لو ' + F(a) + ')' : 'لو ' + F(a)}`], answer: ms(`${V()} = ${FH(xr)}`) + (Number.isInteger(xr) ? '' : ` ≈ ${F(x)}`), value: x, kind: 'exp' };
  };

  /* ================= التوزيعات الاحتمالية ================= */
  function erf(x) {
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  P.normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  P.normal = function (mu, sigma, a, b) { // P(a < X < b), a/b قد تكون ±∞
    const za = a === -Infinity ? -Infinity : (a - mu) / sigma, zb = b === Infinity ? Infinity : (b - mu) / sigma;
    const pa = za === -Infinity ? 0 : P.normCdf(za), pb = zb === Infinity ? 1 : P.normCdf(zb);
    const steps = [`نحوّل إلى الدرجة المعيارية: ع = (س - μ) ÷ σ`];
    if (Number.isFinite(za)) steps.push(`ع₁ = (${F(a)} - ${F(mu)}) ÷ ${F(sigma)} = ${F(za, 3)} ⇐ Φ = ${F(pa, 4)}`);
    if (Number.isFinite(zb)) steps.push(`ع₂ = (${F(b)} - ${F(mu)}) ÷ ${F(sigma)} = ${F(zb, 3)} ⇐ Φ = ${F(pb, 4)}`);
    return { title: 'التوزيع الطبيعي', steps, answer: F(pb - pa, 4), value: pb - pa, kind: 'normal' };
  };
  function nCr(n, r) { let c = 1; for (let i = 0; i < r; i++) c = (c * (n - i)) / (i + 1); return Math.round(c); }
  P.nCr = nCr;
  P.binomial = function (n, p, k) {
    const v = nCr(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    return { title: 'توزيع ذي الحدين', steps: [`ل(س = ${L(k)}) = ق(ن، ر) × لʳ × (١ - ل)ⁿ⁻ʳ`, `= ${L(nCr(n, k))} × ${F(p)}<sup>${L(k)}</sup> × ${F(1 - p)}<sup>${L(n - k)}</sup>`], answer: F(v, 5), value: v, kind: 'binomial' };
  };

  /* ================= المتجهات ================= */
  P.vector = function (a, b) {
    const mag = (u) => Math.hypot(...u);
    const steps = [`المتجه الأول (${a.map((x) => F(x)).join('، ')}) طوله = √(${a.map((x) => F(x) + '²').join(' + ')}) = ${F(mag(a))}`];
    if (!b) return { title: 'طول المتجه', steps, answer: F(mag(a)), value: mag(a), kind: 'vector' };
    const dot = a.reduce((s, x, i) => s + x * b[i], 0);
    const ang = (Math.acos(M.clamp(dot / (mag(a) * mag(b)), -1, 1)) * 180) / Math.PI;
    steps.push(`المتجه الثاني طوله = ${F(mag(b))}`, `الضرب القياسي = ${a.map((x, i) => `(${F(x)})(${F(b[i])})`).join(' + ')} = ${F(dot)}`, `جتا θ = ${F(dot)} ÷ (${F(mag(a))} × ${F(mag(b))}) ⇐ θ = ${F(ang, 2)}°`);
    return { title: 'المتجهات', steps, answer: `الضرب القياسي = ${F(dot)} ، الزاوية = ${F(ang, 2)}°${Math.abs(dot) < 1e-9 ? ' (متعامدان)' : ''}`, value: dot, kind: 'vector' };
  };

  /* ================= كتابة الأعداد بالحروف ================= */
  const ONES = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const HUNDREDS = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];
  function below1000(n) {
    const h = Math.floor(n / 100), r = n % 100;
    const parts = [];
    if (h) parts.push(HUNDREDS[h]);
    if (r) {
      if (r < 20) parts.push(ONES[r]);
      else { const o = r % 10, t = Math.floor(r / 10); parts.push(o ? `${ONES[o]} و${TENS[t]}` : TENS[t]); }
    }
    return parts.join(' و');
  }
  const SCALES = [
    [1e9, 'مليار', 'ملياران', 'مليارات', 'ملياراً'],
    [1e6, 'مليون', 'مليونان', 'ملايين', 'مليوناً'],
    [1e3, 'ألف', 'ألفان', 'آلاف', 'ألفاً'],
  ];
  P.toWords = function (n) {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'صفر';
    if (n >= 1e12) return M.loc(n);
    const parts = [];
    for (const [v, one, two, plural, acc] of SCALES) {
      const c = Math.floor(n / v);
      if (!c) continue;
      n %= v;
      if (c === 1) parts.push(one);
      else if (c === 2) parts.push(two);
      else if (c >= 3 && c <= 10) parts.push(`${ONES[c]} ${plural}`);
      else if (c % 100 >= 11 && c % 100 <= 99) parts.push(`${below1000(c)} ${acc}`);
      else parts.push(`${below1000(c)} ${one}`);
    }
    if (n) parts.push(below1000(n));
    return parts.join(' و');
  };
  /** القيمة المكانية */
  P.placeValue = function (n) {
    const names = ['الآحاد', 'العشرات', 'المئات', 'الآلاف', 'عشرات الآلاف', 'مئات الآلاف', 'الملايين', 'عشرات الملايين', 'مئات الملايين', 'المليارات'];
    const digits = String(Math.floor(Math.abs(n))).split('').reverse();
    const rows = digits.map((d, i) => `${names[i] || '10^' + i}: ${L(d)} (قيمته ${L(+d * Math.pow(10, i))})`).reverse();
    return { title: `القيمة المكانية للعدد ${L(n)}`, steps: rows.concat([`بالحروف: ${P.toWords(n)}`, `الصيغة الممتدة: ${digits.map((d, i) => +d * Math.pow(10, i)).filter(Boolean).reverse().map(L).join(' + ')}`]), answer: P.toWords(n), kind: 'place' };
  };

  /* ================= حساب الوقت ================= */
  P.parseTime = function (s) {
    const m = M.toWestern(s).match(/(\d{1,2})\s*[:٫.]\s*(\d{2})/);
    if (!m) return null;
    let h = +m[1];
    if (/مساء|م\b|ظهر|عصر/.test(s) && h < 12) h += 12;
    return h * 60 + +m[2];
  };
  P.timeDiff = function (a, b) {
    let d = b - a; if (d < 0) d += 1440;
    return { title: 'المدة الزمنية', steps: [`من ${fmtT(a)} إلى ${fmtT(b)}`, 'نعدّ الساعات الكاملة ثم الدقائق المتبقية'], answer: d < 60 ? `${L(d)} دقيقة` : d % 60 ? `${L(Math.floor(d / 60))} ساعة و ${L(d % 60)} دقيقة` : `${L(d / 60)} ساعة`, value: d, kind: 'time' };
  };
  const fmtT = (m) => M.loc(String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
  P.fmtTime = fmtT;
})();
