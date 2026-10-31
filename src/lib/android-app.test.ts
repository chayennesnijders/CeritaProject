import { describe, expect, it } from "vitest";
import { ANDROID_PACKAGE, assetLinks } from "./android-app";

const fp = Array.from({ length: 32 }, (_, i) =>
  (i * 7).toString(16).padStart(2, "0").slice(-2),
).join(":");

describe("assetLinks", () => {
  it("is empty until a fingerprint is set", () => {
    expect(assetLinks({})).toEqual([]);
    expect(assetLinks({ ANDROID_SHA256_FINGERPRINTS: "niet-goed" })).toEqual([]);
  });
  it("links the Play Store app to the site, accepting lower case and several fingerprints", () => {
    const r = assetLinks({ ANDROID_SHA256_FINGERPRINTS: ` ${fp}, ${fp.toUpperCase()} ` });
    expect(r[0]!.target.package_name).toBe(ANDROID_PACKAGE);
    expect(r[0]!.target.sha256_cert_fingerprints).toEqual([fp.toUpperCase(), fp.toUpperCase()]);
  });
});
