import shapefile, math, sys, json
from PIL import Image, ImageDraw
D, OUT = sys.argv[1], sys.argv[2]
LAT0, LAT1, LON0, LON1 = 25.675, 25.975, -80.325, -80.06
k = math.cos(math.radians(25.83))
U = 1400; UH = U * (LAT1-LAT0) / ((LON1-LON0)*k)      # map units
S = 2.0                                                 # raster scale
W, H = int(U*S), int(UH*S)
def P(lon, lat): return ((lon-LON0)/(LON1-LON0)*U, (LAT1-lat)/(LAT1-LAT0)*UH)
LAND, WATER, STREET = (38,41,45), (66,99,128), (58,63,69)
mask = Image.open(f'{OUT}/mask.png').resize((W, H), Image.NEAREST)
img = Image.new('RGB', (W, H), LAND)
img.paste(Image.new('RGB', (W, H), WATER), (0, 0), mask)
d = ImageDraw.Draw(img)
def inb(b): return not (b[2] < LON0 or b[0] > LON1 or b[3] < LAT0 or b[1] > LAT1)
def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1,y1),(x2,y2) = pts[0], pts[-1]; dx, dy = x2-x1, y2-y1; L = math.hypot(dx,dy) or 1e-9
    i, dm = 0, -1
    for j in range(1, len(pts)-1):
        dd = abs(dy*pts[j][0]-dx*pts[j][1]+x2*y1-y2*x1)/L
        if dd > dm: i, dm = j, dd
    if dm > eps: return dp(pts[:i+1], eps)[:-1] + dp(pts[i:], eps)
    return [pts[0], pts[-1]]
hw = {'S1100': [], 'S1200': [], 'S1630': []}
names = []; nidx = {}
for c in ['12086', '12011']:
    r = shapefile.Reader(f'{D}/tl_2023_{c}_roads.zip')
    fi = [f[0] for f in r.fields[1:]]
    for sr in r.iterShapeRecords():
        if not inb(sr.shape.bbox): continue
        rec = dict(zip(fi, sr.record)); m = rec['MTFCC']
        pts = [P(*p) for p in sr.shape.points]
        if m in hw:
            q = dp(pts, .6)
            nm = rec.get('FULLNAME') or ''
            if nm not in nidx: nidx[nm] = len(names); names.append(nm)
            hw[m].append([nidx[nm]] + [round(v, 1) for xy in q for v in xy])
        elif m in ('S1400', 'S1640', 'S1730'):
            d.line([(x*S, y*S) for x, y in pts], fill=STREET, width=1)
img = img.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
img.save(f'{OUT}/base.png', optimize=True)
json.dump({'U': U, 'UH': round(UH, 2), 'bbox': [LAT0, LAT1, LON0, LON1], 'k': k,
           'fwy': hw['S1100'], 'hwy': hw['S1200'], 'ramp': hw['S1630'], 'names': names}, open(f'{OUT}/roads.json', 'w'), separators=(',', ':'))
print(W, H, {m: len(v) for m, v in hw.items()})
