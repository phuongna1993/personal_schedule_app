"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { type KetQua, thanhCong, thatBai } from "@/lib/ketQua";
import { tuThamSoNgay } from "@/lib/ngayVn";
import {
  type DanhMuc,
  type GiaoDich,
  laLoaiGiaoDich,
  type LoaiGiaoDich,
} from "./model";

/**
 * AD-3 — Server Actions là cổng GHI dữ liệu duy nhất của module Chi tiêu.
 * Không có route handler `app/api/**` nào cho CRUD này.
 *
 * Mọi action trả về đúng một hình dạng chung (xem `lib/ketQua.ts`):
 *   { ok: true, data } | { ok: false, error: { code, message, field? } }
 *
 * Kể cả khi Prisma ném lỗi (DB bị khoá, đầy đĩa, file DB chưa migrate...):
 * action KHÔNG bao giờ reject, mà trả về `LOI_HE_THONG` để UI hiện được thông
 * báo thay vì chết lặng.
 */

const DUONG_DAN_MAN_HINH = "/chi-tieu";

/** Giới hạn trên của `Int` trong Prisma (32-bit có dấu) — chặn ở biên ứng
 * dụng trước khi một giá trị vượt cỡ chạm tầng Prisma/SQLite và chỉ lộ ra
 * ngoài dưới dạng `LOI_HE_THONG` chung chung, mất luôn lỗi gắn đúng trường. */
const SO_TIEN_TOI_DA = 2_147_483_647;

/** Giới hạn độ dài các trường tự do — chặn sớm, cùng lý do với `SO_TIEN_TOI_DA`. */
const DO_DAI_GHI_CHU_TOI_DA = 200;
const DO_DAI_TEN_DANH_MUC_TOI_DA = 50;

function lamMoiManHinh(): void {
  revalidatePath(DUONG_DAN_MAN_HINH);
}

async function boiCanhGhi<T>(
  chay: () => Promise<KetQua<T>>,
): Promise<KetQua<T>> {
  try {
    return await chay();
  } catch (loi) {
    console.error("[chi-tieu] lỗi ghi dữ liệu:", loi);
    return thatBai("LOI_HE_THONG", "Không lưu được, thử lại.");
  }
}

type DuLieuGiaoDich = {
  loai: string;
  soTien: number;
  /** `yyyy-mm-dd`, cùng dạng `tuThamSoNgay()` chấp nhận. */
  ngay: string;
  ghiChu?: string | null;
  danhMucChiTieuId?: number | null;
};

type GiaoDichDaKiemTra = {
  loai: LoaiGiaoDich;
  soTien: number;
  ngay: Date;
  ghiChu: string | null;
  danhMucChiTieuId: number | null;
};

/**
 * Kiểm tra dữ liệu một Giao dịch trước khi ghi — luật ghi DUY NHẤT, dùng
 * chung cho cả `themGiaoDich` lẫn `suaGiaoDich` (mirror `kiemTraTask()`,
 * `app/lich-trinh/actions.ts:75-112`).
 *
 * `danhMucChiTieuId` bắt buộc khi `loai === "Chi"`, và LUÔN bị ép về `null`
 * khi `loai === "Thu"` — kể cả khi client gửi kèm một id cũ từ lúc form còn
 * đang ở chế độ Chi (Boundaries: "không mã hoá chiều bằng dấu số"; AC:
 * "loai switched Chi->Thu mid-form -> không persist danhMucChiTieuId").
 *
 * Tham số nhận `unknown`: Server Action là một endpoint công khai, kiểu
 * TypeScript bị xoá sạch ở runtime nên payload có thể là bất cứ thứ gì.
 */
