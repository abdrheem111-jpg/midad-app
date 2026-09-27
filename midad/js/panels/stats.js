/* ==========================================================================
   لوحة الإحصاء والاحتمالات: مقاييس النزعة والتشتت، الرسوم البيانية،
   الانحدار الخطي، محاكاة الاحتمالات، التباديل والتوافيق
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const E = M.math;
  const F = (x, d) => M.fmt(x, d == null ? 3 : d);

  M.registerPanel({
    id: 'stats', title: 'الإحصاء والاحتمالات', short: 'الإحصاء', icon: 'stats',
    desc: 'تحليل البيانات، الرسوم البيانية، الانحدار، ومحاكاة التجارب',
    build(root) {
      root.append(dataCard(), regressionCard(), simCard(), combCard());
    },
  });

  /* ---------- أداة الرسم البياني ---------- */
  function setupCanvas(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth || 340, hh = cv.clientHeight || 240;
    cv.width = w * dpr; cv.height = hh * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h: hh };
  }
  function chartTheme() {
    const light = M.settings.theme === 'white';
    return { bg: light ? '#ffffff' : '#0f1822', text: light ? '#3b4a5c' : '#b9c6d3', grid: light ? 'rgba(20,40,80,.1)' : 'rgba(255,255,255,.08)', axis: light ? '#3b4a5c' : '#9fb0c2' };
  }
  /** رسم بياني عام: type = bar | hist | pie | box | dot | line | scatter */
  function drawChart(cv, type, d, opts) {
    opts = opts || {};
    const { ctx, w, h: H } = opts.ctx ? { ctx: opts.ctx, w: opts.w, h: opts.h } : setupCanvas(cv);
    const T = chartTheme(), cols = M.seriesColors();
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, w, H);
    ctx.font = `12px ${M.fontFamily()}`;
    const pad = { l: 44, r: 16, t: 26, b: 34 };
    const pw = w - pad.l - pad.r, ph = H - pad.t - pad.b;
    const title = opts.title;
    if (title) { ctx.fillStyle = T.text; ctx.font = `bold 13px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillText(title, w / 2, 16); ctx.font = `12px ${M.fontFamily()}`; }
    const yAxis = (maxV) => {
      const step = niceStep(maxV / 5);
      const top = Math.ceil(maxV / step) * step || 1;
      ctx.strokeStyle = T.grid; ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let v = 0; v <= top + 1e-9; v += step) {
        const y = pad.t + ph - (v / top) * ph;
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
        ctx.fillText(M.fmt(v, 2), pad.l - 6, y);
      }
      return top;
    };
    if (type === 'bar' || type === 'hist') {
      const labels = d.labels, vals = d.values;
      const top = yAxis(Math.max(...vals, 1));
      const n = vals.length;
      const gap = type === 'hist' ? 0 : Math.min(14, pw / n * 0.25);
      const bw = pw / n - gap;
      vals.forEach((v, i) => {
        const x = pad.l + i * (pw / n) + gap / 2;
        const bh = (v / top) * ph;
        ctx.fillStyle = type === 'hist' ? cols[0] : cols[i % cols.length];
        ctx.globalAlpha = 0.85;
        M.roundRect(ctx, x, pad.t + ph - bh, bw, Math.max(0.001, bh), type === 'hist' ? 0 : Math.min(6, bw / 3)); ctx.fill();
        ctx.globalAlpha = 1;
        if (type === 'hist') { ctx.strokeStyle = T.bg; ctx.lineWidth = 1.5; ctx.strokeRect(x, pad.t + ph - bh, bw, bh); }
        ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        if (n <= 16) ctx.fillText(labels[i], x + bw / 2, pad.t + ph + 6);
        if (v > 0 && n <= 20) { ctx.textBaseline = 'bottom'; ctx.fillText(M.fmt(v, 2), x + bw / 2, pad.t + ph - bh - 2); }
      });
    } else if (type === 'pie') {
      const total = d.values.reduce((s, v) => s + v, 0) || 1;
      const r = Math.min(pw, ph) / 2 - 4, cx = pad.l + r + 4, cy = pad.t + ph / 2 + 4;
      let a = -Math.PI / 2;
      d.values.forEach((v, i) => {
        const da = (v / total) * Math.PI * 2;
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a, a + da); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = T.bg; ctx.lineWidth = 2; ctx.stroke();
        if (v / total > 0.06) {
          ctx.fillStyle = '#0b1117'; ctx.font = `bold 12px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(M.fmt((v / total) * 100, 1) + '٪', cx + r * 0.62 * Math.cos(a + da / 2), cy + r * 0.62 * Math.sin(a + da / 2));
        }
        a += da;
      });
      // المفتاح
      ctx.font = `12px ${M.fontFamily()}`; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
      const lx = cx + r + 24;
      d.labels.slice(0, 10).forEach((l, i) => {
        const y = pad.t + 10 + i * 20;
        ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(w - pad.r - 12, y - 6, 12, 12);
        ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.fillText(`${l} (${M.fmt(d.values[i])})`, w - pad.r - 18, y);
        if (w - pad.r - 18 < lx) return;
      });
    } else if (type === 'box' || type === 'dot' || type === 'line' || type === 'scatter') {
      const xs = type === 'scatter' ? d.points.map((p) => p[0]) : type === 'line' ? d.values.map((_, i) => i + 1) : d.values;
      const ysAll = type === 'scatter' ? d.points.map((p) => p[1]) : d.values;
      let xmin = Math.min(...xs), xmax = Math.max(...xs);
      if (xmin === xmax) { xmin -= 1; xmax += 1; }
      const xr = xmax - xmin; xmin -= xr * 0.06; xmax += xr * 0.06;
      const X = (v) => pad.l + ((v - xmin) / (xmax - xmin)) * pw;
      // محور x
      const xstep = niceStep((xmax - xmin) / 6);
      ctx.strokeStyle = T.grid; ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let v = Math.ceil(xmin / xstep) * xstep; v <= xmax; v += xstep) {
        ctx.beginPath(); ctx.moveTo(X(v), pad.t); ctx.lineTo(X(v), pad.t + ph); ctx.stroke();
        ctx.fillText(M.fmt(v, 2), X(v), pad.t + ph + 6);
      }
      if (type === 'box') {
        const s = E.stats(d.values);
        const cy = pad.t + ph / 2, bh = Math.min(60, ph * 0.4);
        ctx.strokeStyle = cols[0]; ctx.lineWidth = 2; ctx.fillStyle = cols[0];
        ctx.beginPath(); ctx.moveTo(X(s.min), cy); ctx.lineTo(X(s.q1), cy); ctx.moveTo(X(s.q3), cy); ctx.lineTo(X(s.max), cy);
        ctx.moveTo(X(s.min), cy - bh / 4); ctx.lineTo(X(s.min), cy + bh / 4); ctx.moveTo(X(s.max), cy - bh / 4); ctx.lineTo(X(s.max), cy + bh / 4); ctx.stroke();
        ctx.globalAlpha = 0.22; ctx.fillRect(X(s.q1), cy - bh / 2, X(s.q3) - X(s.q1), bh); ctx.globalAlpha = 1;
        ctx.strokeRect(X(s.q1), cy - bh / 2, X(s.q3) - X(s.q1), bh);
        ctx.strokeStyle = cols[3]; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(X(s.median), cy - bh / 2); ctx.lineTo(X(s.median), cy + bh / 2); ctx.stroke();
        ctx.fillStyle = T.text; ctx.textBaseline = 'bottom';
        [['الأدنى', s.min], ['ر١', s.q1], ['الوسيط', s.median], ['ر٣', s.q3], ['الأعلى', s.max]].forEach(([t, v], i) => {
          ctx.fillText(`${t} ${M.fmt(v, 2)}`, X(v), cy - bh / 2 - 4 - (i % 2) * 14);
        });
      } else if (type === 'dot') {
        const counts = new Map();
        d.values.forEach((v) => {
          const c = (counts.get(v) || 0) + 1; counts.set(v, c);
          ctx.fillStyle = cols[0];
          ctx.beginPath(); ctx.arc(X(v), pad.t + ph - 8 - (c - 1) * 14, 6, 0, Math.PI * 2); ctx.fill();
        });
      } else {
        let ymin = Math.min(...ysAll), ymax = Math.max(...ysAll);
        if (ymin === ymax) { ymin -= 1; ymax += 1; }
        const yr = ymax - ymin; ymin -= yr * 0.08; ymax += yr * 0.08;
        const Y = (v) => pad.t + ph - ((v - ymin) / (ymax - ymin)) * ph;
        const ystep = niceStep((ymax - ymin) / 5);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let v = Math.ceil(ymin / ystep) * ystep; v <= ymax; v += ystep) {
          ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke();
          ctx.fillStyle = T.text; ctx.fillText(M.fmt(v, 2), pad.l - 6, Y(v));
        }
        if (type === 'line') {
          ctx.strokeStyle = cols[0]; ctx.lineWidth = 2.5; ctx.beginPath();
          d.values.forEach((v, i) => (i ? ctx.lineTo(X(i + 1), Y(v)) : ctx.moveTo(X(i + 1), Y(v)))); ctx.stroke();
          d.values.forEach((v, i) => { ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(X(i + 1), Y(v), 4, 0, Math.PI * 2); ctx.fill(); });
        } else {
          d.points.forEach(([x, y]) => { ctx.fillStyle = cols[0]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(X(x), Y(y), 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
          if (d.line) {
            ctx.strokeStyle = cols[1]; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.moveTo(X(xmin), Y(d.line.m * xmin + d.line.b)); ctx.lineTo(X(xmax), Y(d.line.m * xmax + d.line.b)); ctx.stroke();
          }
        }
      }
    }
    // محاور
    ctx.strokeStyle = T.axis; ctx.lineWidth = 1.2;
    if (type !== 'pie') { ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, pad.t + ph); ctx.lineTo(w - pad.r, pad.t + ph); ctx.stroke(); }
  }
  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
  }
  function chartToBoard(type, d, opts) {
    const cv = document.createElement('canvas');
    const w = 640, hh = 400;
    cv.width = w * 2; cv.height = hh * 2;
    const ctx = cv.getContext('2d'); ctx.scale(2, 2);
    drawChart(cv, type, d, Object.assign({}, opts, { ctx, w, h: hh }));
    M.board.addImage(cv.toDataURL('image/png'), w, hh);
    M.toast('تمت إضافة الرسم البياني إلى السبورة');
  }
  M.drawChart = drawChart;

  /* ---------- تحليل البيانات ---------- */
  const SAMPLES = {
    'درجات اختبار': '١٥ ١٨ ١٢ ١٩ ١٥ ٢٠ ١٤ ١٥ ١٧ ١٣ ١٨ ١٦',
    'أطوال الطلاب (سم)': '١٤٥ ١٥٢ ١٤٨ ١٦٠ ١٥٥ ١٥٠ ١٤٧ ١٥٨ ١٦٢ ١٥١ ١٤٩ ١٥٥ ١٥٣',
    'درجات الحرارة': '٢٨ ٣١ ٣٤ ٣٦ ٣٥ ٣٣ ٣٠',
  };
  function dataCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('stats')} تحليل مجموعة بيانات</h4><div class="hint">أدخل القيم مفصولة بمسافات أو فواصل.</div>`;
    const ta = h('textarea', { class: 'inp', rows: 2 }, SAMPLES['درجات اختبار']);
    const chips = h('div', { class: 'chips', style: { margin: '6px 0' } });
    Object.entries(SAMPLES).forEach(([k, v]) => { const c = h('button', { class: 'chip' }, k); c.onclick = () => { ta.value = v; run(); }; chips.appendChild(c); });
    const btn = h('button', { class: 'btn primary block', html: '<span>حلّل البيانات</span>' });
    const statsEl = h('div', { style: { marginTop: '10px' } });
    const chartSel = h('div', { class: 'seg-ctl', style: { marginTop: '10px', flexWrap: 'wrap' } });
    const CH = [['bar', 'أعمدة'], ['hist', 'مدرّج'], ['pie', 'قطاعات'], ['box', 'صندوق'], ['dot', 'نقاط'], ['line', 'خطي']];
    let ctype = 'bar';
    CH.forEach(([k, t]) => { const b = h('button', { class: k === ctype ? 'active' : '' }, t); b.onclick = () => { ctype = k; M.$$('button', chartSel).forEach((x) => x.classList.toggle('active', x === b)); draw(); }; chartSel.appendChild(b); });
    const cbox = h('div', { class: 'chart-box' });
    const cv = h('canvas');
    cbox.appendChild(cv);
    const acts = h('div', { class: 'row', style: { marginTop: '8px' } });
    const toBoard = h('button', { class: 'btn', html: icon('board') + '<span>الرسم إلى السبورة</span>' });
    const stepsBtn = h('button', { class: 'btn', html: icon('book') + '<span>شرح الحساب</span>' });
    acts.append(toBoard, stepsBtn);
    const out = h('div');
    card.append(ta, chips, btn, statsEl, chartSel, cbox, acts, out);
    let data = [];
    const chartData = () => {
      const s = E.stats(data);
      if (ctype === 'hist') {
        const k = Math.max(3, Math.min(10, Math.ceil(Math.log2(s.n) + 1)));
        const wbin = (s.range || 1) / k;
        const vals = new Array(k).fill(0);
        data.forEach((v) => vals[Math.min(k - 1, Math.floor((v - s.min) / wbin))]++);
        const labels = vals.map((_, i) => `${M.fmt(s.min + i * wbin, 1)}–${M.fmt(s.min + (i + 1) * wbin, 1)}`);
        return { labels, values: vals };
      }
      if (ctype === 'bar' || ctype === 'pie') {
        const entries = [...s.freq.entries()].sort((a, b) => a[0] - b[0]);
        return { labels: entries.map((e) => M.fmt(e[0])), values: entries.map((e) => e[1]) };
      }
      return { values: data };
    };
    const TITLES = { bar: 'التكرار لكل قيمة', hist: 'المدرّج التكراري', pie: 'التوزيع النسبي', box: 'مخطط الصندوق', dot: 'مخطط النقاط', line: 'القيم بالترتيب' };
    const draw = () => { if (data.length) drawChart(cv, ctype, chartData(), { title: TITLES[ctype] }); };
    function run() {
      data = E.numbersIn(ta.value);
      out.innerHTML = '';
      if (data.length < 2) { statsEl.innerHTML = '<div class="err">⚠ أدخل قيمتين على الأقل</div>'; return; }
      const s = E.stats(data);
      const items = [['العدد ن', s.n], ['المجموع', s.sum], ['المتوسط الحسابي', s.mean], ['الوسيط', s.median], ['المنوال', s.mode.length ? s.mode.map((m) => F(m)).join('، ') : 'لا يوجد'], ['المدى', s.range],
        ['أصغر قيمة', s.min], ['أكبر قيمة', s.max], ['الربيع الأول', s.q1], ['الربيع الثالث', s.q3], ['الانحراف المعياري', s.sdP], ['التباين', s.varP]];
      statsEl.innerHTML = `<div class="stat-grid">${items.map(([k, v]) => `<div class="stat"><b>${typeof v === 'number' ? F(v, 2) : v}</b><span>${k}</span></div>`).join('')}</div>`;
      draw();
    }
    btn.onclick = run;
    toBoard.onclick = () => data.length && chartToBoard(ctype, chartData(), { title: TITLES[ctype] });
    stepsBtn.onclick = () => {
      if (!data.length) return;
      const s = E.stats(data);
      const steps = [
        `نرتب القيم تصاعدياً: ${s.sorted.map((v) => F(v)).join('، ')}`,
        `المتوسط الحسابي = مجموع القيم ÷ عددها = ${F(s.sum)} ÷ ${F(s.n)} = ${F(s.mean)}`,
        s.n % 2 ? `عدد القيم فردي ⇐ الوسيط هو القيمة رقم ${M.loc((s.n + 1) / 2)} = ${F(s.median)}` : `عدد القيم زوجي ⇐ الوسيط = متوسط القيمتين رقم ${M.loc(s.n / 2)} و ${M.loc(s.n / 2 + 1)} = ${F(s.median)}`,
        s.mode.length ? `المنوال (الأكثر تكراراً): ${s.mode.map((m) => F(m)).join('، ')}` : 'لا يوجد منوال (لا تتكرر أي قيمة أكثر من غيرها)',
        `المدى = أكبر قيمة - أصغر قيمة = ${F(s.max)} - ${F(s.min)} = ${F(s.range)}`,
        `التباين = متوسط مربعات الانحرافات عن المتوسط = ${F(s.varP)} ، الانحراف المعياري = √التباين = ${F(s.sdP)}`,
      ];
      out.innerHTML = '';
      out.appendChild(M.renderResult({ title: 'شرح المقاييس الإحصائية', steps, answer: `المتوسط ${F(s.mean)} ، الوسيط ${F(s.median)} ، الانحراف المعياري ${F(s.sdP)}` }));
    };
    setTimeout(run, 60);
    M.on('settings', () => data.length && run());
    return card;
  }

  /* ---------- الانحدار ---------- */
  function regressionCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('function')} شكل الانتشار والانحدار الخطي</h4><div class="hint">كل سطر: قيمة س، قيمة ص — مثال: ساعات المذاكرة والدرجة.</div>`;
    const ta = h('textarea', { class: 'inp', rows: 4 }, '١، ٥٥\n٢، ٦٠\n٣، ٦٢\n٤، ٧٠\n٥، ٧٤\n٦، ٨١\n٧، ٨٥');
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>احسب خط الانحدار</span>' });
    const cbox = h('div', { class: 'chart-box', style: { marginTop: '8px' } });
    const cv = h('canvas');
    cbox.appendChild(cv);
    const info = h('div', { class: 'info-list' });
    const toBoard = h('button', { class: 'btn', style: { marginTop: '8px' }, html: icon('board') + '<span>إلى السبورة</span>' });
    card.append(ta, btn, cbox, info, toBoard);
    let last = null;
    btn.onclick = () => {
      const pts = ta.value.split('\n').map((l) => E.numbersIn(l)).filter((p) => p.length >= 2).map((p) => [p[0], p[1]]);
      if (pts.length < 2) { info.innerHTML = '<div class="err">⚠ أدخل نقطتين على الأقل</div>'; return; }
      const r = E.regression(pts);
      last = { points: pts, line: r };
      drawChart(cv, 'scatter', last, { title: 'شكل الانتشار وخط أفضل ملاءمة' });
      if (!r) { info.innerHTML = '<div class="err">⚠ قيم س متساوية</div>'; return; }
      const strength = Math.abs(r.r) > 0.8 ? 'قوي' : Math.abs(r.r) > 0.5 ? 'متوسط' : 'ضعيف';
      info.innerHTML = `<div><b>معادلة الخط</b><span class="math">${M.varName('y')} = ${F(r.m)}${M.varName('x')} ${r.b < 0 ? '-' : '+'} ${F(Math.abs(r.b))}</span></div>
        <div><b>معامل الارتباط ر</b><span>${F(r.r)}</span></div>
        <div><b>نوع الارتباط</b><span>${r.r > 0 ? 'طردي' : 'عكسي'} ${strength}</span></div>
        <div><b>معامل التحديد ر²</b><span>${F(r.r2)}</span></div>`;
    };
    toBoard.onclick = () => last && chartToBoard('scatter', last, { title: 'شكل الانتشار وخط أفضل ملاءمة' });
    setTimeout(() => btn.click(), 80);
    return card;
  }

  /* ---------- محاكاة الاحتمالات ---------- */
  const EXPS = {
    coin: { name: 'رمي قطعة نقود', outcomes: ['شعار', 'كتابة'], p: [0.5, 0.5], roll: () => M.rand(0, 1) },
    die: { name: 'رمي حجر نرد', outcomes: ['١', '٢', '٣', '٤', '٥', '٦'], p: new Array(6).fill(1 / 6), roll: () => M.rand(0, 5) },
    dice2: { name: 'مجموع حجري نرد', outcomes: ['٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'], p: [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((x) => x / 36), roll: () => M.rand(1, 6) + M.rand(1, 6) - 2 },
    spinner: { name: 'دولاب ألوان (٥٠٪، ٣٠٪، ٢٠٪)', outcomes: ['أحمر', 'أزرق', 'أخضر'], p: [0.5, 0.3, 0.2], roll: () => { const r = Math.random(); return r < 0.5 ? 0 : r < 0.8 ? 1 : 2; } },
  };
  function simCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('dice')} محاكاة التجارب العشوائية</h4><div class="hint">قارن الاحتمال التجريبي بالنظري — كلما زاد عدد المحاولات اقترب التجريبي من النظري (قانون الأعداد الكبيرة).</div>`;
    const sel = h('select', { class: 'sel' });
    Object.entries(EXPS).forEach(([k, e]) => sel.appendChild(h('option', { value: k }, e.name)));
    const row = h('div', { class: 'row', style: { marginTop: '8px' } });
    const counts = {};
    let total = 0;
    const reset = () => { const e = EXPS[sel.value]; counts.v = new Array(e.outcomes.length).fill(0); total = 0; draw(); };
    [1, 10, 100, 1000].forEach((n) => {
      const b = h('button', { class: 'btn sm' }, '+' + M.loc(n));
      b.onclick = () => { const e = EXPS[sel.value]; for (let i = 0; i < n; i++) counts.v[e.roll()]++; total += n; draw(); };
      row.appendChild(b);
    });
    const rb = h('button', { class: 'btn sm ghost', html: icon('reset') });
    rb.onclick = reset;
    row.appendChild(rb);
    const cbox = h('div', { class: 'chart-box', style: { marginTop: '8px' } });
    const cv = h('canvas');
    cbox.appendChild(cv);
    const info = h('div', { style: { fontSize: '13px', marginTop: '6px', color: 'var(--ui-muted)' } });
    card.append(sel, row, cbox, info);
    sel.onchange = reset;
    function draw() {
      const e = EXPS[sel.value];
      const { ctx, w, h: H } = setupCanvas(cv);
      const T = chartTheme(), cols = M.seriesColors();
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, w, H);
      const pad = { l: 40, r: 10, t: 28, b: 30 };
      const pw = w - pad.l - pad.r, ph = H - pad.t - pad.b;
      const n = e.outcomes.length;
      const maxP = Math.max(...e.p, ...(total ? counts.v.map((c) => c / total) : [0])) * 1.15;
      ctx.font = `11px ${M.fontFamily()}`; ctx.fillStyle = T.text; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let k = 0; k <= 4; k++) { const v = (maxP * k) / 4, y = pad.t + ph - (v / maxP) * ph; ctx.strokeStyle = T.grid; ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke(); ctx.fillText(M.fmt(v, 2), pad.l - 4, y); }
      const slot = pw / n, bw = slot * 0.36;
      e.outcomes.forEach((o, i) => {
        const x = pad.l + i * slot + slot / 2;
        const pe = total ? counts.v[i] / total : 0;
        ctx.fillStyle = cols[0]; M.roundRect(ctx, x - bw, pad.t + ph - (pe / maxP) * ph, bw, Math.max(0.001, (pe / maxP) * ph), 3); ctx.fill();
        ctx.fillStyle = cols[3]; M.roundRect(ctx, x, pad.t + ph - (e.p[i] / maxP) * ph, bw, (e.p[i] / maxP) * ph, 3); ctx.fill();
        ctx.fillStyle = T.text; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(o, x, pad.t + ph + 6);
      });
      ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.font = `bold 12px ${M.fontFamily()}`;
      ctx.fillStyle = cols[0]; ctx.fillRect(w - 20, 8, 10, 10); ctx.fillStyle = T.text; ctx.fillText('تجريبي', w - 26, 13);
      ctx.fillStyle = cols[3]; ctx.fillRect(w - 90, 8, 10, 10); ctx.fillStyle = T.text; ctx.fillText('نظري', w - 96, 13);
      info.innerHTML = `عدد المحاولات: <b>${M.loc(total)}</b>${total ? ' — ' + e.outcomes.map((o, i) => `${o}: ${M.loc(counts.v[i])}`).join(' ، ') : ''}`;
    }
    setTimeout(reset, 60);
    return card;
  }

  /* ---------- التباديل والتوافيق ---------- */
  function combCard() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('shuffle')} التباديل والتوافيق والمضروب</h4>`;
    const g = h('div', { class: 'grid2' });
    const ni = h('input', { class: 'inp', value: '٨' }), ri = h('input', { class: 'inp', value: '٣' });
    g.append(h('label', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'lbl' }, 'ن (العدد الكلي)'), ni), h('label', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'lbl' }, 'ر (المختار)'), ri));
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>احسب</span>' });
    const out = h('div');
    card.append(g, btn, out);
    btn.onclick = () => {
      const n = Math.floor(parseFloat(M.toWestern(ni.value))), r = Math.floor(parseFloat(M.toWestern(ri.value)));
      out.innerHTML = '';
      if (!(n >= 0) || !(r >= 0) || r > n || n > 170) { out.innerHTML = '<div class="err">⚠ يجب أن يكون ٠ ≤ ر ≤ ن ≤ ١٧٠</div>'; return; }
      const fact = (k) => { let x = 1; for (let i = 2; i <= k; i++) x *= i; return x; };
      let P = 1; for (let i = 0; i < r; i++) P *= n - i;
      const C = P / fact(r);
      const L = M.loc;
      out.appendChild(M.renderResult({
        title: `ن = ${L(n)} ، ر = ${L(r)}`,
        steps: [
          `المضروب: ${L(n)}! = ${M.fmt(fact(n), 0)}`,
          `التباديل (الترتيب مهم): ل(ن، ر) = ن! ÷ (ن - ر)! = ${L(n)}! ÷ ${L(n - r)}! = ${M.fmt(P, 0)}`,
          `التوافيق (الترتيب غير مهم): ق(ن، ر) = ن! ÷ (ر! (ن - ر)!) = ${M.fmt(C, 0)}`,
          `مثال: عدد طرق اختيار لجنة من ${L(r)} طلاب من ${L(n)} = ${M.fmt(C, 0)} ، وعدد طرق ترتيبهم في صف = ${M.fmt(P, 0)}`,
        ],
        answer: `ل = ${M.fmt(P, 0)} ، ق = ${M.fmt(C, 0)}`,
      }, { strategy: 'steps' }));
    };
    return card;
  }
})();
