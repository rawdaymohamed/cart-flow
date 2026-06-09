import mongoose from "mongoose";
import Product from "../models/product.model.js";

export const getCartProducts = async (req, res) => {
  try {
    const cartItems = req.user.cartItems ?? [];
    const productIds = cartItems
      .map((item) => item.product)
      .filter((productId) => mongoose.Types.ObjectId.isValid(productId));
    const products = await Product.find({ _id: { $in: productIds } });

    // Keep the cart order and attach the saved quantity to each product.
    const productsById = new Map(
      products.map((product) => [product._id.toString(), product]),
    );

    const items = cartItems
      .map((item) => {
        const productId = item.product?.toString?.();

        if (!productId) {
          return null;
        }

        const product = productsById.get(productId);

        if (!product) {
          return null;
        }

        return { ...product.toJSON(), quantity: item.quantity };
      })
      .filter(Boolean);

    res.json(items);
  } catch (error) {
    console.log("Error in getCartProducts controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const existingItem = user.cartItems.find(
      (item) => item.product?.toString() === productId,
    );
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.cartItems.push({ product: productId, quantity: 1 });
    }

    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    console.log("Error in addToCart controller", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const removeAllFromCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = req.user;
    if (!productId) {
      user.cartItems = [];
    } else {
      user.cartItems = user.cartItems.filter(
        (item) => item.product?.toString() !== productId,
      );
    }
    await user.save();
    res.json(user.cartItems);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateQuantity = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    const existingItem = user.cartItems.find(
      (item) => item.product?.toString() === productId,
    );

    if (!existingItem) {
      return res.status(404).json({
        message: "Product not found in cart",
      });
    }

    if (quantity === 0) {
      user.cartItems = user.cartItems.filter(
        (item) => item.product?.toString() !== productId,
      );
    } else {
      existingItem.quantity = quantity;
    }

    await user.save();

    return res.json(user.cartItems);
  } catch (error) {
    console.log("Error in updateQuantity controller", error.message);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
