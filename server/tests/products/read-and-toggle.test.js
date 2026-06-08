import mongoose from "mongoose";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const redisGetMock = vi.hoisted(() => vi.fn());
const redisSetMock = vi.hoisted(() => vi.fn());
const redisDelMock = vi.hoisted(() => vi.fn());

vi.mock("../../lib/redis.js", () => ({
  redis: {
    get: redisGetMock,
    set: redisSetMock,
    del: redisDelMock,
  },
}));

vi.mock("../../lib/cloudinary.js", () => ({
  default: {
    uploader: {
      upload: vi.fn(),
      destroy: vi.fn(),
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

describe("GET /api/products/featured", () => {
  it("returns featured products from redis cache when available", async () => {
    const cachedProducts = [
      {
        _id: new mongoose.Types.ObjectId().toString(),
        name: "Cached Phone",
        description: "Cached product",
        image: "https://example.com/cached.jpg",
        price: 500,
      },
    ];

    redisGetMock.mockResolvedValueOnce(JSON.stringify(cachedProducts));

    const findSpy = vi.spyOn(Product, "find");

    const res = await request(app).get("/api/products/featured");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(cachedProducts);
    expect(redisGetMock).toHaveBeenCalledWith("featured_products");
    expect(findSpy).not.toHaveBeenCalled();
    expect(redisSetMock).not.toHaveBeenCalled();
    findSpy.mockRestore();
  });

  it("loads featured products from the database and caches them when redis is empty", async () => {
    const featuredProduct = await Product.create({
      name: "Featured Phone",
      description: "Featured smartphone",
      price: 899,
      image: "https://example.com/featured.jpg",
      category: "Electronics",
      isFeatured: true,
    });

    redisGetMock.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/products/featured");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          _id: featuredProduct._id.toString(),
          name: "Featured Phone",
          description: "Featured smartphone",
          image: "https://example.com/featured.jpg",
          price: 899,
          isFeatured: true,
        }),
      ]),
    );
    expect(redisGetMock).toHaveBeenCalledWith("featured_products");
    expect(redisSetMock).toHaveBeenCalledTimes(1);
    expect(redisSetMock).toHaveBeenCalledWith(
      "featured_products",
      expect.stringContaining("Featured Phone"),
    );
  });

  it("returns 404 when no featured products are found", async () => {
    redisGetMock.mockResolvedValueOnce(null);

    const leanMock = vi.fn().mockResolvedValueOnce(null);
    const findSpy = vi.spyOn(Product, "find").mockReturnValue({
      lean: leanMock,
    });

    const res = await request(app).get("/api/products/featured");

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "No featured products found",
      }),
    );
    expect(redisSetMock).not.toHaveBeenCalled();
    expect(findSpy).toHaveBeenCalledWith({ isFeatured: true });
    expect(leanMock).toHaveBeenCalledTimes(1);

    findSpy.mockRestore();
  });

  it("returns 500 when loading featured products fails", async () => {
    redisGetMock.mockResolvedValueOnce(null);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const leanMock = vi.fn().mockRejectedValueOnce(new Error("database unavailable"));
    const findSpy = vi.spyOn(Product, "find").mockReturnValue({
      lean: leanMock,
    });

    const res = await request(app).get("/api/products/featured");

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in getFeaturedProducts controller",
      "database unavailable",
    );

    findSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe("GET /api/products/category/:category", () => {
  it("returns products that match the requested category", async () => {
    await Product.insertMany([
      {
        name: "Phone",
        description: "Smartphone",
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
    ]);

    const res = await request(app).get("/api/products/category/Electronics");

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0]).toEqual(
      expect.objectContaining({
        name: "Phone",
        category: "Electronics",
      }),
    );
  });

  it("returns 500 when loading products by category fails", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const findSpy = vi
      .spyOn(Product, "find")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app).get("/api/products/category/Electronics");

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in getProductsByCategory controller",
      "database unavailable",
    );

    findSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe("GET /api/products/recommendations", () => {
  it("returns four sampled products with the projected fields", async () => {
    await Product.insertMany([
      {
        name: "Product 1",
        description: "Desc 1",
        price: 10,
        image: "https://example.com/1.jpg",
        category: "Electronics",
      },
      {
        name: "Product 2",
        description: "Desc 2",
        price: 20,
        image: "https://example.com/2.jpg",
        category: "Electronics",
      },
      {
        name: "Product 3",
        description: "Desc 3",
        price: 30,
        image: "https://example.com/3.jpg",
        category: "Fashion",
      },
      {
        name: "Product 4",
        description: "Desc 4",
        price: 40,
        image: "https://example.com/4.jpg",
        category: "Home",
      },
      {
        name: "Product 5",
        description: "Desc 5",
        price: 50,
        image: "https://example.com/5.jpg",
        category: "Beauty",
      },
    ]);

    const res = await request(app).get("/api/products/recommendations");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        _id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        image: expect.any(String),
        price: expect.any(Number),
      }),
    );
  });

  it("returns 500 when recommendations cannot be loaded", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const aggregateSpy = vi
      .spyOn(Product, "aggregate")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const res = await request(app).get("/api/products/recommendations");

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Server error",
        error: "database unavailable",
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in getRecommendedProducts controller",
      "database unavailable",
    );

    aggregateSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});

describe("PATCH /api/products/:id", () => {
  const existingProduct = {
    name: "Phone",
    description: "Smartphone with 128GB storage",
    price: 799,
    image: "https://example.com/phone.jpg",
    category: "Electronics",
    isFeatured: false,
  };

  it("rejects requests without authentication", async () => {
    const product = await Product.create(existingProduct);

    const res = await request(app).patch(`/api/products/${product._id}`).send();

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
  });

  it("toggles a product to featured for admin users", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-toggle@example.com",
      password: "password123",
      role: "admin",
    });
    vi.clearAllMocks();

    const product = await Product.create(existingProduct);

    const res = await request(app)
      .patch(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        _id: product._id.toString(),
        isFeatured: true,
      }),
    );
    expect(redisSetMock).toHaveBeenCalledWith(
      "featured_products",
      expect.stringContaining("Phone"),
    );

    const savedProduct = await Product.findById(product._id);
    expect(savedProduct.isFeatured).toBe(true);
  });

  it("returns 404 when the product does not exist", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-toggle-missing@example.com",
      password: "password123",
      role: "admin",
    });
    vi.clearAllMocks();
    const missingId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .patch(`/api/products/${missingId}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Product not found",
      }),
    );
  });

  it("returns 500 when toggling featured state fails", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-toggle-error@example.com",
      password: "password123",
      role: "admin",
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const findByIdSpy = vi
      .spyOn(Product, "findById")
      .mockRejectedValueOnce(new Error("database unavailable"));

    const product = await Product.create(existingProduct);

    const res = await request(app)
      .patch(`/api/products/${product._id}`)
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
      "Error in toggleFeaturedProduct controller",
      "database unavailable",
    );

    findByIdSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("still succeeds when refreshing the featured cache fails", async () => {
    const adminCookies = await loginAs({
      name: "Admin",
      email: "admin-toggle-cache@example.com",
      password: "password123",
      role: "admin",
    });
    vi.clearAllMocks();
    redisSetMock.mockRejectedValueOnce(new Error("redis unavailable"));
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const product = await Product.create(existingProduct);

    const res = await request(app)
      .patch(`/api/products/${product._id}`)
      .set("Cookie", adminCookies)
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        isFeatured: true,
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith("error in update cache function");

    consoleSpy.mockRestore();
  });
});
