import { describe, expect, it } from "vitest";
import { waitlistProblem, type WaitlistForm } from "./waitlist";

const ok: WaitlistForm = {
  email: "noor@example.nl",
  age: 17,
  store: "play",
  parentOk: false,
  privacyOk: true,
};

describe("waitlist", () => {
  it("is ready when everything is filled in", () => {
    expect(waitlistProblem(ok)).toBeNull();
  });
  it("keeps under-13s out and asks under-16s for a parent's okay", () => {
    expect(waitlistProblem({ ...ok, age: 12 })).toMatch(/vanaf 13/);
    expect(waitlistProblem({ ...ok, age: 14 })).toMatch(/ouder/);
    expect(waitlistProblem({ ...ok, age: 14, parentOk: true })).toBeNull();
  });
  it("asks for what is missing", () => {
    expect(waitlistProblem({ ...ok, email: "noor@" })).toMatch(/e-mailadres/);
    expect(waitlistProblem({ ...ok, age: null })).toMatch(/oud/);
    expect(waitlistProblem({ ...ok, store: null })).toMatch(/telefoon/);
    expect(waitlistProblem({ ...ok, privacyOk: false })).toMatch(/mail/);
  });
});
