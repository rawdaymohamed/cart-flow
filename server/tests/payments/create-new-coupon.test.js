import mongoose from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/stripe.js", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
    coupons: {
      create: vi.fn(),
    },
  },
}));

import { createNewCoupon } from "../../controllers/payment.controller.js";
import Coupon from "../../models/coupon.model.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("createNewCoupon", () => {
  it("deletes the existing coupon and returns the newly created coupon", async () => {
    const userId = new mongoose.Types.ObjectId();

    await Coupon.create({
      code: "OLDCOUPON",
      discountPercentage: 15,
      expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      userId,
    });

    vi.spyOn(Math, "random").mockReturnValue(0.123456789);

    const newCoupon = await createNewCoupon(userId);

    expect(newCoupon).toBeTruthy();
    expect(newCoupon.code).toBe("GIFT4FZZZX");
    expect(newCoupon.discountPercentage).toBe(10);
    expect(newCoupon.userId.toString()).toBe(userId.toString());

    const oldCoupon = await Coupon.findOne({ code: "OLDCOUPON" });
    expect(oldCoupon).toBeNull();

    const savedCoupon = await Coupon.findOne({ code: newCoupon.code });
    expect(savedCoupon).toBeTruthy();
    expect(savedCoupon._id.toString()).toBe(newCoupon._id.toString());
  });
});
