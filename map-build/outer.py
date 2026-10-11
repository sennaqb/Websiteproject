"""Render the outer context ring: water, coastline, highways and faint streets at low resolution."""
import shapefile, sys, math
from PIL import Image, ImageDraw
sys.path.insert(0, __import__('os').path.dirname(__file__))
from config import OLAT0, OLAT1, OLON0, OLON1, COUNTIES, outer_rect
D, OUT = sys.argv[1], sys.argv[2]
ox, oy, ow, oh = outer_rect()
S = .5                                            # pixels per map unit
W, H = round(ow * S), round(oh * S)
def P(lon, lat): return ((lon - OLON0) / (OLON1 - OLON0) * W, (OLAT1 - lat) / (OLAT1 - OLAT0) * H)
def inb(b): return not (b[2] < OLON0 or b[0] > OLON1 or b[3] < OLAT0 or b[1] > OLAT1)
mask = Image.new('L', (W, H), 0); d = ImageDraw.Draw(mask)
for c in COUNTIES:
    for sr in shapefile.Reader(f'{D}/tl_2023_{c}_areawater.zip').iterShapeRecords():
        if not inb(sr.shape.bbox): continue
        pts = sr.shape.points; parts = list(sr.shape.parts) + [len(pts)]
        for i in range(len(parts) - 1):
            ring = [P(*p) for p in pts[parts[i]:parts[i + 1]]]
            if len(ring) > 2: d.polygon(ring, fill=255)
for sh in shapefile.Reader(f'{D}/tl_2023_us_coastline.zip').iterShapes():
    if not inb(sh.bbox): continue
    pts = sh.points; parts = list(sh.parts) + [len(pts)]
    for i in range(len(parts) - 1):
        seg = [P(*p) for p in pts[parts[i]:parts[i + 1]]]
        if len(seg) > 1: d.line(seg, fill=255, width=2)
for fy in range(0, H, 20):
    if mask.getpixel((W - 2, fy)) == 0: ImageDraw.floodfill(mask, (W - 2, fy), 255)
# seed only in open Atlantic: the right edge, and the top/bottom edges well east of the coast
for fx, yy in [(x, 1) for x in range(int(W * .78), W, 20)] + [(x, H - 2) for x in range(int(W * .72), W, 20)]:
    if mask.getpixel((fx, yy)) == 0: ImageDraw.floodfill(mask, (fx, yy), 255)
LAND, WATER, STREET = (243, 245, 249), (176, 199, 236), (228, 232, 239)
img = Image.new('RGB', (W, H), LAND); img.paste(Image.new('RGB', (W, H), WATER), (0, 0), mask)
g = ImageDraw.Draw(img)
for c in COUNTIES:
    r = shapefile.Reader(f'{D}/tl_2023_{c}_roads.zip'); fi = [f[0] for f in r.fields[1:]]
    for sr in r.iterShapeRecords():
        if not inb(sr.shape.bbox): continue
        if dict(zip(fi, sr.record))['MTFCC'] == 'S1400': g.line([P(*p) for p in sr.shape.points], fill=STREET, width=1)
img = img.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
img.save(f'{OUT}/outer.png', optimize=True)
print(W, H, [round(v, 1) for v in (ox, oy, ow, oh)])
