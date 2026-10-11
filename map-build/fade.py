"""Soft fade for everything outside Miami-Dade and around the map edges.
Writes fade.png: the page background color with alpha = how far outside the county you are."""
import shapefile, math, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
CB, OUT = sys.argv[1], sys.argv[2]          # cb_2023_us_county_500k.zip, output dir
LAT0, LAT1, LON0, LON1 = 25.675, 25.975, -80.325, -80.06
k = math.cos(math.radians(25.83))
U = 1400; UH = U * (LAT1-LAT0) / ((LON1-LON0)*k)
S = .5                                       # pixels per map unit
W, H = math.ceil(U*S), math.ceil(UH*S)
def P(lon, lat): return ((lon-LON0)/(LON1-LON0)*U*S, (LAT1-lat)/(LAT1-LAT0)*UH*S)
# county line = vertices shared by the Broward and Miami-Dade polygons
r = shapefile.Reader(CB); fi = [f[0] for f in r.fields[1:]]; pts = {}
for sr in r.iterShapeRecords():
    rec = dict(zip(fi, sr.record))
    if rec['STATEFP'] == '12' and rec['COUNTYFP'] in ('086', '011'):
        pts[rec['COUNTYFP']] = {(round(x, 6), round(y, 6)) for x, y in sr.shape.points}
line = sorted(pts['086'] & pts['011'])
# order along the line: west part runs N-S at -80.295, so sort by lon then keep the boundary walk
line = [p for p in line if -80.5 < p[0] < -80.0]
west = [p for p in line if p[0] < -80.2949]; east = [p for p in line if p[0] >= -80.2949]
west.sort(key=lambda p: p[0]); east.sort(key=lambda p: p[0])
walk = west + sorted([p for p in east if abs(p[0] + 80.295) < .0002], key=lambda p: p[1]) + [p for p in east if abs(p[0] + 80.295) >= .0002]
poly = [P(-80.6, walk[0][1])] + [P(*p) for p in walk] + [P(-79.9, walk[-1][1]), P(-79.9, 26.3), P(-80.6, 26.3)]
outside = Image.new('L', (W, H), 0); ImageDraw.Draw(outside).polygon(poly, fill=255)
outside = outside.filter(ImageFilter.GaussianBlur(14))
# edge feather: fully faded at the frame, clear ~70 units in
edge = Image.new('L', (W, H), 0); px = edge.load(); F = 70 * S
for y in range(H):
    for x in range(W):
        d = min(x, y, W - 1 - x, H - 1 - y)
        t = max(0.0, 1 - max(0, d - 3) / F); px[x, y] = int(255 * t * t * (3 - 2 * t))
alpha = ImageChops.lighter(outside, edge)
img = Image.new('RGBA', (W, H), (247, 249, 252, 0)); img.putalpha(alpha)
img.save(f'{OUT}/fade.png', optimize=True)
print(W, H, len(walk))