function kiemTraGiaoDich(duLieu: unknown): KetQua<GiaoDichDaKiemTra> {
  if (
    duLieu === null ||
    typeof duLieu !== "object" ||
    Array.isArray(duLieu)
  ) {
    return thatBai("DU_LIEU_KHONG_HOP_LE", "Dữ liệu gửi lên không hợp lệ.");
  }

  const tho = duLieu as Partial<DuLieuGiaoDich>;

  if (!laLoaiGiaoDich(tho.loai)) {
    return thatBai(
      "LOAI_KHONG_HOP_LE",
      "Loại giao dịch phải là Chi hoặc Thu.",
      "loai",
    );
  }

  if (
    !Number.isInteger(tho.soTien) ||
    (tho.soTien as number) <= 0 ||
    (tho.soTien as number) > SO_TIEN_TOI_DA
  ) {
    return thatBai(
      "SO_TIEN_KHONG_HOP_LE",
      "Số tiền phải là một số nguyên dương, tối đa 2.147.483.647đ.",
      "soTien",
    );
  }

  const ngay = typeof tho.ngay === "string" ? tuThamSoNgay(tho.ngay) : null;
  if (!ngay) {
    return thatBai("NGAY_KHONG_HOP_LE", "Ngày không hợp lệ.", "ngay");
  }

  const ghiChuTho = typeof tho.ghiChu === "string" ? tho.ghiChu.trim() : "";
  if (ghiChuTho.length > DO_DAI_GHI_CHU_TOI_DA) {
    return thatBai(
      "GHI_CHU_QUA_DAI",
      `Ghi chú tối đa ${DO_DAI_GHI_CHU_TOI_DA} ký tự.`,
      "ghiChu",
    );
  }
  const ghiChu = ghiChuTho.length > 0 ? ghiChuTho : null;

  if (tho.loai === "Thu") {
    return thanhCong({
      loai: tho.loai,
      soTien: tho.soTien as number,
      ngay,
      ghiChu,
      danhMucChiTieuId: null,
    });
  }

  if (
    !Number.isInteger(tho.danhMucChiTieuId) ||
    (tho.danhMucChiTieuId as number) <= 0
  ) {
    return thatBai(
      "DANH_MUC_BAT_BUOC",
      "Chọn một Danh mục cho khoản Chi này.",
      "danhMucChiTieuId",
    );
  }

  return thanhCong({
    loai: tho.loai,
    soTien: tho.soTien as number,
    ngay,
    ghiChu,
    danhMucChiTieuId: tho.danhMucChiTieuId as number,
  });
}

type GiaoDichHangPrisma = {
  id: number;
  loai: string;
  soTien: number;
  ngay: Date;
  ghiChu: string | null;
  danhMucChiTieuId: number | null;
  danhMucChiTieu: { ten: string } | null;
};

function dinhDangGiaoDich(row: GiaoDichHangPrisma): GiaoDich {
  return {
    id: row.id,
    loai: laLoaiGiaoDich(row.loai) ? row.loai : "Chi",
    soTien: row.soTien,
    ngay: row.ngay,
    ghiChu: row.ghiChu,
    danhMucChiTieuId: row.danhMucChiTieuId,
    tenDanhMuc: row.danhMucChiTieu?.ten ?? null,
  };
}

/**
 * Xác nhận Danh mục còn tồn tại trước khi gắn vào một Giao dịch Chi — cho ra
 * lỗi gắn đúng trường (`danhMucChiTieuId`) thay vì để lộ lỗi ràng buộc khoá
 * ngoại trần của Prisma lên UI.
 */
async function xacNhanDanhMucTonTai(id: number): Promise<KetQua<true>> {
  const coDanhMuc = await prisma.danhMucChiTieu.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!coDanhMuc) {
    return thatBai(
      "DANH_MUC_KHONG_TON_TAI",
      "Danh mục này không còn tồn tại.",
      "danhMucChiTieuId",
    );
  }
  return thanhCong(true as const);
}

/** Thêm một Giao dịch mới (Chi hoặc Thu). */
export async function themGiaoDich(duLieu: unknown): Promise<KetQua<GiaoDich>> {
  const daKiemTra = kiemTraGiaoDich(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    if (daKiemTra.data.danhMucChiTieuId !== null) {
      const xacNhan = await xacNhanDanhMucTonTai(
        daKiemTra.data.danhMucChiTieuId,
      );
      if (!xacNhan.ok) return xacNhan;
    }

    const row = await prisma.giaoDich.create({
      data: daKiemTra.data,
      include: { danhMucChiTieu: true },
    });

    lamMoiManHinh();
    return thanhCong(dinhDangGiaoDich(row));
  });
}

/**
 * `true` khi `loi` là lỗi "record to update/delete not found" của Prisma
 * (mã P2025). Duck-typed thay vì `instanceof Prisma.PrismaClientKnownRequestError`
 * để không phải kéo namespace `Prisma` vào chỉ cho một lần kiểm tra mã lỗi.
 */
function laLoiKhongTimThayHang(loi: unknown): boolean {
  return (
    typeof loi === "object" &&
    loi !== null &&
    "code" in loi &&
    (loi as { code: unknown }).code === "P2025"
  );
}

