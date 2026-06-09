import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../app.js";
import Category from "../../models/category.model.js";
import User from "../../models/user.model.js"; // Path to your user model
import cloudinary from "cloudinary";

// 1. Mock Cloudinary to include v2 export
vi.mock("cloudinary", () => {
  return {
    v2: {
      config: vi.fn(), // Mock the config method used in your lib/cloudinary.js
      uploader: {
        upload: vi.fn().mockResolvedValue({
          secure_url: "https://res.cloudinary.com/mock-image.jpg",
        }),
      },
    },
  };
});
const getAdminCookie = async () => {
  const admin = await User.create({
    name: "Admin User",
    email: "admin@test.com",
    password: "password123",
    role: "admin",
  });
  const token = jwt.sign(
    { userId: admin._id },
    process.env.ACCESS_TOKEN_SECRET || "test_secret",
  );
  return `accessToken=${token}`;
};

// Helper function to create a user and generate an auth cookie
const getAuthCookieAndUser = async (role = "customer") => {
  const user = await User.create({
    name: "Test User",
    email: `${role}@test.com`,
    password: "hashedpassword123",
    role: role,
  });

  const accessToken = jwt.sign(
    { userId: user._id },
    process.env.ACCESS_TOKEN_SECRET || "test_secret",
    { expiresIn: "15m" },
  );

  return {
    cookie: `accessToken=${accessToken}`,
    user,
  };
};

describe("POST /api/categories - createCategory", () => {
  // --- AUTHENTICATION & AUTHORIZATION TESTS ---

  it("should return 401 if no access token cookie is provided", async () => {
    const response = await request(app)
      .post("/api/categories")
      .send({ name: "Gadgets", image: "data:image/jpeg;base64,..." });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain("No access token provided");
  });

  it("should return 403 if the user is authenticated but NOT an admin", async () => {
    const { cookie } = await getAuthCookieAndUser("customer"); // Regular user role

    const response = await request(app)
      .post("/api/categories")
      .set("Cookie", [cookie])
      .send({ name: "Gadgets", image: "data:image/jpeg;base64,..." });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("Admin only");
  });

  // --- VALIDATION TESTS ---

  it("should return 400 if name or image is missing", async () => {
    const { cookie } = await getAuthCookieAndUser("admin");

    const response = await request(app)
      .post("/api/categories")
      .set("Cookie", [cookie])
      .send({ name: "Missing Image Only" }); // No image field

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Name and image are required");
  });

  it("should return 400 if category name already exists", async () => {
    const { cookie } = await getAuthCookieAndUser("admin");

    // Pre-seed a category into the global in-memory DB
    await Category.create({
      name: "Kitchen",
      slug: "kitchen",
      imageUrl: "http://example.com/kitchen.jpg",
    });

    const response = await request(app)
      .post("/api/categories")
      .set("Cookie", [cookie])
      .send({ name: "Kitchen", image: "data:image/jpeg;base64,..." });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Category with this name already exists",
    );
  });

  // --- HAPPY PATH / SUCCESS TEST ---

  it("should successfully upload image, slugify name, and create category as admin", async () => {
    const { cookie } = await getAuthCookieAndUser("admin");

    const payload = {
      name: "Home & Living",
      image: "data:image/png;base64,mockstring...",
    };

    const response = await request(app)
      .post("/api/categories")
      .set("Cookie", [cookie])
      .send(payload);

    // Assert HTTP status
    expect(response.status).toBe(201);

    // Assert API response layout
    expect(response.body).toHaveProperty("_id");
    expect(response.body.name).toBe("Home & Living");
    expect(response.body.slug).toBe("home-living"); // Depends on how your slugify behaves
    expect(response.body.imageUrl).toBe(
      "https://res.cloudinary.com/mock-image.jpg",
    );

    // Double check the in-memory database directly to be absolutely sure
    const dbCategory = await Category.findOne({ name: "Home & Living" });
    expect(dbCategory).toBeTruthy();
  });
  it("should return 400 if the category name maps to an empty slug", async () => {
    const cookie = await getAdminCookie();

    const response = await request(app)
      .post("/api/categories")
      .set("Cookie", [cookie])
      .send({ name: "✨✨✨", image: "data:image/png;base64..." });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Category name must contain valid alphanumeric characters",
    );
  });

  it("should return 400 if a database race condition trips a unique key violation (11000)", async () => {
    const cookie = await getAdminCookie();

    // Force Category.create to throw a mock MongoDB duplicate key error
    vi.spyOn(Category, "create").mockRejectedValueOnce({ code: 11000 });

    const response = await request(app)
      .post("/api/categories")
      .set("Cookie", [cookie])
      .send({
        name: "Unique Race Condition",
        image: "data:image/png;base64...",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Category name or slug already exists");

    vi.restoreAllMocks();
  });
});
