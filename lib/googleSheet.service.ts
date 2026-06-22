/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from "xlsx";
import {
  hasDuKienValue,
  isDuKienCompleted as isDuKienCompletedStatus,
} from "./normalize.util";

// ===== CONFIG =====
const SPREADSHEET_ID =
  process.env.NEXT_PUBLIC_SPREADSHEET_ID ||
  "129EeoYElOe73TORcsIEbi3ScnVv5lgtznXMQsK6I7es";

export const SHEETS = [
  { name: "Khoa Dược", gid: 1007797182 },
  { name: "Khoa Y", gid: 1304924736 },
  { name: "Khoa RHM", gid: 1482250457 },
  { name: "Khoa YTCC", gid: 2083498446 },
  { name: "Khoa Điều dưỡng &KTYH", gid: 1046909010 },
  { name: "Khoa YHCT", gid: 175306645 },
  { name: "Khoa KHCB", gid: 304466929 },
  { name: "Phòng CTNH", gid: 5703969 },
  { name: "Phòng ĐTSĐH", gid: 793774582 },
  { name: "Phòng ĐTĐH", gid: 142507270 },
  { name: "Phòng CSVCTB", gid: 1077678156 },
  { name: "Phòng KHCN", gid: 1227592800 },
  { name: "Phòng TCNS", gid: 2074002228 },
  { name: "Phòng TCKT", gid: 2008580677 },
  { name: "Phòng QLCLGD", gid: 122668541 },
  { name: "Văn Phòng", gid: 1187738773 },
  { name: "TTDV&ĐTTNCXH", gid: 1788786615 },
  { name: "TTGDYH&HLKNYK", gid: 1177842999 },
  { name: "Thư viện", gid: 190403298 },
  { name: "VP Đảng ủy", gid: 1545751515 },
  { name: "Công đoàn", gid: 1543342602 },
  { name: "Đoàn TN", gid: 2129376815 },
  { name: "Bệnh viện", gid: 196621376 },
];

// ===== NORMALIZE =====
const normalize = (v: string = "") =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();

// ===== SAFE KEY =====
const safeKey = (k: string) =>
  normalize(k)
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

// ===== XLSX → ROWS (giữ hyperlink ô) =====
const getCellHyperlink = (cell?: XLSX.CellObject): string | undefined => {
  const target = cell?.l?.Target;
  if (!target) return undefined;
  return target.replace(/&amp;/g, "&");
};

const worksheetToRows = (ws: XLSX.WorkSheet): string[][] => {
  const ref = ws["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const rows: string[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      let value = "";
      if (cell) {
        if (cell.w != null) {
          value = String(cell.w).trim();
        } else if (cell.v != null) {
          value = String(cell.v).trim();
        }
      }
      const hyperlink = getCellHyperlink(cell);

      if (hyperlink) {
        if (!value || /^https?:\/\//i.test(value)) {
          value = hyperlink;
        } else if (!value.includes(hyperlink)) {
          value = `${value}\n[Tài liệu](${hyperlink})`;
        }
      }

      row.push(value);
    }
    rows.push(row);
  }

  return rows;
};

// ===== CSV PARSER (ROBUST) =====
const parseCSV = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current !== "" || row.length > 0) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (char === "\r" && next === "\n") i++;
    } else {
      current += char;
    }
  }

  if (current !== "" || row.length > 0) {
    row.push(current.trim());
    rows.push(row);
  }

  return rows;
};

// ===== FIND HEADER =====
const normalizeRow = (row: string[]) => row.map(normalize);

const findHeaderIndex = (rows: string[][]) => {
  for (let i = 0; i < 10; i++) {
    const row = normalizeRow(rows[i] || []);
    const joined = row.join(" ");

    if (row.includes("stt") && joined.includes("dich vu")) {
      return i;
    }
  }
  return -1;
};

// ===== MERGE HEADER =====
const mergeHeader = (r1: string[], r2: string[]) => {
  const len = Math.max(r1.length, r2.length);
  const merged: string[] = [];

  for (let i = 0; i < len; i++) {
    merged.push(`${r1[i] || ""} ${r2[i] || ""}`.trim());
  }

  return merged;
};

// ===== COLUMN MATCH (BULLETPROOF) =====
const scoreMatch = (col: string, keys: string[]) => {
  let score = 0;

  for (const k of keys) {
    const nk = normalize(k);

    if (col === nk) score += 100;
    else if (col.startsWith(nk)) score += 50;
    else if (col.includes(nk)) score += 10;
  }

  return score;
};

const detectColumns = (header: string[]) => {
  const h = header.map(normalize);

  const findBest = (keys: string[]) => {
    let bestIndex = -1;
    let bestScore = 0;

    h.forEach((col, idx) => {
      const score = scoreMatch(col, keys);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = idx;
      }
    });

    return bestIndex;
  };

  return {
    stt: findBest(["stt"]),
    ten: findBest(["ten dich vu", "ten dich vu cong", "ten"]),
    toan: findBest(["toan trinh"]),
    mot: findBest(["mot phan"]),
    du: findBest(["du kien", "du kien trien khai"]),
    mo_ta: findBest(["mo ta quy trinh", "mo_ta", "quy trinh", "mota", "process", "description", "ghi chu"]),
    doi_tuong: findBest(["doi tuong su dung"]),
    ghi_chu: findBest(["ghi chu"]),
    link: findBest(["link", "url"]),
  };
};

