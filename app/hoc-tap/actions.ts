"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { type KetQua, thanhCong, thatBai } from "@/lib/ketQua";
import { layMocNgayVN } from "@/lib/ngayVn";
import {
  type BaiTestDanhGiaDaGhi,
  type BuoiHocDaGhi,
  dinhDangBuoiHoc,
  laKyNang,
  type KyNangEnum,
} from "./model";
import { damBaoMocDaKhoiTao, layMocHienTai } from "./queries";

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

/** Giới hạn độ dài nội dung — chặn sớm, một hard overflow guard nội bộ
 * (mirror `DO_DAI_GHI_CHU_TOI_DA`, `app/chi-tieu/actions.ts`). */
const DO_DAI_NOI_DUNG_TOI_DA = 500;

/** Giới hạn độ dài Điểm số — chặn sớm, cùng lý do với `DO_DAI_NOI_DUNG_TOI_DA`
 * (Điểm số là free-form text, định dạng để ngỏ — ARCHITECTURE-SPINE.md's
 * Deferred — nhưng vẫn cần một hard overflow guard). */
const DO_DAI_DIEM_SO_TOI_DA = 100;

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
  /** `"HH:mm"` — giờ bắt đầu/kết thúc buổi học, cùng ngày (Story 13). Không
   * còn nhận `thoiLuongPhut` từ client: server luôn tự tính từ hai mốc giờ
   * này, không bao giờ tin một thời lượng đã tính sẵn từ phía client. */
  gioBatDau: string;
  gioKetThuc: string;
};

type BuoiHocDaKiemTra = {
  kyNang: KyNangEnum;
  noiDung: string;
  thoiLuongPhut: number;
};

/** `"HH:mm"`, 24 giờ — khớp value gốc của `<input type="time">`. */
const REGEX_GIO = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parse một chuỗi `"HH:mm"` thành số phút tính từ 00:00 cùng ngày.
 * Trả `null` cho bất cứ thứ gì không đúng dạng (thiếu/rỗng, không phải
 * chuỗi, giờ/phút sai định dạng) — gọi nơi biên trước khi tính thời lượng,
 * không có wraparound qua nửa đêm (Boundaries: "reject, don't wrap around"). */
function parseGio(gio: unknown): number | null {
  if (typeof gio !== "string") return null;
  const khop = REGEX_GIO.exec(gio);
  if (!khop) return null;
  return Number(khop[1]) * 60 + Number(khop[2]);
}

/**
 * Kiểm tra dữ liệu một Buổi học trước khi ghi (mirror `kiemTraGiaoDich()`,
 * `app/chi-tieu/actions.ts`).
 *
 * Tham số nhận `unknown`: Server Action là một endpoint công khai, kiểu
 * TypeScript bị xoá sạch ở runtime nên payload có thể là bất cứ thứ gì —
 * kể cả một `thoiLuongPhut` client tự tính gửi kèm (Story 13's payload shape
 * mới không có trường này; nó bị bỏ qua hoàn toàn vì `kiemTraBuoiHoc` chỉ
 * đọc `gioBatDau`/`gioKetThuc` rồi tự tính `thoiLuongPhut`, không bao giờ đọc
 * lại một `thoiLuongPhut` gửi kèm).
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

  const batDauPhut = parseGio(tho.gioBatDau);
  if (batDauPhut === null) {
    return thatBai(
      "GIO_BAT_DAU_KHONG_HOP_LE",
      "Giờ bắt đầu không hợp lệ.",
      "gioBatDau",
    );
  }

  const ketThucPhut = parseGio(tho.gioKetThuc);
  if (ketThucPhut === null) {
    return thatBai(
      "GIO_KET_THUC_KHONG_HOP_LE",
      "Giờ kết thúc không hợp lệ.",
      "gioKetThuc",
    );
  }

  // Chỉ cùng-ngày — không có overnight wraparound (Boundaries: "reject equal
  // or earlier end times ... don't attempt wraparound"). `<=` chặn cả trường
  // hợp bằng nhau lẫn trường hợp sẽ cần vắt qua nửa đêm (vd 23:00 -> 00:30).
  if (ketThucPhut <= batDauPhut) {
    return thatBai(
      "GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU",
      "Giờ kết thúc phải sau giờ bắt đầu (không hỗ trợ buổi học qua đêm).",
      "gioKetThuc",
    );
  }

  return thanhCong({
    kyNang: tho.kyNang,
    noiDung,
    thoiLuongPhut: ketThucPhut - batDauPhut,
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

// ---------------------------------------------------------------------------
// Lộ trình & Mốc (CAP-13, Story 10)
// ---------------------------------------------------------------------------

/** Kiểm tra `mocId` thô từ client trước khi chạm Prisma (mirror
 * `kiemTraBuoiHoc`'s "unknown ở biên" nguyên tắc). */
function kiemTraMocId(giaTri: unknown): KetQua<number> {
  if (typeof giaTri !== "number" || !Number.isInteger(giaTri)) {
    return thatBai("MOC_KHONG_HOP_LE", "Mốc không hợp lệ.");
  }
  return thanhCong(giaTri);
}

