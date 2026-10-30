import { describe, expect, it } from "vitest";
import { attachmentKind, attachmentLabel, chatFilePath } from "./chat-files";

describe("chat files", () => {
  it("builds a safe storage path with the file's extension", () => {
    expect(chatFilePath("u1", "dm", "c1", "f1", "Vakantie.JPG")).toBe("u1/dm/c1/f1.jpg");
    expect(chatFilePath("u1", "group", "g1", "f1", "verslag.docx")).toBe("u1/group/g1/f1.docx");
    expect(chatFilePath("u1", "dm", "c1", "f1", "../../geen-extensie")).toBe("u1/dm/c1/f1.bin");
  });

  it("labels messages that only have an attachment", () => {
    expect(attachmentKind("image/heic")).toBe("image");
    expect(attachmentLabel("image/jpeg")).toBe("📷 Foto");
    expect(attachmentLabel("video/mp4")).toBe("🎬 Filmpje");
    expect(attachmentLabel("application/pdf")).toBe("📎 Bestand");
    expect(attachmentLabel(null)).toBe("📎 Bestand");
    expect(attachmentLabel("image/png", "tekening.png")).toBe("🎨 Tekening");
    expect(attachmentLabel("image/png", "vakantie.png")).toBe("📷 Foto");
  });
});
