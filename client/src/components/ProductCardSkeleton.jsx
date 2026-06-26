const ProductCardSkeleton = () => {
  return (
    <div className="relative flex flex-col w-full overflow-hidden border rounded-lg shadow-lg border-line bg-panel animate-pulse">
      <div className="mx-3 mt-3 overflow-hidden h-60 rounded-xl bg-white/10" />

      <div className="px-5 pb-5 mt-4">
        <div className="w-3/4 h-6 rounded-md bg-white/15" />

        <div className="mt-4 mb-5">
          <div className="w-24 h-8 rounded-md bg-white/15" />
        </div>

        <div className="w-full h-10 rounded-lg bg-white/10" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
