export default function PortalLoading() {
  return (
    <div className="px-4 sm:px-8 py-10 max-w-4xl animate-pulse">
      <div className="h-3 w-24 bg-cream-300 mb-4" />
      <div className="h-10 w-64 bg-cream-300 mb-10" />
      <div className="card p-8">
        <div className="h-3 w-32 bg-cream-300 mb-5" />
        <div className="h-7 w-3/4 bg-cream-300 mb-4" />
        <div className="h-3 w-full bg-cream-300 mb-2" />
        <div className="h-3 w-5/6 bg-cream-300" />
      </div>
    </div>
  );
}
