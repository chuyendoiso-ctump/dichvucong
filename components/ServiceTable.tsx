import { useState, useMemo, useEffect, type ReactNode, type ReactElement } from "react";
import { createPortal } from "react-dom";
import {
  extractMediaLinks,
  cleanTextRemoveUrls,
  isImageUrl,
} from "@/lib/imageLink.util";
import { DocumentEmbed } from "@/components/DocumentEmbed";
import {
  getMoTaTextOnly,
  getTaiLieu1Urls,
  getTaiLieu2Url,
  getDocumentLinkUrls,
  isLinkOnlyField,
  isMoTaFieldKey,
  isDuKienFieldKey,
  isDoiTuongFieldKey,
  getDuKienChiTietKey,
  isToanTrinhFieldKey,
  isMotPhanFieldKey,
  getTaiLieu2FieldKey,
  getMoTaFieldKey,
} from "@/lib/moTa.util";
import {
  getDuKienFieldValue,
  formatDuKienDisplay,
  getDuKienStatusBadge,
  getDuKienProgress,
} from "@/lib/normalize.util";

interface Service {
  don_vi: string;
  stt: string;
  ten_dich_vu: string;

  toan_trinh: boolean;
  mot_phan: boolean;
  du_kien: boolean;
  du_kien_value?: string;
  completed?: number;

  chi_tiet?: Record<string, string>;
}

interface ServiceTableProps {
  data: Service[];
  filterDepartment?: string;
}

// ===== SAFE GET MULTI-KEY =====
const getMulti = (item: Service, keys: string[]) => {
  const rawObj = item?.chi_tiet ?? {};

  for (const key of keys) {
    const foundKey = Object.keys(rawObj).find((k) =>
      k.toLowerCase().includes(key.toLowerCase())
    );

    if (foundKey) return rawObj[foundKey];
  }

  return "";
};

