export default function DeveloperLoading() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-3 w-24 bg-slate-800 rounded mb-2" />
        <div className="h-7 w-32 bg-slate-800 rounded" />
      </div>
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
        <div className="h-4 w-28 bg-slate-800 rounded" />
        <div className="flex gap-3">
          <div className="flex-1 h-10 bg-slate-800 rounded-lg" />
          <div className="w-28 h-10 bg-slate-800 rounded-lg" />
          <div className="w-28 h-10 bg-slate-800 rounded-lg" />
        </div>
      </div>
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="h-4 w-24 bg-slate-800 rounded" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-800/60 last:border-0">
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-48 bg-slate-800 rounded" />
              <div className="h-2.5 w-64 bg-slate-800 rounded" />
            </div>
            <div className="w-16 h-7 bg-slate-800 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
