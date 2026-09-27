/* ==========================================================================
   الأدوات العائمة فوق السبورة: نافذة عائمة عامة، المسطرة، المنقلة
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;

  /** نافذة عائمة قابلة للسحب */
  M.floatWidget = function (opts) {
    const root = M.$('#overlays');
    const el = M.h('div', { class: 'float-widget ' + (opts.cls || '') });
    const head = M.h('div', { class: 'fw-head' });
    head.innerHTML = `<span>${opts.icon ? M.icon(opts.icon) : ''} ${opts.title || ''}</span>`;
    const x = M.h('button', { class: 'icon-btn', title: 'إغلاق', html: M.icon('close') });
    head.appendChild(x);
    el.appendChild(head);
    if (opts.body) el.appendChild(opts.body);
    root.appendChild(el);
    const W = root.clientWidth;
    el.style.left = (opts.x != null ? opts.x : W / 2 - el.offsetWidth / 2) + 'px';
    el.style.top = (opts.y != null ? opts.y : 20) + 'px';
    let drag = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      head.setPointerCapture(e.pointerId);
      drag = { x: e.clientX - el.offsetLeft, y: e.clientY - el.offsetTop };
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag) return;
      el.style.left = M.clamp(e.clientX - drag.x, 0, root.clientWidth - 60) + 'px';
      el.style.top = M.clamp(e.clientY - drag.y, 0, root.clientHeight - 40) + 'px';
    });
    head.addEventListener('pointerup', () => (drag = null));
    const close = () => { el.remove(); if (opts.onClose) opts.onClose(); };
    x.onclick = close;
    return { el, close };
  };

  /** أداة قياس قابلة للسحب والتدوير */
  function makeRotatable(el, opts) {
    let angle = opts.angle || 0;
    let pos = { x: opts.x, y: opts.y }; // موضع نقطة الارتكاز على الشاشة
    const apply = () => {
      el.style.left = pos.x + 'px';
      el.style.top = pos.y + 'px';
      el.style.transform = `translate(${-opts.pivot[0]}px, ${-opts.pivot[1]}px) rotate(${angle}deg)`;
      el.style.transformOrigin = `${opts.pivot[0]}px ${opts.pivot[1]}px`;
      if (opts.onChange) opts.onChange(angle);
    };
    let mode = null, start = null;
    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.x')) return;
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      if (e.target.closest('.rot')) {
        mode = 'rot';
      } else {
        mode = 'move';
        start = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!mode) return;
      if (mode === 'move') {
        pos.x = start.px + e.clientX - start.x;
        pos.y = start.py + e.clientY - start.y;
      } else {
        const r = el.parentElement.getBoundingClientRect();
        const cx = r.left + pos.x, cy = r.top + pos.y;
        let a = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + (opts.rotOffset || 0);
        if (!e.shiftKey) { const snapA = Math.round(a / 15) * 15; if (Math.abs(a - snapA) < 2.5) a = snapA; }
        angle = a;
      }
      apply();
    });
    el.addEventListener('pointerup', () => (mode = null));
    apply();
    return { apply, setAngle(a) { angle = a; apply(); } };
  }

  M.tools = M.tools || {};
  let rulerEl = null, protEl = null;

  M.tools.toggleRuler = function () {
    if (rulerEl) { rulerEl.remove(); rulerEl = null; M.emit('overlay-tools'); return; }
    const b = M.board;
    const unitPx = b.unit * b.view.s;
    const cm = 15;
    const L = unitPx * cm + 30, H = 64;
    const light = M.settings.theme === 'white';
    let ticks = '';
    for (let i = 0; i <= cm * 10; i++) {
      const x = 15 + (i * unitPx) / 10;
      const h = i % 10 === 0 ? 22 : i % 5 === 0 ? 15 : 9;
      ticks += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" />`;
      if (i % 10 === 0) ticks += `<text x="${x}" y="36">${M.loc(i / 10)}</text>`;
    }
    rulerEl = M.h('div', { class: 'measure-tool', style: { width: L + 'px', height: H + 'px' } });
    rulerEl.innerHTML = `
      <svg width="${L}" height="${H}" viewBox="0 0 ${L} ${H}">
        <rect x="0.5" y="0.5" width="${L - 1}" height="${H - 1}" rx="6" fill="${light ? 'rgba(255,236,170,.88)' : 'rgba(255,230,160,.82)'}" stroke="rgba(120,90,20,.6)"/>
        <g stroke="#3a2c08" stroke-width="1">${ticks}</g>
        <style>text{font:700 12px Tajawal,sans-serif;fill:#3a2c08;text-anchor:middle}</style>
        <text x="${L - 40}" y="56" style="font-size:10px">وحدة</text>
      </svg>
      <div class="rot" style="left:${L - 13}px;top:${H / 2 - 13}px" title="اسحب للتدوير">${M.icon('rotate')}</div>
      <div class="x" style="left:-10px;top:-10px" title="إغلاق">${M.icon('close')}</div>
      <div class="deg-read" style="top:${H + 6}px">٠°</div>`;
    M.$('#overlays').appendChild(rulerEl);
    const read = rulerEl.querySelector('.deg-read');
    makeRotatable(rulerEl, {
      x: b.w / 2 - L / 2 + 15, y: b.h / 2, pivot: [15, H / 2], rotOffset: 0,
      onChange: (a) => { let d = ((-a % 360) + 360) % 360; read.textContent = M.fmt(d, 1) + '°'; },
    });
    rulerEl.querySelector('.x').onclick = () => M.tools.toggleRuler();
    M.emit('overlay-tools');
  };

  M.tools.toggleProtractor = function () {
    if (protEl) { protEl.remove(); protEl = null; M.emit('overlay-tools'); return; }
    const b = M.board;
    const R = Math.max(150, Math.min(240, b.unit * b.view.s * 5));
    const W = R * 2 + 20, H = R + 30;
    const cx = W / 2, cy = R + 10;
    const light = M.settings.theme === 'white';
    let g = '';
    for (let d = 0; d <= 180; d++) {
      const a = (d * Math.PI) / 180;
      const len = d % 10 === 0 ? 18 : d % 5 === 0 ? 12 : 7;
      const x1 = cx + R * Math.cos(a), y1 = cy - R * Math.sin(a);
      const x2 = cx + (R - len) * Math.cos(a), y2 = cy - (R - len) * Math.sin(a);
      g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      if (d % 10 === 0) {
        const tx = cx + (R - 30) * Math.cos(a), ty = cy - (R - 30) * Math.sin(a);
        const tx2 = cx + (R - 50) * Math.cos(a), ty2 = cy - (R - 50) * Math.sin(a);
        g += `<text x="${tx}" y="${ty + 4}">${M.loc(d)}</text>`;
        g += `<text x="${tx2}" y="${ty2 + 4}" class="in">${M.loc(180 - d)}</text>`;
      }
    }
    protEl = M.h('div', { class: 'measure-tool', style: { width: W + 'px', height: H + 'px' } });
    protEl.innerHTML = `
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
        <path d="M${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy} L ${cx + R} ${cy + 16} L ${cx - R} ${cy + 16} Z" fill="${light ? 'rgba(160,210,255,.55)' : 'rgba(150,205,255,.42)'}" stroke="rgba(40,90,150,.8)"/>
        <g stroke="#0f2c4d" stroke-width="1">${g}</g>
        <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="#0f2c4d" stroke-width="1.2"/>
        <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 22}" stroke="#c0262d" stroke-width="1.5"/>
        <circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="#c0262d" stroke-width="2"/>
        <style>text{font:700 11px Tajawal,sans-serif;fill:#0f2c4d;text-anchor:middle}text.in{font-size:9.5px;fill:#8a2330}</style>
      </svg>
      <div class="rot" style="left:${W - 20}px;top:${cy - 13}px" title="اسحب للتدوير">${M.icon('rotate')}</div>
      <div class="x" style="left:${10}px;top:${cy - 12}px" title="إغلاق">${M.icon('close')}</div>
      <div class="deg-read" style="top:${H + 4}px">٠°</div>`;
    M.$('#overlays').appendChild(protEl);
    const read = protEl.querySelector('.deg-read');
    makeRotatable(protEl, {
      x: b.w / 2, y: b.h / 2 + R / 2, pivot: [cx, cy], rotOffset: 0,
      onChange: (a) => { let d = ((-a % 360) + 360) % 360; read.textContent = 'دوران ' + M.fmt(d, 1) + '°'; },
    });
    protEl.querySelector('.x').onclick = () => M.tools.toggleProtractor();
    M.emit('overlay-tools');
  };
  M.tools.isOpen = (n) => (n === 'ruler' ? !!rulerEl : !!protEl);
})();
