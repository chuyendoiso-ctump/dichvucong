/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { StatCard, ServiceTable, DepartmentSummary, DepartmentCharts } from "../components";
import {
  StatCardSkeleton,
  DepartmentSummarySkeleton,
  ServiceTableSkeleton,
} from "../components/Skeleton";
import { getServices } from "@/lib/api";
import { SHEETS } from "@/lib/googleSheet.service";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServices()
      .then((res) => setData(res || []))
      .catch((err) => {
        console.error("Fetch error:", err);
        setData([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const validData = useMemo(() => {
    return (data || []).filter(
      (d) =>
        d &&
        typeof d === "object" &&
        !d.error &&
        d.ten_dich_vu &&
        d.ten_dich_vu.trim() !== ""
    );
  }, [data]);

  const hasDuKien = (item: any) => item?.du_kien === true;

  const isDuKienCompleted = (item: any) => item?.completed === 1;

  const stats = useMemo(() => {
    const total = validData.length;
    const toanTrinh = validData.filter((d) => d.toan_trinh === true).length;
    const motPhan = validData.filter((d) => d.mot_phan === true).length;
    const totalDuKien = validData.filter((d) => hasDuKien(d)).length;
    const completed = validData.filter((d) => isDuKienCompleted(d)).length;
    const hoanthanhCount = completed;

    return {
      total,
      toanTrinh,
      motPhan,
      duKien: totalDuKien,
      completed,
      hoanThanh: hoanthanhCount,
      toanTrinhPct: total ? Math.round((toanTrinh / total) * 100) : 0,
      motPhanPct: total ? Math.round((motPhan / total) * 100) : 0,
      duKienPct: total ? Math.round((totalDuKien / total) * 100) : 0,
      completedPct: totalDuKien
        ? Math.round((completed / totalDuKien) * 100)
        : 0,
      hoanthanhPct: total
        ? Math.round((hoanthanhCount / total) * 100)
        : 0,
    };
  }, [validData]);

  const group = useMemo(() => {
    const g: Record<string, any> = {};

    SHEETS.forEach((sheet) => {
      if (!g[sheet.name]) {
        g[sheet.name] = {
          tong: 0,
          toan_trinh: 0,
          mot_phan: 0,
          du_kien: 0,
          completed: 0,
        };
      }
    });

    validData.forEach((item) => {
      const key = item.don_vi || "Không xác định";

      if (!g[key]) {
        g[key] = {
          tong: 0,
          toan_trinh: 0,
          mot_phan: 0,
          du_kien: 0,
          completed: 0,
        };
      }

      g[key].tong += 1;
      g[key].toan_trinh += item.toan_trinh ? 1 : 0;
      g[key].mot_phan += item.mot_phan ? 1 : 0;
      g[key].du_kien += hasDuKien(item) ? 1 : 0;

      if (isDuKienCompleted(item)) {
        g[key].completed += 1;
      }
    });

    return g;
  }, [validData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <header className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
            <div className="h-8 w-72 skeleton-shimmer rounded-lg opacity-30" />
            <div className="h-4 w-96 skeleton-shimmer rounded mt-3 opacity-20" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={`stat-skel-${i}`} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <DepartmentSummarySkeleton />
            <div className="lg:col-span-3">
              <ServiceTableSkeleton />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-blue-200 text-sm font-medium tracking-wide uppercase">
                Hệ thống giám sát
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold mt-1 leading-tight">
                Dashboard Theo Dõi Dịch Vụ Công
              </h1>
              <p className="text-blue-100/80 mt-2 text-sm sm:text-base max-w-xl">
                Theo dõi tiến độ triển khai dịch vụ công trực tuyến từ Google
                Sheets
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs text-blue-200">Tổng dịch vụ</p>
                <p className="text-xl font-bold tabular-nums">
                  {stats.total.toLocaleString("vi-VN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8 animate-fade-in">
        {/* STAT CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Tổng dịch vụ"
            value={stats.total}
            icon="📋"
            accent="blue"
          />
          <StatCard
            title="Toàn trình"
            value={stats.toanTrinh}
            total={stats.total}
            icon="✓"
            accent="green"
          />
          <StatCard
            title="Một phần"
            value={stats.motPhan}
            total={stats.total}
            icon="◐"
            accent="amber"
          />
          <StatCard
            title="Tỉ lệ hoàn thành"
            value={stats.hoanThanh}
            total={stats.total}
            icon="📊"
            accent="violet"
          />
        </section>

        {/* LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <DepartmentSummary
              data={group}
              onSelectDepartment={setSelectedDept}
            />
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selectedDept && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-blue-200 rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 text-sm">
                      🏢
                    </span>
                    <div>
                      <p className="text-xs text-slate-500">Đang lọc theo đơn vị</p>
                      <p className="font-semibold text-slate-900">{selectedDept}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDept(null)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    <span aria-hidden>✕</span>
                    Xóa bộ lọc
                  </button>
                </div>

                <DepartmentCharts
                  stats={group[selectedDept]}
                  departmentName={selectedDept}
                />
              </>
            )}

            <ServiceTable
              data={validData}
              filterDepartment={selectedDept ?? undefined}
            />
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <p>© 2026 Dashboard Theo Dõi Dịch Vụ Công</p>
          <p className="text-xs">
            Dữ liệu đồng bộ từ Google Sheets
          </p>
        </div>
      </footer>
    </div>
  );
}