// ===== IS X =====
const isX = (v: string) => {
  const n = normalize(v);
  return n === "x" || n === "✓" || n === "true";
};

// ===== IS TOAN TRINH (có X hoặc status text) =====
const isToanTrinh = (v: string) => {
  const n = normalize(v);
  return (
    n.startsWith("x") ||
    n.startsWith("✓") ||
    n.startsWith("true") ||
    n.startsWith("toan trinh") ||
    n.startsWith("da thuc hien") ||
    n.includes("toan trinh") ||
    n.includes("da thuc hien")
  );
};

// ===== IS MOT PHAN (CHỈ X) =====
const isMotPhan = (v: string) => {
  const n = normalize(v);
  return (
    n.startsWith("x") ||
    n.startsWith("✓") ||
    n.startsWith("true") ||
    n.startsWith("mot phan") ||
    n.includes("mot phan")
  );
};

// ===== ROW → OBJECT SAFE =====
const rowToObject = (header: string[], row: string[]) => {
  const obj: Record<string, string> = {};

  header.forEach((h, i) => {
    const trimmed = (h || "").trim();
    const key = safeKey(trimmed || `col_${i}`);
    obj[key] = row[i] ?? "";
  });

  return obj;
};

// ===== MAIN SERVICE =====
export const fetchAllData = async () => {
  let workbook: XLSX.WorkBook;

  try {
    const xlsxUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;
    const res = await fetch(xlsxUrl, {
      signal: AbortSignal.timeout(60000) // timeout 60 giây
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
  } catch (err: any) {
    return [
      {
        don_vi: "ALL",
        error: true,
        message: err?.message || "XLSX_FETCH_FAILED",
      },
    ];
  }

  const results = SHEETS.map((sheet) => {
    try {
      let ws = workbook.Sheets[sheet.name];
      if (!ws) {
        const actualName = Object.keys(workbook.Sheets).find(
          (k) => k.toLowerCase() === sheet.name.toLowerCase()
        );
        if (actualName) {
          ws = workbook.Sheets[actualName];
        }
      }

      if (!ws) {
        return [
          {
            don_vi: sheet.name,
            error: true,
            message: "SHEET_NOT_FOUND",
            empty: true,
          },
        ];
      }

      const rows = worksheetToRows(ws);

        if (!rows.length) {
  return [
    {
      don_vi: sheet.name,
      stt: "",
      ten_dich_vu: "",
      toan_trinh: false,
      mot_phan: false,
      du_kien: false,
      chi_tiet: {},
      empty: true,
    },
  ];
}

        const headerIdx = findHeaderIndex(rows);
        if (headerIdx === -1) {
          return [
            {
              don_vi: sheet.name,
              error: true,
              message: "HEADER_NOT_FOUND",
            },
          ];
        }

        const header = mergeHeader(
          rows[headerIdx],
          rows[headerIdx + 1] || []
        );

        const cols = detectColumns(header);

        if (cols.stt === -1 || cols.ten === -1) {
  return [
    {
      don_vi: sheet.name,
      error: true,
      message: "COLUMN_MAPPING_FAILED",
      empty: true,
    },
  ];
}

        const data: any[] = [];

        for (let i = headerIdx + 2; i < rows.length; i++) {
          const r = rows[i];

          if (!r || r.length < 2) continue;
          if (r.length === 1 && r[0].trim() === "") continue;

          const stt = r[cols.stt]?.trim();
          const ten = r[cols.ten]?.trim();

          if (!ten) continue;
          if (stt && isNaN(Number(stt))) continue;

          const duKienRaw = cols.du !== -1 ? (r[cols.du] || "").trim() : "";

          data.push({
  don_vi: sheet.name,
  stt,
  ten_dich_vu: ten,

  // ✅ TOAN TRINH: X hoặc status text
  toan_trinh:
    cols.toan !== -1 &&
    r[cols.toan] &&
    isToanTrinh(r[cols.toan]),

  // ✅ MOT PHAN: X ONLY (cực kỳ nghiêm ngặt)
  mot_phan:
    cols.mot !== -1 &&
    r[cols.mot] &&
    isMotPhan(r[cols.mot]),

  // ✅ DU KIEN: có bất kỳ giá trị nào trong cột
  du_kien: hasDuKienValue(duKienRaw),
  du_kien_value: duKienRaw,

  // ✅ COMPLETED: chỉ status hoàn thành (không tính X)
  completed: isDuKienCompletedStatus(duKienRaw) ? 1 : 0,

  chi_tiet: rowToObject(header, r),

  empty: false,
});
        }

        return data;
      } catch (err: any) {
        return [
          {
            don_vi: sheet.name,
            error: true,
            message: err?.message || "UNKNOWN_ERROR",
          },
        ];
      }
  });

  return (results.flat() || []).filter(Boolean);
};
