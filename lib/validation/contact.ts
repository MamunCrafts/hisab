import { z } from "zod";
import { optionalTextSchema } from "./common";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "validation.nameMin").max(80, "validation.nameMax"),
  phone: optionalTextSchema(20).refine((v) => v === null || /^[+\d][\d\s-]{5,19}$/.test(v), "validation.phoneInvalid"),
  email: optionalTextSchema(254).refine((v) => v === null || z.string().email().safeParse(v).success, "validation.email"),
  note: optionalTextSchema(500),
});
export type ContactInput = z.input<typeof contactSchema>;
