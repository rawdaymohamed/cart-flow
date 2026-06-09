import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

const checkoutSessionsRetrieveMock = vi.hoisted(() => vi.fn());

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: checkoutSessionsRetrieveMock,
      },
    },
  },
}));

import app from "../../app.js";
import Coupon from "../../models/coupon.model.js";
import Order from "../../models/order.model.js";
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

describe("POST /api/payments/checkout-success", () => {
  it("rejects requests without authentication", async () => {
    const res = await request(app)
      .post("/api/payments/checkout-success")
      .send({
        sessionId: "cs_test_unauth",
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Unauthorized - No access token provided",
      }),
    );
    expect(checkoutSessionsRetrieveMock).not.toHaveBeenCalled();
  });

  it("creates an order and deactivates the coupon for a paid session", async () => {
    const cookies = await loginAs({
      name: "Paid Coupon Customer",
      email: "checkout.success.coupon@example.com",
      password: "password123",
    });

    const user = await User.findOne({
      email: "checkout.success.coupon@example.com",
    });

    const coupon = await Coupon.create({
      code: "SAVE10",
      discountPercentage: 10,
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      userId: user._id,
    });

    const sessionId = "cs_test_paid_coupon";
    checkoutSessionsRetrieveMock.mockResolvedValue({
      payment_status: "paid",
      amount_total: 27000,
      metadata: {
        userId: user._id.toString(),
        couponCode: coupon.code,
        products: JSON.stringify([
          {
            id: "507f1f77bcf86cd799439011",
            quantity: 2,
            price: 150,
          },
        ]),
      },
    });

    const res = await request(app)
      .post("/api/payments/checkout-success")
      .set("Cookie", cookies)
      .send({
        sessionId,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        message:
          "Payment successful, order created, and coupon deactivated if used.",
        orderId: expect.any(String),
      }),
    );
    expect(checkoutSessionsRetrieveMock).toHaveBeenCalledWith(sessionId);

    const savedCoupon = await Coupon.findOne({ code: coupon.code });
    expect(savedCoupon.isActive).toBe(false);

    const savedOrder = await Order.findOne({ stripeSessionId: sessionId });
    expect(savedOrder).toBeTruthy();
    expect(savedOrder.user.toString()).toBe(user._id.toString());
    expect(savedOrder.totalAmount).toBe(270);
    expect(savedOrder.products).toHaveLength(1);
    expect(savedOrder.products[0].product.toString()).toBe(
      "507f1f77bcf86cd799439011",
    );
    expect(savedOrder.products[0].quantity).toBe(2);
    expect(savedOrder.products[0].price).toBe(150);
  });

  it("creates an order without touching coupons when no coupon was used", async () => {
    const cookies = await loginAs({
      name: "No Coupon Customer",
      email: "checkout.success.nocoupon@example.com",
      password: "password123",
    });

    const user = await User.findOne({
      email: "checkout.success.nocoupon@example.com",
    });

    const couponUpdateSpy = vi.spyOn(Coupon, "findOneAndUpdate");

    const sessionId = "cs_test_paid_no_coupon";
    checkoutSessionsRetrieveMock.mockResolvedValue({
      payment_status: "paid",
      amount_total: 12000,
      metadata: {
        userId: user._id.toString(),
        couponCode: "",
        products: JSON.stringify([
          {
            id: "507f1f77bcf86cd799439012",
            quantity: 1,
            price: 120,
          },
        ]),
      },
    });

    const res = await request(app)
      .post("/api/payments/checkout-success")
      .set("Cookie", cookies)
      .send({
        sessionId,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
      }),
    );
    expect(couponUpdateSpy).not.toHaveBeenCalled();

    const savedOrder = await Order.findOne({ stripeSessionId: sessionId });
    expect(savedOrder).toBeTruthy();
    expect(savedOrder.totalAmount).toBe(120);
    expect(savedOrder.products).toHaveLength(1);
    expect(savedOrder.products[0].product.toString()).toBe(
      "507f1f77bcf86cd799439012",
    );
  });

  it("returns 500 when Stripe session retrieval fails", async () => {
    const cookies = await loginAs({
      name: "Stripe Error Customer",
      email: "checkout.success.error@example.com",
      password: "password123",
    });

    checkoutSessionsRetrieveMock.mockRejectedValue(new Error("Stripe down"));

    const res = await request(app)
      .post("/api/payments/checkout-success")
      .set("Cookie", cookies)
      .send({
        sessionId: "cs_test_error",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Error processing successful checkout",
        error: "Stripe down",
      }),
    );
    expect(await Order.findOne({ stripeSessionId: "cs_test_error" })).toBeNull();
  });

  it("returns 400 and does not create an order when the session is unpaid", async () => {
    const cookies = await loginAs({
      name: "Unpaid Session Customer",
      email: "checkout.success.unpaid@example.com",
      password: "password123",
    });

    const couponUpdateSpy = vi.spyOn(Coupon, "findOneAndUpdate");

    checkoutSessionsRetrieveMock.mockResolvedValue({
      payment_status: "unpaid",
      amount_total: 5000,
      metadata: {
        userId: "507f1f77bcf86cd799439099",
        couponCode: "SAVE10",
        products: JSON.stringify([
          {
            id: "507f1f77bcf86cd799439013",
            quantity: 1,
            price: 50,
          },
        ]),
      },
    });

    const res = await request(app)
      .post("/api/payments/checkout-success")
      .set("Cookie", cookies)
      .send({
        sessionId: "cs_test_unpaid",
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "Payment has not been completed.",
      }),
    );
    expect(couponUpdateSpy).not.toHaveBeenCalled();
    expect(await Order.findOne({ stripeSessionId: "cs_test_unpaid" })).toBeNull();
  });
});
