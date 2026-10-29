import { expect, it } from "vitest";
import { chatAudioPath } from "./chat-audio";

it("houdt privé- en groepsmemo’s bij hun eigen gesprek en afzender", () => {
  expect(chatAudioPath("member", "dm", "conversation", "recording")).toBe("member/dm/conversation/recording.wav");
  expect(chatAudioPath("member", "group", "group", "recording")).toBe("member/group/group/recording.wav");
});