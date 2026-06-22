/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE_URL = "/api";

// 🔥 generic fetcher
const fetcher = async (url: string) => {
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
  return fetcher(`${BASE_URL}/services`);
};