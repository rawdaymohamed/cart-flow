import { motion } from "framer-motion";
import { useCartStore } from "../stores/useCartStore";
import { Link } from "react-router-dom";
import { MoveRight } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import axios from "../lib/axios";
import { toast } from "react-hot-toast"; // 1. Imported toast for error handling
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
const OrderSummary = () => {
  const { total, subtotal, coupon, isCouponApplied, cart, removeFromCart } =
    useCartStore();
  const savings = subtotal - total;
  const formattedSubtotal = subtotal.toFixed(2);
  const formattedTotal = total.toFixed(2);
  const formattedSavings = savings.toFixed(2);
  const handlePayment = async () => {
    try {
      const stripe = await stripePromise;
      const res = await axios.post("/payments/create-checkout-session", {
        products: cart,
        couponCode: coupon ? coupon.code : null,
      });

      const session = res.data;
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        console.error("Error:", result.error);
        toast.error(result.error.message);
      }
    } catch (error) {
      // 3. The Core Fix: Catch the specific missing product error
      if (
        error.response?.status === 404 &&
        error.response?.data?.deletedProductId
      ) {
        toast.error(error.response.data.error);

        // Automatically remove the ghost item from the cart UI
        removeFromCart(error.response.data.deletedProductId);
      } else {
        // Fallback for any other server or network errors
        toast.error(
          error.response?.data?.error || "Checkout failed. Please try again.",
        );
      }
    }
  };

  return (
    <motion.div
      className="p-4 space-y-4 bg-panel border border-line rounded-lg shadow-sm sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-xl font-semibold text-accent">Order summary</p>

      <div className="space-y-4">
        <div className="space-y-2">
          <dl className="flex items-center justify-between gap-4">
            <dt className="text-base font-normal text-muted">
              Original price
            </dt>
              <dd className="text-base font-medium text-white">
              ${formattedSubtotal}
            </dd>
          </dl>

          {savings > 0 && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-muted">Savings</dt>
              <dd className="text-base font-medium text-accent">
                -${formattedSavings}
              </dd>
            </dl>
          )}

          {coupon && isCouponApplied && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-muted">
                Coupon ({coupon.code})
              </dt>
              <dd className="text-base font-medium text-accent">
                -{coupon.discountPercentage}%
              </dd>
            </dl>
          )}
          <dl className="flex items-center justify-between gap-4 pt-2 border-t border-lineAlt">
            <dt className="text-base font-bold text-white">Total</dt>
            <dd className="text-base font-bold text-accent">
              ${formattedTotal}
            </dd>
          </dl>
        </div>

        <motion.button
          className="flex w-full items-center justify-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-ink hover:bg-accentHover focus:outline-none focus:ring-4 focus:ring-accentSoft"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePayment}
        >
          Proceed to Checkout
        </motion.button>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-normal text-mutedAlt">or</span>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium underline text-accent hover:text-accentSoft hover:no-underline"
          >
            Continue Shopping
            <MoveRight size={16} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
export default OrderSummary;
