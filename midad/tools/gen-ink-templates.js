/*
 * يولّد قوالب التعرّف على الكتابة اليدوية من أشكال الحروف في عدة خطوط:
 * يرسم كل رمز، ثم يستخرج هيكله (خط المنتصف) بخوارزمية Zhang-Suen للترقيق،
 * ويحفظ نقاط الهيكل في js/ink-data.js
 * التشغيل: node tools/gen-ink-templates.js  (يتطلب خادماً محلياً على المنفذ 8765)
 */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const SYMBOLS = {
  '١': ['١'], '٢': ['٢'], '٣': ['٣'], '٤': ['٤'], '٥': ['٥'], '٦': ['٦'], '٧': ['٧'], '٨': ['٨'], '٩': ['٩'],
  '0': ['0'], '1': ['1'], '2': ['2'], '3': ['3'], '4': ['4'], '5': ['5'], '6': ['6'], '7': ['7'], '8': ['8'], '9': ['9'],
  '+': ['+'], '-': ['−'], '×': ['×'], '÷': ['÷'], '=': ['='], '(': ['('], ')': [')'], '/': ['/'],
  '<': ['<'], '>': ['>'], '√': ['√'], 'س': ['س', 'سـ'], 'ص': ['ص', 'صـ'], 'x': ['x', 'X'], 'y': ['y'], '٫': ['٫'],
};
const FONTS = ['Tajawal', 'Cairo', 'Almarai', 'Noto Naskh Arabic', 'Reem Kufi', 'DejaVu Sans', 'DejaVu Serif', 'FreeSerif', 'FreeSans', 'Liberation Sans', 'Liberation Serif'];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8765/index.html');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  const data = await page.evaluate(async ({ SYMBOLS, FONTS }) => {
    for (const f of FONTS) { try { await document.fonts.load(`64px "${f}"`, 'س١٢٣456'); } catch (e) { /* خط نظام */ } }
    const S = 96;
    const cv = document.createElement('canvas'); cv.width = cv.height = S * 2;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const out = {};
    // Zhang-Suen
    function thin(img, w, h) {
      const g = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : img[y * w + x]);
      let changed = true;
      while (changed) {
        changed = false;
        for (let pass = 0; pass < 2; pass++) {
          const del = [];
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (!img[y * w + x]) continue;
            const p = [g(x, y - 1), g(x + 1, y - 1), g(x + 1, y), g(x + 1, y + 1), g(x, y + 1), g(x - 1, y + 1), g(x - 1, y), g(x - 1, y - 1)];
            const B = p.reduce((a, b) => a + b, 0);
            if (B < 2 || B > 6) continue;
            let A = 0; for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) A++;
            if (A !== 1) continue;
            if (pass === 0 ? (p[0] * p[2] * p[4] === 0 && p[2] * p[4] * p[6] === 0) : (p[0] * p[2] * p[6] === 0 && p[0] * p[4] * p[6] === 0)) del.push(y * w + x);
          }
          del.forEach((i) => (img[i] = 0));
          if (del.length) changed = true;
        }
      }
      return img;
    }
    for (const [label, chars] of Object.entries(SYMBOLS)) {
      out[label] = [];
      for (const ch of chars) for (const font of FONTS) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = '#000';
        ctx.font = `${S}px "${font}"`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = 'ltr';
        // التحقق من أن الخط يحتوي الرمز (وليس بديلاً)
        ctx.fillText(ch, S, S);
        const id = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const W = cv.width, H = cv.height;
        let x0 = W, y0 = H, x1 = 0, y1 = 0;
        const bin = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) if (id[i * 4 + 3] > 110) { bin[i] = 1; const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 <= x0 && y1 <= y0) continue;
        // إزالة ذيل التطويل للأشكال الأولية
        if (ch.endsWith('ـ')) { /* نُبقي الشكل كما هو: يشبه طريقة الكتابة المتصلة */ }
        const sk = thin(bin, W, H);
        // تتبّع الهيكل إلى خطوط مرتبة (مسارات)
        const key = (x, y) => y * W + x;
        const on = new Set();
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (sk[key(x, y)]) on.add(key(x, y));
        if (on.size < 3) continue;
        const nbrs = (k) => { const x = k % W, y = (k / W) | 0; const r = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && on.has(key(x + dx, y + dy))) r.push(key(x + dx, y + dy)); return r; };
        const visited = new Set();
        const paths = [];
        const pickStart = () => { let best = null; for (const k of on) { if (visited.has(k)) continue; const n = nbrs(k).filter((q) => !visited.has(q)).length; if (n === 1) return k; if (best === null) best = k; } return best; };
        let guard = 0;
        while (visited.size < on.size && guard++ < 50) {
          const st = pickStart(); if (st === null) break;
          const path = [st]; visited.add(st);
          let cur = st, pdx = 0, pdy = 0;
          for (;;) {
            const cand = nbrs(cur).filter((q) => !visited.has(q));
            if (!cand.length) break;
            const cx = cur % W, cy = (cur / W) | 0;
            cand.sort((a, b) => { const da = (a % W - cx) * pdx + (((a / W) | 0) - cy) * pdy, db = (b % W - cx) * pdx + (((b / W) | 0) - cy) * pdy; return db - da; });
            const nx = cand[0]; pdx = nx % W - cx; pdy = ((nx / W) | 0) - cy;
            visited.add(nx); path.push(nx); cur = nx;
          }
          if (path.length >= 4) paths.push(path.map((k) => [k % W, (k / W) | 0]));
        }
        if (!paths.length) continue;
        // تبسيط كل مسار
        const simp = (pts, eps) => {
          if (pts.length < 3) return pts;
          let dm = 0, idx = 0; const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1]; const L = Math.hypot(bx - ax, by - ay) || 1;
          for (let i = 1; i < pts.length - 1; i++) { const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L; if (d > dm) { dm = d; idx = i; } }
          if (dm > eps) { const a = simp(pts.slice(0, idx + 1), eps), b = simp(pts.slice(idx), eps); return a.slice(0, -1).concat(b); }
          return [pts[0], pts[pts.length - 1]];
        };
        const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
        const sc = Math.max(w, h);
        const norm = paths.map((pth) => simp(pth, 1.2).map(([x, y]) => [+(((x - x0) - w / 2) / sc).toFixed(3), +(((y - y0) - h / 2) / sc).toFixed(3)]));
        out[label].push({ f: font, c: ch, a: +(w / h).toFixed(3), p: norm });
      }
    }
    return out;
  }, { SYMBOLS, FONTS });
  // حذف القوالب المكررة (خط لا يحتوي الرمز فيرسم بديلاً متطابقاً)
  let total = 0;
  for (const k of Object.keys(data)) {
    const seen = new Set();
    data[k] = data[k].filter((t) => { const sig = t.a + ':' + JSON.stringify(t.p).slice(0, 80); if (seen.has(sig)) return false; seen.add(sig); return true; });
    total += data[k].length;
  }
  const js = `/* قوالب التعرّف على الكتابة اليدوية — مولّدة آلياً بواسطة tools/gen-ink-templates.js من هياكل الحروف في ${FONTS.length} خطاً */\nwindow.M = window.M || {};\nM.inkData = ${JSON.stringify(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.map((t) => [t.a, t.p])])))};\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'js', 'ink-data.js'), js);
  console.log('قوالب:', total, 'حجم', Math.round(js.length / 1024), 'KB');
  Object.entries(data).forEach(([k, v]) => process.stdout.write(`${k}:${v.length} `));
  console.log();
  await browser.close();
})();
