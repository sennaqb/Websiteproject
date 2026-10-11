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
