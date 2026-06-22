const GOOGLE_SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || "";

// 🔥 generic fetcher
const fetcher = async (url: string) => {
  if (!url) {
    console.warn("GOOGLE_SCRIPT_URL is not set.");
    return [];
  }
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Unknown API error");
  }

  return json.data;
};

// 🎯 services API
export const getServices = async () => {
  return fetcher(GOOGLE_SCRIPT_URL);
};