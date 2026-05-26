import { create } from "zustand";
import toast from "react-hot-toast";
import axios from "../lib/axios";

export const useCategoryStore = create((set) => ({
	categories: [],
	loading: false,

	fetchCategories: async () => {
		set({ loading: true });
		try {
			const response = await axios.get("/categories");
			set({ categories: response.data, loading: false });
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to fetch categories");
		}
	},

	createCategory: async (categoryData) => {
		set({ loading: true });
		try {
			const response = await axios.post("/categories", categoryData);
			set((state) => ({
				categories: [response.data, ...state.categories],
				loading: false,
			}));
			toast.success("Category created successfully");
			return response.data;
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to create category");
			throw error;
		}
	},

	deleteCategory: async (categoryId) => {
		set({ loading: true });
		try {
			await axios.delete(`/categories/${categoryId}`);
			set((state) => ({
				categories: state.categories.filter((cat) => cat._id !== categoryId),
				loading: false,
			}));
			toast.success("Category deleted successfully");
		} catch (error) {
			set({ loading: false });
			toast.error(error.response?.data?.message || "Failed to delete category");
		}
	},
}));
