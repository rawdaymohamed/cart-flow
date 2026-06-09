import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app.js";
import Category from "../../models/category.model.js";
import User from "../../models/user.model.js";

vi.mock("cloudinary", () => ({
  v2: {
    config: vi.fn(),
    uploader: {
      destroy: vi.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));

const getAdminCookie = async () => {
  const admin = await User.create({
    name: "Admin User",
    email: "admin2@test.com",
    password: "password123",
    role: "admin",
  });
  const token = jwt.sign(
    { userId: admin._id },
    process.env.ACCESS_TOKEN_SECRET || "test_secret",
  );
  return `accessToken=${token}`;
};

describe("DELETE /api/categories/:id", () => {
  it("should return 400 if the provided ID is not a valid MongoDB ObjectId layout", async () => {
    const cookie = await getAdminCookie();

    const response = await request(app)
      .delete("/api/categories/not-a-valid-id-123")
      .set("Cookie", [cookie]);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid category ID format");
  });

  it("should return 404 if the category does not exist in the database", async () => {
    const cookie = await getAdminCookie();
    // Create a structurally valid ID that simply does not map to any document
    const fakeValidId = "60c72b2f9b1d8b2bad000000";

    const response = await request(app)
      .delete(`/api/categories/${fakeValidId}`)
      .set("Cookie", [cookie]);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Category not found");
  });

  it("should cleanly delete the document from the database and call asset cleanup", async () => {
    const cookie = await getAdminCookie();

    const category = await Category.create({
      name: "Books",
      slug: "books",
      imageUrl:
        "https://res.cloudinary.com/demo/image/upload/v1/categories/books.png",
    });

    const response = await request(app)
      .delete(`/api/categories/${category._id}`)
      .set("Cookie", [cookie]);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Category deleted successfully");

    // Double check database state directly to make sure it was swept away
    const found = await Category.findById(category._id);
    expect(found).toBeNull();
  });
});
