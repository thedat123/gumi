# Lightweight games

Applies to the day-14 water-catching game and all four event games. Day 7 shares
the same DOM animation loop.

- Decode required images asynchronously before enabling play. Event UFO artwork is
  prepared in the lobby; sorting, memory and truth games use HTML/CSS and text.
- Animate independent DOM/SVG objects using transforms. Day 14 retains the original
  ArcadeStage UI, backgrounds, boss/drop shapes, and a cached high-resolution sprite
  rendered once with the original car drawing code. No full-screen game canvas
  is cleared or repainted. Backgrounds and drops remain at screen resolution.
- Hold physics, input and object pools outside React state. Publish only score,
  health, lives or mode changes. Event countdown text changes once per second.
- Do not wait for requests inside input or animation callbacks. Event outbox flushes
  start between teams/after completion rather than on each periodic reconnect during
  a round. Existing in-flight requests may finish in the background.
- The PWA caches content-hashed assets. A first visit still needs their download;
  cached gameplay can continue offline. Authentication and day-14 graduation submission
  still use the backend. Event results retain the existing durable local outbox.
- Do not reload an active mission or event team when a new worker takes control.
  Apply the deferred refresh after leaving the mission or moving to the next team.

Day 14 retains 16 healthy catches and three lives. A bounded 24-slot drop pool and
fixed simulation steps avoid per-frame object churn and refresh-rate-dependent rules.
A win/loss stops collision processing immediately. The graduation wall still follows
a win, with no premature mission score submission.

## Checks

- `npm test` — 82 tests, including catches, terminal-state ordering, frame-rate
  independence, restart, normalized coordinates and bounded catch-up.
- `npm run build` — TypeScript and production bundle validation.
- `node scripts/verify-water-catch.mjs` — mock dev server on port 5203;
  original UI on desktop, 412×915/DPR 2.625 (A32-sized), 360×640 and landscape, CPU throttling
  1/6/12/4, offline motion, controls, rotation, loss/retry/win, graduation wall.
- `node scripts/verify-water-offline.mjs` — production mock preview on port 5202;
  real SW caching, offline reload/play, slow asset gate and deferred SW refresh.
- `GAME_BASE_URL=http://127.0.0.1:5202 node scripts/verify-event-offline.mjs` —
  cached lobby reload, all four rounds offline, native-resolution Flappy, five attempts,
  saved result, and deferred SW update until the next team.

Browser CPU throttling and viewport emulation are not measurements on a physical
Galaxy A32. They do not establish identical performance on all old devices or prove
live backend score delivery. Network/auth/progress in these browser checks use the
local mock adapter; the actual production service worker handles static caching.
