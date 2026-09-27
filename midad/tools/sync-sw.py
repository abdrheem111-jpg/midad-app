#!/usr/bin/env python3
"""يحدّث قائمة ملفات عامل الخدمة (sw.js) من index.html ومجلد الخطوط، ويرفع رقم الإصدار."""
import os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = open(os.path.join(root, 'index.html'), encoding='utf8').read()
scripts = re.findall(r'<script src="([^"]+)"', idx)
fonts = ['assets/fonts/' + f for f in sorted(os.listdir(os.path.join(root, 'assets/fonts')))]
files = ['./', './index.html', './manifest.webmanifest', './assets/icon.svg', './css/style.css'] + ['./' + f for f in fonts + scripts]
p = os.path.join(root, 'sw.js')
s = open(p, encoding='utf8').read()
s = re.sub(r"const FILES = \[.*?\];", "const FILES = [\n" + "".join("  '%s',\n" % f for f in files) + "];", s, flags=re.S)
s = re.sub(r"const CACHE = 'midad-v(\d+)';", lambda m: "const CACHE = 'midad-v%d';" % (int(m.group(1)) + 1), s)
open(p, 'w', encoding='utf8').write(s)
print('sw.js:', len(files), 'ملفاً')
