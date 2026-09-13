"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { type KetQua, thanhCong, thatBai } from "@/lib/ketQua";
import { layMocNgayVN } from "@/lib/ngayVn";
import {
  type BuoiHocDaGhi,
  dinhDangBuoiHoc,
  laKyNang,
  type KyNangEnum,
} from "./model";

/**
 * AD-3 — Server Actions là cổng GHI dữ liệu duy nhất của module Học tập.
 * Không có route handler `app/api/**` nào cho CRUD này.
 *
 * Action trả về đúng một hình dạng chung (xem `lib/ketQua.ts`):
 *   { ok: true, data } | { ok: false, error: { code, message, field? } }
 *
 * Kể cả khi Prisma ném lỗi (DB bị khoá, đầy đĩa...): action KHÔNG bao giờ
 * reject, mà trả về `LOI_HE_THONG` để UI hiện được thông báo thay vì chết
 * lặng (mirror `app/chi-tieu/actions.ts`'s `boiCanhGhi()`).
 */

const DUONG_DAN_MAN_HINH = "/hoc-tap";

/** Giới hạn trên của `Int` trong Prisma (32-bit có dấu) — chặn ở biên ứng
 * dụng trước khi một giá trị vượt cỡ chạm tầng Prisma/SQLite. Đây là một hard
 * overflow guard, KHÔNG phải một "thời lượng buổi học thực tế" tự đặt ra
 * (Boundaries — mirror `SO_TIEN_TOI_DA`, `app/chi-tieu/actions.ts:38`). */
const THOI_LUONG_TOI_DA = 2_147_483_647;

/** Giới hạn độ dài nội dung — chặn sớm, cùng lý do với `THOI_LUONG_TOI_DA`
 * (mirror `DO_DAI_GHI_CHU_TOI_DA`, `app/chi-tieu/actions.ts`). */
const DO_DAI_NOI_DUNG_TOI_DA = 500;

function lamMoiManHinh(): void {
  revalidatePath(DUONG_DAN_MAN_HINH);
}

async function boiCanhGhi<T>(
  chay: () => Promise<KetQua<T>>,
): Promise<KetQua<T>> {
  try {
    return await chay();
  } catch (loi) {
    console.error("[hoc-tap] lỗi ghi dữ liệu:", loi);
    return thatBai("LOI_HE_THONG", "Không lưu được, thử lại.");
  }
}

type DuLieuBuoiHoc = {
  kyNang: string;
  noiDung: string;
  thoiLuongPhut: number;
};

type BuoiHocDaKiemTra = {
  kyNang: KyNangEnum;
  noiDung: string;
  thoiLuongPhut: number;
};

/**
 * Kiểm tra dữ liệu một Buổi học trước khi ghi (mirror `kiemTraGiaoDich()`,
 * `app/chi-tieu/actions.ts`).
 *
 * Tham số nhận `unknown`: Server Action là một endpoint công khai, kiểu
 * TypeScript bị xoá sạch ở runtime nên payload có thể là bất cứ thứ gì.
 */
function kiemTraBuoiHoc(duLieu: unknown): KetQua<BuoiHocDaKiemTra> {
  if (
    duLieu === null ||
    typeof duLieu !== "object" ||
    Array.isArray(duLieu)
  ) {
    return thatBai("DU_LIEU_KHONG_HOP_LE", "Dữ liệu gửi lên không hợp lệ.");
  }

  const tho = duLieu as Partial<DuLieuBuoiHoc>;

  if (!laKyNang(tho.kyNang)) {
    return thatBai(
      "KY_NANG_KHONG_HOP_LE",
      "Kỹ năng phải là Tiếng Anh hoặc Automation Test.",
      "kyNang",
    );
  }

  const noiDung = typeof tho.noiDung === "string" ? tho.noiDung.trim() : "";
  if (noiDung.length === 0) {
    return thatBai(
      "NOI_DUNG_TRONG",
      "Nội dung học không được để trống.",
      "noiDung",
    );
  }
  if (noiDung.length > DO_DAI_NOI_DUNG_TOI_DA) {
    return thatBai(
      "NOI_DUNG_QUA_DAI",
      `Nội dung tối đa ${DO_DAI_NOI_DUNG_TOI_DA} ký tự.`,
      "noiDung",
    );
  }

  if (
    !Number.isInteger(tho.thoiLuongPhut) ||
    (tho.thoiLuongPhut as number) <= 0 ||
    (tho.thoiLuongPhut as number) > THOI_LUONG_TOI_DA
  ) {
    // Không lộ hằng số Int32 ra thông báo cho người dùng cuối — chỉ là một
    // overflow guard nội bộ, không phải một luật nghiệp vụ có ý nghĩa để hiển
    // thị (mirror cách `SO_TIEN_KHONG_HOP_LE` diễn đạt, nhưng ở đây bỏ hẳn
    // con số ra khỏi câu chữ vì "tối đa X phút" dễ bị đọc nhầm thành một giới
    // hạn thời lượng buổi học thực tế).
    return thatBai(
      "THOI_LUONG_KHONG_HOP_LE",
      "Thời lượng không hợp lệ.",
      "thoiLuongPhut",
    );
  }

  return thanhCong({
    kyNang: tho.kyNang,
    noiDung,
    thoiLuongPhut: tho.thoiLuongPhut as number,
  });
}

/**
 * Ghi một Buổi học mới cho MỘT Kỹ năng (CAP-11). `ngay` luôn stamp bằng
 * `layMocNgayVN()` tại thời điểm gọi — không nhận ngày từ client (Boundaries:
 * không có backdating UI). Ghi cho một Kỹ năng không bao giờ đọc/ghi gì
 * thuộc Kỹ năng còn lại — mỗi lần gọi chỉ tạo đúng một hàng `BuoiHoc` độc
 * lập, không có truy vấn nào theo `kyNang` khác trong action này.
 */
export async function ghiBuoiHoc(
  duLieu: unknown,
): Promise<KetQua<BuoiHocDaGhi>> {
  const daKiemTra = kiemTraBuoiHoc(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    const row = await prisma.buoiHoc.create({
      data: {
        kyNang: daKiemTra.data.kyNang,
        noiDung: daKiemTra.data.noiDung,
        thoiLuongPhut: daKiemTra.data.thoiLuongPhut,
        ngay: layMocNgayVN(),
      },
    });

    lamMoiManHinh();
    return thanhCong(dinhDangBuoiHoc(row));
  });
}
