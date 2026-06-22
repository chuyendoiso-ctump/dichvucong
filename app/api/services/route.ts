import { NextResponse } from "next/server";
import { fetchAllData } from "@/lib/googleSheet.service";

export const revalidate = 300; // cache 5 phút

export async function GET() {
  try {
    const raw = await fetchAllData();

const safeRaw = Array.isArray(raw) ? raw.filter(Boolean) : [];

const data = safeRaw
  .filter((d) => !d?.error)
  .map((d) => ({
    don_vi: d?.don_vi ?? "",
    stt: d?.stt ?? "",
    ten_dich_vu: d?.ten_dich_vu ?? "",
    toan_trinh: !!d?.toan_trinh,
    mot_phan: !!d?.mot_phan,
    du_kien: !!d?.du_kien,
    du_kien_value: d?.du_kien_value ?? "",
    completed: d?.completed ?? 0,
    chi_tiet: d?.chi_tiet ?? {},
  }));

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
  
  
}
