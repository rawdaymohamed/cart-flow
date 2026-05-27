import { useEffect } from "react";
import CategoryItem from "../components/CategoryItem";
import { useProductStore } from "../stores/useProductStore";
import { useCategoryStore } from "../stores/useCategoryStore";
import FeaturedProducts from "../components/FeaturedProducts";
import LoadingSpinner from "../components/LoadingSpinner";

const HomePage = () => {
  const { fetchFeaturedProducts, products, isLoading } = useProductStore();
  const {
    categories,
    fetchCategories,
    loading: categoriesLoading,
  } = useCategoryStore();

  useEffect(() => {
    fetchFeaturedProducts();
    fetchCategories();
  }, [fetchFeaturedProducts, fetchCategories]);

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="relative z-10 px-4 py-16 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <h1 className="mb-4 text-5xl font-bold text-center text-white sm:text-6xl">
          Explore Our Categories
        </h1>
        <p className="mb-12 text-xl text-center text-gray-300">
          Discover the latest trends in eco-friendly fashion
        </p>

        {categoriesLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : categories.length === 0 ? (
          <p className="py-10 text-lg text-center text-gray-400">
            No categories found. Start by creating one in the Admin Dashboard!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryItem
                category={{
                  ...category,
                  href: "/" + category.slug,
                }}
                key={category._id}
              />
            ))}
          </div>
        )}

        {!isLoading && products.length > 0 && (
          <FeaturedProducts featuredProducts={products} />
        )}
      </div>
    </div>
  );
};
export default HomePage;
