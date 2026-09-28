"use server";

import { randomUUID } from "node:crypto";
import { promises as fsPromises } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { type KetQua, thanhCong, thatBai } from "@/lib/ketQua";
import { tuThamSoNgay } from "@/lib/ngayVn";
import { resolveUploadPath } from "@/lib/resolveUploadPath";
import {
  type BuoiEnum,
  KICH_THUOC_ANH_TOI_DA,
  KICH_THUOC_ANH_TOI_DA_MB,
  laBuoi,
  type LoaiAnhHopLe,
  type MonAn,
  type ThucDonSlotBe,
  type ThucDonSlotNguoiLon,
} from "./model";

/**
 * AD-3 — Server Actions là cổng GHI dữ liệu duy nhất của module Thực đơn.
 * Không có route handler `app/api/**` nào cho CRUD Món ăn (ngoại lệ duy nhất
 * của module là route GET-only `app/uploads/[...path]/route.ts`, phục vụ lại
 * ảnh — không phải một cổng ghi).
 *
 * Chữ ký nhận `FormData` (không phải `unknown` như mọi action khác trong app)
 * là độ lệch CÓ CHỦ ĐÍCH duy nhất so với AD-3's convention thường thấy — một
 * `File` gốc không thể băng qua một payload JSON-shaped (Code Map).
 *
 * Kể cả khi Prisma ném lỗi (DB bị khoá, đầy đĩa...): action KHÔNG bao giờ
 * reject, mà trả về `LOI_HE_THONG` để UI hiện được thông báo thay vì chết
 * lặng — cùng `boiCanhGhi()` pattern với `app/chi-tieu/actions.ts`.
 */

const DUONG_DAN_MAN_HINH = "/thuc-don/chon-mon";

const DO_DAI_TEN_MON_TOI_DA = 100;
const DO_DAI_TEN_NGUYEN_LIEU_TOI_DA = 100;

function lamMoiManHinh(): void {
  revalidatePath(DUONG_DAN_MAN_HINH);
}

async function boiCanhGhi<T>(
  chay: () => Promise<KetQua<T>>,
): Promise<KetQua<T>> {
  try {
    return await chay();
  } catch (loi) {
    console.error("[thuc-don] lỗi ghi dữ liệu:", loi);
    return thatBai("LOI_HE_THONG", "Không lưu được, thử lại.");
  }
}

// --------------------------------------------------------------------------
// Ảnh: sniff MIME từ NỘI DUNG file (Design Notes: "MIME sniff on the File,
// not just its name") + ghi xuống đĩa dưới `app-data/uploads/` (AD-4).
// --------------------------------------------------------------------------

const DUOI_THEO_LOAI_ANH: Record<LoaiAnhHopLe, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function laMagicNumberKhop(
  bytes: Uint8Array,
  chuKy: number[],
  viTri = 0,
): boolean {
  if (bytes.length < viTri + chuKy.length) return false;
  return chuKy.every((b, i) => bytes[viTri + i] === b);
}

/**
 * Sniff MIME type từ chính NỘI DUNG file (magic bytes) — không dựa vào
 * `File.type` (do client tự báo, có thể sai hoặc bị giả mạo) lẫn phần mở
 * rộng của tên file. Trả `null` khi không khớp bất kỳ định dạng nào trong
 * `LOAI_ANH_HOP_LE`.
 */
