import React from "react";

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-24 skeleton-shimmer rounded" />
          <div className="h-8 w-16 skeleton-shimmer rounded" />
          <div className="h-3 w-20 skeleton-shimmer rounded" />
        </div>
        <div className="w-11 h-11 skeleton-shimmer rounded-xl" />
      </div>
      <div className="mt-4 h-1.5 skeleton-shimmer rounded-full" />
    </div>
  );
}

export function ServiceTableSkeleton() {
  const rows = Array.from({ length: 6 });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="h-5 w-40 skeleton-shimmer rounded mb-3" />
        <div className="h-10 skeleton-shimmer rounded-lg" />
      </div>
      <div className="p-5 space-y-2">
        {rows.map((_, i) => (
          <div key={`row-${i}`} className="h-12 skeleton-shimmer rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function DepartmentSummarySkeleton() {
  const items = Array.from({ length: 6 });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="h-5 w-36 skeleton-shimmer rounded" />
        <div className="h-3 w-48 skeleton-shimmer rounded mt-2" />
        <div className="h-9 skeleton-shimmer rounded-lg mt-3" />
      </div>
      <div className="p-3 space-y-2">
        {items.map((_, i) => (
          <div
            key={`dept-skel-${i}`}
            className="p-3.5 rounded-xl border border-slate-100 space-y-3"
          >
            <div className="flex justify-between">
              <div className="h-4 w-2/3 skeleton-shimmer rounded" />
              <div className="h-6 w-10 skeleton-shimmer rounded" />
            </div>
            <div className="h-1.5 skeleton-shimmer rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
