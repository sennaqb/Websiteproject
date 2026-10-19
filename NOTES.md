# Dev notes (for the next session)

State as of 2026-10-19, branch `dealership-sim`, PR #2.

## What exists
- First-person three.js game, no build step. Entry `index.html`; modules in `js/` (see README table).
- Prep phase in the showroom → OPEN switch → 270 s shift → end-of-day report → next morning.
- Conversations are in-world: press E at a stalled pair, hold V to talk (Web Speech API), T to type, walk away to leave. `js/talk.js` `renderSubs`, `pttStart/pttStop`.
- Negotiation engine owns all numbers (`js/talk.js`): intents → `runIntent`. Rules parser `rulesParse`; Claude parser/voice in `js/ai.js` (Haiku 5.5 via user's API key, or the claude.ai artifact `sample` capability).
- Economy in `js/data.js`: consignment lot that restocks daily, crew hire/fire/train, weekly quota `10000+2500*(wk-1)`, goal $55k bank, 2 strikes = fired.
- Post-processing (bloom/grade/vignette/grain) in `js/world.js` `W.render`.

## Verified (headless Chromium, swiftshader)
- Full day loop, takeovers, saves, no console errors.
- Career sims: smart manager wins day ~20–24 with no strikes; passive manager fired ~half the time.
- AI path with a mocked model, including a jailbreak attempt.

## Not verified
- Real microphone input and real Claude calls (no key in the dev container).
- Feel with real mouse/keyboard; mobile is unsupported.

## Hosting
- claude.ai artifact: https://claude.ai/artifact/R4VrKN72LSnJ1Rz9P6iR7B (no mic there; typing + built-in Claude).
- GitHub Pages target: https://sennaqb.github.io/Websiteproject/ once the repo is public and Pages is set to branch `dealership-sim` / root. The session's GitHub integration cannot change repo settings.

## Testing scripts
Playwright + `--use-angle=swiftshader`; drive the game via `window.G3` (`startShift`, `step`, `takeover`, `fx`, `draw`) and `Game` (`start`, `finish`, `nextDay`). Capture frames with `canvas.toDataURL()` right after `G3.draw()` (page.screenshot hangs with the rAF loop).
