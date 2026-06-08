import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const cloudinaryUploadMock = vi.hoisted(() => vi.fn());

vi.mock("../../lib/redis.js", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("../../lib/cloudinary.js", () => ({
  default: {
    uploader: {
      upload: cloudinaryUploadMock,
    },
  },
}));

import app from "../../app.js";
import Product from "../../models/product.model.js";
import User from "../../models/user.model.js";

afterEach(() => {
  vi.clearAllMocks();
});

async function loginAs({ name, email, password, role = "customer" }) {
  await User.create({
    name,
    email,
    password,
    role,
  });

  const res = await request(app).post("/api/auth/login").send({
    email,
    password,
  });

  return res.headers["set-cookie"];
}

describe("POST /api/products", () => {
  const validProductPayload = {
    name: "Phone",
    description: "Smartphone with 128GB storage",
    price: 799,
    image: "data:image/png;base64,abc123",
    category: "Electronics",
  };

  it("rejects requests without authentication", async () => {
    const res = await request(app).post("/api/products").send({
      ...validProductPayload,
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
  });

  it("rejects authenticated non-admin users", async () => {
    const cookies = await loginAs({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const res = await request(app)
      .post("/api/products")
      .set("Cookie", cookies)
      .send({
        ...validProductPayload,
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Access denied - Admin only",
      }),
    );
  });

  it("creates a product and uploads its image for admin users", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });

    cloudinaryUploadMock.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/demo/image/upload/v1/products/phone.jpg",
    });

    const res = await request(app)
      .post("/api/products")
      .set("Cookie", adminCookies)
      .send(validProductPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        name: validProductPayload.name,
        description: validProductPayload.description,
        price: validProductPayload.price,
        image: "https://res.cloudinary.com/demo/image/upload/v1/products/phone.jpg",
        category: validProductPayload.category,
        isFeatured: false,
      }),
    );

    expect(cloudinaryUploadMock).toHaveBeenCalledTimes(1);
    expect(cloudinaryUploadMock).toHaveBeenCalledWith(validProductPayload.image, {
      folder: "products",
    });

    const savedProduct = await Product.findOne({ name: validProductPayload.name });

    expect(savedProduct).toBeTruthy();
    expect(savedProduct.toObject()).toEqual(
      expect.objectContaining({
        name: validProductPayload.name,
        description: validProductPayload.description,
        price: validProductPayload.price,
        image: "https://res.cloudinary.com/demo/image/upload/v1/products/phone.jpg",
        category: validProductPayload.category,
        isFeatured: false,
      }),
    );
  });

  it("returns 500 when cloudinary does not return a secure_url", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-no-secure-url@example.com",
      password: "password123",
      role: "admin",
    });

    cloudinaryUploadMock.mockResolvedValue({});

    const res = await request(app)
      .post("/api/products")
      .set("Cookie", adminCookies)
      .send(validProductPayload);

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
      }),
    );

    const savedProduct = await Product.findOne({ name: validProductPayload.name });
    expect(savedProduct).toBeNull();
  });

  it("rejects product creation when name is missing", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-missing-name@example.com",
      password: "password123",
      role: "admin",
    });

    const res = await request(app)
      .post("/api/products")
      .set("Cookie", adminCookies)
      .send({
        description: validProductPayload.description,
        price: validProductPayload.price,
        image: validProductPayload.image,
        category: validProductPayload.category,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
    expect(cloudinaryUploadMock).not.toHaveBeenCalled();

    const products = await Product.find({});
    expect(products).toHaveLength(0);
  });

  it("rejects product creation when price is missing", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-missing-price@example.com",
      password: "password123",
      role: "admin",
    });

    const res = await request(app)
      .post("/api/products")
      .set("Cookie", adminCookies)
      .send({
        name: validProductPayload.name,
        description: validProductPayload.description,
        image: validProductPayload.image,
        category: validProductPayload.category,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/price/i);
    expect(cloudinaryUploadMock).not.toHaveBeenCalled();

    const products = await Product.find({});
    expect(products).toHaveLength(0);
  });

  it("rejects product creation when category is missing", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-missing-category@example.com",
      password: "password123",
      role: "admin",
    });

    const res = await request(app)
      .post("/api/products")
      .set("Cookie", adminCookies)
      .send({
        name: validProductPayload.name,
        description: validProductPayload.description,
        price: validProductPayload.price,
        image: validProductPayload.image,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/category/i);
    expect(cloudinaryUploadMock).not.toHaveBeenCalled();

    const products = await Product.find({});
    expect(products).toHaveLength(0);
  });
});
