import Category from "../models/category.model.js";
import cloudinary from "../lib/cloudinary.js";

// Helper function to slugify text
const slugify = (text) => {
	return text
		.toString()
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^\w\-]+/g, "")
		.replace(/\-\-+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");
};

export const getAllCategories = async (req, res) => {
	try {
		const categories = await Category.find({}).sort({ createdAt: -1 });
		res.json(categories);
	} catch (error) {
		console.log("Error in getAllCategories controller:", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const createCategory = async (req, res) => {
	try {
		const { name, image } = req.body;

		if (!name || !image) {
			return res.status(400).json({ message: "Name and image are required" });
		}

		// Check if category already exists
		const existingCategory = await Category.findOne({ name });
		if (existingCategory) {
			return res.status(400).json({ message: "Category with this name already exists" });
		}

		const slug = slugify(name);
		const existingSlug = await Category.findOne({ slug });
		if (existingSlug) {
			return res.status(400).json({ message: "Category with a similar name already exists" });
		}

		let cloudinaryResponse = null;
		if (image) {
			cloudinaryResponse = await cloudinary.uploader.upload(image, {
				folder: "categories",
			});
		}

		const category = await Category.create({
			name,
			slug,
			imageUrl: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
		});

		res.status(201).json(category);
	} catch (error) {
		console.log("Error in createCategory controller:", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};

export const deleteCategory = async (req, res) => {
	try {
		const category = await Category.findById(req.params.id);

		if (!category) {
			return res.status(404).json({ message: "Category not found" });
		}

		if (category.imageUrl) {
			const publicId = category.imageUrl.split("/").pop().split(".")[0];
			try {
				await cloudinary.uploader.destroy(`categories/${publicId}`);
				console.log("Deleted category image from Cloudinary");
			} catch (error) {
				console.log("Error deleting image from Cloudinary:", error);
			}
		}

		await Category.findByIdAndDelete(req.params.id);
		res.json({ message: "Category deleted successfully" });
	} catch (error) {
		console.log("Error in deleteCategory controller:", error.message);
		res.status(500).json({ message: "Server error", error: error.message });
	}
};
