# Handoff — 2026-10-19

## Goal
First-person 3D used-car dealership game ("Bargain Bob's Auto Mart"). You play Miguel, the manager. Salespeople stall or cave; you walk over and close deals by voice with Claude playing the customers. AAA feel within browser and three.js limits.

## Done
- Modular three.js game on branch `dealership-sim`, draft PR #2 (sennaqb/Websiteproject). No build step.
- Prep phase in the showroom (office computer: prices, crew, upgrades, books) → OPEN switch → 270 s shift → end-of-day report → next morning.
- The lot restocks itself (consignment). The user explicitly does not want an auction or buying.
- First-person conversations: press E at a stalled pair, hold V to talk (Web Speech API), T to type, 1–4/F add-ons and sign, walk away to leave. The lot keeps running live. Subtitles in `#subs`.
- Negotiation engine owns all numbers (walk-away price, patience, rapport, add-ons). Deal tiers: easy, winnable, hopeless.
- Gemini customers are "unhinged" (user asked): swearing, roasting Miguel, loosest safety settings (`GEM_SAFETY`, `UNHINGED` in `js/ai.js`); no slurs or sexual content. Gemini works too: any pasted key not starting with sk-ant- routes to Gemini (new Google keys start with AQ.) (`callGemini`, tries gemini-3.5-flash-lite then fallbacks on 404). GitHub Pages is live at https://sennaqb.github.io/Websiteproject/.
- Claude customers (`js/ai.js`, Haiku 5.5): classifies intents and voices replies; validated against jailbreaks. Sources: the claude.ai artifact `sample` capability, or the user's API key pasted on the title screen.
- Feel pass: bloom, grading, vignette, grain, head bob, sprint FOV, shake, T.O. ring and flash, gross pop-ups, title cards.
- Office furniture modeled in `js/world.js` (`makeDesk`, `makeOfficeChair`, `makeGuestChair`), merged per material by `bakeStatic`.
- People rebuilt (`person()` in `js/world.js`): rounded bodies, faces, knees and elbows, merged per part. Customers' heads flap open South Park Canadian style when they talk (always on; the user said never turn it off). Eyebrows show mood (`BROWS`), set from `mood()` in `js/talk.js`.
- Miguel walks around as a model with his photo face and a big head: C toggles third person; he waves on the title screen.
- Sales team: Juanny (Spanish only, never closes alone: every deal becomes a T.O.; `FIXED_CREW`), Andres, Sam start; Riccardo, Mario, Frenchy are hireable (`TEAM` in `js/data.js`), six desks. Old saves are renamed by `renameTeam()`.
- "I have a gun" (G in a deal): guaranteed close at asking price, 3 per career (`S.guns`), pistol shown in view (`W.gun`).
- Fun pack: customer personalities (`PERSONAS` in data.js: quips, voice pitch/rate, soft-to-crying), crew hand-off one-liners (`CREW_LINES`/`CREW_VOICES` in game.js), wife phone call after a price is agreed (`wifeTalk`), X to cry (`cryDeal`), poster running gag by day (`posterGag`), Bob the owner walks the lot once a shift (`stepBob`/`bobJudges`: under-cost sale in front of him = strike, gun = +$500; state is `G.owner` because `G.bob` is the head-bob phase), Mr. Wiggle flies onto customers (`W.launchTube`, `stepWiggle`), bumpers fall off (`W.dropBumper`), end-of-day online reviews (`TALK_LOG`, `AI.reviews`, `cannedReview`).
- Voice input has two recognizers (`micMode` in talk.js): the browser's SpeechRecognition, or Whisper in the page (`js/whisper.js`, transformers.js 3.8.1 + Xenova/whisper-tiny.en, ~40 MB cached, MediaRecorder capture). Brave (the user's browser) and Firefox default to Whisper; a 'network' error switches any browser to it. Tested headless with jfk.wav as the fake mic.
- Lot flow: customers appear inside the gate (`GATE_IN`), at most crew+1 on the lot; salesperson greets at the car, both walk to the desk and sit (`guestSeat`, `routeSalesToDesk`, `u.sit` pose in animatePerson), T.O.s happen at the desk; after any sale both walk to the car and it drives off (`claimCar`, `startDelivery`, `driveOff`, `G.drives`).
- People don't overlap: `separate()` with keep-right aisle lanes (IN/OUT x=∓.55), sideways slide, pairs (customer+own salesperson) exempt; `stepNpc` skips a waypoint blocked for 3 s; player bumps into people.
- Lot: three rows of ten (`ROWS`, `colX` in world.js, wider center aisle), starting cap 12 (+3 per upgrade, max 30). Shift is 480 s with 12–18 customers.
- Characters (`person()` in world.js): painted canvas faces wrapped on the head (`faceTex`, `headUV` keeps both flap halves on one texture), body types (slim/avg/fat/muscle), men and women, many hairstyles, hats (cap, fedora, tinfoil, beanie, boonie, beret), outfits with painted patterns (`clothTex`: plaid, camo, stripes, Hawaiian, Pokéball tee, Thriller jacket, hoodie), glasses, beards, chains, one white glove. Cloth and face textures are SRGB. Looks per personality in `LOOKS` (game.js); crew in `CREW_LOOKS`; the MJ impersonator moonwalks (`moonwalk`).
- Personalities: 15 (`PERSONAS`), incl. impersonators (`imp:true`: mj, elvis, arnold — catchphrases, more frequent quips), hungry, flirt. Declined: a sexual impersonation of a real adult performer.
- Sizzle: cars have `feats` (`FEATS`, `giveFeats` in data.js); pitching real ones builds `T.value` and can stretch budget to 1.35x; fake ones are lies; a high price with no value gets `justify`.
- Selling psychology: customers open with small talk; a price before warm-up gets a cold brush-off once (-3%); asking needs reveals the hidden hot button (`HOT`, `u.hot`: safety, mpg, looks, reliable, space, deal); pitching it is +6% and rapport. Subtitle header shows cold/warming/warmed up and the hot button once known.
- Customer dialogue lives in `js/lines.js`: `line(u,kind,vars)` with general (`ANY`) and per-personality (`BY`) banks for intro, far, close, counter, refuse, agree, walk, rapport, numbers, unclear, greet, thanks, release, add-ons; no repeats within a conversation (`T.said`). Mid-deal caller depends on personality (`CALLERS`).
- Mic: errors explained (`MIC_ERR`), Test mic button on the title screen.
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
5. After code changes: bump `?v=` on the script tags in index.html (cache-busting for Pages), `node --check js/*.js`, headless run, commit and push, republish the artifact (publish copy = index.html head from `<title>` + body contents; send changed `js/*` in `files`).

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
- `js/whisper.js`: in-page Whisper speech-to-text (Brave/Firefox fallback).
- `js/lines.js`: what customers say (personality line banks).
- `js/talk.js`: negotiation engine, subtitles, push-to-talk, TTS.
- `js/ai.js`: Claude layer (sample or API key), prompts and validation.
- `js/world.js`: 3D world, cars, people, posters, post-processing.
- `js/game.js`: first-person control, NPCs, shifts, HUD, takeover.
- `js/pc.js`: office computer UI.
- `js/audio.js`: synthesized sound.
- `js/miguel.js`: Miguel's photo.
- `NOTES.md`: dev notes and testing approach.
