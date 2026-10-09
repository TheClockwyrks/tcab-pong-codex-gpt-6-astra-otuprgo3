import type { DeepReadonly } from "ts-essentials";
import type {
  BallState,
  CaromState,
  Mode,
  PaddleState,
  Screen,
  Side,
} from "./game";
import { CAROM_DEBUG_VERSION, OBSTACLE_CENTERS } from "./constants";
import { initialState, parkedBall, serveSign } from "./state";
import { menuItemRect } from "./menus";
type State = DeepReadonly<CaromState>;
function ball(s: State, patch: Partial<BallState>): CaromState {
  if (!s.ball) throw new Error("Carom: no ball on the field");
  return { ...s, ball: { ...s.ball, ...patch } };
}
function paddle(s: State, side: Side, patch: Partial<PaddleState>): CaromState {
  return {
    ...s,
    paddles: { ...s.paddles, [side]: { ...s.paddles[side], ...patch } },
  };
}
export const debug = {
  version: CAROM_DEBUG_VERSION,
  clearWorld: (s: State): CaromState => ({ ...s, ball: null, obstacles: [] }),
  spawnBall: (s: State): CaromState => ({ ...s, ball: parkedBall() }),
  spawnObstacle(s: State, index: number): CaromState {
    const p = OBSTACLE_CENTERS[index];
    if (!p || !Number.isInteger(index))
      throw new Error("Carom: invalid obstacle index");
    return {
      ...s,
      obstacles: [
        ...s.obstacles.filter((o) => o.index !== index),
        { index, cx: p.x, cy: p.y },
      ].sort((a, b) => a.index - b.index),
    };
  },
  reset: (s: State): CaromState => initialState(s.muted),
  reconcile: (s: State): CaromState => ({ ...s }),
  setScreen: (s: State, screen: Screen): CaromState => ({ ...s, screen }),
  setMode: (s: State, mode: Mode): CaromState => ({ ...s, mode }),
  setMenuIndex: (s: State, menuIndex: number): CaromState => ({
    ...s,
    menuIndex,
  }),
  setTitleIndex: (s: State, titleIndex: number): CaromState => ({
    ...s,
    titleIndex,
  }),
  setResumeScreen: (
    s: State,
    resumeScreen: "countdown" | "playing",
  ): CaromState => ({ ...s, resumeScreen }),
  setScore: (s: State, p1: number, p2: number): CaromState => ({
    ...s,
    score: { p1, p2 },
  }),
  setWinner: (s: State, winner: Side | null): CaromState => ({ ...s, winner }),
  setReceiver: (s: State, receiver: Side): CaromState => ({ ...s, receiver }),
  setPaddleCy: (s: State, side: Side, cy: number): CaromState =>
    paddle(s, side, { cy }),
  setPaddleVy: (s: State, side: Side, drivenVy: number): CaromState =>
    paddle(s, side, { drivenVy }),
  setPaddleDriven: (s: State, side: Side, driven: boolean): CaromState =>
    paddle(s, side, { driven }),
  setBallPosition: (s: State, x: number, y: number): CaromState =>
    ball(s, { x, y }),
  setBallVelocity: (s: State, vx: number, vy: number): CaromState =>
    ball(s, { vx, vy }),
  setBallSpin: (s: State, spin: number): CaromState => ball(s, { spin }),
  setBallHeld: (s: State, held: boolean): CaromState => ball(s, { held }),
  setBallHoldTimer: (s: State, holdTimer: number): CaromState =>
    ball(s, { holdTimer }),
  setBallServeSign: (s: State, sign: 1 | -1): CaromState =>
    ball(s, { serveSign: sign }),
  drawBallServeSign: (s: State): CaromState =>
    ball(s, { serveSign: serveSign() }),
  setAiTracking: (s: State, tracking: boolean): CaromState => ({
    ...s,
    ai: { ...s.ai, tracking },
  }),
  setAiMovement: (s: State, movement: boolean): CaromState => ({
    ...s,
    ai: { ...s.ai, movement },
  }),
  // The update commits this value to the engine's bus before playing any cue.
  setMuted: (s: State, muted: boolean): CaromState => ({ ...s, muted }),
  snapshot(s: State) {
    return {
      screen: s.screen,
      mode: s.mode,
      menuIndex: s.menuIndex,
      titleIndex: s.titleIndex,
      resumeScreen: s.resumeScreen,
      winner: s.winner,
      muted: s.muted,
      receiver: s.receiver,
      simTime: s.simTime,
      version: CAROM_DEBUG_VERSION,
      score: { ...s.score },
      paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
      ai: { ...s.ai },
      obstacles: s.obstacles.map((o) => ({ ...o })),
      ball: s.ball
        ? {
            ...s.ball,
            speed: Math.hypot(s.ball.vx, s.ball.vy),
            trail: s.ball.trail.map((p) => ({ ...p })),
          }
        : null,
    };
  },
  menuItemRect,
};
export type DebugApi = typeof debug;
