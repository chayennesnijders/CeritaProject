import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[][] = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrls: async (paths: string[]) => {
          calls.push(paths);
          return { data: paths.map((p) => (p.includes("weg") ? { path: p, signedUrl: "", error: "not found" } : { path: p, signedUrl: `https://x/${p}?token=t`, error: null })) };
        },
      }),
    },
  },
}));

const { signBatched, rememberedLink } = await import("./articles");

beforeEach(() => {
  calls.length = 0;
  localStorage.clear();
});

describe("photo links", () => {
  it("makes the links for many photos in one request", async () => {
    const paths = Array.from({ length: 150 }, (_, i) => `verhalen/${i}.jpg`);
    const urls = await Promise.all(paths.map((p) => signBatched("article-images", p)));
    expect(calls).toHaveLength(2); // 100 + 50
    expect(urls[0]).toBe("https://x/verhalen/0.jpg?token=t");
    expect(urls[149]).toBe("https://x/verhalen/149.jpg?token=t");
  });

  it("asks once for a photo that is shown twice", async () => {
    const [a, b] = await Promise.all([signBatched("article-images", "x.jpg"), signBatched("article-images", "x.jpg")]);
    expect(calls).toEqual([["x.jpg"]]);
    expect(a).toBe(b);
  });

  it("remembers links so the next visit reuses them", async () => {
    await signBatched("article-images", "y.jpg");
    expect(rememberedLink("article-images", "y.jpg")).toBe("https://x/y.jpg?token=t");
    expect(rememberedLink("chat-files", "y.jpg")).toBeNull();
  });

  it("gives null for a photo that is gone", async () => {
    expect(await signBatched("article-images", "weg.jpg")).toBeNull();
  });
});
