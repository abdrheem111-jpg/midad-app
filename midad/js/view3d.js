/* ==========================================================================
   محرك عرض ثلاثي الأبعاد خفيف (Canvas 2D) — دون مكتبات خارجية
   - كاميرا مدارية: سحب للتدوير، عجلة/قرص بإصبعين للتكبير، نقر مزدوج لإعادة الضبط
   - أوجه مظلّلة مرتبة بالعمق، حواف، تسميات، محاور، شفافية
   المشهد: { faces:[{p:[[x,y,z]...], color, alpha?, edge?, twoSided?}], lines:[{a,b,color,width,dash?}], labels:[{p,text,color?,size?}] }
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

  function hexToRgb(c) {
    if (Array.isArray(c)) return c;
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c || '#38c9b4');
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [56, 201, 180];
  }

  class View3D {
    constructor(canvas, opts) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({ yaw: -0.65, pitch: 0.42, dist: 9, fov: 1.1, target: [0, 0, 0], axes: false, bg: null, autoRotate: false }, opts || {});
      this.reset();
      this.scene = { faces: [], lines: [], labels: [] };
      this.light = norm([0.45, 0.85, 0.6]);
      this._bind();
      this._raf = null;
      this.resize();
      if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(canvas); }
    }
    reset() { const o = this.opts; this.yaw = o.yaw; this.pitch = o.pitch; this.dist = o.dist; this.target = o.target.slice(); this.request(); }
    setScene(scene, fit) {
      this.scene = Object.assign({ faces: [], lines: [], labels: [] }, scene);
      if (fit) this.fit();
      this.request();
    }
    /** ضبط المسافة والهدف لاحتواء المشهد */
    fit() {
      const pts = [];
      this.scene.faces.forEach((f) => pts.push(...f.p));
      this.scene.lines.forEach((l) => pts.push(l.a, l.b));
      if (!pts.length) return;
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      pts.forEach((p) => { for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); } });
      this.target = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
      const r = Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2 || 1;
      this.dist = (r / Math.sin(this.opts.fov / 2)) * 1.05;
      this.opts.dist = this.dist; this.opts.target = this.target.slice();
      this.request();
    }
    resize() {
      const r = this.cv.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(50, Math.round(r.width)), h = Math.max(50, Math.round(r.height));
      if (this.cv.width !== w * dpr || this.cv.height !== h * dpr) { this.cv.width = w * dpr; this.cv.height = h * dpr; }
      this.w = w; this.h = h; this.dpr = dpr;
      this.request();
    }
    request() { if (!this._raf) this._raf = requestAnimationFrame(() => { this._raf = null; this.draw(); }); }

    /* ---------- التحويل ---------- */
    _cam() {
      const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      return { cy, sy, cp, sp };
    }
    toCam(p, c) {
      const x = p[0] - this.target[0], y = p[1] - this.target[1], z = p[2] - this.target[2];
      // دوران حول ص ثم حول س
      const x1 = c.cy * x - c.sy * z, z1 = c.sy * x + c.cy * z;
      // ميل موجب = النظر من الأعلى
      const y2 = c.cp * y + c.sp * z1, z2 = -c.sp * y + c.cp * z1;
      return [x1, y2, z2 + this.dist];
    }
    project(q) {
      const f = (Math.min(this.w, this.h) / 2) / Math.tan(this.opts.fov / 2);
      const z = Math.max(0.05, q[2]);
      return [this.w / 2 + (f * q[0]) / z, this.h / 2 - (f * q[1]) / z];
    }

    draw() {
      const { ctx, w, h, dpr } = this;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (this.opts.bg) { ctx.fillStyle = this.opts.bg; ctx.fillRect(0, 0, w, h); }
      const c = this._cam();
      const items = [];
      const light = this.light;
      // الأوجه
      for (const f of this.scene.faces) {
        const cam = f.p.map((p) => this.toCam(p, c));
        if (cam.some((q) => q[2] < 0.1)) continue;
        const n = f.p.length >= 3 ? norm(cross(sub(f.p[1], f.p[0]), sub(f.p[2], f.p[0]))) : [0, 1, 0];
        const nc = f.p.length >= 3 ? cross(sub(cam[1], cam[0]), sub(cam[2], cam[0])) : [0, 0, -1];
        const facing = dot(nc, cam[0]) < 0; // الوجه يواجه الكاميرا
        let li = dot(n, light); if (!facing) li = -li;
        const shade = 0.42 + 0.58 * Math.max(0, li);
        const depth = cam.reduce((s, q) => s + q[2], 0) / cam.length;
        items.push({ k: 'f', f, s: cam.map((q) => this.project(q)), depth, shade, facing });
      }
      for (const l of this.scene.lines || []) {
        const a = this.toCam(l.a, c), b = this.toCam(l.b, c);
        if (a[2] < 0.1 || b[2] < 0.1) continue;
        items.push({ k: 'l', l, s: [this.project(a), this.project(b)], depth: (a[2] + b[2]) / 2 - (l.front ? 1e3 : 0.001) });
      }
      items.sort((a, b) => b.depth - a.depth);
      const dark = !this.opts.light;
      for (const it of items) {
        if (it.k === 'f') {
          const f = it.f, [r, g, b] = hexToRgb(f.color);
          const sh = it.shade;
          ctx.beginPath();
          it.s.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          const a = f.alpha == null ? 1 : f.alpha;
          ctx.fillStyle = `rgba(${Math.round(r * sh)},${Math.round(g * sh)},${Math.round(b * sh)},${a})`;
          ctx.fill();
          if (f.edge !== false) {
            ctx.strokeStyle = f.edgeColor || (dark ? 'rgba(255,255,255,.55)' : 'rgba(20,30,45,.55)');
            ctx.lineWidth = f.edgeWidth || 1.2;
            ctx.stroke();
          } else if (a >= 1) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.6; ctx.stroke(); }
        } else {
          const l = it.l;
          ctx.strokeStyle = l.color || (dark ? '#fff' : '#223');
          ctx.lineWidth = l.width || 1.5;
          ctx.setLineDash(l.dash ? [5, 4] : []);
          ctx.beginPath(); ctx.moveTo(it.s[0][0], it.s[0][1]); ctx.lineTo(it.s[1][0], it.s[1][1]); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      // التسميات فوق كل شيء
      for (const lb of this.scene.labels || []) {
        const q = this.toCam(lb.p, c);
        if (q[2] < 0.1) continue;
        const [x, y] = this.project(q);
        ctx.font = `bold ${lb.size || 14}px ${M.fontFamily ? M.fontFamily() : 'sans-serif'}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const txt = M.loc(lb.text);
        const tw = ctx.measureText(txt).width;
        if (lb.bgc !== false) { ctx.fillStyle = dark ? 'rgba(10,18,26,.72)' : 'rgba(255,255,255,.85)'; M.roundRect ? (M.roundRect(ctx, x - tw / 2 - 5, y - 10, tw + 10, 20, 6), ctx.fill()) : ctx.fillRect(x - tw / 2 - 5, y - 10, tw + 10, 20); }
        ctx.fillStyle = lb.color || (dark ? '#fff' : '#123');
        ctx.fillText(txt, x, y + 1);
      }
      if (this.opts.autoRotate && !this._drag) { this.yaw += 0.006; this.request(); }
    }

    /* ---------- التفاعل ---------- */
    _bind() {
      const cv = this.cv;
      const pts = new Map();
      let last = null, pinch = null;
      cv.style.touchAction = 'none';
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; this._drag = true; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), dist: this.dist }; } });
      cv.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); this.dist = M.clamp(pinch.dist * (pinch.d / d), 1, 400); this.request(); return; }
        if (!last) return;
        const dx = e.clientX - last[0], dy = e.clientY - last[1];
        last = [e.clientX, e.clientY];
        this.yaw -= dx * 0.01;
        this.pitch = M.clamp(this.pitch + dy * 0.01, -1.5, 1.5);
        this.request();
        if (this.onchange) this.onchange();
      });
      const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) { last = null; this._drag = false; this.request(); } };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', (e) => { e.preventDefault(); this.dist = M.clamp(this.dist * Math.exp(e.deltaY * 0.0012), 1, 400); this.request(); }, { passive: false });
      cv.addEventListener('dblclick', () => this.reset());
    }
    destroy() { if (this._ro) this._ro.disconnect(); cancelAnimationFrame(this._raf); this.opts.autoRotate = false; }
    toDataURL() { this.draw(); return this.cv.toDataURL('image/png'); }
  }

  /* ---------- أدوات بناء المشاهد ---------- */
  const G3 = {
    /** محاور س ص ع */
    axes(len, dark) {
      const c = dark === false ? '#334' : 'rgba(255,255,255,.75)';
      const L = len || 5;
      return {
        lines: [{ a: [-L, 0, 0], b: [L, 0, 0], color: '#ef6b6b', width: 1.6 }, { a: [0, 0, -L], b: [0, 0, L], color: '#5fd08a', width: 1.6 }, { a: [0, -L, 0], b: [0, L, 0], color: '#6aa9ff', width: 1.6 }],
        labels: [{ p: [L + 0.4, 0, 0], text: M.varName('x'), color: '#ef6b6b', bgc: false }, { p: [0, 0, L + 0.4], text: M.varName('y'), color: '#5fd08a', bgc: false }, { p: [0, L + 0.4, 0], text: 'ع', color: '#6aa9ff', bgc: false }],
        _c: c,
      };
    },
    merge(...scenes) {
      const out = { faces: [], lines: [], labels: [] };
      scenes.filter(Boolean).forEach((s) => { out.faces.push(...(s.faces || [])); out.lines.push(...(s.lines || [])); out.labels.push(...(s.labels || [])); });
      return out;
    },
    /** سطح ع = د(س، ص): الإحداثي الرأسي في المحرك هو المحور y */
    surface(f, R, n, zClamp) {
      n = n || 36; R = R || 4; zClamp = zClamp || 12;
      const grid = [];
      let zmin = Infinity, zmax = -Infinity;
      for (let i = 0; i <= n; i++) {
        grid.push([]);
        for (let j = 0; j <= n; j++) {
          const x = -R + (2 * R * i) / n, y = -R + (2 * R * j) / n;
          let z; try { z = f(x, y); } catch (e) { z = NaN; }
          if (!Number.isFinite(z)) z = NaN; else z = M.clamp(z, -zClamp, zClamp);
          grid[i].push(z);
          if (Number.isFinite(z)) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
        }
      }
      const faces = [];
      const span = zmax - zmin || 1;
      const col = (z) => { // تدرّج لوني من الأزرق إلى الأصفر
        const t = (z - zmin) / span;
        const stops = [[48, 99, 190], [56, 201, 180], [242, 177, 52], [239, 107, 107]];
        const k = Math.min(stops.length - 2, Math.floor(t * (stops.length - 1))), u = t * (stops.length - 1) - k;
        return stops[k].map((v, q) => Math.round(v + (stops[k + 1][q] - v) * u));
      };
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const zs = [grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]];
        if (zs.some((z) => Number.isNaN(z))) continue;
        const x0 = -R + (2 * R * i) / n, x1 = -R + (2 * R * (i + 1)) / n, y0 = -R + (2 * R * j) / n, y1 = -R + (2 * R * (j + 1)) / n;
        faces.push({ p: [[x0, zs[0], y0], [x1, zs[1], y0], [x1, zs[2], y1], [x0, zs[3], y1]], color: col((zs[0] + zs[1] + zs[2] + zs[3]) / 4), edge: n <= 24, edgeColor: 'rgba(0,0,0,.18)', edgeWidth: 0.5 });
      }
      return { faces, zmin, zmax };
    },
  };

  M.View3D = View3D;
  M.G3 = G3;
  M.v3 = { sub, cross, dot, norm };
})();
