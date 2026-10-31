/** The Android app's package name in the Play Store (also what PWABuilder should use). */
export const ANDROID_PACKAGE = "nl.ceritaproject.app";

/**
 * The /.well-known/assetlinks.json content. ANDROID_SHA256_FINGERPRINTS holds one or more SHA-256
 * certificate fingerprints (comma or space separated), as Play Console shows them under App signing.
 */
export function assetLinks(env: Record<string, string | undefined>) {
  const pkg = env["ANDROID_PACKAGE_NAME"]?.trim() || ANDROID_PACKAGE;
  const fingerprints = (env["ANDROID_SHA256_FINGERPRINTS"] ?? "")
    .split(/[\s,;]+/)
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
  if (!fingerprints.length) return [];
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
