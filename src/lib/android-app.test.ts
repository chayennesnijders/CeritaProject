import { describe, expect, it } from "vitest";
import { ANDROID_FINGERPRINTS, ANDROID_PACKAGE, assetLinks } from "./android-app";

const fp = Array.from({ length: 32 }, (_, i) =>
  (i * 7).toString(16).padStart(2, "0").slice(-2),
).join(":");

describe("assetLinks", () => {
  it("always links the Play Store app with its own signing fingerprints", () => {
    const r = assetLinks({});
    expect(ANDROID_PACKAGE).toBe("com.ceritaproject.mijnapp");
    expect(r[0]!.target.package_name).toBe(ANDROID_PACKAGE);
    expect(r[0]!.target.sha256_cert_fingerprints).toEqual(ANDROID_FINGERPRINTS);
    expect(
      assetLinks({ ANDROID_SHA256_FINGERPRINTS: "niet-goed" })[0]!.target.sha256_cert_fingerprints,
    ).toEqual(ANDROID_FINGERPRINTS);
  });
  it("adds extra fingerprints once, accepting lower case", () => {
    const r = assetLinks({ ANDROID_SHA256_FINGERPRINTS: ` ${fp}, ${fp.toUpperCase()} ` });
    expect(r[0]!.target.sha256_cert_fingerprints).toEqual([
      ...ANDROID_FINGERPRINTS,
      fp.toUpperCase(),
    ]);
  });
  it("fingerprints are well-formed", () => {
    for (const f of ANDROID_FINGERPRINTS) expect(f).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  });
});
