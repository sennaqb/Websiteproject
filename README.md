# The Descent

An interactive scroll dive from the ocean surface to the bottom of the Challenger Deep, 10,935 m down.

Open `index.html` in a browser (no build step). Libraries load from CDNs: three.js and GSAP 3.13 (ScrollTrigger, ScrollSmoother, SplitText, ScrambleText, MorphSVG, DrawSVG, Flip).

What's in it:
- WebGL ocean: shader water with caustics and god rays that fade to black as you sink, plus thousands of drifting marine-snow particles that scatter from your cursor and streak when you scroll fast.
- Live dive instruments: depth, pressure, temperature, sunlight and zone, all computed from real depth profiles.
- Below 1,000 m the screen goes dark and your cursor becomes a flashlight. Eyes in the dark open, track you, and flee if you get too close.
- A glowing siphonophore trails your light; click anywhere for a sonar ping and a bioluminescent burst.
- Optional generated ambient sound (filtered deep-water rumble and sonar pings) that darkens with depth.
- Pinned horizontal creature gallery with 3D tilt cards, sinking hero letters, a "PRESSURE" headline that gets crushed as you descend.
- ScrollSmoother: smooth scrolling with parallax layers.
- SplitText: zone titles reassemble from scattered letters, the floor headline explodes inward, body copy rises line by line. Labels scramble into place.
- MorphSVG + DrawSVG: a glowing specimen drawing draws itself in the midnight zone, then morphs from anglerfish to dumbo octopus to snailfish to amphipod as you sink. The trench cross-section and card outlines draw themselves too.
- Flip: creature cards zoom open into full specimen files.
- Respects `prefers-reduced-motion`.

# Magic City Car Map (`miami.html`)

A separate page: a driving-game-style map of Miami in The Miami Car Club's palette, where 16 real spots stay hidden until you drive close: specialty dealers (CURATED, Walt Grace Vintage, Prestige Imports, The Collection, Speedart Motorsports), body shops (Braman Collision Center, AutoBodyLab), mechanics (MasterClass Automotive, Leader Service, MBC NAPA Auto Care), plus meets, driving roads, the F1 circuit and an annual show.

- Drive with WASD or arrow keys (Shift boost, Space brake), or click or tap anywhere to set a GPS waypoint. The car autopilots there along the real street grid, highways and causeways, and manual driving stays on the streets too.
- Spots show as `?` markers until you get close. Then a discovery banner plays and the spot's card opens. Park there (or press E) to check in.
- Fog of war clears where you have driven. A rotating radar sits bottom-left, with zone, street and speed readouts bottom-right and a spot log with distances.
- Progress (found, visited, fog, car position) is saved in the browser.

Map data: US Census TIGER/Line 2023 (public domain) water, coastline and roads, rendered by the scripts in `map-build/`:

```
python3 map-build/water.py <tiger_dir> <out>/mask.png
python3 map-build/base.py  <tiger_dir> <out>
python3 map-build/roadmask.py <tiger_dir> <out>
python3 map-build/assemble.py <out>
```
