/** The Android app's package name in the Play Store (also what PWABuilder should use). */
export const ANDROID_PACKAGE = "com.ceritaproject.mijnapp";

/**
 * Public SHA-256 certificate fingerprints of the Play Store app (not secret): Google's app signing key
 * (Play Console → App signing) and our upload key. Extra ones can be added via ANDROID_SHA256_FINGERPRINTS.
 */
export const ANDROID_FINGERPRINTS = [
  "B0:4A:EE:10:23:E8:79:C8:35:38:7E:61:4E:2B:59:48:49:80:2C:3B:B2:F4:D0:84:7E:AF:ED:9B:73:0C:74:8A",
  "01:60:E5:4C:4A:A2:65:08:6E:82:64:DB:F2:62:C3:DC:25:77:FA:6C:25:86:C5:D0:D3:EC:9A:33:1C:D0:B5:6D",
];

/**
 * The /.well-known/assetlinks.json content: the built-in fingerprints plus any in
 * ANDROID_SHA256_FINGERPRINTS (comma or space separated), as Play Console shows them under App signing.
 */
export function assetLinks(env: Record<string, string | undefined>) {
  const pkg = env["ANDROID_PACKAGE_NAME"]?.trim() || ANDROID_PACKAGE;
  const extra = (env["ANDROID_SHA256_FINGERPRINTS"] ?? "")
    .split(/[\s,;]+/)
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
  const fingerprints = [...new Set([...ANDROID_FINGERPRINTS, ...extra])];
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: pkg,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
