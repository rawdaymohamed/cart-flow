import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("GET /api/cart", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app).get("/api/cart");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
  });

  it("returns cart products with their saved quantities for authenticated users", async () => {
    const [firstProduct, secondProduct] = await Product.insertMany([
      {
        name: "Laptop",
        description: "Portable workstation",
        price: 1200,
        image: "https://example.com/laptop.jpg",
        category: "Electronics",
      },
      {
        name: "Headphones",
        description: "Wireless headphones",
        price: 250,
        image: "https://example.com/headphones.jpg",
        category: "Electronics",
      },
    ]);

    const cookies = await loginAs({
      name: "Cart Customer",
      email: "cart.customer@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "cart.customer@example.com" });

    user.cartItems = [
      { product: secondProduct._id, quantity: 3 },
      { product: firstProduct._id, quantity: 1 },
    ];
    await user.save();

    const res = await request(app).get("/api/cart").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        _id: secondProduct._id.toString(),
        name: "Headphones",
        quantity: 3,
      }),
    );
    expect(res.body[1]).toEqual(
      expect.objectContaining({
        _id: firstProduct._id.toString(),
        name: "Laptop",
        quantity: 1,
      }),
    );
  });

  it("returns an empty array when the authenticated user has no cart items", async () => {
    const cookies = await loginAs({
      name: "Empty Cart Customer",
      email: "empty.cart@example.com",
      password: "password123",
    });

    const res = await request(app).get("/api/cart").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 when loading cart products fails", async () => {
    const product = await Product.create({
      name: "Monitor",
      description: "4K display",
      price: 400,
      image: "https://example.com/monitor.jpg",
      category: "Electronics",
    });

    const cookies = await loginAs({
      name: "Error Customer",
      email: "cart.error@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "cart.error@example.com" });
    user.cartItems = [{ product: product._id, quantity: 2 }];
    await user.save();

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const findSpy = vi
      .spyOn(Product, "find")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app).get("/api/cart").set("Cookie", cookies);

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in getCartProducts controller",
      "database unavailable",
    );

    findSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