function layLoaiAnhTuNoiDung(bytes: Uint8Array): LoaiAnhHopLe | null {
  if (laMagicNumberKhop(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    laMagicNumberKhop(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }
  if (
    laMagicNumberKhop(bytes, [0x52, 0x49, 0x46, 0x46]) && // "RIFF"
    laMagicNumberKhop(bytes, [0x57, 0x45, 0x42, 0x50], 8) // "WEBP" ở offset 8
  ) {
    return "image/webp";
  }
  return null;
}

/** Một file ảnh đã qua kiểm tra kích thước + MIME sniff, sẵn sàng ghi xuống
 * đĩa — `null` nghĩa là field này không có file nào được chọn (ảnh tuỳ
 * chọn). */
type AnhDaKiemTra = { bytes: Uint8Array; duoi: string } | null;

/**
 * Kiểm tra MỘT file ảnh trước khi ghi — luật DUY NHẤT, dùng chung cho ảnh
 * Món ăn lẫn ảnh từng Nguyên liệu. Không ghi gì xuống đĩa ở đây (Acceptance:
 * "Save rejected... no partial row written") — chỉ đọc bytes để sniff.
 */
async function kiemTraFileAnh(
  file: File | null,
  field: string,
): Promise<KetQua<AnhDaKiemTra>> {
  if (file === null || file.size === 0) return thanhCong(null);

  if (file.size > KICH_THUOC_ANH_TOI_DA) {
    return thatBai(
      "FILE_QUA_LON",
      `Ảnh tối đa ${KICH_THUOC_ANH_TOI_DA_MB}MB.`,
      field,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const loai = layLoaiAnhTuNoiDung(bytes);
  if (loai === null) {
    return thatBai(
      "LOAI_FILE_KHONG_HOP_LE",
      "Chỉ chấp nhận ảnh JPEG, PNG hoặc WEBP.",
      field,
    );
  }

  return thanhCong({ bytes, duoi: DUOI_THEO_LOAI_ANH[loai] });
}

/**
 * Ghi MỘT file ảnh đã kiểm tra xuống `app-data/uploads/<thuMucCon>/`, tên file
 * là `crypto.randomUUID()` + đuôi đã sniff (Design Notes: "decoupled from DB
 * row ids, so no create-then-rename ordering problem"). Trả `null` khi
 * `anh === null` (không có file).
 */
async function ghiFileAnh(
  anh: AnhDaKiemTra,
  thuMucCon: "mon-an" | "nguyen-lieu",
): Promise<string | null> {
  if (anh === null) return null;

  const duongDanTuongDoi = `${thuMucCon}/${randomUUID()}${anh.duoi}`;
  const duongDanTuyetDoi = resolveUploadPath(duongDanTuongDoi);
  await fsPromises.mkdir(path.dirname(duongDanTuyetDoi), { recursive: true });
  await fsPromises.writeFile(duongDanTuyetDoi, anh.bytes);
  return duongDanTuongDoi;
}

// --------------------------------------------------------------------------
// Kiểm tra dữ liệu văn bản — trước khi chạm tới bất kỳ file/Prisma nào.
// --------------------------------------------------------------------------

function kiemTraTenMon(raw: FormDataEntryValue | null): KetQua<string> {
  const ten = typeof raw === "string" ? raw.trim() : "";
  if (ten.length === 0) {
    return thatBai("TEN_TRONG", "Tên món không được để trống.", "ten");
  }
  if (ten.length > DO_DAI_TEN_MON_TOI_DA) {
    return thatBai(
      "TEN_QUA_DAI",
      `Tên món tối đa ${DO_DAI_TEN_MON_TOI_DA} ký tự.`,
      "ten",
    );
  }
  return thanhCong(ten);
}

type HangNguyenLieuTho = {
  /** `null` = hàng MỚI (chưa có trong DB) — dùng cho cả `themMonAn` (luôn
   * `null`) lẫn một hàng vừa thêm giữa lúc sửa một Món ăn đã có. */
  id: number | null;
  ten: string;
  file: File | null;
  /** Người dùng bấm "Xoá ảnh" cho hàng này — chỉ có tác dụng khi KHÔNG chọn
   * file mới (file mới luôn thắng, thay luôn ảnh cũ). */
  xoaAnh: boolean;
};

/** Chặn một form gửi lên một số lượng hàng Nguyên liệu bất thường — vượt mức
 * này sẽ báo lỗi tường minh ở đây thay vì rơi vào lỗi chung chung của
 * `serverActions.bodySizeLimit` khi mỗi hàng còn kèm một file ảnh. */
const SO_NGUYEN_LIEU_TOI_DA = 30;

/**
 * Đọc 3 mảng song song `nguyenLieuId`/`nguyenLieuTen`/`nguyenLieuAnh` từ
 * `FormData` — `NganHangMonAnView.tsx` LUÔN emit đủ 3 field cho mỗi hàng
 * Nguyên liệu (kể cả `nguyenLieuId` rỗng cho hàng mới), giữ 3 mảng cùng độ
 * dài và cùng chỉ số theo đúng thứ tự hàng trên form.
 *
 * Một hàng MỚI (`id` rỗng) có TÊN rỗng và KHÔNG có file bị bỏ qua âm thầm —
 * đây là placeholder rỗng còn thừa lại khi người dùng bấm "+ Thêm nguyên
 * liệu" rồi không điền, KHÔNG phải một Nguyên liệu đã tồn tại. Một hàng đã
 * có `id` (Nguyên liệu ĐÃ TỒN TẠI trong DB) không bao giờ được coi là
 * placeholder rỗng để bỏ qua — xoá một Nguyên liệu đã có phải đi qua đúng
 * một đường: bấm ✕ để gỡ cả hàng khỏi form (khi đó cả 3 field của hàng đó
 * biến mất khỏi FormData, xem `suaMonAn`'s diff theo `idDuocGiu`), không
 * phải xoá trắng ô tên rồi lưu — làm vậy phải báo lỗi `NGUYEN_LIEU_TEN_TRONG`
 * giống hệt trường hợp "tên rỗng nhưng có file", không được âm thầm xoá mất
 * Nguyên liệu đó.
 */
function docHangNguyenLieu(formData: FormData): KetQua<HangNguyenLieuTho[]> {
  const idsRaw = formData.getAll("nguyenLieuId");
  const tenRaw = formData.getAll("nguyenLieuTen");
  const fileRaw = formData.getAll("nguyenLieuAnh");
  // Mảng thứ 4, tuỳ chọn: vắng mặt hẳn = không hàng nào xoá ảnh; có mặt thì
  // phải cùng độ dài như 3 mảng kia.
  const xoaAnhRaw = formData.getAll("nguyenLieuXoaAnh");

  if (
    idsRaw.length !== tenRaw.length ||
    tenRaw.length !== fileRaw.length ||
    (xoaAnhRaw.length !== 0 && xoaAnhRaw.length !== tenRaw.length)
  ) {
    return thatBai(
      "DU_LIEU_KHONG_HOP_LE",
      "Dữ liệu Nguyên liệu gửi lên không hợp lệ.",
    );
  }

  if (tenRaw.length > SO_NGUYEN_LIEU_TOI_DA) {
    return thatBai(
      "QUA_NHIEU_NGUYEN_LIEU",
      `Một món tối đa ${SO_NGUYEN_LIEU_TOI_DA} Nguyên liệu.`,
    );
  }

  const hang: HangNguyenLieuTho[] = [];
  for (let i = 0; i < tenRaw.length; i++) {
    const tenTho = tenRaw[i];
    const ten = typeof tenTho === "string" ? tenTho.trim() : "";
    const fileTho = fileRaw[i];
    const file = fileTho instanceof File && fileTho.size > 0 ? fileTho : null;

    const idTho = idsRaw[i];
    const idStr = typeof idTho === "string" ? idTho.trim() : "";
    const id = idStr.length > 0 ? Number(idStr) : null;
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      return thatBai("NGUYEN_LIEU_KHONG_HOP_LE", "Nguyên liệu không hợp lệ.");
    }

    // Chỉ hàng MỚI (`id === null`) mới được coi là placeholder rỗng bỏ qua
    // được — một hàng đã có `id` mà bị xoá trắng tên là lỗi, không phải tín
    // hiệu "gỡ hàng" (gỡ hàng đi qua việc cả 3 field biến mất khỏi FormData).
    if (id === null && ten.length === 0 && file === null) continue;

    if (ten.length === 0) {
      return thatBai(
        "NGUYEN_LIEU_TEN_TRONG",
        "Tên Nguyên liệu không được để trống.",
        "nguyenLieuTen",
      );
    }
    if (ten.length > DO_DAI_TEN_NGUYEN_LIEU_TOI_DA) {
      return thatBai(
        "NGUYEN_LIEU_TEN_QUA_DAI",
        `Tên Nguyên liệu tối đa ${DO_DAI_TEN_NGUYEN_LIEU_TOI_DA} ký tự.`,
        "nguyenLieuTen",
      );
    }

    hang.push({ id, ten, file, xoaAnh: xoaAnhRaw[i] === "1" });
  }

  return thanhCong(hang);
}

type MonAnHangPrisma = {
  id: number;
  ten: string;
  anh: string | null;
  nguyenLieu: { id: number; ten: string; anh: string | null }[];
};

function dinhDangMonAn(row: MonAnHangPrisma): MonAn {
  return {
    id: row.id,
    ten: row.ten,
    anh: row.anh,
    nguyenLieu: row.nguyenLieu.map((n) => ({ id: n.id, ten: n.ten, anh: n.anh })),
  };
}

/**
 * Kiểm tra phần văn bản (tên món, tên/id từng Nguyên liệu) rồi phần file (MIME
 * sniff + kích thước, ảnh món và ảnh từng Nguyên liệu) — TRƯỚC khi ghi bất kỳ
 * thứ gì. Dùng chung cho `themMonAn`/`suaMonAn`, khác nhau ở bước ghi DB phía
 * sau (create so với update+diff).
 */
async function kiemTraFormMonAn(formData: FormData): Promise<
  KetQua<{
    ten: string;
    hang: HangNguyenLieuTho[];
    anhMon: AnhDaKiemTra;
    anhHang: AnhDaKiemTra[];
  }>
> {
  const tenDaKiemTra = kiemTraTenMon(formData.get("ten"));
  if (!tenDaKiemTra.ok) return tenDaKiemTra;

  const hangDaKiemTra = docHangNguyenLieu(formData);
  if (!hangDaKiemTra.ok) return hangDaKiemTra;

  const fileMonTho = formData.get("anh");
  const fileMon =
    fileMonTho instanceof File && fileMonTho.size > 0 ? fileMonTho : null;
  const anhMonDaKiemTra = await kiemTraFileAnh(fileMon, "anh");
  if (!anhMonDaKiemTra.ok) return anhMonDaKiemTra;

  const anhHang: AnhDaKiemTra[] = [];
  for (const hang of hangDaKiemTra.data) {
    const daKiemTra = await kiemTraFileAnh(hang.file, "nguyenLieuAnh");
    if (!daKiemTra.ok) return daKiemTra;
    anhHang.push(daKiemTra.data);
  }

  return thanhCong({
    ten: tenDaKiemTra.data,
    hang: hangDaKiemTra.data,
    anhMon: anhMonDaKiemTra.data,
    anhHang,
  });
}

/** Thêm một Món ăn mới vào Ngân hàng món ăn (CAP-8). */
export async function themMonAn(formData: FormData): Promise<KetQua<MonAn>> {
  const daKiemTra = await kiemTraFormMonAn(formData);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    const anhMon = await ghiFileAnh(daKiemTra.data.anhMon, "mon-an");

    const nguyenLieuData: { ten: string; anh: string | null }[] = [];
    for (let i = 0; i < daKiemTra.data.hang.length; i++) {
      const anh = await ghiFileAnh(daKiemTra.data.anhHang[i], "nguyen-lieu");
      nguyenLieuData.push({ ten: daKiemTra.data.hang[i].ten, anh });
    }

    const row = await prisma.monAn.create({
      data: {
        ten: daKiemTra.data.ten,
        anh: anhMon,
        nguyenLieu: { create: nguyenLieuData },
      },
      include: { nguyenLieu: { orderBy: { id: "asc" } } },
    });

    lamMoiManHinh();
    return thanhCong(dinhDangMonAn(row));
  });
}

/**
 * Sửa một Món ăn đã có — tên, ảnh món (giữ ảnh cũ nếu không chọn file mới), và
 * toàn bộ danh sách Nguyên liệu (thêm hàng mới, sửa hàng đã có, xoá hàng bị
 * gỡ khỏi form — Acceptance: "Removed NguyenLieu row is deleted, not
 * orphaned; remaining ones unaffected").
 */
export async function suaMonAn(
  id: number,
  formData: FormData,
): Promise<KetQua<MonAn>> {
  if (!Number.isInteger(id)) {
    return thatBai("ID_KHONG_HOP_LE", "Món ăn không hợp lệ.");
  }

  const daKiemTra = await kiemTraFormMonAn(formData);
  if (!daKiemTra.ok) return daKiemTra;

  return boiCanhGhi(async () => {
    const monAnHienTai = await prisma.monAn.findUnique({
      where: { id },
      include: { nguyenLieu: true },
    });
    if (!monAnHienTai) {
      return thatBai("KHONG_TIM_THAY_MON_AN", "Món ăn này không còn tồn tại.");
    }

    // Mọi `nguyenLieuId` gửi lên PHẢI thuộc đúng Món ăn đang sửa — chặn tham
    // chiếu "lạc" sang Nguyên liệu của một Món ăn khác thay vì tin id client
    // gửi lên vô điều kiện (id là một tham chiếu client chọn, không phải một
    // giá trị được phép tự quyết định nó trỏ tới đâu).
    const idHopLe = new Set(monAnHienTai.nguyenLieu.map((n) => n.id));
    for (const hang of daKiemTra.data.hang) {
      if (hang.id !== null && !idHopLe.has(hang.id)) {
        return thatBai("NGUYEN_LIEU_KHONG_HOP_LE", "Nguyên liệu không hợp lệ.");
      }
    }

    const anhCuTheoId = new Map(
      monAnHienTai.nguyenLieu.map((n) => [n.id, n.anh] as const),
    );

    // File mới > cờ "Xoá ảnh" > giữ ảnh cũ. File ảnh cũ trên đĩa không bị
    // xoá — orphan chấp nhận được ở v1, giống `xoaMonAn`.
    const anhMon =
      daKiemTra.data.anhMon !== null
        ? await ghiFileAnh(daKiemTra.data.anhMon, "mon-an")
        : formData.get("xoaAnh") === "1"
          ? null
          : monAnHienTai.anh;

    const idDuocGiu = new Set<number>();
    const capNhat: { id: number; ten: string; anh: string | null }[] = [];
    const taoMoi: { ten: string; anh: string | null }[] = [];

    for (let i = 0; i < daKiemTra.data.hang.length; i++) {
      const hang = daKiemTra.data.hang[i];
      const anhHangTho = daKiemTra.data.anhHang[i];
      const anhMoi =
        anhHangTho !== null ? await ghiFileAnh(anhHangTho, "nguyen-lieu") : null;

      if (hang.id !== null) {
        idDuocGiu.add(hang.id);
        capNhat.push({
          id: hang.id,
          ten: hang.ten,
          anh: anhMoi ?? (hang.xoaAnh ? null : anhCuTheoId.get(hang.id) ?? null),
        });
      } else {
        taoMoi.push({ ten: hang.ten, anh: anhMoi });
      }
    }

    const idCanXoa = monAnHienTai.nguyenLieu
      .map((n) => n.id)
      .filter((nid) => !idDuocGiu.has(nid));

    // Một lệnh `$transaction` duy nhất — hoặc TẤT CẢ thay đổi (tên/ảnh Món
    // ăn, xoá hàng bị gỡ, sửa hàng giữ lại, thêm hàng mới) cùng áp dụng, hoặc
    // không gì cả, tránh một Món ăn nửa-cũ-nửa-mới nếu một bước giữa chừng
    // lỗi — cùng Ý ĐỊNH nguyên tử với `datHanMucNganSach`'s upsert
    // (chi-tieu/actions.ts), dù hình dạng code khác hẳn (một `upsert()` đơn
    // so với một mảng `$transaction([...])` nhiều lệnh ở đây).
    await prisma.$transaction([
      prisma.monAn.update({
        where: { id },
        data: { ten: daKiemTra.data.ten, anh: anhMon },
      }),
      ...(idCanXoa.length > 0
        ? [
            prisma.nguyenLieu.deleteMany({
              where: { id: { in: idCanXoa }, monAnId: id },
            }),
          ]
        : []),
      ...capNhat.map((c) =>
        prisma.nguyenLieu.updateMany({
          where: { id: c.id, monAnId: id },
          data: { ten: c.ten, anh: c.anh },
        }),
      ),
      ...(taoMoi.length > 0
        ? [
            prisma.nguyenLieu.createMany({
              data: taoMoi.map((t) => ({ ...t, monAnId: id })),
            }),
          ]
        : []),
    ]);

    const row = await prisma.monAn.findUniqueOrThrow({
      where: { id },
      include: { nguyenLieu: { orderBy: { id: "asc" } } },
    });

    lamMoiManHinh();
    return thanhCong(dinhDangMonAn(row));
  });
}

/**
 * Xoá một Món ăn. Không có bước xác nhận (EXPERIENCE.md). Các `NguyenLieu`
 * của nó bị xoá cascade ở tầng DB (`onDelete: Cascade`, schema.prisma); các
 * file ảnh đã tải lên (của Món ăn lẫn từng Nguyên liệu) vẫn ở lại trên đĩa —
 * orphan chấp nhận được ở v1 (story's I/O matrix), không có bước dọn dẹp nào
 * ở đây (Never: "no image resizing/processing library").
 */
export async function xoaMonAn(id: number): Promise<KetQua<{ id: number }>> {
  if (!Number.isInteger(id)) {
    return thatBai("ID_KHONG_HOP_LE", "Món ăn không hợp lệ.");
  }

  return boiCanhGhi(async () => {
    const daXoa = await prisma.monAn.deleteMany({ where: { id } });
    if (daXoa.count === 0) {
      return thatBai("KHONG_TIM_THAY_MON_AN", "Món ăn này không còn tồn tại.");
    }

    lamMoiManHinh();
    return thanhCong({ id });
  });
}

// ---------------------------------------------------------------------------
// Thực đơn ngày (Story 7, CAP-9/CAP-10) — hai nhánh Nhóm khẩu phần TÁCH BIỆT
// vật lý hoàn toàn (Structural Seed). Không action nào ở đây đọc/ghi
// GiaoDich/DanhMucChiTieu/NganSach của module Chi tiêu (Boundaries, CAP-9
// success criterion) — mọi thao tác chỉ chạm `ThucDonNguoiLon`/`ThucDonBe`.
// ---------------------------------------------------------------------------

/** Giới hạn độ dài ghi chú điều chỉnh — cùng lý do/cỡ với `GHI_CHU` của
 * `GiaoDich` (`app/chi-tieu/actions.ts`), chặn sớm ở biên ứng dụng. */
const DO_DAI_GHI_CHU_TOI_DA = 200;

/**
 * Kiểm tra tham số `ngay` — nhận `yyyy-mm-dd` (cùng dạng `tuThamSoNgay()`
 * chấp nhận, mirror `kiemTraGiaoDich()`'s xử lý `ngay`,
 * `app/chi-tieu/actions.ts:120-123`) thay vì nhận thẳng một `Date` — tránh
 * phụ thuộc vào việc RSC serialize `Date` xuyên qua biên Server Action.
 */
function kiemTraNgayThamSo(giaTri: unknown): KetQua<Date> {
  const ngay = typeof giaTri === "string" ? tuThamSoNgay(giaTri) : null;
  if (!ngay) {
    return thatBai("NGAY_KHONG_HOP_LE", "Ngày không hợp lệ.", "ngay");
  }
  return thanhCong(ngay);
}

function kiemTraBuoiThamSo(giaTri: unknown): KetQua<BuoiEnum> {
  if (!laBuoi(giaTri)) {
    return thatBai("BUOI_KHONG_HOP_LE", "Bữa không hợp lệ.", "buoi");
  }
  return thanhCong(giaTri);
}

function kiemTraMonAnIdThamSo(giaTri: unknown): KetQua<number> {
  if (!Number.isInteger(giaTri) || (giaTri as number) <= 0) {
    return thatBai(
      "MON_AN_KHONG_HOP_LE",
      "Chọn một Món ăn cho bữa này.",
      "monAnId",
    );
  }
  return thanhCong(giaTri as number);
}

/** Chỉ dùng cho nhánh Người lớn — ghi chú LUÔN tuỳ chọn (FR-10). */
function kiemTraGhiChuThamSo(giaTri: unknown): KetQua<string | null> {
  const ghiChuTho = typeof giaTri === "string" ? giaTri.trim() : "";
  if (ghiChuTho.length > DO_DAI_GHI_CHU_TOI_DA) {
    return thatBai(
      "GHI_CHU_QUA_DAI",
      `Ghi chú tối đa ${DO_DAI_GHI_CHU_TOI_DA} ký tự.`,
      "ghiChu",
    );
  }
  return thanhCong(ghiChuTho.length > 0 ? ghiChuTho : null);
}

/**
 * Xác nhận Món ăn còn tồn tại trước khi gán vào một slot — cho ra lỗi gắn
 * đúng trường (`monAnId`) thay vì để lộ lỗi ràng buộc khoá ngoại trần của
 * Prisma lên UI (mirror `xacNhanDanhMucTonTai()`, `app/chi-tieu/actions.ts`).
 */
async function xacNhanMonAnTonTai(id: number): Promise<KetQua<true>> {
  const coMon = await prisma.monAn.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!coMon) {
    return thatBai(
      "MON_AN_KHONG_TON_TAI",
      "Món ăn này không còn tồn tại.",
      "monAnId",
    );
  }
  return thanhCong(true as const);
}

