/* ==========================================================================
   أشكال هندسية تفاعلية إضافية على المستوى الإحداثي:
   المماس لمنحنى دالة عند نقطة تُسحب على المنحنى (الميل = المشتقة، ومعادلة المماس والعمودي)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const L = (x) => M.loc(x);
  const F = (x, d) => M.fmt(Math.abs(x) < 1e-10 ? 0 : x, d == null ? 2 : d);
  const U = () => (M.board && M.board.unit) || 40;
  const fnObj = (o) => M.board && M.board.objects.find((q) => q.id === o.fn && q.type === 'fn');
  const cache = new WeakMap();
  function fOf(fo) {
    let c = cache.get(fo);
    if (!c || c.expr !== fo.expr) {
      let ast = null; try { ast = M.math.parse(String(fo.expr).replace(/^\s*(ص|y)\s*=\s*/, '')); } catch (e) { ast = null; }
      c = { expr: fo.expr, f: (x) => { try { return ast ? M.math.evaluate(ast, { x }, 'rad') : NaN; } catch (e) { return NaN; } } };
      cache.set(fo, c);
    }
    return c.f;
  }
  /** الميل بالفرق المركزي (ودقة ١٠⁻⁶ تقريباً)، مقرّباً إلى قيمة جميلة إن كانت قريبة */
  function slope(f, x) {
    const h = 1e-4, m = (f(x + h) - f(x - h)) / (2 * h);
    const r = Math.round(m * 1000) / 1000;
    return Math.abs(r - m) < 1e-5 ? r : m;
  }
  function calc(o) {
    const fo = fnObj(o); if (!fo) return null;
    const f = fOf(fo), x0 = o.x0, y0 = f(x0), m = slope(f, x0);
    if (!Number.isFinite(y0) || !Number.isFinite(m)) return { fo, x0, bad: true };
    return { fo, f, x0, y0, m, c: y0 - m * x0 };
  }
  const eq = (m, c) => { const X = M.varName('x'), Y = M.varName('y'); if (Math.abs(m) < 1e-9) return `${Y} = ${F(c)}`; const mm = Math.abs(m - 1) < 1e-9 ? '' : Math.abs(m + 1) < 1e-9 ? '−' : F(m); return `${Y} = ${mm}${X}${Math.abs(c) < 1e-9 ? '' : ` ${c < 0 ? '−' : '+'} ${F(Math.abs(c))}`}`; };
  function info(o) {
    const k = calc(o); if (!k) return null;
    if (k.bad) return { lines: [`الدالة غير معرّفة أو غير قابلة للاشتقاق عند ${M.varName('x')} = ${F(o.x0)}`] };
    const X = M.varName('x');
    const lines = [
      `نقطة التماس (${F(k.x0)}، ${F(k.y0)})`,
      `الميل = د′(${F(k.x0)}) = ${F(k.m)} ${k.m > 1e-9 ? '↗ الدالة متزايدة هنا' : k.m < -1e-9 ? '↘ الدالة متناقصة هنا' : '→ نقطة حرجة (قيمة قصوى محتملة)'}`,
      `معادلة المماس: ${eq(k.m, k.c)}`,
    ];
    if (Math.abs(k.m) > 1e-9) lines.push(`العمودي على المماس: ميله −١ ÷ ${F(k.m)} = ${F(-1 / k.m)} ⇐ ${eq(-1 / k.m, k.y0 + k.x0 / k.m)}`);
    else lines.push(`العمودي على المماس: ${X} = ${F(k.x0)}`);
    return { lines, k };
  }
  function draw(ctx, o, board, s) {
    const inf = info(o); if (!inf || !inf.k) return;
    const { x0, y0, m } = inf.k, u = U(), light = board.isLight;
    const W = (x, y) => [x * u, -y * u];
    const T = (x) => W(x, y0 + m * (x - x0));
    const span = Math.max(3, 400 / (u * s));
    const col = light ? '#d6336c' : '#ff8fab', ncol = light ? '#1c7ed6' : '#74c0fc';
    ctx.save(); ctx.lineCap = 'round';
    // المماس
    ctx.strokeStyle = col; ctx.lineWidth = 3 / Math.sqrt(s);
    const a = T(x0 - span), b = T(x0 + span); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    // العمودي (متقطع)
    if (o.normal !== false) {
      ctx.strokeStyle = ncol; ctx.setLineDash([8 / s, 6 / s]); ctx.lineWidth = 2 / Math.sqrt(s);
      const len = span * 0.6, d = Math.abs(m) < 1e-9 ? [0, 1] : [1, -1 / m], dl = Math.hypot(d[0], d[1]);
      const p1 = W(x0 - (d[0] / dl) * len, y0 - (d[1] / dl) * len), p2 = W(x0 + (d[0] / dl) * len, y0 + (d[1] / dl) * len);
      ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke(); ctx.setLineDash([]);
    }
    // مثلث الميل: خطوة ١ أفقياً وم رأسياً
    ctx.strokeStyle = light ? '#2f9e44' : '#8ce99a'; ctx.lineWidth = 2 / Math.sqrt(s); ctx.setLineDash([4 / s, 3 / s]);
    const P0 = W(x0, y0), P1 = W(x0 + 1, y0), P2 = W(x0 + 1, y0 + m);
    ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.lineTo(P2[0], P2[1]); ctx.stroke(); ctx.setLineDash([]);
    const fs = 14 / s;
    ctx.font = `bold ${fs}px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = light ? '#2f9e44' : '#8ce99a'; ctx.fillText(L('١'), (P0[0] + P1[0]) / 2, P0[1] + (m >= 0 ? 1 : -1) * 12 / s); ctx.fillText(L(`م = ${F(m)}`), P1[0] + 34 / s, (P1[1] + P2[1]) / 2);
    // النقطة (مقبض السحب)
    const hr = (board.handleR ? board.handleR() : 9) / s;
    ctx.fillStyle = col; ctx.strokeStyle = light ? '#fff' : '#0b1418'; ctx.lineWidth = 2 / s;
    ctx.beginPath(); ctx.arc(P0[0], P0[1], hr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // البطاقة
    if (o.card !== false) {
      const lines = inf.lines, lh = 22 / s, pad = 10 / s;
      ctx.font = `${fs}px ${M.fontFamily()}`;
      const w = Math.max(...lines.map((t) => ctx.measureText(L(t)).width)) + 2 * pad, hh = lines.length * lh + 2 * pad;
      const bx = P0[0] + 26 / s, by = P0[1] - hh - 20 / s;
      ctx.fillStyle = light ? 'rgba(255,255,255,.93)' : 'rgba(10,20,26,.84)'; M.roundRect(ctx, bx, by, w, hh, 10 / s); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.2 / s; ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillStyle = light ? '#1b2733' : '#f1f5f2';
      lines.forEach((t, i) => ctx.fillText(L(t), bx + w - pad, by + pad + lh * (i + 0.5)));
    }
    ctx.restore();
  }
  const pos = (o) => { const k = calc(o); return k && !k.bad ? [k.x0 * U(), -k.y0 * U()] : null; };
  const G = {
    draw,
    handleAt: (o, x, y, tol) => { const p = pos(o); return p && Math.hypot(p[0] - x, p[1] - y) <= tol ? 'X' : null; },
    drag: (o, k, x) => { const v = x / U(), snap = Math.round(v * 10) / 10; o.x0 = Math.abs(v - Math.round(v)) < 0.08 ? Math.round(v) : snap; },
    hit: (o, x, y, tol) => { const p = pos(o); return !!p && Math.hypot(p[0] - x, p[1] - y) <= tol + 10; },
    bbox: (o) => { const p = pos(o) || [0, 0], u = U(); return [p[0] - 3 * u, p[1] - 3 * u, p[0] + 3 * u, p[1] + 3 * u]; },
  };
  M.geoTypes = M.geoTypes || {};
  M.geoTypes.fntan = G;
  /** إضافة مماس لدالة مرسومة */
  function addTangent(fo, x0) {
    const b = M.board;
    const o = { id: Math.random().toString(36).slice(2, 10), type: 'fntan', fn: fo.id, x0: x0 == null ? 1 : x0, color: 'c2', width: 3 };
    b.commit(); b.objects.push(o); b.changed();
    return o;
  }
  M.fnTangent = { addTangent, info, slope, calc };
})();
