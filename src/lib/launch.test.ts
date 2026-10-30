import { describe, expect, it } from "vitest";
import {
  DB_UPDATES,
  LIVE_HOST,
  launchChecks,
  launchStatus,
  type ClientChecks,
  type ServerChecks,
} from "./launch";

const allServer: ServerChecks = {
  serviceRole: true,
  firebaseServer: true,
  resend: true,
  emailHook: true,
  stripeLive: true,
  openai: false,
  updates: Object.fromEntries(DB_UPDATES.map((u) => [u.id, true])),
  playlists: 0,
  articles: 12,
  upcomingEvents: 0,
};
const allClient: ClientChecks = {
  firebaseClient: true,
  stripeLiveClient: true,
  host: LIVE_HOST,
  kvk: false,
};

describe("launch checklist", () => {
  it("is ready when every required item is done, even without the nice extras", () => {
    expect(launchStatus(launchChecks(allServer, allClient))).toMatchObject({ ready: true });
  });
  it("is not ready while push is missing on one side or an update is missing", () => {
    expect(
      launchStatus(launchChecks(allServer, { ...allClient, firebaseClient: false })).ready,
    ).toBe(false);
    const s = launchStatus(
      launchChecks({ ...allServer, updates: { ...allServer.updates, "25": false } }, allClient),
    );
    expect(s.ready).toBe(false);
    expect(s.done).toBe(s.total - 1);
  });
  it("needs the real domain and live payments", () => {
    expect(
      launchStatus(launchChecks(allServer, { ...allClient, host: "ceritaproject.vercel.app" }))
        .ready,
    ).toBe(false);
    expect(launchStatus(launchChecks({ ...allServer, stripeLive: false }, allClient)).ready).toBe(
      false,
    );
  });
});
