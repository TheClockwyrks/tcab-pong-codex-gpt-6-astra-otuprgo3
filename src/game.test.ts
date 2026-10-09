import { afterEach, describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { ConstantClock, createEngine } from "@clockwyrks/simple-2d";
import { game, BACKGROUND, type CaromState } from "./game";
import * as C from "./constants";

const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn());
});
async function setup(ms = 8) {
  const canvas = createCanvas(C.FIELD_W, C.FIELD_H);
  const target = new EventTarget();
  const engine = createEngine({
    canvas: canvas as unknown as HTMLCanvasElement,
    width: C.FIELD_W,
    height: C.FIELD_H,
    game,
    background: BACKGROUND,
    layout: C.LAYOUT,
    clock: new ConstantClock(ms),
    surface: {
      cssWidth: () => C.FIELD_W,
      cssHeight: () => C.FIELD_H,
      dpr: () => 1,
      events: () => target,
    },
  });
  const cues: string[] = [];
  engine.events.on("cue:played", (e) => cues.push(e.cue));
  await engine.initialize();
  cleanups.push(() => engine.destroy());
  const key = (code: string, type = "keydown") =>
    target.dispatchEvent(
      Object.assign(new Event(type), { code, repeat: false }),
    );
  const tap = async (code: string) => {
    key(code);
    await engine.advance(1);
    key(code, "keyup");
    await engine.advance(1);
  };
  const pointer = (
    type: string,
    x: number,
    y: number,
    id = 1,
    device = "mouse",
  ) =>
    target.dispatchEvent(
      Object.assign(new Event(type), {
        clientX: x,
        clientY: y,
        pointerId: id,
        pointerType: device,
        isPrimary: id === 1,
        button: 0,
        buttons: type === "pointerup" ? 0 : 1,
      }),
    );
  const pose = (fn: (s: CaromState) => CaromState) => engine.apply(fn);
  const flight = (x = 640, y = 360, vx = 500, vy = 0, spin = 0) =>
    pose((s) => ({
      ...s,
      screen: "playing",
      ball: { ...s.ball!, x, y, vx, vy, spin, held: false },
      obstacles: [],
    }));
  return { engine, d: engine.debug, key, tap, pointer, pose, flight, cues };
}

