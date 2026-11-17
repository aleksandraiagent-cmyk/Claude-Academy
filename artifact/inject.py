"""Inject fire-module.js/fire.css and hub-module.js/hub.css into academy-skills.html (idempotent)."""
import sys
p = sys.argv[1] if len(sys.argv) > 1 else 'academy-skills.html'
s = open(p, encoding='utf-8').read()
def rd(f): return open(f, encoding='utf-8').read().rstrip('\n')
FB, FE = '/* ===================== 🔥 Огоньки', '/* ===================== конец модуля огоньков ===================== */'
HB, HE = '/* ===================== 🌿 Древо навыков', '/* ===================== конец древа навыков ===================== */'
a = s.index(FB); b = s.index(FE) + len(FE); s = s[:a] + rd('fire-module.js') + s[b:]
if HB in s:
    a = s.index(HB); b = s.index(HE) + len(HE); s = s[:a] + rd('hub-module.js') + s[b:]
else:
    b = s.index(FE) + len(FE); s = s[:b] + '\n' + rd('hub-module.js') + s[b:]
def style(tag, css):
    global s
    open_t = '<style id="%s">\n' % tag
    if open_t in s:
        a = s.index(open_t) + len(open_t); b = s.index('</style>', a); s = s[:a] + css + '\n' + s[b:]
    else:
        a = s.index('<style id="fire-css">'); b = s.index('</style>', a) + len('</style>')
        s = s[:b] + '\n' + open_t + css + '\n</style>' + s[b:]
style('fire-css', rd('fire.css')); style('hub-css', rd('hub.css'))
open(p, 'w', encoding='utf-8').write(s); print(p, len(s.encode()))
