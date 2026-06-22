"use client";

import { getMediaItemInfo } from "@/lib/imageLink.util";

interface DocumentEmbedProps {
  url: string;
  label?: string;
  /** Gọn cho mục mô tả quy trình / dự kiến */
  compact?: boolean;
}

export function DocumentEmbed({ url, label, compact = false }: DocumentEmbedProps) {
  if (!url?.trim()) return null;

  const media = getMediaItemInfo(url, label);
  const title = label || media.label || "Xem tài liệu";

  if (media.renderType === "embed" && media.embedUrl) {
    return (
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <a
          href={media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-blue-50 border-b border-slate-100 transition group"
        >
          <span className="text-xs font-medium text-blue-700 truncate" title={title}>
            📄 {title}
          </span>
          <span className="shrink-0 text-[11px] font-semibold text-blue-600 group-hover:text-blue-800">
            Mở ↗
          </span>
        </a>
        <iframe
          src={media.embedUrl}
          className={`w-full bg-slate-50 ${compact ? "h-44" : "h-72"}`}
          allowFullScreen
          loading="lazy"
          title={title}
        />
      </div>
    );
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
    >
      📄 {title}
      <span className="no-underline">↗</span>
    </a>
  );
}