/**
 * Gán/thay Món ăn cho một slot (ngay, buoi) của nhánh "Người lớn & bé 4
 * tuổi", kèm ghi chú điều chỉnh tuỳ chọn (CAP-9/CAP-10). `upsert` trên khoá
 * unique `(ngay, buoi)` là một lệnh nguyên tử — gán lại một slot đã có
 * `monAnId` UPDATE đúng hàng đó, không bao giờ tạo thêm hàng thứ hai
 * (Boundaries: "exactly one Món ăn per slot"), mirror `datHanMucNganSach()`'s
 * upsert (`app/chi-tieu/actions.ts`).
 */
export async function luuThucDonNguoiLon(
  ngay: unknown,
  buoi: unknown,
  monAnId: unknown,
  ghiChu: unknown,
): Promise<KetQua<ThucDonSlotNguoiLon>> {
  const daNgay = kiemTraNgayThamSo(ngay);
  if (!daNgay.ok) return daNgay;
  const daBuoi = kiemTraBuoiThamSo(buoi);
  if (!daBuoi.ok) return daBuoi;
  const daMonAn = kiemTraMonAnIdThamSo(monAnId);
  if (!daMonAn.ok) return daMonAn;
  const daGhiChu = kiemTraGhiChuThamSo(ghiChu);
  if (!daGhiChu.ok) return daGhiChu;

  return boiCanhGhi(async () => {
    const xacNhan = await xacNhanMonAnTonTai(daMonAn.data);
    if (!xacNhan.ok) return xacNhan;

    const row = await prisma.thucDonNguoiLon.upsert({
      where: { ngay_buoi: { ngay: daNgay.data, buoi: daBuoi.data } },
      create: {
        ngay: daNgay.data,
        buoi: daBuoi.data,
        monAnId: daMonAn.data,
        ghiChu: daGhiChu.data,
      },
      update: { monAnId: daMonAn.data, ghiChu: daGhiChu.data },
      include: { monAn: { select: { ten: true } } },
    });

    lamMoiManHinh();
    return thanhCong({
      buoi: daBuoi.data,
      monAnId: row.monAnId,
      tenMon: row.monAn.ten,
      ghiChu: row.ghiChu,
    });
  });
}

