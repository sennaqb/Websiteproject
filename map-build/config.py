"""Shared map extent and scale for every build script."""
import math
LAT0, LAT1, LON0, LON1 = 25.55, 26.03, -80.46, -80.02   # wide extent; the fade sits far outside the spots
UNITS_PER_LON = 1400 / 0.265                            # keeps the original street scale (1 unit ~ 19 m)
k = math.cos(math.radians(25.83))
U = (LON1 - LON0) * UNITS_PER_LON
UH = U * (LAT1 - LAT0) / ((LON1 - LON0) * k)
def P(lon, lat, s=1.0):
    return ((lon - LON0) / (LON1 - LON0) * U * s, (LAT1 - lat) / (LAT1 - LAT0) * UH * s)

# Outer context ring: lower-detail map drawn around the core so the edge fade has room.
OLAT0, OLAT1, OLON0, OLON1 = 25.30, 26.28, -80.78, -79.80
COUNTIES = ['12086', '12011', '12087', '12099']   # Miami-Dade, Broward, Monroe, Palm Beach
def outer_rect():
    """Outer extent in core map units: x0, y0, width, height."""
    x0, y0 = P(OLON0, OLAT1); x1, y1 = P(OLON1, OLAT0)
    return x0, y0, x1 - x0, y1 - y0
