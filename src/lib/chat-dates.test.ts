import { describe, expect, it } from "vitest";
import { dayLabel, isToday, listStamp, shortDay, withDayDividers } from "./chat-dates";

// Lokale datums, zodat de test niet van de tijdzone afhangt.
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const now = new Date(2026, 9, 25, 15, 0); // zondag 25 oktober 2026

describe("datums in de chat", () => {
  it("noemt vandaag en gisteren bij naam", () => {
    expect(dayLabel(at(2026, 10, 25), now)).toBe("Vandaag");
    expect(dayLabel(at(2026, 10, 24), now)).toBe("Gisteren");
  });

  it("laat de dag van deze week zien en daarbuiten de volle datum", () => {
    expect(dayLabel(at(2026, 10, 21), now)).toBe("woensdag");
    expect(dayLabel(at(2026, 10, 18), now)).toBe("zondag 18 oktober");
  });

  it("plaatst een datumkop bij elke dagwissel", () => {
    const msgs = [
      { id: "1", created_at: at(2026, 10, 24, 9) },
      { id: "2", created_at: at(2026, 10, 24, 18) },
      { id: "3", created_at: at(2026, 10, 25, 8) },
    ];
    const rows = withDayDividers(msgs, (m) => m.created_at, now);
    expect(rows.filter((r) => r.kind === "day").map((r) => (r.kind === "day" ? r.label : ""))).toEqual(["Gisteren", "Vandaag"]);
    expect(rows).toHaveLength(5);
  });

  it("zet geen dubbele kop binnen dezelfde dag", () => {
    const msgs = [{ id: "1", created_at: at(2026, 10, 25, 9) }, { id: "2", created_at: at(2026, 10, 25, 10) }];
    expect(withDayDividers(msgs, (m) => m.created_at, now).filter((r) => r.kind === "day")).toHaveLength(1);
  });

  it("merkt een bericht van een eerdere dag met een kort datumstempeltje", () => {
    expect(isToday(at(2026, 10, 25), now)).toBe(true);
    expect(isToday(at(2026, 10, 24), now)).toBe(false);
    expect(shortDay(at(2026, 10, 24))).toContain("24");
  });

  it("kort het tijdstip in de gesprekslijst af per dag", () => {
    expect(listStamp(at(2026, 10, 25, 14, 37), now)).toBe("14:37");
    expect(listStamp(at(2026, 10, 24, 14, 37), now)).toBe("Gisteren 14:37");
    expect(listStamp(at(2026, 10, 18, 9, 5), now)).toContain("18 okt");
  });
});
