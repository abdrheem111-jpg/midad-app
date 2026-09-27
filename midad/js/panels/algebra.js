/* ==========================================================================
   لوحة الجبر والدوال: حلّال المعادلات بالخطوات + راسم الدوال التفاعلي
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const E = M.math;

  const EXAMPLES = [
    '٢س + ٥ = ١٣', '٣(س - ٢) = ٢س + ١', 'س² - ٥س + ٦ = ٠', '٢س² + ٣س - ٢ = ٠', 'س³ - ٦س² + ١١س - ٦ = ٠',
    '٣س - ٤ > ٨', 'س² - ٩ ≤ ٠', 'س + ص = ١٠\n٢س - ص = ٢', '(س + ٣)²', 'جا(٣٠) + جتا(٦٠)', '√١٤٤ + ٢^٥', 'ص = ٢س - ٤',
  ];
  const KEYS = ['س', 'ص', '²', '³', '^', '√', '(', ')', '=', '<', '>', '≤', '≥', '/', '×', 'جا', 'جتا', 'ظا', 'ط', 'لو'];

  let plotApi = null;

  M.registerPanel({
    id: 'algebra', title: 'الجبر والدوال', short: 'الجبر', icon: 'algebra',
    desc: 'حل المعادلات بالخطوات ورسم الدوال وتحليلها',
    build(root) {
      const seg = h('div', { class: 'seg-ctl' });
      const bSolve = h('button', { class: 'active' }, 'حلّال المعادلات');
      const bGraph = h('button', {}, 'راسم الدوال');
      seg.append(bSolve, bGraph);
      const solveEl = h('div');
      const graphEl = h('div', { style: { display: 'none' } });
      root.append(seg, solveEl, graphEl);
      const show = (which) => {
        bSolve.classList.toggle('active', which === 'solve');
        bGraph.classList.toggle('active', which === 'graph');
        solveEl.style.display = which === 'solve' ? '' : 'none';
        graphEl.style.display = which === 'graph' ? '' : 'none';
        if (which === 'graph' && plotApi) plotApi.redraw();
        const db = root.closest('.drawer-body'); if (db) db.scrollTop = 0;
      };
      bSolve.onclick = () => show('solve');
      bGraph.onclick = () => show('graph');
      const solverApi = buildSolver(solveEl, (exprs, marks) => { show('graph'); plotApi.setFunctions(exprs, marks); });
      plotApi = buildGrapher(graphEl);
      M.algebra = { solve: (t) => { show('solve'); solveEl.querySelector('textarea').value = t; solveEl.querySelector('.btn.primary').click(); }, graph: (exprs) => { show('graph'); plotApi.setFunctions(exprs); }, graphText: (t) => solverApi.graphText(t) };
    },
    onShow() { if (plotApi) plotApi.redraw(); },
  });

  /* ---------------- الحلّال ---------------- */
  function buildSolver(root, toGraph) {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('algebra')} اكتب المعادلة أو التعبير</h4>
      <div class="hint">يدعم الرموز العربية: س، ص، جا، جتا، ظا، لو، √، ط — والأرقام العربية. للأنظمة اكتب كل معادلة في سطر.</div>`;
    const ta = h('textarea', { class: 'inp math-inp', rows: 2, placeholder: 'مثال: ٢س + ٣ = ٧', dir: 'rtl' });
    const keys = h('div', { class: 'chips', style: { margin: '8px 0' } });
    KEYS.forEach((k) => {
      const b = h('button', { class: 'chip' }, k);
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.onclick = () => { const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + k + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + k.length; ta.focus(); };
      keys.appendChild(b);
    });
    const btns = h('div', { class: 'row' });
    const solveBtn = h('button', { class: 'btn primary', html: icon('check') + '<span>حُلّ بالخطوات</span>' });
    const derivBtn = h('button', { class: 'btn', html: '<span>المشتقة</span>' });
    const graphBtn = h('button', { class: 'btn', html: icon('function') + '<span>ارسم</span>' });
    btns.append(solveBtn, derivBtn, graphBtn);
    const out = h('div');
    card.append(ta, keys, btns, out);

    const ex = h('div', { class: 'card' });
    ex.innerHTML = `<h4>${icon('book')} أمثلة جاهزة</h4>`;
    const chips = h('div', { class: 'chips' });
    EXAMPLES.forEach((e) => { const c = h('button', { class: 'chip' }, e.replace('\n', ' ، ')); c.onclick = () => { ta.value = e; solve(); }; chips.appendChild(c); });
    ex.appendChild(chips);
    root.append(card, ex);

    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); solve(); } });

    function exprsFor(txt) {
      const lines = txt.split('\n').filter((l) => l.trim());
      return lines.map((l) => {
        const rel = E.parseRelation(l);
        if (!rel.rel) return l;
        const vars = new Set(); E.variables(rel.lhs, vars); E.variables(rel.rhs, vars);
        // ص = ... ⇒ نرسم الطرف الأيمن
        const lu = rel.lhs.t === 'var' && rel.lhs.n === 'y';
        if (lu) return M.htmlToPlain(E.toText(rel.rhs));
        if (vars.has('y')) {
          // معادلة خطية بمتغيرين: نعزل ص عددياً
          try { const r = E.solveForVar(rel, 'x', vars); return M.htmlToPlain(r.answer).replace(/^.*?=/, ''); } catch (e) { return null; }
        }
        const r0 = E.simplify(rel.rhs);
        if (r0.t === 'num' && r0.v === 0) return E.toText(rel.lhs);
        return `(${E.toText(rel.lhs)}) - (${E.toText(rel.rhs)})`;
      }).filter(Boolean);
    }

    function solve() {
      out.innerHTML = '';
      const txt = ta.value.trim();
      if (!txt) return;
      try {
        const res = E.solve(txt);
        const extra = [];
        const gb = h('button', { class: 'btn sm', html: icon('function') + '<span>ارسم</span>' });
        gb.onclick = () => {
          const marks = (res.roots || []).map((r) => ({ x: r, y: 0, label: M.varName(res.v || 'x') + ' = ' + M.fmt(r) }));
          if (res.sol && res.vars && res.vars.length === 2) marks.push({ x: res.sol[0], y: res.sol[1], label: M.pointStr(res.sol[0], res.sol[1]) });
          toGraph(exprsFor(txt), marks);
        };
        if (res.kind !== 'calc' && res.kind !== 'check') extra.push(gb);
        out.appendChild(M.renderResult(res, { extraActions: extra }));
        M.emit('solved', { input: txt, res });
      } catch (err) {
        out.appendChild(h('div', { class: 'err' }, '⚠ ' + err.message));
      }
    }
    solveBtn.onclick = solve;
    derivBtn.onclick = () => {
      out.innerHTML = '';
      try {
        let txt = ta.value.trim().replace(/^.*?[=]/, '');
        const ast = E.parse(txt);
        const d = E.derivative(ast, 'x');
        const res = {
          title: 'الاشتقاق', steps: [
            `الدالة: ${E.mathSpan('د(' + M.varName('x') + ') = ')}${E.toHTML(ast)}`,
            'نطبّق قواعد الاشتقاق (القوة، الضرب، القسمة، السلسلة، الدوال المثلثية) حداً حداً',
          ], answer: `${E.mathSpan('د′(' + M.varName('x') + ') = ')}${E.toHTML(d)}`,
        };
        const gb = h('button', { class: 'btn sm', html: icon('function') + '<span>ارسم الدالة ومشتقتها</span>' });
        gb.onclick = () => toGraph([M.htmlToPlain(E.toText(ast)), M.htmlToPlain(E.toText(d))]);
        out.appendChild(M.renderResult(res, { extraActions: [gb] }));
      } catch (err) { out.appendChild(h('div', { class: 'err' }, '⚠ ' + err.message)); }
    };
    graphBtn.onclick = () => { const e = exprsFor(ta.value); if (e.length) toGraph(e); };
    return { graphText: (t) => { ta.value = t; const e = exprsFor(t).filter(Boolean); if (e.length) toGraph(e); return e.length > 0; } };
  }

  /* ---------------- راسم الدوال ---------------- */
  const PARAMS = ['a', 'b', 'c', 'k', 'm', 'n'];
  function buildGrapher(root) {
    const box = h('div', { class: 'plot-box' });
    const cv = h('canvas');
    const tools = h('div', { class: 'plot-tools' });
    [['zoomIn', 1.3], ['zoomOut', 1 / 1.3]].forEach(([ic, f]) => { const b = h('button', { html: icon(ic) }); b.onclick = () => plot.zoom(f); tools.appendChild(b); });
    const home = h('button', { html: icon('reset'), title: 'إعادة الضبط' });
    home.onclick = () => { plot.cx = 0; plot.cy = 0; plot.scale = 32; plot.draw(); };
    tools.appendChild(home);
    box.append(cv, tools);
    root.appendChild(box);
    const plot = new M.Plot(cv);

    const fnCard = h('div', { class: 'card', style: { marginTop: '12px' } });
    fnCard.innerHTML = `<h4>${icon('function')} الدوال</h4><div class="hint">اكتب الدالة بدلالة س، مثل: س² - ٤ ، جا(س) ، ٢^س. للمتباينات اكتب مثلاً: ص > س² . استخدم أ، ب، جـ، ك كمعاملات لتظهر لها منزلقات.</div>`;
    const list = h('div');
    const addBtn = h('button', { class: 'btn sm', html: icon('plus') + '<span>دالة جديدة</span>' });
    const sliders = h('div');
    fnCard.append(list, addBtn, sliders);
    const anaCard = h('div', { class: 'card' });
    anaCard.innerHTML = `<h4>${icon('target')} تحليل الدالة</h4>`;
    const ana = h('div', { class: 'info-list' });
    anaCard.appendChild(ana);
    const actCard = h('div', { class: 'row' });
    const toBoard = h('button', { class: 'btn primary', html: icon('board') + '<span>أضف الرسم إلى السبورة</span>' });
    const tableBtn = h('button', { class: 'btn', html: icon('grid') + '<span>جدول قيم</span>' });
    const derivT = h('button', { class: 'btn', html: '<span>إظهار المشتقة</span>' });
    actCard.append(toBoard, tableBtn, derivT);
    root.append(fnCard, anaCard, actCard);

    const colors = () => M.seriesColors();
    let rows = [];
    let params = {};
    let marks = [];
    let showDeriv = false;

    function addRow(txt) {
      if (rows.length >= 6) return M.toast('الحد الأقصى ست دوال');
      const r = { txt: txt || '', hidden: false };
      rows.push(r);
      renderRows();
      return r;
    }
    function renderRows() {
      list.innerHTML = '';
      rows.forEach((r, i) => {
        const row = h('div', { class: 'fn-row' });
        const dot = h('span', { class: 'dot' + (r.hidden ? ' off' : ''), style: { background: colors()[i] }, title: 'إظهار/إخفاء' });
        dot.onclick = () => { r.hidden = !r.hidden; renderRows(); update(); };
        const pre = h('span', { class: 'prefix' }, `د${M.loc(i + 1)}:`);
        const inp = h('input', { class: 'inp math-inp', value: r.txt, placeholder: 'مثال: س² - ٢س - ٣' });
        inp.addEventListener('input', M.debounce(() => { r.txt = inp.value; update(); }, 250));
        const del = h('button', { class: 'icon-btn sm', html: icon('close'), title: 'حذف' });
        del.onclick = () => { rows.splice(i, 1); renderRows(); update(); };
        row.append(dot, pre, inp, del);
        list.appendChild(row);
      });
    }

    function compileRow(r, i) {
      let src = r.txt.trim();
      if (!src) return null;
      let shade = null;
      const nm = E.normalize(src);
      const m = nm.match(/^\s*y\s*(<=|>=|<|>|=)(.*)$/);
      if (m) { src = m[2]; if (m[1] !== '=') shade = m[1].includes('>') ? 'above' : 'below'; }
      else if (/^[^=<>]*=/.test(nm)) src = nm.split('=')[1];
      try {
        const ast = E.parse(src, !!m || /=/.test(nm));
        const vars = E.variables(ast);
        for (const v of vars) if (v !== 'x' && !PARAMS.includes(v)) throw new Error('متغير غير معروف: ' + M.varName(v));
        return { ast, vars, shade, dash: m && (m[1] === '<' || m[1] === '>') };
      } catch (e) { return { error: e.message }; }
    }

    function update() {
      const compiled = rows.map(compileRow);
      // المعاملات
      const used = new Set();
      compiled.forEach((c) => c && c.vars && c.vars.forEach((v) => v !== 'x' && used.add(v)));
      sliders.innerHTML = '';
      [...used].sort().forEach((p) => {
        if (!(p in params)) params[p] = 1;
        const row = h('div', { class: 'slider-row' });
        const out = h('output', {}, M.fmt(params[p], 2));
        const rng = h('input', { type: 'range', min: -10, max: 10, step: 0.1, value: params[p] });
        rng.oninput = () => { params[p] = +rng.value; out.textContent = M.fmt(params[p], 2); draw(); };
        row.append(h('span', {}, M.varName(p) + ' ='), rng, out);
        sliders.appendChild(row);
      });
      draw(compiled);
    }
    let lastCompiled = [];
    function draw(compiled) {
      if (compiled) lastCompiled = compiled;
      const cols = colors();
      plot.fns = [];
      lastCompiled.forEach((c, i) => {
        if (!c || c.error) return;
        const f = (x) => { try { return E.evaluate(c.ast, Object.assign({ x }, params), 'rad'); } catch (e) { return NaN; } };
        plot.fns.push({ f, color: cols[i], hidden: rows[i].hidden, shade: c.shade, dash: c.dash, ast: c.ast });
        if (showDeriv && !rows[i].hidden) {
          try {
            const d = E.derivative(c.ast, 'x');
            plot.fns.push({ f: (x) => { try { return E.evaluate(d, Object.assign({ x }, params), 'rad'); } catch (e) { return NaN; } }, color: cols[i], dash: true, width: 1.6, deriv: true });
          } catch (e) { /* تجاهل */ }
        }
      });
      plot.points = marks.slice();
      analyze();
      plot.draw();
    }

    function analyze() {
      ana.innerHTML = '';
      const main = plot.fns.filter((f) => !f.deriv && !f.hidden);
      const errs = lastCompiled.filter((c) => c && c.error);
      errs.forEach((c) => ana.appendChild(h('div', { class: 'err' }, '⚠ ' + c.error)));
      if (!main.length) { ana.appendChild(h('div', {}, 'أدخل دالة لرؤية تحليلها')); return; }
      const f0 = main[0];
      const row = (k, v) => { const d = h('div'); d.innerHTML = `<b>${k}</b><span>${v}</span>`; ana.appendChild(d); };
      const zeros = E.findRoots(f0.f, -50, 50, 6000).slice(0, 8);
      row('أصفار الدالة', zeros.length ? zeros.map((z) => M.fmt(z, 3)).join(' ، ') : 'لا توجد في [-٥٠، ٥٠]');
      const y0 = f0.f(0);
      row('المقطع الصادي', Number.isFinite(y0) ? M.pointStr(0, y0) : 'غير معرّفة عند ٠');
      // القيم القصوى (تغيّر إشارة المشتقة العددية)
      const ext = [];
      const hh = 1e-4;
      const df = (x) => (f0.f(x + hh) - f0.f(x - hh)) / (2 * hh);
      E.findRoots(df, -30, 30, 3000).slice(0, 6).forEach((x) => {
        const y = f0.f(x);
        if (!Number.isFinite(y)) return;
        const kind = df(x - 0.01) > 0 && df(x + 0.01) < 0 ? 'عظمى' : df(x - 0.01) < 0 && df(x + 0.01) > 0 ? 'صغرى' : null;
        if (kind) ext.push({ x, y, kind });
      });
      row('القيم القصوى', ext.length ? ext.map((e) => `${e.kind} ${M.pointStr(e.x, e.y)}`).join(' ، ') : 'لا توجد محلياً');
      // تقاطع أول دالتين
      if (main.length > 1) {
        const g = (x) => main[0].f(x) - main[1].f(x);
        const xs = E.findRoots(g, -50, 50, 6000).slice(0, 6);
        row('نقاط التقاطع (د١، د٢)', xs.length ? xs.map((x) => M.pointStr(x, main[0].f(x))).join(' ، ') : 'لا يوجد');
        plot.points = plot.points.concat(xs.map((x) => ({ x, y: main[0].f(x), color: '#ffffff', r: 4 })));
      }
      // المعلومات الجبرية لكثيرات الحدود
      const coeffs = f0.ast ? E.polyCoeffs(f0.ast, 'x') : null;
      if (coeffs && lastCompiled[0] && ![...(lastCompiled[0].vars || [])].some((v) => v !== 'x')) {
        const deg = coeffs.length - 1;
        row('النوع', deg === 0 ? 'دالة ثابتة' : deg === 1 ? 'دالة خطية (خط مستقيم)' : deg === 2 ? 'دالة تربيعية (قطع مكافئ)' : deg === 3 ? 'دالة تكعيبية' : 'كثيرة حدود من الدرجة ' + M.loc(deg));
        if (deg === 1) row('الميل', M.fracHTML(coeffs[1]));
        if (deg === 2) {
          const [c, b, a] = coeffs;
          const vx = -b / (2 * a);
          row('الرأس', M.pointStr(vx, c - (b * b) / (4 * a)));
          row('محور التماثل', E.mathSpan(M.varName('x') + ' = ' + M.fmt(vx)));
          row('الفتحة', a > 0 ? 'للأعلى ∪' : 'للأسفل ∩');
        }
      }
      ext.forEach((e) => plot.points.push({ x: e.x, y: e.y, color: f0.color, r: 4 }));
      zeros.forEach((z) => plot.points.push({ x: z, y: 0, color: f0.color, r: 4 }));
    }

    addBtn.onclick = () => { addRow(''); list.lastChild.querySelector('input').focus(); };
    toBoard.onclick = () => {
      const url = plot.toDataURL(640, 480);
      M.board.addImage(url, 640, 480);
      M.toast('تمت إضافة الرسم إلى السبورة');
    };
    derivT.onclick = () => { showDeriv = !showDeriv; derivT.classList.toggle('teal', showDeriv); draw(); };
    tableBtn.onclick = () => {
      const fs = plot.fns.filter((f) => !f.deriv && !f.hidden);
      if (!fs.length) return;
      const xs = []; for (let x = -5; x <= 5; x++) xs.push(x);
      let html = `<table class="tbl"><tr><th>${M.varName('x')}</th>${fs.map((f, i) => `<th style="color:${f.color}">د${M.loc(i + 1)}(${M.varName('x')})</th>`).join('')}</tr>`;
      xs.forEach((x) => { html += `<tr><td>${M.fmt(x)}</td>${fs.map((f) => `<td>${M.fmt(f.f(x), 3)}</td>`).join('')}</tr>`; });
      html += '</table>';
      const wrap = h('div', { html });
      const b = h('button', { class: 'btn primary', style: { marginTop: '10px' }, html: icon('board') + '<span>أضف الجدول إلى السبورة</span>' });
      b.onclick = () => {
        const lines = [`${M.varName('x')}  |  ` + xs.map((x) => M.fmt(x)).join('   ')];
        fs.forEach((f, i) => lines.push(`د${M.loc(i + 1)}  |  ` + xs.map((x) => M.fmt(f.f(x), 2)).join('   ')));
        M.board.addText(lines.join('\n'), { size: 22 });
        m.close();
      };
      wrap.appendChild(b);
      const m = M.modal({ title: 'جدول القيم', icon: 'grid', body: wrap });
    };

    addRow('س² - ٢س - ٣');
    addRow('');
    setTimeout(update, 50);
    M.on('settings', () => { renderRows(); update(); });

    return {
      redraw: () => setTimeout(() => plot.draw(), 20),
      setFunctions(exprs, mks) {
        rows = [];
        exprs.slice(0, 6).forEach((e) => rows.push({ txt: M.loc(e), hidden: false }));
        marks = mks || [];
        renderRows();
        update();
        setTimeout(() => plot.draw(), 30);
      },
    };
  }
})();
