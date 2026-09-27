/* ==========================================================================
   الاختيار العشوائي بالكاميرا: يكتشف وجوه الطلاب أمام الكاميرا ثم يختار
   أحدهم عشوائياً بحركة ممتعة. الكشف محلي بالكامل (مكتبة pico مضمّنة) —
   لا تُحفظ الصور ولا تُرسل إلى أي مكان، ولا يتعرف على هوية الأشخاص.
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;
  const { h, icon } = M;
  const L = (x) => M.loc(x);

  let classify = null;
  function cascade() {
    if (classify) return classify;
    if (!window.pico || !M.facefinderB64) return null;
    const bin = atob(M.facefinderB64), bytes = new Int8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    classify = window.pico.unpack_cascade(bytes);
    return classify;
  }

  /**
   * كشف الوجوه في إطار (صورة/فيديو/لوحة). يعيد [{x, y, s, score}] بإحداثيات المصدر
   */
  const work = document.createElement('canvas');
  function detect(src, opts) {
    opts = opts || {};
    const cls = cascade();
    if (!cls) return [];
    const sw = src.videoWidth || src.naturalWidth || src.width, sh = src.videoHeight || src.naturalHeight || src.height;
    if (!sw || !sh) return [];
    const k = Math.min(1, (opts.maxW || 640) / sw);
    const W = Math.round(sw * k), H = Math.round(sh * k);
    work.width = W; work.height = H;
    const c = work.getContext('2d', { willReadFrequently: true });
    c.drawImage(src, 0, 0, W, H);
    const rgba = c.getImageData(0, 0, W, H).data;
    const gray = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (2 * rgba[j] + 7 * rgba[j + 1] + rgba[j + 2]) / 10;
    const image = { pixels: gray, nrows: H, ncols: W, ldim: W };
    const params = { shiftfactor: 0.1, minsize: Math.max(20, Math.round(Math.min(W, H) * 0.05)), maxsize: 1000, scalefactor: 1.1 };
    let dets = window.pico.run_cascade(image, cls, params);
    if (opts.memory) dets = opts.memory(dets);
    dets = window.pico.cluster_detections(dets, 0.2);
    const found = dets.filter((d) => d[3] > (opts.threshold == null ? 50 : opts.threshold)).map((d) => ({ x: d[1] / k, y: d[0] / k, s: d[2] / k, score: d[3] })).sort((a, b) => b.score - a.score);
    // إزالة التكرار: كشف يقع مركزه داخل وجه أقوى منه
    const kept = [];
    found.forEach((f) => { if (!kept.some((q) => Math.hypot(q.x - f.x, q.y - f.y) < Math.max(q.s, f.s) * 0.75)) kept.push(f); });
    // كشف صغير جداً وضعيف مقارنة ببقية الوجوه غالباً خاطئ
    if (kept.length >= 2) {
      const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
      const ms = med(kept.map((f) => f.s)), msc = med(kept.map((f) => f.score));
      return kept.filter((f) => !(f.s < ms * 0.55 && f.score < msc * 0.6));
    }
    return kept;
  }

  /* ---------------- أصوات بسيطة (WebAudio) ---------------- */
  let actx = null;
  function beep(freq, dur, vol) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = freq; o.type = 'triangle';
      g.gain.setValueAtTime(vol || 0.08, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.08));
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + (dur || 0.08));
    } catch (e) { /* لا صوت */ }
  }

  /* ---------------- النافذة ---------------- */
  function open() {
    const wrap = h('div', { class: 'cam-picker' });
    const stage = h('div', { class: 'cam-stage' });
    const video = h('video', { playsinline: '', muted: '', autoplay: '' });
    video.muted = true;
    const ov = h('canvas', { class: 'cam-overlay' });
    const banner = h('div', { class: 'cam-banner' }, 'جارٍ تشغيل الكاميرا…');
    stage.append(video, ov, banner);
    const pickB = h('button', { class: 'btn primary cam-pick', html: icon('shuffle') + '<span>اختر طالباً عشوائياً 🎲</span>' });
    const count = h('div', { class: 'cam-count' }, 'الوجوه: —');
    const noRep = h('label', { class: 'cam-opt' }, h('input', { type: 'checkbox', checked: true }), h('span', {}, 'لا تكرر من اختير'));
    const resetB = h('button', { class: 'btn sm ghost', html: icon('reset') + '<span>ابدأ جولة جديدة</span>' });
    const wheelB = h('button', { class: 'btn sm ghost', html: icon('users') + '<span>عجلة الأسماء بدلاً من ذلك</span>' });
    const row = h('div', { class: 'row cam-row' }, pickB, count, noRep, resetB, wheelB);
    const note = h('div', { class: 'hint cam-note' }, '🔒 يعمل الكشف على هذا الجهاز فقط: لا تُحفظ الصور ولا تُرسل، ولا يتعرّف التطبيق على هوية أحد — يكتشف الوجوه فقط ليختار واحداً منها عشوائياً. اطلب من الطلاب النظر إلى الكاميرا.');
    wrap.append(stage, row, note);

    let stream = null, running = true, faces = [], chosenPts = [], picking = false, frozen = null, hl = -1, winner = null;
    const memory = window.pico ? window.pico.instantiate_detection_memory(5) : null;
    const m = M.modal({ title: 'الاختيار العشوائي بالكاميرا', icon: 'face', body: wrap, size: 'lg', onClose: stop });
    function stop() { running = false; if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; }
    wheelB.onclick = () => { m.close(); if (M.classroom && M.classroom.openPicker) M.classroom.openPicker(); };
    resetB.onclick = () => { chosenPts = []; winner = null; frozen = null; M.toast('بدأت جولة جديدة — الكل قد يُختار'); };

    if (!cascade()) { banner.textContent = 'تعذّر تحميل مكتبة كشف الوجوه'; return m; }
    const media = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    if (!media) { banner.innerHTML = 'هذا المتصفح لا يسمح بالوصول إلى الكاميرا هنا.<br>جرّب فتح التطبيق مباشرة في Chrome أو Edge.'; pickB.disabled = true; return m; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then((s) => {
      stream = s; video.srcObject = s;
      video.play().catch(() => {});
      banner.textContent = '';
      loop();
    }).catch((e) => {
      banner.innerHTML = `لم يُسمح بالوصول إلى الكاميرا (${M.esc(e.name || '')}).<br>اسمح للمتصفح باستخدام الكاميرا ثم أعد المحاولة، أو استخدم عجلة الأسماء.`;
      pickB.disabled = true;
    });

    const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < Math.max(a.s, b.s) * 0.6;
    let lastDetect = 0;
    function loop() {
      if (!running) return;
      const now = performance.now();
      if (!frozen && video.readyState >= 2 && now - lastDetect > 110) {
        lastDetect = now;
        const d = detect(video, { memory, maxW: 640, threshold: 15 });
        // تتبع بسيط لتثبيت الإطارات
        faces = d.map((f) => { const old = faces.find((o) => near(o, f)); return old ? { x: old.x * 0.5 + f.x * 0.5, y: old.y * 0.5 + f.y * 0.5, s: old.s * 0.5 + f.s * 0.5, score: f.score } : f; }).sort((a, b) => a.x - b.x);
        count.textContent = `الوجوه: ${L(faces.length)}`;
        if (!picking && !winner) banner.textContent = faces.length ? '' : 'لا أرى وجوهاً بعد — اقتربوا وانظروا إلى الكاميرا 👀';
      }
      paint();
      requestAnimationFrame(loop);
    }
    function paint() {
      const r = stage.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (ov.width !== Math.round(r.width * dpr)) { ov.width = Math.round(r.width * dpr); ov.height = Math.round(r.height * dpr); }
      const c = ov.getContext('2d');
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, r.width, r.height);
      const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
      // مطابقة object-fit: cover مع انعكاس المرآة
      const k = Math.max(r.width / vw, r.height / vh), ox = (r.width - vw * k) / 2, oy = (r.height - vh * k) / 2;
      const X = (x) => r.width - (ox + x * k), Y = (y) => oy + y * k;
      if (frozen) c.drawImage(frozen, 0, 0, r.width, r.height);
      const list = winner ? [winner] : faces;
      list.forEach((f, i) => {
        const cx = X(f.x), cy = Y(f.y), rad = (f.s * k) / 2;
        const isHL = picking ? i === hl : !!winner;
        const done = !winner && chosenPts.some((p) => near(p, f));
        c.lineWidth = isHL ? 5 : 2.5;
        c.strokeStyle = isHL ? '#f2b134' : done ? 'rgba(255,255,255,.35)' : '#38c9b4';
        c.beginPath(); c.arc(cx, cy, rad * 1.05, 0, Math.PI * 2); c.stroke();
        if (done) { c.font = `bold ${Math.max(14, rad * 0.4)}px ${M.fontFamily()}`; c.fillStyle = 'rgba(255,255,255,.8)'; c.textAlign = 'center'; c.fillText('✓', cx, cy - rad * 1.2); }
      });
      if (winner) {
        const cx = X(winner.x), cy = Y(winner.y), rad = (winner.s * k) / 2 * 1.35;
        c.save(); c.fillStyle = 'rgba(0,0,0,.62)'; c.beginPath(); c.rect(0, 0, r.width, r.height); c.arc(cx, cy, rad, 0, Math.PI * 2, true); c.fill('evenodd'); c.restore();
        c.lineWidth = 6; c.strokeStyle = '#f2b134'; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.stroke();
        c.font = `${Math.max(28, rad * 0.8)}px serif`; c.textAlign = 'center'; c.fillText('👑', cx, cy - rad - 8);
        confetti.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.12; c.fillStyle = p.c; c.fillRect(p.x, p.y, 6, 10); });
      }
    }
    let confetti = [];
    pickB.onclick = () => {
      if (picking) return;
      if (winner) { winner = null; frozen = null; banner.textContent = ''; }
      let pool = faces.map((f, i) => i);
      if (noRep.querySelector('input').checked) pool = pool.filter((i) => !chosenPts.some((p) => near(p, faces[i])));
      if (!faces.length) { M.toast('لا توجد وجوه أمام الكاميرا — اقتربوا وانظروا إليها', { type: 'warn' }); return; }
      if (!pool.length) { chosenPts = []; pool = faces.map((f, i) => i); M.toast('اختير الجميع في هذه الجولة — نبدأ جولة جديدة 🔄'); }
      picking = true;
      banner.textContent = '';
      const final = pool[Math.floor(Math.random() * pool.length)];
      // ترتيب القفز بين الوجوه ثم التباطؤ حتى الفائز
      const seq = [];
      const steps = 16 + Math.floor(Math.random() * 6);
      for (let s = 0; s < steps; s++) seq.push(pool[s % pool.length]);
      seq.push(final);
      let s = 0, delay = 70;
      const tick = () => {
        hl = faces.indexOf(faces[seq[s]]) >= 0 ? seq[s] : final;
        beep(520 + (s % 4) * 90, 0.05, 0.05);
        s++;
        if (s < seq.length && running) { delay *= 1.12; setTimeout(tick, delay); }
        else {
          picking = false;
          winner = Object.assign({}, faces[final] || faces[0]);
          chosenPts.push(winner);
          // تجميد اللقطة
          const r = stage.getBoundingClientRect();
          frozen = document.createElement('canvas'); frozen.width = r.width; frozen.height = r.height;
          const fc = frozen.getContext('2d'); const vw = video.videoWidth, vh = video.videoHeight, k = Math.max(r.width / vw, r.height / vh);
          fc.translate(r.width, 0); fc.scale(-1, 1); fc.drawImage(video, (r.width - vw * k) / 2, (r.height - vh * k) / 2, vw * k, vh * k);
          confetti = Array.from({ length: 90 }, () => ({ x: r.width / 2, y: r.height / 3, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 9 - 2, c: M.pick(['#f2b134', '#38c9b4', '#ef6b6b', '#6aa9ff', '#b28dff']) }));
          [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f, 0.18, 0.09), i * 120));
          banner.innerHTML = '🎉 <b>أنت المختار!</b> تفضّل بالإجابة';
          pickB.querySelector('span').textContent = 'اختر طالباً آخر 🎲';
        }
      };
      tick();
    };
    return m;
  }

  M.cameraPicker = { open, detect };
})();
