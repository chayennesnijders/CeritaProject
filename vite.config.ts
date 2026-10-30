import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";

// Nitro picks the hosting target itself (Vercel, Netlify, Cloudflare, …) or falls
// back to a plain Node server. Force one with NITRO_PRESET, e.g. NITRO_PRESET=node-server.
//
// The public Supabase address and publishable key may be set under other names (for example by the
// Vercel Supabase integration: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL). Use whichever is there for the app.
function publicSupabaseEnv(mode: string) {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const pick = (...names: string[]) => names.map((n) => env[n]).find((v) => v && v.trim());
  const define: Record<string, string> = {};
  const url = pick("VITE_SUPABASE_URL", "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const key = pick(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY",
  );
  if (url) define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(url);
  if (key) define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(key);
  return define;
}

export default defineConfig(({ command, mode }) => ({
  define: publicSupabaseEnv(mode),
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
