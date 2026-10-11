import shapefile, math, sys
from PIL import Image, ImageDraw
D = sys.argv[1]
LAT0, LAT1, LON0, LON1 = 25.675, 25.975, -80.325, -80.06
k = math.cos(math.radians(25.83))
W = 2800; H = int(W * (LAT1-LAT0) / ((LON1-LON0)*k))
def P(lon, lat): return ((lon-LON0)/(LON1-LON0)*W, (LAT1-lat)/(LAT1-LAT0)*H)
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