// ===== GET ALL MEDIA LINKS FROM SERVICE =====
const getAllMediaLinks = (service: Service) => {
  const docUrls = new Set(
    service.chi_tiet ? getDocumentLinkUrls(service.chi_tiet) : []
  );

  const allMedias: {
    type: "image" | "drive" | "url";
    url: string;
    displayUrl: string;
    source: string;
  }[] = [];

  console.log("[getAllMediaLinks] Processing service:", service.stt, service.ten_dich_vu);

  // ===== SEARCH ALL FIELDS =====
  Object.entries(service).forEach(([key, value]) => {
    // Skip non-string fields
    if (typeof value !== "string" || !value || value.trim() === "") return;

    console.log(`  [Field: ${key}] Value: ${value.substring(0, 100)}...`);

    const mediaLinks = extractMediaLinks(value);
    console.log(`    → Found ${mediaLinks.length} media links`);
    
    mediaLinks.forEach((link) => {
      if (docUrls.has(link.url)) return;
      allMedias.push({
        ...link,
        source: key,
      });
    });
  });

  // ===== SEARCH IN chi_tiet OBJECT =====
  if (service.chi_tiet && typeof service.chi_tiet === "object") {
    console.log("[getAllMediaLinks] Searching in chi_tiet...");
    
    Object.entries(service.chi_tiet).forEach(([key, value]) => {
      if (typeof value !== "string" || !value || value.trim() === "") return;
      // Don't skip any fields - ensure all media links are captured
      // Mô tả quy trình + link-only columns — hiển thị inline trong popup
      // if (service.chi_tiet && isMoTaFieldKey(key, service.chi_tiet)) return;
      // if (isLinkOnlyField(key, value, service.chi_tiet)) return;

      console.log(`  [chi_tiet.${key}] Value: ${value.substring(0, 100)}...`);

      const mediaLinks = extractMediaLinks(value);
      console.log(`    → Found ${mediaLinks.length} media links`);
      
      mediaLinks.forEach((link) => {
        if (docUrls.has(link.url)) return;
        allMedias.push({
          ...link,
          source: `chi_tiet.${key}`,
        });
      });
    });
  }

  // Remove duplicates
  const seen = new Set<string>();
  const result = allMedias.filter((m) => {
    const key = m.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log("[getAllMediaLinks] Final result:", result.length, "unique media links", result);
  return result;
};

const renderDuKienCell = (item: Service) => {
  const raw = getDuKienFieldValue(item.chi_tiet, item.du_kien_value || "");
  if (!raw && !item.du_kien) {
    return <span className="text-slate-300">—</span>;
  }

  const badge = getDuKienStatusBadge(raw);
  if (badge) {
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium leading-tight ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  }

  const display = formatDuKienDisplay(raw);
  const isPercent = display.endsWith("%");
  const isDuKienLabel = display === "Dự kiến";

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-medium leading-tight max-w-[120px] truncate ${
        isDuKienLabel
          ? "bg-blue-100 text-blue-700"
          : isPercent
          ? "bg-violet-100 text-violet-700"
          : "bg-slate-100 text-slate-700"
      }`}
      title={display}
    >
      {display}
    </span>
  );
};

export function ServiceTable({
  data,
  filterDepartment,
}: ServiceTableProps) {
  const [sortKey, setSortKey] = useState<string>("don_vi");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedService]);

  // DEBUG: Log full service data structure
  useMemo(() => {
    if (data.length > 0) {
      console.log("=== FULL SERVICE DATA STRUCTURE ===");
      console.log("First service:", data[0]);
      console.log("Keys:", Object.keys(data[0]));
      console.log("chi_tiet keys:", Object.keys(data[0].chi_tiet || {}));
    }
  }, [data]);

  // ===== FILTER + SORT =====
  const filteredData = useMemo(() => {
    let result = [...data];

    // FILTER DEPARTMENT
    if (filterDepartment) {
      result = result.filter(
        (item) => item.don_vi === filterDepartment
      );
    }

    // SEARCH
    if (searchTerm) {
      const s = searchTerm.toLowerCase();

      result = result.filter((item) =>
        item.ten_dich_vu.toLowerCase().includes(s) ||
        item.don_vi.toLowerCase().includes(s) ||
        JSON.stringify(item.chi_tiet || {})
          .toLowerCase()
          .includes(s)
      );
    }

    // SORT (SAFE COPY)
    return [...result].sort((a, b) => {
      if (sortKey === "don_vi") {
        const deptCompare = a.don_vi.localeCompare(b.don_vi);
        if (deptCompare !== 0) return deptCompare;
        return Number(a.stt || 999) - Number(b.stt || 999);
      }

      if (sortKey === "ten_dich_vu") {
        return a.ten_dich_vu.localeCompare(b.ten_dich_vu);
      }

      return 0;
    });
  }, [data, filterDepartment, searchTerm, sortKey]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

      {/* HEADER + SEARCH */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Danh sách dịch vụ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredData.length.toLocaleString("vi-VN")} kết quả
              {filterDepartment ? ` · ${filterDepartment}` : ""}
            </p>
          </div>
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm dịch vụ hoặc đơn vị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide w-16">
                STT
              </th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                Tên dịch vụ
              </th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide w-24">
                TT
              </th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide w-24">
                MP
              </th>
              <th className="text-center px-3 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide min-w-[120px]">
                DK
              </th>
              <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide w-20">
                Chi tiết
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="font-medium text-slate-700">
                    Không tìm thấy dịch vụ
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Thử thay đổi từ khóa hoặc bộ lọc đơn vị
                  </p>
                </td>
              </tr>
            ) : (
              filteredData.map((item, index) => (
                <tr
                  key={`${item.don_vi}-${item.stt}-${item.ten_dich_vu}`}
                  className={`border-b border-slate-100 transition-colors hover:bg-blue-50/60 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <td className="px-4 py-3.5 text-center text-slate-500 tabular-nums font-medium">
                    {item.stt}
                  </td>

                  <td className="px-4 py-3.5">
                    <p className="font-medium text-slate-900 leading-snug">
                      {item.ten_dich_vu}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">
                      {item.don_vi}
                    </p>
                  </td>

                  <td className="px-3 py-3.5 text-center">
                    {item.toan_trinh ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                        ✓
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-3 py-3.5 text-center">
                    {item.mot_phan ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                        ◐
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-3 py-3.5 text-center">
                    {renderDuKienCell(item)}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    {item.chi_tiet ? (
                      <button
                        type="button"
                        onClick={() => setSelectedService(item)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition text-xs font-semibold shadow-sm"
                        title="Xem chi tiết"
                      >
                        i
                      </button>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER COUNT */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 text-sm text-slate-500 flex items-center justify-between">
        <span>
          Hiển thị{" "}
          <strong className="text-slate-700 tabular-nums">
            {filteredData.length.toLocaleString("vi-VN")}
          </strong>{" "}
          dịch vụ
        </span>
        <span className="text-xs hidden sm:inline">
          TT = Toàn trình · MP = Một phần · DK = Dự kiến
        </span>
      </div>

      {/* MODAL — portal vào body để luôn căn giữa viewport */}
      {mounted &&
        selectedService &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedService(null)}
          >
            <div
              className="bg-white rounded-none shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              {/* HEADER */}
              <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white px-6 py-5 flex justify-between items-start rounded-none sticky top-0 z-10">
                <div className="min-w-0 pr-4">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/15 text-xs font-medium text-blue-100">
                    Dịch vụ công trực tuyến
                  </div>
                  <h2 className="text-xl font-bold mt-2">
                    STT {selectedService.stt}
                  </h2>
                  <p className="text-blue-100/90 mt-1.5 leading-relaxed">
                    {selectedService.ten_dich_vu}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="shrink-0 hover:bg-white/15 w-9 h-9 rounded-xl flex items-center justify-center transition"
                  aria-label="Đóng"
                >
                  ✕
                </button>
              </div>

              {/* BODY */}
              <div className="p-6 space-y-6">
                {(() => {
                  const duKienRaw = getDuKienFieldValue(
                    selectedService.chi_tiet,
                    selectedService.du_kien_value || ""
                  );
                  const progress = getDuKienProgress(duKienRaw);
                  const duKienBadge = getDuKienStatusBadge(duKienRaw);

                  return (
                    <>
                      {/* TIẾN TRÌNH HOÀN THÀNH */}
                      {progress !== null && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Tiến trình hoàn thành
                            </span>
                            <span className="text-sm font-bold text-emerald-600 tabular-nums">
                              {progress}%
                            </span>
                          </div>
                          <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(progress, 2)}%` }}
                            />
                          </div>
                          {duKienBadge && (
                            <div className="mt-2.5">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${duKienBadge.className}`}
                              >
                                {duKienBadge.label}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* THÔNG TIN CHUNG */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Đơn vị phụ trách
                          </div>
                          <div className="font-semibold text-slate-900 mt-1.5">
                            {selectedService.don_vi}
                          </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Hình thức cung cấp dịch vụ
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {selectedService.toan_trinh && (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">
                                Toàn trình
                              </span>
                            )}
                            {selectedService.mot_phan && (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg">
                                Một phần
                              </span>
                            )}
                            {duKienRaw && !duKienBadge && (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                                {formatDuKienDisplay(duKienRaw)}
                              </span>
                            )}
                            {duKienBadge && (
                              <span
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg ${duKienBadge.className}`}
                              >
                                {duKienBadge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* CHI TIẾT */}
                {selectedService.chi_tiet && (
                  <div className="space-y-4">
                    <div className="text-sm font-semibold text-slate-800">
                      Thông tin chi tiết
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                      {(() => {
                        const chiTiet = selectedService.chi_tiet!;
                        const doc2Url = getTaiLieu2Url(chiTiet);
                        const duKienKey = getDuKienChiTietKey(chiTiet);
                        const moTaKey = getMoTaFieldKey(chiTiet);
                        const doiTuongKey = Object.keys(chiTiet).find((k) =>
                          isDoiTuongFieldKey(k)
                        );

                        const renderCard = (
                          key: string,
                          label: string,
                          content: ReactNode
                        ) => (
                          <div
                            key={key}
                            className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm"
                          >
                            <div className="text-xs font-medium text-slate-500 mb-1.5">
                              {label}
                            </div>
                            {content}
                          </div>
                        );

                        const cards: ReactNode[] = [];
                        const renderedKeys = new Set<string>();

                        // 1. Mô tả quy trình các bước
                        if (moTaKey && chiTiet[moTaKey]?.trim()) {
                          renderedKeys.add(moTaKey);
                          const taiLieu1Urls = getTaiLieu1Urls(chiTiet);
                          const moTaText = getMoTaTextOnly(chiTiet);

                          cards.push(
                            renderCard(
                              moTaKey,
                              "Mô tả quy trình các bước",
                              <div className="space-y-2">
                                {moTaText && (
                                  <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                                    {moTaText}
                                  </div>
                                )}
                                {taiLieu1Urls.map((url, idx) => (
                                  <DocumentEmbed
                                    key={`${url}-${idx}`}
                                    url={url}
                                    label={
                                      taiLieu1Urls.length > 1
                                        ? `Tài liệu 1 (${idx + 1})`
                                        : "Tài liệu 1"
                                    }
                                    compact
                                  />
                                ))}
                              </div>
                            )
                          );
                        }

                        // 2. Loại 1 phần hay toàn trình
                        const toanTrinhKey = Object.keys(chiTiet).find((k) => isToanTrinhFieldKey(k));
                        const motPhanKey = Object.keys(chiTiet).find((k) => isMotPhanFieldKey(k));
                        const toanTrinhVal = toanTrinhKey ? chiTiet[toanTrinhKey]?.trim() : "";
                        const motPhanVal = motPhanKey ? chiTiet[motPhanKey]?.trim() : "";

                        if (toanTrinhVal || motPhanVal) {
                          cards.push(
                            renderCard(
                              "loai-hinh-thuc",
                              "Loại dịch vụ công trực tuyến (Một phần hay toàn trình)",
                              <div className="space-y-2.5 mt-1">
                                {toanTrinhVal && (
                                  <div className="flex items-start gap-2.5">
                                    <span className="shrink-0 px-2.5 py-1 bg-emerald-100 text-emerald-850 border border-emerald-200 text-xs font-bold rounded-lg leading-none">
                                      Toàn trình
                                    </span>
                                    <span className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                                      {toanTrinhVal}
                                    </span>
                                  </div>
                                )}
                                {motPhanVal && (
                                  <div className="flex items-start gap-2.5">
                                    <span className="shrink-0 px-2.5 py-1 bg-amber-100 text-amber-850 border border-amber-200 text-xs font-bold rounded-lg leading-none">
                                      Một phần
                                    </span>
                                    <span className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                                      {motPhanVal}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )
                          );
                        }

                        // Mark any toan_trinh / mot_phan keys in chiTiet so they are not rendered twice
                        Object.keys(chiTiet).forEach((k) => {
                          if (isToanTrinhFieldKey(k) || isMotPhanFieldKey(k)) {
                            renderedKeys.add(k);
                          }
                        });

                        // 3. Dự kiến triển khai
                        if (duKienKey && chiTiet[duKienKey]?.trim()) {
                          renderedKeys.add(duKienKey);
                          const value = chiTiet[duKienKey];
                          const duKienBadge = getDuKienStatusBadge(value);
                          const displayValue = formatDuKienDisplay(value);

                          cards.push(
                            renderCard(
                              duKienKey,
                              "Dự kiến triển khai",
                              duKienBadge ? (
                                <span
                                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${duKienBadge.className}`}
                                >
                                  {duKienBadge.label}
                                </span>
                              ) : (
                                <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                                  {displayValue}
                                </div>
                              )
                            )
                          );
                        }

                        // 4. Đối tượng sử dụng
                        if (doiTuongKey && chiTiet[doiTuongKey]?.trim()) {
                          renderedKeys.add(doiTuongKey);
                          const value = chiTiet[doiTuongKey];

                          cards.push(
                            renderCard(
                              doiTuongKey,
                              "Đối tượng sử dụng",
                              <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                                {value}
                              </div>
                            )
                          );
                        }

                        // 5. Tài liệu 2
                        if (doc2Url) {
                          cards.push(
                            renderCard(
                              "tai-lieu-2",
                              "Tài liệu 2",
                              <DocumentEmbed
                                url={doc2Url}
                                label="Tài liệu 2"
                                compact
                              />
                            )
                          );
                          const doc2Key = getTaiLieu2FieldKey(chiTiet);
                          if (doc2Key) {
                            renderedKeys.add(doc2Key);
                          }
                        }

                        // 6. Các trường thông tin khác (nếu có)
                        for (const [key, value] of Object.entries(chiTiet)) {
                          if (!value?.trim()) continue;
                          const k = key.toLowerCase();
                          if (
                            k.includes("stt") ||
                            k.includes("ten_dich_vu") ||
                            k.includes("loai_dich_vu")
                          )
                            continue;
                          if (renderedKeys.has(key)) continue;

                          const label = key
                            .replace(/_/g, " ")
                            .replace(/\d+/g, "")
                            .replace(/\s+/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                            .trim();

                          cards.push(
                            renderCard(
                              key,
                              label,
                              <div className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                                {cleanTextRemoveUrls(value) || value}
                              </div>
                            )
                          );
                        }

                        return cards;
                      })()}
                    </div>
                  </div>
                )}

                {/* HÌNH ẢNH / TÀI LIỆU */}
                {(() => {
                  const allMedias = getAllMediaLinks(selectedService);
                  return allMedias.length > 0 ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold text-gray-800">
                        📎 Hình ảnh / Tài liệu ({allMedias.length})
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allMedias.map((link, idx) => {
                          const isDrivePreview =
                            link.displayUrl.includes(
                              "drive.google.com/file/d/"
                            ) && link.displayUrl.includes("/preview");
                          const isPngPlaceholder =
                            link.displayUrl.startsWith("PNG_PLACEHOLDER:");

                          return (
                            <div
                              key={`media-${idx}`}
                              className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:shadow-md transition"
                            >
                              {isPngPlaceholder ? (
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative bg-gradient-to-br from-blue-50 to-indigo-50 aspect-video overflow-hidden group cursor-pointer rounded-lg border border-gray-200 flex flex-col items-center justify-center hover:shadow-lg hover:border-blue-300 transition-all duration-200 p-4"
                                >
                                  <div className="text-4xl mb-2">📋</div>
                                  <p className="text-xs text-gray-700 font-medium text-center line-clamp-2">
                                    {link.displayUrl.replace(
                                      "PNG_PLACEHOLDER:",
                                      ""
                                    )}
                                  </p>
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center transition duration-200 pointer-events-none rounded-lg">
                                    <span className="text-white text-sm font-medium">
                                      🔍 Tìm trong Drive
                                    </span>
                                  </div>
                                </a>
                              ) : isDrivePreview ? (
                                <div className="relative bg-gray-100 aspect-video overflow-hidden group rounded-lg border border-gray-200">
                                  <iframe
                                    src={link.displayUrl}
                                    className="w-full h-full"
                                    allowFullScreen={true}
                                    loading="lazy"
                                    title={`Media ${idx + 1}`}
                                  />
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-2 right-2 z-10 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                                  >
                                    ↗ Mở
                                  </a>
                                </div>
                              ) : isImageUrl(link.displayUrl) ? (
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="relative block bg-gray-100 aspect-video overflow-hidden group cursor-pointer h-full rounded-lg border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                                >
                                  <img
                                    src={link.displayUrl}
                                    alt={`Media ${idx + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3ELỗi tải%3C/text%3E%3C/svg%3E";
                                    }}
                                  />
                                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/50 flex items-center justify-center transition duration-200 pointer-events-none rounded-lg">
                                    <span className="text-white text-sm font-medium">
                                      🔍 Xem phóng to
                                    </span>
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-4 flex items-center justify-between hover:bg-gray-100 transition h-full"
                                >
                                  <span className="text-blue-600 underline truncate text-sm">
                                    Xem tài liệu
                                  </span>
                                  <span className="text-lg ml-2">↗</span>
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* GHI CHÚ NHANH */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="text-sm font-semibold text-blue-800 mb-2">
                    Thông tin tổng quan
                  </div>
                  <div className="text-sm text-blue-900/90 leading-relaxed">
                    Dịch vụ này thuộc <b>{selectedService.don_vi}</b>, hiện
                    đang
                    {selectedService.toan_trinh
                      ? " được triển khai dưới hình thức toàn trình"
                      : selectedService.mot_phan
                      ? " được triển khai dưới hình thức một phần"
                      : " trong giai đoạn dự kiến triển khai"}
                    .
                  </div>
                </div>
              </div>

              {/* FOOTER */}
              <div className="border-t border-slate-100 px-6 py-4 flex justify-end bg-slate-50/80 rounded-b-2xl sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-[0.98] transition shadow-sm"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}