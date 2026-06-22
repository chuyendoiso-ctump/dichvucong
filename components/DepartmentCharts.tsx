/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DepartmentChartsProps {
  stats: {
    tong: number;
    toan_trinh: number;
    mot_phan: number;
    du_kien: number;
    completed: number;
  };
  departmentName: string;
}

export function DepartmentCharts({
  stats,
  departmentName,
}: DepartmentChartsProps) {
  if (!stats || stats.tong === 0) return null;

  const completionData = [
    { name: "Hoàn thành", value: stats.completed, color: "#10b981" }, // emerald-500
    {
      name: "Chưa hoàn thành",
      value: stats.tong - stats.completed,
      color: "#e2e8f0",
    }, // slate-200
  ];

  const typeData = [
    { name: "Toàn trình (TT)", value: stats.toan_trinh, color: "#3b82f6" }, // blue-500
    { name: "Một phần (MP)", value: stats.mot_phan, color: "#f59e0b" }, // amber-500
  ];

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill={percent > 0.5 && outerRadius > 60 ? "white" : "#475569"}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-bold drop-shadow-sm"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm mb-4 animate-fade-in">
      <h3 className="text-base font-semibold text-slate-800 mb-4 text-center">
        Thống kê chi tiết: <span className="text-blue-700">{departmentName}</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Chart 1: Hoàn thành */}
        <div className="flex flex-col items-center">
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            Tỉ lệ hoàn thành
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  dataKey="value"
                  animationDuration={800}
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [
                    `${value} dịch vụ`,
                    "Số lượng",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    fontSize: "13px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Phân loại */}
        <div className="flex flex-col items-center">
          <h4 className="text-sm font-medium text-slate-600 mb-2">
            Phân loại: TT - MP
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  dataKey="value"
                  animationDuration={800}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [
                    `${value} dịch vụ`,
                    "Số lượng",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    fontSize: "13px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
