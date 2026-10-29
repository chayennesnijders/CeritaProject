import { describe, expect, it } from "vitest";
import { topicInfo, unseenReplies } from "./admin-messages";

describe("admin messages", () => {
  it("knows the topics with a fallback", () => {
    expect(topicInfo("idee").emoji).toBe("💡");
    expect(topicInfo("raar").id).toBe("iets-anders");
  });

  it("counts answers you have not seen", () => {
    expect(
      unseenReplies([
        { reply: "Hoi!", reply_seen: false },
        { reply: "Al gezien", reply_seen: true },
        { reply: null, reply_seen: false },
      ]),
    ).toBe(1);
  });
});
