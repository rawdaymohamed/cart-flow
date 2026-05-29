import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: [true, "Category image is required"],
    },
  },
  { timestamps: true },
);

categorySchema.index({
  name: 1,
});
const Category = mongoose.model("Category", categorySchema);

export default Category;
