"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { type KetQua, thanhCong, thatBai } from "@/lib/ketQua";
import { layMocNgayVN } from "@/lib/ngayVn";
import {
  laMucUuTien,
  laThoiHan,
  type MucUuTien,
  type TaskMau,
  type TaskNgay,
} from "./model";
import { layMauLichTrinh } from "./queries";

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
/** Màn hình Lịch trình ngày (Story 2). */
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

// ---------------------------------------------------------------------------
// Lịch trình ngày (Story 2) — AD-2: tách vật lý hoàn toàn khỏi MauLichTrinh/
// Task ở trên. Mọi Task ở đây là TaskNgay, một bảng Prisma riêng.
// ---------------------------------------------------------------------------

/**
 * Khởi tạo lười Lịch trình ngày cho HÔM NAY (giờ VN) từ Mẫu lịch trình hiện
 * hành, nếu chưa có. Đây là đúng MỘT nơi tạo hàng `LichTrinhNgay` trong toàn
 * app (AD-3 ngoại lệ 2) — gọi từ đường đọc (`/lich-trinh`'s Server Component),
 * không phải một cổng ghi công khai riêng cho UI bấm.
 *
 * `upsert` là một lệnh nguyên tử trên khoá unique `ngay`, nên hai request gần
 * như đồng thời trong lần render đầu tiên của ngày KHÔNG thể tạo ra hai hàng.
 * Chỉ khi hàng chưa tồn tại mới đọc Mẫu hiện hành để copy giá trị Task vào —
 * copy giá trị, không share hàng/FK với `Task` của Mẫu (AD-2).
 */
export async function taoLichTrinhNgayTuMau(): Promise<KetQua<{ id: number }>> {
  return boiCanhGhi(async () => {
    const moc = layMocNgayVN();

    const daCo = await prisma.lichTrinhNgay.findUnique({
      where: { ngay: moc },
      select: { id: true },
    });
    if (daCo) {
      return thanhCong({ id: daCo.id });
    }

    const mauTasks = await layMauLichTrinh();

    const row = await prisma.lichTrinhNgay.upsert({
      where: { ngay: moc },
      create: {
        ngay: moc,
        tasks: {
          create: mauTasks.map(({ ten, thoiHan, mucUuTien }) => ({
            ten,
            thoiHan,
            mucUuTien,
          })),
        },
      },
      // Nhánh này chỉ chạy khi một request khác vừa thắng cuộc đua tạo hàng
      // giữa lúc `findUnique` ở trên và `upsert` này — không ghi gì thêm.
      update: {},
    });

    lamMoiManHinh();
    return thanhCong({ id: row.id });
  });
}

type DuLieuTaskNgay = DuLieuTask;

/**
 * Thêm một Task vào Lịch trình của MỘT ngày cụ thể (`lichTrinhNgayId`).
 * Không bao giờ viết lên `MauLichTrinh`/`Task` của Mẫu (Boundaries).
 */
export async function themTaskNgay(
  lichTrinhNgayId: number,
  duLieu: DuLieuTaskNgay,
): Promise<KetQua<TaskNgay>> {
  if (!Number.isInteger(lichTrinhNgayId)) {
    return thatBai("ID_KHONG_HOP_LE", "Lịch trình ngày không hợp lệ.");
  }

  const daKiemTra = kiemTraTask(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    const task = await prisma.taskNgay.create({
      data: { ...daKiemTra.data, lichTrinhNgayId },
    });

    lamMoiManHinh();
    return thanhCong({
      id: task.id,
      ten: task.ten,
      thoiHan: task.thoiHan,
      mucUuTien: daKiemTra.data.mucUuTien,
      daXong: task.daXong,
    });
  });
}

