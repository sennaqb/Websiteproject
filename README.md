# The Descent

An interactive scroll dive from the ocean surface to the bottom of the Challenger Deep, 10,935 m down.

Open `index.html` in a browser (no build step). Libraries load from CDNs: three.js, GSAP + ScrollTrigger, Lenis.

What's in it:
- WebGL ocean: shader water with caustics and god rays that fade to black as you sink, plus thousands of drifting marine-snow particles that scatter from your cursor and streak when you scroll fast.
- Live dive instruments: depth, pressure, temperature, sunlight and zone, all computed from real depth profiles.
- Below 1,000 m the screen goes dark and your cursor becomes a flashlight. Eyes in the dark open, track you, and flee if you get too close.
- A glowing siphonophore trails your light; click anywhere for a sonar ping and a bioluminescent burst.
- Optional generated ambient sound (filtered deep-water rumble and sonar pings) that darkens with depth.
- Pinned horizontal creature gallery with 3D tilt cards, sinking hero letters, a "PRESSURE" headline that gets crushed as you descend.
- Respects `prefers-reduced-motion`.
