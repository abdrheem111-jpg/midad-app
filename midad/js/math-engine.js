/* ==========================================================================
   محرك الرياضيات: محلل التعابير (يدعم الرموز العربية)، التقييم، الاشتقاق،
   كثيرات الحدود، حل المعادلات والمتباينات والأنظمة مع خطوات بالعربية
   ========================================================================== */
(function () {
  'use strict';
  const M = (window.M = window.M || {});
  const E = (M.math = {});

  /* ---------------- تطبيع النص العربي ---------------- */
  // كلمات الدوال العربية
  const FN_WORDS = {
    'جتا': 'cos', 'ظتا': 'cot', 'قتا': 'csc', 'جا': 'sin', 'ظا': 'tan', 'قا': 'sec',
    'لوغاريتم': 'log', 'لوهـ': 'ln', 'لوه': 'ln', 'لط': 'ln', 'لو': 'log',
    'الجذر': 'sqrt', 'جذر': 'sqrt', 'مطلق': 'abs', 'القيمةالمطلقة': 'abs',
  };
  // المتغيرات والثوابت العربية (حرف مستقل)
  const VAR_WORDS = {
    'س': 'x', 'ص': 'y', 'ع': 'z', 'ط': 'pi', 'هـ': 'e', 'نق': 'r',
    'أ': 'a', 'ب': 'b', 'جـ': 'c', 'ج': 'c', 'ك': 'k', 'م': 'm', 'ن': 'n', 'د': 'd', 'ل': 'l', 'ف': 'f', 'ر': 'r', 'ح': 'h',
  };
  const FN_KEYS = Object.keys(FN_WORDS).sort((a, b) => b.length - a.length);
  /** تحويل مقطع عربي: دالة (+ متغير اختياري) أو متغير مفرد، وإلا يُحذف لأنه كلمة */
  function mapArabicRun(run) {
    if (VAR_WORDS[run]) return ' ' + VAR_WORDS[run] + ' ';
    for (const k of FN_KEYS) {
      if (run.startsWith(k)) {
        const rest = run.slice(k.length);
        if (!rest) return ' ' + FN_WORDS[k] + ' ';
        if (VAR_WORDS[rest]) return ' ' + FN_WORDS[k] + ' ' + VAR_WORDS[rest] + ' ';
      }
    }
    return ' ';
  }
  E.normalize = function (s) {
    s = M.toWestern(String(s));
    // الكسر العددي أ/ب (دون مسافات) يُعامل كعدد واحد كما يقصده الطالب: ١٢ ÷ ٣/٤ = ١٦
    s = s.replace(/(?<![\^\d.\/])(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?![\d.]|\s*\^)/g, '($1/$2)');
    s = s
      .replace(/[×✕✖⋅·]/g, '*')
      .replace(/÷/g, '/')
      .replace(/[−–—]/g, '-')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4')
      .replace(/≤|=</g, '<=').replace(/≥|=>/g, '>=')
      .replace(/≠/g, '!=')
      .replace(/√/g, ' sqrt ').replace(/∛/g, ' cbrt ').replace(/π/g, ' pi ')
      .replace(/٪|%/g, '/100');
    s = s.replace(/[ء-يـ]+/g, mapArabicRun);
    s = s.replace(/[؀-ۿ]+/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  };

  /* ---------------- المحلل اللفظي ---------------- */
  const FUNCS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
    'sqrt', 'cbrt', 'abs', 'log', 'ln', 'exp', 'floor', 'ceil', 'round', 'sign'];
  const CONSTS = { pi: Math.PI, e: Math.E };

  function tokenize(s) {
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === ' ') { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const txt = s.slice(i, j);
        if ((txt.match(/\./g) || []).length > 1) throw new Error('عدد غير صالح: ' + txt);
        toks.push({ t: 'num', v: parseFloat(txt) });
        i = j; continue;
      }
      if (/[a-zA-Z]/.test(c)) {
        let j = i;
        while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
        splitIdent(s.slice(i, j), toks);
        i = j; continue;
      }
      if (c === '_') {
        let j = i + 1;
        while (j < s.length && s[j] === ' ') j++;
        let k = j;
        while (k < s.length && /[0-9.]/.test(s[k])) k++;
        const last = toks[toks.length - 1];
        if (k > j && last && last.t === 'fn' && last.v === 'log') { last.base = parseFloat(s.slice(j, k)); i = k; continue; }
        throw new Error('رمز غير معروف: _');
      }
      if (s.startsWith('<=', i) || s.startsWith('>=', i) || s.startsWith('!=', i)) { toks.push({ t: 'op', v: s.slice(i, i + 2) }); i += 2; continue; }
      if ('+-*/^()!|,=<>'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
      if (c === '[' || c === '{') { toks.push({ t: 'op', v: '(' }); i++; continue; }
      if (c === ']' || c === '}') { toks.push({ t: 'op', v: ')' }); i++; continue; }
      throw new Error('رمز غير معروف: ' + c);
    }
    return toks;
  }
  // تقسيم معرفات مثل "xy" أو "sinx" أو "2pi"
  function splitIdent(id, toks) {
    let i = 0;
    while (i < id.length) {
      let found = null;
      for (const f of FUNCS.concat(Object.keys(CONSTS)).sort((a, b) => b.length - a.length)) {
        if (id.startsWith(f, i)) { found = f; break; }
      }
      if (found) {
        toks.push(FUNCS.includes(found) ? { t: 'fn', v: found } : { t: 'const', v: found });
        i += found.length;
      } else {
        toks.push({ t: 'var', v: id[i] });
        i++;
      }
    }
  }

  /* ---------------- المحلل النحوي ---------------- */
  function Parser(toks) { this.toks = toks; this.i = 0; }
  Parser.prototype.peek = function () { return this.toks[this.i]; };
  Parser.prototype.next = function () { return this.toks[this.i++]; };
  Parser.prototype.isOp = function (v) { const t = this.peek(); return t && t.t === 'op' && t.v === v; };
  Parser.prototype.expect = function (v) {
    if (!this.isOp(v)) throw new Error('متوقع "' + v + '"');
    this.i++;
  };
  Parser.prototype.parseExpr = function () {
    let a = this.parseTerm();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next().v;
      a = { t: 'op', op, a, b: this.parseTerm() };
    }
    return a;
  };
  Parser.prototype.startsPrimary = function () {
    const t = this.peek();
    if (!t) return false;
    return t.t === 'num' || t.t === 'var' || t.t === 'fn' || t.t === 'const' || (t.t === 'op' && t.v === '(');
  };
  Parser.prototype.parseTerm = function () {
    let a = this.parseUnary();
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const op = this.next().v;
        a = { t: 'op', op, a, b: this.parseUnary() };
      } else if (this.startsPrimary()) {
        a = { t: 'op', op: '*', a, b: this.parsePower(), implicit: true };
      } else break;
    }
    return a;
  };
  Parser.prototype.parseUnary = function () {
    if (this.isOp('-')) {
      this.next();
      const a = this.parseUnary();
      return a.t === 'num' ? { t: 'num', v: -a.v } : { t: 'neg', a };
    }
    if (this.isOp('+')) { this.next(); return this.parseUnary(); }
    return this.parsePower();
  };
  Parser.prototype.parsePower = function () {
    const base = this.parsePostfix();
    if (this.isOp('^')) {
      this.next();
      return { t: 'op', op: '^', a: base, b: this.parseUnary() };
    }
    return base;
  };
  Parser.prototype.parsePostfix = function () {
    let a = this.parsePrimary();
    while (this.isOp('!')) { this.next(); a = { t: 'fn', f: 'fact', a }; }
    return a;
  };
  Parser.prototype.parsePrimary = function () {
    const t = this.next();
    if (!t) throw new Error('التعبير غير مكتمل');
    if (t.t === 'num') return { t: 'num', v: t.v };
    if (t.t === 'const') return { t: 'const', n: t.v };
    if (t.t === 'var') return { t: 'var', n: t.v };
    if (t.t === 'fn') {
      let arg;
      if (this.isOp('(')) { this.next(); arg = this.parseExpr(); this.expect(')'); }
      else arg = this.parsePower();
      // log(قاعدة، عدد) غير مدعوم هنا — log للأساس ١٠
      const node = { t: 'fn', f: t.v, a: arg };
      if (t.base) node.base = t.base;
      return node;
    }
    if (t.t === 'op' && t.v === '(') {
      const e = this.parseExpr();
      this.expect(')');
      return { t: 'paren', a: e };
    }
    if (t.t === 'op' && t.v === '|') {
      const e = this.parseExpr();
      this.expect('|');
      return { t: 'fn', f: 'abs', a: e };
    }
    throw new Error('رمز غير متوقع: ' + t.v);
  };

  /** تحليل تعبير رياضي إلى شجرة */
  E.parse = function (src, normalized) {
    const s = normalized ? src : E.normalize(src);
    if (!s) throw new Error('أدخل تعبيراً رياضياً');
    const p = new Parser(tokenize(s));
    const ast = p.parseExpr();
    if (p.i < p.toks.length) throw new Error('رمز زائد: ' + p.toks[p.i].v);
    return ast;
  };

  /** تحليل علاقة (معادلة أو متباينة) */
  E.parseRelation = function (src) {
    const s = E.normalize(src);
    const m = s.match(/^(.*?)(<=|>=|!=|=|<|>)(.*)$/);
    if (!m) return { lhs: E.parse(s, true), rel: null, rhs: null };
    return { lhs: E.parse(m[1], true), rel: m[2], rhs: E.parse(m[3], true) };
  };

  /* ---------------- التقييم ---------------- */
  function fact(n) {
    if (n < 0 || n !== Math.floor(n)) return gamma(n + 1);
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return r;
  }
  function gamma(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
  E.evaluate = function (ast, scope, angleMode) {
    scope = scope || {};
    const deg = (angleMode || 'rad') === 'deg';
    const toR = (v) => (deg ? (v * Math.PI) / 180 : v);
    const fromR = (v) => (deg ? (v * 180) / Math.PI : v);
    const ev = (n) => {
      switch (n.t) {
        case 'num': return n.v;
        case 'const': return CONSTS[n.n];
        case 'var':
          if (n.n in scope) return scope[n.n];
          throw new Error('قيمة المتغير ' + M.varName(n.n) + ' غير معروفة');
        case 'paren': return ev(n.a);
        case 'neg': return -ev(n.a);
        case 'op': {
          const a = ev(n.a), b = ev(n.b);
          switch (n.op) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return a / b;
            case '^':
              if (a < 0 && b !== Math.floor(b)) {
                const f = M.toFraction(b, 50);
                if (f && f.d % 2 === 1) return (f.n % 2 === 0 ? 1 : -1) * Math.pow(-a, b);
              }
              return Math.pow(a, b);
          }
          break;
        }
        case 'fn': {
          const v = ev(n.a);
          switch (n.f) {
            case 'sin': return cleanTrig(Math.sin(toR(v)));
            case 'cos': return cleanTrig(Math.cos(toR(v)));
            case 'tan': { const c = Math.cos(toR(v)); return Math.abs(c) < 1e-12 ? NaN : cleanTrig(Math.tan(toR(v))); }
            case 'cot': return 1 / Math.tan(toR(v));
            case 'sec': return 1 / Math.cos(toR(v));
            case 'csc': return 1 / Math.sin(toR(v));
            case 'asin': return fromR(Math.asin(v));
            case 'acos': return fromR(Math.acos(v));
            case 'atan': return fromR(Math.atan(v));
            case 'sinh': return Math.sinh(v);
            case 'cosh': return Math.cosh(v);
            case 'tanh': return Math.tanh(v);
            case 'sqrt': return Math.sqrt(v);
            case 'cbrt': return Math.cbrt(v);
            case 'abs': return Math.abs(v);
            case 'log': return n.base ? Math.log(v) / Math.log(n.base) : Math.log10(v);
            case 'ln': return Math.log(v);
            case 'exp': return Math.exp(v);
            case 'floor': return Math.floor(v);
            case 'ceil': return Math.ceil(v);
            case 'round': return Math.round(v);
            case 'sign': return Math.sign(v);
            case 'fact': return fact(v);
          }
        }
      }
      throw new Error('تعبير غير مدعوم');
    };
    return ev(ast);
  };
  function cleanTrig(v) { return Math.abs(v) < 1e-12 ? 0 : Math.abs(v - Math.round(v)) < 1e-12 ? Math.round(v) : v; }

  /** تحويل التعبير إلى دالة سريعة f(x) */
  E.compile = function (src, extraScope) {
    const ast = typeof src === 'string' ? E.parse(src) : src;
    return (x, more) => {
      try { return E.evaluate(ast, Object.assign({ x }, extraScope || {}, more || {}), 'rad'); }
      catch (e) { return NaN; }
    };
  };

  /** المتغيرات الموجودة في التعبير */
  E.variables = function (ast, set) {
    set = set || new Set();
    if (!ast) return set;
    if (ast.t === 'var') set.add(ast.n);
    ['a', 'b'].forEach((k) => { if (ast[k] && typeof ast[k] === 'object') E.variables(ast[k], set); });
    return set;
  };

  /* ---------------- الاشتقاق الرمزي ---------------- */
  const num = (v) => ({ t: 'num', v });
  const op = (o, a, b) => ({ t: 'op', op: o, a, b });
  const fn = (f, a) => ({ t: 'fn', f, a });
  function isNum(n, v) { return n.t === 'num' && (v === undefined || Math.abs(n.v - v) < 1e-12); }
  function unparen(n) { while (n && n.t === 'paren') n = n.a; return n; }

  E.simplify = function simplify(n) {
    n = unparen(n);
    if (!n) return n;
    if (n.t === 'neg') {
      const a = simplify(n.a);
      if (a.t === 'num') return num(-a.v);
      if (a.t === 'neg') return a.a;
      return { t: 'neg', a };
    }
    if (n.t === 'fn') {
      const a = simplify(n.a);
      if (a.t === 'num' && ['sqrt', 'abs'].includes(n.f)) {
        const v = E.evaluate(fn(n.f, a));
        if (Number.isInteger(v)) return num(v);
      }
      return fn(n.f, a);
    }
    if (n.t !== 'op') return n;
    const a = simplify(n.a), b = simplify(n.b);
    if (a.t === 'num' && b.t === 'num') {
      const v = E.evaluate(op(n.op, a, b));
      if (Number.isFinite(v) && (Number.isInteger(v) || n.op !== '/')) return num(v);
    }
    switch (n.op) {
      case '+':
        if (isNum(a, 0)) return b;
        if (isNum(b, 0)) return a;
        if (b.t === 'neg') return simplify(op('-', a, b.a));
        if (b.t === 'num' && b.v < 0) return op('-', a, num(-b.v));
        break;
      case '-':
        if (isNum(b, 0)) return a;
        if (isNum(a, 0)) return simplify({ t: 'neg', a: b });
        if (b.t === 'num' && b.v < 0) return op('+', a, num(-b.v));
        break;
      case '*':
        if (isNum(a, 0) || isNum(b, 0)) return num(0);
        if (isNum(a, 1)) return b;
        if (isNum(b, 1)) return a;
        if (isNum(a, -1)) return simplify({ t: 'neg', a: b });
        if (b.t === 'num' && a.t !== 'num') return simplify(op('*', b, a));
        if (a.t === 'num' && b.t === 'op' && b.op === '*' && b.a.t === 'num') return simplify(op('*', num(a.v * b.a.v), b.b));
        if (a.t === 'neg') return simplify({ t: 'neg', a: op('*', a.a, b) });
        break;
      case '/':
        if (isNum(a, 0)) return num(0);
        if (isNum(b, 1)) return a;
        break;
      case '^':
        if (isNum(b, 0)) return num(1);
        if (isNum(b, 1)) return a;
        break;
    }
    return op(n.op, a, b);
  };

  E.derivative = function (ast, v) {
    v = v || 'x';
    const D = (n) => {
      n = unparen(n);
      switch (n.t) {
        case 'num': case 'const': return num(0);
        case 'var': return num(n.n === v ? 1 : 0);
        case 'neg': return { t: 'neg', a: D(n.a) };
        case 'op': {
          const a = n.a, b = n.b;
          switch (n.op) {
            case '+': case '-': return op(n.op, D(a), D(b));
            case '*': return op('+', op('*', D(a), b), op('*', a, D(b)));
            case '/': return op('/', op('-', op('*', D(a), b), op('*', a, D(b))), op('^', b, num(2)));
            case '^': {
              const bHas = E.variables(b).has(v);
              const aHas = E.variables(a).has(v);
              if (!bHas) return op('*', op('*', b, op('^', a, E.simplify(op('-', b, num(1))))), D(a));
              if (!aHas) return op('*', op('*', n, fn('ln', a)), D(b));
              return op('*', n, op('+', op('*', D(b), fn('ln', a)), op('/', op('*', b, D(a)), a)));
            }
          }
          break;
        }
        case 'fn': {
          const u = n.a, du = D(u);
          let outer;
          switch (n.f) {
            case 'sin': outer = fn('cos', u); break;
            case 'cos': outer = { t: 'neg', a: fn('sin', u) }; break;
            case 'tan': outer = op('^', fn('sec', u), num(2)); break;
            case 'sqrt': outer = op('/', num(1), op('*', num(2), fn('sqrt', u))); break;
            case 'ln': outer = op('/', num(1), u); break;
            case 'log': outer = op('/', num(1), op('*', u, fn('ln', num(10)))); break;
            case 'exp': outer = fn('exp', u); break;
            case 'abs': outer = fn('sign', u); break;
            default: throw new Error('لا يمكن اشتقاق هذه الدالة رمزياً');
          }
          return op('*', outer, du);
        }
      }
      throw new Error('تعبير غير مدعوم للاشتقاق');
    };
    let r = D(ast);
    for (let i = 0; i < 6; i++) r = E.simplify(r);
    return r;
  };

  /* ---------------- العرض النصي و HTML ---------------- */
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };
  const FN_AR = { sin: 'جا', cos: 'جتا', tan: 'ظا', cot: 'ظتا', sec: 'قا', csc: 'قتا', log: 'لو', ln: 'لوهـ', abs: 'مطلق', exp: 'exp', asin: 'جا⁻¹', acos: 'جتا⁻¹', atan: 'ظا⁻¹' };
  function prec(n) {
    n = n.t === 'paren' ? n : n;
    if (n.t === 'op') return PREC[n.op];
    if (n.t === 'neg') return 1.5;
    return 5;
  }
  E.toText = function toText(n, html) {
    const ar = M.settings.vars === 'arabic';
    const N = (v) => (html ? M.fmt(v, 6) : M.fmt(v, 6));
    const wrap = (c, need) => (need ? '(' + c + ')' : c);
    const T = (n, parentPrec, right) => {
      switch (n.t) {
        case 'num': return n.v < 0 ? wrap('-' + N(-n.v), parentPrec > 1) : N(n.v);
        case 'const': return n.n === 'pi' ? (ar ? 'ط' : 'π') : (ar ? 'هـ' : 'e');
        case 'var': return M.varName(n.n);
        case 'paren': return T(n.a, parentPrec, right);
        case 'neg': return wrap('-' + T(n.a, 3), parentPrec > 1.5);
        case 'fn': {
          if (n.f === 'fact') return T(n.a, 5) + '!';
          if (n.f === 'sqrt') return html ? `√<span class="mroot">${T(n.a, 0)}</span>` : '√(' + T(n.a, 0) + ')';
          if (n.f === 'abs') return '|' + T(n.a, 0) + '|';
          let name = ar ? (FN_AR[n.f] || n.f) : n.f;
          if (n.f === 'log' && n.base) name += html ? '<sub>' + M.loc(n.base) + '</sub>' : '_' + M.loc(n.base);
          return name + '(' + T(n.a, 0) + ')';
        }
        case 'op': {
          const p = PREC[n.op];
          if (n.op === '/' && html) {
            return `<span class="mfrac"><span>${T(n.a, 0)}</span><span>${T(n.b, 0)}</span></span>`;
          }
          if (n.op === '^') {
            const base = T(n.a, 5);
            const ex = T(n.b, 0);
            const small = n.b.t === 'num' && (n.b.v === 2 || n.b.v === 3);
            const s = html ? base + '<sup>' + ex + '</sup>' : small ? base + (n.b.v === 2 ? '²' : '³') : base + '^' + (n.b.t === 'num' || n.b.t === 'var' ? ex : '(' + ex + ')');
            return wrap(s, parentPrec > 4);
          }
          const an = unparen(n.a);
          let a = n.op === '*' && an.t === 'num' && an.v < 0 ? '-' + N(-an.v) : T(n.a, p, false);
          let b = T(n.b, p + (n.op === '-' || n.op === '/' ? 0.5 : 0), true);
          let s;
          if (n.op === '*') {
            const bu = unparen(n.b);
            const au = unparen(n.a);
            const juxta = (au.t === 'num' || au.t === 'const' || au.t === 'var') && (bu.t === 'var' || bu.t === 'const' || bu.t === 'fn' || (bu.t === 'op' && bu.op === '^' && unparen(bu.a).t === 'var') || n.b.t === 'paren');
            s = juxta ? a + b : a + ' × ' + b;
          } else if (n.op === '/') s = a + ' / ' + b;
          else s = a + ' ' + (n.op === '-' ? '-' : '+') + ' ' + b;
          return wrap(s, parentPrec > p || (right && parentPrec === p && (n.op === '-' || n.op === '+') && parentPrec !== 1));
        }
      }
      return '?';
    };
    return T(n, 0, false);
  };
  E.toHTML = (n) => mathSpan(E.toText(n, true));
  function mathSpan(s) {
    return M.settings.vars === 'arabic' ? `<span class="math">${s}</span>` : `<span class="math" dir="ltr">${s}</span>`;
  }
  E.mathSpan = mathSpan;

  /* ---------------- كثيرات الحدود ---------------- */
  /** استخراج معاملات كثيرة حدود في متغير واحد (حتى الدرجة ٦)، أو null */
  E.polyCoeffs = function (ast, v, maxDeg) {
    v = v || 'x';
    maxDeg = maxDeg || 6;
    const vars = E.variables(ast);
    for (const w of vars) if (w !== v) return null;
    const f = (x) => { try { return E.evaluate(ast, { [v]: x }, 'rad'); } catch (e) { return NaN; } };
    const n = maxDeg + 1;
    const xs = [];
    for (let i = 0; i < n; i++) xs.push(i - Math.floor(n / 2));
    const ys = xs.map(f);
    if (ys.some((y) => !Number.isFinite(y))) return null;
    // حل نظام فاندرموند
    const A = xs.map((x) => { const row = []; for (let j = 0; j < n; j++) row.push(Math.pow(x, j)); return row; });
    const c = gaussSolve(A, ys);
    if (!c) return null;
    const coeffs = c.map((x) => (Math.abs(x - Math.round(x)) < 1e-7 ? Math.round(x) : x));
    // التحقق عند نقاط عشوائية
    const P = (x) => coeffs.reduce((s, a, j) => s + a * Math.pow(x, j), 0);
    for (const x of [0.37, -1.73, 2.61, 0.5]) {
      const y1 = f(x), y2 = P(x);
      if (!Number.isFinite(y1) || Math.abs(y1 - y2) > 1e-6 * Math.max(1, Math.abs(y1))) return null;
    }
    while (coeffs.length > 1 && Math.abs(coeffs[coeffs.length - 1]) < 1e-10) coeffs.pop();
    return coeffs; // coeffs[j] معامل x^j
  };

  function gaussSolve(A, b) {
    const n = A.length;
    const m = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
      if (Math.abs(m[p][c]) < 1e-12) return null;
      [m[c], m[p]] = [m[p], m[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = m[r][c] / m[c][c];
        for (let k = c; k <= n; k++) m[r][k] -= f * m[c][k];
      }
    }
    return m.map((r, i) => r[n] / r[i]);
  }
  E.gaussSolve = gaussSolve;

  /** كثيرة حدود كنص مرتب تنازلياً */
  E.polyToText = function (c, v, html) {
    v = M.varName(v || 'x');
    const parts = [];
    for (let j = c.length - 1; j >= 0; j--) {
      const a = c[j];
      if (Math.abs(a) < 1e-12) continue;
      const abs = Math.abs(a);
      let coef = j === 0 || Math.abs(abs - 1) > 1e-12 ? (html ? M.fracHTML(abs) : M.fmt(abs)) : '';
      let term = coef + (j >= 1 ? v : '') + (j >= 2 ? (html ? '<sup>' + M.loc(j) + '</sup>' : '^' + M.loc(j)) : '');
      parts.push({ neg: a < 0, term });
    }
    if (!parts.length) return M.loc('0');
    return parts.map((p, i) => (i === 0 ? (p.neg ? '-' : '') + p.term : (p.neg ? ' - ' : ' + ') + p.term)).join('');
  };

  /* ---------------- إيجاد الجذور ---------------- */
  E.findRoots = function (f, a, b, steps) {
    a = a == null ? -100 : a; b = b == null ? 100 : b; steps = steps || 4000;
    const roots = [];
    const h = (b - a) / steps;
    let x0 = a, y0 = f(x0);
    const push = (r) => {
      if (!Number.isFinite(r)) return;
      const rr = Math.abs(r - Math.round(r)) < 1e-7 ? Math.round(r) : r;
      if (!roots.some((q) => Math.abs(q - rr) < 1e-6)) roots.push(rr);
    };
    for (let i = 1; i <= steps; i++) {
      const x1 = a + i * h, y1 = f(x1);
      if (Number.isFinite(y0) && Number.isFinite(y1)) {
        if (y0 === 0) push(x0);
        else if (y0 * y1 < 0) {
          let lo = x0, hi = x1, flo = y0;
          for (let k = 0; k < 80; k++) {
            const mid = (lo + hi) / 2, fm = f(mid);
            if (!Number.isFinite(fm)) break;
            if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; }
          }
          const r = (lo + hi) / 2;
          // نرفض نقاط الانقطاع (مثل ظا عند ٩٠°) حيث تتغير الإشارة دون أن تنعدم الدالة
          if (Math.abs(f(r)) < 1e-6 * Math.max(1, Math.min(Math.abs(y0), Math.abs(y1)))) push(r);
        } else {
          // جذر مماس (لمس المحور)
          const xm = (x0 + x1) / 2, ym = f(xm);
          if (Number.isFinite(ym) && Math.abs(ym) < Math.abs(y0) && Math.abs(ym) < Math.abs(y1) && Math.abs(ym) < 1e-3) {
            let lo = x0, hi = x1;
            for (let k = 0; k < 60; k++) {
              const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
              if (Math.abs(f(m1)) < Math.abs(f(m2))) hi = m2; else lo = m1;
            }
            const r = (lo + hi) / 2;
            if (Math.abs(f(r)) < 1e-9) push(r);
          }
        }
      }
      x0 = x1; y0 = y1;
    }
    return roots.sort((p, q) => p - q);
  };

  /* ---------------- حل المعادلات مع الخطوات ---------------- */
  const V = (v) => M.varName(v);
  const F = (x) => M.fracHTML(x);

  function pickVar(asts) {
    const set = new Set();
    asts.forEach((a) => a && E.variables(a, set));
    if (set.has('x')) return { v: 'x', set };
    const arr = [...set];
    return { v: arr[0] || 'x', set };
  }

  /** حل معادلة/متباينة/تعبير. يعيد {title, steps:[html], answer:html, kind} */
  E.solve = function (src) {
    const lines = String(src).split(/\n|;|؛/).map((s) => s.trim()).filter(Boolean);
    if (lines.length >= 2) return E.solveSystem(lines);
    const rel = E.parseRelation(src);
    if (!rel.rel) return E.simplifyExpr(rel.lhs);
    const expr = op('-', rel.lhs, { t: 'paren', a: rel.rhs });
    const { v, set } = pickVar([rel.lhs, rel.rhs]);
    if (set.size > 1) {
      if (set.size === 2 && rel.rel === '=') return E.solveForVar(rel, v, set);
      throw new Error('المعادلة تحتوي أكثر من متغير — أدخل نظاماً من معادلتين أو أكثر (كل معادلة في سطر)');
    }
    if (set.size === 0) {
      const l = E.evaluate(rel.lhs, {}, M.settings.angle), r = E.evaluate(rel.rhs, {}, M.settings.angle);
      const ok = compare(l, rel.rel, r);
      return { title: 'التحقق من العلاقة', steps: [`الطرف الأيمن = ${M.fmt(l)} ، الطرف الأيسر = ${M.fmt(r)}`], answer: ok ? 'العلاقة صحيحة ✓' : 'العلاقة خاطئة ✗', kind: 'check' };
    }
    const coeffs = E.polyCoeffs(expr, v);
    if (rel.rel !== '=') return solveInequality(expr, rel, v, coeffs);
    if (coeffs && coeffs.length === 2) return solveLinear(rel, coeffs, v);
    if (coeffs && coeffs.length === 3) return solveQuadratic(rel, coeffs, v);
    if (coeffs && coeffs.length === 1) {
      return { title: 'معادلة', steps: ['بعد التبسيط يختفي المتغير'], answer: Math.abs(coeffs[0]) < 1e-12 ? 'المعادلة صحيحة لكل قيم ' + V(v) + ' (عدد لا نهائي من الحلول)' : 'لا يوجد حل (المعادلة مستحيلة)', kind: 'eq' };
    }
    return solveNumeric(expr, rel, v, coeffs);
  };

  function compare(l, rel, r) {
    const eps = 1e-9;
    switch (rel) {
      case '=': return Math.abs(l - r) < eps;
      case '!=': return Math.abs(l - r) >= eps;
      case '<': return l < r - eps;
      case '>': return l > r + eps;
      case '<=': return l <= r + eps;
      case '>=': return l >= r - eps;
    }
    return false;
  }

  function solveLinear(rel, c, v) {
    const [b, a] = c; // a*v + b = 0
    const steps = [];
    steps.push(`المعادلة: ${E.toHTML(rel.lhs)} = ${E.toHTML(rel.rhs)}`);
    steps.push(`نجمع الحدود المتشابهة وننقل الحدود ليصبح شكلها: ${mathSpan(E.polyToText([b, a], v, true) + ' = ' + M.loc(0))}`);
    steps.push(`ننقل الحد الثابت إلى الطرف الآخر: ${mathSpan(E.polyToText([0, a], v, true) + ' = ' + F(-b))}`);
    const x = -b / a;
    if (Math.abs(a - 1) > 1e-12) steps.push(`نقسم الطرفين على ${F(a)}: ${mathSpan(V(v) + ' = ' + F(-b) + ' ÷ ' + F(a))}`);
    steps.push(`التحقق: بالتعويض بـ ${mathSpan(V(v) + ' = ' + F(x))} يتساوى الطرفان ✓`);
    return { title: 'حل معادلة من الدرجة الأولى', steps, answer: mathSpan(V(v) + ' = ' + F(x)) + (M.toFraction(x) && M.toFraction(x).d !== 1 ? ` ≈ ${M.fmt(x)}` : ''), roots: [x], kind: 'eq', v };
  }

  function solveQuadratic(rel, c, v) {
    let [cc, b, a] = c;
    const steps = [];
    steps.push(`المعادلة: ${E.toHTML(rel.lhs)} = ${E.toHTML(rel.rhs)}`);
    steps.push(`نكتبها بالصورة العامة أ${V(v)}² + ب${V(v)} + جـ = ٠: ${mathSpan(E.polyToText(c, v, true) + ' = ' + M.loc(0))}`);
    steps.push(`المعاملات: أ = ${F(a)} ، ب = ${F(b)} ، جـ = ${F(cc)}`);
    const D = b * b - 4 * a * cc;
    if (b !== 0) {
      const h = b / (2 * a), k = cc - (b * b) / (4 * a);
      steps.push(`بإكمال المربع (الصورة الرأسية): ${mathSpan((Math.abs(a - 1) < 1e-12 ? '' : F(a)) + '(' + V(v) + (h < 0 ? ' - ' : ' + ') + F(Math.abs(h)) + ')² ' + (k < 0 ? '- ' : '+ ') + F(Math.abs(k)) + ' = ' + M.loc(0))} ، والرأس ${M.pointStr(-h, k)}`);
    }
    steps.push(`المميّز: Δ = ب² - ٤أجـ = (${F(b)})² - ٤ × (${F(a)}) × (${F(cc)}) = ${F(D)}`);
    const roots = [];
    let answer;
    if (D < -1e-12) {
      const re = -b / (2 * a), im = Math.sqrt(-D) / (2 * Math.abs(a));
      steps.push('بما أن المميّز سالب فلا توجد جذور حقيقية؛ الجذران عددان مركبان مترافقان:');
      const iu = M.settings.vars === 'arabic' ? 'ت' : 'i';
      answer = `لا توجد حلول حقيقية — ${mathSpan(V(v) + ' = ' + M.fmt(re) + ' ± ' + M.fmt(im) + iu)}`;
    } else if (Math.abs(D) < 1e-12) {
      const x = -b / (2 * a);
      roots.push(x);
      steps.push(`المميّز = ٠ ⇐ جذر مكرر: ${mathSpan(V(v) + ' = -ب ÷ ٢أ = ' + F(x))}`);
      answer = mathSpan(V(v) + ' = ' + F(x)) + ' (جذر مكرر)';
    } else {
      const sq = Math.sqrt(D);
      const x1 = (-b + sq) / (2 * a), x2 = (-b - sq) / (2 * a);
      roots.push(Math.min(x1, x2), Math.max(x1, x2));
      steps.push(`نستخدم القانون العام: ${mathSpan(V(v) + ' = <span class="mfrac"><span>-ب ± √Δ</span><span>٢أ</span></span>')}`);
      const sqTxt = Number.isInteger(sq) ? M.loc(sq) : '√' + M.loc(parseFloat(D.toFixed(6)));
      steps.push(`${mathSpan(V(v) + ' = <span class="mfrac"><span>' + M.fmt(-b) + ' ± ' + sqTxt + '</span><span>' + M.fmt(2 * a) + '</span></span>')}`);
      const nice = (x) => F(x) + (M.toFraction(x) ? '' : '');
      answer = `${mathSpan(V(v) + '₁ = ' + nice(roots[0]))} ، ${mathSpan(V(v) + '₂ = ' + nice(roots[1]))}`;
      const r1 = M.toFraction(roots[0], 100), r2 = M.toFraction(roots[1], 100);
      if (r1 && r2) {
        steps.push(`التحليل إلى عوامل: ${mathSpan(factorText(a, roots[0], roots[1], v) + ' = ' + M.loc(0))}`);
      }
    }
    return { title: 'حل معادلة من الدرجة الثانية', steps, answer, roots, kind: 'eq', v };
  }

  function factorText(a, r1, r2, v) {
    const term = (r) => {
      const f = M.toFraction(r, 100);
      if (f && f.d !== 1) {
        // (d·x - n)
        const s = f.n < 0 ? ' + ' : ' - ';
        return `(${M.loc(f.d)}${V(v)}${s}${M.loc(Math.abs(f.n))})`;
      }
      if (Math.abs(r) < 1e-12) return V(v);
      return `(${V(v)}${r < 0 ? ' + ' : ' - '}${M.fmt(Math.abs(r))})`;
    };
    let k = a;
    [r1, r2].forEach((r) => { const f = M.toFraction(r, 100); if (f && f.d !== 1) k /= f.d; });
    const pre = Math.abs(k - 1) < 1e-12 ? '' : Math.abs(k + 1) < 1e-12 ? '-' : M.fmt(k);
    return pre + term(r1) + term(r2);
  }
  E.factorQuadratic = function (c, v) {
    const [cc, b, a] = c;
    const D = b * b - 4 * a * cc;
    if (D < 0) return null;
    const r1 = (-b - Math.sqrt(D)) / (2 * a), r2 = (-b + Math.sqrt(D)) / (2 * a);
    if (!M.toFraction(r1, 100) || !M.toFraction(r2, 100)) return null;
    return factorText(a, r1, r2, v || 'x');
  };

  function solveNumeric(expr, rel, v, coeffs) {
    const f = (x) => { try { return E.evaluate(expr, { [v]: x }, M.settings.angle); } catch (e) { return NaN; } };
    const isTrig = JSON.stringify(expr).match(/"f":"(sin|cos|tan)"/);
    const range = isTrig ? (M.settings.angle === 'deg' ? [0, 359.999] : [0, 2 * Math.PI - 1e-9]) : [-1000, 1000];
    const roots = E.findRoots(f, range[0], range[1], isTrig ? 8000 : 20000);
    const steps = [`المعادلة: ${E.toHTML(rel.lhs)} = ${E.toHTML(rel.rhs)}`];
    if (coeffs) steps.push(`كثيرة حدود من الدرجة ${M.loc(coeffs.length - 1)}: ${mathSpan(E.polyToText(coeffs, v, true) + ' = ' + M.loc(0))}`);
    // محاولة الجذور النسبية
    if (coeffs && coeffs.every((c) => Number.isInteger(c))) {
      const rat = roots.filter((r) => Number.isInteger(r));
      if (rat.length) steps.push(`بتجربة قواسم الحد الثابت (نظرية الجذور النسبية) نجد: ${rat.map((r) => mathSpan(V(v) + ' = ' + M.fmt(r))).join(' ، ')}`);
    }
    steps.push(`نبحث عددياً عن النقاط التي تنعدم عندها الدالة ${isTrig ? (M.settings.angle === 'deg' ? 'في الفترة ٠° ≤ ' + V(v) + ' < ٣٦٠°' : 'في الفترة [٠، ٢ط)') : ''} (طريقة التنصيف)`);
    const answer = roots.length
      ? roots.map((r, i) => mathSpan(V(v) + (roots.length > 1 ? subIdx(i + 1) : '') + ' ≈ ' + (Number.isInteger(r) ? M.loc(r) : M.fmt(r)))).join(' ، ')
      : 'لم يُعثر على حلول حقيقية في المدى المفحوص';
    return { title: 'حل معادلة', steps, answer, roots, kind: 'eq', v };
  }
  const subIdx = (i) => String(i).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);

  function solveInequality(expr, rel, v, coeffs) {
    const f = (x) => { try { return E.evaluate(expr, { [v]: x }, M.settings.angle); } catch (e) { return NaN; } };
    const relAR = { '<': '&lt;', '>': '&gt;', '<=': '≤', '>=': '≥', '!=': '≠' }[rel.rel];
    const steps = [`المتباينة: ${E.toHTML(rel.lhs)} ${relAR} ${E.toHTML(rel.rhs)}`];
    if (coeffs && coeffs.length === 2) {
      const [b, a] = coeffs;
      steps.push(`ننقل الحدود: ${mathSpan(E.polyToText([0, a], v, true) + ' ' + relAR + ' ' + F(-b))}`);
      let r = rel.rel;
      if (a < 0) {
        const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '!=': '!=' };
        r = flip[r];
        steps.push('نقسم على عدد سالب ⇐ <b>نعكس إشارة المتباينة</b>');
      }
      const x = -b / a;
      const rA = { '<': '&lt;', '>': '&gt;', '<=': '≤', '>=': '≥', '!=': '≠' }[r];
      return { title: 'حل متباينة خطية', steps, answer: mathSpan(V(v) + ' ' + rA + ' ' + F(x)), kind: 'ineq', v, boundary: x, rel: r };
    }
    const roots = E.findRoots(f, -1000, 1000, 20000);
    steps.push(`نجد أصفار الطرف: ${roots.length ? roots.map((r) => M.fmt(r)).join('، ') : 'لا توجد أصفار'}`);
    steps.push('نختبر إشارة الدالة في كل فترة بين الأصفار:');
    const pts = [-Infinity].concat(roots, [Infinity]);
    const intervals = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const lo = pts[i], hi = pts[i + 1];
      const t = !Number.isFinite(lo) ? (Number.isFinite(hi) ? hi - 1 : 0) : !Number.isFinite(hi) ? lo + 1 : (lo + hi) / 2;
      const val = f(t);
      const ok = compare(val, rel.rel, 0);
      steps.push(`الفترة (${Number.isFinite(lo) ? M.fmt(lo) : '−∞'}، ${Number.isFinite(hi) ? M.fmt(hi) : '∞'}): الإشارة ${val > 0 ? 'موجبة +' : 'سالبة −'} ${ok ? '✓' : '✗'}`);
      if (ok) intervals.push([lo, hi]);
    }
    const incl = rel.rel.includes('=');
    const txt = intervals.map(([lo, hi]) => `${Number.isFinite(lo) && incl ? '[' : '('}${Number.isFinite(lo) ? M.fmt(lo) : '−∞'}، ${Number.isFinite(hi) ? M.fmt(hi) : '∞'}${Number.isFinite(hi) && incl ? ']' : ')'}`);
    return { title: 'حل متباينة', steps, answer: txt.length ? 'مجموعة الحل: ' + txt.join(' ∪ ') : 'لا يوجد حل', kind: 'ineq', v };
  }

  function linearCoeffs(ast, vars) {
    // معاملات دالة خطية في عدة متغيرات، أو null
    const f = (vals) => { try { return E.evaluate(ast, vals, 'rad'); } catch (e) { return NaN; } };
    const zero = {}; vars.forEach((v) => (zero[v] = 0));
    const c0 = f(zero);
    if (!Number.isFinite(c0)) return null;
    const cs = vars.map((v) => { const p = Object.assign({}, zero, { [v]: 1 }); return f(p) - c0; });
    for (let t = 0; t < 3; t++) {
      const p = {}; vars.forEach((v) => (p[v] = Math.random() * 6 - 3));
      const lin = c0 + vars.reduce((s, v, i) => s + cs[i] * p[v], 0);
      if (Math.abs(f(p) - lin) > 1e-6 * Math.max(1, Math.abs(lin))) return null;
    }
    return { c: cs.map(round9), k: round9(c0) };
  }
  const round9 = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : x);

  /** حل معادلة بمتغيرين لمتغير واحد، مثل ص = ٢س + ٣ ⇒ نعرض الميل والمقطع */
  E.solveForVar = function (rel, v, set) {
    const vars = [...set].sort();
    const expr = op('-', rel.lhs, { t: 'paren', a: rel.rhs });
    const lc = linearCoeffs(expr, vars);
    if (!lc) throw new Error('المعادلة بمتغيرين وغير خطية — جرّب رسمها في لوحة الدوال');
    const steps = [`المعادلة: ${E.toHTML(rel.lhs)} = ${E.toHTML(rel.rhs)}`, 'معادلة خطية بمتغيرين تمثّل خطاً مستقيماً.'];
    let answer = '', mOut = null, bOut = null;
    if (set.has('x') && set.has('y')) {
      const [cx, cy] = [lc.c[vars.indexOf('x')], lc.c[vars.indexOf('y')]];
      if (Math.abs(cy) > 1e-12) {
        const m = -cx / cy, b = -lc.k / cy;
        mOut = m; bOut = b;
        steps.push(`نعزل ${V('y')}: ${mathSpan(V('y') + ' = ' + E.polyToText([b, m], 'x', true))}`);
        steps.push(`الميل م = ${F(m)} ، المقطع الصادي = ${F(b)}`);
        if (Math.abs(m) > 1e-12) steps.push(`المقطع السيني = ${F(-b / m)}`);
        answer = mathSpan(V('y') + ' = ' + E.polyToText([b, m], 'x', true));
      } else {
        answer = mathSpan(V('x') + ' = ' + F(-lc.k / cx)) + ' (خط رأسي)';
      }
    } else {
      const [a1, a2] = lc.c;
      answer = mathSpan(V(vars[0]) + ' = ' + E.polyToText([-lc.k / a1, -a2 / a1], vars[1], true));
    }
    return { title: 'معادلة خطية بمتغيرين', steps, answer, kind: 'line', m: mOut, b: bOut };
  };

  /** حل نظام معادلات خطية (حتى ٤ متغيرات) */
  E.solveSystem = function (lines) {
    const rels = lines.map((l) => E.parseRelation(l));
    if (rels.some((r) => r.rel !== '=')) throw new Error('كل سطر في النظام يجب أن يكون معادلة');
    const set = new Set();
    rels.forEach((r) => { E.variables(r.lhs, set); E.variables(r.rhs, set); });
    const vars = [...set].sort((a, b) => 'xyzabc'.indexOf(a) - 'xyzabc'.indexOf(b));
    const rows = rels.map((r) => linearCoeffs(op('-', r.lhs, { t: 'paren', a: r.rhs }), vars));
    if (rows.some((r) => !r)) throw new Error('النظام غير خطي — هذه الأداة تحل الأنظمة الخطية');
    const steps = ['نكتب النظام بالصورة القياسية:'];
    rows.forEach((r) => {
      const lhs = r.c.map((c, i) => ({ c, v: vars[i] })).filter((t) => Math.abs(t.c) > 1e-12)
        .map((t, i) => (i === 0 ? (t.c < 0 ? '-' : '') : t.c < 0 ? ' - ' : ' + ') + (Math.abs(Math.abs(t.c) - 1) < 1e-12 ? '' : F(Math.abs(t.c))) + V(t.v)).join('');
      steps.push(mathSpan(lhs + ' = ' + F(-r.k)));
    });
    const n = vars.length;
    if (rows.length < n) throw new Error('عدد المعادلات أقل من عدد المجاهيل');
    const A = rows.slice(0, n).map((r) => r.c);
    const b = rows.slice(0, n).map((r) => -r.k);
    if (n === 2) {
      const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      steps.push(`نستخدم طريقة كرامر: المحدد Δ = (${F(A[0][0])})(${F(A[1][1])}) - (${F(A[0][1])})(${F(A[1][0])}) = ${F(det)}`);
      if (Math.abs(det) < 1e-12) return { title: 'نظام معادلتين', steps: steps.concat(['المحدد = ٠ ⇐ النظام إما بلا حل (خطان متوازيان) أو له عدد لا نهائي من الحلول (خطان منطبقان)']), answer: 'لا يوجد حل وحيد', kind: 'system' };
      const dx = b[0] * A[1][1] - A[0][1] * b[1], dy = A[0][0] * b[1] - b[0] * A[1][0];
      steps.push(`Δ${V(vars[0])} = ${F(dx)} ، Δ${V(vars[1])} = ${F(dy)}`);
      steps.push(`${mathSpan(V(vars[0]) + ' = Δ' + V(vars[0]) + ' ÷ Δ = ' + F(dx / det))} ، ${mathSpan(V(vars[1]) + ' = ' + F(dy / det))}`);
      return { title: 'حل نظام معادلتين خطيتين', steps, answer: `${mathSpan(V(vars[0]) + ' = ' + F(dx / det))} ، ${mathSpan(V(vars[1]) + ' = ' + F(dy / det))}`, sol: [dx / det, dy / det], vars, kind: 'system' };
    }
    const sol = gaussSolve(A, b);
    steps.push('نستخدم طريقة الحذف (جاوس–جوردان) لتحويل مصفوفة المعاملات إلى مصفوفة الوحدة.');
    if (!sol) return { title: 'نظام معادلات', steps, answer: 'لا يوجد حل وحيد', kind: 'system' };
    return { title: 'حل نظام معادلات خطية', steps, answer: vars.map((v, i) => mathSpan(V(v) + ' = ' + F(round9(sol[i])))).join(' ، '), sol, vars, kind: 'system' };
  };

  /** تبسيط/حساب تعبير */
  E.simplifyExpr = function (ast) {
    const vars = E.variables(ast);
    if (vars.size === 0) {
      const v = E.evaluate(ast, {}, M.settings.angle);
      const f = M.toFraction(v);
      const steps = [`التعبير: ${E.toHTML(ast)}`];
      if (JSON.stringify(ast).match(/"f":"(sin|cos|tan)"/)) steps.push(`الزوايا بـ${M.settings.angle === 'deg' ? 'الدرجات' : 'الراديان'}`);
      return { title: 'حساب', steps, answer: `= ${F(v)}${f && f.d !== 1 ? ' ≈ ' + M.fmt(v, 6) : ''}`, value: v, kind: 'calc' };
    }
    if (vars.size === 1) {
      const v = [...vars][0];
      const c = E.polyCoeffs(ast, v);
      if (c) {
        const steps = [`التعبير: ${E.toHTML(ast)}`, 'نفك الأقواس ونجمع الحدود المتشابهة:'];
        const expanded = E.polyToText(c, v, true);
        steps.push(mathSpan(expanded));
        let answer = '= ' + mathSpan(expanded);
        if (c.length === 3) {
          const fq = E.factorQuadratic(c, v);
          if (fq) { steps.push(`التحليل إلى عوامل: ${mathSpan(fq)}`); answer += ` = ${mathSpan(fq)}`; }
        }
        return { title: 'تبسيط كثيرة حدود', steps, answer, coeffs: c, kind: 'poly', v };
      }
    }
    return { title: 'تبسيط', steps: [`التعبير: ${E.toHTML(ast)}`], answer: '= ' + E.toHTML(E.simplify(ast)), kind: 'expr' };
  };

  /* ---------------- نظرية الأعداد ---------------- */
  E.gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  E.lcm = (a, b) => (a && b ? Math.abs(a * b) / E.gcd(a, b) : 0);
  E.factorize = function (n) {
    const f = [];
    n = Math.abs(Math.floor(n));
    for (let p = 2; p * p <= n; p++) while (n % p === 0) { f.push(p); n /= p; }
    if (n > 1) f.push(n);
    return f;
  };
  E.isPrime = (n) => n > 1 && E.factorize(n).length === 1;
  E.divisors = function (n) {
    const d = [];
    for (let i = 1; i * i <= n; i++) if (n % i === 0) { d.push(i); if (i * i !== n) d.push(n / i); }
    return d.sort((a, b) => a - b);
  };

  /* ---------------- الإحصاء ---------------- */
  E.stats = function (data) {
    const xs = data.filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
    const n = xs.length;
    if (!n) return null;
    const sum = xs.reduce((s, v) => s + v, 0);
    const mean = sum / n;
    const median = n % 2 ? xs[(n - 1) / 2] : (xs[n / 2 - 1] + xs[n / 2]) / 2;
    const freq = new Map();
    xs.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
    const maxF = Math.max(...freq.values());
    const mode = maxF > 1 ? [...freq.entries()].filter(([, f]) => f === maxF).map(([v]) => v) : [];
    const varP = xs.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const varS = n > 1 ? (varP * n) / (n - 1) : 0;
    const q = (p) => {
      const pos = (n - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos);
      return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo);
    };
    return { n, sum, mean, median, mode, min: xs[0], max: xs[n - 1], range: xs[n - 1] - xs[0], varP, varS, sdP: Math.sqrt(varP), sdS: Math.sqrt(varS), q1: q(0.25), q3: q(0.75), iqr: q(0.75) - q(0.25), sorted: xs, freq };
  };
  E.regression = function (pts) {
    const n = pts.length;
    if (n < 2) return null;
    const mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    pts.forEach(([x, y]) => { sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
    if (sxx === 0) return null;
    const m = sxy / sxx, b = my - m * mx;
    const r = syy === 0 ? 1 : sxy / Math.sqrt(sxx * syy);
    return { m, b, r, r2: r * r };
  };

  /** استخراج الأعداد من نص */
  E.numbersIn = function (s) {
    return (M.toWestern(s).match(/-?\d+(\.\d+)?/g) || []).map(Number);
  };
})();