/** Gỡ Món ăn khỏi một slot của nhánh "Người lớn & bé 4 tuổi" — slot trở lại
 * "Chưa chọn món". Xoá một slot vốn đã trống là thao tác vô hại — trả thành
 * công thay vì báo lỗi "không tìm thấy" (`deleteMany` không đếm được hàng nào
 * cũng không phải một trạng thái sai). */
export async function xoaThucDonNguoiLon(
  ngay: unknown,
  buoi: unknown,
): Promise<KetQua<{ buoi: BuoiEnum }>> {
  const daNgay = kiemTraNgayThamSo(ngay);
  if (!daNgay.ok) return daNgay;
  const daBuoi = kiemTraBuoiThamSo(buoi);
  if (!daBuoi.ok) return daBuoi;

  return boiCanhGhi(async () => {
    await prisma.thucDonNguoiLon.deleteMany({
      where: { ngay: daNgay.data, buoi: daBuoi.data },
    });

    lamMoiManHinh();
    return thanhCong({ buoi: daBuoi.data });
  });
}

/**
 * Gán/thay Món ăn cho một slot (ngay, buoi) của nhánh "Bé dưới 1 tuổi"
 * (CAP-9) — KHÔNG có tham số `ghiChu` (Structural Seed: cột này không tồn
 * tại ở nhánh Bé). Cùng luật `upsert` nguyên tử như `luuThucDonNguoiLon()`,
 * trên bảng Prisma HOÀN TOÀN RIÊNG (`ThucDonBe`).
 */
