import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PlusCircle, Upload, Loader, Trash2, Layers } from "lucide-react";
import { useCategoryStore } from "../stores/useCategoryStore";

const CategoriesTab = () => {
	const [name, setName] = useState("");
	const [image, setImage] = useState("");
	const [uploading, setUploading] = useState(false);

	const { categories, fetchCategories, createCategory, deleteCategory, loading } = useCategoryStore();

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onloadend = () => {
				setImage(reader.result);
			};
			reader.readAsDataURL(file); // base64 representation
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!name || !image) return;

		setUploading(true);
		try {
			await createCategory({ name, image });
			setName("");
			setImage("");
		} catch (error) {
			console.log("Error creating category:", error);
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className='grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto'>
			{/* Create Category Form */}
			<motion.div
				className='bg-gray-800 shadow-lg rounded-lg p-8 border border-gray-700 h-fit'
				initial={{ opacity: 0, x: -30 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.6 }}
			>
				<h2 className='text-2xl font-semibold mb-6 text-emerald-300 flex items-center gap-2'>
					<Layers className='w-6 h-6' /> Create New Category
				</h2>

				<form onSubmit={handleSubmit} className='space-y-6'>
					<div>
						<label htmlFor='cat-name' className='block text-sm font-medium text-gray-300 mb-2'>
							Category Name
						</label>
						<input
							type='text'
							id='cat-name'
							value={name}
							onChange={(e) => setName(e.target.value)}
							className='w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors'
							placeholder='e.g., T-shirts, Shoes, Bags'
							required
						/>
					</div>

					<div className='flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg p-6 bg-gray-750 hover:bg-gray-700 transition-colors relative'>
						<input
							type='file'
							id='cat-image'
							accept='image/*'
							onChange={handleImageChange}
							className='sr-only'
							required
						/>
						{image ? (
							<div className='w-full text-center space-y-4'>
								<img
									src={image}
									alt='Preview'
									className='max-h-40 mx-auto rounded-md object-cover shadow-md'
								/>
								<label
									htmlFor='cat-image'
									className='cursor-pointer text-sm text-emerald-400 hover:text-emerald-300 font-medium block'
								>
									Change Image
								</label>
							</div>
						) : (
							<label
								htmlFor='cat-image'
								className='cursor-pointer flex flex-col items-center gap-3 w-full h-full text-center'
							>
								<div className='p-3 bg-gray-700 rounded-full text-gray-300 group-hover:text-white transition-colors'>
									<Upload className='h-6 h-6' />
								</div>
								<div>
									<span className='text-sm text-gray-300 font-medium block'>Upload Category Banner</span>
									<span className='text-xs text-gray-500 block mt-1'>Supports JPG, PNG, GIF up to 5MB</span>
								</div>
							</label>
						)}
					</div>

					<button
						type='submit'
						disabled={loading || uploading || !name || !image}
						className='w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
					>
						{uploading || loading ? (
							<>
								<Loader className='mr-2 h-5 w-5 animate-spin' />
								Creating...
							</>
						) : (
							<>
								<PlusCircle className='mr-2 h-5 w-5' />
								Create Category
							</>
						)}
					</button>
				</form>
			</motion.div>

			{/* Existing Categories List */}
			<motion.div
				className='bg-gray-800 shadow-lg rounded-lg p-8 border border-gray-700'
				initial={{ opacity: 0, x: 30 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.6 }}
			>
				<h2 className='text-2xl font-semibold mb-6 text-emerald-300'>Existing Categories</h2>

				{loading && categories.length === 0 ? (
					<div className='flex justify-center items-center py-12'>
						<Loader className='animate-spin h-8 w-8 text-emerald-500' />
					</div>
				) : categories.length === 0 ? (
					<div className='text-center py-12 text-gray-400'>
						<Layers className='w-12 h-12 mx-auto mb-3 opacity-30' />
						<p>No categories found.</p>
						<p className='text-xs mt-1 text-gray-500'>Create your first category using the form on the left.</p>
					</div>
				) : (
					<div className='space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar'>
						{categories.map((category) => (
							<motion.div
								key={category._id}
								layout
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								className='flex items-center justify-between p-4 bg-gray-700 rounded-lg border border-gray-650 hover:border-gray-550 transition-colors'
							>
								<div className='flex items-center gap-4'>
									<img
										src={category.imageUrl}
										alt={category.name}
										className='w-16 h-16 rounded-md object-cover border border-gray-600 shadow-sm'
									/>
									<div>
										<h3 className='text-white font-semibold text-lg'>{category.name}</h3>
										<p className='text-emerald-400 text-xs font-mono mt-0.5'>/{category.slug}</p>
									</div>
								</div>

								<button
									onClick={() => deleteCategory(category._id)}
									className='p-2 bg-red-650 hover:bg-red-750 text-red-100 hover:text-white rounded-md transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500'
									title='Delete Category'
								>
									<Trash2 className='w-5 h-5' />
								</button>
							</motion.div>
						))}
					</div>
				)}
			</motion.div>
		</div>
	);
};

export default CategoriesTab;
