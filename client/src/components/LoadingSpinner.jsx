const LoadingSpinner = () => {
  return (
    <div className="relative">
      {/* The Track */}
      <div className="w-16 h-16 border-4 rounded-full border-slate-700/50" />
      {/* The Spinning Indicator */}
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-500 animate-spin" />
      <div className="sr-only">Loading...</div>
    </div>
  );
};

export default LoadingSpinner;
