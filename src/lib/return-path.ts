/**
 * Where to go after logging in, from "?terug=/testlijst". Only paths inside the app are allowed,
 * so a link can never send someone to another website after they log in.
 */
export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/home";
  if (/^\/(auth|bevestig|reset-password|api)(\/|\?|$)/.test(value)) return "/home";
  return value;
}
