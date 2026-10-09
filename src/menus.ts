import type { CaromState, Screen } from "./game";
import { TITLE_ITEMS, PAUSE_ITEMS, MATCHOVER_ITEMS } from "./constants";
export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
export function menuItems(screen: Screen): readonly string[] {
  switch (screen) {
    case "title":
      return TITLE_ITEMS;
    case "paused":
      return PAUSE_ITEMS;
    case "matchover":
      return MATCHOVER_ITEMS;
    case "howto":
      return ["BACK TO MENU"];
    default:
      return [];
  }
}
export function menuItemRect(s: CaromState, index: number): MenuRect | null {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= menuItems(s.screen).length
  )
    return null;
  if (s.screen === "title")
    return { x: 100, y: 362 + index * 67, w: 382, h: 55 };
  if (s.screen === "howto") return { x: 440, y: 590, w: 400, h: 54 };
  return { x: 440, y: 366 + index * 66, w: 400, h: 54 };
}
export function itemAt(s: CaromState, x: number, y: number): number {
  return menuItems(s.screen).findIndex((_, i) => {
    const r = menuItemRect(s, i)!;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  });
}
