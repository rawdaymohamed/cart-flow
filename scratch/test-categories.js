import dotenv from "dotenv";
import mongoose from "mongoose";
import Category from "../server/models/category.model.js";

dotenv.config();

const testCategoryOperations = async () => {
	console.log("Starting Category sanity integration test...");
	try {
		console.log("Connecting to MongoDB at:", process.env.MONGO_URI);
		await mongoose.connect(process.env.MONGO_URI);
		console.log("Successfully connected to MongoDB.");

		// Clean up any existing test categories
		await Category.deleteOne({ slug: "test-category" });

		// Create
		console.log("Attempting to create a test Category...");
		const category = await Category.create({
			name: "Test Category",
			slug: "test-category",
			imageUrl: "http://example.com/test.jpg",
		});
		console.log("Category created successfully:", category);

		// Read
		console.log("Attempting to find the test Category...");
		const found = await Category.findOne({ slug: "test-category" });
		if (found && found.name === "Test Category") {
			console.log("Category found and validated successfully.");
		} else {
			throw new Error("Category validation failed: not found or attributes mismatch");
		}

		// Delete
		console.log("Attempting to delete the test Category...");
		await Category.deleteOne({ _id: found._id });
		const checkDeleted = await Category.findById(found._id);
		if (!checkDeleted) {
			console.log("Category deleted and verified successfully.");
		} else {
			throw new Error("Category deletion failed: document still exists");
		}

		console.log("Category schema integration tests passed successfully! ✅");
	} catch (error) {
		console.error("Test failed with error:", error);
		process.exit(1);
	} finally {
		await mongoose.connection.close();
		console.log("Database connection closed.");
	}
};

testCategoryOperations();
