/* ==========================================================================
   لوحة الهندسة: مختبر هندسي ديناميكي، حاسبة المساحات والحجوم، حلّال المثلثات
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const F = (x, d) => M.fmt(x, d == null ? 3 : d);
  const PI = Math.PI;

  M.registerPanel({
    id: 'geometry', title: 'الهندسة والقياس', short: 'الهندسة', icon: 'geometry',
    desc: 'مختبر هندسي تفاعلي، المساحات والحجوم، وحل المثلثات',
    build(root) {
      const lab = h('div', { class: 'card' });
      lab.innerHTML = `<h4>${icon('geometry')} مختبر الهندسة الديناميكي</h4>
        <div class="hint">أنشئ نقاطاً وقطعاً ودوائر ومضلعات، واسحب الرؤوس لترى القياسات تتغير لحظياً. طبّق الانعكاس والدوران والتكبير والانسحاب.</div>`;
      const open = h('button', { class: 'btn primary block', html: icon('geometry') + '<span>افتح المختبر</span>' });
      open.onclick = openLab;
      lab.appendChild(open);
      root.appendChild(lab);
      root.appendChild(buildShapeCalc());
      root.appendChild(buildTriangleSolver());
      root.appendChild(buildPythagoras());
    },
  });

  /* ================= مختبر الهندسة ================= */
  const LABELS = ['أ', 'ب', 'جـ', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'س', 'ع', 'ف', 'ص', 'ق', 'ر'];
  let labState = null;

  function openLab() {
    const wrap = h('div', { class: 'geo-lab' });
    const box = h('div', { class: 'plot-box' });
    const cv = h('canvas');
    box.appendChild(cv);
    const side = h('div', { class: 'geo-side' });
    wrap.append(box, side);
    const modal = M.modal({ title: 'مختبر الهندسة الديناميكي', icon: 'geometry', body: wrap, size: 'xl' });

    const st = labState || { points: [], objs: [], n: 0 };
    labState = st;
    let tool = 'point', pending = [], drag = null, snap = true;
    const TOOLS = [
      ['move', 'move', 'تحريك'], ['point', 'point', 'نقطة'], ['seg', 'line', 'قطعة'], ['circle', 'ellipse', 'دائرة'],
      ['poly', 'polygon', 'مضلع'], ['mid', 'midpoint', 'منتصف'], ['angle', 'angle', 'زاوية'], ['del', 'trash', 'حذف'],
    ];
    const HINTS = {
      move: 'اسحب أي نقطة لتحريكها — كل ما يعتمد عليها يتحرك معها. اسحب الفراغ لتحريك المستوى.',
      point: 'انقر في أي مكان لإنشاء نقطة.',
      seg: 'انقر نقطتين (موجودتين أو جديدتين) لرسم قطعة مستقيمة وقياس طولها.',
      circle: 'انقر المركز ثم نقطة على المحيط.',
      poly: 'انقر الرؤوس بالترتيب، ثم انقر الرأس الأول لإغلاق المضلع.',
      mid: 'انقر نقطتين لإنشاء نقطة المنتصف بينهما.',
      angle: 'انقر ثلاث نقاط: نقطة، ثم الرأس، ثم نقطة أخرى.',
      del: 'انقر نقطة لحذفها مع كل ما يعتمد عليها.',
    };
    const toolsEl = h('div', { class: 'geo-tools' });
    const hint = h('div', { class: 'geo-hint' });
    const setTool = (t) => { tool = t; pending = []; M.$$('button', toolsEl).forEach((b) => b.classList.toggle('active', b.dataset.t === t)); hint.textContent = HINTS[t]; plot.draw(); };
    TOOLS.forEach(([t, ic, name]) => { const b = h('button', { 'data-t': t, html: icon(ic) + `<span>${name}</span>` }); b.onclick = () => setTool(t); toolsEl.appendChild(b); });

    const trCard = h('div', { class: 'card', style: { margin: 0 } });
    trCard.innerHTML = `<h4>${icon('mirror')} التحويلات الهندسية (لآخر مضلع)</h4>`;
    const trRow = h('div', { class: 'chips' });
    [['reflectY', 'انعكاس في محور الصادات'], ['reflectX', 'انعكاس في محور السينات'], ['rot90', 'دوران ٩٠° حول الأصل'], ['rot180', 'دوران ١٨٠°'], ['dilate2', 'تكبير بمعامل ٢'], ['dilateHalf', 'تصغير بمعامل ½'], ['translate', 'انسحاب (٣، ١)']].forEach(([k, t]) => {
      const b = h('button', { class: 'chip' }, t); b.onclick = () => transform(k); trRow.appendChild(b);
    });
    trCard.appendChild(trRow);

    const measures = h('div', { class: 'geo-measures' });
    const snapBtn = h('button', { class: 'btn sm teal', html: icon('grid') + '<span>الالتصاق بالشبكة</span>' });
    snapBtn.onclick = () => { snap = !snap; snapBtn.classList.toggle('teal', snap); };
    const clearBtn = h('button', { class: 'btn sm', html: icon('trash') + '<span>مسح الكل</span>' });
    clearBtn.onclick = () => { st.points = []; st.objs = []; st.n = 0; pending = []; plot.draw(); };
    const boardBtn = h('button', { class: 'btn sm primary', html: icon('board') + '<span>إلى السبورة</span>' });
    boardBtn.onclick = () => { M.board.addImage(plot.toDataURL(720, 540), 720, 540); M.toast('تمت إضافة الشكل إلى السبورة'); };
    const demo = h('button', { class: 'btn sm', html: '<span>مثال: مثلث</span>' });
    demo.onclick = () => {
      st.points = []; st.objs = []; st.n = 0;
      const a = addPt(-3, -2), b = addPt(3, -2), c = addPt(1, 3);
      st.objs.push({ type: 'poly', pts: [a.id, b.id, c.id] });
      st.objs.push({ type: 'angle', p: [b.id, a.id, c.id] }, { type: 'angle', p: [a.id, b.id, c.id] }, { type: 'angle', p: [a.id, c.id, b.id] });
      setTool('move');
    };
    side.append(toolsEl, hint, h('div', { class: 'row' }, snapBtn, demo, clearBtn, boardBtn), trCard, h('div', { class: 'lbl' }, 'القياسات الحيّة'), measures);

    const plot = new M.Plot(cv, {
      trace: false,
      onDown: (x, y) => onDown(x, y),
      onDrag: (x, y) => {
        if (!drag) return false;
        const p = st.points.find((q) => q.id === drag);
        if (p && !p.dep) { [p.x, p.y] = sn(x, y); plot.draw(); }
        return true;
      },
      onUp: () => (drag = null),
      after: (ctx) => drawGeo(ctx),
    });
    plot.scale = 40;
    setTool(st.points.length ? 'move' : 'point');

    function sn(x, y) { return snap ? [Math.round(x * 2) / 2, Math.round(y * 2) / 2] : [x, y]; }
    function addPt(x, y, dep) {
      const p = { id: 'p' + ++st.n, x, y, label: LABELS[(st.n - 1) % LABELS.length] + (st.n > LABELS.length ? M.loc(Math.floor((st.n - 1) / LABELS.length)) : ''), dep };
      st.points.push(p);
      return p;
    }
    const byId = (id) => st.points.find((p) => p.id === id);
    function pos(p) {
      if (!p.dep) return [p.x, p.y];
      const src = p.dep.src.map((id) => byId(id));
      if (src.some((s) => !s)) return [NaN, NaN];
      const [x, y] = pos(src[0]);
      switch (p.dep.kind) {
        case 'mid': { const [x2, y2] = pos(src[1]); return [(x + x2) / 2, (y + y2) / 2]; }
        case 'reflectY': return [-x, y];
        case 'reflectX': return [x, -y];
        case 'rot90': return [-y, x];
        case 'rot180': return [-x, -y];
        case 'dilate2': return [2 * x, 2 * y];
        case 'dilateHalf': return [x / 2, y / 2];
        case 'translate': return [x + 3, y + 1];
      }
      return [x, y];
    }
    function hitPt(x, y) {
      const tol = 12 / plot.scale;
      let best = null, bd = tol;
      st.points.forEach((p) => { const [px, py] = pos(p); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = p; } });
      return best;
    }
    function ptAt(x, y) { return hitPt(x, y) || addPt(...sn(x, y)); }

    function onDown(x, y) {
      switch (tool) {
        case 'move': { const p = hitPt(x, y); if (p && !p.dep) drag = p.id; else if (p && p.dep) M.toast('هذه نقطة تابعة — حرّك النقاط الأصلية'); break; }
        case 'point': addPt(...sn(x, y)); break;
        case 'seg': case 'circle': case 'mid': {
          const p = ptAt(x, y);
          if (pending[0] === p.id) break;
          pending.push(p.id);
          if (pending.length === 2) {
            if (tool === 'seg') st.objs.push({ type: 'seg', a: pending[0], b: pending[1] });
            if (tool === 'circle') st.objs.push({ type: 'circle', c: pending[0], p: pending[1] });
            if (tool === 'mid') { const m = addPt(0, 0, { kind: 'mid', src: pending.slice() }); st.objs.push({ type: 'seg', a: pending[0], b: pending[1], faint: true }); m.mid = true; }
            pending = [];
          }
          break;
        }
        case 'poly': {
          const p = ptAt(x, y);
          if (pending.length >= 3 && p.id === pending[0]) { st.objs.push({ type: 'poly', pts: pending.slice() }); pending = []; }
          else if (!pending.includes(p.id)) pending.push(p.id);
          break;
        }
        case 'angle': {
          const p = ptAt(x, y);
          pending.push(p.id);
          if (pending.length === 3) { st.objs.push({ type: 'angle', p: pending.slice() }); pending = []; }
          break;
        }
        case 'del': {
          const p = hitPt(x, y);
          if (!p) break;
          const dead = new Set([p.id]);
          let grew = true;
          while (grew) { grew = false; st.points.forEach((q) => { if (q.dep && !dead.has(q.id) && q.dep.src.some((s) => dead.has(s))) { dead.add(q.id); grew = true; } }); }
          st.points = st.points.filter((q) => !dead.has(q.id));
          st.objs = st.objs.filter((o) => ![o.a, o.b, o.c, o.p].concat(o.pts || [], Array.isArray(o.p) ? o.p : []).some((id) => dead.has(id)));
          break;
        }
      }
      plot.draw();
    }

    function transform(kind) {
      const poly = [...st.objs].reverse().find((o) => o.type === 'poly');
      if (!poly) return M.toast('أنشئ مضلعاً أولاً');
      const ids = poly.pts.map((id) => {
        const src = byId(id);
        const p = addPt(0, 0, { kind, src: [id] });
        p.label = src.label + '′';
        return p.id;
      });
      st.objs.push({ type: 'poly', pts: ids, image: true });
      plot.draw();
    }

    function drawGeo(ctx) {
      const cols = M.seriesColors();
      const light = M.settings.theme === 'white';
      const X = (x) => plot.X(x), Y = (y) => plot.Y(y);
      const P = (id) => { const p = byId(id); return p ? pos(p) : [NaN, NaN]; };
      const lines = [];
      ctx.save();
      ctx.lineCap = ctx.lineJoin = 'round';
      st.objs.forEach((o) => {
        if (o.type === 'poly') {
          const pts = o.pts.map(P);
          ctx.fillStyle = o.image ? cols[1] : cols[0]; ctx.strokeStyle = ctx.fillStyle;
          ctx.globalAlpha = 0.16;
          ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1; ctx.lineWidth = 2.5; if (o.image) ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
          // أطوال الأضلاع
          let per = 0, area = 0;
          const names = o.pts.map((id) => byId(id).label);
          pts.forEach(([x, y], i) => {
            const [x2, y2] = pts[(i + 1) % pts.length];
            const L = Math.hypot(x2 - x, y2 - y);
            per += L; area += x * y2 - x2 * y;
            sideLabel(ctx, X((x + x2) / 2), Y((y + y2) / 2), F(L, 2), light);
          });
          const angs = pts.map((p, i) => angleAt(pts[(i - 1 + pts.length) % pts.length], p, pts[(i + 1) % pts.length]));
          lines.push([`${polyName(pts.length)} ${names.join('')}`, '']);
          lines.push(['المحيط', F(per, 2)]);
          lines.push(['المساحة', F(Math.abs(area) / 2, 2)]);
          if (pts.length === 3) {
            const sides = pts.map(([x, y], i) => { const [x2, y2] = pts[(i + 1) % 3]; return Math.hypot(x2 - x, y2 - y); });
            lines.push(['التصنيف', triType(sides, angs)]);
          }
          lines.push(['مجموع الزوايا', F(angs.reduce((s, a) => s + a, 0), 1) + '°']);
        } else if (o.type === 'seg') {
          const [x1, y1] = P(o.a), [x2, y2] = P(o.b);
          ctx.strokeStyle = o.faint ? (light ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.25)') : cols[2]; ctx.lineWidth = o.faint ? 1.5 : 2.5;
          if (o.faint) ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.moveTo(X(x1), Y(y1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke(); ctx.setLineDash([]);
          if (!o.faint) {
            const L = Math.hypot(x2 - x1, y2 - y1);
            sideLabel(ctx, X((x1 + x2) / 2), Y((y1 + y2) / 2), F(L, 2), light);
            const m = x2 !== x1 ? (y2 - y1) / (x2 - x1) : null;
            lines.push([`القطعة ${byId(o.a).label}${byId(o.b).label}`, F(L, 3)]);
            lines.push(['  الميل', m == null ? 'غير معرّف (رأسي)' : F(m, 3)]);
          }
        } else if (o.type === 'circle') {
          const [cx, cy] = P(o.c), [px, py] = P(o.p);
          const r = Math.hypot(px - cx, py - cy);
          ctx.strokeStyle = cols[3]; ctx.lineWidth = 2.5; ctx.fillStyle = cols[3];
          ctx.beginPath(); ctx.arc(X(cx), Y(cy), r * plot.scale, 0, 2 * PI); ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
          ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(X(cx), Y(cy)); ctx.lineTo(X(px), Y(py)); ctx.stroke(); ctx.setLineDash([]);
          lines.push([`دائرة مركزها ${byId(o.c).label}`, '']);
          lines.push(['  نصف القطر', F(r, 3)]);
          lines.push(['  المحيط ٢طنق', F(2 * PI * r, 3)]);
          lines.push(['  المساحة طنق²', F(PI * r * r, 3)]);
        } else if (o.type === 'angle') {
          const [a, b, c] = o.p.map(P);
          const deg = angleAt(a, b, c);
          const a1 = Math.atan2(-(a[1] - b[1]), a[0] - b[0]), a2 = Math.atan2(-(c[1] - b[1]), c[0] - b[0]);
          let d = a2 - a1; while (d > PI) d -= 2 * PI; while (d < -PI) d += 2 * PI;
          ctx.strokeStyle = cols[4]; ctx.fillStyle = cols[4]; ctx.lineWidth = 2;
          const r = 26;
          ctx.beginPath(); ctx.moveTo(X(b[0]), Y(b[1])); ctx.arc(X(b[0]), Y(b[1]), r, a1, a1 + d, d < 0); ctx.closePath();
          ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.arc(X(b[0]), Y(b[1]), r, a1, a1 + d, d < 0); ctx.stroke();
          const mid = a1 + d / 2;
          sideLabel(ctx, X(b[0]) + (r + 18) * Math.cos(mid), Y(b[1]) + (r + 18) * Math.sin(mid), F(deg, 1) + '°', light, cols[4]);
          lines.push([`∠${o.p.map((id) => byId(id).label).join('')}`, F(deg, 2) + '°']);
        }
      });
      // المعلّق
      if (pending.length) {
        ctx.strokeStyle = cols[0]; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath(); pending.map(P).forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
        if (plot.hover) ctx.lineTo(plot.hover[0], plot.hover[1]);
        ctx.stroke(); ctx.setLineDash([]);
      }
      // النقاط
      st.points.forEach((p) => {
        const [x, y] = pos(p);
        if (!Number.isFinite(x)) return;
        ctx.fillStyle = p.dep ? (p.mid ? cols[5] : cols[1]) : (light ? '#18222e' : '#ffffff');
        ctx.strokeStyle = light ? '#fff' : '#0f1822'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(X(x), Y(y), pending.includes(p.id) ? 7 : 5.5, 0, 2 * PI); ctx.fill(); ctx.stroke();
        ctx.font = "bold 14px Tajawal, sans-serif"; ctx.direction = 'rtl'; ctx.textAlign = 'center';
        ctx.fillStyle = light ? '#18222e' : '#ffffff';
        ctx.fillText(p.label, X(x) + 12, Y(y) - 10);
      });
      ctx.restore();
      const ptsInfo = st.points.filter((p) => !p.mid || true).slice(0, 12).map((p) => { const [x, y] = pos(p); return [p.label, M.pointStr(x, y)]; });
      measures.innerHTML = lines.concat(ptsInfo.length ? [['الإحداثيات', '']] : [], ptsInfo)
        .map(([k, v]) => (v === '' ? `<div style="background:transparent;color:var(--accent);font-weight:700;padding-top:8px">${k}</div>` : `<div><b>${k}</b><span>${v}</span></div>`)).join('') || '<div class="geo-hint">ابدأ بإنشاء أشكال لترى قياساتها هنا</div>';
    }
    // تحديث القياسات عند الإغلاق
    const origClose = modal.close;
    modal.close = () => { plot.ro.disconnect(); origClose(); };
  }

  function angleAt(a, b, c) {
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]];
    const d = Math.hypot(...v1) * Math.hypot(...v2);
    if (!d) return 0;
    return (Math.acos(M.clamp((v1[0] * v2[0] + v1[1] * v2[1]) / d, -1, 1)) * 180) / PI;
  }
  function polyName(n) { return { 3: 'المثلث', 4: 'الرباعي', 5: 'الخماسي', 6: 'السداسي' }[n] || 'المضلع'; }
  function triType(s, a) {
    const eq = (x, y) => Math.abs(x - y) < 1e-6 * Math.max(1, x);
    let bySides = eq(s[0], s[1]) && eq(s[1], s[2]) ? 'متطابق الأضلاع' : eq(s[0], s[1]) || eq(s[1], s[2]) || eq(s[0], s[2]) ? 'متطابق الضلعين' : 'مختلف الأضلاع';
    const mx = Math.max(...a);
    const byAng = Math.abs(mx - 90) < 0.05 ? 'قائم الزاوية' : mx > 90 ? 'منفرج الزاوية' : 'حاد الزوايا';
    return `${byAng}، ${bySides}`;
  }
  function sideLabel(ctx, x, y, txt, light, col) {
    ctx.save();
    ctx.font = "bold 12px Tajawal, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
    const w = ctx.measureText(txt).width + 10;
    ctx.fillStyle = light ? 'rgba(255,255,255,.92)' : 'rgba(10,18,26,.85)';
    M.roundRect(ctx, x - w / 2, y - 10, w, 20, 6); ctx.fill();
    ctx.fillStyle = col || (light ? '#18222e' : '#e9eef3');
    ctx.fillText(txt, x, y + 1);
    ctx.restore();
  }

  /* ================= حاسبة الأشكال ================= */
  const SHAPES = {
    square: { name: 'مربع', dims: [['l', 'طول الضلع ل']], calc: (d) => [['المساحة', 'ل²', `${F(d.l)}²`, d.l * d.l], ['المحيط', '٤ × ل', `٤ × ${F(d.l)}`, 4 * d.l], ['القطر', 'ل√٢', `${F(d.l)} × √٢`, d.l * Math.SQRT2]] },
    rect: { name: 'مستطيل', dims: [['l', 'الطول ل'], ['w', 'العرض ع']], calc: (d) => [['المساحة', 'ل × ع', `${F(d.l)} × ${F(d.w)}`, d.l * d.w], ['المحيط', '٢(ل + ع)', `٢(${F(d.l)} + ${F(d.w)})`, 2 * (d.l + d.w)], ['القطر', '√(ل² + ع²)', `√(${F(d.l)}² + ${F(d.w)}²)`, Math.hypot(d.l, d.w)]] },
    triangle: { name: 'مثلث', dims: [['b', 'القاعدة ق'], ['h', 'الارتفاع ع']], calc: (d) => [['المساحة', '½ × ق × ع', `½ × ${F(d.b)} × ${F(d.h)}`, 0.5 * d.b * d.h]] },
    circle: { name: 'دائرة', dims: [['r', 'نصف القطر نق']], calc: (d) => [['المساحة', 'ط × نق²', `ط × ${F(d.r)}²`, PI * d.r * d.r], ['المحيط', '٢ × ط × نق', `٢ × ط × ${F(d.r)}`, 2 * PI * d.r], ['القطر', '٢ × نق', `٢ × ${F(d.r)}`, 2 * d.r]] },
    para: { name: 'متوازي أضلاع', dims: [['b', 'القاعدة ق'], ['h', 'الارتفاع ع'], ['s', 'الضلع الجانبي ل']], calc: (d) => [['المساحة', 'ق × ع', `${F(d.b)} × ${F(d.h)}`, d.b * d.h], ['المحيط', '٢(ق + ل)', `٢(${F(d.b)} + ${F(d.s)})`, 2 * (d.b + d.s)]] },
    trap: { name: 'شبه منحرف', dims: [['a', 'القاعدة الكبرى ق١'], ['b', 'القاعدة الصغرى ق٢'], ['h', 'الارتفاع ع']], calc: (d) => [['المساحة', '½ (ق١ + ق٢) × ع', `½ (${F(d.a)} + ${F(d.b)}) × ${F(d.h)}`, 0.5 * (d.a + d.b) * d.h]] },
    rhombus: { name: 'معيّن', dims: [['p', 'القطر الأول ق١'], ['q', 'القطر الثاني ق٢']], calc: (d) => [['المساحة', '½ × ق١ × ق٢', `½ × ${F(d.p)} × ${F(d.q)}`, 0.5 * d.p * d.q], ['الضلع', '√((ق١/٢)² + (ق٢/٢)²)', '', Math.hypot(d.p / 2, d.q / 2)], ['المحيط', '٤ × الضلع', '', 4 * Math.hypot(d.p / 2, d.q / 2)]] },
    cube: { name: 'مكعب', dims: [['l', 'طول الحرف ل']], calc: (d) => [['الحجم', 'ل³', `${F(d.l)}³`, d.l ** 3], ['المساحة الكلية', '٦ل²', `٦ × ${F(d.l)}²`, 6 * d.l * d.l], ['المساحة الجانبية', '٤ل²', '', 4 * d.l * d.l]] },
    cuboid: { name: 'متوازي مستطيلات', dims: [['l', 'الطول ل'], ['w', 'العرض ع'], ['h', 'الارتفاع ر']], calc: (d) => [['الحجم', 'ل × ع × ر', `${F(d.l)} × ${F(d.w)} × ${F(d.h)}`, d.l * d.w * d.h], ['المساحة الكلية', '٢(لع + لر + عر)', '', 2 * (d.l * d.w + d.l * d.h + d.w * d.h)], ['المساحة الجانبية', '٢ر(ل + ع)', '', 2 * d.h * (d.l + d.w)]] },
    cylinder: { name: 'أسطوانة', dims: [['r', 'نصف القطر نق'], ['h', 'الارتفاع ع']], calc: (d) => [['الحجم', 'ط نق² ع', `ط × ${F(d.r)}² × ${F(d.h)}`, PI * d.r * d.r * d.h], ['المساحة الجانبية', '٢ط نق ع', '', 2 * PI * d.r * d.h], ['المساحة الكلية', '٢ط نق(نق + ع)', '', 2 * PI * d.r * (d.r + d.h)]] },
    cone: { name: 'مخروط', dims: [['r', 'نصف القطر نق'], ['h', 'الارتفاع ع']], calc: (d) => { const l = Math.hypot(d.r, d.h); return [['الحجم', '⅓ ط نق² ع', `⅓ × ط × ${F(d.r)}² × ${F(d.h)}`, (PI * d.r * d.r * d.h) / 3], ['الراسم ل', '√(نق² + ع²)', '', l], ['المساحة الجانبية', 'ط نق ل', '', PI * d.r * l], ['المساحة الكلية', 'ط نق(نق + ل)', '', PI * d.r * (d.r + l)]]; } },
    sphere: { name: 'كرة', dims: [['r', 'نصف القطر نق']], calc: (d) => [['الحجم', '⁴⁄₃ ط نق³', `⁴⁄₃ × ط × ${F(d.r)}³`, (4 / 3) * PI * d.r ** 3], ['المساحة السطحية', '٤ ط نق²', `٤ × ط × ${F(d.r)}²`, 4 * PI * d.r * d.r]] },
    pyramid: { name: 'هرم رباعي منتظم', dims: [['a', 'طول ضلع القاعدة ل'], ['h', 'الارتفاع ع']], calc: (d) => { const sl = Math.hypot(d.a / 2, d.h); return [['الحجم', '⅓ × ل² × ع', `⅓ × ${F(d.a)}² × ${F(d.h)}`, (d.a * d.a * d.h) / 3], ['الارتفاع الجانبي', '√((ل/٢)² + ع²)', '', sl], ['المساحة الكلية', 'ل² + ٢ل × الارتفاع الجانبي', '', d.a * d.a + 2 * d.a * sl]]; } },
  };
  const SHAPE_FIG = {
    square: '<rect x="30" y="15" width="70" height="70"/>', rect: '<rect x="15" y="25" width="100" height="55"/>',
    triangle: '<path d="M15 85 L115 85 L70 15 Z"/><path d="M70 15 V85" stroke-dasharray="4 4"/>', circle: '<circle cx="65" cy="50" r="38"/><path d="M65 50 H103" stroke-dasharray="4 4"/>',
    para: '<path d="M35 20 H115 L95 85 H15 Z"/>', trap: '<path d="M40 20 H90 L115 85 H15 Z"/>', rhombus: '<path d="M65 10 L110 50 L65 90 L20 50 Z"/><path d="M65 10 V90 M20 50 H110" stroke-dasharray="4 4"/>',
    cube: '<path d="M25 35 H85 V95 H25 Z M25 35 L45 15 H105 L85 35 M105 15 V75 L85 95"/>', cuboid: '<path d="M15 40 H95 V90 H15 Z M15 40 L35 20 H115 L95 40 M115 20 V70 L95 90"/>',
    cylinder: '<ellipse cx="65" cy="20" rx="35" ry="10"/><path d="M30 20 V80 A35 10 0 0 0 100 80 V20"/>', cone: '<ellipse cx="65" cy="82" rx="38" ry="10"/><path d="M27 82 L65 10 L103 82"/>',
    sphere: '<circle cx="65" cy="50" r="40"/><ellipse cx="65" cy="50" rx="40" ry="11" stroke-dasharray="4 4"/>', pyramid: '<path d="M20 80 L80 80 L110 60 L50 60 Z M20 80 L65 10 L80 80 M65 10 L110 60 M65 10 L50 60"/>',
  };
  function buildShapeCalc() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('scale')} حاسبة المساحات والحجوم</h4>`;
    const sel = h('select', { class: 'sel' });
    const g2 = h('optgroup', { label: 'أشكال مستوية' }), g3 = h('optgroup', { label: 'مجسمات' });
    Object.entries(SHAPES).forEach(([k, s]) => (['cube', 'cuboid', 'cylinder', 'cone', 'sphere', 'pyramid'].includes(k) ? g3 : g2).appendChild(h('option', { value: k }, s.name)));
    sel.append(g2, g3);
    const fig = h('div', { style: { textAlign: 'center', margin: '8px 0' } });
    const inputs = h('div', { class: 'grid2' });
    const out = h('div');
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>احسب</span>' });
    card.append(sel, fig, inputs, btn, out);
    const render = () => {
      const s = SHAPES[sel.value];
      fig.innerHTML = `<svg viewBox="0 0 130 100" width="150" height="110" fill="color-mix(in srgb, var(--accent-2) 14%, transparent)" stroke="var(--accent-2)" stroke-width="2.2" stroke-linejoin="round">${SHAPE_FIG[sel.value]}</svg>`;
      inputs.innerHTML = '';
      s.dims.forEach(([k, label]) => inputs.appendChild(h('label', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'lbl' }, label), h('input', { class: 'inp', 'data-k': k, inputmode: 'decimal', placeholder: '٠' }))));
      out.innerHTML = '';
    };
    sel.onchange = render;
    btn.onclick = () => {
      const s = SHAPES[sel.value];
      const d = {};
      for (const inp of M.$$('input', inputs)) {
        const v = parseFloat(M.toWestern(inp.value));
        if (!(v > 0)) { out.innerHTML = '<div class="err">⚠ أدخل قيماً موجبة لكل الأبعاد</div>'; return; }
        d[inp.dataset.k] = v;
      }
      const rows = s.calc(d);
      const res = {
        title: `${s.name}: القوانين والتعويض`,
        steps: rows.map(([name, law, sub, val]) => `<b>${name}</b> = ${law}${sub ? ' = ' + M.loc(sub) : ''} = <b>${F(val)}</b>`),
        answer: rows.map(([name, , , val]) => `${name}: ${F(val)}`).join(' ، '),
      };
      out.innerHTML = '';
      out.appendChild(M.renderResult(res, { strategy: 'steps' }));
    };
    render();
    return card;
  }

  /* ================= حلّال المثلثات ================= */
  function buildTriangleSolver() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('triangle')} حلّال المثلث</h4><div class="hint">أدخل ثلاثة عناصر على الأقل (منها ضلع واحد)، والزوايا بالدرجات. الضلع أ يقابل الزاوية أ، وهكذا.</div>`;
    const g = h('div', { class: 'grid3' });
    const fields = [['a', 'الضلع أ'], ['b', 'الضلع ب'], ['c', 'الضلع جـ'], ['A', 'الزاوية أ°'], ['B', 'الزاوية ب°'], ['C', 'الزاوية جـ°']];
    fields.forEach(([k, l]) => g.appendChild(h('label', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'lbl' }, l), h('input', { class: 'inp', 'data-k': k, inputmode: 'decimal' }))));
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>حُلّ المثلث</span>' });
    const out = h('div');
    card.append(g, btn, out);
    btn.onclick = () => {
      const v = {};
      M.$$('input', g).forEach((i) => { const x = parseFloat(M.toWestern(i.value)); if (x > 0) v[i.dataset.k] = x; });
      out.innerHTML = '';
      try {
        const r = solveTriangle(v);
        out.appendChild(M.renderResult(r, { strategy: 'steps' }));
        if (r.sol) M.$$('input', g).forEach((i) => (i.value = F(r.sol[i.dataset.k], 3)));
      } catch (e) { out.innerHTML = `<div class="err">⚠ ${e.message}</div>`; }
    };
    return card;
  }
  const rad = (d) => (d * PI) / 180, deg = (r) => (r * 180) / PI;
  function solveTriangle(v) {
    let { a, b, c, A, B, C } = v;
    const steps = [];
    const nS = [a, b, c].filter(Boolean).length, nA = [A, B, C].filter(Boolean).length;
    if (nS + nA < 3 || nS === 0) throw new Error('أدخل ثلاثة عناصر على الأقل منها ضلع واحد');
    // إكمال الزاوية الثالثة
    const thirdAngle = () => {
      if (nA3() === 2) {
        if (!A) { A = 180 - B - C; steps.push(`مجموع زوايا المثلث ١٨٠° ⇐ أ = ١٨٠ - ${F(B)} - ${F(C)} = ${F(A)}°`); }
        else if (!B) { B = 180 - A - C; steps.push(`ب = ١٨٠ - ${F(A)} - ${F(C)} = ${F(B)}°`); }
        else if (!C) { C = 180 - A - B; steps.push(`جـ = ١٨٠ - ${F(A)} - ${F(B)} = ${F(C)}°`); }
      }
    };
    const nA3 = () => [A, B, C].filter(Boolean).length;
    if (nA3() === 3 && Math.abs(A + B + C - 180) > 0.01) throw new Error('مجموع الزوايا يجب أن يساوي ١٨٠°');
    if (nS === 3) {
      if (a + b <= c || a + c <= b || b + c <= a) throw new Error('الأطوال لا تحقق متباينة المثلث (مجموع أي ضلعين أكبر من الثالث)');
      A = deg(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
      B = deg(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
      C = 180 - A - B;
      steps.push(`قانون جيب التمام: جتا أ = (ب² + جـ² - أ²) ÷ ٢ب جـ ⇐ أ = ${F(A)}°`);
      steps.push(`بالمثل: ب = ${F(B)}° ، ومن مجموع الزوايا: جـ = ${F(C)}°`);
    } else if (nS === 2) {
      // ضلعان وزاوية
      const sides = { a, b, c }, angs = { a: A, b: B, c: C };
      const missing = ['a', 'b', 'c'].find((k) => !sides[k]);
      const Up = { a: 'أ', b: 'ب', c: 'جـ' };
      if (angs[missing]) {
        // الزاوية المحصورة: قانون جيب التمام
        const [p, q] = ['a', 'b', 'c'].filter((k) => k !== missing);
        const x = Math.sqrt(sides[p] ** 2 + sides[q] ** 2 - 2 * sides[p] * sides[q] * Math.cos(rad(angs[missing])));
        steps.push(`الزاوية محصورة بين الضلعين ⇐ قانون جيب التمام: ${Up[missing]}² = ${Up[p]}² + ${Up[q]}² - ٢${Up[p]}${Up[q]} جتا ${Up[missing]} ⇐ ${Up[missing]} = ${F(x)}`);
        return solveTriangle(Object.assign({ a, b, c }, { [missing]: x }));
      }
      // حالة ضلعين وزاوية غير محصورة (قد تكون ملتبسة)
      const known = ['a', 'b', 'c'].find((k) => sides[k] && angs[k]);
      if (!known) { thirdAngle(); if (nA3() < 3) throw new Error('بيانات غير كافية'); }
      else {
        const other = ['a', 'b', 'c'].find((k) => k !== known && sides[k]);
        const s = (sides[other] * Math.sin(rad(angs[known]))) / sides[known];
        if (s > 1 + 1e-9) throw new Error('لا يوجد مثلث بهذه القياسات');
        const ang = deg(Math.asin(Math.min(1, s)));
        steps.push(`قانون الجيوب: جا${Up[other]} = ${Up[other]} × جا${Up[known]} ÷ ${Up[known]} = ${F(s, 4)} ⇐ ${Up[other]} = ${F(ang)}°`);
        const alt = 180 - ang;
        if (alt + angs[known] < 180 - 1e-6 && Math.abs(alt - ang) > 1e-6) steps.push(`⚠ حالة ملتبسة: يوجد مثلث ثانٍ تكون فيه الزاوية ${Up[other]} = ${F(alt)}°`);
        const o = { a, b, c, [known.toUpperCase()]: angs[known], [other.toUpperCase()]: ang };
        const res = solveTriangle(o);
        res.steps = steps.concat(res.steps);
        return res;
      }
    }
    thirdAngle();
    if (nA3() === 3 && (!a || !b || !c)) {
      const k = a ? a / Math.sin(rad(A)) : b ? b / Math.sin(rad(B)) : c / Math.sin(rad(C));
      steps.push(`قانون الجيوب: أ ÷ جا أ = ب ÷ جا ب = جـ ÷ جا جـ = ${F(k)}`);
      if (!a) { a = k * Math.sin(rad(A)); steps.push(`أ = ${F(k)} × جا ${F(A)}° = ${F(a)}`); }
      if (!b) { b = k * Math.sin(rad(B)); steps.push(`ب = ${F(k)} × جا ${F(B)}° = ${F(b)}`); }
      if (!c) { c = k * Math.sin(rad(C)); steps.push(`جـ = ${F(k)} × جا ${F(C)}° = ${F(c)}`); }
    }
    const s = (a + b + c) / 2;
    const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    steps.push(`المساحة بقانون هيرون: ح = (أ+ب+جـ)÷٢ = ${F(s)} ، م = √(ح(ح-أ)(ح-ب)(ح-جـ)) = ${F(area)}`);
    steps.push(`المحيط = ${F(a + b + c)} ، التصنيف: ${triType([a, b, c], [A, B, C])}`);
    return { title: 'حل المثلث', steps, answer: `أ = ${F(a)} ، ب = ${F(b)} ، جـ = ${F(c)} ، ∠أ = ${F(A, 2)}° ، ∠ب = ${F(B, 2)}° ، ∠جـ = ${F(C, 2)}°`, sol: { a, b, c, A, B, C } };
  }

  /* ================= فيثاغورس ================= */
  function buildPythagoras() {
    const card = h('div', { class: 'card' });
    card.innerHTML = `<h4>${icon('rtri')} نظرية فيثاغورس</h4><div class="hint">في المثلث القائم: الوتر² = مجموع مربعي الضلعين الآخرين. اترك المجهول فارغاً.</div>`;
    const g = h('div', { class: 'grid3' });
    [['a', 'الضلع الأول'], ['b', 'الضلع الثاني'], ['c', 'الوتر']].forEach(([k, l]) => g.appendChild(h('label', { class: 'stack', style: { gap: '4px' } }, h('span', { class: 'lbl' }, l), h('input', { class: 'inp', 'data-k': k, inputmode: 'decimal' }))));
    const btn = h('button', { class: 'btn primary block', style: { marginTop: '8px' }, html: '<span>احسب المجهول</span>' });
    const out = h('div');
    card.append(g, btn, out);
    btn.onclick = () => {
      const v = {};
      M.$$('input', g).forEach((i) => { const x = parseFloat(M.toWestern(i.value)); if (x > 0) v[i.dataset.k] = x; });
      out.innerHTML = '';
      const n = Object.keys(v).length;
      if (n !== 2) { out.innerHTML = '<div class="err">⚠ أدخل قيمتين بالضبط</div>'; return; }
      let res;
      if (!v.c) {
        const c = Math.hypot(v.a, v.b);
        res = { title: 'إيجاد الوتر', steps: [`الوتر² = ${F(v.a)}² + ${F(v.b)}² = ${F(v.a * v.a)} + ${F(v.b * v.b)} = ${F(v.a * v.a + v.b * v.b)}`, `الوتر = √${F(v.a * v.a + v.b * v.b)}`], answer: `الوتر = ${F(c)}` };
      } else {
        const known = v.a || v.b;
        if (known >= v.c) { out.innerHTML = '<div class="err">⚠ الوتر يجب أن يكون أطول ضلع</div>'; return; }
        const x = Math.sqrt(v.c * v.c - known * known);
        res = { title: 'إيجاد ضلع القائمة', steps: [`الضلع² = الوتر² - الضلع المعلوم² = ${F(v.c)}² - ${F(known)}² = ${F(v.c * v.c - known * known)}`, `الضلع = √${F(v.c * v.c - known * known)}`], answer: `الضلع المجهول = ${F(x)}` };
      }
      out.appendChild(M.renderResult(res, { strategy: 'steps' }));
    };
    return card;
  }
})();
