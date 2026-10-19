# Handoff — 2026-10-19

## Goal
First-person 3D used-car dealership game ("Bargain Bob's Auto Mart"). You play Miguel, the manager. Salespeople stall or cave; you walk over and close deals by voice with Claude playing the customers. AAA feel within browser and three.js limits.

## Done
- Modular three.js game on branch `dealership-sim`, draft PR #2 (sennaqb/Websiteproject). No build step.
- Prep phase in the showroom (office computer: prices, crew, upgrades, books) → OPEN switch → 270 s shift → end-of-day report → next morning.
- The lot restocks itself (consignment). The user explicitly does not want an auction or buying.
- First-person conversations: press E at a stalled pair, hold V to talk (Web Speech API), T to type, 1–4/F add-ons and sign, walk away to leave. The lot keeps running live. Subtitles in `#subs`.
- Negotiation engine owns all numbers (walk-away price, patience, rapport, add-ons). Deal tiers: easy, winnable, hopeless.
- Gemini works too: any pasted key not starting with sk-ant- routes to Gemini (new Google keys start with AQ.) (`callGemini`, tries gemini-3.5-flash-lite then fallbacks on 404). GitHub Pages is live at https://sennaqb.github.io/Websiteproject/.
- Claude customers (`js/ai.js`, Haiku 5.5): classifies intents and voices replies; validated against jailbreaks. Sources: the claude.ai artifact `sample` capability, or the user's API key pasted on the title screen.
- Feel pass: bloom, grading, vignette, grain, head bob, sprint FOV, shake, T.O. ring and flash, gross pop-ups, title cards.
- Office furniture modeled in `js/world.js` (`makeDesk`, `makeOfficeChair`, `makeGuestChair`), merged per material by `bakeStatic`.
- People rebuilt (`person()` in `js/world.js`): rounded bodies, faces, knees and elbows, merged per part. Customers' heads flap open South Park Canadian style when they talk (always on; the user said never turn it off). Eyebrows show mood (`BROWS`), set from `mood()` in `js/talk.js`.
- Miguel walks around as a model with his photo face and a big head: C toggles third person; he waves on the title screen.
- Sales team: Frenchy, Andres, Sam start; Riccardo, Mario, Juanny are hireable (`TEAM` in `js/data.js`), six desks. Old saves are renamed by `renameTeam()`.
- "I have a gun" (G in a deal): guaranteed close at asking price, 3 per career (`S.guns`), pistol shown in view (`W.gun`).
- Signs auto-fit their text (`fitFont`); the banner is a real vinyl banner texture.
- Miguel's photo (`js/miguel.js`, data URI): 12 employee-of-the-month posters, plus office, windows, fence and dumpster. Customers recognize him.
- Verified headless (Playwright + swiftshader): full day loop, saves, no console errors. Career sims: active manager wins ~day 20–24; passive fired about half the time. AI path tested with a mocked model only.

## State now
- Private claude.ai artifact, up to date: https://claude.ai/artifact/R4VrKN72LSnJ1Rz9P6iR7B (no mic there; typing works; built-in Claude via `sample`).
- Voice plus AI needs a normal web page. The repo is private, so GitHub Pages needs the user to (a) make the repo public and (b) set Pages to branch `dealership-sim` / root. URL would be https://sennaqb.github.io/Websiteproject/. As of the last check it was 404 (not enabled).
- Not verified: real microphone, real Claude API calls, real mouse and keyboard feel.
- The user asked about "Voicestudio" (a desktop app) for voices. It's unknown whether it has a live API; waiting on the app's name, website or a screenshot.

## Next steps
1. Ask whether Pages is live; `curl -s -o /dev/null -w "%{http_code}" https://sennaqb.github.io/Websiteproject/`.
2. Get the user's playtest feedback (voice, Claude replies, pacing, difficulty) and fix the top issues.
3. If Voicestudio has a live TTS API (cloud or localhost), add it as an optional voice backend in `speak()` in `js/talk.js`, keeping browser voices as the fallback.
4. Possible: merge AI classify and voice into one call to cut reply latency (`js/ai.js`).
5. After code changes: `node --check js/*.js`, headless run, commit and push, republish the artifact (publish copy = index.html head from `<title>` + body contents; send changed `js/*` in `files`).

## Watch out
- This session's GitHub integration cannot change repo settings or create repos (403). The user must do the Pages and visibility clicks themselves.
- Desktop Commander in this setup runs in the cloud container, not on the user's PC.
- claude.ai artifacts block the microphone; don't promise voice there.
- Miguel's photo goes public if the repo goes public; the user was warned.
- `page.screenshot` hangs with the rAF loop; capture via `canvas.toDataURL()` right after `G3.draw()`.
- The user dislikes management friction (no auction). Focus on selling and negotiating.
- Commit attribution: Co-Authored-By Claude Opus 5.5 plus the Claude-Session line.

## Key files
- `index.html`: shell, CSS, script order.
- `js/data.js`: cars, customers, crew, economy, quota, saves.
- `js/talk.js`: negotiation engine, subtitles, push-to-talk, TTS.
- `js/ai.js`: Claude layer (sample or API key), prompts and validation.
- `js/world.js`: 3D world, cars, people, posters, post-processing.
- `js/game.js`: first-person control, NPCs, shifts, HUD, takeover.
- `js/pc.js`: office computer UI.
- `js/audio.js`: synthesized sound.
- `js/miguel.js`: Miguel's photo.
- `NOTES.md`: dev notes and testing approach.
