import { describe, expect, it } from "vitest";
import { isNativeApp, platformOf, shouldShowInstall } from "./install";

describe("install guide", () => {
  it("knows our own iPhone app by its user agent", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 CeritaApp";
    expect(isNativeApp(ua)).toBe(true);
    expect(platformOf(ua)).toBe("ios");
    expect(isNativeApp("Mozilla/5.0 (iPhone) Safari/604.1")).toBe(false);
  });
  it("is not shown once the app is installed", () => {
    expect(shouldShowInstall({ platform: "ios", standalone: true, seen: false })).toBe(false);
    expect(shouldShowInstall({ platform: "ios", standalone: false, seen: false })).toBe(true);
  });
});
