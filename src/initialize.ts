import type { InitApi } from "@clockwyrks/simple-2d";
import type { CaromState, CaromDebugApi } from "./game";
import { ACTIONS, BINDINGS, CUES } from "./constants";
import { initialState } from "./state";
import { debug } from "./debug";
export function initialize(
  api: InitApi<CaromState>,
): [CaromState, CaromDebugApi] {
  for (const name of ACTIONS)
    api.input.register(name, { keys: [...BINDINGS[name]] });
  api.audio.define(CUES.paddleHit, {
    wave: "triangle",
    freq: 640,
    freqTo: 320,
    gain: 0.18,
    durationMs: 75,
  });
  api.audio.define(CUES.wallBounce, {
    freq: 240,
    freqTo: 180,
    gain: 0.12,
    durationMs: 45,
  });
  api.audio.define(CUES.obstacleBounce, {
    wave: "triangle",
    freq: 900,
    freqTo: 600,
    gain: 0.13,
    durationMs: 65,
  });
  api.audio.define(CUES.score, {
    freq: 420,
    freqTo: 840,
    gain: 0.18,
    durationMs: 190,
  });
  api.diagnostics.register("screen", (s) => s.screen);
  api.diagnostics.register("mode", (s) => s.mode);
  api.diagnostics.register("score", (s) => `${s.score.p1} : ${s.score.p2}`);
  for (const field of ["x", "y", "vx", "vy", "spin"] as const)
    api.diagnostics.register(
      `ball.${field}`,
      (s) => s.ball?.[field] ?? "absent",
    );
  api.diagnostics.register("ball.speed", (s) =>
    s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : "absent",
  );
  for (const side of ["left", "right"] as const)
    for (const field of ["cy", "vy"] as const)
      api.diagnostics.register(
        `${side}.${field}`,
        (s) => s.paddles[side][field],
      );
  return [initialState(), debug];
}
