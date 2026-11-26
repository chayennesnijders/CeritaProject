import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, makeZip, zipName } from "./zip";

describe("zip", () => {
  it("crc32 matches the known value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
  it("names are safe and readable", () => {
    expect(zipName("Rouwen mag zo lang als nodig is!")).toBe("Rouwen mag zo lang als nodig is");
    expect(zipName("../../geheim/é")).toBe("....geheime");
    expect(zipName("///")).toBe("bestand");
  });
  it("writes a zip that unzip can read", () => {
    const z = makeZip([{ name: "a.txt", data: new TextEncoder().encode("hallo") }, { name: "map/b.txt", data: new Uint8Array([1, 2, 3]) }]);
    const dir = mkdtempSync(join(tmpdir(), "zip-"));
    writeFileSync(join(dir, "t.zip"), z);
    const list = execFileSync("unzip", ["-l", join(dir, "t.zip")]).toString();
    expect(list).toContain("a.txt");
    expect(list).toContain("map/b.txt");
    expect(execFileSync("unzip", ["-p", join(dir, "t.zip"), "a.txt"]).toString()).toBe("hallo");
  });
});
