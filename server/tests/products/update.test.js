import mongoose from "mongoose";
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

describe("PUT /api/products/:id", () => {
  const existingProduct = {
    name: "Phone",
    description: "Smartphone with 128GB storage",
    price: 799,
    image: "https://example.com/phone-old.jpg",
    category: "Electronics",
    isFeatured: false,
  };

  it("rejects requests without authentication", async () => {
    const product = await Product.create(existingProduct);

    const res = await request(app).put(`/api/products/${product._id}`).send({
      name: "Updated Phone",
    });

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
      .put(`/api/products/${product._id}`)
      .set("Cookie", cookies)
      .send({
        name: "Updated Phone",
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Access denied - Admin only",
      }),
    );
  });

  it("rejects empty update payloads", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-empty-update@example.com",
      password: "password123",
      role: "admin",
    });
    const product = await Product.create(existingProduct);

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("At least one product field is required");

    const savedProduct = await Product.findById(product._id);
    expect(savedProduct.toObject()).toEqual(
      expect.objectContaining(existingProduct),
    );
  });

  it("updates product fields without replacing the image when no new image is provided", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-update-fields@example.com",
      password: "password123",
      role: "admin",
    });
    const product = await Product.create(existingProduct);

    const updatePayload = {
      name: "Updated Phone",
      description: "Updated smartphone with 256GB storage",
      price: 899,
      category: "Mobile Devices",
    };

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        name: updatePayload.name,
        description: updatePayload.description,
        price: updatePayload.price,
        category: updatePayload.category,
        image: existingProduct.image,
      }),
    );
    expect(cloudinaryUploadMock).not.toHaveBeenCalled();

    const savedProduct = await Product.findById(product._id);
    expect(savedProduct.toObject()).toEqual(
      expect.objectContaining({
        ...existingProduct,
        ...updatePayload,
      }),
    );
  });

  it("uploads and stores a new image when the image changes", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-update-image@example.com",
      password: "password123",
      role: "admin",
    });
    const product = await Product.create(existingProduct);

    cloudinaryUploadMock.mockResolvedValue({
      secure_url:
        "https://res.cloudinary.com/demo/image/upload/v1/products/updated-phone.jpg",
    });

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send({
        image: "data:image/png;base64,new-image",
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        image:
          "https://res.cloudinary.com/demo/image/upload/v1/products/updated-phone.jpg",
      }),
    );
    expect(cloudinaryUploadMock).toHaveBeenCalledTimes(1);
    expect(cloudinaryUploadMock).toHaveBeenCalledWith(
      "data:image/png;base64,new-image",
      {
        folder: "products",
      },
    );

    const savedProduct = await Product.findById(product._id);
    expect(savedProduct.image).toBe(
      "https://res.cloudinary.com/demo/image/upload/v1/products/updated-phone.jpg",
    );
  });

  it("returns 404 when the product does not exist", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-missing-product@example.com",
      password: "password123",
      role: "admin",
    });
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/products/${missingId}`)
      .set("Cookie", adminCookies)
      .send({
        name: "Updated Phone",
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
      message: "Product not found",
      }),
    );
  });

  it("returns 500 when updating the product fails", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-update-error@example.com",
      password: "password123",
      role: "admin",
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const product = await Product.create(existingProduct);

    const updateSpy = vi
      .spyOn(Product, "findByIdAndUpdate")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send({
        name: "Updated Phone",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in updateProduct controller",
      "database unavailable",
    );

    updateSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
