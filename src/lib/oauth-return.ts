/**
 * What came back in the address after signing in with Google (or a mail link): tokens, a one-time
 * code, or an error from Supabase. Read from both the ?query and the #hash.
 */
export type OAuthReturn =
  | { kind: "tokens"; accessToken: string; refreshToken: string }
  | { kind: "code"; code: string }
  | { kind: "error"; message: string }
  | { kind: "none" };

export function readOAuthReturn(href: string): OAuthReturn {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { kind: "none" };
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const get = (k: string) => hash.get(k) ?? url.searchParams.get(k);
  const error = get("error_description") ?? get("error");
  if (error) return { kind: "error", message: oauthErrorText(error.replace(/\+/g, " ")) };
  const accessToken = get("access_token");
  const refreshToken = get("refresh_token");
  if (accessToken && refreshToken) return { kind: "tokens", accessToken, refreshToken };
  const code = url.searchParams.get("code");
  if (code) return { kind: "code", code };
  return { kind: "none" };
}

/** Supabase's English error in simple Dutch, keeping the original for when we need to look it up. */
export function oauthErrorText(raw: string) {
  const r = raw.toLowerCase();
  if (r.includes("database error saving new user"))
    return `Je account kon niet worden aangemaakt. Laat dit weten aan de beheerder. (${raw})`;
  if (r.includes("provider is not enabled") || r.includes("unsupported provider"))
    return `Inloggen met Google staat nog niet aan in Supabase. (${raw})`;
  if (r.includes("expired") || r.includes("invalid"))
    return `Deze inlog-link is verlopen of klopt niet. Probeer het opnieuw. (${raw})`;
  return `Inloggen lukte niet: ${raw}`;
}