/**
 * Sửa tên/thời hạn/mức ưu tiên của một Task trong Lịch trình ngày. Không đổi
 * `daXong` — đó là việc riêng của `danhDauTask`.
 *
 * `where` của `updateMany` kèm cả `id` lẫn `lichTrinhNgayId`: bất biến
 * "ownership-scoped theo ngày" được chính câu truy vấn ép, không chỉ dựa vào
 * quy ước gọi hàm — cùng nguyên tắc AD-1 đã áp cho `suaTask` ở trên.
 */
export async function suaTaskNgay(
  id: number,
  lichTrinhNgayId: number,
  duLieu: DuLieuTaskNgay,
): Promise<KetQua<TaskNgay>> {
  if (!Number.isInteger(id) || !Number.isInteger(lichTrinhNgayId)) {
    return thatBai("ID_KHONG_HOP_LE", "Task không hợp lệ.");
  }

  const daKiemTra = kiemTraTask(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    const daCap = await prisma.taskNgay.updateMany({
      where: { id, lichTrinhNgayId },
      data: daKiemTra.data,
    });
    if (daCap.count === 0) {
      return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
    }

    // `updateMany` không trả hàng đã cập nhật; đọc lại đúng `daXong` hiện tại
    // (action này không đổi trường đó) để trả về đủ hình dạng `TaskNgay`.
    // Vẫn ownership-scoped bằng cả `id` lẫn `lichTrinhNgayId` — cùng bất biến
    // như câu `updateMany` ở trên, không chỉ dựa vào `id` một mình.
    const task = await prisma.taskNgay.findFirst({
      where: { id, lichTrinhNgayId },
    });
    if (!task) {
      return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
    }

    lamMoiManHinh();
    return thanhCong({
      id,
      ten: daKiemTra.data.ten,
      thoiHan: daKiemTra.data.thoiHan,
      mucUuTien: daKiemTra.data.mucUuTien,
      daXong: task.daXong,
    });
  });
}

/** Xoá một Task khỏi Lịch trình ngày. Không có bước xác nhận (EXPERIENCE.md). */
export async function xoaTaskNgay(
  id: number,
  lichTrinhNgayId: number,
): Promise<KetQua<{ id: number }>> {
  if (!Number.isInteger(id) || !Number.isInteger(lichTrinhNgayId)) {
    return thatBai("ID_KHONG_HOP_LE", "Task không hợp lệ.");
  }

  return boiCanhGhi(async () => {
    const daXoa = await prisma.taskNgay.deleteMany({
      where: { id, lichTrinhNgayId },
    });
    if (daXoa.count === 0) {
      return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
    }

    lamMoiManHinh();
    return thanhCong({ id });
  });
}

/**
 * Đảo Đã xong/Chưa xong của một Task trong Lịch trình ngày — một-cú-bấm,
 * không xác nhận (FR-3, EXPERIENCE.md's Interaction Primitives).
 *
 * `updateMany` với `where: { id, lichTrinhNgayId }` là lệnh ghi duy nhất ở
 * đây: ownership-scoped ngay trong câu truy vấn, atomic, không cần đọc trước.
 */
export async function danhDauTask(
  id: number,
  lichTrinhNgayId: number,
  daXong: boolean,
): Promise<KetQua<{ id: number; daXong: boolean }>> {
  if (!Number.isInteger(id) || !Number.isInteger(lichTrinhNgayId)) {
    return thatBai("ID_KHONG_HOP_LE", "Task không hợp lệ.");
  }
  if (typeof daXong !== "boolean") {
    return thatBai("DU_LIEU_KHONG_HOP_LE", "Trạng thái Đã xong không hợp lệ.");
  }

  return boiCanhGhi(async () => {
    const daCap = await prisma.taskNgay.updateMany({
      where: { id, lichTrinhNgayId },
      data: { daXong },
    });
    if (daCap.count === 0) {
      return thatBai("KHONG_TIM_THAY_TASK", "Task này không còn tồn tại.");
    }

    lamMoiManHinh();
    return thanhCong({ id, daXong });
  });
}
