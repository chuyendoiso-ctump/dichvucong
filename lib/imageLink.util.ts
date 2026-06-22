/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extract Google Drive file ID from various URL formats
 * Supports: share links, edit links, preview links
 */
export const extractGoogleDriveId = (url: string): string | null => {
  if (!url) return null;

  // Format: https://drive.google.com/file/d/{id}/view
  const match1 = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match1) {
    console.log(`[extractGoogleDriveId] Format /d/ found: ${match1[1]}`);
    return match1[1];
  }

  // Format: https://drive.google.com/open?id={id}
  const match2 = url.match(/id=([a-zA-Z0-9-_]+)/);
  if (match2) {
    console.log(`[extractGoogleDriveId] Format id= found: ${match2[1]}`);
    return match2[1];
  }

  console.warn(`[extractGoogleDriveId] No ID found in URL:`, url);
  return null;
};

/**
 * Convert Google Drive / Docs link to iframe preview URL
 */
export const getGoogleDriveEmbedUrl = (url: string): string | null => {
  const id = extractGoogleDriveId(url);
  if (!id) return null;

  if (url.includes("docs.google.com/document")) {
    return `https://docs.google.com/document/d/${id}/preview`;
  }
  if (url.includes("docs.google.com/spreadsheets")) {
    return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  }
  if (url.includes("docs.google.com/presentation")) {
    return `https://docs.google.com/presentation/d/${id}/embed`;
  }
  if (url.includes("docs.google.com/forms")) {
    return `https://docs.google.com/forms/d/${id}/viewform?embedded=true`;
  }

  return `https://drive.google.com/file/d/${id}/preview`;
};

export type MediaRenderType = "embed" | "image" | "link" | "file-search";

export interface MediaItemInfo {
  url: string;
  label?: string;
  renderType: MediaRenderType;
  embedUrl?: string;
  filename?: string;
}

export interface RichContentSegment {
  type: "text" | "media";
  content?: string;
  media?: MediaItemInfo;
}

const DOC_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf"];

export const isPdfUrl = (url: string): boolean =>
  /\.pdf(\?|#|$)/i.test(url);

export const isOfficeDocUrl = (url: string): boolean =>
  DOC_EXTENSIONS.some((ext) => url.toLowerCase().includes(ext));

export const getMediaItemInfo = (url: string, label?: string): MediaItemInfo => {
  const cleanUrl = url.replace(/[.,;:)\]]*$/, "").trim();
  const gDriveEmbed = isGoogleDriveLink(cleanUrl)
    ? getGoogleDriveEmbedUrl(cleanUrl)
    : null;

  if (gDriveEmbed) {
    return {
      url: cleanUrl,
      label,
      renderType: "embed",
      embedUrl: gDriveEmbed,
    };
  }

  if (isPdfUrl(cleanUrl) || isOfficeDocUrl(cleanUrl)) {
    return {
      url: cleanUrl,
      label,
      renderType: "embed",
      embedUrl: cleanUrl,
    };
  }

  if (isImageUrl(cleanUrl)) {
    return {
      url: cleanUrl,
      label,
      renderType: "image",
      embedUrl: cleanUrl,
    };
  }

  return {
    url: cleanUrl,
    label: label || cleanUrl,
    renderType: "link",
  };
};


/**
 * Parse cell text into ordered text + media segments (preserves original layout)
 */
