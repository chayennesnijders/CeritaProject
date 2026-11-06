import { describe, expect, it } from "vitest";
import { addMessage } from "./chat-merge";

const m = (id: string, t: string) => ({ id, created_at: `2026-11-06T${t}:00Z` });

describe("addMessage", () => {
  it("adds a new message at the right place", () => {
    expect(addMessage([m("a", "10:00"), m("c", "10:02")], m("b", "10:01")).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
  it("ignores a message that is already shown", () => {
    const list = [m("a", "10:00")];
    expect(addMessage(list, m("a", "10:00"))).toBe(list);
  });
  it("keeps newest-first lists newest first", () => {
    expect(addMessage([m("b", "10:01"), m("a", "10:00")], m("c", "10:02"), "newest-first").map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
});
