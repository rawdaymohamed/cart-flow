const CategoryItemSkeleton = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-lg h-96 bg-white/10 animate-pulse">
      {/* Fake image background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-white/10" />

      {/* Fake bottom gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent" />

      {/* Fake text */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
        <div className="w-2/3 mb-3 rounded-md h-7 bg-white/20" />
        <div className="w-1/2 h-4 rounded-md bg-white/10" />
      </div>
    </div>
  );
};

export default CategoryItemSkeleton;
