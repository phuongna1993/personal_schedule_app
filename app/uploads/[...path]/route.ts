import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { DuongDanKhongHopLe, resolveUploadPath } from "@/lib/resolveUploadPath";

/**
 * AD-3 ngoại lệ 1 / AD-4 — Route Handler CHỈ-ĐỌC (GET-only) phục vụ lại ảnh
 * Món ăn/Nguyên liệu đã lưu dưới `app-data/uploads/`. Vì `app-data/` nằm
 * NGOÀI `public/` (AD-6), Next.js không thể phục vụ các file này tĩnh — đây
 * là cách duy nhất trình duyệt lấy lại được nội dung ảnh.
 *
 * KHÔNG phải một cổng ghi dữ liệu song song với Server Actions (AD-3) — chỉ
 * có `GET` ở đây, không `POST`/`PUT`/`DELETE`, chỉ đọc file theo đường dẫn đã
 * lưu qua `resolveUploadPath()` (cùng hàm mà `app/thuc-don/actions.ts` dùng
 * để ghi), không tự nối chuỗi đường dẫn riêng.
 */

const KIEU_NOI_DUNG_THEO_DUOI: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: doanDuongDan } = await params;
  const duongDanTuongDoi = doanDuongDan.join("/");

  let duongDanTuyetDoi: string;
  try {
    duongDanTuyetDoi = resolveUploadPath(duongDanTuongDoi);
  } catch (loi) {
    if (loi instanceof DuongDanKhongHopLe) {
      return new NextResponse(null, { status: 404 });
    }
    throw loi;
  }

  let noiDung: Buffer;
  try {
    noiDung = await fs.readFile(duongDanTuyetDoi);
  } catch {
    // Không phân biệt "không tồn tại" với các lỗi đọc file khác ở đây — cả
    // hai đều trả 404 chung, không lộ chi tiết hệ thống file ra response.
    return new NextResponse(null, { status: 404 });
  }

  const duoi = path.extname(duongDanTuyetDoi).toLowerCase();
  const kieuNoiDung = KIEU_NOI_DUNG_THEO_DUOI[duoi] ?? "application/octet-stream";

  // `Buffer` (Node) không tự gán được vào `BodyInit` dưới TypeScript strict
  // mới (khác biệt `ArrayBuffer`/`SharedArrayBuffer` trong kiểu generic của
  // `ArrayBufferView`) — ép kiểu, `Response` ở runtime chấp nhận `Buffer`
  // bình thường (nó là một `Uint8Array`).
  return new NextResponse(noiDung as unknown as BodyInit, {
    headers: {
      "Content-Type": kieuNoiDung,
      // Tên file là `crypto.randomUUID()` (Design Notes) — nội dung của một
      // đường dẫn không bao giờ đổi, nên cache dài hạn là an toàn.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