describe("state and input through the engine", () => {
  it("initializes exact actions, state, diagnostic reads and an inert snapshot", async () => {
    const { engine, d } = await setup();
    const old = engine.state;
    expect(old.screen).toBe("title");
    expect(old.ball?.held).toBe(true);
    expect(d.snapshot(old).version).toBe(C.CAROM_DEBUG_VERSION);
    expect(engine.diagnostics().every((r) => r.error === undefined)).toBe(true);
    expect(d.reconcile(old)).toEqual(old);
    await engine.advance(2);
    expect(engine.state.simTime).toBeCloseTo(0.016);
    expect(engine.state.ball).toEqual(old.ball);
    expect(old.simTime).toBe(0);
  });
  it("wraps menu, remembers selection, returns from how-to and starts versus", async () => {
    const { engine, tap } = await setup();
    await tap("KeyW");
    expect(engine.state.menuIndex).toBe(2);
    await tap("Enter");
    expect(engine.state.screen).toBe("howto");
    await tap("Escape");
    expect(engine.state.menuIndex).toBe(2);
    await tap("ArrowUp");
    await tap("Enter");
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.titleIndex).toBe(1);
    expect(engine.state.screen).toBe("countdown");
  });
  it("gives up priority over down and movement over confirm", async () => {
    const { engine, key } = await setup();
    key("KeyW");
    key("KeyS");
    key("Enter");
    await engine.advance(1);
    expect(engine.state.menuIndex).toBe(2);
    expect(engine.state.screen).toBe("title");
  });
  it("handles pointer clicks across frames and rejects mismatched regions", async () => {
    const { engine, pointer } = await setup();
    pointer("pointerdown", 120, 380);
    await engine.advance(1);
    pointer("pointerup", 120, 450);
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    pointer("pointerdown", 120, 450);
    await engine.advance(1);
    pointer("pointerup", 120, 450);
    await engine.advance(1);
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.screen).toBe("countdown");
  });
  it("handles same-frame touch confirmation and keyboard confirmation priority", async () => {
    const { engine, pointer, key } = await setup();
    key("Enter");
    pointer("pointerdown", 120, 450, 2, "touch");
    pointer("pointerup", 120, 450, 2, "touch");
    await engine.advance(1);
    expect(engine.state.mode).toBe("solo");
  });
  it("touch hover selects and touch confirms how-to", async () => {
    const { engine, pointer } = await setup();
    pointer("pointerdown", 120, 515, 2, "touch");
    pointer("pointerup", 120, 515, 2, "touch");
    await engine.advance(1);
    expect(engine.state.screen).toBe("howto");
    pointer("pointerdown", 500, 610, 2, "touch");
    pointer("pointerup", 500, 610, 2, "touch");
    await engine.advance(1);
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(2);
  });
  it("pauses once on Escape, freezes the world and resumes its hold", async () => {
    const { engine, tap, key } = await setup();
    await tap("Enter");
    await tap("Escape");
    const old = engine.state;
    key("KeyS");
    await engine.advance(10);
    expect(engine.state.screen).toBe("paused");
    expect(engine.state.ball).toEqual(old.ball);
    expect(engine.state.paddles).toEqual(old.paddles);
    await tap("Escape");
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.ball!.holdTimer).toBeLessThan(old.ball!.holdTimer);
  });
  it("restart retains mode, quit restores the title, mute works on every screen", async () => {
    const { engine, tap, pose, d } = await setup();
    await tap("ArrowDown");
    await tap("Enter");
    await tap("KeyP");
    await tap("ArrowDown");
    await tap("Enter");
    expect(engine.state.mode).toBe("versus");
    expect(engine.state.score).toEqual({ p1: 0, p2: 0 });
    await tap("KeyP");
    await tap("KeyW");
    await tap("Enter");
    expect(engine.state.screen).toBe("title");
    expect(engine.state.menuIndex).toBe(1);
    for (const screen of [
      "title",
      "howto",
      "countdown",
      "playing",
      "paused",
      "matchover",
    ] as const) {
      pose((s) => d.setScreen(s, screen));
      const muted = engine.state.muted;
      await tap("KeyM");
      expect(engine.state.muted).toBe(!muted);
    }
  });
});

