import type { UpdateApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import type { CaromState } from "./game";
import { ACTIONS, type ActionName } from "./constants";
import { itemAt, menuItems } from "./menus";
import { startMatch, toTitle } from "./state";
import { advanceBall, movePaddles } from "./physics";
function confirm(s: CaromState): CaromState {
  if (s.screen === "title") {
    s = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 2
      ? { ...s, screen: "howto", menuIndex: 0 }
      : startMatch(s, s.menuIndex === 0 ? "solo" : "versus");
  }
  if (s.screen === "howto") return toTitle(s);
  if (s.screen === "paused") {
    if (s.menuIndex === 0) return { ...s, screen: s.resumeScreen };
    return s.menuIndex === 1 ? startMatch(s, s.mode) : toTitle(s);
  }
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? startMatch(s, s.mode) : toTitle(s);
  return s;
}
export function update(
  state: DeepReadonly<CaromState>,
  api: UpdateApi,
  dt: number,
): CaromState {
  const pressed = Object.fromEntries(
    ACTIONS.map((a) => [a, api.input.pressed(a)]),
  ) as Record<ActionName, boolean>;
  const held = Object.fromEntries(
    ACTIONS.map((a) => [a, api.input.value(a) > 0]),
  ) as Record<ActionName, boolean>;
  const samples = api.input.pointerSamples();
  const contacts = api.input.pointerContacts();
  let s: CaromState = {
    ...state,
    simTime: state.simTime + dt,
    muted: pressed.mute ? !state.muted : state.muted,
  };
  api.audio.setMuted(s.muted);
  s = { ...s, muted: api.audio.muted() };
  const screen = state.screen;
  const active = screen === "playing" || screen === "countdown";
  if (active && pressed.pause)
    s = { ...s, resumeScreen: screen, screen: "paused", menuIndex: 0 };
  else if (screen === "paused" && (pressed.pause || pressed.back))
    s = { ...s, screen: s.resumeScreen };
  else if ((screen === "howto" || screen === "matchover") && pressed.back)
    s = toTitle(s);
  else if (!active) {
    const items = menuItems(screen);
    const up = pressed["p1-up"] || pressed["p2-up"];
    const down = pressed["p1-down"] || pressed["p2-down"];
    const moving = screen !== "howto" && (up || down);
    if (moving)
      s = {
        ...s,
        menuIndex: (s.menuIndex + (up ? -1 : 1) + items.length) % items.length,
      };
    const keyboardConfirm = !moving && pressed.confirm;
    if (keyboardConfirm) s = confirm(s);
    if (!keyboardConfirm) {
      const starts = { ...state.menuPresses };
      let pointerConfirm = false;
      for (const p of samples) {
        const i = itemAt(s, p.x, p.y);
        if (i >= 0 && (p.type === "move" || p.type === "down"))
          s = { ...s, menuIndex: i };
        if (p.type === "down" && p.button === "primary") starts[p.id] = i;
        if (p.type === "up") {
          if (i >= 0 && starts[p.id] === i && !pointerConfirm) {
            s = { ...s, menuIndex: i };
            pointerConfirm = true;
          }
          delete starts[p.id];
        }
      }
      // Contacts also select while held, including non-primary touches.
      for (const p of contacts) {
        const i = itemAt(s, p.x, p.y);
        if (i >= 0) s = { ...s, menuIndex: i };
      }
      s = { ...s, menuPresses: starts };
      if (pointerConfirm) s = confirm(s);
    }
  }
  if (s.screen !== screen) s = { ...s, menuPresses: {} };
  if (s.screen === "countdown" || s.screen === "playing")
    s = advanceBall(movePaddles(s, held, dt), dt, api.audio);
  return s;
}
