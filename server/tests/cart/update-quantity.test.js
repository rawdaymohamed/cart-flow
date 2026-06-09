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

describe("PUT /api/cart/:id", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app)
      .put("/api/cart/507f1f77bcf86cd799439011")
      .send({ quantity: 2 });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
  });

  it("updates the quantity for an existing cart item", async () => {
    const product = await Product.create({
      name: "Keyboard",
      description: "Mechanical keyboard",
      price: 120,
      image: "https://example.com/keyboard.jpg",
      category: "Accessories",
    });

    const cookies = await loginAs({
      name: "Cart Customer",
      email: "update.cart@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "update.cart@example.com" });
    user.cartItems = [{ product: product._id, quantity: 2 }];
    await user.save();

    const res = await request(app)
      .put(`/api/cart/${product._id.toString()}`)
      .set("Cookie", cookies)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        product: product._id.toString(),
        quantity: 5,
      }),
    ]);

    const updatedUser = await User.findOne({
      email: "update.cart@example.com",
    });
    expect(updatedUser.cartItems).toHaveLength(1);
    expect(updatedUser.cartItems[0].product.toString()).toBe(
      product._id.toString(),
    );
    expect(updatedUser.cartItems[0].quantity).toBe(5);
  });

  it("removes the product when the updated quantity is zero", async () => {
    const [firstProduct, secondProduct] = await Product.insertMany([
      {
        name: "Mouse",
        description: "Wireless mouse",
        price: 60,
        image: "https://example.com/mouse.jpg",
        category: "Accessories",
      },
      {
        name: "Monitor",
        description: "27-inch display",
        price: 300,
        image: "https://example.com/monitor.jpg",
        category: "Electronics",
      },
    ]);

    const cookies = await loginAs({
      name: "Remove Item Customer",
      email: "remove.quantity@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "remove.quantity@example.com" });
    user.cartItems = [
      { product: firstProduct._id, quantity: 3 },
      { product: secondProduct._id, quantity: 1 },
    ];
    await user.save();

    const res = await request(app)
      .put(`/api/cart/${firstProduct._id.toString()}`)
      .set("Cookie", cookies)
      .send({ quantity: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        product: secondProduct._id.toString(),
        quantity: 1,
      }),
    ]);

    const updatedUser = await User.findOne({
      email: "remove.quantity@example.com",
    });
    expect(updatedUser.cartItems).toHaveLength(1);
    expect(updatedUser.cartItems[0].product.toString()).toBe(
      secondProduct._id.toString(),
    );
    expect(updatedUser.cartItems[0].quantity).toBe(1);
  });

  it("rejects negative quantity", async () => {
    const product = await Product.create({
      name: "Chair",
      description: "Office chair",
      price: 180,
      image: "https://example.com/chair.jpg",
      category: "Furniture",
    });

    const cookies = await loginAs({
      name: "Negative Quantity Customer",
      email: "negative.quantity@example.com",
      password: "password123",
    });

    const res = await request(app)
      .put(`/api/cart/${product._id.toString()}`)
      .set("Cookie", cookies)
      .send({ quantity: -1 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Quantity cannot be negative",
      }),
    );
  });

  it("rejects missing quantity", async () => {
    const product = await Product.create({
      name: "Desk",
      description: "Standing desk",
      price: 350,
      image: "https://example.com/desk.jpg",
      category: "Furniture",
    });

    const cookies = await loginAs({
      name: "Missing Quantity Customer",
      email: "missing.quantity.field@example.com",
      password: "password123",
    });

    const res = await request(app)
      .put(`/api/cart/${product._id.toString()}`)
      .set("Cookie", cookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Quantity is required",
      }),
    );
  });

  it("rejects non-number quantity", async () => {
    const product = await Product.create({
      name: "Lamp",
      description: "Desk lamp",
      price: 45,
      image: "https://example.com/lamp.jpg",
      category: "Furniture",
    });

    const cookies = await loginAs({
      name: "String Quantity Customer",
      email: "string.quantity@example.com",
      password: "password123",
    });

    const res = await request(app)
      .put(`/api/cart/${product._id.toString()}`)
      .set("Cookie", cookies)
      .send({ quantity: "two" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Quantity must be a number",
      }),
    );
  });

  it("rejects invalid product id", async () => {
    const cookies = await loginAs({
      name: "Invalid ID Customer",
      email: "invalid.product.id@example.com",
      password: "password123",
    });

    const res = await request(app)
      .put("/api/cart/not-an-objectid")
      .set("Cookie", cookies)
      .send({ quantity: 2 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Invalid product ID",
      }),
    );
  });

  it("returns 404 when the product is not in the cart", async () => {
    const product = await Product.create({
      name: "Headphones",
      description: "Noise-cancelling headphones",
      price: 250,
      image: "https://example.com/headphones.jpg",
      category: "Electronics",
    });

    const cookies = await loginAs({
      name: "Missing Item Customer",
      email: "missing.quantity@example.com",
      password: "password123",
    });

    const res = await request(app)
      .put(`/api/cart/${product._id.toString()}`)
      .set("Cookie", cookies)
      .send({ quantity: 4 });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Product not found in cart",
      }),
    );
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
      email: "update.cart.error@example.com",
      password: "password123",
    });

    const user = await User.findOne({ email: "update.cart.error@example.com" });
    user.cartItems = [{ product: product._id, quantity: 2 }];
    await user.save();

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const saveSpy = vi
      .spyOn(User.prototype, "save")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app)
      .put(`/api/cart/${product._id.toString()}`)
      .set("Cookie", cookies)
      .send({ quantity: 6 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in updateQuantity controller",
      "database unavailable",
    );
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
