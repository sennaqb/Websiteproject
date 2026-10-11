"""Render the drivable street network as a 1-unit-per-pixel mask.
Pixel values: 0 = no road, 128 = surface street, 255 = highway, ramp or bridge."""
import shapefile, math, sys
from PIL import Image, ImageDraw
D, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, __import__('os').path.dirname(__file__))
from config import LAT0, LAT1, LON0, LON1, U, UH, P
W, H = math.ceil(U), math.ceil(UH)
img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
local, major = [], []
for c in ['12086', '12011']:
    r = shapefile.Reader(f'{D}/tl_2023_{c}_roads.zip')
    fi = [f[0] for f in r.fields[1:]]
    for sr in r.iterShapeRecords():
        b = sr.shape.bbox
        if b[2] < LON0 or b[0] > LON1 or b[3] < LAT0 or b[1] > LAT1: continue
        m = dict(zip(fi, sr.record))['MTFCC']
        pts = [P(*p) for p in sr.shape.points]
        if m in ('S1100', 'S1200', 'S1630'): major.append(pts)
        elif m == 'S1400': local.append(pts)
for pts in local: d.line(pts, fill=128, width=2)
for pts in major: d.line(pts, fill=255, width=3)
img.save(f'{OUT}/roadmask.png', optimize=True)
print(W, H, len(local), len(major))
