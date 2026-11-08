#!/usr/bin/env python3
"""Rebuild vampire-garlic-heist-3d.html: one file that loads React and three.js from a CDN.
Keep the models/ folder next to it: it also writes models/models.js (the characters as base64, for hosts that can't serve .glb files)."""
import re, pathlib
root = pathlib.Path(__file__).parent
css = (root / 'styles.css').read_text(encoding='utf-8')
code = ['import * as THREE from \'three\';']
for name in ['config.js', 'i18n.js', 'audio.js', 'game.js', 'ui.js']:
    src = (root / 'src' / name).read_text(encoding='utf-8')
    src = re.sub(r"^import [^;]*? from '(\./[^']+|three)';\n", '', src, flags=re.M | re.S)
    src = re.sub(r'^export ', '', src, flags=re.M)
    if name == 'i18n.js': src += '\nconst tr = t; // game.js imports t as tr\n'
    code.append(f'// ----- src/{name} -----\n' + src)
html = f'''<meta charset="utf-8">
<title>Vampire Garlic Heist 3D</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700&family=Nunito+Sans:wght@400;700&display=swap" rel="stylesheet">
<style>
{css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script type="importmap">{{"imports":{{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.webgpu.min.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"}}}}</script>
<script type="module">
{chr(10).join(code)}
</script>
'''
import base64
data = {n: base64.b64encode((root / 'models' / f'{n}.glb').read_bytes()).decode() for n in ['bat', 'vampire']}
(root / 'models' / 'models.js').write_text('window.VGH_MODEL_DATA = ' + __import__('json').dumps(data) + ';\n', encoding='utf-8')
html = html.replace('<div id="root"></div>', '<div id="root"></div>\n<script src="models/models.js"></script>')
(root / 'vampire-garlic-heist-3d.html').write_text(html, encoding='utf-8')
print('wrote vampire-garlic-heist-3d.html', len(html), 'bytes')
