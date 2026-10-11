"""Wide, round-cornered fade over the outer ring.
Alpha follows a superellipse (squircle) around the outer extent, so the corners are round.
The same formula lives in the page (fadeAt) so labels fade with the map."""
import sys, math
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))
from config import outer_rect
OUT = sys.argv[1]
FADE_P, FADE_A, FADE_B = 4.0, .58, .97      # squircle exponent; fade starts at A, fully gone by B
ox, oy, ow, oh = outer_rect()
S = .1                                      # pixels per map unit: the fade is smooth, low res is enough
W, H = math.ceil(ow * S), math.ceil(oh * S)
img = Image.new('RGBA', (W, H)); px = img.load()
for y in range(H):
    for x in range(W):
        u, v = abs((x + .5) / W * 2 - 1), abs((y + .5) / H * 2 - 1)
        t = (u ** FADE_P + v ** FADE_P) ** (1 / FADE_P)
        s = min(1.0, max(0.0, (t - FADE_A) / (FADE_B - FADE_A)))
        px[x, y] = (247, 249, 252, int(255 * s * s * (3 - 2 * s)))
img.save(f'{OUT}/fade.png', optimize=True)
print(W, H)