describe("simulation", () => {
  it("serves in the posed direction without advancing on the serve frame", async () => {
    const { engine, pose, d } = await setup();
    pose((s) => d.setScreen(s, "countdown"));
    pose((s) => d.setBallHoldTimer(s, 0.001));
    pose((s) => d.setBallServeSign(s, -1));
    await engine.advance(1);
    expect(engine.state.screen).toBe("playing");
    expect(engine.state.ball!.x).toBe(C.FIELD_CX);
    expect(engine.state.ball!.vx).toBeCloseTo(
      -C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
    );
    expect(engine.state.ball!.vy).toBeLessThan(0);
  });
  it("moves both solo controls and integrates driven clamps using actual velocity", async () => {
    const { engine, flight, key, pose, d } = await setup();
    flight();
    key("ArrowDown");
    await engine.advance(1);
    expect(engine.state.paddles.left.cy).toBeCloseTo(
      C.FIELD_CY + C.PADDLE_SPEED * 0.008,
    );
    pose((s) => d.setPaddleDriven(s, "left", true));
    pose((s) => d.setPaddleVy(s, "left", 1000));
    pose((s) => d.setPaddleCy(s, "left", C.PADDLE_MAX_CY - 1));
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBeCloseTo(125);
    await engine.advance(1);
    expect(engine.state.paddles.left.vy).toBe(0);
    expect(engine.state.paddles.left.drivenVy).toBe(1000);
  });
  it("keeps versus paddle input independent", async () => {
    const { engine, flight, key, pose, d } = await setup();
    flight();
    pose((s) => d.setMode(s, "versus"));
    key("ArrowUp");
    await engine.advance(1);
    expect(engine.state.paddles.left.cy).toBe(C.FIELD_CY);
    expect(engine.state.paddles.right.cy).toBeLessThan(C.FIELD_CY);
  });
  it("applies AI tracking, movement and driver gates independently", async () => {
    const { engine, flight, pose, d } = await setup();
    flight(640, 500, 500, 100);
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(C.AI_SPEED);
    pose((s) => d.setAiTracking(s, false));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(0);
    pose((s) => d.setPaddleCy(s, "right", 600));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(-C.AI_SPEED);
    pose((s) => d.setAiMovement(s, false));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(0);
    pose((s) => d.setPaddleDriven(s, "right", true));
    pose((s) => d.setPaddleVy(s, "right", 25));
    await engine.advance(1);
    expect(engine.state.paddles.right.vy).toBe(25);
  });
  it.each([
    ["top", 12, -500],
    ["bottom", 708, 500],
  ] as const)(
    "reflects the %s wall preserving speed and spin",
    async (_, y, vy) => {
      const { engine, flight, cues } = await setup();
      flight(700, y, 0, vy, 0);
      await engine.advance(1);
      expect(engine.state.ball!.vy).toBe(-vy);
      expect(cues).toEqual([C.CUES.wallBounce]);
      expect(engine.state.ball!.spin).toBe(0);
    },
  );
  it.each(["left", "right"] as const)(
    "paddle %s accelerates the ball and adds motion spin",
    async (side) => {
      const { engine, flight, pose, d, cues } = await setup();
      flight(side === "left" ? 77 : 1203, 360, side === "left" ? -500 : 500, 0);
      pose((s) => d.setPaddleDriven(s, side, true));
      pose((s) => d.setPaddleVy(s, side, 100));
      await engine.advance(1);
      expect(
        Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
      ).toBeCloseTo(520);
      expect(engine.state.ball!.spin).toBeGreaterThan(80);
      expect(Math.sign(engine.state.ball!.vx)).toBe(side === "left" ? 1 : -1);
      expect(cues).toContain(C.CUES.paddleHit);
    },
  );
  it("caps speed and resolves paddle end caps without adding spin", async () => {
    const { engine, flight } = await setup();
    flight(77, 360, -980, 0);
    await engine.advance(1);
    expect(
      Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
    ).toBeCloseTo(C.SPEED_CAP);
    flight(56, 292, 0, 500);
    await engine.advance(1);
    expect(engine.state.ball!.vy).toBe(-500);
    expect(engine.state.ball!.spin).toBe(0);
  });
  it.each([
    [468, 220, 500, 0],
    [512, 220, -500, 0],
    [490, 138, 0, 500],
    [490, 302, 0, -500],
  ])("reflects obstacle from (%s,%s)", async (x, y, vx, vy) => {
    const { engine, flight, pose, d, cues } = await setup();
    flight(x, y, vx, vy);
    pose((s) => d.spawnObstacle(s, 0));
    await engine.advance(1);
    expect(engine.state.ball!.vx).toBeCloseTo(-vx);
    expect(engine.state.ball!.vy).toBeCloseTo(-vy);
    expect(cues).toContain(C.CUES.obstacleBounce);
  });
  it("spin curves flight, decays by time and retains only recent trail samples", async () => {
    const { engine, flight } = await setup();
    flight(640, 360, 400, 0, 300);
    await engine.advance(25);
    expect(engine.state.ball!.y).toBeGreaterThan(360);
    expect(engine.state.ball!.spin).toBeCloseTo(
      300 * Math.pow(0.5, 0.2 / C.SPIN_HALFLIFE),
    );
    expect(
      engine.state.ball!.trail.every(
        (p) => engine.state.simTime - p.t <= C.TRAIL_TIME,
      ),
    ).toBe(true);
    expect(
      Math.hypot(engine.state.ball!.vx, engine.state.ball!.vy),
    ).toBeCloseTo(400);
  });
  it("scores strictly past a goal, parks for the receiver, and wins only by two", async () => {
    const { engine, flight, pose, d, cues } = await setup();
    pose((s) => d.setScore(s, 10, 10));
    flight(C.FIELD_W + C.BALL_R + 1, 360, 500, 0);
    await engine.advance(1);
    expect(engine.state.score).toEqual({ p1: 11, p2: 10 });
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.receiver).toBe("right");
    expect(engine.state.ball!.trail).toEqual([]);
    flight(C.FIELD_W + C.BALL_R + 1, 360, 500, 0);
    await engine.advance(1);
    expect(engine.state.winner).toBe("left");
    expect(engine.state.screen).toBe("matchover");
    expect(cues.filter((c) => c === C.CUES.score)).toHaveLength(2);
  });
  it("scores a right-side win and supports play again and matchover back", async () => {
    const { engine, flight, pose, d, tap } = await setup();
    pose((s) => d.setScore(s, 0, 10));
    flight(-12, 360, -500, 0);
    await engine.advance(1);
    expect(engine.state.winner).toBe("right");
    await tap("Enter");
    expect(engine.state.screen).toBe("countdown");
    expect(engine.state.winner).toBe(null);
    pose((s) => d.setScreen(s, "matchover"));
    await tap("Escape");
    expect(engine.state.screen).toBe("title");
  });
  it("agrees under 2 ms and 16 ms frames for a spinning wall bank", async () => {
    const outcomes = [];
    for (const ms of [2, 16]) {
      const { engine, flight, cues } = await setup(ms);
      flight(640, 100, 200, -500, 150);
      await engine.advance(800 / ms);
      outcomes.push({ b: engine.state.ball!, cues });
    }
    expect(outcomes[0].cues).toEqual(outcomes[1].cues);
    expect(
      Math.abs(
        Math.hypot(outcomes[0].b.vx, outcomes[0].b.vy) -
          Math.hypot(outcomes[1].b.vx, outcomes[1].b.vy),
      ),
    ).toBeLessThan(10);
    expect(Math.sign(outcomes[0].b.vx)).toBe(Math.sign(outcomes[1].b.vx));
    expect(Math.sign(outcomes[0].b.vy)).toBe(Math.sign(outcomes[1].b.vy));
  });
});

