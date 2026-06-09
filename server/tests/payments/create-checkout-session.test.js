import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const checkoutSessionsCreateMock = vi.hoisted(() => vi.fn());
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

process.env.CLIENT_URL ||= clientUrl;

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: checkoutSessionsCreateMock,
        retrieve: vi.fn(),
      },
    },
  },
}));

import app from "../../app.js";
import Coupon from "../../models/coupon.model.js";
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

describe("POST /api/payments/create-checkout-session", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .send({
        products: [{ _id: "507f1f77bcf86cd799439011", quantity: 1 }],
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects an empty cart", async () => {
    const cookies = await loginAs({
      name: "Checkout Customer",
      email: "checkout.empty@example.com",
      password: "password123",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        products: [],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: "Your cart is empty",
      }),
    );
    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });

  it.each([0, -1])("rejects quantity %s", async (quantity) => {
    const cookies = await loginAs({
      name: "Invalid Quantity Customer",
      email: `checkout.invalid.quantity.${quantity}@example.com`,
      password: "password123",
    });

    const product = await Product.create({
      name: `Quantity Product ${quantity}`,
      description: "Product used for invalid quantity testing",
      price: 50,
      image: "https://example.com/product.jpg",
      category: "Testing",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        products: [
          {
            _id: product._id.toString(),
            quantity,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: "Quantity must be greater than 0",
      }),
    );
    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });

  it("rejects non-number quantity", async () => {
    const cookies = await loginAs({
      name: "String Quantity Customer",
      email: "checkout.string.quantity@example.com",
      password: "password123",
    });

    const product = await Product.create({
      name: "String Quantity Product",
      description: "Product used for string quantity testing",
      price: 50,
      image: "https://example.com/product.jpg",
      category: "Testing",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        products: [
          {
            _id: product._id.toString(),
            quantity: "two",
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: "Quantity must be a number",
      }),
    );
    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });

  it("returns 404 when one of the cart products no longer exists", async () => {
    const cookies = await loginAs({
      name: "Missing Product Customer",
      email: "checkout.missing@example.com",
      password: "password123",
    });

    const existingProduct = await Product.create({
      name: "Headphones",
      description: "Wireless over-ear headphones",
      price: 149.99,
      image: "https://example.com/headphones.jpg",
      category: "Audio",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        products: [
          { _id: existingProduct._id.toString(), quantity: 1, price: 149.99 },
          { _id: "507f1f77bcf86cd799439011", quantity: 2, price: 35 },
        ],
      });

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: "One or more items in your cart are no longer available.",
        deletedProductId: "507f1f77bcf86cd799439011",
      }),
    );
    expect(checkoutSessionsCreateMock).not.toHaveBeenCalled();
  });

  it("creates a Stripe checkout session without a coupon", async () => {
    const cookies = await loginAs({
      name: "Checkout Customer",
      email: "checkout.success@example.com",
      password: "password123",
    });

    const product = await Product.create({
      name: "Keyboard",
      description: "Mechanical keyboard",
      price: 120,
      image: "https://example.com/keyboard.jpg",
      category: "Accessories",
    });

    checkoutSessionsCreateMock.mockResolvedValue({
      id: "cs_test_123",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        products: [{ _id: product._id.toString(), quantity: 2, price: 120 }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "cs_test_123",
      totalAmount: 240,
    });

    expect(checkoutSessionsCreateMock).toHaveBeenCalledTimes(1);
    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ["card"],
        mode: "payment",
        discounts: [],
        success_url: `${clientUrl}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/purchase-cancel`,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Keyboard",
                images: ["https://example.com/keyboard.jpg"],
              },
              unit_amount: 12000,
            },
            quantity: 2,
          },
        ],
        metadata: {
          userId: expect.any(String),
          couponCode: "",
          products: JSON.stringify([
            {
              id: product._id.toString(),
              quantity: 2,
              price: 120,
            },
          ]),
        },
      }),
    );
  });

  it("applies a valid user coupon to the total and Stripe session", async () => {
    const cookies = await loginAs({
      name: "Coupon Customer",
      email: "checkout.coupon@example.com",
      password: "password123",
    });

    const product = await Product.create({
      name: "Monitor",
      description: "27-inch display",
      price: 300,
      image: "https://example.com/monitor.jpg",
      category: "Electronics",
    });

    const couponFindOneSpy = vi.spyOn(Coupon, "findOne").mockResolvedValue({
      discountPercentage: 10,
      stripeCouponId: "stripe_coupon_123",
    });

    const user = await User.findOne({
      email: "checkout.coupon@example.com",
    });

    expect(user).toBeTruthy();
    expect(couponFindOneSpy).not.toHaveBeenCalled();

    checkoutSessionsCreateMock.mockResolvedValue({
      id: "cs_test_coupon",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        couponCode: "SAVE10",
        products: [{ _id: product._id.toString(), quantity: 1, price: 300 }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "cs_test_coupon",
      totalAmount: 270,
    });

    expect(couponFindOneSpy).toHaveBeenCalledWith({
      code: "SAVE10",
      userId: expect.any(Object),
      isActive: true,
    });
    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ coupon: "stripe_coupon_123" }],
        metadata: expect.objectContaining({
          couponCode: "SAVE10",
        }),
      }),
    );
  });

  it("ignores an invalid coupon code", async () => {
    const cookies = await loginAs({
      name: "Invalid Coupon Customer",
      email: "checkout.invalid.coupon@example.com",
      password: "password123",
    });

    const product = await Product.create({
      name: "Couponless Keyboard",
      description: "Mechanical keyboard",
      price: 120,
      image: "https://example.com/keyboard.jpg",
      category: "Accessories",
    });

    const couponFindOneSpy = vi.spyOn(Coupon, "findOne").mockResolvedValue(null);

    checkoutSessionsCreateMock.mockResolvedValue({
      id: "cs_test_invalid_coupon",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        couponCode: "NOT_REAL",
        products: [{ _id: product._id.toString(), quantity: 2 }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "cs_test_invalid_coupon",
      totalAmount: 240,
    });

    expect(couponFindOneSpy).toHaveBeenCalledWith({
      code: "NOT_REAL",
      userId: expect.any(Object),
      isActive: true,
    });
    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [],
      }),
    );
  });

  it("ignores a coupon belonging to another user", async () => {
    const owner = await User.create({
      name: "Owner Customer",
      email: "checkout.coupon.owner@example.com",
      password: "password123",
    });

    await Coupon.create({
      code: "OWNER10",
      discountPercentage: 10,
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      userId: owner._id,
    });

    const cookies = await loginAs({
      name: "Other Customer",
      email: "checkout.other.user@example.com",
      password: "password123",
    });

    const product = await Product.create({
      name: "Other User Monitor",
      description: "27-inch display",
      price: 300,
      image: "https://example.com/monitor.jpg",
      category: "Electronics",
    });

    checkoutSessionsCreateMock.mockResolvedValue({
      id: "cs_test_other_user_coupon",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        couponCode: "OWNER10",
        products: [{ _id: product._id.toString(), quantity: 1 }],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "cs_test_other_user_coupon",
      totalAmount: 300,
    });

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [],
        metadata: expect.objectContaining({
          couponCode: "OWNER10",
        }),
      }),
    );
  });

  it("returns 500 when Stripe checkout session creation fails", async () => {
    const cookies = await loginAs({
      name: "Stripe Error Customer",
      email: "checkout.error@example.com",
      password: "password123",
    });

    const product = await Product.create({
      name: "Mouse",
      description: "Wireless mouse",
      price: 60,
      image: "https://example.com/mouse.jpg",
      category: "Accessories",
    });

    checkoutSessionsCreateMock.mockRejectedValue(new Error("Stripe is down"));

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        products: [{ _id: product._id.toString(), quantity: 1, price: 60 }],
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: "Internal Server Error",
      }),
    );
  });

  it("uses database product price instead of client-supplied price", async () => {
    const cookies = await loginAs({
      name: "Price Tamper Customer",
      email: "price.tamper@example.com",
      password: "password123",
    });

    const product = await Product.create({
      name: "Keyboard",
      description: "Mechanical keyboard",
      price: 120,
      image: "https://example.com/keyboard.jpg",
      category: "Accessories",
    });

    checkoutSessionsCreateMock.mockResolvedValue({
      id: "cs_test_price_tamper",
    });

    const res = await request(app)
      .post("/api/payments/create-checkout-session")
      .set("Cookie", cookies)
      .send({
        products: [
          {
            _id: product._id.toString(),
            quantity: 2,
            price: 1,
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.totalAmount).toBe(240);

    expect(checkoutSessionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              unit_amount: 12000,
            }),
            quantity: 2,
          }),
        ],
      }),
    );
  });
});
