import { describe, expect, it } from "vitest";
import { messagePreview } from "./inbox-preview";

describe("messagePreview", () => {
  it("greets when there is no message yet", () => {
    expect(messagePreview(null, "me")).toBe("Zeg hallo 👋");
  });
  it("marks your own messages", () => {
    expect(messagePreview({ sender_id: "me", body: "hoi!" }, "me")).toBe("Jij: hoi!");
    expect(messagePreview({ sender_id: "x", body: "hoi!" }, "me")).toBe("hoi!");
  });
  it("names voice memos, photos, files, stickers and games", () => {
    expect(messagePreview({ sender_id: "x", body: "", audio_path: "a" }, "me")).toBe("🎤 Spraakbericht");
    expect(messagePreview({ sender_id: "x", body: "", attachment_path: "a", attachment_type: "image/png" }, "me")).toBe("📷 Foto");
    expect(messagePreview({ sender_id: "x", body: "", attachment_path: "a", attachment_type: "application/pdf" }, "me")).toBe("📎 Bestand");
    expect(messagePreview({ sender_id: "x", body: "🧸 Knuffel", sticker: "knuffel" }, "me")).toBe("🧸 Sticker");
    expect(messagePreview({ sender_id: "x", body: "🎱 Ik daag je uit", game_id: "g" }, "me")).toBe("🎮 🎱 Ik daag je uit");
  });
  it("keeps long messages to one short line", () => {
    const out = messagePreview({ sender_id: "x", body: "a\n\nb ".repeat(50) }, "me", 20);
    expect(out.length).toBe(20);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toContain("\n");
  });
});
