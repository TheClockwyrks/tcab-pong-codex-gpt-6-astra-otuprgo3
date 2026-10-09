import type { CaromState, BallState, PaddleState } from "./game";
import type { UpdateApi } from "@clockwyrks/simple-2d";
import * as C from "./constants";
import { clamp, parkedBall } from "./state";

function move(p: PaddleState, velocity: number, dt: number): PaddleState {
  let vy = p.driven ? p.drivenVy : velocity;
  const raw = p.cy + vy * dt;
  const cy = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  if (cy !== raw && dt > 0) vy = (cy - p.cy) / dt;
  return { ...p, cy, vy };
}
export function movePaddles(
  s: CaromState,
  held: Readonly<Record<C.ActionName, boolean>>,
  dt: number,
): CaromState {
  const up = held["p1-up"] || (s.mode === "solo" && held["p2-up"]);
  const down = held["p1-down"] || (s.mode === "solo" && held["p2-down"]);
  let rightVy =
    (Number(held["p2-down"]) - Number(held["p2-up"])) * C.PADDLE_SPEED;
  if (s.mode === "solo") {
    const defending =
      s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0;
    const target =
      defending && s.ball ? s.ball.y - s.ball.vy * C.AI_REACT : C.AI_HOME_Y;
    const diff = target - s.paddles.right.cy;
    const deadzone = defending ? C.AI_DEADZONE : C.AI_HOME_DEADZONE;
    rightVy =
      s.ai.movement && Math.abs(diff) > deadzone && dt > 0
        ? Math.sign(diff) * Math.min(C.AI_SPEED, Math.abs(diff) / dt)
        : 0;
  }
  return {
    ...s,
    paddles: {
      left: move(
        s.paddles.left,
        (Number(down) - Number(up)) * C.PADDLE_SPEED,
        dt,
      ),
      right: move(s.paddles.right, rightVy, dt),
    },
  };
}
type MovingBall = { -readonly [K in keyof BallState]: BallState[K] };
// Resolve the least penetration; strict comparisons preserve left/right/top/bottom ties.
function collide(b: MovingBall, r: C.Rect): number | null {
  const depths = [
    b.x - (r.x0 - C.BALL_R),
    r.x1 + C.BALL_R - b.x,
    b.y - (r.y0 - C.BALL_R),
    r.y1 + C.BALL_R - b.y,
  ];
  if (depths.some((d) => d <= 0)) return null;
  const face = depths.indexOf(Math.min(...depths));
  if (face === 0) {
    b.x = r.x0 - C.BALL_R;
    if (b.vx > 0) b.vx *= -1;
  }
  if (face === 1) {
    b.x = r.x1 + C.BALL_R;
    if (b.vx < 0) b.vx *= -1;
  }
  if (face === 2) {
    b.y = r.y0 - C.BALL_R;
    if (b.vy > 0) b.vy *= -1;
  }
  if (face === 3) {
    b.y = r.y1 + C.BALL_R;
    if (b.vy < 0) b.vy *= -1;
  }
  return face;
}
export function advanceBall(
  s: CaromState,
  dt: number,
  audio: UpdateApi["audio"],
): CaromState {
  if (!s.ball) return s;
  const b: MovingBall = { ...s.ball };
  if (s.screen === "countdown") {
    b.holdTimer = Math.max(0, b.holdTimer - dt);
    if (b.holdTimer <= 0) {
      b.held = false;
      b.trail = [];
      b.vx =
        (s.receiver === "left" ? -1 : 1) *
        C.SERVE_SPEED *
        Math.cos(C.SERVE_ANGLE);
      b.vy = b.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE);
      s = { ...s, screen: "playing" };
    }
  } else if (!b.held) {
    const cues = new Set<C.CueName>();
    const n = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
    );
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed > 0) {
        const angle = (b.spin / speed) * h;
        const cos = Math.cos(angle),
          sin = Math.sin(angle);
        [b.vx, b.vy] = [b.vx * cos - b.vy * sin, b.vx * sin + b.vy * cos];
      }
      b.spin *= Math.pow(0.5, h / C.SPIN_HALFLIFE);
      b.x += b.vx * h;
      b.y += b.vy * h;
      if (b.y - C.BALL_R < 0 && b.vy < 0) {
        b.y = C.BALL_R;
        b.vy *= -1;
        cues.add(C.CUES.wallBounce);
      } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
        b.y = C.FIELD_H - C.BALL_R;
        b.vy *= -1;
        cues.add(C.CUES.wallBounce);
      }
      for (const side of ["left", "right"] as const) {
        const p = s.paddles[side];
        const incomingVy = b.vy;
        const face = collide(b, {
          x0: side === "left" ? C.P1_X0 : C.P2_X0,
          x1: side === "left" ? C.P1_X1 : C.P2_X1,
          y0: p.cy - C.PADDLE_HALF,
          y1: p.cy + C.PADDLE_HALF,
        });
        if (face === null) continue;
        if (face > 1) {
          if (b.vy !== incomingVy) cues.add(C.CUES.wallBounce);
          continue;
        }
        const angle =
          clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE;
        const outgoing = Math.min(
          Math.hypot(b.vx, b.vy) * C.SPEED_MULT,
          C.SPEED_CAP,
        );
        b.vx = (side === "left" ? 1 : -1) * outgoing * Math.cos(angle);
        b.vy = outgoing * Math.sin(angle);
        b.spin = clamp(
          b.spin + p.vy * C.SPIN_FROM_PADDLE,
          -C.SPIN_CLAMP,
          C.SPIN_CLAMP,
        );
        b.x = side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R;
        cues.add(C.CUES.paddleHit);
      }
      for (const o of s.obstacles) {
        const vx = b.vx,
          vy = b.vy;
        collide(b, C.OBSTACLES[o.index]);
        if (b.vx !== vx || b.vy !== vy) cues.add(C.CUES.obstacleBounce);
      }
    }
    for (const cue of cues) audio.play(cue);
  }
  b.trail = [
    ...b.trail.filter((p) => s.simTime - p.t <= C.TRAIL_TIME),
    { x: b.x, y: b.y, t: s.simTime },
  ];
  s = { ...s, ball: b };
  if (s.screen !== "playing" || b.held) return s;
  const scorer =
    b.x - C.BALL_R > C.FIELD_W ? "left" : b.x + C.BALL_R < 0 ? "right" : null;
  if (!scorer) return s;
  audio.play(C.CUES.score);
  const score = {
    p1: s.score.p1 + Number(scorer === "left"),
    p2: s.score.p2 + Number(scorer === "right"),
  };
  const won =
    Math.max(score.p1, score.p2) >= C.WIN_SCORE &&
    Math.abs(score.p1 - score.p2) >= C.WIN_LEAD;
  return won
    ? { ...s, score, winner: scorer, screen: "matchover", menuIndex: 0 }
    : {
        ...s,
        score,
        receiver: scorer === "left" ? "right" : "left",
        ball: parkedBall(),
        screen: "countdown",
      };
}
