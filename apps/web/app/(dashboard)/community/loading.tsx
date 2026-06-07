export default function CommunityLoading() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-3 w-28 bg-slate-800 rounded mb-2" />
        <div className="h-7 w-48 bg-slate-800 rounded" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {[...Array(6)].map((_, i) => <div key={i} className="h-7 w-28 bg-slate-800 rounded-lg" />)}
      </div>
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="h-4 w-32 bg-slate-800 rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-800/60 last:border-0">
            <div className="w-6 h-4 bg-slate-800 rounded shrink-0" />
            <div className="w-9 h-9 rounded-full bg-slate-800 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 bg-slate-800 rounded" />
              <div className="h-2.5 w-20 bg-slate-800 rounded" />
            </div>
            <div className="h-8 w-8 bg-slate-800 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
