interface StatCardProps {
  title: string;
  value: number;
  total?: number;
  icon: string;
  accent: "blue" | "green" | "amber" | "violet";
  subtitle?: string;
}

const accentStyles = {
  blue: {
    ring: "ring-blue-100",
    icon: "bg-blue-50 text-blue-600",
    bar: "bg-blue-500",
    text: "text-blue-600",
  },
  green: {
    ring: "ring-green-100",
    icon: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
    text: "text-emerald-600",
  },
  amber: {
    ring: "ring-amber-100",
    icon: "bg-amber-50 text-amber-600",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  violet: {
    ring: "ring-violet-100",
    icon: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
    text: "text-violet-600",
  },
};

export function StatCard({
  title,
  value,
  total = 0,
  icon,
  accent,
  subtitle,
}: StatCardProps) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const styles = accentStyles[accent];

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 ring-1 ${styles.ring}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1 tabular-nums">
            {value.toLocaleString("vi-VN")}
          </p>
          {total > 0 && (
            <p className={`text-sm font-semibold mt-1 tabular-nums ${styles.text}`}>
              {percentage}%
              {subtitle && (
                <span className="text-slate-400 font-normal ml-1">
                  ({subtitle})
                </span>
              )}
            </p>
          )}
        </div>

        <div
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xl ${styles.icon}`}
        >
          {icon}
        </div>
      </div>

      {total > 0 && (
        <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
