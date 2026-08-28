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
 */

const DUONG_DAN_MAN_HINH = "/lich-trinh/mau-lich-trinh";

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

/**
 * Kiểm tra dữ liệu một Task trước khi ghi. Đây là luật ghi duy nhất — cả
 * `themTask` lẫn `suaTask` đều đi qua đây, không có đường vào thứ hai nào có
 * thể ghi theo luật khác (AD-3).
 */
function kiemTraTask(
  duLieu: DuLieuTask,
): KetQua<TaskDaKiemTra> {
  const ten = typeof duLieu.ten === "string" ? duLieu.ten.trim() : "";
  if (ten.length === 0) {
    return thatBai("TEN_TRONG", "Tên việc không được để trống.", "ten");
  }

  if (!laThoiHan(duLieu.thoiHan)) {
    return thatBai(
      "THOI_HAN_KHONG_HOP_LE",
      "Thời hạn phải là một khung giờ trong ngày, dạng HH:mm.",
      "thoiHan",
    );
  }

  if (!laMucUuTien(duLieu.mucUuTien)) {
    return thatBai(
      "MUC_UU_TIEN_KHONG_HOP_LE",
      "Mức ưu tiên phải là Cao, Trung bình hoặc Thấp.",
      "mucUuTien",
    );
  }

  return thanhCong({
    ten,
    thoiHan: duLieu.thoiHan,
    mucUuTien: duLieu.mucUuTien,
  });
}

/**
 * Mẫu lịch trình là một singleton cho người dùng cục bộ duy nhất (AD-5).
 * Hàng được tạo lười, ngay trước lần ghi đầu tiên — đường đọc không bao giờ
 * ghi (xem `queries.ts`).
 */
async function layIdMauHienHanh(): Promise<number> {
  const mau = await prisma.mauLichTrinh.findFirst({ orderBy: { id: "asc" } });
  if (mau) return mau.id;
  const moi = await prisma.mauLichTrinh.create({ data: {} });
  return moi.id;
}

/** Thêm một Task mới vào Mẫu lịch trình. */
export async function themTask(
  duLieu: DuLieuTask,
): Promise<KetQua<TaskMau>> {
  const daKiemTra = kiemTraTask(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  const mauLichTrinhId = await layIdMauHienHanh();
  const task = await prisma.task.create({
    data: { ...daKiemTra.data, mauLichTrinhId },
  });

  revalidatePath(DUONG_DAN_MAN_HINH);
  return thanhCong({
    id: task.id,
    ten: task.ten,
    thoiHan: task.thoiHan,
    mucUuTien: daKiemTra.data.mucUuTien,
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

  const daCap = await prisma.task.updateMany({
    where: { id },
    data: daKiemTra.data,
  });
  if (daCap.count === 0) {
    return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
  }

  revalidatePath(DUONG_DAN_MAN_HINH);
  return thanhCong({ id, ...daKiemTra.data });
}

/** Xoá một Task khỏi Mẫu lịch trình. Không có bước xác nhận (EXPERIENCE.md). */
export async function xoaTask(id: number): Promise<KetQua<{ id: number }>> {
  if (!Number.isInteger(id)) {
    return thatBai("ID_KHONG_HOP_LE", "Task không hợp lệ.");
  }

  const daXoa = await prisma.task.deleteMany({ where: { id } });
  if (daXoa.count === 0) {
    return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
  }

  revalidatePath(DUONG_DAN_MAN_HINH);
  return thanhCong({ id });
}
