/* ==========================================================================
   السبورة التفاعلية: رسم متجهي، أشكال، تعرّف ذكي على الأشكال، قياس،
   صفحات متعددة، تكبير وتحريك، تحديد وتحرير، تراجع وإعادة، حفظ وتصدير
   ========================================================================== */
(function () {
  'use strict';
  const M = window.M;

  const PALETTES = {
    dark: ['#f4f1e8', '#ffd166', '#ff7b9c', '#6cc5ff', '#7ee081', '#ff9f43', '#b79cff', '#ff5d5d'],
    light: ['#1b2330', '#c98a00', '#d6336c', '#1f6feb', '#2a9d55', '#e36414', '#7b2cbf', '#d62828'],
  };
  const BG_COLORS = { chalk: '#1d3830', night: '#0f1a2b', white: '#fbfaf6' };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  function distToSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    return dist(px, py, ax + t * dx, ay + t * dy);
  }
  function pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // تبسيط المسار (رامر–دوغلاس–بيوكر)
  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    let dmax = 0, idx = 0;
    const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distToSeg(pts[i][0], pts[i][1], ax, ay, bx, by);
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax > eps) {
      const l = rdp(pts.slice(0, idx + 1), eps), r = rdp(pts.slice(idx), eps);
      return l.slice(0, -1).concat(r);
    }
    return [pts[0], pts[pts.length - 1]];
  }

  const measureCtx = document.createElement('canvas').getContext('2d');

  /* ---------- الدوال المرسومة على المستوى الإحداثي ---------- */
  const fnCache = new WeakMap();
  /** دالة ص = د(س) بالإحداثيات الرياضية من كائن fn */
  function fnOf(o) {
    let c = fnCache.get(o);
    if (!c || c.expr !== o.expr) {
      let ast = null;
      try { ast = M.math.parse(String(o.expr).replace(/^\s*(ص|y)\s*=\s*/, '')); } catch (e) { ast = null; }
      c = { expr: o.expr, f: ast ? (x) => { try { return M.math.evaluate(ast, { x }, 'rad'); } catch (e) { return NaN; } } : () => NaN };
      fnCache.set(o, c);
    }
    return c.f;
  }
  /** نقاط منحنى fn (بإحداثيات العالم) بين wx0 و wx1 */
  function fnPoints(o, u, wx0, wx1, step) {
    if (o.vline != null) return [[[o.vline * u, -1e5], [o.vline * u, 1e5]]];
    const f = fnOf(o), segs = [];
    let seg = [], prev = null;
    const lo = o.domain ? Math.max(wx0, o.domain[0] * u) : wx0, hi = o.domain ? Math.min(wx1, o.domain[1] * u) : wx1;
    for (let wx = lo; wx <= hi + step / 2; wx += step) {
      const y = f(wx / u), wy = -y * u;
      if (!Number.isFinite(y) || Math.abs(wy) > 1e5 || (prev != null && Math.abs(wy - prev) > 4000)) { if (seg.length > 1) segs.push(seg); seg = []; prev = Number.isFinite(y) ? wy : null; if (Number.isFinite(y) && Math.abs(wy) <= 1e5) seg.push([wx, wy]); continue; }
      seg.push([wx, wy]); prev = wy;
    }
    if (seg.length > 1) segs.push(seg);
    return segs;
  }
  M.fnOf = fnOf;

  class Board {
    constructor(canvas, wrap) {
      this.canvas = canvas;
      this.wrap = wrap;
      this.ctx = canvas.getContext('2d');
      this.view = { x: 0, y: 0, s: 1 };
      this.tool = 'pen';
      this.color = 'c0';
      this.width = 3;
      this.fill = false;
      this.dash = false;
      this.snap = false;
      this.sides = 6;
      this.pages = [this.newPage()];
      this.pi = 0;
      this.selected = new Set();
      this.images = {};
      this.laser = [];
      this.pointers = new Map();
      this.extra = new Map(); // الكتابة الجماعية: مؤشرات إضافية يرسم كل منها خطه
      this.primaryId = null;
      this.ptype = new Map();
      this.penDown = 0;
      this.dirty = true;
      this.angleClicks = [];
      this.load();
      this.bind();
      this.resize();
      const loop = () => { if (this.dirty || this.laser.length) this.render(); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      new ResizeObserver(() => this.resize()).observe(wrap);
      M.on('settings', () => this.requestRender());
    }

    newPage(bg) { return { id: uid(), objects: [], bg: bg || 'grid', undo: [], redo: [] }; }
    get page() { return this.pages[this.pi]; }
    get objects() { return this.page.objects; }
    get unit() { return M.settings.unit || 40; }
    get isLight() { return M.settings.theme === 'white'; }
    palette() { return this.isLight ? PALETTES.light : PALETTES.dark; }
    colorOf(tok) {
      if (!tok) return this.palette()[0];
      if (tok[0] === 'c' && tok.length === 2) return this.palette()[+tok[1]] || this.palette()[0];
      return tok;
    }
    requestRender() { this.dirty = true; }

    /* ---------- الإحداثيات ---------- */
    toWorld(sx, sy) { return [(sx - this.view.x) / this.view.s, (sy - this.view.y) / this.view.s]; }
    toScreen(wx, wy) { return [wx * this.view.s + this.view.x, wy * this.view.s + this.view.y]; }
    evPos(e) {
      const r = this.canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    snapPt(p) {
      if (!this.snap) return p;
      const g = this.unit / 2;
      return [Math.round(p[0] / g) * g, Math.round(p[1] / g) * g];
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.wrap.clientWidth, h = this.wrap.clientHeight;
      if (!w || !h) return;
      const first = !this.w;
      this.w = w; this.h = h; this.dpr = dpr;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      if (first && !this._viewLoaded) { this.view.x = w / 2; this.view.y = h / 2; }
      this.requestRender();
    }

    /* ---------- الأحداث ---------- */
    bind() {
      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => this.onDown(e));
      c.addEventListener('pointermove', (e) => this.onMove(e));
      c.addEventListener('pointerup', (e) => this.onUp(e));
      c.addEventListener('pointercancel', (e) => this.onUp(e));
      c.addEventListener('pointerleave', () => { this.hover = null; this.requestRender(); });
      // إن لم يصل رفع القلم إلى السبورة (فشل الالتقاط في بعض برامج التشغيل) نلتقطه من النافذة
      const lost = (e) => { if (e.target !== c && this.pointers.has(e.pointerId)) this.onUp(e); };
      window.addEventListener('pointerup', lost, true);
      window.addEventListener('pointercancel', lost, true);
      c.addEventListener('lostpointercapture', (e) => { if (this.pointers.has(e.pointerId)) setTimeout(() => { if (this.pointers.has(e.pointerId)) this.onUp(e); }, 0); });
      c.addEventListener('dblclick', (e) => this.onDbl(e));
      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const [sx, sy] = this.evPos(e);
        if (e.ctrlKey || e.metaKey) this.zoomAt(Math.exp(-e.deltaY * 0.01), sx, sy);
        else { this.view.x -= e.deltaX; this.view.y -= e.deltaY; this.requestRender(); this.saveView(); }
      }, { passive: false });
      c.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('keydown', (e) => { if (e.code === 'Space' && !isTyping()) { this.spaceDown = true; c.style.cursor = 'grab'; } });
      window.addEventListener('keyup', (e) => { if (e.code === 'Space') { this.spaceDown = false; this.updateCursor(); } });
    }

    /** نوع المؤشر: قلم السبورة (Promethean/ActivPen)، إصبع، راحة يد، زر الممحاة في القلم */
    /** نوع المؤشر: قلم السبورة، إصبع، راحة يد، طرف الممحاة في القلم
        (محافظ عمداً: كثير من السبورات ترسل مساحة تلامس كبيرة لكل لمسة، أو قلماً يُقرأ لمساً) */
    pointerKind(e) {
      const st = M.settings, now = performance.now(), touch = e.pointerType === 'touch';
      const none = { now, reject: false, palm: false, penErase: false, nav: false };
      if (st.compat) return Object.assign(none, { compat: true });
      if (e.pointerType === 'pen') { this.penSeen = true; this.penAt = now; }
      // راحة اليد: أكبر بكثير من اللمسات المعتادة على هذه السبورة نفسها (تكيّفي)
      const size = Math.max(e.width || 0, e.height || 0);
      const sizes = this.touchSizes || (this.touchSizes = []);
      let palm = false;
      if (touch && st.palmErase !== false && sizes.length >= 5) {
        const med = sizes.slice().sort((x, y) => x - y)[sizes.length >> 1];
        palm = size >= 60 && size > med * 2.5;
      }
      if (touch && !palm) { sizes.push(size); if (sizes.length > 30) sizes.shift(); }
      return Object.assign(none, {
        // رفض راحة اليد فقط والقلم ملامس للسبورة فعلاً
        reject: touch && st.touchMode !== 'draw' && (this.penDown > 0 || now - (this.penUpAt || -1e9) < 250),
        palm,
        penErase: e.pointerType === 'pen' && (e.button === 5 || e.buttons === 32),
        nav: touch && st.touchMode === 'gesture',
      });
    }
    /** تنظيف مؤشرات عالقة (سبورات لا ترسل رفع القلم أحياناً) */
    dropStale(type) {
      for (const [id, t] of this.ptype) {
        if (t !== type) continue;
        const ex = this.extra.get(id);
        if (ex && ex.s && ex.s.pts.length > 1) this.finishStroke(ex.s);
        this.extra.delete(id); this.pointers.delete(id); this.ptype.delete(id);
        if (id === this.primaryId) {
          if (this.action === 'draw' && this.cur && this.cur.pts.length > 1) { const c = this.cur; this.cur = null; this.finishStroke(c); }
          this.cur = null; this.action = null; this.primaryId = null;
        }
      }
      if (this.action === 'pinch' && this.pointers.size < 2) { this.action = null; this.saveView(); }
    }
    newStroke(sx, sy) {
      const hl = this.tool === 'highlighter', wd = this.width;
      return { id: uid(), type: 'stroke', pts: [this.toWorld(sx, sy)], color: this.color, width: hl ? wd * 5 : wd, alpha: hl ? 0.35 : 1, hl };
    }
    startPinch() {
      this.cur = null; this.action = 'pinch'; this.extra.clear(); this.cancelLongPress();
      const [a, b] = [...this.pointers.values()];
      this.pinch = { d: dist(a[0], a[1], b[0], b[1]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
      this.requestRender();
    }
    cancelLongPress() { if (this.lp) { clearTimeout(this.lp.timer); this.lp = null; } }
    handleR() { return M.settings.boardMode ? 14 : 9; }
    geoHandleAt(sx, sy) {
      if (!M.geoTypes) return null;
      const [wx, wy] = this.toWorld(sx, sy), tol = (this.handleR() * 1.9) / this.view.s;
      for (let i = this.objects.length - 1; i >= 0; i--) {
        const o = this.objects[i];
        const G = M.geoTypes[o.type];
        if (!G) continue;
        const k = G.handleAt(o, wx, wy, tol);
        if (k) return { o, k };
      }
      return null;
    }

    onDown(e) {
      const pk = this.pointerKind(e);
      if (pk.reject) return;
      if (e.isPrimary) this.dropStale(e.pointerType);
      this.ptype.set(e.pointerId, e.pointerType);
      if (e.pointerType === 'pen') this.penDown++;
      try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* بعض برامج تشغيل السبورات لا تدعم الالتقاط */ }
      const [sx, sy] = this.evPos(e);
      this.pointers.set(e.pointerId, [sx, sy]);
      if (this.pointers.size >= 2 && this.action !== 'pinch') {
        const st = M.settings, first = this.primary || {};
        const drawTool = ['pen', 'mathpen', 'highlighter'].includes(this.tool);
        // إصبعان معاً تقريباً ⇐ تكبير وتحريك، وإلا ⇐ كاتب آخر على السبورة
        const pinchy = pk.nav || (e.pointerType === 'touch' && first.type === 'touch' && pk.now - first.t < 180 && st.multiWriter !== 'always' && !(this.cur && this.cur.pts && this.cur.pts.length > 6));
        const canMulti = !pk.compat && st.multiWriter !== false && st.multiWriter !== 'off' && !pk.nav && (drawTool || pk.palm || pk.penErase) && this.action !== 'pan';
        if (!pinchy && canMulti && this.pointers.size <= 12) {
          this.cancelLongPress();
          if (pk.palm || pk.penErase) { this.extra.set(e.pointerId, { erase: true, big: pk.palm }); this.commit(); this.eraseAt(...this.toWorld(sx, sy), pk.palm); }
          else this.extra.set(e.pointerId, { s: this.newStroke(sx, sy) });
          this.requestRender();
          return;
        }
        if (this.pointers.size === 2) this.startPinch();
        return;
      }
      if (this.pointers.size > 2) return;
      this.primaryId = e.pointerId;
      this.primary = { id: e.pointerId, t: pk.now, type: e.pointerType };
      const w = this.snapPt(this.toWorld(sx, sy));
      const [wx, wy] = w;
      this.start = { sx, sy, wx, wy };
      if (this.textEditor) this.commitText();

      if (e.button === 1 || this.spaceDown || this.tool === 'pan' || (e.button === 2 && !pk.penErase) || pk.nav) {
        this.action = 'pan';
        this.panStart = { x: this.view.x, y: this.view.y, sx, sy };
        this.canvas.style.cursor = 'grabbing';
        return;
      }
      // ممحاة القلم (طرفه الخلفي) أو راحة اليد ⇐ مسح مؤقت دون تغيير الأداة
      if (pk.palm || pk.penErase) {
        this.commit();
        this.action = 'erase'; this.bigErase = pk.palm;
        this.eraseKind = pk.palm ? 'palm' : 'pen'; this.eraseSig = this.objSig();
        this.eraseAt(...this.toWorld(sx, sy), pk.palm);
        this.requestRender();
        return;
      }
      this.bigErase = false;
      // نقاط الأشكال التفاعلية (الدائرة…) تُسحب بأي أداة رسم
      if (!['eraser', 'laser', 'text'].includes(this.tool)) {
        const gh = this.geoHandleAt(sx, sy);
        if (gh) {
          this.commit();
          this.action = 'geodrag'; this.geo = gh; this.geoLast = this.toWorld(sx, sy);
          M.emit('circ-active', gh.o);
          this.requestRender();
          return;
        }
      }
      // الضغط المطوّل بالقلم أو الإصبع ⇐ قائمة الأدوات الدائرية بجوار اليد
      this.cancelLongPress();
      if (e.pointerType !== 'mouse' && !pk.compat && M.settings.radial !== false && ['pen', 'mathpen', 'highlighter', 'select', 'eraser'].includes(this.tool)) {
        const cx = e.clientX, cy = e.clientY;
        this.lp = { sx, sy, timer: setTimeout(() => {
          this.lp = null;
          if (this.primaryId !== e.pointerId) return;
          if (this.action === 'draw' && this.cur && this.cur.pts.length < 12) { this.cur = null; this.action = null; }
          else if (this.action === 'marquee') { this.marquee = null; this.action = null; }
          else if (this.action === 'erase') { this.action = null; }
          else return;
          this.requestRender();
          M.emit('longpress', { x: cx, y: cy, wx, wy });
        }, 650) };
      }
      const col = this.color, wd = this.width;
      switch (this.tool) {
        case 'pen':
        case 'mathpen':
        case 'highlighter': {
          const hl = this.tool === 'highlighter';
          const raw = this.toWorld(sx, sy);
          this.cur = { id: uid(), type: 'stroke', pts: [raw], color: col, width: hl ? wd * 5 : wd, alpha: hl ? 0.35 : 1, hl };
          this.action = 'draw';
          break;
        }
        case 'eraser':
          this.commit();
          this.action = 'erase';
          this.eraseAt(wx, wy);
          break;
        case 'laser':
          this.action = 'laser';
          this.laser.push({ x: sx, y: sy, t: performance.now() });
          break;
        case 'text':
          e.preventDefault(); // لا ينتقل التركيز بعيداً عن محرر النص
          this.action = null;
          this.openTextEditor(...this.toWorld(sx, sy));
          return;
        case 'select': {
          const hitHandle = this.selectionHandleAt(sx, sy);
          if (hitHandle) {
            this.commit();
            this.action = 'scale';
            this.scaleStart = { bbox: this.selBBox(), snap: this.selectedObjs().map((o) => JSON.parse(JSON.stringify(o))) };
            break;
          }
          const hit = this.hitTest(wx, wy);
          if (hit) {
            if (!this.selected.has(hit.id)) {
              if (!e.shiftKey) this.selected.clear();
              this.selected.add(hit.id);
            }
            this.commit();
            this.action = 'move';
            this.moveLast = [wx, wy];
          } else {
            if (!e.shiftKey) this.selected.clear();
            this.action = 'marquee';
            this.marquee = [wx, wy, wx, wy];
          }
          this.emitSelection();
          break;
        }
        case 'angle': {
          this.angleClicks.push([wx, wy]);
          if (this.angleClicks.length === 3) {
            this.add({ type: 'angle', p: this.angleClicks.slice(), color: col, width: wd });
            this.angleClicks = [];
          }
          this.action = null;
          break;
        }
        default: {
          // الأشكال
          this.cur = { id: uid(), type: this.tool, x1: wx, y1: wy, x2: wx, y2: wy, color: col, width: wd, fill: this.fill, dash: this.dash };
          this.action = 'shape';
        }
      }
      this.requestRender();
    }

    onMove(e) {
      const [sx, sy] = this.evPos(e);
      if (e.pointerType === 'pen') this.penAt = performance.now();
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, [sx, sy]);
      const ex = this.extra.get(e.pointerId);
      if (ex) {
        if (ex.erase) { this.eraseAt(...this.toWorld(sx, sy), ex.big); return; }
        const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [], events = co.length ? co : [e];
        for (const ev of events) {
          const p = this.toWorld(...this.evPos(ev)), last = ex.s.pts[ex.s.pts.length - 1];
          if (dist(p[0], p[1], last[0], last[1]) * this.view.s > 1.2) ex.s.pts.push(p);
        }
        this.requestRender();
        return;
      }
      if (this.action && this.action !== 'pinch' && this.primaryId != null && e.pointerId !== this.primaryId) return;
      if (this.lp && Math.hypot(sx - this.lp.sx, sy - this.lp.sy) > 10) this.cancelLongPress();
      this.hover = this.toWorld(sx, sy);
      if (this.action === 'pinch' && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = dist(a[0], a[1], b[0], b[1]);
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        this.view.x += mx - this.pinch.mx; this.view.y += my - this.pinch.my;
        this.zoomAt(d / this.pinch.d, mx, my, true);
        this.pinch = { d, mx, my };
        return;
      }
      if (this.tool === 'angle' || this.tool === 'eraser') this.requestRender();
      if (!this.action) {
        // مؤشر اليد فوق نقاط الأشكال التفاعلية
        const over = e.pointerType !== 'touch' && !['eraser', 'laser', 'text'].includes(this.tool) && this.geoHandleAt(sx, sy);
        if (!!over !== !!this._overGeo) { this._overGeo = !!over; if (over) this.canvas.style.cursor = 'grab'; else this.updateCursor(); }
        return;
      }
      const [wx, wy] = this.snapPt(this.toWorld(sx, sy));
      switch (this.action) {
        case 'pan':
          this.view.x = this.panStart.x + sx - this.panStart.sx;
          this.view.y = this.panStart.y + sy - this.panStart.sy;
          break;
        case 'draw': {
          const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [], events = co.length ? co : [e];
          for (const ev of events) {
            const p = this.toWorld(...this.evPos(ev));
            const last = this.cur.pts[this.cur.pts.length - 1];
            if (dist(p[0], p[1], last[0], last[1]) * this.view.s > 1.2) this.cur.pts.push(p);
          }
          if (e.shiftKey && this.cur.pts.length > 1) this.cur.pts = [this.cur.pts[0], this.cur.pts[this.cur.pts.length - 1]];
          break;
        }
        case 'erase': this.eraseAt(...this.toWorld(sx, sy), this.bigErase); break;
        case 'geodrag': {
          const [x, y] = this.toWorld(sx, sy);
          M.geoTypes[this.geo.o.type].drag(this.geo.o, this.geo.k, x, y, x - this.geoLast[0], y - this.geoLast[1]);
          this.geoLast = [x, y];
          M.emit('circ-change', this.geo.o);
          break;
        }
        case 'laser': this.laser.push({ x: sx, y: sy, t: performance.now() }); break;
        case 'shape': {
          let x2 = wx, y2 = wy;
          if (e.shiftKey) {
            const dx = x2 - this.cur.x1, dy = y2 - this.cur.y1;
            if (['line', 'arrow', 'measure'].includes(this.cur.type)) {
              const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
              const L = Math.hypot(dx, dy);
              x2 = this.cur.x1 + L * Math.cos(ang); y2 = this.cur.y1 + L * Math.sin(ang);
            } else {
              const m = Math.max(Math.abs(dx), Math.abs(dy));
              x2 = this.cur.x1 + Math.sign(dx || 1) * m; y2 = this.cur.y1 + Math.sign(dy || 1) * m;
            }
          }
          this.cur.x2 = x2; this.cur.y2 = y2;
          break;
        }
        case 'move': {
          const dx = wx - this.moveLast[0], dy = wy - this.moveLast[1];
          this.moveLast = [wx, wy];
          this.selectedObjs().forEach((o) => mapObj(o, (x, y) => [x + dx, y + dy]));
          this.emitSelection();
          break;
        }
        case 'scale': {
          const b = this.scaleStart.bbox;
          const nw = Math.max(10, wx - b[0]), nh = Math.max(10, wy - b[1]);
          let sxr = nw / Math.max(1, b[2] - b[0]), syr = nh / Math.max(1, b[3] - b[1]);
          if (!e.shiftKey) { const k = Math.max(sxr, syr); sxr = syr = k; }
          const snap = this.scaleStart.snap;
          this.selectedObjs().forEach((o) => {
            const orig = snap.find((s) => s.id === o.id);
            Object.assign(o, JSON.parse(JSON.stringify(orig)));
            mapObj(o, (x, y) => [b[0] + (x - b[0]) * sxr, b[1] + (y - b[1]) * syr], Math.sqrt(sxr * syr));
          });
          this.emitSelection();
          break;
        }
        case 'marquee': this.marquee[2] = wx; this.marquee[3] = wy; break;
      }
      this.requestRender();
    }

    /** إنهاء خط مرسوم: التعرّف على المنحنى أو الشكل أو الكتابة */
    finishStroke(s) {
      if (s.pts.length === 1) s.pts.push([s.pts[0][0] + 0.1, s.pts[0][1] + 0.1]);
      let obj = s;
      if (this.tool === 'mathpen') { s.math = true; this.add(s); M.emit('mathpen-stroke', s); return; }
      // على المستوى الإحداثي: منحنى مرسوم باليد ⇐ معادلته ورسمه الدقيق
      if (M.settings.smartInk && !s.hl && this.page.bg === 'coord' && M.curveFit) {
        const g = this.recognizeCurve(s);
        if (g && this.curveMode) {
          // المستخدم حدّد نوع الدالة ⇐ نرسمها بدقة مباشرة
          this.commit(); g.objs.forEach((o) => this.objects.push(o)); this.changed();
          M.toast(`✨ ${g.fit.label}: ${M.loc(g.fit.eq)}`, { time: 5000 });
          return;
        }
        if (g && M.assist && M.settings.assist !== false) {
          // المساعد يسأل أولاً: هل تريد معادلته؟
          g.objs.forEach((o) => { if (o.color == null) o.color = s.color; });
          this.add(s);
          M.assist.showCurve(s, g);
          return;
        }
        if (g) {
          const orig = s;
          this.commit();
          g.objs.forEach((o) => this.objects.push(o));
          this.changed();
          M.emit('curve-recognized', g);
          const acts = { label: 'إبقاء الرسم الحر', fn: () => { this.commit(); this.page.objects = this.objects.filter((o) => !g.objs.includes(o)); this.objects.push(orig); this.changed(); } };
          M.toast(`✨ ${g.fit.label}: ${M.loc(g.fit.eq)}`, { time: 6000, action: acts });
          return;
        }
      }
      if (M.settings.smartInk && !s.hl) {
        const rec = this.recognize(s);
        if (rec) {
          obj = rec;
          const res = rec._res, label = rec._label;
          delete rec._label; delete rec._res;
          this.add(obj);
          // رسم شكل بعدة مستقيمات ⇐ مضلع واحد
          if (obj.type === 'line' && this.tryCloseLines(obj)) return;
          M.emit('shape-recognized', { obj, res, stroke: s });
          if (M.assist && M.settings.assist !== false) M.assist.showShape(obj, Object.assign({}, res, { label }), s);
          else this.shapeToast(obj, res, label, s);
          return;
        }
      }
      this.add(obj);
    }

    objSig() { return this.objects.length + ':' + this.objects.reduce((n, o) => n + (o.pts ? o.pts.length : 1), 0); }
    onUp(e) {
      if (this.ptype.get(e.pointerId) === 'pen') { this.penDown = Math.max(0, this.penDown - 1); this.penUpAt = performance.now(); }
      this.ptype.delete(e.pointerId);
      const ex = this.extra.get(e.pointerId);
      if (ex) {
        this.extra.delete(e.pointerId); this.pointers.delete(e.pointerId);
        if (ex.s) { if (ex.s.pts.length === 1) ex.s.pts.push([ex.s.pts[0][0] + 0.1, ex.s.pts[0][1] + 0.1]); this.finishStroke(ex.s); } else this.changed();
        this.requestRender();
        return;
      }
      this.pointers.delete(e.pointerId);
      if (this.action === 'pinch') { if (this.pointers.size < 2) { this.action = null; this.primaryId = null; this.saveView(); } return; }
      if (this.primaryId != null && e.pointerId !== this.primaryId) return;
      // مسح خاص (راحة اليد أو طرف القلم) لم يمسح شيئاً مرتين ⇐ ربما السبورة ترسل الكتابة كأنها مسح
      if (this.action === 'erase' && this.eraseKind) {
        const kind = this.eraseKind; this.eraseKind = null;
        if (this.objSig() === this.eraseSig && ['pen', 'mathpen', 'highlighter'].includes(this.tool)) {
          this.badErase = (this.badErase || 0) + 1;
          if (this.badErase === 2) M.toast(kind === 'palm' ? 'القلم يمسح بدل أن يكتب؟ يبدو أن سبورتك ترسل كل لمسة كأنها راحة يد' : 'القلم يمسح بدل أن يكتب؟ يبدو أن سبورتك ترسل الكتابة كأنها طرف الممحاة', { time: 12000, action: { label: 'أصلحها', fn: () => { if (kind === 'palm') M.settings.palmErase = false; else M.settings.compat = true; M.saveSettings(); this.badErase = 0; M.toast('✓ جرّب الكتابة الآن'); } } });
        } else this.badErase = 0;
      }
      this.primaryId = null;
      this.cancelLongPress();
      const act = this.action;
      this.action = null;
      switch (act) {
        case 'draw': {
          const s = this.cur;
          this.cur = null;
          this.finishStroke(s);
          break;
        }
        case 'shape': {
          const s = this.cur;
          this.cur = null;
          if (dist(s.x1, s.y1, s.x2, s.y2) * this.view.s < 4) break;
          this.add(this.finalizeShape(s));
          break;
        }
        case 'move': case 'scale': case 'erase': this.changed(); break;
        case 'geodrag': this.changed(); M.emit('circ-change', this.geo.o); this.geo = null; break;
        case 'pan': this.updateCursor(); this.saveView(); break;
        case 'marquee': {
          const [x1, y1, x2, y2] = this.marquee;
          const r = [Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2)];
          this.objects.forEach((o) => {
            const b = bbox(o);
            if (b[0] >= r[0] && b[1] >= r[1] && b[2] <= r[2] && b[3] <= r[3]) this.selected.add(o.id);
          });
          this.marquee = null;
          this.emitSelection();
          break;
        }
      }
      this.requestRender();
    }

    onDbl(e) {
      const [sx, sy] = this.evPos(e);
      const [wx, wy] = this.toWorld(sx, sy);
      const hit = this.hitTest(wx, wy);
      if (hit && hit.type === 'text') {
        this.commit();
        this.objects.splice(this.objects.indexOf(hit), 1);
        this.selected.clear();
        this.emitSelection();
        this.openTextEditor(hit.x, hit.y, hit);
      }
    }

    updateCursor() {
      const cur = { pan: 'grab', select: 'default', text: 'text', laser: 'none', eraser: 'none' }[this.tool] || 'crosshair';
      this.canvas.style.cursor = cur;
    }

    setTool(t) {
      if (this.textEditor) this.commitText();
      this.tool = t;
      this.angleClicks = [];
      if (t !== 'select') { this.selected.clear(); this.emitSelection(); }
      this.updateCursor();
      this.requestRender();
    }

    /* ---------- التعرّف الذكي على الأشكال ---------- */
    recognize(s) {
      if (!M.shapeRec) return null;
      const res = M.shapeRec.recognize(s.pts, { scale: this.view.s, samples: M.store.get('shapeUser', []) });
      if (!res || !res.obj) return null;
      const obj = Object.assign({ id: uid(), color: s.color, width: s.width, fill: false, dash: false }, res.obj);
      obj._label = res.label;
      obj._res = res;
      return obj;
    }

    /** تنبيه الشكل المتعرَّف عليه مع قياساته وأزرار التصحيح */
    shapeToast(obj, res, label, stroke) {
      const m = M.shapeRec.measure(Object.assign({}, res, { obj }), this.unit);
      const F = (x) => M.fmt(x, 2);
      const info = m.area != null ? ` — المساحة ${F(m.area)} ، المحيط ${F(m.perimeter)}` : m.length != null ? ` — الطول ${F(m.length)}` : '';
      M.toast(`✨ ${label}${info}`, {
        time: 5000,
        actions: [
          { label: 'القياسات', fn: () => this.addMeasurements(obj, res) },
          { label: 'ليس هذا', fn: () => this.correctShape(obj, stroke) },
        ],
      });
    }
    /** كتابة أطوال الأضلاع والمساحة والمحيط بجوار الشكل */
    addMeasurements(obj, res) {
      const m = M.shapeRec.measure(Object.assign({}, res, { obj }), this.unit), F = (x) => M.fmt(x, 2);
      const b = bbox(obj), add = [];
      const t = (x, y, text, size) => add.push({ id: uid(), type: 'text', x, y, text: M.loc(text), size: size || 18, color: 'c1' });
      const pts = obj.pts || (obj.type === 'rect' ? [[obj.x1, obj.y1], [obj.x2, obj.y1], [obj.x2, obj.y2], [obj.x1, obj.y2]] : null);
      if (pts && m.sides && pts.length <= 10) {
        const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
        pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, d = Math.hypot(mx - c[0], my - c[1]) || 1; t(mx + ((mx - c[0]) / d) * 26 + 18, my + ((my - c[1]) / d) * 26 - 10, F(m.sides[i])); });
        pts.forEach((p, i) => { const d = Math.hypot(p[0] - c[0], p[1] - c[1]) || 1; t(p[0] - ((p[0] - c[0]) / d) * 34 + 16, p[1] - ((p[1] - c[1]) / d) * 34 - 10, `${M.fmt(m.angles[i], 1)}°`, 15); });
      }
      const lines = [res.label];
      if (m.r != null) lines.push(`نق = ${F(m.r)}`);
      if (m.a != null) lines.push(`أ = ${F(m.a)} ، ب = ${F(m.b)}`);
      if (m.length != null) lines.push(`الطول = ${F(m.length)}`);
      if (m.perimeter != null) lines.push(`المحيط = ${F(m.perimeter)}`);
      if (m.area != null) lines.push(`المساحة = ${F(m.area)}`);
      if (m.angles && m.angles.length) lines.push(`مجموع الزوايا = ${M.fmt(m.angles.reduce((x, y) => x + y, 0), 0)}°`);
      t(b[2], b[3] + 30, lines.join('\n'), 18);
      this.commit(); add.forEach((o) => this.objects.push(o)); this.changed();
    }
    /** تصحيح المستخدم: يختار الشكل الصحيح فيتعلمه التطبيق لرسوماته القادمة */
    correctShape(obj, stroke) {
      const N = M.shapeRec.NAMES;
      const keys = ['freehand', 'line', 'arrow', 'circle', 'ellipse', 'triangle', 'rtri', 'isoTri', 'equiTri', 'square', 'rect', 'rhombus', 'para', 'trap', 'kite', 'pent', 'hex', 'oct', 'star'];
      const wrap = M.h('div');
      wrap.appendChild(M.h('div', { class: 'hint' }, 'ما الشكل الذي قصدته؟ سأتذكّر اختيارك وأتعرّف على رسوماتك المشابهة بدقة أكبر.'));
      const grid = M.h('div', { class: 'chips', style: { marginTop: '10px' } });
      const md = M.modal({ title: 'علّمني الشكل الصحيح', icon: 'wand', body: wrap, size: 'sm' });
      keys.forEach((k) => {
        const b = M.h('button', { class: 'chip' }, N[k]);
        b.onclick = () => {
          const list = M.store.get('shapeUser', []);
          list.push({ label: k, d: M.shapeRec.descriptor(stroke.pts) });
          M.store.set('shapeUser', list.slice(-300));
          const built = k === 'freehand' ? null : M.shapeRec.buildFromLabel(k, stroke.pts);
          const rep = built ? Object.assign({ id: uid(), color: stroke.color, width: stroke.width, fill: false, dash: false }, built) : stroke;
          this.commit();
          const i = this.objects.indexOf(obj);
          if (i >= 0) this.objects[i] = rep; else this.objects.push(rep);
          this.changed();
          md.close();
          M.toast(`تعلّمتُ: رسمك هذا = ${N[k]} ✨`);
        };
        grid.appendChild(b);
      });
      wrap.appendChild(grid);
    }
    /** مستقيمات مرسومة متتالية تتلاقى أطرافها ⇐ مضلع مغلق */
    tryCloseLines(last) {
      const now = Date.now();
      last._t = now;
      const recent = [];
      for (let i = this.objects.length - 1; i >= 0 && recent.length < 8; i--) {
        const o = this.objects[i];
        if (o.type !== 'line' || !o._t || now - o._t > 30000) break;
        recent.unshift(o);
      }
      for (let k = Math.min(recent.length, 8); k >= 3; k--) {
        const group = recent.slice(recent.length - k);
        const size = Math.max(...group.map((l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1)));
        const v = M.shapeRec.closeLines(group, Math.max(14 / this.view.s, size * 0.09));
        if (!v) continue;
        const res = M.shapeRec.fromVertices(v);
        const poly = Object.assign({ id: uid(), color: last.color, width: last.width, fill: false, dash: false }, res.obj);
        this.page.objects = this.objects.filter((o) => !group.includes(o));
        this.objects.push(poly);
        this.changed();
        const st = { pts: v.concat([v[0]]), color: last.color, width: last.width };
        if (M.assist && M.settings.assist !== false) M.assist.showShape(poly, res, st); else this.shapeToast(poly, res, res.label, st);
        return true;
      }
      return false;
    }

    /** تحويل منحنى مرسوم على المستوى الإحداثي إلى دالة/دائرة دقيقة مع معادلتها */
    recognizeCurve(s) {
      const u = this.unit;
      const b = bbox(s);
      if (Math.hypot(b[2] - b[0], b[3] - b[1]) * this.view.s < 40) return null;
      const fit = M.curveFit.fit(s.pts.map(([x, y]) => [x / u, -y / u]), this.curveMode ? { only: this.curveMode } : undefined);
      if (!fit) return null;
      const base = { id: uid(), color: s.color, width: Math.max(2.5, s.width) };
      if (fit.kind === 'circle') {
        const [cx, cy] = fit.center, r = fit.r;
        const X = cx * u, Y = -cy * u, R = r * u;
        return { fit, objs: [Object.assign(base, { type: 'ellipse', x1: X - R, y1: Y - R, x2: X + R, y2: Y + R }), { id: uid(), type: 'text', x: X + R * 0.72 + M.loc(fit.eq).length * 5, y: Y - R - 34, text: M.loc(fit.eq), size: 20, color: s.color }] };
      }
      if (fit.kind === 'vline') return { fit, objs: [Object.assign(base, { type: 'fn', vline: fit.x, expr: '0', label: fit.eq })] };
      return { fit, objs: [Object.assign(base, { type: 'fn', expr: fit.expr, label: fit.eq, domain: [fit.xRange[0], fit.xRange[1]] })] };
    }

    finalizeShape(s) {
      const { x1, y1, x2, y2 } = s;
      const base = { id: s.id, color: s.color, width: s.width, fill: s.fill, dash: s.dash };
      switch (s.type) {
        case 'triangle': return Object.assign(base, { type: 'poly', pts: [[(x1 + x2) / 2, Math.min(y1, y2)], [Math.max(x1, x2), Math.max(y1, y2)], [Math.min(x1, x2), Math.max(y1, y2)]] });
        case 'rtri': return Object.assign(base, { type: 'poly', pts: [[x1, y1], [x1, y2], [x2, y2]], rightAngle: 1 });
        case 'polygon': {
          const r = dist(x1, y1, x2, y2), a0 = Math.atan2(y2 - y1, x2 - x1);
          const pts = [];
          for (let i = 0; i < this.sides; i++) { const a = a0 + (i * 2 * Math.PI) / this.sides; pts.push([x1 + r * Math.cos(a), y1 + r * Math.sin(a)]); }
          return Object.assign(base, { type: 'poly', pts });
        }
        default: return Object.assign(base, { type: s.type, x1, y1, x2, y2 });
      }
    }

    /* ---------- الممحاة ---------- */
    eraseAt(wx, wy, big) {
      const r = (big ? 34 : Math.max(8, this.width * 3)) / this.view.s;
      const out = [];
      let changed = false;
      for (const o of this.objects) {
        if (o.type === 'stroke') {
          if (!this.hitObj(o, wx, wy, r)) { out.push(o); continue; }
          changed = true;
          // تقسيم الخط الحر
          let seg = [];
          for (const p of o.pts) {
            if (dist(p[0], p[1], wx, wy) > r + o.width / 2) seg.push(p);
            else { if (seg.length > 1) out.push(Object.assign({}, o, { id: uid(), pts: seg })); seg = []; }
          }
          if (seg.length > 1) out.push(Object.assign({}, o, { id: uid(), pts: seg }));
        } else if (this.hitObj(o, wx, wy, r)) changed = true;
        else out.push(o);
      }
      if (changed) { this.page.objects = out; this.requestRender(); }
    }

    /* ---------- الاختبار والتحديد ---------- */
    hitObj(o, x, y, tol) {
      tol = tol == null ? 6 / this.view.s : tol;
      const t = tol + (o.width || 2) / 2;
      switch (o.type) {
        case 'stroke': {
          const p = o.pts;
          for (let i = 1; i < p.length; i++) if (distToSeg(x, y, p[i - 1][0], p[i - 1][1], p[i][0], p[i][1]) < t) return true;
          return p.length === 1 && dist(x, y, p[0][0], p[0][1]) < t;
        }
        case 'line': case 'arrow': case 'measure': return distToSeg(x, y, o.x1, o.y1, o.x2, o.y2) < t;
        case 'rect': {
          const b = bbox(o);
          if (o.fill && x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]) return true;
          const c = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
          return c.some((p, i) => { const q = c[(i + 1) % 4]; return distToSeg(x, y, p[0], p[1], q[0], q[1]) < t; });
        }
        case 'ellipse': case 'compass': {
          let cx, cy, rx, ry;
          if (o.type === 'compass') { cx = o.x1; cy = o.y1; rx = ry = dist(o.x1, o.y1, o.x2, o.y2); }
          else { cx = (o.x1 + o.x2) / 2; cy = (o.y1 + o.y2) / 2; rx = Math.abs(o.x2 - o.x1) / 2; ry = Math.abs(o.y2 - o.y1) / 2; }
          if (rx < 1 || ry < 1) return false;
          const k = Math.hypot((x - cx) / rx, (y - cy) / ry);
          if (o.fill && k <= 1) return true;
          return Math.abs(k - 1) * Math.min(rx, ry) < t;
        }
        case 'poly': {
          if (o.fill && pointInPoly(x, y, o.pts)) return true;
          return o.pts.some((p, i) => { const q = o.pts[(i + 1) % o.pts.length]; return distToSeg(x, y, p[0], p[1], q[0], q[1]) < t; });
        }
        case 'angle': {
          const [a, b, c] = o.p;
          return distToSeg(x, y, b[0], b[1], a[0], a[1]) < t || distToSeg(x, y, b[0], b[1], c[0], c[1]) < t;
        }
        case 'fn': {
          if (o.vline != null) return Math.abs(x - o.vline * this.unit) < t;
          const f = fnOf(o), u = this.unit, e = 0.5;
          const y0 = -f(x / u) * u, y1 = -f((x + e) / u) * u;
          if (!Number.isFinite(y0)) return false;
          const slope = (y1 - y0) / e;
          return Math.abs(y - y0) / Math.sqrt(1 + slope * slope) < t * 1.5;
        }
        case 'xregion': return (o.intervals || []).some(([a, b]) => x >= a * this.unit - t && x <= b * this.unit + t);
        case 'circ': case 'fntan': case 'vis': return M.geoTypes && M.geoTypes[o.type] ? M.geoTypes[o.type].hit(o, x, y, t) : false;
        case 'text': case 'image': {
          const b = bbox(o);
          return x >= b[0] - tol && x <= b[2] + tol && y >= b[1] - tol && y <= b[3] + tol;
        }
      }
      return false;
    }
    hitTest(x, y) {
      for (let i = this.objects.length - 1; i >= 0; i--) if (this.hitObj(this.objects[i], x, y)) return this.objects[i];
      return null;
    }
    selectedObjs() { return this.objects.filter((o) => this.selected.has(o.id)); }
    selBBox() {
      const objs = this.selectedObjs();
      if (!objs.length) return null;
      const b = [Infinity, Infinity, -Infinity, -Infinity];
      objs.forEach((o) => { const q = bbox(o); b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); });
      return b;
    }
    selectionHandleAt(sx, sy) {
      const b = this.selBBox();
      if (!b) return false;
      const [hx, hy] = this.toScreen(b[2], b[3]);
      return dist(sx, sy, hx + 6, hy + 6) < 12;
    }
    emitSelection() { M.emit('selection', { count: this.selected.size, bbox: this.selBBox() }); this.requestRender(); }
    deleteSelected() {
      if (!this.selected.size) return;
      this.commit();
      this.page.objects = this.objects.filter((o) => !this.selected.has(o.id));
      this.selected.clear();
      this.emitSelection();
      this.changed();
    }
    duplicateSelected() {
      if (!this.selected.size) return;
      this.commit();
      const copies = this.selectedObjs().map((o) => { const c = JSON.parse(JSON.stringify(o)); c.id = uid(); mapObj(c, (x, y) => [x + 24, y + 24]); return c; });
      this.objects.push(...copies);
      this.selected = new Set(copies.map((c) => c.id));
      this.emitSelection();
      this.changed();
    }
    reorderSelected(front) {
      if (!this.selected.size) return;
      this.commit();
      const sel = this.selectedObjs(), rest = this.objects.filter((o) => !this.selected.has(o.id));
      this.page.objects = front ? rest.concat(sel) : sel.concat(rest);
      this.changed();
    }
    recolorSelected(tok) {
      if (!this.selected.size) return;
      this.commit();
      this.selectedObjs().forEach((o) => { if (o.type !== 'image') o.color = tok; });
      this.changed();
    }
    selectAll() { this.setTool('select'); this.objects.forEach((o) => this.selected.add(o.id)); this.emitSelection(); M.emit('tool', 'select'); }

    /* ---------- النص ---------- */
    openTextEditor(wx, wy, existing) {
      const ta = document.createElement('textarea');
      ta.className = 'board-text-editor';
      ta.dir = 'auto';
      const size = existing ? existing.size : Math.max(18, this.width * 7);
      const col = existing ? existing.color : this.color;
      ta.value = existing ? existing.text : '';
      const [sx, sy] = this.toScreen(wx, wy);
      Object.assign(ta.style, {
        right: this.w - sx + 'px', top: sy + 'px',
        fontSize: size * this.view.s + 'px', color: this.colorOf(col),
      });
      ta.rows = 1;
      this.wrap.appendChild(ta);
      const autosize = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = 'auto'; ta.style.width = Math.max(120, ta.scrollWidth + 20) + 'px'; };
      ta.addEventListener('input', autosize);
      ta.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.commitText(); }
        if (e.key === 'Escape') { this.commitText(); }
      });
      ta.addEventListener('blur', () => setTimeout(() => { if (this.textEditor && this.textEditor.ta === ta && document.activeElement !== ta) this.commitText(); }, 150));
      this.textEditor = { ta, wx, wy, size, color: col };
      ta.focus();
      autosize();
      setTimeout(() => { if (document.activeElement !== ta && this.textEditor && this.textEditor.ta === ta) ta.focus(); }, 30);
      M.emit('text-editor', ta);
    }
    insertAtCursor(txt) {
      if (!this.textEditor) return false;
      const ta = this.textEditor.ta;
      const s = ta.selectionStart, e2 = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e2);
      ta.selectionStart = ta.selectionEnd = s + txt.length;
      ta.dispatchEvent(new Event('input'));
      ta.focus();
      return true;
    }
    commitText() {
      const ed = this.textEditor;
      if (!ed) return;
      this.textEditor = null;
      let text = ed.ta.value.replace(/\s+$/, '');
      ed.ta.remove();
      if (!text) { this.requestRender(); return; }
      text = M.loc(text);
      const to = this.add({ type: 'text', x: ed.wx, y: ed.wy, text, size: ed.size, color: ed.color });
      M.emit('text-added', to);
    }

    /* ---------- إضافة وتعديل ---------- */
    add(o) {
      this.commit();
      o.id = o.id || uid();
      this.objects.push(o);
      this.changed();
      return o;
    }
    viewCenter() { return this.toWorld(this.w / 2, this.h / 2); }
    addText(text, opts) {
      opts = opts || {};
      const [cx, cy] = this.viewCenter();
      const size = opts.size || 32;
      const o = { type: 'text', x: cx, y: cy, text: M.loc(text), size, color: opts.color || this.color };
      const b = bbox(o);
      mapObj(o, (x, y) => [x + (b[2] - b[0]) / 2, y - (b[3] - b[1]) / 2]);
      return this.add(o);
    }
    /** رسم دالة على المستوى الإحداثي للسبورة: expr مثل «٢س + ١» أو «ص = س²» */
    addGraph(expr, opts) {
      opts = opts || {};
      const src = String(expr).replace(/^\s*(ص|y)\s*=\s*/, '');
      try { const ast = M.math.parse(src); if ([...M.math.variables(ast)].some((v) => v !== 'x')) throw new Error('الدالة يجب أن تكون بدلالة س فقط'); } catch (e) { M.toast('تعذّر رسم الدالة: ' + e.message, { type: 'warn' }); return null; }
      if (this.page.bg !== 'coord') { this.page.bg = 'coord'; M.emit('page', { index: this.pi, count: this.pages.length, bg: 'coord' }); }
      const used = this.objects.filter((o) => o.type === 'fn').length;
      const cols = ['c4', 'c5', 'c6', 'c2', 'c7', 'c3'];
      const o = this.add({ type: 'fn', expr: src, label: opts.label || `${M.varName('y')} = ${M.loc(src)}`, color: opts.color || cols[used % cols.length], width: opts.width || 3 });
      if (opts.focus !== false) { this.view.x = this.w / 2; this.view.y = this.h / 2; this.view.s = 1; this.saveView && this.saveView(); M.emit('zoom', 1); this.requestRender(); }
      return o;
    }
    /** تمثيل متباينة على المستوى الإحداثي: ص > د(س) أو متباينة بدلالة س فقط */
    addInequality(text, opts) {
      opts = opts || {};
      const E = M.math;
      let rel;
      try { rel = E.parseRelation(String(text)); } catch (e) { M.toast('تعذّر فهم المتباينة: ' + e.message, { type: 'warn' }); return null; }
      if (!rel.rel || rel.rel === '=' || rel.rel === '!=') { M.toast('اكتب متباينة فيها < أو > أو ≤ أو ≥', { type: 'warn' }); return null; }
      const vars = new Set(); E.variables(rel.lhs, vars); E.variables(rel.rhs, vars);
      if (this.page.bg !== 'coord') { this.page.bg = 'coord'; M.emit('page', { index: this.pi, count: this.pages.length, bg: 'coord' }); }
      const used = this.objects.filter((o) => o.type === 'fn' || o.type === 'xregion').length;
      const cols = ['c3', 'c4', 'c5', 'c6', 'c2', 'c7'];
      const color = opts.color || cols[used % cols.length];
      const label = M.prettyPow(M.loc(String(text).replace(/<=/g, '≤').replace(/>=/g, '≥')));
      const test = (v) => (rel.rel === '<' ? v < 0 : rel.rel === '>' ? v > 0 : rel.rel === '<=' ? v <= 1e-9 : v >= -1e-9);
      const g = E.compile({ t: 'op', op: '-', a: rel.lhs, b: { t: 'paren', a: rel.rhs } });
      let o;
      if (!vars.has('y')) {
        const sol = M.assistCore.solveIneq(text);
        o = this.add({ type: 'xregion', intervals: sol.intervals, inclusive: sol.inclusive, label, color, width: 3 });
      } else {
        // الحد: ص = د(س)
        let expr;
        if (rel.lhs.t === 'var' && rel.lhs.n === 'y' && !E.variables(rel.rhs).has('y')) expr = E.toText(rel.rhs, false);
        else if (rel.rhs.t === 'var' && rel.rhs.n === 'y' && !E.variables(rel.lhs).has('y')) expr = E.toText(rel.lhs, false);
        else {
          try { const r = E.solveForVar({ lhs: rel.lhs, rhs: rel.rhs, rel: '=' }, 'x', vars); expr = M.htmlToPlain(r.answer).replace(/^.*?=/, ''); } catch (e) { M.toast('أستطيع تمثيل المتباينات الخطية في ص أو بصورة ص > د(س)', { type: 'warn' }); return null; }
        }
        expr = M.htmlToPlain(String(expr));
        const f = E.compile(E.parse(expr));
        // أي جانب يحقق المتباينة؟ نختبر نقطة فوق الحد
        let x0 = 0.37, y0 = f(x0);
        if (!Number.isFinite(y0)) { x0 = 1.37; y0 = f(x0); }
        const aboveOK = test(g(x0, { y: y0 + 1 }));
        const strict = rel.rel === '<' || rel.rel === '>';
        o = this.add({ type: 'fn', expr, ineq: (aboveOK ? '>' : '<') + (strict ? '' : '='), label, color, width: 3 });
      }
      if (opts.focus !== false) { this.view.x = this.w / 2; this.view.y = this.h / 2; this.view.s = 1; this.saveView && this.saveView(); M.emit('zoom', 1); this.requestRender(); }
      return o;
    }
    addImage(src, w, h, opts) {
      opts = opts || {};
      const [cx, cy] = this.viewCenter();
      const maxW = (this.w * 0.6) / this.view.s, maxH = (this.h * 0.6) / this.view.s;
      const k = Math.min(1, maxW / w, maxH / h);
      w *= k; h *= k;
      const o = this.add({ type: 'image', src, x: cx - w / 2, y: cy - h / 2, w, h });
      this.setTool('select');
      this.selected = new Set([o.id]);
      this.emitSelection();
      M.emit('tool', 'select');
      return o;
    }

    commit() {
      const p = this.page;
      p.undo.push(JSON.stringify(p.objects));
      if (p.undo.length > 80) p.undo.shift();
      p.redo = [];
    }
    undo() {
      const p = this.page;
      if (!p.undo.length) return M.toast('لا يوجد ما يمكن التراجع عنه');
      p.redo.push(JSON.stringify(p.objects));
      p.objects = JSON.parse(p.undo.pop());
      this.selected.clear(); this.emitSelection();
      this.changed();
    }
    redo() {
      const p = this.page;
      if (!p.redo.length) return;
      p.undo.push(JSON.stringify(p.objects));
      p.objects = JSON.parse(p.redo.pop());
      this.changed();
    }
    clearPage() {
      if (!this.objects.length) return;
      this.commit();
      this.page.objects = [];
      this.selected.clear(); this.emitSelection();
      this.changed();
      M.toast('تم مسح الصفحة', { action: { label: 'تراجع', fn: () => this.undo() } });
    }
    changed() {
      this.requestRender();
      M.emit('board-change');
      this.saveSoon();
    }

    /* ---------- الصفحات ---------- */
    addPage(bg) {
      this.pages.splice(this.pi + 1, 0, this.newPage(bg || this.page.bg));
      this.gotoPage(this.pi + 1);
      this.resetView();
    }
    duplicatePage() {
      const p = this.newPage(this.page.bg);
      p.objects = JSON.parse(JSON.stringify(this.objects));
      this.pages.splice(this.pi + 1, 0, p);
      this.gotoPage(this.pi + 1);
    }
    deletePage() {
      if (this.pages.length === 1) { this.clearPage(); return; }
      const removed = this.pages.splice(this.pi, 1)[0];
      const idx = this.pi;
      this.gotoPage(Math.min(this.pi, this.pages.length - 1));
      M.toast('تم حذف الصفحة', { action: { label: 'تراجع', fn: () => { this.pages.splice(idx, 0, removed); this.gotoPage(idx); } } });
    }
    gotoPage(i) {
      if (this.textEditor) this.commitText();
      this.pi = M.clamp(i, 0, this.pages.length - 1);
      this.selected.clear(); this.emitSelection();
      M.emit('page', { index: this.pi, count: this.pages.length, bg: this.page.bg });
      this.changed();
    }
    setBackground(bg) { this.page.bg = bg; M.emit('page', { index: this.pi, count: this.pages.length, bg }); this.changed(); }

    /* ---------- التكبير ---------- */
    zoomAt(f, sx, sy, silent) {
      const s = M.clamp(this.view.s * f, 0.15, 8);
      f = s / this.view.s;
      this.view.x = sx - (sx - this.view.x) * f;
      this.view.y = sy - (sy - this.view.y) * f;
      this.view.s = s;
      this.requestRender();
      M.emit('zoom', s);
      if (!silent) this.saveView();
    }
    zoomBy(f) { this.zoomAt(f, this.w / 2, this.h / 2); }
    resetView() { this.view = { x: this.w / 2, y: this.h / 2, s: 1 }; M.emit('zoom', 1); this.requestRender(); this.saveView(); }
    fitContent() {
      const b = contentBBox(this.objects);
      if (!b) return this.resetView();
      const pad = 60;
      const s = M.clamp(Math.min((this.w - pad * 2) / (b[2] - b[0] || 1), (this.h - pad * 2) / (b[3] - b[1] || 1)), 0.15, 1.5);
      this.view.s = s;
      this.view.x = this.w / 2 - ((b[0] + b[2]) / 2) * s;
      this.view.y = this.h / 2 - ((b[1] + b[3]) / 2) * s;
      M.emit('zoom', s);
      this.requestRender();
    }

    /* ---------- الرسم ---------- */
    render() {
      this.dirty = false;
      const ctx = this.ctx, dpr = this.dpr || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawScene(ctx, this.view, this.w, this.h, this.page, true);
      // الليزر
      const now = performance.now();
      this.laser = this.laser.filter((p) => now - p.t < 900);
      if (this.laser.length > 1) {
        ctx.save();
        ctx.lineCap = ctx.lineJoin = 'round';
        for (let i = 1; i < this.laser.length; i++) {
          const a = this.laser[i - 1], b = this.laser[i];
          const age = 1 - (now - b.t) / 900;
          ctx.strokeStyle = `rgba(255,60,60,${age})`;
          ctx.shadowColor = 'rgba(255,40,40,.9)';
          ctx.shadowBlur = 12;
          ctx.lineWidth = 4 * age + 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        ctx.restore();
      }
      // مؤشرات الأدوات
      if (this.hover && (this.tool === 'eraser' || this.tool === 'laser')) {
        const [sx, sy] = this.toScreen(...this.hover);
        ctx.save();
        if (this.tool === 'eraser') {
          ctx.strokeStyle = this.isLight ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.6)';
          ctx.setLineDash([4, 3]);
          ctx.beginPath(); ctx.arc(sx, sy, Math.max(8, this.width * 3), 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.fillStyle = '#ff3c3c'; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 16;
          ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
    }

    drawScene(ctx, view, w, h, page, interactive) {
      const bgc = BG_COLORS[M.settings.theme] || BG_COLORS.chalk;
      ctx.save();
      ctx.fillStyle = bgc;
      ctx.fillRect(0, 0, w, h);
      this.drawBackground(ctx, view, w, h, page.bg);
      ctx.translate(view.x, view.y);
      ctx.scale(view.s, view.s);
      for (const o of page.objects) this.drawObj(ctx, o, view.s);
      if (interactive) {
        if (this.cur) this.drawObj(ctx, this.cur.type === 'stroke' ? this.cur : this.finalizeShape(Object.assign({}, this.cur)), view.s, true);
        this.extra.forEach((v) => { if (v.s) this.drawObj(ctx, v.s, view.s, true); });
        if (this.tool === 'angle' && this.angleClicks.length && this.hover) {
          const pts = this.angleClicks.concat([this.hover]);
          if (pts.length === 3) this.drawObj(ctx, { type: 'angle', p: pts, color: this.color, width: this.width }, view.s, true);
          else {
            ctx.strokeStyle = this.colorOf(this.color); ctx.lineWidth = this.width; ctx.setLineDash([6, 6]);
            ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke(); ctx.setLineDash([]);
          }
          ctx.fillStyle = this.colorOf(this.color);
          this.angleClicks.forEach((p) => { ctx.beginPath(); ctx.arc(p[0], p[1], 4 / view.s, 0, Math.PI * 2); ctx.fill(); });
        }
        // التحديد
        const b = this.selBBox();
        if (b) {
          const pad = 6 / view.s;
          ctx.save();
          ctx.strokeStyle = '#38c9b4'; ctx.lineWidth = 1.5 / view.s; ctx.setLineDash([6 / view.s, 4 / view.s]);
          ctx.strokeRect(b[0] - pad, b[1] - pad, b[2] - b[0] + pad * 2, b[3] - b[1] + pad * 2);
          ctx.setLineDash([]);
          ctx.fillStyle = '#38c9b4';
          ctx.beginPath(); ctx.arc(b[2] + pad, b[3] + pad, 6 / view.s, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        if (this.marquee) {
          const [x1, y1, x2, y2] = this.marquee;
          ctx.save();
          ctx.fillStyle = 'rgba(56,201,180,.08)'; ctx.strokeStyle = 'rgba(56,201,180,.8)'; ctx.lineWidth = 1 / view.s;
          ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
          ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
          ctx.restore();
        }
      }
      ctx.restore();
    }

    drawBackground(ctx, view, w, h, bg) {
      if (bg === 'plain') return;
      const u = this.unit * view.s;
      const light = this.isLight;
      const minor = light ? 'rgba(30,60,110,.10)' : 'rgba(255,255,255,.07)';
      const major = light ? 'rgba(30,60,110,.22)' : 'rgba(255,255,255,.16)';
      let step = u;
      let every = 5;
      while (step < 14) { step *= 5; }
      const ox = ((view.x % step) + step) % step, oy = ((view.y % step) + step) % step;
      ctx.save();
      if (bg === 'grid' || bg === 'coord') {
        ctx.lineWidth = 1;
        for (let x = ox, i = Math.round((ox - view.x) / step); x < w; x += step, i++) {
          ctx.strokeStyle = i % every === 0 ? major : minor;
          ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); ctx.stroke();
        }
        for (let y = oy, i = Math.round((oy - view.y) / step); y < h; y += step, i++) {
          ctx.strokeStyle = i % every === 0 ? major : minor;
          ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); ctx.stroke();
        }
      } else if (bg === 'dots') {
        ctx.fillStyle = major;
        for (let x = ox; x < w; x += step) for (let y = oy; y < h; y += step) { ctx.beginPath(); ctx.arc(x, y, 1.4, 0, Math.PI * 2); ctx.fill(); }
      } else if (bg === 'lines') {
        ctx.strokeStyle = major;
        const ls = step * 1.5, oyy = ((view.y % ls) + ls) % ls;
        for (let y = oyy; y < h; y += ls) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
        ctx.strokeStyle = light ? 'rgba(214,51,108,.35)' : 'rgba(255,123,156,.35)';
        ctx.beginPath(); ctx.moveTo(w - 70, 0); ctx.lineTo(w - 70, h); ctx.stroke();
      } else if (bg === 'iso') {
        ctx.fillStyle = major;
        const hs = step * Math.sqrt(3) / 2;
        const oyy = ((view.y % (hs * 2)) + hs * 2) % (hs * 2);
        for (let y = oyy - hs * 2, r = 0; y < h + hs; y += hs, r++) {
          const shift = r % 2 ? step / 2 : 0;
          for (let x = ox - step + shift; x < w + step; x += step) { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill(); }
        }
      } else if (bg === 'polar') {
        const [cx, cy] = [view.x, view.y];
        ctx.strokeStyle = minor;
        const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
        for (let r = step, i = 1; r < maxR; r += step, i++) { ctx.strokeStyle = i % every === 0 ? major : minor; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
        for (let a = 0; a < 360; a += 15) {
          ctx.strokeStyle = a % 90 === 0 ? major : minor;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + maxR * Math.cos((a * Math.PI) / 180), cy - maxR * Math.sin((a * Math.PI) / 180)); ctx.stroke();
          if (a % 30 === 0) {
            ctx.fillStyle = major; ctx.font = `12px ${M.fontFamily()}`; ctx.textAlign = 'center';
            const rr = Math.min(w, h) * 0.42;
            ctx.fillText(M.loc(a) + '°', cx + rr * Math.cos((a * Math.PI) / 180), cy - rr * Math.sin((a * Math.PI) / 180));
          }
        }
      }
      if (bg === 'coord') {
        const axis = light ? 'rgba(20,35,60,.75)' : 'rgba(255,255,255,.7)';
        ctx.strokeStyle = axis; ctx.fillStyle = axis; ctx.lineWidth = 1.6;
        const X0 = view.x, Y0 = view.y;
        ctx.beginPath(); ctx.moveTo(0, Y0); ctx.lineTo(w, Y0); ctx.moveTo(X0, 0); ctx.lineTo(X0, h); ctx.stroke();
        // رؤوس الأسهم
        ctx.beginPath(); ctx.moveTo(w - 2, Y0); ctx.lineTo(w - 12, Y0 - 5); ctx.lineTo(w - 12, Y0 + 5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(X0, 2); ctx.lineTo(X0 - 5, 12); ctx.lineTo(X0 + 5, 12); ctx.fill();
        ctx.font = `bold 15px ${M.fontFamily()}`; ctx.textAlign = 'center';
        ctx.fillText(M.varName('x'), w - 14, Y0 - 12);
        ctx.fillText(M.varName('y'), X0 + 14, 18);
        // تسميات
        let lab = 1;
        while (lab * u < 34) lab = lab === 1 ? 2 : lab === 2 ? 5 : lab * 2;
        ctx.font = `12px ${M.fontFamily()}`;
        const x0 = Math.ceil(-view.x / (lab * u)), x1 = Math.floor((w - view.x) / (lab * u));
        for (let i = x0; i <= x1; i++) {
          if (!i) continue;
          const x = X0 + i * lab * u;
          ctx.beginPath(); ctx.moveTo(x, Y0 - 4); ctx.lineTo(x, Y0 + 4); ctx.stroke();
          ctx.textAlign = 'center';
          ctx.fillText(M.loc(i * lab), x, Y0 + 17);
        }
        const y0 = Math.ceil(-view.y / (lab * u)), y1 = Math.floor((h - view.y) / (lab * u));
        for (let i = y0; i <= y1; i++) {
          if (!i) continue;
          const y = Y0 + i * lab * u;
          ctx.beginPath(); ctx.moveTo(X0 - 4, y); ctx.lineTo(X0 + 4, y); ctx.stroke();
          ctx.textAlign = 'right';
          ctx.fillText(M.loc(-i * lab), X0 - 8, y + 4);
        }
        ctx.textAlign = 'right';
        ctx.fillText(M.loc(0), X0 - 6, Y0 + 16);
      }
      ctx.restore();
    }

    drawObj(ctx, o, s, preview) {
      const col = this.colorOf(o.color);
      ctx.save();
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = o.width || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (o.dash) ctx.setLineDash([o.width * 3, o.width * 2.5]);
      const fillShape = () => {
        if (o.fill) { ctx.save(); ctx.globalAlpha = 0.22; ctx.fill(); ctx.restore(); }
        ctx.stroke();
      };
      switch (o.type) {
        case 'stroke': {
          const p = o.pts;
          ctx.globalAlpha = o.alpha || 1;
          if (o.hl) ctx.lineCap = 'butt';
          ctx.beginPath();
          ctx.moveTo(p[0][0], p[0][1]);
          if (p.length < 3) { for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); }
          else {
            for (let i = 1; i < p.length - 1; i++) {
              const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2;
              ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my);
            }
            ctx.lineTo(p[p.length - 1][0], p[p.length - 1][1]);
          }
          ctx.stroke();
          break;
        }
        case 'line':
          ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
          break;
        case 'arrow': {
          ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
          ctx.setLineDash([]);
          const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), hl = 10 + o.width * 2.2;
          ctx.beginPath();
          ctx.moveTo(o.x2, o.y2);
          ctx.lineTo(o.x2 - hl * Math.cos(a - 0.42), o.y2 - hl * Math.sin(a - 0.42));
          ctx.lineTo(o.x2 - hl * Math.cos(a + 0.42), o.y2 - hl * Math.sin(a + 0.42));
          ctx.closePath(); ctx.fill();
          break;
        }
        case 'rect':
          ctx.beginPath(); ctx.rect(Math.min(o.x1, o.x2), Math.min(o.y1, o.y2), Math.abs(o.x2 - o.x1), Math.abs(o.y2 - o.y1));
          fillShape();
          break;
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse((o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2, Math.abs(o.x2 - o.x1) / 2, Math.abs(o.y2 - o.y1) / 2, 0, 0, Math.PI * 2);
          fillShape();
          break;
        case 'poly':
          ctx.beginPath();
          o.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.closePath();
          fillShape();
          if (o.rightAngle) {
            const [a, b, c] = o.pts;
            const k = Math.min(16, dist(a[0], a[1], b[0], b[1]) / 4, dist(c[0], c[1], b[0], b[1]) / 4);
            const ux = Math.sign(a[0] - b[0]) || 0, uy = Math.sign(a[1] - b[1]) || 0;
            const vx = Math.sign(c[0] - b[0]) || 0, vy = Math.sign(c[1] - b[1]) || 0;
            ctx.setLineDash([]); ctx.lineWidth = Math.max(1, o.width * 0.6);
            ctx.beginPath(); ctx.moveTo(b[0] + ux * k, b[1] + uy * k); ctx.lineTo(b[0] + ux * k + vx * k, b[1] + uy * k + vy * k); ctx.lineTo(b[0] + vx * k, b[1] + vy * k); ctx.stroke();
          }
          break;
        case 'compass': {
          const r = dist(o.x1, o.y1, o.x2, o.y2);
          ctx.beginPath(); ctx.arc(o.x1, o.y1, r, 0, Math.PI * 2); fillShape();
          ctx.setLineDash([5, 5]); ctx.lineWidth = Math.max(1, o.width * 0.5);
          ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(o.x1, o.y1, 3 + o.width * 0.6, 0, Math.PI * 2); ctx.fill();
          this.label(ctx, 'نق = ' + M.fmt(r / this.unit, 2), (o.x1 + o.x2) / 2, (o.y1 + o.y2) / 2 - 10, col, s);
          break;
        }
        case 'measure': {
          ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
          const a = Math.atan2(o.y2 - o.y1, o.x2 - o.x1), t = 8;
          ctx.setLineDash([]);
          [[o.x1, o.y1], [o.x2, o.y2]].forEach(([x, y]) => {
            ctx.beginPath(); ctx.moveTo(x - t * Math.sin(a), y + t * Math.cos(a)); ctx.lineTo(x + t * Math.sin(a), y - t * Math.cos(a)); ctx.stroke();
          });
          const L = dist(o.x1, o.y1, o.x2, o.y2) / this.unit;
          this.label(ctx, M.fmt(L, 2) + ' وحدة', (o.x1 + o.x2) / 2 - 16 * Math.sin(a), (o.y1 + o.y2) / 2 + 16 * Math.cos(a) * -1, col, s);
          break;
        }
        case 'angle': {
          const [A, B, C] = o.p;
          ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.stroke();
          const a1 = Math.atan2(A[1] - B[1], A[0] - B[0]), a2 = Math.atan2(C[1] - B[1], C[0] - B[0]);
          let diff = a2 - a1;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          const deg = Math.abs((diff * 180) / Math.PI);
          const r = Math.min(40, dist(A[0], A[1], B[0], B[1]) / 2, dist(C[0], C[1], B[0], B[1]) / 2);
          ctx.setLineDash([]); ctx.lineWidth = Math.max(1, o.width * 0.7);
          ctx.save(); ctx.globalAlpha = 0.18;
          ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.arc(B[0], B[1], r, a1, a1 + diff, diff < 0); ctx.closePath(); ctx.fill();
          ctx.restore();
          if (Math.abs(deg - 90) < 0.5) {
            const k = r * 0.5;
            ctx.beginPath();
            ctx.moveTo(B[0] + k * Math.cos(a1), B[1] + k * Math.sin(a1));
            ctx.lineTo(B[0] + k * Math.cos(a1) + k * Math.cos(a2), B[1] + k * Math.sin(a1) + k * Math.sin(a2));
            ctx.lineTo(B[0] + k * Math.cos(a2), B[1] + k * Math.sin(a2));
            ctx.stroke();
          } else { ctx.beginPath(); ctx.arc(B[0], B[1], r, a1, a1 + diff, diff < 0); ctx.stroke(); }
          const mid = a1 + diff / 2;
          this.label(ctx, M.fmt(deg, 1) + '°', B[0] + (r + 22) * Math.cos(mid), B[1] + (r + 22) * Math.sin(mid), col, s);
          ctx.beginPath(); ctx.arc(B[0], B[1], 3, 0, Math.PI * 2); ctx.fill();
          break;
        }
        case 'text': {
          ctx.font = `${o.bold ? 'bold ' : ''}${o.size}px ${M.fontFamily()}`;
          ctx.textBaseline = 'top';
          ctx.direction = 'rtl';
          ctx.textAlign = 'right';
          const lines = o.text.split('\n');
          const b = bbox(o);
          lines.forEach((ln, i) => ctx.fillText(ln, b[2], o.y + i * o.size * 1.35));
          break;
        }
        case 'fn': {
          // المدى المرئي من مصفوفة التحويل الحالية (يعمل أيضاً عند التصدير)
          const m = ctx.getTransform().inverse(), cw = ctx.canvas.width;
          const wx0 = m.a * 0 + m.e, wx1 = m.a * cw + m.e;
          const u = this.unit, step = Math.max(0.5, (wx1 - wx0) / 700);
          const segs = fnPoints(o, u, Math.min(wx0, wx1), Math.max(wx0, wx1), step);
          if (o.ineq) {
            // تظليل منطقة الحل فوق المنحنى أو تحته (ص للأعلى رياضياً = للأسفل في إحداثيات العالم)
            const my0 = m.d * 0 + m.f, my1 = m.d * ctx.canvas.height + m.f;
            const above = o.ineq[0] === '>', edge = above ? Math.min(my0, my1) : Math.max(my0, my1);
            ctx.save(); ctx.globalAlpha = 0.2;
            segs.forEach((sg) => { ctx.beginPath(); sg.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.lineTo(sg[sg.length - 1][0], edge); ctx.lineTo(sg[0][0], edge); ctx.closePath(); ctx.fill(); });
            ctx.restore();
            if (o.ineq.length === 1) ctx.setLineDash([10 / s, 7 / s]);
          }
          ctx.lineWidth = o.width || 3;
          segs.forEach((sg) => { ctx.beginPath(); sg.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); });
          if (o.label && segs.length) {
            // التسمية قرب نهاية الجزء المرئي من المنحنى
            const my0 = m.d * 0 + m.f, my1 = m.d * ctx.canvas.height + m.f;
            const vis = segs.flat().filter(([x, y]) => y > Math.min(my0, my1) + 30 / s && y < Math.max(my0, my1) - 30 / s && x < Math.max(wx0, wx1) - 60 / s);
            const pt = o.domain ? vis[vis.length - 1] : vis[Math.floor(vis.length * 0.82)] || vis[vis.length - 1];
            if (pt) {
              const fs = 17 / s;
              ctx.font = `bold ${fs}px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              const txt = M.prettyPow(M.loc(o.label)), tw = ctx.measureText(txt).width;
              const lx = pt[0] + (o.domain ? tw / 2 + 10 / s : 0), ly = pt[1] - 22 / s;
              ctx.fillStyle = this.isLight ? 'rgba(255,255,255,.88)' : 'rgba(10,18,26,.75)';
              roundRect(ctx, lx - tw / 2 - 7 / s, ly - fs * 0.75, tw + 14 / s, fs * 1.5, 7 / s); ctx.fill();
              ctx.fillStyle = col; ctx.fillText(txt, lx, ly + 1 / s);
            }
          }
          break;
        }
        case 'circ': case 'fntan': case 'vis': if (M.geoTypes && M.geoTypes[o.type]) M.geoTypes[o.type].draw(ctx, o, this, s); break;
        case 'xregion': {
          // منطقة حل متباينة بدلالة س: أشرطة رأسية مظللة
          const m = ctx.getTransform().inverse(), cw = ctx.canvas.width, chh = ctx.canvas.height;
          const wx0 = m.e, wx1 = m.a * cw + m.e, wy0 = m.f, wy1 = m.d * chh + m.f, u = this.unit;
          const clampX = (v) => (v === Infinity ? Math.max(wx0, wx1) + 10 : v === -Infinity ? Math.min(wx0, wx1) - 10 : v * u);
          (o.intervals || []).forEach(([a, b]) => {
            const xa = clampX(a), xb = clampX(b);
            ctx.save(); ctx.globalAlpha = 0.2; ctx.fillRect(Math.min(xa, xb), Math.min(wy0, wy1), Math.abs(xb - xa), Math.abs(wy1 - wy0)); ctx.restore();
            ctx.lineWidth = o.width || 3;
            if (!o.inclusive) ctx.setLineDash([10 / s, 7 / s]);
            [a, b].filter(Number.isFinite).forEach((v) => { ctx.beginPath(); ctx.moveTo(v * u, wy0); ctx.lineTo(v * u, wy1); ctx.stroke(); });
            ctx.setLineDash([]);
          });
          if (o.label) {
            const iv = (o.intervals || [])[0];
            if (iv) {
              const cx = (clampX(iv[0]) + clampX(iv[1])) / 2, fs = 17 / s, ty = Math.min(wy0, wy1) + 40 / s;
              ctx.font = `bold ${fs}px ${M.fontFamily()}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              const txt = M.loc(o.label), tw = ctx.measureText(txt).width;
              ctx.fillStyle = this.isLight ? 'rgba(255,255,255,.88)' : 'rgba(10,18,26,.75)'; roundRect(ctx, cx - tw / 2 - 7 / s, ty - fs * 0.75, tw + 14 / s, fs * 1.5, 7 / s); ctx.fill();
              ctx.fillStyle = col; ctx.fillText(txt, cx, ty);
            }
          }
          break;
        }
        case 'image': {
          let img = this.images[o.src];
          if (!img) {
            img = new Image();
            img.onload = () => this.requestRender();
            img.src = o.src;
            this.images[o.src] = img;
          }
          if (img.complete && img.naturalWidth) ctx.drawImage(img, o.x, o.y, o.w, o.h);
          else { ctx.strokeStyle = 'rgba(128,128,128,.5)'; ctx.strokeRect(o.x, o.y, o.w, o.h); }
          break;
        }
      }
      ctx.restore();
    }

    label(ctx, txt, x, y, col, s) {
      ctx.save();
      ctx.setLineDash([]);
      const fs = 14 / Math.max(0.6, Math.min(1.6, s));
      ctx.font = `bold ${fs}px ${M.fontFamily()}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.direction = 'rtl';
      const w = ctx.measureText(txt).width + 12;
      ctx.fillStyle = this.isLight ? 'rgba(255,255,255,.9)' : 'rgba(10,20,25,.75)';
      roundRect(ctx, x - w / 2, y - fs * 0.8, w, fs * 1.6, 6); ctx.fill();
      ctx.fillStyle = col;
      ctx.fillText(txt, x, y + 1);
      ctx.restore();
    }

    /* ---------- التصدير ---------- */
    renderPageToCanvas(page, scale, pad) {
      page = page || this.page;
      scale = scale || 2; pad = pad == null ? 50 : pad;
      let b = contentBBox(page.objects);
      if (!b) { const [x0, y0] = this.toWorld(0, 0), [x1, y1] = this.toWorld(this.w, this.h); b = [x0, y0, x1, y1]; }
      const w = (b[2] - b[0] + pad * 2), h = (b[3] - b[1] + pad * 2);
      const k = Math.min(scale, 4000 / w, 4000 / h);
      const cv = document.createElement('canvas');
      cv.width = Math.round(w * k); cv.height = Math.round(h * k);
      const ctx = cv.getContext('2d');
      ctx.scale(k, k);
      this.drawScene(ctx, { x: -b[0] + pad, y: -b[1] + pad, s: 1 }, w, h, page, false);
      return cv;
    }
    exportPNG() {
      const cv = this.renderPageToCanvas(null, 2);
      cv.toBlob((blob) => blob && M.saveFile(`مداد-صفحة-${this.pi + 1}.png`, blob, 'image/png'), 'image/png');
    }
    /** لقطة من المنطقة المرئية (للذكاء الاصطناعي) */
    snapshot(maxSide) {
      maxSide = maxSide || 1400;
      const k = Math.min(1.5, maxSide / Math.max(this.w, this.h));
      const cv = document.createElement('canvas');
      cv.width = Math.round(this.w * k); cv.height = Math.round(this.h * k);
      const ctx = cv.getContext('2d');
      ctx.scale(k, k);
      this.drawScene(ctx, this.view, this.w, this.h, this.page, false);
      return cv.toDataURL('image/jpeg', 0.85);
    }
    toJSON() {
      return { app: 'midad', version: M.APP.version, pages: this.pages.map((p) => ({ objects: p.objects, bg: p.bg, space3d: p.space3d, prevBg: p.prevBg })) };
    }
    fromJSON(data) {
      if (!data || !Array.isArray(data.pages) || !data.pages.length) throw new Error('ملف غير صالح');
      this.pages = data.pages.map((p) => Object.assign(this.newPage(p.bg), { objects: p.objects || [], space3d: p.space3d, prevBg: p.prevBg }));
      this.gotoPage(0);
      this.fitContent();
    }
    saveSoon() {
      clearTimeout(this._saveT);
      this._saveT = setTimeout(() => {
        const ok = M.store.set('board', { pages: this.pages.map((p) => ({ objects: p.objects, bg: p.bg })), pi: this.pi });
        if (!ok && !this._warned) { this._warned = true; M.toast('تعذّر الحفظ التلقائي (المساحة ممتلئة) — احفظ ملفاً من قائمة الحفظ', { type: 'warn', time: 5000 }); }
      }, 600);
    }
    saveView() { M.store.set('view', this.view); }
    load() {
      const d = M.store.get('board', null);
      if (d && Array.isArray(d.pages) && d.pages.length) {
        this.pages = d.pages.map((p) => Object.assign(this.newPage(p.bg), { objects: p.objects || [] }));
        this.pi = M.clamp(d.pi || 0, 0, this.pages.length - 1);
      }
      else this.seedWelcome();
      const v = M.store.get('view', null);
      if (v && Number.isFinite(v.s)) { this.view = v; this._viewLoaded = true; }
    }
    /** صفحة ترحيب مع مثال عند أول تشغيل */
    seedWelcome() {
      const t = (text, x, y, size, color, bold) => ({ id: uid(), type: 'text', x, y, text: M.loc(text), size, color, bold });
      this.page.objects = [
        t('أهلاً بك في مِداد ✨', 330, -250, 44, 'c1', true),
        t('اكتب مسألة بخط يدك بقلم الرياضيات ✍️ (W) وسأقرؤها وأحلّها فور توقفك،\nأو ارسم شكلاً باليد وسيتعرّف عليه تلقائياً. للبحث السريع اضغط Ctrl+K.', 330, -180, 22, 'c0'),
        t('مثال:  ٢س + ٣ = ١١', 330, -60, 34, 'c3'),
        { id: uid(), type: 'poly', pts: [[-40, 160], [-280, 160], [-280, -20]], color: 'c4', width: 3, fill: true, rightAngle: 1 },
        t('٤', -150, 172, 26, 'c4'), t('٣', -290, 50, 26, 'c4'), t('الوتر = ؟', -5, 25, 26, 'c4'),
        { id: uid(), type: 'angle', p: [[80, 160], [220, 160], [300, 20]], color: 'c2', width: 2.5 },
        { id: uid(), type: 'line', x1: 80, y1: 160, x2: 220, y2: 160, color: 'c2', width: 2.5 },
      ];
    }
  }

  function isTyping() {
    const a = document.activeElement;
    return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
  }
  M.isTyping = isTyping;

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  M.roundRect = roundRect;

  function bbox(o) {
    switch (o.type) {
      case 'stroke': case 'poly': {
        const p = o.pts;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const [x, y] of p) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
        const w = (o.width || 2) / 2;
        return [x0 - w, y0 - w, x1 + w, y1 + w];
      }
      case 'angle': {
        const xs = o.p.map((p) => p[0]), ys = o.p.map((p) => p[1]);
        return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      }
      case 'compass': {
        const r = dist(o.x1, o.y1, o.x2, o.y2);
        return [o.x1 - r, o.y1 - r, o.x1 + r, o.y1 + r];
      }
      case 'text': {
        measureCtx.font = `${o.bold ? 'bold ' : ''}${o.size}px ${M.fontFamily()}`;
        const lines = o.text.split('\n');
        const w = Math.max(...lines.map((l) => measureCtx.measureText(l).width));
        // x,y = الزاوية العليا اليمنى (اتجاه عربي)
        return [o.x - w, o.y, o.x, o.y + lines.length * o.size * 1.35];
      }
      case 'image': return [o.x, o.y, o.x + o.w, o.y + o.h];
      case 'circ': case 'fntan': case 'vis': return M.geoTypes && M.geoTypes[o.type] ? M.geoTypes[o.type].bbox(o) : [0, 0, 1, 1];
      case 'xregion': {
        const u = (M.board && M.board.unit) || 40, iv = o.intervals || [[0, 0]];
        return [Math.max(-10, Math.min(...iv.map((q) => q[0]))) * u, -10 * u, Math.min(10, Math.max(...iv.map((q) => q[1]))) * u, 10 * u];
      }
      case 'fn': {
        const u = (M.board && M.board.unit) || 40;
        const pts = fnPoints(o, u, -10 * u, 10 * u, u / 4).flat().filter(([, y]) => Math.abs(y) <= 10 * u);
        if (!pts.length) return [-10 * u, -10 * u, 10 * u, 10 * u];
        return [Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1])), Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1]))];
      }
      default: return [Math.min(o.x1, o.x2), Math.min(o.y1, o.y2), Math.max(o.x1, o.x2), Math.max(o.y1, o.y2)];
    }
  }
  function contentBBox(objs) {
    if (!objs.length) return null;
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    objs.forEach((o) => { const q = bbox(o); b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); });
    return b;
  }
  /** تطبيق تحويل على كل إحداثيات الكائن */
  function mapObj(o, f, k) {
    switch (o.type) {
      case 'stroke': case 'poly': o.pts = o.pts.map(([x, y]) => f(x, y)); if (k && o.type === 'stroke') o.width *= Math.min(k, 3); break;
      case 'angle': o.p = o.p.map(([x, y]) => f(x, y)); break;
      case 'text': { [o.x, o.y] = f(o.x, o.y); if (k) o.size = Math.max(6, o.size * k); break; }
      case 'image': { const [x1, y1] = f(o.x, o.y), [x2, y2] = f(o.x + o.w, o.y + o.h); o.x = x1; o.y = y1; o.w = x2 - x1; o.h = y2 - y1; break; }
      case 'fn': case 'xregion': break; // المنحنى مثبّت على المحاور
      case 'circ': { [o.cx, o.cy] = f(o.cx, o.cy); if (k) o.r = Math.max(8, o.r * k); break; }
      case 'fntan': break; // المماس مثبّت على منحناه
      case 'vis': { [o.x, o.y] = f(o.x, o.y); if (k) o.k = Math.max(0.1, (o.k || 1) * k); break; }
      default: { [o.x1, o.y1] = f(o.x1, o.y1); [o.x2, o.y2] = f(o.x2, o.y2); }
    }
  }

  M.Board = Board;
  M.boardUtil = { bbox, mapObj, contentBBox, PALETTES };
})();
