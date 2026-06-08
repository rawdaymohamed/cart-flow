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

describe("DELETE /api/cart", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app).delete("/api/cart");

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
  });

  it("clears the entire cart when no productId is provided", async () => {
    const [firstProduct, secondProduct] = await Product.insertMany([
      {
        name: "Keyboard",
        description: "Mechanical keyboard",
        price: 120,
        image: "https://example.com/keyboard.jpg",
        category: "Accessories",
      },
      {
        name: "Mouse",
        description: "Wireless mouse",
        price: 60,
        image: "https://example.com/mouse.jpg",
        category: "Accessories",
      },
    ]);

    const cookies = await loginAs({
      name: "Cart Customer",
      email: "clear.cart@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "clear.cart@example.com" });
    user.cartItems = [
      { product: firstProduct._id, quantity: 2 },
      { product: secondProduct._id, quantity: 1 },
    ];
    await user.save();

    const res = await request(app).delete("/api/cart").set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    const updatedUser = await User.findOne({ email: "clear.cart@example.com" });
    expect(updatedUser.cartItems).toEqual([]);
  });

  it("removes only the matching product when productId is provided", async () => {
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
      name: "Selective Cart Customer",
      email: "selective.cart@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "selective.cart@example.com" });
    user.cartItems = [
      { product: firstProduct._id, quantity: 3 },
      { product: secondProduct._id, quantity: 1 },
    ];
    await user.save();

    const res = await request(app)
      .delete("/api/cart")
      .set("Cookie", cookies)
      .send({ productId: firstProduct._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        product: secondProduct._id.toString(),
        quantity: 1,
      }),
    ]);

    const updatedUser = await User.findOne({
      email: "selective.cart@example.com",
    });

    expect(updatedUser.cartItems).toHaveLength(1);
    expect(updatedUser.cartItems[0].product.toString()).toBe(
      secondProduct._id.toString(),
    );
    expect(updatedUser.cartItems[0].quantity).toBe(1);
  });

  it("returns 500 when saving the updated cart fails", async () => {
    const product = await Product.create({
      name: "Monitor",
      description: "4K display",
      price: 400,
      image: "https://example.com/monitor.jpg",
      category: "Electronics",
    });

    const cookies = await loginAs({
      name: "Error Customer",
      email: "remove.cart.error@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "remove.cart.error@example.com" });
    user.cartItems = [{ product: product._id, quantity: 2 }];
    await user.save();

    const saveSpy = vi
      .spyOn(User.prototype, "save")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app)
      .delete("/api/cart")
      .set("Cookie", cookies)
      .send({ productId: product._id.toString() });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
