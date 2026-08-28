"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { type KetQua, thanhCong, thatBai } from "@/lib/ketQua";
import {
  laMucUuTien,
  laThoiHan,
  type MucUuTien,
  type TaskMau,
} from "./model";

/**
 * AD-3 — Server Actions là cổng GHI dữ liệu duy nhất của module Lịch trình.
 * Không có route handler `app/api/**` nào cho CRUD này.
 *
 * Mọi action trả về đúng một hình dạng chung (xem `lib/ketQua.ts`):
 *   { ok: true, data } | { ok: false, error: { code, message, field? } }
 *
 * Kể cả khi Prisma ném lỗi (DB bị khoá, đầy đĩa, file DB chưa migrate...):
 * action KHÔNG bao giờ reject, mà trả về `LOI_HE_THONG` để UI hiện được thông
 * báo thay vì chết lặng.
 */

const DUONG_DAN_MAN_HINH = "/lich-trinh/mau-lich-trinh";
/** Màn hình Lịch trình hôm nay (Story 2) — revalidate phòng xa, chưa tồn tại. */
const DUONG_DAN_LICH_TRINH = "/lich-trinh";

type DuLieuTask = {
  ten: string;
  thoiHan: string;
  mucUuTien: string;
};

type TaskDaKiemTra = {
  ten: string;
  thoiHan: string;
  mucUuTien: MucUuTien;
};

/** Làm mới mọi màn hình đọc dữ liệu Mẫu lịch trình sau một lệnh ghi. */
function lamMoiManHinh(): void {
  revalidatePath(DUONG_DAN_MAN_HINH);
  revalidatePath(DUONG_DAN_LICH_TRINH);
}

/**
 * Bọc một lệnh ghi Prisma. Server Action chạy trong tiến trình server; một
 * promise bị reject ở đây sẽ đến client dưới dạng lỗi runtime trần, không đi
 * qua được hình dạng `KetQua`. Nên mọi lối ra đều được ép về `KetQua`.
 */
async function boiCanhGhi<T>(
  chay: () => Promise<KetQua<T>>,
): Promise<KetQua<T>> {
  try {
    return await chay();
  } catch (loi) {
    console.error("[lich-trinh] lỗi ghi dữ liệu:", loi);
    return thatBai("LOI_HE_THONG", "Không lưu được, thử lại.");
  }
}

/**
 * Kiểm tra dữ liệu một Task trước khi ghi. Đây là luật ghi duy nhất — cả
 * `themTask` lẫn `suaTask` đều đi qua đây, không có đường vào thứ hai nào có
 * thể ghi theo luật khác (AD-3).
 *
 * Tham số nhận `unknown`: Server Action là một HTTP endpoint công khai, kiểu
 * TypeScript bị xoá sạch ở runtime nên payload có thể là bất cứ thứ gì —
 * `null`, một chuỗi, một mảng. Phải chặn TRƯỚC khi chạm bất kỳ thuộc tính nào.
 */
function kiemTraTask(duLieu: unknown): KetQua<TaskDaKiemTra> {
  if (
    duLieu === null ||
    typeof duLieu !== "object" ||
    Array.isArray(duLieu)
  ) {
    return thatBai("DU_LIEU_KHONG_HOP_LE", "Dữ liệu gửi lên không hợp lệ.");
  }

  const tho = duLieu as Partial<DuLieuTask>;

  const ten = typeof tho.ten === "string" ? tho.ten.trim() : "";
  if (ten.length === 0) {
    return thatBai("TEN_TRONG", "Tên việc không được để trống.", "ten");
  }

  if (!laThoiHan(tho.thoiHan)) {
    return thatBai(
      "THOI_HAN_KHONG_HOP_LE",
      "Thời hạn phải là một khung giờ trong ngày, dạng HH:mm.",
      "thoiHan",
    );
  }

  if (!laMucUuTien(tho.mucUuTien)) {
    return thatBai(
      "MUC_UU_TIEN_KHONG_HOP_LE",
      "Mức ưu tiên phải là Cao, Trung bình hoặc Thấp.",
      "mucUuTien",
    );
  }

  return thanhCong({
    ten,
    thoiHan: tho.thoiHan,
    mucUuTien: tho.mucUuTien,
  });
}

/**
 * Mẫu lịch trình là một singleton cho người dùng cục bộ duy nhất (AD-5): đúng
 * một hàng, `id = 1`, cố định.
 *
 * `upsert` là một lệnh nguyên tử (INSERT ... ON CONFLICT trên khoá chính), nên
 * hai lệnh ghi đầu tiên gần như đồng thời KHÔNG thể tạo ra hai hàng Mẫu. Hàng
 * vẫn được tạo lười, ngay trước lần ghi đầu tiên — đường đọc không bao giờ ghi
 * (xem `queries.ts`).
 */
const ID_MAU_SINGLETON = 1;

async function layIdMauHienHanh(): Promise<number> {
  const mau = await prisma.mauLichTrinh.upsert({
    where: { id: ID_MAU_SINGLETON },
    create: { id: ID_MAU_SINGLETON },
    update: {},
  });
  return mau.id;
}

/** Thêm một Task mới vào Mẫu lịch trình. */
export async function themTask(
  duLieu: DuLieuTask,
): Promise<KetQua<TaskMau>> {
  const daKiemTra = kiemTraTask(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    const mauLichTrinhId = await layIdMauHienHanh();
    const task = await prisma.task.create({
      data: { ...daKiemTra.data, mauLichTrinhId },
    });

    lamMoiManHinh();
    return thanhCong({
      id: task.id,
      ten: task.ten,
      thoiHan: task.thoiHan,
      mucUuTien: daKiemTra.data.mucUuTien,
    });
  });
}

/** Sửa một Task đã có trong Mẫu lịch trình (tên / thời hạn / mức ưu tiên). */
export async function suaTask(
  id: number,
  duLieu: DuLieuTask,
): Promise<KetQua<TaskMau>> {
  if (!Number.isInteger(id)) {
    return thatBai("ID_KHONG_HOP_LE", "Task không hợp lệ.");
  }

  const daKiemTra = kiemTraTask(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    // `where` kèm `mauLichTrinhId`: bất biến "module sở hữu dữ liệu của mình"
    // (AD-1) được chính câu truy vấn ép, không chỉ dựa vào quy ước gọi hàm.
    const mauLichTrinhId = await layIdMauHienHanh();
    const daCap = await prisma.task.updateMany({
      where: { id, mauLichTrinhId },
      data: daKiemTra.data,
    });
    if (daCap.count === 0) {
      return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
    }

    lamMoiManHinh();
    return thanhCong({ id, ...daKiemTra.data });
  });
}

/** Xoá một Task khỏi Mẫu lịch trình. Không có bước xác nhận (EXPERIENCE.md). */
export async function xoaTask(id: number): Promise<KetQua<{ id: number }>> {
  if (!Number.isInteger(id)) {
    return thatBai("ID_KHONG_HOP_LE", "Task không hợp lệ.");
  }

  return boiCanhGhi(async () => {
    const mauLichTrinhId = await layIdMauHienHanh();
    const daXoa = await prisma.task.deleteMany({
      where: { id, mauLichTrinhId },
    });
    if (daXoa.count === 0) {
      return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
    }

    lamMoiManHinh();
    return thanhCong({ id });
  });
}
