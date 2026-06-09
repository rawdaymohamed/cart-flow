import Coupon from "../models/coupon.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import { stripe } from "../lib/stripe.js";
export const createCheckoutSession = async (req, res) => {
  try {
    // 1. Grab the couponCode alongside the products
    const { products, couponCode } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Your cart is empty" });
    }

    let totalAmount = 0;
    const lineItems = [];

    // ... (Keep the exact same validation loop from before) ...
    for (const item of products) {
      if (typeof item.quantity !== "number" || Number.isNaN(item.quantity)) {
        return res.status(400).json({
          error: "Quantity must be a number",
        });
      }

      if (item.quantity <= 0) {
        return res.status(400).json({
          error: "Quantity must be greater than 0",
        });
      }

      const dbProduct = await Product.findById(item._id);
      if (!dbProduct) {
        return res.status(404).json({
          error: "One or more items in your cart are no longer available.",
          deletedProductId: item._id,
        });
      }
      totalAmount += dbProduct.price * item.quantity;
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: dbProduct.name, images: [dbProduct.image] },
          unit_amount: Math.round(dbProduct.price * 100),
        },
        quantity: item.quantity,
      });
    }

    // 2. Validate the Coupon (New Addition)
    let stripeCouponId = null;

    if (couponCode) {
      // Check if the coupon exists and is assigned to this user
      const coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id, // If coupons are user-specific
        isActive: true,
      });

      if (coupon) {
        // Adjust your internal totalAmount for your own database order
        totalAmount -= Math.round(
          (totalAmount * coupon.discountPercentage) / 100,
        );
        // Grab the Stripe ID to pass to the checkout session
        stripeCouponId = coupon.stripeCouponId;
      }
    }

    // 3. Pass the discount to Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      // If we found a valid stripeCouponId, apply it. Otherwise, pass an empty array.
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : [],
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      metadata: {
        userId: req.user._id.toString(),
        couponCode: couponCode || "",
        products: JSON.stringify(
          products.map((p) => ({
            id: p._id,
            quantity: p.quantity,
            price: p.price,
          })),
        ),
      },
    });

    res.status(200).json({ id: session.id, totalAmount });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const checkoutSuccess = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      if (session.metadata.couponCode) {
        await Coupon.findOneAndUpdate(
          {
            code: session.metadata.couponCode,
            userId: session.metadata.userId,
          },
          {
            isActive: false,
          },
        );
      }

      // create a new Order
      const products = JSON.parse(session.metadata.products);
      const newOrder = new Order({
        user: session.metadata.userId,
        products: products.map((product) => ({
          product: product.id,
          quantity: product.quantity,
          price: product.price,
        })),
        totalAmount: session.amount_total / 100, // convert from cents to dollars,
        stripeSessionId: sessionId,
      });

      await newOrder.save();

      res.status(200).json({
        success: true,
        message:
          "Payment successful, order created, and coupon deactivated if used.",
        orderId: newOrder._id,
      });
      return;
    }

    return res.status(400).json({
      success: false,
      message: "Payment has not been completed.",
    });
  } catch (error) {
    console.error("Error processing successful checkout:", error);
    res.status(500).json({
      message: "Error processing successful checkout",
      error: error.message,
    });
  }
};

async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });

  return coupon.id;
}

async function createNewCoupon(userId) {
  await Coupon.findOneAndDelete({ userId });

  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    userId: userId,
  });

  await newCoupon.save();

  return newCoupon;
}
