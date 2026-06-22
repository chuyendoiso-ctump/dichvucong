interface ChartDataPoint {
  label: string;
  value: number;
  percentage: number;
}

export function getPieChartData(total: number, values: { [key: string]: number }): ChartDataPoint[] {
  return Object.entries(values).map(([label, value]) => ({
    label,
    value,
    percentage: total > 0 ? Math.round((value / total) * 100) : 0,
  }));
}

interface ServiceData {
  don_vi: string;
  ten_dich_vu: string;

  toan_trinh: boolean;
  mot_phan: boolean;
  du_kien: boolean;

  chi_tiet?: Record<string, string>;
}

export function getDepartmentStats(
  data: ServiceData[],
  deptName: string
) {
  const deptData = data.filter((item) => item.don_vi === deptName);

  // 🔥 FIX: xác định completed đúng nguồn
  const completedCount = deptData.filter((item) => {
    const raw =
      item.chi_tiet?.du_kien ||
      item.chi_tiet?.trang_thai ||
      item.chi_tiet?.tinh_trang ||
      "";

    return isDuKienCompleted(raw);
  }).length;

  return {
    total: deptData.length,

    toanTrinh: deptData.filter((d) => d.toan_trinh).length,
    motPhan: deptData.filter((d) => d.mot_phan).length,
    duKien: deptData.filter((d) => d.du_kien).length,

    // 🔥 QUAN TRỌNG NHẤT
    completed: completedCount,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatPercentage(value: number, total: number): string {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
}

import { isDuKienCompleted } from "./normalize.util";

