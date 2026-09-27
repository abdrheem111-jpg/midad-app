/* بيئة اختبار بسيطة لتشغيل ملفات مِداد في Node دون متصفح */
const path = require('path');
const store = {};
global.window = global;
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => (store[k] = String(v)), removeItem: (k) => delete store[k] };
global.getComputedStyle = () => ({ getPropertyValue: () => '' });
const fakeEl = () => ({ setAttribute() {}, getContext: () => ({ measureText: (t) => ({ width: String(t).length * 8 }) }), style: {}, appendChild() {}, querySelectorAll: () => [] });
global.document = { documentElement: fakeEl(), body: { dataset: {} }, createElement: fakeEl, addEventListener() {}, querySelector: () => null };
const ROOT = path.join(__dirname, '..');
function load(...files) { files.forEach((f) => require(path.join(ROOT, f))); return global.M; }
const strip = (s) => String(s == null ? '' : s)
  .replace(/<span class="mfrac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '$1/$2')
  .replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const west = (s) => global.M.toWestern(strip(s)).replace(/−/g, '-');
let pass = 0, fail = 0; const failures = [];
function check(name, ok, detail) { if (ok) pass++; else { fail++; failures.push(name + (detail ? '  →  ' + detail : '')); } }
function report(label) {
  console.log(`${label}: ${pass} ناجح، ${fail} فاشل`);
  failures.slice(0, 60).forEach((f) => console.log('  ✗ ' + f));
  return fail;
}
module.exports = { load, strip, west, check, report, get counts() { return { pass, fail }; } };
