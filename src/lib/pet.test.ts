import { describe, it, expect } from "vitest";
import { levelFor, moodFor } from "./pet";

describe("virtueel diertje", () => {
  it("level groeit per 50 XP", () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(49).level).toBe(1);
    expect(levelFor(50).level).toBe(2);
  });
  it("een dag overslaan geeft geen negatieve stemming", () => {
    expect(moodFor(0)).toBe("Rust lekker uit 😴");
  });
});

import { BACKGROUNDS, OUTFITS, isUnlocked, unlocksAt } from "./pet";
describe("upgrades", () => {
  it("level 1 heeft alleen de basis", () => {
    const all = [...BACKGROUNDS, ...OUTFITS].filter((i) => isUnlocked(i, 1)).map((i) => i.id);
    expect(all).toEqual(["kamer", "geen"]);
  });
  it("bij level 2 komen er dingen bij", () => {
    expect(unlocksAt(2).map((i) => i.id)).toEqual(["tuin", "strik"]);
  });
});

import { extraPetSlots } from "./pet";
describe("verzameling", () => {
  it("nieuw diertje bij level 3 en 5", () => {
    expect(extraPetSlots(1)).toBe(0);
    expect(extraPetSlots(2)).toBe(0);
    expect(extraPetSlots(3)).toBe(1);
    expect(extraPetSlots(5)).toBe(2);
  });
});

import { petDay, careUnlocked, todoPopupKey, shouldAutoOpenTodoPopup } from "./pet";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("dagelijkse refresh om 07:00", () => {
  i2("06:59 Amsterdam telt nog als gisteren", () => {
    e2(petDay(new Date("2026-10-16T04:59:00Z"))).toBe("2026-10-15"); // 06:59 CEST
  });
  i2("07:00 Amsterdam start een nieuwe dag", () => {
    e2(petDay(new Date("2026-10-16T05:00:00Z"))).toBe("2026-10-16");
  });
  i2("verzorgen pas na minstens één taak", () => {
    e2(careUnlocked(0)).toBe(false);
    e2(careUnlocked(1)).toBe(true);
  });
  i2("popupje popt vanzelf op als er nog niets ingevuld is", () => {
    e2(shouldAutoOpenTodoPopup(0, false)).toBe(true);
    e2(shouldAutoOpenTodoPopup(1, false)).toBe(false);
    e2(shouldAutoOpenTodoPopup(0, true)).toBe(false);
  });
  i2("popupje onthoudt per diertje en per dag", () => {
    e2(todoPopupKey("main", "2026-10-15")).toBe("cerita-todo-popup-main-2026-10-15");
    e2(todoPopupKey("main", "2026-10-15")).not.toBe(todoPopupKey("main", "2026-10-16"));
    e2(todoPopupKey("main", "2026-10-15")).not.toBe(todoPopupKey("abc-123", "2026-10-15"));
  });
});
