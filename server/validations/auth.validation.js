import { z } from "zod";

export const signupSchema = z.object({
  body: z.object({
    name: z.string("Name is required").trim().min(1, "Please enter all fields"),
    email: z
      .string("Email is required")
      .trim()
      .email("Please provide a valid email"),
    password: z
      .string("Password is required")
      .min(8, "Password must be at least 8 characters"),
  }),
});
