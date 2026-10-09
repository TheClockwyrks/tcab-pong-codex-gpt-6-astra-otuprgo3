# Carom

A browser paddle duel where movement puts spin on the ball. Curve a shot, bank it off the amber obstacles, and defend your edge. Play the machine in Solo or share a keyboard in Versus. First to 11 wins, with a two-point lead.

Everything is drawn on canvas and sound is synthesized by the Simple 2D engine. No accounts, backend, downloads, or external assets are needed to play.

## Run locally

```sh
npm ci
npm run dev
```

Open the local address Vite prints. To produce the static site:

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/` to the root of a static host.

## Controls

| Action | Controls |
| --- | --- |
| Solo movement | W / S or Up / Down arrows |
| Versus left paddle | W / S |
| Versus right paddle | Up / Down arrows |
| Menu selection | W / S, arrows, mouse, or touch |
| Confirm | Enter or Space |
| Pause / resume | P or Escape |
| Back | Escape |
| Mute | M |
| Diagnostics | Backtick |

Touch controls appear when you touch the screen. Slide vertically at either edge to move. Move your paddle during contact to add spin; contact near a paddle's ends produces a steeper shot. The ball accelerates with every paddle hit.

## Development

`src/game.ts` exports the complete state contract and game. The simulation is in `physics.ts`, input transitions in `update.ts`, drawing in `render.ts`, and automation poses in `debug.ts`. The engine owns the clock, input, audio, canvas fitting, diagnostics, and recording. Debug poses operate on immutable state through `engine.apply`; nothing is exposed on the page. Menu gesture origins are transient input bookkeeping carried in the state so press/release validation works across frames. A posed mute bit is committed to the runtime bus at the next update before cues play.

```sh
npm run typecheck
npm run lint
npm run format
npm test
```

Tests create the real engine with an in-process canvas and deterministic clock. They exercise menus, keyboard and pointer input, serving, AI, spin, collisions, scoring, state poses, and agreement across frame lengths. `showcase/` contains the player description, screenshots, and an engine draw-command replay.
