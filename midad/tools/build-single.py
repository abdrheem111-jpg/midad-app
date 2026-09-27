#!/usr/bin/env python3
"""يبني نسخة من مِداد في ملف HTML واحد (للنشر كصفحة claude.ai أو للمشاركة كملف واحد).
الاستخدام: python3 tools/build-single.py [مسار-الإخراج] [--fragment]
--fragment: بدون وسوم doctype/html/head/body (لمنصة claude.ai التي تضيفها تلقائياً)
"""
import base64, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
args = [a for a in sys.argv[1:] if not a.startswith('--')]
fragment = '--fragment' in sys.argv
out = pathlib.Path(args[0]) if args else root / 'dist' / 'midad.html'

html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css' / 'style.css').read_text(encoding='utf-8')
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
js = '\n'.join(f'<script>\n/* {s} */\n' + (root / s).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>' for s in scripts)

title = re.search(r'<title>.*?</title>', html).group(0)
# الخطوط مضمّنة كبيانات داخل الملف (تعمل دون إنترنت)
fdir = root / 'assets' / 'fonts'
fcss = (fdir / 'fonts.css').read_text(encoding='utf-8')
fcss = re.sub(r'url\(([^)]+\.woff2)\)', lambda m: 'url(data:font/woff2;base64,' + base64.b64encode((fdir / m.group(1)).read_bytes()).decode() + ')', fcss)
fonts = f'<style>\n{fcss}\n</style>'
body_attrs = re.search(r'<body([^>]*)>', html).group(1)
body = re.search(r'<body[^>]*>(.*)</body>', html, re.S).group(1)
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)

head = f'{title}\n{fonts}\n<style>\n{css}\n</style>'
if fragment:
    doc = f'{head}\n{body}\n{js}\n'
else:
    metas = '\n'.join(re.findall(r'<meta [^>]*>', html))
    doc = f'<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n{metas}\n{head}\n</head>\n<body{body_attrs}>\n{body}\n{js}\n</body>\n</html>\n'

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(doc, encoding='utf-8')
print(f'✓ {out} ({len(doc.encode()) // 1024} KB)')
