/* ==========================================================================
   راسم الدوال: مستوى إحداثي تفاعلي بتسميات عربية، تكبير وتحريك وتتبّع
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;

  class Plot {
    constructor(canvas, opts) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({ interactive: true, trace: true }, opts || {});
      this.cx = 0; this.cy = 0; this.scale = 32; // بكسل لكل وحدة
      this.fns = []; this.points = []; this.segments = []; this.polys = [];
      this.hover = null;
      if (this.opts.interactive) this.bind();
      this.ro = new ResizeObserver(() => this.draw());
      this.ro.observe(canvas);
    }
    get w() { return this.cv.clientWidth; }
    get h() { return this.cv.clientHeight; }
    X(x) { return this.w / 2 + (x - this.cx) * this.scale; }
    Y(y) { return this.h / 2 - (y - this.cy) * this.scale; }
    ix(px) { return (px - this.w / 2) / this.scale + this.cx; }
    iy(py) { return -(py - this.h / 2) / this.scale + this.cy; }
    setView(xmin, xmax, ymin, ymax) {
      this.cx = (xmin + xmax) / 2; this.cy = (ymin + ymax) / 2;
      this.scale = Math.min(this.w / (xmax - xmin), this.h / (ymax - ymin)) || 32;
      this.draw();
    }
    bind() {
      const c = this.cv;
      let drag = null;
      const pts = new Map();
      let pinch = null;
      c.addEventListener('pointerdown', (e) => {
        c.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, [e.offsetX, e.offsetY]);
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); drag = null; return; }
        drag = { x: e.offsetX, y: e.offsetY, cx: this.cx, cy: this.cy };
        if (this.opts.onDown) this.opts.onDown(this.ix(e.offsetX), this.iy(e.offsetY), e);
      });
      c.addEventListener('pointermove', (e) => {
        if (pts.has(e.pointerId)) pts.set(e.pointerId, [e.offsetX, e.offsetY]);
        if (pinch && pts.size === 2) {
          const [a, b] = [...pts.values()];
          const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          this.scale = M.clamp(this.scale * (d / pinch), 2, 2000); pinch = d; this.draw(); return;
        }
        this.hover = [e.offsetX, e.offsetY];
        if (drag && !(this.opts.onDrag && this.opts.onDrag(this.ix(e.offsetX), this.iy(e.offsetY), e))) {
          this.cx = drag.cx - (e.offsetX - drag.x) / this.scale;
          this.cy = drag.cy + (e.offsetY - drag.y) / this.scale;
        }
        this.draw();
      });
      const up = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; drag = null; if (this.opts.onUp) this.opts.onUp(); };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('pointerleave', () => { this.hover = null; this.draw(); });
      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const f = Math.exp(-e.deltaY * 0.0015);
        const mx = this.ix(e.offsetX), my = this.iy(e.offsetY);
        this.scale = M.clamp(this.scale * f, 2, 2000);
        this.cx = mx - (e.offsetX - this.w / 2) / this.scale;
        this.cy = my + (e.offsetY - this.h / 2) / this.scale;
        this.draw();
      }, { passive: false });
    }
    zoom(f) { this.scale = M.clamp(this.scale * f, 2, 2000); this.draw(); }
    theme() {
      const light = M.settings.theme === 'white';
      return {
        bg: light ? '#ffffff' : '#0f1822',
        minor: light ? 'rgba(20,40,80,.07)' : 'rgba(255,255,255,.05)',
        major: light ? 'rgba(20,40,80,.16)' : 'rgba(255,255,255,.12)',
        axis: light ? '#2b3a4d' : '#c9d4df',
        text: light ? '#44546a' : '#9fb0c2',
        light,
      };
    }
    niceStep() {
      const target = 60 / this.scale;
      const p = Math.pow(10, Math.floor(Math.log10(target)));
      const n = target / p;
      return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
    }
    draw(ctxOverride, wOverride, hOverride) {
      const dpr = window.devicePixelRatio || 1;
      const w = wOverride || this.w, h = hOverride || this.h;
      if (!w || !h) return;
      let ctx = ctxOverride;
      if (!ctx) {
        if (this.cv.width !== Math.round(w * dpr) || this.cv.height !== Math.round(h * dpr)) {
          this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
        }
        ctx = this.ctx;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const T = this.theme();
      ctx.fillStyle = T.bg; ctx.fillRect(0, 0, w, h);
      const step = this.niceStep();
      const x0 = this.ix(0), x1 = this.ix(w), y0 = this.iy(h), y1 = this.iy(0);
      // الشبكة
      ctx.lineWidth = 1;
      const minor = step / 5;
      if (minor * this.scale > 7) {
        ctx.strokeStyle = T.minor;
        ctx.beginPath();
        for (let x = Math.ceil(x0 / minor) * minor; x <= x1; x += minor) { const px = Math.round(this.X(x)) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, h); }
        for (let y = Math.ceil(y0 / minor) * minor; y <= y1; y += minor) { const py = Math.round(this.Y(y)) + 0.5; ctx.moveTo(0, py); ctx.lineTo(w, py); }
        ctx.stroke();
      }
      ctx.strokeStyle = T.major;
      ctx.beginPath();
      for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { const px = Math.round(this.X(x)) + 0.5; ctx.moveTo(px, 0); ctx.lineTo(px, h); }
      for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const py = Math.round(this.Y(y)) + 0.5; ctx.moveTo(0, py); ctx.lineTo(w, py); }
      ctx.stroke();
      // المحاور
      const ax = M.clamp(this.Y(0), 0, h), ay = M.clamp(this.X(0), 0, w);
      ctx.strokeStyle = T.axis; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, ax); ctx.lineTo(w, ax); ctx.moveTo(ay, 0); ctx.lineTo(ay, h); ctx.stroke();
      ctx.fillStyle = T.text; ctx.font = `11px ${M.fontFamily()}`;
      const dec = Math.max(0, -Math.floor(Math.log10(step)));
      const lbl = (v) => M.loc(parseFloat(v.toFixed(dec + 1)).toString());
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
        if (Math.abs(x) < step / 2) continue;
        const px = this.X(x);
        ctx.fillText(lbl(x), px, Math.min(h - 14, ax + 4));
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
        if (Math.abs(y) < step / 2) continue;
        const py = this.Y(y);
        ctx.fillText(lbl(y), Math.max(24, ay - 5), py);
      }
      ctx.font = `bold 13px ${M.fontFamily()}`; ctx.fillStyle = T.axis;
      ctx.textAlign = 'left'; ctx.fillText(M.varName('x'), w - 16, ax - 10);
      ctx.textAlign = 'center'; ctx.fillText(M.varName('y'), ay + 12, 10);

      // مضلعات
      this.polys.forEach((p) => {
        ctx.save();
        ctx.fillStyle = p.color; ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.globalAlpha = 0.2;
        ctx.beginPath(); p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(this.X(x), this.Y(y)) : ctx.moveTo(this.X(x), this.Y(y)))); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1; ctx.stroke();
        ctx.restore();
      });
      // الدوال
      this.fns.forEach((fobj) => this.drawFn(ctx, fobj, w, h));
      // قطع
      this.segments.forEach((s) => {
        ctx.save(); ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; if (s.dash) ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(this.X(s.x1), this.Y(s.y1)); ctx.lineTo(this.X(s.x2), this.Y(s.y2)); ctx.stroke(); ctx.restore();
      });
      // نقاط
      this.points.forEach((p) => {
        const px = this.X(p.x), py = this.Y(p.y);
        if (px < -20 || px > w + 20 || py < -20 || py > h + 20) return;
        ctx.save();
        ctx.fillStyle = p.color || '#ffd166';
        ctx.strokeStyle = T.bg; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, p.r || 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (p.label) {
          ctx.font = `bold 12px ${M.fontFamily()}`; ctx.direction = 'rtl'; ctx.textAlign = 'center';
          const tw = ctx.measureText(p.label).width + 10;
          ctx.fillStyle = T.light ? 'rgba(255,255,255,.92)' : 'rgba(10,18,26,.85)';
          M.roundRect(ctx, px - tw / 2, py - 30, tw, 20, 6); ctx.fill();
          ctx.fillStyle = p.color || T.axis; ctx.textBaseline = 'middle';
          ctx.fillText(p.label, px, py - 20);
        }
        ctx.restore();
      });
      // التتبع
      if (this.opts.trace && this.hover && this.fns.length && !ctxOverride) {
        const [hx] = this.hover;
        const xv = this.ix(hx);
        let best = null;
        this.fns.forEach((fo) => {
          if (fo.hidden) return;
          const yv = fo.f(xv);
          if (!Number.isFinite(yv)) return;
          const py = this.Y(yv);
          const d = Math.abs(py - this.hover[1]);
          if (!best || d < best.d) best = { d, yv, py, color: fo.color };
        });
        if (best && best.d < 80) {
          ctx.save();
          ctx.strokeStyle = best.color; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(hx, ax); ctx.lineTo(hx, best.py); ctx.stroke();
          ctx.setLineDash([]); ctx.fillStyle = best.color;
          ctx.beginPath(); ctx.arc(hx, best.py, 5, 0, Math.PI * 2); ctx.fill();
          const txt = M.pointStr(xv, best.yv);
          ctx.font = `bold 12px ${M.fontFamily()}`;
          const tw = ctx.measureText(txt).width + 12;
          const bx = M.clamp(hx - tw / 2, 4, w - tw - 4), by = best.py < 40 ? best.py + 12 : best.py - 32;
          ctx.fillStyle = T.light ? 'rgba(255,255,255,.95)' : 'rgba(10,18,26,.9)';
          M.roundRect(ctx, bx, by, tw, 22, 6); ctx.fill();
          ctx.strokeStyle = best.color; ctx.stroke();
          ctx.fillStyle = T.axis; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'rtl';
          ctx.fillText(txt, bx + tw / 2, by + 11);
          ctx.restore();
        }
      }
      if (this.opts.after) this.opts.after(ctx, this, w, h);
    }
    drawFn(ctx, fo, w, h) {
      if (fo.hidden) return;
      ctx.save();
      ctx.strokeStyle = fo.color; ctx.lineWidth = fo.width || 2.5; ctx.lineJoin = 'round';
      if (fo.dash) ctx.setLineDash([7, 6]);
      if (fo.shade) {
        // تظليل المتباينة
        ctx.fillStyle = fo.color; ctx.globalAlpha = 0.14;
        ctx.beginPath();
        for (let px = 0; px <= w; px += 2) {
          const y = fo.f(this.ix(px));
          const py = Number.isFinite(y) ? M.clamp(this.Y(y), -10, h + 10) : (fo.shade === 'above' ? -10 : h + 10);
          px ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.lineTo(w, fo.shade === 'above' ? -10 : h + 10); ctx.lineTo(0, fo.shade === 'above' ? -10 : h + 10); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.beginPath();
      let pen = false, lastY = null;
      for (let px = 0; px <= w; px += 1) {
        const y = fo.f(this.ix(px));
        if (!Number.isFinite(y)) { pen = false; continue; }
        const py = this.Y(y);
        if (pen && lastY != null && Math.abs(py - lastY) > h * 1.5) pen = false; // انقطاع
        if (py < -h * 3 || py > h * 4) { pen = false; lastY = py; continue; }
        if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        pen = true; lastY = py;
      }
      ctx.stroke();
      ctx.restore();
    }
    toDataURL(w, h) {
      w = w || this.w; h = h || this.h;
      const cv = document.createElement('canvas');
      cv.width = w * 2; cv.height = h * 2;
      const ctx = cv.getContext('2d');
      ctx.scale(2, 2);
      const save = this.hover; this.hover = null;
      this.draw(ctx, w, h);
      this.hover = save;
      return cv.toDataURL('image/png');
    }
  }
  M.Plot = Plot;
})();
