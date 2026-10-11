import shapefile, math, sys, json
from PIL import Image, ImageDraw
D, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, __import__('os').path.dirname(__file__))
from config import LAT0, LAT1, LON0, LON1, U, UH, k, P
S = 1.5                                                 # raster pixels per map unit
W, H = round(U*S), round(UH*S)
LAND, WATER, STREET = (243,245,249), (176,199,236), (214,220,230)
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
json.dump({'U': round(U, 2), 'UH': round(UH, 2), 'bbox': [LAT0, LAT1, LON0, LON1], 'k': k,
           'fwy': hw['S1100'], 'hwy': hw['S1200'], 'ramp': hw['S1630'], 'names': names}, open(f'{OUT}/roads.json', 'w'), separators=(',', ':'))
print(W, H, {m: len(v) for m, v in hw.items()})
