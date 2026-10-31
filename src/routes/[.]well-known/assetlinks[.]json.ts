import { createFileRoute } from "@tanstack/react-router";
import { assetLinks } from "@/lib/android-app";

// Digital Asset Links: proves to Android that the Play Store app and app.ceritaproject.nl belong
// together, so the app opens full screen without an address bar. The signing fingerprint(s) come from
// Play Console (Setup → App signing) and go in Vercel as ANDROID_SHA256_FINGERPRINTS.
export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: () =>
        Response.json(assetLinks(process.env), {
          headers: { "Cache-Control": "public, max-age=300" },
        }),
    },
  },
});
