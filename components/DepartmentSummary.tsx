import { useState } from "react";

interface DepartmentData {
  [key: string]: {
    tong: number;
    toan_trinh: number;
    mot_phan: number;
    du_kien: number;
    completed: number;
  };
}

interface DepartmentSummaryProps {
  data: DepartmentData;
  onSelectDepartment?: (dept: string | null) => void;
}

export function DepartmentSummary({
  data,
  onSelectDepartment,
}: DepartmentSummaryProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const handleDeptClick = (dept: string) => {
    const newValue = selectedDept === dept ? null : dept;
    setSelectedDept(newValue);
    onSelectDepartment?.(newValue);
  };

  const sortedEntries = Object.entries(data)
    .filter(([name]) =>
      search ? name.toLowerCase().includes(search.toLowerCase()) : true
    )
    .sort(([, a], [, b]) => {
      const aTong = a?.tong ?? 0;
      const bTong = b?.tong ?? 0;
      if (aTong === 0 && bTong === 0) return 0;
      if (aTong === 0) return 1;
      if (bTong === 0) return -1;
      return bTong - aTong;
    });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
        <h3 className="text-base font-semibold text-slate-900">
          Thống kê theo đơn vị
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Nhấn để lọc danh sách dịch vụ
        </p>
        <input
          type="text"
          placeholder="Tìm đơn vị..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-3 w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
        />
      </div>

      <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
        {sortedEntries.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            Không tìm thấy đơn vị
          </p>
        ) : (
          sortedEntries.map(([deptName, stats]) => {
            const safeStats = {
              tong: stats?.tong ?? 0,
              toan_trinh: stats?.toan_trinh ?? 0,
              mot_phan: stats?.mot_phan ?? 0,
              du_kien: stats?.du_kien ?? 0,
              completed: stats?.completed ?? 0,
            };

            const completedPct =
              safeStats.tong > 0
                ? Math.round((safeStats.completed / safeStats.tong) * 100)
                : 0;

            const isEmpty = safeStats.tong === 0;
            const isSelected = selectedDept === deptName;

            return (
              <button
                key={deptName}
                type="button"
                onClick={() => handleDeptClick(deptName)}
                className={`w-full text-left p-3.5 rounded-xl transition-all duration-150 ${
                  isSelected
                    ? "bg-blue-50 border-2 border-blue-400 shadow-sm"
                    : "bg-slate-50/80 border border-slate-200 hover:border-slate-300 hover:bg-white"
                } ${isEmpty ? "opacity-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 text-sm leading-snug">
                      {deptName}
                    </p>

                    {isEmpty ? (
                      <p className="text-xs text-slate-400 mt-1">
                        Chưa có dữ liệu
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-600">
                          Tổng <strong className="ml-1 text-slate-900">{safeStats.tong}</strong>
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-[11px] text-emerald-700">
                          TT {safeStats.toan_trinh}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-[11px] text-amber-700">
                          MP {safeStats.mot_phan}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-[11px] text-blue-700">
                          DK {safeStats.du_kien}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
