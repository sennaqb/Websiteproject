"""Build miami.html from the template plus the rendered base map and road data.

Pipeline (Census TIGER/Line 2023 data, public domain):
  python3 water.py  <tiger_dir> <out>/mask.png
  python3 base.py   <tiger_dir> <out>
  python3 roadmask.py <tiger_dir> <out>
  python3 outer.py  <tiger_dir> <out>
  python3 fade.py   <out>
  python3 assemble.py <out> [artifact_out.html]
"""
import base64, sys, pathlib
here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1])
tpl = (here / 'miami.template.html').read_text()
import json
roads = json.loads((out / 'roads.json').read_text())
b64 = base64.b64encode((out / 'base.png').read_bytes()).decode()
ob64 = base64.b64encode((out / 'outer.png').read_bytes()).decode()
fb64 = base64.b64encode((out / 'fade.png').read_bytes()).decode()
rb64 = base64.b64encode((out / 'roadmask.png').read_bytes()).decode()
body = tpl.replace('__OUTER__', 'data:image/png;base64,' + ob64).replace('__FADE__', 'data:image/png;base64,' + fb64).replace('__ROADS__', 'data:image/png;base64,' + rb64).replace('__BASE__', 'data:image/png;base64,' + b64).replace('__MAP__', json.dumps(roads, separators=(',', ':')))
head, rest = body.split('<canvas id="map"', 1)
doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
       + head + '</head>\n<body>\n<canvas id="map"' + rest + '</body>\n</html>\n')
(here.parent / 'miami.html').write_text(doc)
if len(sys.argv) > 2: pathlib.Path(sys.argv[2]).write_text(body)
print('miami.html', len(doc) // 1024, 'KB')
