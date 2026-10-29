import { defineConfig } from "drizzle-kit";

// Read DATABASE_URL from .env when it exists.
try {
  process.loadEnvFile();
} catch {
  // no .env file
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
