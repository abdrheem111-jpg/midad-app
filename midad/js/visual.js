/* ==========================================================================
   الشرح البصري: بدل سطر تحت سطر ⇐ بطاقات ملوّنة وأسهم واتجاهات وأشكال
   - مخطط تدفق للحل: كل خطوة بطاقة، والسهم بينها يحمل العملية («نقسم الطرفين على ٢»)
   - خريطة مفاهيم للدرس: الفكرة في المركز وتتفرع منها المثال والمواد والنشاط والخطأ الشائع والتحقق
   تُعرض في اللوحات (HTML) وعلى السبورة (كائن «vis» يُسحب ويُكبّر)
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h } = M;
  const L = (x) => M.loc(x);
  const strip = (s) => String(s || '').replace(/<span class="mfrac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '$1/$2').replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const plain = (s) => { let t; try { t = M.htmlToPlain ? M.htmlToPlain(String(s || '')) : strip(s); } catch (e) { t = strip(s); } t = String(t || '').replace(/\s+/g, ' ').trim(); return M.prettyPow ? M.prettyPow(t) : t; };
  const COLORS = [['#4dabf7', '#1c7ed6'], ['#ffa94d', '#e8590c'], ['#8ce99a', '#2f9e44'], ['#da77f2', '#9c36b5'], ['#66d9e8', '#0c8599'], ['#ff8787', '#e03131'], ['#ffd43b', '#e67700']];
  const ICONS = [[/المعادلة|التعبير|المسألة/, '⚖️'], [/التحقق|نتحقق/, '✅'], [/المميّز|المميز/, '🔍'], [/القانون|نستخدم/, '📐'], [/التحليل|نحلل|عوامل/, '🧩'], [/نقسم/, '➗'], [/نضرب/, '✖️'], [/ننقل|نطرح|نجمع/, '↔️'], [/نعوّض|بالتعويض/, '🔁'], [/الرأس|المحور/, '📍']];
  const iconFor = (t) => { for (const [re, ic] of ICONS) if (re.test(t)) return ic; return ''; };

  /** «وصف: تعبير» ⇐ {label, math} (نقسم عند آخر نقطتين خارج الوسوم) */
  function splitStep(html) {
    const s = String(html || '');
    let depth = 0, cut = -1;
    for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '<') depth++; else if (c === '>') depth--; else if (c === ':' && depth === 0) cut = i; }
    if (cut < 0) return { label: '', math: s };
    const label = s.slice(0, cut).trim(), math = s.slice(cut + 1).trim();
    if (!plain(math)) return { label: '', math: label };
    return { label, math };
  }

  /* ================= في اللوحات: مخطط تدفق HTML ================= */
  function flowHTML(steps, answer, opts) {
    opts = opts || {};
    const box = h('div', { class: 'vflow' + (opts.compact ? ' compact' : '') });
    (steps || []).forEach((st, i) => {
      const { label, math } = splitStep(st);
      const [c1, c2] = COLORS[i % COLORS.length];
      const g = h('div', { class: 'vstep', style: `--c1:${c1};--c2:${c2}` });
      if (i > 0 || label) {
        if (i > 0) g.appendChild(h('div', { class: 'varrow', html: label ? `<span class="vlabel">${iconFor(plain(label))} ${label}</span>` : '' }));
      }
      const card = h('div', { class: 'vcard' });
      card.innerHTML = `<span class="vnum">${L(i + 1)}</span>${i === 0 && label ? `<small class="vcap">${iconFor(plain(label))} ${label}</small>` : ''}<div class="vmath">${math}</div>`;
      g.appendChild(card);
      if (opts.progressive && i > 0) g.classList.add('hidden-step');
      box.appendChild(g);
    });
    if (answer) {
      const g = h('div', { class: 'vstep final' + (opts.progressive ? ' hidden-step' : '') });
      g.innerHTML = `<div class="varrow"><span class="vlabel">∴ ${opts.answerLabel || 'الناتج'}</span></div><div class="vcard"><span class="vnum">✓</span><div class="vmath">${answer}</div></div>`;
      box.appendChild(g);
    }
    return box;
  }

  /* ================= على السبورة ================= */
  const mcv = document.createElement('canvas');
  const mctx = mcv.getContext ? mcv.getContext('2d') : null;
  const font = (sz, b) => `${b ? 'bold ' : ''}${sz}px ${M.fontFamily ? M.fontFamily() : 'sans-serif'}`;
  function measure(t, f) { if (!mctx || !mctx.measureText) return String(t).length * 9; mctx.font = f; return mctx.measureText(t).width; }
  function wrap(text, maxW, f) {
    const words = L(String(text)).split(/\s+/), lines = [];
    let cur = '';
    words.forEach((w) => { const t = cur ? cur + ' ' + w : w; if (measure(t, f) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  const layoutCache = new WeakMap();
  function layout(o) {
    const sig = JSON.stringify([o.kind, o.title, o.steps, o.answer, o.nodes, M.settings.font, M.settings.numerals]);
    const c = layoutCache.get(o);
    if (c && c.sig === sig) return c.lay;
    const lay = o.kind === 'map' ? layoutMap(o) : layoutFlow(o);
    layoutCache.set(o, { sig, lay });
    return lay;
  }
  /** مخطط التدفق: عمود من البطاقات بينها أسهم تحمل العملية */
  function layoutFlow(o) {
    const FT = font(24, true), FM = font(21, true), FL = font(15, true), FC = font(13);
    const cards = [], arrows = [];
    let maxCard = 0, maxLab = 0;
    (o.steps || []).forEach((st, i) => {
      const lab = plain(st.label), math = plain(st.math);
      const lines = wrap(math, 460, FM), w = Math.max(...lines.map((t) => measure(t, FM))) + 64;
      const cap = i === 0 && lab ? wrap(lab, 420, FC) : null;
      cards.push({ lines, w, h: lines.length * 30 + 26 + (cap ? cap.length * 18 + 4 : 0), cap, color: COLORS[i % COLORS.length] });
      maxCard = Math.max(maxCard, w, cap ? Math.max(...cap.map((t) => measure(t, FC))) + 64 : 0);
      if (i > 0) { const ll = lab ? wrap((iconFor(lab) + ' ' + lab).trim(), 280, FL) : []; arrows.push({ lines: ll }); maxLab = Math.max(maxLab, ...ll.map((t) => measure(t, FL)), 0); }
    });
    if (o.answer) {
      const lines = wrap(plain(o.answer), 460, font(24, true));
      cards.push({ lines, w: Math.max(...lines.map((t) => measure(t, font(24, true)))) + 80, h: lines.length * 33 + 28, final: true, color: ['#ffd43b', '#e67700'] });
      arrows.push({ lines: [L('∴ الناتج')] });
      maxCard = Math.max(maxCard, cards[cards.length - 1].w);
    }
    const W = Math.max(maxCard, 2 * (maxLab + 34), o.title ? measure(L(o.title), FT) + 40 : 0);
    const cx = W / 2;
    let y = 0;
    const title = o.title ? { text: L(o.title), y: 18 } : null;
    if (title) y = 46;
    const out = { W, cards: [], arrows: [], title };
    cards.forEach((cd, i) => {
      if (i > 0) { const a = arrows[i - 1], len = Math.max(46, a.lines.length * 20 + 20); out.arrows.push({ x: cx, y1: y, y2: y + len, lines: a.lines }); y += len; }
      out.cards.push(Object.assign({}, cd, { x: cx - cd.w / 2, y }));
      y += cd.h;
    });
    out.H = y;
    return out;
  }
  /** خريطة المفاهيم: فكرة مركزية تتفرع منها بطاقات بأسهم منحنية */
  function layoutMap(o) {
    const FT = font(26, true), FH = font(17, true), FB = font(15);
    const tl = wrap(o.title || '', 240, FT), tw = Math.max(...tl.map((t) => measure(t, FT)));
    const rx = tw / 2 + 36, ry = (tl.length * 32) / 2 + 30;
    const NW = 330;
    const nodes = (o.nodes || []).map((n, i) => {
      const body = [].concat(n.lines || [n.text || '']).flatMap((t) => wrap(plain(t), NW - 30, FB));
      return { icon: n.icon, head: L(n.title), body: body.slice(0, 9), h: 44 + Math.min(9, body.length) * 21 + 10, color: COLORS[i % COLORS.length] };
    });
    const right = nodes.filter((_, i) => i % 2 === 0), left = nodes.filter((_, i) => i % 2 === 1);
    const gap = 22, colH = (col) => col.reduce((s, n) => s + n.h, 0) + gap * Math.max(0, col.length - 1);
    const H = Math.max(colH(right), colH(left), ry * 2 + 40);
    const cx = NW + 90 + rx, cy = H / 2;
    const place = (col, x) => { let y = cy - colH(col) / 2; col.forEach((n) => { n.x = x; n.y = y; y += n.h + gap; }); };
    place(right, cx + rx + 90);
    place(left, cx - rx - 90 - NW);
    nodes.forEach((n) => { n.w = NW; });
    return { W: 2 * (NW + 90 + rx), H, cx, cy, rx, ry, tl, nodes };
  }
  function roundRect(ctx, x, y, w, hh, r) { M.roundRect(ctx, x, y, w, hh, r); }
  function arrowHead(ctx, x, y, ang, sz) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sz * Math.cos(ang - 0.45), y - sz * Math.sin(ang - 0.45)); ctx.lineTo(x - sz * Math.cos(ang + 0.45), y - sz * Math.sin(ang + 0.45)); ctx.closePath(); ctx.fill(); }
  function draw(ctx, o, board) {
    const lay = layout(o), k = o.k || 1, light = board.isLight;
    const txt = light ? '#1b2733' : '#f1f5f2', cardBg = light ? 'rgba(255,255,255,.95)' : 'rgba(14,24,30,.9)';
    ctx.save();
    ctx.translate(o.x, o.y); ctx.scale(k, k);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (o.kind === 'map') {
      const { cx, cy, rx, ry, tl, nodes } = lay;
      // الأسهم أولاً
      nodes.forEach((n) => {
        const toRight = n.x > cx, ex = toRight ? n.x : n.x + n.w, ey = n.y + 22;
        const ang0 = Math.atan2(ey - cy, ex - cx), sx = cx + rx * Math.cos(ang0), sy = cy + ry * Math.sin(ang0);
        const mx = (sx + ex) / 2, my = (sy + ey) / 2 - 30;
        ctx.strokeStyle = n.color[light ? 1 : 0]; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3.2;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, ex, ey); ctx.stroke();
        arrowHead(ctx, ex, ey, Math.atan2(ey - my, ex - mx), 14);
      });
      // الفكرة المركزية
      const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
      g.addColorStop(0, light ? '#e7f5ff' : '#1c3b4a'); g.addColorStop(1, light ? '#fff3bf' : '#3b3316');
      ctx.fillStyle = g; ctx.strokeStyle = light ? '#1c7ed6' : '#ffd43b'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = txt; ctx.font = font(26, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      tl.forEach((t, i) => ctx.fillText(t, cx, cy + (i - (tl.length - 1) / 2) * 32));
      // البطاقات
      nodes.forEach((n) => {
        const [c1, c2] = n.color;
        ctx.fillStyle = cardBg; ctx.strokeStyle = light ? c2 : c1; ctx.lineWidth = 2.5;
        roundRect(ctx, n.x, n.y, n.w, n.h, 16); ctx.fill(); ctx.stroke();
        ctx.fillStyle = light ? c2 : c1; roundRect(ctx, n.x, n.y, n.w, 38, 16); ctx.fill(); ctx.fillRect(n.x, n.y + 22, n.w, 16);
        ctx.fillStyle = light ? '#fff' : '#0b1418'; ctx.font = font(17, true); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(`${n.icon || ''} ${n.head}`, n.x + n.w - 14, n.y + 20);
        ctx.fillStyle = txt; ctx.font = font(15);
        n.body.forEach((t, i) => ctx.fillText(t, n.x + n.w - 15, n.y + 56 + i * 21));
      });
    } else {
      const { W, cards, arrows, title } = lay;
      if (title) {
        ctx.fillStyle = txt; ctx.font = font(24, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(title.text, W / 2, title.y);
        ctx.strokeStyle = light ? '#1c7ed6' : '#ffd43b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 - 60, title.y + 20); ctx.lineTo(W / 2 + 60, title.y + 20); ctx.stroke();
      }
      arrows.forEach((a) => {
        ctx.strokeStyle = light ? '#495057' : '#adb5bd'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(a.x, a.y1 + 4); ctx.lineTo(a.x, a.y2 - 10); ctx.stroke(); arrowHead(ctx, a.x, a.y2 - 2, Math.PI / 2, 13);
        if (a.lines.length) {
          ctx.font = font(15, true);
          const lw = Math.max(...a.lines.map((t) => ctx.measureText(t).width)) + 16, lh = a.lines.length * 20 + 8, ly = (a.y1 + a.y2) / 2 - lh / 2;
          ctx.fillStyle = light ? '#f1f3f5' : 'rgba(255,255,255,.1)'; roundRect(ctx, a.x + 14, ly, lw, lh, 9); ctx.fill();
          ctx.fillStyle = light ? '#343a40' : '#e9ecef'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          a.lines.forEach((t, i) => ctx.fillText(t, a.x + 14 + lw - 8, ly + 14 + i * 20));
        }
      });
      cards.forEach((c, i) => {
        const [c1, c2] = c.color;
        ctx.fillStyle = cardBg; ctx.strokeStyle = light ? c2 : c1; ctx.lineWidth = c.final ? 4 : 2.6;
        if (c.final) { ctx.shadowColor = c1; ctx.shadowBlur = 18; }
        roundRect(ctx, c.x, c.y, c.w, c.h, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        // رقم الخطوة
        ctx.fillStyle = light ? c2 : c1; ctx.beginPath(); ctx.arc(c.x + c.w, c.y + 16, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = light ? '#fff' : '#0b1418'; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.final ? '✓' : L(i + 1), c.x + c.w, c.y + 17);
        let y = c.y + 14;
        if (c.cap) { ctx.fillStyle = light ? '#868e96' : '#adb5bd'; ctx.font = font(13); c.cap.forEach((t) => { ctx.fillText(t, c.x + c.w / 2, y + 6); y += 18; }); y += 4; }
        ctx.fillStyle = c.final ? (light ? '#e67700' : '#ffd43b') : txt; ctx.font = font(c.final ? 24 : 21, true);
        c.lines.forEach((t) => { ctx.fillText(t, c.x + c.w / 2, y + (c.final ? 17 : 15)); y += c.final ? 33 : 30; });
      });
    }
    ctx.restore();
  }
  const G = {
    draw,
    bbox: (o) => { const lay = layout(o), k = o.k || 1; return [o.x, o.y, o.x + lay.W * k, o.y + lay.H * k]; },
    hit: (o, x, y, t) => { const b = G.bbox(o); return x >= b[0] - t && x <= b[2] + t && y >= b[1] - t && y <= b[3] + t; },
    handleAt: () => null,
    drag: () => {},
  };
  M.geoTypes = M.geoTypes || {};
  M.geoTypes.vis = G;

  /** وضع كائن بصري في الجزء المرئي من السبورة بحجم مناسب */
  function place(o, where) {
    const b = M.board, lay = layout(o);
    let vw = b.w / b.view.s, vh = b.h / b.view.s, [x0, y0] = b.toWorld(0, 0);
    // نتجنب لوحة الوضع المفتوحة (يسار السبورة)
    const dock = document.querySelector('.mode-dock:not(.min)');
    if (dock && b.w > 900) { const dw = (dock.getBoundingClientRect().right - b.canvas.getBoundingClientRect().left + 16) / b.view.s; if (dw > 0 && dw < vw * 0.5) { x0 += dw; vw -= dw; } }
    const maxW = vw * (where === 'side' ? 0.46 : 0.8), maxH = vh * 0.82;
    o.k = Math.min(1.2, maxW / lay.W, maxH / lay.H);
    const w = lay.W * o.k, hh = lay.H * o.k;
    if (where === 'side') { o.x = x0 + vw - w - 24 / b.view.s; o.y = y0 + 24 / b.view.s; }
    else { o.x = x0 + (vw - w) / 2; o.y = y0 + Math.max(20 / b.view.s, (vh - hh) / 2); }
    return o;
  }
  function addFlow(res, where) {
    const o = { id: Math.random().toString(36).slice(2, 10), type: 'vis', kind: 'flow', title: plain(res.title || ''), steps: (res.steps || []).map((s) => { const p = splitStep(s); return { label: p.label, math: p.math }; }), answer: res.answer ? res.answer : '' };
    place(o, where);
    const b = M.board; b.commit(); b.objects.push(o); b.changed();
    return o;
  }
  /** خريطة مفاهيم الدرس */
  function lessonNodes(lesson, q) {
    const pd = M.pedagogy ? M.pedagogy.forLesson(lesson) : null;
    const nodes = [{ icon: '💡', title: 'الفكرة الأساسية', text: lesson.d }];
    if (q) nodes.push({ icon: '✏️', title: 'مثال', lines: [plain(q.text.replace(/<br>/g, ' — ')), q.answer != null ? '⇐ الإجابة: ' + plain(M.practice && M.practice.answerText ? M.practice.answerText(q) : q.answer) : ''] });
    if (pd) {
      nodes.push({ icon: '🧰', title: 'مواد محسوسة', lines: pd.materials.map((m) => '• ' + m) });
      nodes.push({ icon: '🪜', title: 'خطوات النشاط', lines: (pd.strats[0] ? [`${pd.strats[0].icon} استراتيجية: ${pd.strats[0].name}`] : []).concat(pd.steps.map((s, i) => `${L(i + 1)}) ${s}`)) });
      nodes.push({ icon: '⚠️', title: 'خطأ شائع وعلاجه', text: pd.misconception });
      nodes.push({ icon: '🎯', title: 'بطاقة الخروج', text: pd.exit });
    }
    return nodes;
  }
  function addLessonMap(lesson, q, where) {
    const o = { id: Math.random().toString(36).slice(2, 10), type: 'vis', kind: 'map', title: lesson.t, nodes: lessonNodes(lesson, q) };
    place(o, where);
    const b = M.board; b.commit(); b.objects.push(o); b.changed();
    return o;
  }
  M.visual = { flowHTML, splitStep, addFlow, addLessonMap, lessonNodes, layout, place };
})();
