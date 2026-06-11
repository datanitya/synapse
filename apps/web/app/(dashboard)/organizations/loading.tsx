export default function OrganizationsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-3 w-16 bg-slate-800 rounded mb-2" />
        <div className="h-7 w-40 bg-slate-800 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-3">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="h-3 w-20 bg-slate-800 rounded" />
            </div>
            {[...Array(2)].map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-slate-800/60 last:border-0">
                <div className="h-4 w-32 bg-slate-800 rounded mb-1" />
                <div className="h-2.5 w-20 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-2">
            <div className="h-3 w-32 bg-slate-800 rounded" />
            <div className="h-9 bg-slate-800 rounded-lg" />
            <div className="h-9 bg-slate-800 rounded-lg" />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <div className="h-4 w-40 bg-slate-800 rounded" />
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/60 last:border-0">
                <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-slate-800 rounded" />
                  <div className="h-2.5 w-48 bg-slate-800 rounded" />
                </div>
                <div className="w-14 h-5 bg-slate-800 rounded shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
