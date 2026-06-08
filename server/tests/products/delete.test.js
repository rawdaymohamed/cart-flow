import mongoose from "mongoose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const cloudinaryUploadMock = vi.hoisted(() => vi.fn());
const cloudinaryDestroyMock = vi.hoisted(() => vi.fn());
const redisSetMock = vi.hoisted(() => vi.fn());

vi.mock("../../lib/redis.js", () => ({
  redis: {
    get: vi.fn(),
    set: redisSetMock,
    del: vi.fn(),
  },
}));

vi.mock("../../lib/cloudinary.js", () => ({
  default: {
    uploader: {
      upload: cloudinaryUploadMock,
      destroy: cloudinaryDestroyMock,
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

describe("DELETE /api/products/:id", () => {
  const existingProduct = {
    name: "Phone",
    description: "Smartphone with 128GB storage",
    price: 799,
    image: "https://res.cloudinary.com/demo/image/upload/v1/products/phone-old.jpg",
    category: "Electronics",
    isFeatured: true,
  };

  it("rejects requests without authentication", async () => {
    const product = await Product.create(existingProduct);

    const res = await request(app).delete(`/api/products/${product._id}`).send();

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
  });

  it("rejects authenticated non-admin users", async () => {
    const product = await Product.create(existingProduct);
    const cookies = await loginAs({
      name: "Rawda",
      email: "rawda@example.com",
      password: "password123",
    });

    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Cookie", cookies)
      .send();

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Access denied - Admin only",
      }),
    );
  });

  it("returns 404 when the product does not exist", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-missing-product@example.com",
      password: "password123",
      role: "admin",
    });
    vi.clearAllMocks();
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/products/${missingId}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Product not found",
      }),
    );
    expect(cloudinaryDestroyMock).not.toHaveBeenCalled();
    expect(redisSetMock).not.toHaveBeenCalled();
  });

  it("deletes the product, removes its cloudinary image, and refreshes the featured cache", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-delete-product@example.com",
      password: "password123",
      role: "admin",
    });
    vi.clearAllMocks();
    const product = await Product.create(existingProduct);

    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Product deleted successfully",
      }),
    );
    expect(cloudinaryDestroyMock).toHaveBeenCalledTimes(1);
    expect(cloudinaryDestroyMock).toHaveBeenCalledWith("products/phone-old");
    expect(redisSetMock).toHaveBeenCalledTimes(1);

    const deletedProduct = await Product.findById(product._id);
    expect(deletedProduct).toBeNull();
  });

  it("deletes the product without calling cloudinary when there is no image", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-delete-no-image@example.com",
      password: "password123",
      role: "admin",
    });
    vi.clearAllMocks();
    const { insertedId } = await Product.collection.insertOne({
      name: existingProduct.name,
      description: existingProduct.description,
      price: existingProduct.price,
      image: "",
      category: existingProduct.category,
      isFeatured: existingProduct.isFeatured,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .delete(`/api/products/${insertedId}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Product deleted successfully",
      }),
    );
    expect(cloudinaryDestroyMock).not.toHaveBeenCalled();
    expect(redisSetMock).toHaveBeenCalledTimes(1);

    const deletedProduct = await Product.findById(insertedId);
    expect(deletedProduct).toBeNull();
  });

  it("returns 500 when deleting the product fails", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-delete-error@example.com",
      password: "password123",
      role: "admin",
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const product = await Product.create(existingProduct);

    vi.spyOn(Product, "findByIdAndDelete").mockRejectedValueOnce(
      new Error("database unavailable"),
    );

    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in deleteProduct controller",
      "database unavailable",
    );

    consoleSpy.mockRestore();
  });

  it("continues deleting when cloudinary destroy fails", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-delete-cloudinary-error@example.com",
      password: "password123",
      role: "admin",
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    cloudinaryDestroyMock.mockRejectedValueOnce(new Error("cloudinary unavailable"));
    const product = await Product.create(existingProduct);

    const res = await request(app)
      .delete(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Product deleted successfully",
      }),
    );
    expect(cloudinaryDestroyMock).toHaveBeenCalledWith("products/phone-old");
    expect(consoleSpy).toHaveBeenCalledWith(
      "error deleting image from cloduinary",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