/**
 * Sửa một Giao dịch đã có — cho sửa mọi trường, kể cả đổi chiều Chi/Thu.
 *
 * `GiaoDich.id` không cần scope theo một FK "chủ sở hữu" nào (khác
 * `Task`/`TaskNgay` ở module Lịch trình, vốn phải kèm `mauLichTrinhId`/
 * `lichTrinhNgayId` trong `where` để ép bất biến AD-1 ngay trong câu truy
 * vấn) — nên `update()` bằng khoá chính là đủ và đúng, không cần mẫu
 * `updateMany` + đếm dòng + đọc lại. Dùng thẳng `update()` cũng loại bỏ
 * khoảng hở giữa lúc kiểm tra tồn tại và lúc đọc lại hàng: nếu hàng bị một
 * request khác xoá đúng vào khoảng đó, Prisma ném lỗi P2025 — bắt lại thành
 * `KHONG_TIM_THAY_GIAO_DICH` thay vì để `boiCanhGhi()` nuốt thành
 * `LOI_HE_THONG` chung chung.
 */
export async function suaGiaoDich(
  id: number,
  duLieu: unknown,
): Promise<KetQua<GiaoDich>> {
  if (!Number.isInteger(id)) {
    return thatBai("ID_KHONG_HOP_LE", "Giao dịch không hợp lệ.");
  }

  const daKiemTra = kiemTraGiaoDich(duLieu);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    if (daKiemTra.data.danhMucChiTieuId !== null) {
      const xacNhan = await xacNhanDanhMucTonTai(
        daKiemTra.data.danhMucChiTieuId,
      );
      if (!xacNhan.ok) return xacNhan;
    }

    let row: GiaoDichHangPrisma;
    try {
      row = await prisma.giaoDich.update({
        where: { id },
        data: daKiemTra.data,
        include: { danhMucChiTieu: true },
      });
    } catch (loi) {
      if (laLoiKhongTimThayHang(loi)) {
        return thatBai(
          "KHONG_TIM_THAY_GIAO_DICH",
          "Giao dịch này không còn tồn tại.",
        );
      }
      // Lỗi Prisma khác (khoá, đầy đĩa...) — để `boiCanhGhi()` bắt và trả
      // `LOI_HE_THONG` như mọi lệnh ghi khác.
      throw loi;
    }

    lamMoiManHinh();
    return thanhCong(dinhDangGiaoDich(row));
  });
}

/** Xoá một Giao dịch. Không có bước xác nhận (EXPERIENCE.md). */
export async function xoaGiaoDich(id: number): Promise<KetQua<{ id: number }>> {
  if (!Number.isInteger(id)) {
    return thatBai("ID_KHONG_HOP_LE", "Giao dịch không hợp lệ.");
  }

  return boiCanhGhi(async () => {
    const daXoa = await prisma.giaoDich.deleteMany({ where: { id } });
    if (daXoa.count === 0) {
      return thatBai(
        "KHONG_TIM_THAY_GIAO_DICH",
        "Giao dịch này không còn tồn tại.",
      );
    }

    lamMoiManHinh();
    return thanhCong({ id });
  });
}

type DuLieuDanhMuc = { ten: string };

/**
 * Thêm một Danh mục chi tiêu mới, gọi được ngay giữa lúc đang nhập một Giao
 * dịch Chi (không rời form) — Acceptance: "chưa có Danh mục nào, tạo được
 * inline". Story này chỉ hỗ trợ TẠO — không sửa/xoá/đổi tên (Boundaries).
 */
export async function themDanhMuc(duLieu: unknown): Promise<KetQua<DanhMuc>> {
  if (
    duLieu === null ||
    typeof duLieu !== "object" ||
    Array.isArray(duLieu)
  ) {
    return thatBai("DU_LIEU_KHONG_HOP_LE", "Dữ liệu gửi lên không hợp lệ.");
  }

  const tho = duLieu as Partial<DuLieuDanhMuc>;
  const ten = typeof tho.ten === "string" ? tho.ten.trim() : "";
  if (ten.length === 0) {
    return thatBai("TEN_TRONG", "Tên Danh mục không được để trống.", "ten");
  }
  if (ten.length > DO_DAI_TEN_DANH_MUC_TOI_DA) {
    return thatBai(
      "TEN_QUA_DAI",
      `Tên Danh mục tối đa ${DO_DAI_TEN_DANH_MUC_TOI_DA} ký tự.`,
      "ten",
    );
  }

  return boiCanhGhi(async () => {
    const danhMuc = await prisma.danhMucChiTieu.create({ data: { ten } });

    lamMoiManHinh();
    return thanhCong({ id: danhMuc.id, ten: danhMuc.ten });
  });
}
