/* ==========================================================================
   نافذة ثلاثية الأبعاد عائمة فوق السبورة (قابلة للسحب): تطوي الشبكة المرسومة
   إلى مجسم بحركة، مع منزلق للطي وتدوير تلقائي وإضافة صورة إلى السبورة
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;

  function open(opts) {
    const root = M.$('#overlays');
    const box = h('div', { class: 'f3d' });
    const head = h('div', { class: 'f3d-head' }, h('span', { class: 'f3d-title', html: icon('cube') + `<b>${opts.title || 'مجسم'}</b>` }));
    const closeB = h('button', { class: 'icon-btn sm', title: 'إغلاق', html: icon('close') });
    head.appendChild(closeB);
    const cv = h('canvas', { class: 'f3d-canvas' });
    const slider = h('input', { type: 'range', min: 0, max: 100, value: 0 });
    const playB = h('button', { class: 'btn sm teal', html: icon('play') + '<span>اطوِ</span>' });
    const rotB = h('button', { class: 'icon-btn sm', title: 'دوران تلقائي', html: icon('rotate') });
    const snapB = h('button', { class: 'icon-btn sm', title: 'صورة على السبورة', html: icon('image') });
    const ctrl = h('div', { class: 'f3d-ctrl' }, playB, h('span', { class: 'lbl' }, 'الطيّ'), slider, rotB, snapB);
    const info = h('div', { class: 'f3d-info', html: opts.info || '' });
    box.append(head, cv, ctrl, info);
    const B = M.board;
    box.style.left = Math.max(10, Math.min(B.w - 400, (opts.x != null ? opts.x : B.w * 0.08))) + 'px';
    box.style.top = Math.max(10, Math.min(B.h - 430, (opts.y != null ? opts.y : 70))) + 'px';
    root.appendChild(box);
    const v = new M.View3D(cv, { light: M.settings.theme === 'white', pitch: 0.7, yaw: -0.5 });
    let t = 0, anim = null;
    // إطار الكاميرا للشبكة المسطحة وللمجسم، ويُستوفى بينهما أثناء الطي
    const frame = (tt) => { v.setScene({ faces: opts.facesAt(tt), lines: [], labels: [] }, true); return { d: v.dist, tg: v.target.slice() }; };
    const f0 = frame(0), f1 = frame(1);
    f1.d *= 1.15;
    const show = () => {
      const faces = opts.facesAt(t);
      const k = t * t * (3 - 2 * t);
      v.dist = f0.d + (f1.d - f0.d) * k;
      v.target = f0.tg.map((q, i) => q + (f1.tg[i] - q) * k);
      v.setScene({ faces, lines: [], labels: [] }, false);
      slider.value = Math.round(t * 100);
    };
    const play = () => {
      cancelAnimationFrame(anim);
      const from = t, to = t > 0.5 ? 0 : 1, t0 = performance.now(), dur = 2400;
      const step = (now) => {
        const u = Math.min(1, (now - t0) / dur), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
        t = from + (to - from) * e; show();
        if (u < 1 && box.isConnected) anim = requestAnimationFrame(step);
        else { playB.innerHTML = icon('play') + `<span>${t > 0.5 ? 'افتح' : 'اطوِ'}</span>`; if (t > 0.5 && opts.onFolded) opts.onFolded(); }
      };
      anim = requestAnimationFrame(step);
    };
    slider.oninput = () => { cancelAnimationFrame(anim); t = slider.value / 100; show(); };
    playB.onclick = play;
    rotB.onclick = () => { v.opts.autoRotate = !v.opts.autoRotate; rotB.classList.toggle('on', v.opts.autoRotate); v.request(); };
    snapB.onclick = () => { const url = v.toDataURL(); const img = new Image(); img.onload = () => { B.addImage(url, img.width / (v.dpr || 1), img.height / (v.dpr || 1)); M.toast('أُضيفت صورة المجسم إلى السبورة'); }; img.src = url; };
    closeB.onclick = () => { cancelAnimationFrame(anim); v.destroy(); box.remove(); };
    // السحب من الرأس
    let drag = null;
    head.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; head.setPointerCapture(e.pointerId); drag = [e.clientX - box.offsetLeft, e.clientY - box.offsetTop]; });
    head.addEventListener('pointermove', (e) => { if (!drag) return; box.style.left = e.clientX - drag[0] + 'px'; box.style.top = e.clientY - drag[1] + 'px'; });
    head.addEventListener('pointerup', () => (drag = null));
    box.addEventListener('pointerdown', (e) => e.stopPropagation());
    show();
    setTimeout(() => { if (opts.autoPlay !== false) play(); }, 350);
    return { box, view: v, close: () => closeB.click() };
  }

  M.float3d = { open };
})();
