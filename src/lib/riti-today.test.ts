import { describe, expect, it } from "vitest";
import { ritiToday, type TodayState } from "./riti-today";

const base: TodayState = {
  moodChosen: true,
  news: 0,
  pet: { name: "Mimi", careLeft: 0 },
  groupUnread: 0,
  challengeDone: true,
  story: null,
  affirmation: "Rust nemen is ook iets doen.",
};

describe("ritiToday", () => {
  it("asks for the mood first and ends with a kind sentence", () => {
    const l = ritiToday({ ...base, moodChosen: false, news: 2 });
    expect(l[0]?.id).toBe("gevoel");
    expect(l[1]).toMatchObject({ id: "nieuws", to: "/meldingen" });
    expect(l.at(-1)?.id).toBe("zinnetje");
  });
  it("names the pet and how much care is left", () => {
    const l = ritiToday({ ...base, pet: { name: "Mimi", careLeft: 2 } });
    expect(l[0]?.text).toContain("Mimi");
    expect(l[0]?.text).toContain("2×");
  });
  it("invites to adopt without a pet", () => {
    expect(ritiToday({ ...base, pet: null })[0]).toMatchObject({ id: "diertje", button: "Adopteren" });
  });
  it("only shows an unread story of the day, with its id", () => {
    const story = { id: "s1", title: "Faalangst", read: false };
    expect(ritiToday({ ...base, story }).find((x) => x.id === "verhaal")?.storyId).toBe("s1");
    expect(ritiToday({ ...base, story: { ...story, read: true } }).some((x) => x.id === "verhaal")).toBe(false);
  });
  it("cheers when everything is done", () => {
    const l = ritiToday(base);
    expect(l).toHaveLength(1);
    expect(l[0]?.text).toMatch(/Alles gedaan/);
  });
});
