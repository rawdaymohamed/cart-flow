import mongoose from "mongoose";
import { z } from "zod";

export const updateQuantitySchema = z.object({
  params: z.object({
    id: z
      .string()
      .trim()
      .min(1, "Product ID is required")
      .refine((value) => mongoose.Types.ObjectId.isValid(value), {
        message: "Invalid product ID",
      }),
  }),
  body: z.object({
    quantity: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? "Quantity is required"
            : "Quantity must be a number",
      })
      .min(0, "Quantity cannot be negative"),
  }),
});