describe("debug poses", () => {
  it("poses every field without mutating the prior state and rejects absent entities", async () => {
    const { engine, d, pose } = await setup();
    const initial = engine.state;
    pose((s) => d.clearWorld(s));
    expect(engine.state.ball).toBe(null);
    expect(() => d.setBallSpin(engine.state, 1)).toThrow();
    expect(() => d.spawnObstacle(engine.state, 3)).toThrow();
    await engine.advance(1);
    pose((s) => d.spawnBall(s));
    pose((s) => d.spawnObstacle(s, 1));
    pose((s) => d.spawnObstacle(s, 0));
    pose((s) => d.spawnObstacle(s, 0));
    expect(engine.state.obstacles.map((o) => o.index)).toEqual([0, 1]);
    pose((s) => d.setBallPosition(s, 123, 456));
    pose((s) => d.setBallVelocity(s, 30, 40));
    pose((s) => d.setBallSpin(s, 99));
    pose((s) => d.setBallHeld(s, false));
    pose((s) => d.setBallHoldTimer(s, 0.25));
    pose((s) => d.setBallServeSign(s, -1));
    pose((s) => d.setReceiver(s, "right"));
    pose((s) => d.setMenuIndex(s, 2));
    pose((s) => d.setTitleIndex(s, 1));
    pose((s) => d.setResumeScreen(s, "countdown"));
    pose((s) => d.setWinner(s, "left"));
    pose((s) => d.setMuted(s, true));
    const snap = d.snapshot(engine.state);
    expect(snap.ball?.speed).toBe(50);
    expect(snap.ball?.spin).toBe(99);
    expect(snap.receiver).toBe("right");
    expect(snap.muted).toBe(true);
    const reconciled = d.reconcile(engine.state);
    expect(d.reconcile(reconciled)).toEqual(reconciled);
    pose((s) => d.drawBallServeSign(s));
    expect([-1, 1]).toContain(engine.state.ball!.serveSign);
    pose((s) => d.reset(s));
    expect(engine.state.simTime).toBe(0);
    expect(engine.state.muted).toBe(true);
    expect(initial.ball!.x).toBe(C.FIELD_CX);
    expect(d.menuItemRect(engine.state, -1)).toBe(null);
    pose((s) => d.setScreen(s, "playing"));
    expect(d.menuItemRect(engine.state, 0)).toBe(null);
  });
});
