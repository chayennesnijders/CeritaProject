import { describe, expect, it } from "vitest";
import { chatRequestError } from "./chat-request";

describe("chat request errors", () => {
  it("explains the waiting time for new accounts", () => {
    expect(chatRequestError({ code: "P0001", hint: "nieuw-account", message: "x" })).toMatch(/eerste 3 dagen/);
  });
  it("still explains an existing request and other errors", () => {
    expect(chatRequestError({ code: "23505" })).toMatch(/al een gesprek/);
    expect(chatRequestError({ code: "42501" })).toMatch(/lukte niet/);
    expect(chatRequestError(null)).toMatch(/lukte niet/);
  });
});
