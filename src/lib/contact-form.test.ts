import { describe, expect, it } from "vitest";
import { contactReady, isEmail, senderType } from "./contact-form";

describe("contact form", () => {
  it("checks e-mail addresses", () => {
    expect(isEmail("ouder@example.nl")).toBe(true);
    expect(isEmail("geen-email")).toBe(false);
  });

  it("is ready only when filled in and the spam trap is empty", () => {
    const ok = { name: "Marieke", email: "m@example.nl", body: "Hoe veilig is de app?", trap: "" };
    expect(contactReady(ok)).toBe(true);
    expect(contactReady({ ...ok, trap: "spam" })).toBe(false);
    expect(contactReady({ ...ok, body: "hoi" })).toBe(false);
  });

  it("falls back to 'iets anders' for unknown senders", () => {
    expect(senderType("ouder")).toBe("ouder");
    expect(senderType("hacker")).toBe("anders");
  });
});
