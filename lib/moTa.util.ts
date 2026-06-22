import { extractMediaLinks, cleanTextRemoveUrls } from "./imageLink.util";
import { normalize } from "./normalize.util";

const URL_ONLY_REGEX = /^https?:\/\/\S+$/i;

const findKey = (
  chi_tiet: Record<string, string>,
  matchers: ((k: string, nk: string) => boolean)[]
): string | null => {
  for (const [key] of Object.entries(chi_tiet)) {
    const nk = normalize(key);
    if (matchers.some((m) => m(key, nk))) return key;
  }
  return null;
};

/** Cột mô tả quy trình — CSV gộp header thành `ghi_chu` */
export const getMoTaFieldKey = (
  chi_tiet: Record<string, string>
): string | null =>
  findKey(chi_tiet, [
    (_, nk) => nk.includes("mo_ta"),
    (_, nk) => nk.includes("mo ta quy trinh"),
    (_, nk) => nk === "ghi_chu" || nk.includes("ghi_chu"),
    (_, nk) => nk.includes("quy_trinh"),
    (_, nk) => nk.includes("mota"),
    (_, nk) => nk.includes("mo_ta_quy_trinh"),
    (_, nk) => nk.includes("process"),
    (_, nk) => nk.includes("description"),
  ]);

/** Cột dự kiến triển khai — thường là `col_4` khi export CSV */
export const getDuKienChiTietKey = (
  chi_tiet: Record<string, string>
): string | null =>
  findKey(chi_tiet, [
    (_, nk) => nk.includes("du_kien") || nk.includes("du kien"),
    (k) => k === "col_4",
  ]);

/** Cột link tài liệu 2 — thường `col_7` */
export const getTaiLieu2FieldKey = (
  chi_tiet: Record<string, string>
): string | null =>
  findKey(chi_tiet, [
    (k) => k === "col_7",
    (_, nk) => nk.includes("link") || nk.includes("url"),
  ]);

export const isMoTaFieldKey = (
  key: string,
  chi_tiet: Record<string, string>
): boolean => key === getMoTaFieldKey(chi_tiet);

export const isDuKienFieldKey = (
  key: string,
  chi_tiet: Record<string, string>
): boolean => key === getDuKienChiTietKey(chi_tiet);

export const isDoiTuongFieldKey = (key: string): boolean => {
  const nk = normalize(key);
  return nk.includes("doi_tuong") || nk.includes("oi_tuong") || key === "col_6";
};

export const isToanTrinhFieldKey = (key: string): boolean => {
  const nk = normalize(key);
  return nk.includes("toan_trinh") || key === "col_3";
};

export const isMotPhanFieldKey = (key: string): boolean => {
  const nk = normalize(key);
  return nk.includes("mot_phan") || key === "col_3";
};

const firstUrlFromValue = (value: string): string | null => {
  const v = value?.trim() ?? "";
  if (!v) return null;
  if (URL_ONLY_REGEX.test(v)) return v.replace(/[.,;:)\]]*$/, "");
  const links = extractMediaLinks(v);
  return (
    links.find((m) => m.type !== "image" || !m.isPng)?.url ?? links[0]?.url ?? null
  );
};

/** URL trong ô mô tả quy trình — Tài liệu 1 */
export const getTaiLieu1Urls = (
  chi_tiet: Record<string, string>
): string[] => {
  const moTaKey = getMoTaFieldKey(chi_tiet);
  if (!moTaKey) return [];

  const raw = chi_tiet[moTaKey]?.trim() ?? "";
  if (!raw) return [];

  const urls = extractMediaLinks(raw)
    .map((m) => m.url);

  return [...new Set(urls)];
};

export const getTaiLieu1Url = (
  chi_tiet: Record<string, string>
): string | null => getTaiLieu1Urls(chi_tiet)[0] ?? null;

/** URL cột phụ `col_7` — Tài liệu 2 */
export const getTaiLieu2Url = (
  chi_tiet: Record<string, string>
): string | null => {
  const key = getTaiLieu2FieldKey(chi_tiet);
  if (!key) return null;
  return firstUrlFromValue(chi_tiet[key] ?? "");
};

/** Văn bản mô tả (bỏ URL đã tách preview riêng) */
export const getMoTaTextOnly = (chi_tiet: Record<string, string>): string => {
  const moTaKey = getMoTaFieldKey(chi_tiet);
  const raw = moTaKey ? (chi_tiet[moTaKey] ?? "").trim() : "";
  if (!raw) return "";

  let text = raw;
  for (const url of getTaiLieu1Urls(chi_tiet)) {
    if (text.includes(url)) text = text.replace(url, "").trim();
  }

  return cleanTextRemoveUrls(text) || (getTaiLieu1Urls(chi_tiet).length ? "" : raw);
};

export const getDocumentLinkUrls = (
  chi_tiet: Record<string, string>
): string[] => {
  const urls = [...getTaiLieu1Urls(chi_tiet), getTaiLieu2Url(chi_tiet)].filter(
    (u): u is string => !!u
  );
  return [...new Set(urls)];
};

/** Ẩn cột chỉ chứa link — đã hiển thị ở mô tả / dự kiến */
export const isLinkOnlyField = (
  key: string,
  value: string,
  chi_tiet?: Record<string, string>
): boolean => {
  if (chi_tiet && key === getTaiLieu2FieldKey(chi_tiet)) return true;

  const k = key.toLowerCase();
  if (k.includes("mo_ta") || k === "ghi_chu") return false;

  const v = value?.trim() ?? "";
  if (!v) return false;

  if (URL_ONLY_REGEX.test(v)) return true;

  if (k.startsWith("col_") || k.includes("link") || k.includes("url")) {
    const withoutUrls = cleanTextRemoveUrls(v);
    const media = extractMediaLinks(v);
    return media.length > 0 && withoutUrls.length < 30;
  }

  return false;
};
