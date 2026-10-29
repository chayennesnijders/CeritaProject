import { z } from "zod";

export const reportActionSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["answer", "reject", "hide"]),
  response: z.string().trim().max(2000),
}).refine((value) => value.action !== "answer" || value.response.length > 0, {
  message: "Schrijf eerst een antwoord", path: ["response"],
});