/**
 * Đánh dấu Hoàn thành một Mốc — MỘT Server Action DUY NHẤT cho CẢ HAI Kỹ
 * năng (AD-2, story's Design Notes): tự kiểm tra gate Bài test đánh giá bên
 * trong dựa trên `Moc.kyNang`, không tách hai action riêng theo Kỹ năng,
 * không chỉ dựa vào UI ẩn/hiện nút.
 *
 * Từ chối (không ghi gì, trả `KetQua` lỗi thay vì reject):
 *  - `mocId` không tồn tại -> `MOC_KHONG_TON_TAI`;
 *  - `mocId` đã Hoàn thành rồi -> `MOC_DA_HOAN_THANH` (không có "undo Hoàn
 *    thành" — AD-2/EXPERIENCE.md's append-only edit pattern);
 *  - `mocId` không phải kết quả `layMocHienTai()` cho đúng `kyNang` của nó
 *    (Mốc tương lai hoặc đã hoàn thành) -> `MOC_KHONG_PHAI_VI_TRI_HIEN_TAI`
 *    (không hoàn thành ngoài thứ tự);
 *  - CHỈ khi `kyNang === "TiengAnh"`: chưa có hàng `BaiTestDanhGia` nào gắn
 *    với Mốc đó -> `CHUA_CO_DIEM_BAI_TEST`. Automation Test không bao giờ
 *    chạm nhánh kiểm tra này.
 */
export async function hoanThanhMoc(
  mocId: unknown,
): Promise<KetQua<{ mocId: number }>> {
  const daKiemTraId = kiemTraMocId(mocId);
  if (!daKiemTraId.ok) return daKiemTraId;
  const id = daKiemTraId.data;

  return boiCanhGhi(async () => {
    await damBaoMocDaKhoiTao();

    const moc = await prisma.moc.findUnique({ where: { id } });
    if (!moc) {
      return thatBai("MOC_KHONG_TON_TAI", "Mốc này không tồn tại.");
    }
    if (moc.ngayHoanThanh !== null) {
      return thatBai(
        "MOC_DA_HOAN_THANH",
        "Mốc này đã được đánh dấu Hoàn thành.",
      );
    }
    if (!laKyNang(moc.kyNang)) {
      return thatBai("MOC_KHONG_HOP_LE", "Mốc không hợp lệ.");
    }

    const mocHienTai = await layMocHienTai(moc.kyNang);
    if (!mocHienTai || mocHienTai.id !== id) {
      return thatBai(
        "MOC_KHONG_PHAI_VI_TRI_HIEN_TAI",
        "Chỉ có thể hoàn thành Mốc đang ở vị trí hiện tại trên Lộ trình.",
      );
    }

    if (moc.kyNang === "TiengAnh") {
      const soLuong = await prisma.baiTestDanhGia.count({
        where: { mocId: id },
      });
      if (soLuong === 0) {
        return thatBai(
          "CHUA_CO_DIEM_BAI_TEST",
          "Cần nhập Điểm số Bài test đánh giá trước khi hoàn thành Mốc này.",
        );
      }
    }

    // `updateMany` với `where: { id, ngayHoanThanh: null }` thay vì `update`:
    // lệnh ghi CUỐI CÙNG này mới thực sự nguyên tử chống double-completion —
    // check `moc.ngayHoanThanh !== null` ở trên chỉ chặn được đường thường,
    // không chặn được hai lượt gọi gần như đồng thời (ví dụ double-click
    // trước khi `disabled` kịp bật) cùng vượt qua check đó trước khi lượt
    // nào ghi. Điều kiện `ngayHoanThanh: null` ngay trong `where` khiến lệnh
    // thứ hai không khớp hàng nào nữa (`count === 0`) nếu lệnh thứ nhất đã
    // ghi trước — không cần `$transaction` đầy đủ cho một thay đổi nhỏ này.
    const daCapNhat = await prisma.moc.updateMany({
      where: { id, ngayHoanThanh: null },
      data: { ngayHoanThanh: layMocNgayVN() },
    });
    if (daCapNhat.count === 0) {
      return thatBai(
        "MOC_DA_HOAN_THANH",
        "Mốc này đã được đánh dấu Hoàn thành.",
      );
    }

    lamMoiManHinh();
    return thanhCong({ mocId: id });
  });
}

/**
 * Ghi một Điểm số Bài test đánh giá cho Mốc HIỆN TẠI của Tiếng Anh. Action
 * này KHÔNG nhận tham số `kyNang` — luôn tự resolve tới Mốc hiện tại của
 * Tiếng Anh (Boundaries: "the action itself always resolves against Tiếng
 * Anh's current Mốc, never accepts a kyNang param"); không dùng ở cột
 * Automation Test.
 *
 * Cho phép gọi nhiều lần trước khi Hoàn thành (retake history) — mỗi lần
 * tạo một hàng `BaiTestDanhGia` mới, không ghi đè hàng trước (I/O matrix:
 * "Two Điểm số entered for the same Mốc").
 */
export async function ghiDiemBaiTest(
  diemSo: unknown,
): Promise<KetQua<BaiTestDanhGiaDaGhi>> {
  const gia = typeof diemSo === "string" ? diemSo.trim() : "";
  if (gia.length === 0) {
    return thatBai("DIEM_SO_TRONG", "Điểm số không được để trống.", "diemSo");
  }
  if (gia.length > DO_DAI_DIEM_SO_TOI_DA) {
    return thatBai(
      "DIEM_SO_QUA_DAI",
      `Điểm số tối đa ${DO_DAI_DIEM_SO_TOI_DA} ký tự.`,
      "diemSo",
    );
  }

  return boiCanhGhi(async () => {
    const mocHienTai = await layMocHienTai("TiengAnh");
    if (!mocHienTai) {
      return thatBai(
        "KHONG_CO_MOC_HIEN_TAI",
        "Lộ trình Tiếng Anh đã hoàn thành, không còn Mốc nào để nhập Điểm số.",
      );
    }

    const row = await prisma.baiTestDanhGia.create({
      data: {
        mocId: mocHienTai.id,
        diemSo: gia,
        ngay: layMocNgayVN(),
      },
    });

    lamMoiManHinh();
    return thanhCong({
      id: row.id,
      mocId: row.mocId,
      diemSo: row.diemSo,
      ngay: row.ngay,
    });
  });
}
