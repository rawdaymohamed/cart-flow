import { z } from "zod";

export const createProductSchema = z.object({
  body: z.object({
    name: z.string("Name is required").trim().min(1, "Name is required"),
    description: z
      .string("Description is required")
      .trim()
      .min(1, "Description is required"),
    price: z.number("Price is required"),
    image: z.string("Image is required").trim().min(1, "Image is required"),
    category: z
      .string("Category is required")
      .trim()
      .min(1, "Category is required"),
  }),
});
