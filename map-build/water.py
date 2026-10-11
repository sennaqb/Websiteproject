import shapefile, math, sys
from PIL import Image, ImageDraw
D = sys.argv[1]
sys.path.insert(0, __import__('os').path.dirname(__file__))
from config import LAT0, LAT1, LON0, LON1, U, UH, P as CP
S = 1.5
W, H = round(U * S), round(UH * S)
def P(lon, lat): return CP(lon, lat, S)
img = Image.new('L', (W, H), 0); d = ImageDraw.Draw(img)
n=0
for c in ['12086','12011']:
    r = shapefile.Reader(f'{D}/tl_2023_{c}_areawater.zip')
    for sr in r.iterShapeRecords():
        b = sr.shape.bbox
        if b[2] < LON0 or b[0] > LON1 or b[3] < LAT0 or b[1] > LAT1: continue
        pts = sr.shape.points; parts = list(sr.shape.parts) + [len(pts)]
        for i in range(len(parts)-1):
            ring = [P(*p) for p in pts[parts[i]:parts[i+1]]]
            if len(ring) > 2: d.polygon(ring, fill=255)
        n+=1
print(W, H, n)
img.save(sys.argv[2])
# ocean: draw coastline, flood-fill from the open Atlantic
r = shapefile.Reader(f'{D}/tl_2023_us_coastline.zip')
for sh in r.iterShapes():
    b = sh.bbox
    if b[2] < LON0 or b[0] > LON1 or b[3] < LAT0 or b[1] > LAT1: continue
    pts = sh.points; parts = list(sh.parts) + [len(pts)]
    for i in range(len(parts)-1):
        seg = [P(*p) for p in pts[parts[i]:parts[i+1]]]
        if len(seg) > 1: d.line(seg, fill=255, width=2)
for fy in range(0, H, 40):
    if img.getpixel((W-3, fy)) == 0: ImageDraw.floodfill(img, (W-3, fy), 255)
for fx in range(int(W*0.75), W, 40):
    if img.getpixel((fx, H-3)) == 0: ImageDraw.floodfill(img, (fx, H-3), 255)
img.save(sys.argv[2])
