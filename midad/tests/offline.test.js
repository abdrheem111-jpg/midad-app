/* التحقق من أن التطبيق يعمل دون إنترنت: كل الملفات مخزّنة في عامل الخدمة ولا روابط خارجية */
const T = require('./harness');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const scripts = [...idx.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
const fonts = fs.readdirSync(path.join(root, 'assets/fonts')).map((f) => 'assets/fonts/' + f);
const missing = scripts.concat(fonts, ['css/style.css']).filter((f) => !sw.includes(`'./${f}'`));
T.check('كل ملفات التطبيق في قائمة عامل الخدمة', missing.length === 0, missing.join(', '));
T.check('كل الملفات المذكورة موجودة فعلاً', [...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]).filter(Boolean).every((f) => fs.existsSync(path.join(root, f))));
// لا روابط خارجية في الصفحة أو الأنماط أو الشيفرة
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8') + fs.readFileSync(path.join(root, 'assets/fonts/fonts.css'), 'utf8');
const js = scripts.map((s) => fs.readFileSync(path.join(root, s), 'utf8')).join('\n');
const ext = (s) => (s.match(/(src|href)=["']https?:\/\/[^"']+|url\(["']?https?:\/\/[^)]+|import\s*\(\s*["']https?:|fetch\(\s*["']https?:/g) || []);
T.check('لا موارد خارجية في index.html', ext(idx).length === 0, ext(idx).join(' '));
T.check('لا موارد خارجية في الأنماط', ext(css).length === 0, ext(css).join(' '));
T.check('لا اتصال بخوادم خارجية في الشيفرة', ext(js).length === 0 && !/anthropic|api\.openai|googleapis/i.test(js), ext(js).join(' '));
process.exitCode = T.report('اختبار العمل دون إنترنت');
