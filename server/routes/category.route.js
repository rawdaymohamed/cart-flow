import express from "express";
import {
	getAllCategories,
	createCategory,
	deleteCategory,
} from "../controllers/category.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllCategories);
router.post("/", protectRoute, adminRoute, createCategory);
router.delete("/:id", protectRoute, adminRoute, deleteCategory);

export default router;
