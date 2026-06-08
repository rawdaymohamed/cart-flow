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

const updateProductBodySchema = z
  .object({
    name: z.string("Name is required").trim().min(1, "Name is required").optional(),
    description: z
      .string("Description is required")
      .trim()
      .min(1, "Description is required")
      .optional(),
    price: z.number("Price is required").optional(),
    image: z.string("Image is required").trim().min(1, "Image is required").optional(),
    category: z
      .string("Category is required")
      .trim()
      .min(1, "Category is required")
      .optional(),
    isFeatured: z.boolean().optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one product field is required",
  });

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Product ID is required"),
  }),
  body: updateProductBodySchema,
});
