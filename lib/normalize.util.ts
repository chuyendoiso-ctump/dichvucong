// ===== NORMALIZE =====
export const normalize = (v: string = "") =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();

// ===== CHECK X =====
export const isX = (v: string = "") => {
  const val = normalize(v);
  return val === "x" || val === "✓" || val === "true";
};

// ===== LẤY GIÁ TRỊ CỘT DỰ KIẾN TRIỂN KHAI =====
export const getDuKienFieldValue = (
  chi_tiet?: Record<string, string>,
  fallback = ""
) => {
  if (chi_tiet) {
    const key =
      Object.keys(chi_tiet).find((k) => normalize(k).includes("du_kien")) ??
      (chi_tiet.col_4 !== undefined ? "col_4" : undefined);
    if (key && chi_tiet[key]?.trim()) return chi_tiet[key].trim();
  }
  return fallback.trim();
};

// ===== HOÀN THÀNH (chỉ status text, không tính X) =====
export const isDuKienCompleted = (v: string = "") => {
  const n = normalize(v);
  if (!n || isX(v)) return false;

  return (
    n === "da hoan thanh" ||
    n === "da thuc hien" ||
    n === "da trien khai" ||
    n === "hoan thanh" ||
    n.includes("da hoan thanh") ||
    n.includes("da thuc hien") ||
    n.includes("da trien khai") ||
    (n.includes("hoan thanh") && !n.includes("chua"))
  );
};

// ===== PARSE % =====
export const parseDuKienPercent = (v: string = ""): number | null => {
  const raw = v.trim();
  if (!raw || isDuKienCompleted(raw) || isX(raw)) return null;

  if (raw.includes("%")) {
    const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*%/);
    if (match) {
      const num = parseFloat(match[1].replace(",", "."));
      if (!Number.isNaN(num)) return Math.min(100, Math.max(0, num));
    }
  }

  const match = raw.match(/^(\d+(?:[.,]\d+)?)$/);
  if (!match) return null;

  const num = parseFloat(match[1].replace(",", "."));
  if (Number.isNaN(num)) return null;

  if (num > 0 && num <= 1) {
    return Math.min(100, num * 100);
  }

  return Math.min(100, Math.max(0, num));
};

// ===== HIỂN THỊ CỘT DỰ KIẾN =====
export const formatDuKienDisplay = (v: string = "") => {
  const raw = v.trim();
  if (!raw) return "";

  if (isX(raw)) return "Dự kiến";

  const badge = getDuKienStatusBadge(raw);
  if (badge) return badge.label;

  const percent = parseDuKienPercent(raw);
  if (percent !== null) return `${percent % 1 === 0 ? Math.round(percent) : percent}%`;

  return raw;
};

// ===== NHÃN MÀU CHO TRẠNG THÁI HOÀN THÀNH =====
export const getDuKienStatusBadge = (v: string = "") => {
  const n = normalize(v);
  if (!n || isX(v)) return null;

  if (isDuKienCompleted(v)) {
    return {
      label: "Đã hoàn thành",
      className: "bg-green-100 text-green-800 border border-green-200",
    };
  }

  return null;
};

// ===== TIẾN TRÌNH % CHO POPUP =====
export const getDuKienProgress = (v: string = ""): number | null => {
  if (isDuKienCompleted(v)) return 100;
  return parseDuKienPercent(v);
};

// ===== CÓ DỮ LIỆU CỘT DỰ KIẾN =====
export const hasDuKienValue = (v: string = "") => normalize(v) !== "";

// Alias giữ tương thích
export const isCompletedFromDuKien = isDuKienCompleted;
