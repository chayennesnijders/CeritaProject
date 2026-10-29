import { describe, expect, it } from "vitest";
import { favouriteId, moveStatus, plannedLabel } from "./story-board";

describe("story board", () => {
  it("moves cards one column at a time and stops at the edges", () => {
    expect(moveStatus("idee", 1)).toBe("schrijven");
    expect(moveStatus("klaar", -1)).toBe("schrijven");
    expect(moveStatus("idee", -1)).toBeNull();
    expect(moveStatus("gepland", 1)).toBeNull();
    expect(moveStatus("verschenen", 1)).toBeNull();
  });

  it("says when a story comes", () => {
    expect(plannedLabel(null, "2026-11-02")).toBe("");
    expect(plannedLabel("2026-11-02", "2026-11-02")).toBe("Vandaag");
    expect(plannedLabel("2026-11-03", "2026-11-02")).toBe("Morgen");
    expect(plannedLabel("2026-11-05", "2026-11-02")).toBe("Over 3 dagen");
    expect(plannedLabel("2026-11-01", "2026-11-02")).toBe("Komt eraan");
    expect(plannedLabel("2026-11-20", "2026-11-02")).toContain("20");
  });

  it("gives the fire to the planned story with the most hearts", () => {
    const s = [
      { id: "a", status: "gepland", votes: 2 },
      { id: "b", status: "gepland", votes: 5 },
      { id: "c", status: "verschenen", votes: 9 },
    ];
    expect(favouriteId(s)).toBe("b");
    expect(favouriteId([{ id: "a", status: "gepland", votes: 0 }])).toBeNull();
  });
});
