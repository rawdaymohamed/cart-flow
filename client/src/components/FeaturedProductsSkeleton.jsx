const FeaturedProductsSkeleton = () => {
  return (
    <section className="mt-16 animate-pulse">
      <div className="w-64 mx-auto mb-8 rounded-md h-9 bg-white/15" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden border rounded-xl border-white/10 bg-white/5"
          >
            <div className="w-full h-64 bg-white/10" />

            <div className="p-4 space-y-4">
              <div className="w-3/4 h-5 rounded-md bg-white/15" />
              <div className="w-1/2 h-4 rounded-md bg-white/10" />

              <div className="flex items-center justify-between pt-2">
                <div className="w-20 h-6 rounded-md bg-white/15" />
                <div className="w-24 h-10 rounded-lg bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedProductsSkeleton;
