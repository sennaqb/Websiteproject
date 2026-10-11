"""Soft fade around the outer edge of the map, far outside the spots.
Writes fade.png: the page background color with alpha rising toward the frame."""
import sys, math
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))
from config import U, UH
OUT = sys.argv[1]
S = .25                                    # pixels per map unit (the fade is smooth, low res is enough)
W, H = math.ceil(U * S), math.ceil(UH * S)
F = 320 * S                                # fade band width (~6 km)
img = Image.new('RGBA', (W, H), (247, 249, 252, 0)); px = img.load()
for y in range(H):
    for x in range(W):
        d = min(x, y, W - 1 - x, H - 1 - y)
        t = max(0.0, 1 - max(0, d - 2) / F)
        px[x, y] = (247, 249, 252, int(255 * t * t * (3 - 2 * t)))
img.save(f'{OUT}/fade.png', optimize=True)
print(W, H)
