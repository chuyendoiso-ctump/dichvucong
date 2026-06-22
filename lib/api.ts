import { fetchAllData } from "./googleSheet.service";

// 🎯 services API
export const getServices = async () => {
  return fetchAllData();
};