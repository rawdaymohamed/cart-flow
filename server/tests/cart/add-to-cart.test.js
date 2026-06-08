import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import app from "../../app.js";
import Product from "../../models/product.model.js";
import User from "../../models/user.model.js";

afterEach(() => {
  vi.restoreAllMocks();
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

describe("POST /api/cart", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app).post("/api/cart").send({
      productId: "507f1f77bcf86cd799439011",
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
  });

  it("adds a product to an empty cart and saves the new quantity", async () => {
    const product = await Product.create({
      name: "Keyboard",
      description: "Mechanical keyboard",
      price: 120,
      image: "https://example.com/keyboard.jpg",
      category: "Accessories",
    });

    const cookies = await loginAs({
      name: "Cart Customer",
      email: "add.cart@example.com",
      password: "password123",
    });

    const res = await request(app)
      .post("/api/cart")
      .set("Cookie", cookies)
      .send({ productId: product._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        product: product._id.toString(),
        quantity: 1,
      }),
    ]);

    const user = await User.findOne({ email: "add.cart@example.com" });

    expect(user.cartItems).toHaveLength(1);
    expect(user.cartItems[0].product.toString()).toBe(product._id.toString());
    expect(user.cartItems[0].quantity).toBe(1);
  });

  it("increments the quantity when the product already exists in the cart", async () => {
    const product = await Product.create({
      name: "Mouse",
      description: "Wireless mouse",
      price: 60,
      image: "https://example.com/mouse.jpg",
      category: "Accessories",
    });

    const cookies = await loginAs({
      name: "Existing Cart Customer",
      email: "existing.cart@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "existing.cart@example.com" });
    user.cartItems = [{ product: product._id, quantity: 2 }];
    await user.save();

    const res = await request(app)
      .post("/api/cart")
      .set("Cookie", cookies)
      .send({ productId: product._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        product: product._id.toString(),
        quantity: 3,
      }),
    ]);

    const updatedUser = await User.findOne({
      email: "existing.cart@example.com",
    });

    expect(updatedUser.cartItems).toHaveLength(1);
    expect(updatedUser.cartItems[0].product.toString()).toBe(
      product._id.toString(),
    );
    expect(updatedUser.cartItems[0].quantity).toBe(3);
  });

  it("returns 500 when saving the updated cart fails", async () => {
    const product = await Product.create({
      name: "Monitor",
      description: "27-inch display",
      price: 300,
      image: "https://example.com/monitor.jpg",
      category: "Electronics",
    });

    const cookies = await loginAs({
      name: "Error Customer",
      email: "cart.save.error@example.com",
      password: "password123",
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const saveSpy = vi
      .spyOn(User.prototype, "save")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app)
      .post("/api/cart")
      .set("Cookie", cookies)
      .send({ productId: product._id.toString() });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in addToCart controller",
      "database unavailable",
    );
    expect(saveSpy).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
