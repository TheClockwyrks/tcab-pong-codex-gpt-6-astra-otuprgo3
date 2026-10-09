import type { RenderApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import type { CaromState } from "./game";
import * as C from "./constants";
import { menuItems, menuItemRect } from "./menus";
const INK = "#edf3e8",
  MUTED = "#819698",
  MINT = "#a7f3ce",
  CORAL = "#fb927f",
  GOLD = "#ebc379";
type Context = RenderApi["ctx"];
function text(
  ctx: Context,
  value: string,
  x: number,
  y: number,
  size = 16,
  color = INK,
  weight = "500",
  align: CanvasTextAlign = "left",
): void {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(value, x, y);
}
function line(
  ctx: Context,
  x: number,
  y: number,
  xx: number,
  yy: number,
  color: string,
  width = 1,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(xx, yy);
  ctx.stroke();
}
function bar(
  ctx: Context,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  glow = false,
): void {
  ctx.save();
  ctx.fillStyle = color;
  if (glow) {
    ctx.shadowBlur = 22;
    ctx.shadowColor = color + "45";
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(w / 2, 8));
  ctx.fill();
  ctx.restore();
}
function dot(
  ctx: Context,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
function background(ctx: Context): void {
  const glow = ctx.createRadialGradient(850, 340, 20, 700, 360, 820);
  glow.addColorStop(0, "#192c30");
  glow.addColorStop(1, "#101b20");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
  ctx.fillStyle = "#a7c8bc0b";
  for (let x = 24; x < C.FIELD_W; x += 32)
    for (let y = 24; y < C.FIELD_H; y += 32) ctx.fillRect(x, y, 1, 1);
}
function brand(ctx: Context): void {
  bar(ctx, 44, 36, 5, 23, MINT);
  bar(ctx, 64, 28, 5, 23, CORAL);
  dot(ctx, 56, 38, 3, INK);
  text(ctx, "CAROM  /  PADDLE CLUB", 88, 41, 12, MUTED, "700");
  text(ctx, "01  —  THE BANK SHOT", 1236, 41, 12, MUTED, "500", "right");
}
function footer(ctx: Context, s: CaromState): void {
  line(ctx, 44, 659, 1236, 659, "#344448");
  text(ctx, "W / S  or  ↑ / ↓   MOVE", 44, 686, 12, MUTED);
  text(ctx, "ENTER   SELECT", 330, 686, 12, MUTED);
  text(ctx, "P / ESC   PAUSE", 555, 686, 12, MUTED);
  text(
    ctx,
    `M   SOUND ${s.muted ? "OFF" : "ON"}`,
    1236,
    686,
    12,
    s.muted ? MUTED : MINT,
    "500",
    "right",
  );
}
function menu(ctx: Context, s: CaromState): void {
  const descriptions = [
    "You against the machine",
    "Two players. One keyboard.",
    "A little motion goes a long way",
  ];
  menuItems(s.screen).forEach((label, i) => {
    const r = menuItemRect(s, i)!;
    const selected = i === s.menuIndex;
    ctx.fillStyle = selected ? MINT : "#18282d";
    ctx.strokeStyle = selected ? MINT : "#35484a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.stroke();
    text(
      ctx,
      label,
      r.x + 22,
      r.y + r.h / 2,
      16,
      selected ? "#122821" : INK,
      "700",
    );
    text(
      ctx,
      selected ? "↗" : "→",
      r.x + r.w - 24,
      r.y + r.h / 2,
      24,
      selected ? "#122821" : MUTED,
      "500",
      "center",
    );
    if (s.screen === "title" && selected)
      text(ctx, descriptions[i], r.x, r.y + r.h + 167 - i * 67, 13, MUTED);
  });
}
function titleArt(ctx: Context): void {
  ctx.save();
  ctx.translate(660, 143);
  text(ctx, "THE COURT", 0, -18, 11, MUTED, "700");
  text(ctx, "SPIN. BANK. REPEAT.", 520, -18, 11, GOLD, "700", "right");
  ctx.fillStyle = "#0e1b20";
  ctx.strokeStyle = "#3a5355";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0, 0, 520, 408, 12);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([4, 9]);
  line(ctx, 260, 20, 260, 388, "#3b5152");
  ctx.setLineDash([]);
  ctx.strokeStyle = "#263d3e";
  ctx.beginPath();
  ctx.arc(260, 204, 68, 0, Math.PI * 2);
  ctx.stroke();
  bar(ctx, 25, 247, 9, 69, MINT, true);
  bar(ctx, 486, 79, 9, 69, CORAL, true);
  bar(ctx, 174, 71, 11, 90, GOLD, true);
  bar(ctx, 335, 244, 11, 90, GOLD, true);
  // A diagram of a bank shot: clearly a court illustration on the title, never simulation.
  ctx.strokeStyle = "#a7f3ce";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 7]);
  ctx.beginPath();
  ctx.moveTo(40, 280);
  ctx.bezierCurveTo(90, 215, 128, 189, 169, 167);
  ctx.lineTo(281, 38);
  ctx.bezierCurveTo(332, 102, 376, 145, 431, 161);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 12; i++)
    dot(
      ctx,
      431 - i * 3,
      161 - i * 0.8,
      8 - i * 0.45,
      `rgba(237,243,232,${0.8 - i * 0.06})`,
    );
  dot(ctx, 431, 161, C.BALL_R, INK);
  text(ctx, "01", 43, 324, 11, MINT);
  text(ctx, "02", 471, 65, 11, CORAL, "500", "right");
  text(ctx, "↗  MAKE THE ANGLE YOURS", 24, 378, 11, MUTED, "700");
  ctx.restore();
  text(
    ctx,
    "A familiar duel. A different trajectory.",
    920,
    591,
    15,
    MUTED,
    "500",
    "center",
  );
}
function field(ctx: Context, s: CaromState): void {
  ctx.save();
  ctx.setLineDash([7, 13]);
  line(ctx, C.NET_X, 0, C.NET_X, C.FIELD_H, "#45606355", 2);
  ctx.setLineDash([]);
  ctx.strokeStyle = "#35505255";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(C.FIELD_CX, C.FIELD_CY, 76, 0, Math.PI * 2);
  ctx.stroke();
  line(ctx, 0, 1, C.FIELD_W, 1, "#5b7479", 2);
  line(ctx, 0, C.FIELD_H - 1, C.FIELD_W, C.FIELD_H - 1, "#5b7479", 2);
  for (let y = 24; y < C.FIELD_H; y += 24) {
    line(ctx, 14, y, 20, y, "#31474b");
    line(ctx, C.FIELD_W - 20, y, C.FIELD_W - 14, y, "#31474b");
  }
  text(ctx, "PLAYER 01", C.FIELD_CX - 95, 36, 11, MINT, "700", "right");
  text(
    ctx,
    s.mode === "solo" ? "MACHINE" : "PLAYER 02",
    C.FIELD_CX + 95,
    36,
    11,
    CORAL,
    "700",
  );
  text(
    ctx,
    String(s.score.p1).padStart(2, "0"),
    C.FIELD_CX - 95,
    86,
    66,
    MINT,
    "700",
    "right",
  );
  text(
    ctx,
    String(s.score.p2).padStart(2, "0"),
    C.FIELD_CX + 95,
    86,
    66,
    CORAL,
    "700",
  );
  text(
    ctx,
    s.mode === "solo" ? "SOLO / HUMAN × MACHINE" : "VERSUS / LOCAL DUEL",
    40,
    34,
    11,
    MUTED,
    "700",
  );
  text(
    ctx,
    `FIRST TO ${C.WIN_SCORE} · WIN BY ${C.WIN_LEAD}`,
    1240,
    34,
    11,
    MUTED,
    "500",
    "right",
  );
  for (const o of s.obstacles) {
    bar(
      ctx,
      o.cx - C.OBSTACLE_W / 2,
      o.cy - C.OBSTACLE_H / 2,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      GOLD,
      true,
    );
    text(
      ctx,
      o.index === 0 ? "A" : "B",
      o.cx,
      o.cy + C.OBSTACLE_H / 2 + 21,
      10,
      "#a38f66",
      "700",
      "center",
    );
  }
  bar(
    ctx,
    C.P1_X0,
    s.paddles.left.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    MINT,
    true,
  );
  bar(
    ctx,
    C.P2_X0,
    s.paddles.right.cy - C.PADDLE_HALF,
    C.PADDLE_W,
    C.PADDLE_H,
    CORAL,
    true,
  );
  if (s.ball) {
    const b = s.ball;
    for (let i = 1; i < b.trail.length; i++) {
      const p = b.trail[i - 1],
        q = b.trail[i];
      const alpha = Math.max(0, 1 - (s.simTime - q.t) / C.TRAIL_TIME) * 0.5;
      ctx.lineCap = "round";
      line(
        ctx,
        p.x,
        p.y,
        q.x,
        q.y,
        `rgba(237,243,232,${alpha})`,
        C.BALL_R * 2 * (i / b.trail.length),
      );
    }
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#f2f6dd66";
    dot(ctx, b.x, b.y, C.BALL_R, INK);
    ctx.shadowBlur = 0;
    if (b.held && s.screen === "countdown") {
      ctx.strokeStyle = MINT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        b.x,
        b.y,
        28,
        -Math.PI / 2,
        -Math.PI / 2 + (Math.PI * 2 * b.holdTimer) / C.HOLD_TIME,
      );
      ctx.stroke();
      text(
        ctx,
        "GET READY",
        C.FIELD_CX,
        C.FIELD_CY + 62,
        13,
        INK,
        "700",
        "center",
      );
      text(
        ctx,
        s.receiver === "left"
          ? "← YOUR SERVE TO RETURN"
          : "RETURN TO THE RIGHT →",
        C.FIELD_CX,
        C.FIELD_CY + 86,
        10,
        MUTED,
        "500",
        "center",
      );
    }
  }
  text(ctx, "W / S", 95, 690, 11, MINT);
  text(
    ctx,
    s.mode === "solo" ? "AI" : "↑ / ↓",
    1180,
    690,
    11,
    CORAL,
    "500",
    "right",
  );
  text(
    ctx,
    `P  PAUSE     ·     M  SOUND ${s.muted ? "OFF" : "ON"}`,
    C.FIELD_CX,
    691,
    10,
    MUTED,
    "500",
    "center",
  );
  ctx.restore();
}
function howto(ctx: Context, s: CaromState): void {
  text(
    ctx,
    "A LITTLE MOTION. A LOT OF POSSIBILITIES.",
    C.FIELD_CX,
    124,
    12,
    MINT,
    "700",
    "center",
  );
  text(ctx, "Make your move.", C.FIELD_CX, 181, 56, INK, "700", "center");
  const cards = [
    {
      x: 100,
      n: "01",
      title: "Meet the ball.",
      color: MINT,
      lines: [
        "SOLO   W / S or ↑ / ↓",
        "VERSUS   Left: W / S · Right: ↑ / ↓",
        "Move vertically. Defend your edge.",
      ],
    },
    {
      x: 470,
      n: "02",
      title: "Put a spin on it.",
      color: INK,
      lines: [
        "Move your paddle as you strike.",
        "Your motion bends the ball’s flight.",
        "Catch an edge for a sharper angle.",
      ],
    },
    {
      x: 840,
      n: "03",
      title: "Play the bank.",
      color: GOLD,
      lines: [
        "Amber obstacles turn shots around.",
        "Use the walls. Find a new route.",
        `First to ${C.WIN_SCORE}, with a ${C.WIN_LEAD}-point lead, wins.`,
      ],
    },
  ];
  cards.forEach((card) => {
    bar(ctx, card.x, 259, 340, 273, "#1a2b30");
    text(ctx, card.n, card.x + 24, 295, 13, card.color, "700");
    line(ctx, card.x + 24, 323, card.x + 316, 323, "#3b4d4f");
    text(ctx, card.title, card.x + 24, 363, 25, card.color, "700");
    card.lines.forEach((v, i) =>
      text(ctx, v, card.x + 24, 411 + i * 30, 14, MUTED),
    );
  });
  text(
    ctx,
    "Touchscreen? Use the vertical sliders.   P / ESC pauses.   M toggles sound.",
    C.FIELD_CX,
    561,
    13,
    MUTED,
    "500",
    "center",
  );
  menu(ctx, s);
}
export function render(s: DeepReadonly<CaromState>, api: RenderApi): void {
  const ctx = api.ctx;
  ctx.save();
  background(ctx);
  if (s.screen === "title") {
    brand(ctx);
    text(ctx, "THE ANGLE IS EVERYTHING.", 100, 166, 12, MINT, "700");
    text(ctx, C.TITLE_TEXT, 92, 245, 104, INK, "900");
    text(ctx, "A paddle duel with a twist.", 100, 314, 23, MUTED);
    titleArt(ctx);
    menu(ctx, s);
    footer(ctx, s);
  } else if (s.screen === "howto") {
    brand(ctx);
    howto(ctx, s);
  } else {
    field(ctx, s);
    if (s.screen === "paused" || s.screen === "matchover") {
      ctx.fillStyle = "#0c171ddd";
      ctx.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      bar(ctx, 384, 164, 512, 430, "#17282d");
      text(
        ctx,
        s.screen === "paused" ? "TAKE A BREATHER" : "MATCH COMPLETE",
        C.FIELD_CX,
        207,
        12,
        MINT,
        "700",
        "center",
      );
      text(
        ctx,
        s.screen === "paused"
          ? "Paused."
          : s.winner === "left"
            ? "Player 01 wins."
            : s.mode === "solo"
              ? "Machine wins."
              : "Player 02 wins.",
        C.FIELD_CX,
        267,
        46,
        INK,
        "700",
        "center",
      );
      text(
        ctx,
        s.screen === "paused"
          ? "Your next angle can wait."
          : `${s.score.p1}  —  ${s.score.p2}   /   WELL PLAYED`,
        C.FIELD_CX,
        320,
        16,
        MUTED,
        "500",
        "center",
      );
      menu(ctx, s);
    }
  }
  ctx.restore();
}
