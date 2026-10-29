import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";

// Nitro picks the hosting target itself (Vercel, Netlify, Cloudflare, …) or falls
// back to a plain Node server. Force one with NITRO_PRESET, e.g. NITRO_PRESET=node-server.
export default defineConfig(({ command }) => ({
  server: { host: "::", port: 8080 },
  css: { transformer: "lightningcss" },
  resolve: {
    alias: {
      "@": path.resolve("src"),
      "entities/lib/decode.js": path.resolve("node_modules/entities/lib/decode.js"),
      "entities/lib/encode.js": path.resolve("node_modules/entities/lib/encode.js"),
      entities: path.resolve("node_modules/entities"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    ...(command === "build" ? [nitro()] : []),
    viteReact(),
  ],
}));
