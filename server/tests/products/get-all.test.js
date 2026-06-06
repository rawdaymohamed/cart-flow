import request from "supertest";
import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/redis.js", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

import app from "../../app.js";
import Product from "../../models/product.model.js";
import User from "../../models/user.model.js";

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

describe("GET /api/products", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app).get("/api/products");

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
      .get("/api/products")
      .set("Cookie", cookies);

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Access denied - Admin only",
      }),
    );
  });

  it("returns all products for admin users", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });

    const products = [
      {
        name: "Phone",
        description: "Smartphone with 128GB storage",
        price: 799,
        image: "https://example.com/phone.jpg",
        category: "Electronics",
      },
      {
        name: "Shoes",
        description: "Running shoes",
        price: 120,
        image: "https://example.com/shoes.jpg",
        category: "Fashion",
      },
    ];

    await Product.insertMany(products);

    const res = await request(app)
      .get("/api/products")
      .set("Cookie", adminCookies);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products).toHaveLength(2);
    expect(res.body.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Phone",
          description: "Smartphone with 128GB storage",
          price: 799,
          image: "https://example.com/phone.jpg",
          category: "Electronics",
        }),
        expect.objectContaining({
          name: "Shoes",
          description: "Running shoes",
          price: 120,
          image: "https://example.com/shoes.jpg",
          category: "Fashion",
        }),
      ]),
    );
  });

  it("returns an empty list when no products exist", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-empty@example.com",
      password: "password123",
      role: "admin",
    });

    const res = await request(app)
      .get("/api/products")
      .set("Cookie", adminCookies);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ products: [] });
  });
});
