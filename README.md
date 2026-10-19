# Bargain Bob's Auto Mart

A first-person 3D game about managing the worst used-car lot in town. Bob's trucks keep the lot full of junk. Your salespeople cave on price, stall, or lose the customer. You walk the lot and step in to close the deals they can't, by talking to customers with your voice or by typing.

## Play

Serve the folder and open it in Chrome or Edge (the microphone only works on `localhost` or `https`):

```
python3 -m http.server 8000
# then open http://localhost:8000
```

## How it plays

- **Prep:** you start each day in the showroom. The computer in your office (back left) handles asking prices, reconditioning, crew (hire, fire, train), upgrades and the books. The lot restocks itself every morning.
- **Shift:** flip the OPEN switch by the front door. Customers arrive and your salespeople work them.
  - Easy deals close themselves.
  - Winnable deals stall. A red **T.O.!** appears with a patience bar. Get there and press **E** before they walk.
  - Hopeless deals (tire-kickers whose limit is under Bob's cost) waste your time. Spot them and say "thanks for coming, have a nice day".
- **Talking (first person):** walk up to a stalled pair and press **E**. You stay in your own eyes: hold **V** and talk, and the customer turns to you and answers out loud with subtitles. **T** types instead. Walk away to leave the conversation. The lot keeps running while you talk.
- **Negotiating:** every customer has a hidden walk-away price and a patience meter. Rapport and honest pitches raise what they'll pay. Bluffing costs patience. Once a price is agreed, pitch warranty, GAP, accessories and financing for back-end gross. Every line you say costs the lot about 7 seconds while other customers wait.
- **Bob's quota:** every 7 days Bob checks your gross. Miss it twice in a row and you're fired. Get the bank to $55,000 to win.

Controls: **WASD** move, **Shift** sprint, **mouse** look (click and drag if pointer lock is blocked), **←/→** turn, **E** use / take over, **C** third-person view, **G** "I have a gun" (in a deal, 3 per career), **M** mute, **Esc** pause.

## AI customers (optional)

By default customers run on built-in rules. Claude can play them instead: it understands anything you say and answers in character. The game engine still owns every number, so a clever sentence can't talk a customer past their limit.

- In the published claude.ai page, tick **Claude plays the customers** on the title screen.
- Anywhere else, paste an Anthropic API key on the title screen. It's stored only in your browser's local storage and sent only to `api.anthropic.com`.

## Code

| File | What it does |
|---|---|
| `js/data.js` | Cars, customers, crew, economy, quotas, saves |
| `js/talk.js` | Negotiation engine and the dialogue panel |
| `js/ai.js` | Optional Claude layer (understanding and voice) |
| `js/world.js` | 3D world, cars, people, post-processing |
| `js/game.js` | First-person controls, NPCs, shifts, HUD |
| `js/pc.js` | The office computer |
| `js/audio.js` | Synthesized sound |
| `lib/three.min.js` | three.js r158 |