export const parseRichContent = (text: string): RichContentSegment[] => {
  if (!text?.trim()) return [];

  const segments: RichContentSegment[] = [];
  const seenMedia = new Set<string>();
  const combinedRegex =
    /\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s<>"']+/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textPart = text.slice(lastIndex, match.index);
      if (textPart.trim()) {
        segments.push({ type: "text", content: textPart });
      }
    }

    const isMarkdown = match[0].startsWith("[");
    const label = isMarkdown ? match[1] : undefined;
    const url = (isMarkdown ? match[2] : match[0]).replace(/[.,;:)\]]*$/, "");

    if (url && !seenMedia.has(url)) {
      seenMedia.add(url);
      segments.push({
        type: "media",
        media: getMediaItemInfo(url, label),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const tail = text.slice(lastIndex);
    if (tail.trim()) {
      segments.push({ type: "text", content: tail });
    }
  }

  return segments;
};

/**
 * Check if URL is an image
 */
export const isImageUrl = (url: string): boolean => {
  if (!url) return false;

  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
  const lowerUrl = url.toLowerCase();

  return imageExtensions.some((ext) => lowerUrl.includes(ext));
};

/**
 * Check if URL is a Google Drive link
 */
export const isGoogleDriveLink = (url: string): boolean => {
  if (!url) return false;
  return (
    url.includes("drive.google.com") ||
    url.includes("docs.google.com")
  );
};

/**
 * Extract image/media links from text
 * Detects:
 * - Markdown links [text](url) - prioritized
 * - Direct image URLs (http://, https://)
 * - Google Drive links
 * - Multiple links separated by any delimiter
 */
export const extractMediaLinks = (
  text: string
): { type: "image" | "drive" | "url"; url: string; displayUrl: string; isPng?: boolean }[] => {
  if (!text) return [];

  const links: { type: "image" | "drive" | "url"; url: string; displayUrl: string; isPng?: boolean }[] = [];
  const seenUrls = new Set<string>();

  console.log("[extractMediaLinks] Processing text:", text.substring(0, 100) + "...");

  // ===== STEP 0: Extract PNG filenames - separate from URLs =====
  // Match PNG filenames: non-space chars + .png (allows parentheses, numbers, etc.)
  const pngFilenameRegex = /[\w\d\-_.() %À-ỹ]+\.png/gi;
  const pngMatches = text.match(pngFilenameRegex) || [];
  
  for (const filename of pngMatches) {
    if (seenUrls.has(filename)) continue;
    
    console.log(`  [PNG Filename] Found: "${filename}"`);
    
    // Store PNG filename - will show as placeholder card, click to search Drive
    // Use special marker to identify as PNG placeholder
    links.push({
      type: "image",
      url: `https://drive.google.com/drive/search?q="${filename}"`, // Search Drive URL
      displayUrl: `PNG_PLACEHOLDER:${filename}`, // Special marker for PNG placeholder
      isPng: true,
    });
    console.log(`    → Added as IMAGE (PNG filename placeholder)`);
    seenUrls.add(filename);
  }

  // ===== STEP 1: Extract markdown links [text](url) - PRIORITY =====
  const markdownRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let markdownMatch;
  let markdownCount = 0;
  
  while ((markdownMatch = markdownRegex.exec(text)) !== null) {
    markdownCount++;
    const linkText = markdownMatch[1];
    let url = markdownMatch[2];

    console.log(`  [Markdown ${markdownCount}] Text: "${linkText}" | URL: "${url}"`);

    // Remove trailing punctuation that's not part of URL
    url = url.replace(/[.,;:)\]]*$/, "");
    console.log(`    → After cleanup: "${url}"`);

    // Skip empty URL
    if (!url || url.trim() === "") {
      console.log(`    → Skipped (empty)`);
      continue;
    }

    // Skip if already added
    if (seenUrls.has(url)) {
      console.log(`    → Skipped (duplicate)`);
      continue;
    }
    seenUrls.add(url);

    const linkTextLower = linkText.toLowerCase();
    const urlLower = url.toLowerCase();
    const isPng = /\.png(\?|$)/i.test(url);
    const isGDrive = isGoogleDriveLink(url);

    console.log(`    → isPng: ${isPng}, isGDrive: ${isGDrive}, matches:`, {
      "drive.google.com": url.includes("drive.google.com"),
      "docs.google.com": url.includes("docs.google.com"),
    });

    // ===== PRIORITY 1: PNG (show as image, whether Drive or standalone) =====
    if (isPng) {
      if (isGDrive) {
        // PNG from Google Drive - show preview as image
        const embedUrl = getGoogleDriveEmbedUrl(url);
        if (embedUrl) {
          links.push({
            type: "image",
            url,
            displayUrl: embedUrl,
            isPng: true,
          });
          console.log(`    → Added as IMAGE (PNG from Drive, preview)`);
          continue;
        }
      } else {
        // PNG standalone
        links.push({
          type: "image",
          url,
          displayUrl: url,
          isPng: true,
        });
        console.log(`    → Added as IMAGE (PNG standalone)`);
        continue;
      }
    }
    
    // ===== PRIORITY 2: Google Drive → show as image preview (PNG or document) =====
    if (isGDrive) {
      const embedUrl = getGoogleDriveEmbedUrl(url);
      if (embedUrl) {
        links.push({
          type: "image",
          url,
          displayUrl: embedUrl,
          isPng: false,
        });
        console.log(`    → Added as IMAGE (Google Drive preview)`);
        continue;
      }
    }
    
    // ===== PRIORITY 3: Regular image URL =====
    if (isImageUrl(url)) {
      links.push({
        type: "image",
        url,
        displayUrl: url,
        isPng: false,
      });
      console.log(`    → Added as IMAGE`);
      continue;
    }
    
    // ===== FALLBACK: Generic link =====
    links.push({
      type: "url",
      url,
      displayUrl: url,
      isPng: false,
    });
    console.log(`    → Added as URL`);
  }

  console.log(`[extractMediaLinks] Found ${markdownCount} markdown links, added ${links.length}`);

  // ===== STEP 2: Extract direct URLs (http:// or https://) =====
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  const matches = text.match(urlRegex) || [];

  console.log(`[extractMediaLinks] Direct URL regex found ${matches.length} URLs`);

  for (let url of matches) {
    // Remove trailing punctuation that's not part of URL
    url = url.replace(/[.,;:)\]]*$/, "");

    // Skip empty URL
    if (!url || url.trim() === "") continue;

    // Skip if already seen from markdown links
    if (seenUrls.has(url)) {
      console.log(`  [Direct URL] Skipped (already processed): ${url.substring(0, 50)}...`);
      continue;
    }
    seenUrls.add(url);

    const urlLower = url.toLowerCase();
    const isPng = urlLower.includes(".png");
    const isGDrive = isGoogleDriveLink(url);

    console.log(`  [Direct URL] ${url.substring(0, 50)}... | isPng: ${isPng}, isGDrive: ${isGDrive}`);

    // ===== PRIORITY 1: PNG (show as image, whether Drive or standalone) =====
    if (isPng) {
      if (isGDrive) {
        // PNG from Google Drive - show preview as image
        const embedUrl = getGoogleDriveEmbedUrl(url);
        if (embedUrl) {
          links.push({
            type: "image",
            url,
            displayUrl: embedUrl,
            isPng: true,
          });
          console.log(`    → Added as IMAGE (PNG from Drive, preview)`);
          continue;
        }
      } else {
        // PNG standalone
        links.push({
          type: "image",
          url,
          displayUrl: url,
          isPng: true,
        });
        console.log(`    → Added as IMAGE (PNG standalone)`);
        continue;
      }
    }
    
    // ===== PRIORITY 2: Google Drive → show as image preview (PNG or document) =====
    if (isGDrive) {
      const embedUrl = getGoogleDriveEmbedUrl(url);
      if (embedUrl) {
        links.push({
          type: "image",
          url,
          displayUrl: embedUrl,
          isPng: false,
        });
        console.log(`    → Added as IMAGE (Google Drive preview)`);
        continue;
      }
    }
    
    // ===== PRIORITY 3: Regular image URL =====
    if (isImageUrl(url)) {
      links.push({
        type: "image",
        url,
        displayUrl: url,
        isPng: false,
      });
      console.log(`    → Added as IMAGE`);
      continue;
    }
    
    // ===== FALLBACK: Generic link =====
    links.push({
      type: "url",
      url,
      displayUrl: url,
      isPng: false,
    });
    console.log(`    → Added as URL`);
  }

  console.log(`[extractMediaLinks] Total extracted: ${links.length}`, links);
  return links;
};

/**
 * Get the first media link from text
 * Returns the displayable URL
 */
export const getFirstMediaLink = (
  text: string
): { type: "image" | "drive" | "url"; url: string; displayUrl: string } | null => {
  const links = extractMediaLinks(text);
  return links.length > 0 ? links[0] : null;
};

/**
 * Format text with media links extracted
 * Removes URLs from the text for cleaner display
 */
export const cleanTextRemoveUrls = (text: string): string => {
  if (!text) return "";

  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const hasRichMedia = (text: string): boolean =>
  parseRichContent(text).some((s) => s.type === "media");