export async function luuThucDonBe(
  ngay: unknown,
  buoi: unknown,
  monAnId: unknown,
): Promise<KetQua<ThucDonSlotBe>> {
  const daNgay = kiemTraNgayThamSo(ngay);
  if (!daNgay.ok) return daNgay;
  const daBuoi = kiemTraBuoiThamSo(buoi);
  if (!daBuoi.ok) return daBuoi;
  const daMonAn = kiemTraMonAnIdThamSo(monAnId);
  if (!daMonAn.ok) return daMonAn;

  return boiCanhGhi(async () => {
    const xacNhan = await xacNhanMonAnTonTai(daMonAn.data);
    if (!xacNhan.ok) return xacNhan;

    const row = await prisma.thucDonBe.upsert({
      where: { ngay_buoi: { ngay: daNgay.data, buoi: daBuoi.data } },
      create: { ngay: daNgay.data, buoi: daBuoi.data, monAnId: daMonAn.data },
      update: { monAnId: daMonAn.data },
      include: { monAn: { select: { ten: true } } },
    });

    lamMoiManHinh();
    return thanhCong({
      buoi: daBuoi.data,
      monAnId: row.monAnId,
      tenMon: row.monAn.ten,
    });
  });
}

/** Gỡ Món ăn khỏi một slot của nhánh "Bé dưới 1 tuổi" — cùng luật với
 * `xoaThucDonNguoiLon()` ở trên, trên bảng `ThucDonBe` riêng. */
export async function xoaThucDonBe(
  ngay: unknown,
  buoi: unknown,
): Promise<KetQua<{ buoi: BuoiEnum }>> {
  const daNgay = kiemTraNgayThamSo(ngay);
  if (!daNgay.ok) return daNgay;
  const daBuoi = kiemTraBuoiThamSo(buoi);
  if (!daBuoi.ok) return daBuoi;

  return boiCanhGhi(async () => {
    await prisma.thucDonBe.deleteMany({
      where: { ngay: daNgay.data, buoi: daBuoi.data },
    });

    lamMoiManHinh();
    return thanhCong({ buoi: daBuoi.data });
  });
}
