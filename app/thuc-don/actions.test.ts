import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho các Server Action của module Thực đơn.
 *
 * Trọng tâm: I/O & Edge-Case Matrix của story —
 *  - Add dish, no photos: `anh: null` trên cả món lẫn từng Nguyên liệu.
 *  - Add dish with photos: file được "ghi" (mock `node:fs`) dưới đúng thư
 *    mục con (`mon-an/`/`nguyen-lieu/`), DB chỉ lưu đường dẫn tương đối.
 *  - Upload non-image: bị chặn TRƯỚC khi ghi bất kỳ thứ gì (không file, không
 *    hàng DB nào được tạo) — `LOAI_FILE_KHONG_HOP_LE`.
 *  - Edit dish, remove a nguyên liệu: hàng bị gỡ khỏi form -> DELETE, hàng
 *    còn lại không đổi.
 *  - Delete: `prisma.monAn.deleteMany` xoá đúng hàng; không có lệnh xoá file
 *    nào được gọi (ảnh mồ côi chấp nhận được ở v1).
 *
 * Prisma, `next/cache`, `node:fs` (ghi file), và `node:crypto` (tên file
 * random) đều được mock để test chạy thuần in-memory, không đụng vào
 * `app-data/` thật.
 */

const { prismaMock, revalidatePathMock, fsMock, randomUUIDMock } = vi.hoisted(
  () => ({
    prismaMock: {
      monAn: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        deleteMany: vi.fn(),
      },
      nguyenLieu: {
        deleteMany: vi.fn(),
        updateMany: vi.fn(),
        createMany: vi.fn(),
      },
      thucDonNguoiLon: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      thucDonBe: {
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    revalidatePathMock: vi.fn(),
    fsMock: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
    },
    randomUUIDMock: vi.fn(),
  }),
);

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("node:fs", () => ({ promises: fsMock }));
vi.mock("node:crypto", () => ({ randomUUID: randomUUIDMock }));

const {
  themMonAn,
  suaMonAn,
  xoaMonAn,
  luuThucDonNguoiLon,
  xoaThucDonNguoiLon,
  luuThucDonBe,
  xoaThucDonBe,
} = await import("./actions");

// ---------------------------------------------------------------------------
// Helper dựng File với đúng magic bytes cho từng định dạng — `layLoaiAnhTu
// NoiDung()` sniff nội dung, không tin `File.type` do client tự báo.
// ---------------------------------------------------------------------------

function bytesJpeg(size = 20): Uint8Array {
  const b = new Uint8Array(size);
  b.set([0xff, 0xd8, 0xff]);
  return b;
}

function bytesPng(size = 20): Uint8Array {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
}

function bytesWebp(size = 20): Uint8Array {
  const b = new Uint8Array(size);
  b.set([0x52, 0x49, 0x46, 0x46]); // "RIFF"
  b.set([0x57, 0x45, 0x42, 0x50], 8); // "WEBP" ở offset 8
  return b;
}

function bytesKhongPhaiAnh(size = 20): Uint8Array {
  return new Uint8Array(size); // toàn số 0 — không khớp magic number nào
}

function fileAnh(bytes: Uint8Array, ten = "anh.jpg"): File {
  // `Uint8Array<ArrayBufferLike>` (từ `new Uint8Array(size)`) không tự gán
  // được vào `BlobPart` dưới TypeScript strict mới — ép kiểu, giá trị runtime
  // vẫn đúng (Web File API chấp nhận mọi `ArrayBufferView`).
  return new File([bytes as unknown as BlobPart], ten);
}

/** Placeholder khớp đúng những gì trình duyệt gửi lên cho một
 * `<input type="file">` chưa chọn gì: một `File` rỗng, `size === 0`. */
function fileRong(): File {
  return new File([], "");
}

function formDataMonAn({
  ten,
  anh,
  xoaAnh,
  hang = [],
}: {
  ten?: string;
  anh?: File | null;
  xoaAnh?: boolean;
  hang?: { id?: number | null; ten: string; file?: File | null; xoaAnh?: boolean }[];
}): FormData {
  const fd = new FormData();
  if (ten !== undefined) fd.set("ten", ten);
  fd.set("anh", anh ?? fileRong());
  if (xoaAnh !== undefined) fd.set("xoaAnh", xoaAnh ? "1" : "");
  // Mảng `nguyenLieuXoaAnh` chỉ emit khi test có dùng tới (như UI thật: mọi
  // hàng đều có) — vắng mặt hẳn thì server coi như không hàng nào xoá ảnh.
  const coCoXoaAnh = hang.some((h) => h.xoaAnh !== undefined);
  for (const h of hang) {
    fd.append("nguyenLieuId", h.id != null ? String(h.id) : "");
    fd.append("nguyenLieuTen", h.ten);
    fd.append("nguyenLieuAnh", h.file ?? fileRong());
    if (coCoXoaAnh) fd.append("nguyenLieuXoaAnh", h.xoaAnh ? "1" : "");
  }
  return fd;
}

function hangMonAnPrisma(
  overrides: Partial<{
    id: number;
    ten: string;
    anh: string | null;
    nguyenLieu: { id: number; ten: string; anh: string | null }[];
  }> = {},
) {
  return {
    id: 1,
    ten: "Bò xào thập cẩm",
    anh: null,
    nguyenLieu: [],
    ...overrides,
  };
}

let demUuid = 0;

beforeEach(() => {
  vi.clearAllMocks();
  demUuid = 0;
  randomUUIDMock.mockImplementation(() => `uuid-${++demUuid}`);
  fsMock.mkdir.mockResolvedValue(undefined);
  fsMock.writeFile.mockResolvedValue(undefined);

  prismaMock.$transaction.mockImplementation(
    async (ops: Promise<unknown>[]) => Promise.all(ops),
  );
  prismaMock.monAn.create.mockImplementation(
    async ({
      data,
    }: {
      data: { ten: string; anh: string | null; nguyenLieu?: { create: { ten: string; anh: string | null }[] } };
    }) => {
      const nguyenLieu = (data.nguyenLieu?.create ?? []).map((n, i) => ({
        id: 100 + i,
        ten: n.ten,
        anh: n.anh,
      }));
      return hangMonAnPrisma({ ten: data.ten, anh: data.anh, nguyenLieu });
    },
  );
  prismaMock.monAn.update.mockResolvedValue(undefined);
  prismaMock.nguyenLieu.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.nguyenLieu.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.nguyenLieu.createMany.mockResolvedValue({ count: 0 });
  prismaMock.monAn.deleteMany.mockResolvedValue({ count: 1 });
});

describe("themMonAn", () => {
  it("chặn tên trống, không tạo gì", async () => {
    const ketQua = await themMonAn(formDataMonAn({ ten: "" }));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
    expect(ketQua.error.field).toBe("ten");
    expect(prismaMock.monAn.create).not.toHaveBeenCalled();
    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });

  it("coi tên chỉ có khoảng trắng là rỗng", async () => {
    const ketQua = await themMonAn(formDataMonAn({ ten: "   " }));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
  });

  it("chặn tên vượt quá 100 ký tự", async () => {
    const ketQua = await themMonAn(formDataMonAn({ ten: "a".repeat(101) }));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_QUA_DAI");
    expect(ketQua.error.field).toBe("ten");
  });

  it("Add dish, no photos: thêm món hợp lệ với 2 Nguyên liệu, không ảnh -> anh: null trên cả món lẫn từng Nguyên liệu", async () => {
    const ketQua = await themMonAn(
      formDataMonAn({
        ten: "Bò xào thập cẩm",
        hang: [{ ten: "thịt bò" }, { ten: "hành tây" }],
      }),
    );

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.anh).toBeNull();
    expect(ketQua.data.nguyenLieu).toEqual([
      { id: 100, ten: "thịt bò", anh: null },
      { id: 101, ten: "hành tây", anh: null },
    ]);
    expect(fsMock.writeFile).not.toHaveBeenCalled();
    expect(prismaMock.monAn.create).toHaveBeenCalledWith({
      data: {
        ten: "Bò xào thập cẩm",
        anh: null,
        nguyenLieu: {
          create: [
            { ten: "thịt bò", anh: null },
            { ten: "hành tây", anh: null },
          ],
        },
      },
      include: { nguyenLieu: { orderBy: { id: "asc" } } },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/thuc-don/chon-mon");
  });

  it("thêm món không có Nguyên liệu nào -> vẫn hợp lệ, nguyenLieu rỗng", async () => {
    const ketQua = await themMonAn(formDataMonAn({ ten: "Món đơn giản" }));

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.nguyenLieu).toEqual([]);
    expect(prismaMock.monAn.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nguyenLieu: { create: [] } }) }),
    );
  });

  it("hàng Nguyên liệu để trống hoàn toàn (không tên, không ảnh) bị bỏ qua âm thầm", async () => {
    const ketQua = await themMonAn(
      formDataMonAn({
        ten: "Món có hàng thừa",
        hang: [{ ten: "thịt bò" }, { ten: "" }],
      }),
    );

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.nguyenLieu).toEqual([{ id: 100, ten: "thịt bò", anh: null }]);
  });

  it("hàng Nguyên liệu tên rỗng nhưng CÓ ảnh -> lỗi, không tạo gì", async () => {
    const ketQua = await themMonAn(
      formDataMonAn({
        ten: "Món lỗi",
        hang: [{ ten: "", file: fileAnh(bytesJpeg()) }],
      }),
    );

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGUYEN_LIEU_TEN_TRONG");
    expect(ketQua.error.field).toBe("nguyenLieuTen");
    expect(prismaMock.monAn.create).not.toHaveBeenCalled();
    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });

  it("chặn tên Nguyên liệu vượt quá 100 ký tự", async () => {
    const ketQua = await themMonAn(
      formDataMonAn({ ten: "Món", hang: [{ ten: "a".repeat(101) }] }),
    );

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGUYEN_LIEU_TEN_QUA_DAI");
    expect(ketQua.error.field).toBe("nguyenLieuTen");
  });

  it("Add dish with photos: ảnh món + ảnh một Nguyên liệu được ghi xuống đúng thư mục con, DB lưu đường dẫn tương đối", async () => {
    const ketQua = await themMonAn(
      formDataMonAn({
        ten: "Bò sốt vang",
        anh: fileAnh(bytesJpeg(), "mon.jpg"),
        hang: [
          { ten: "thịt bò", file: fileAnh(bytesPng(), "thit-bo.png") },
          { ten: "khoai tây" },
        ],
      }),
    );

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.anh).toBe("mon-an/uuid-1.jpg");
    expect(ketQua.data.nguyenLieu).toEqual([
      { id: 100, ten: "thịt bò", anh: "nguyen-lieu/uuid-2.png" },
      { id: 101, ten: "khoai tây", anh: null },
    ]);

    expect(fsMock.writeFile).toHaveBeenCalledTimes(2);
    expect(fsMock.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(`${path()}mon-an${path()}uuid-1.jpg`),
      expect.any(Uint8Array),
    );
    expect(fsMock.mkdir).toHaveBeenCalled();
  });

  it("chấp nhận ảnh WEBP hợp lệ (sniff theo nội dung, không theo tên file)", async () => {
    const fileGiaMao = fileAnh(bytesWebp(), "khong-lien-quan.txt");
    const ketQua = await themMonAn(
      formDataMonAn({ ten: "Món webp", anh: fileGiaMao }),
    );

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.anh).toBe("mon-an/uuid-1.webp");
  });

  it("Upload a non-image file: bị từ chối (MIME sniff nội dung), field-level error, không ghi file/DB nào", async () => {
    const ketQua = await themMonAn(
      formDataMonAn({
        ten: "Món lỗi ảnh",
        anh: fileAnh(bytesKhongPhaiAnh(), "gia-mao.jpg"),
      }),
    );

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOAI_FILE_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("anh");
    expect(fsMock.writeFile).not.toHaveBeenCalled();
    expect(prismaMock.monAn.create).not.toHaveBeenCalled();
  });

  it("chặn ảnh Nguyên liệu không đúng định dạng", async () => {
    const ketQua = await themMonAn(
      formDataMonAn({
        ten: "Món",
        hang: [{ ten: "thịt bò", file: fileAnh(bytesKhongPhaiAnh()) }],
      }),
    );

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOAI_FILE_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("nguyenLieuAnh");
    expect(prismaMock.monAn.create).not.toHaveBeenCalled();
  });

  it("chặn ảnh vượt quá 5MB, chấp nhận đúng 5MB", async () => {
    const NAM_MB = 5 * 1024 * 1024;
    const quaLon = fileAnh(bytesJpeg(NAM_MB + 1));
    const dungMuc = fileAnh(bytesJpeg(NAM_MB));

    const ketQuaQuaLon = await themMonAn(
      formDataMonAn({ ten: "Món", anh: quaLon }),
    );
    expect(ketQuaQuaLon.ok).toBe(false);
    if (ketQuaQuaLon.ok) throw new Error("unreachable");
    expect(ketQuaQuaLon.error.code).toBe("FILE_QUA_LON");
    expect(ketQuaQuaLon.error.field).toBe("anh");

    const ketQuaDungMuc = await themMonAn(
      formDataMonAn({ ten: "Món", anh: dungMuc }),
    );
    expect(ketQuaDungMuc.ok).toBe(true);
  });

  it("cùng biên 5MB áp dụng cho ảnh của TỪNG Nguyên liệu (đi qua chung kiemTraFileAnh())", async () => {
    const NAM_MB = 5 * 1024 * 1024;
    const quaLon = fileAnh(bytesJpeg(NAM_MB + 1));
    const dungMuc = fileAnh(bytesJpeg(NAM_MB));

    const ketQuaQuaLon = await themMonAn(
      formDataMonAn({
        ten: "Món",
        hang: [{ ten: "thịt bò", file: quaLon }],
      }),
    );
    expect(ketQuaQuaLon.ok).toBe(false);
    if (ketQuaQuaLon.ok) throw new Error("unreachable");
    expect(ketQuaQuaLon.error.code).toBe("FILE_QUA_LON");
    expect(ketQuaQuaLon.error.field).toBe("nguyenLieuAnh");
    expect(prismaMock.monAn.create).not.toHaveBeenCalled();

    const ketQuaDungMuc = await themMonAn(
      formDataMonAn({
        ten: "Món",
        hang: [{ ten: "thịt bò", file: dungMuc }],
      }),
    );
    expect(ketQuaDungMuc.ok).toBe(true);
  });

  it("dữ liệu Nguyên liệu lệch độ dài giữa 3 mảng song song -> DU_LIEU_KHONG_HOP_LE", async () => {
    const fd = new FormData();
    fd.set("ten", "Món");
    fd.set("anh", fileRong());
    fd.append("nguyenLieuTen", "thịt bò");
    fd.append("nguyenLieuAnh", fileRong());
    // Thiếu hẳn "nguyenLieuId" tương ứng -> 3 mảng song song lệch độ dài.

    const ketQua = await themMonAn(fd);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
  });

  it("chặn quá 30 hàng Nguyên liệu -> QUA_NHIEU_NGUYEN_LIEU, không tạo gì, chấp nhận đúng 30 hàng", async () => {
    const hang31 = Array.from({ length: 31 }, (_, i) => ({ ten: `nguyên liệu ${i}` }));
    const ketQuaQuaNhieu = await themMonAn(
      formDataMonAn({ ten: "Món", hang: hang31 }),
    );

    expect(ketQuaQuaNhieu.ok).toBe(false);
    if (ketQuaQuaNhieu.ok) throw new Error("unreachable");
    expect(ketQuaQuaNhieu.error.code).toBe("QUA_NHIEU_NGUYEN_LIEU");
    expect(prismaMock.monAn.create).not.toHaveBeenCalled();
    expect(fsMock.writeFile).not.toHaveBeenCalled();

    const hang30 = Array.from({ length: 30 }, (_, i) => ({ ten: `nguyên liệu ${i}` }));
    const ketQuaDungMuc = await themMonAn(
      formDataMonAn({ ten: "Món", hang: hang30 }),
    );
    expect(ketQuaDungMuc.ok).toBe(true);
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.monAn.create.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await themMonAn(formDataMonAn({ ten: "Món" }));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("suaMonAn", () => {
  it("chặn id không phải số nguyên", async () => {
    const ketQua = await suaMonAn(Number.NaN, formDataMonAn({ ten: "Món" }));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("ID_KHONG_HOP_LE");
    expect(prismaMock.monAn.findUnique).not.toHaveBeenCalled();
  });

  it("báo lỗi khi Món ăn không còn tồn tại", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(null);

    const ketQua = await suaMonAn(1, formDataMonAn({ ten: "Món" }));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_MON_AN");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("sửa tên, GIỮ ảnh món cũ khi không chọn file mới", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({ anh: "mon-an/anh-cu.jpg", nguyenLieu: [] }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(
      hangMonAnPrisma({ ten: "Tên mới", anh: "mon-an/anh-cu.jpg" }),
    );

    const ketQua = await suaMonAn(1, formDataMonAn({ ten: "Tên mới" }));

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.anh).toBe("mon-an/anh-cu.jpg");
    expect(prismaMock.monAn.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ten: "Tên mới", anh: "mon-an/anh-cu.jpg" },
    });
    expect(fsMock.writeFile).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/thuc-don/chon-mon");
  });

  it("sửa: chọn ảnh món MỚI -> thay ảnh cũ, ghi file mới", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({ anh: "mon-an/anh-cu.jpg", nguyenLieu: [] }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(
      hangMonAnPrisma({ anh: "mon-an/uuid-1.jpg" }),
    );

    await suaMonAn(
      1,
      formDataMonAn({ ten: "Món", anh: fileAnh(bytesJpeg()) }),
    );

    expect(prismaMock.monAn.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ten: "Món", anh: "mon-an/uuid-1.jpg" },
    });
    expect(fsMock.writeFile).toHaveBeenCalledTimes(1);
  });

  it("Edit dish, remove a nguyên liệu: hàng bị gỡ khỏi form bị XOÁ, hàng còn lại chỉ update", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({
        nguyenLieu: [
          { id: 10, ten: "thịt bò", anh: null },
          { id: 11, ten: "hành tây", anh: null },
        ],
      }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(
      hangMonAnPrisma({ nguyenLieu: [{ id: 10, ten: "thịt bò", anh: null }] }),
    );

    // Chỉ gửi lại hàng id=10 -> hàng id=11 coi như bị gỡ khỏi form.
    const ketQua = await suaMonAn(
      1,
      formDataMonAn({ ten: "Bò xào", hang: [{ id: 10, ten: "thịt bò" }] }),
    );

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.nguyenLieu.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: [11] }, monAnId: 1 },
    });
    expect(prismaMock.nguyenLieu.updateMany).toHaveBeenCalledWith({
      where: { id: 10, monAnId: 1 },
      data: { ten: "thịt bò", anh: null },
    });
    expect(prismaMock.nguyenLieu.createMany).not.toHaveBeenCalled();
  });

  it("sửa: xoá trắng tên một hàng ĐÃ CÓ id (không bấm ✕ để gỡ hàng) -> lỗi NGUYEN_LIEU_TEN_TRONG, KHÔNG âm thầm xoá hàng đó", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({
        nguyenLieu: [{ id: 10, ten: "thịt bò", anh: null }],
      }),
    );

    // Hàng id=10 vẫn còn trong form (vẫn gửi `nguyenLieuId=10`), chỉ có TÊN
    // bị xoá trắng và không chọn ảnh mới — khác hẳn việc bấm ✕ để gỡ cả hàng
    // (lúc đó cả 3 field của hàng mới biến mất khỏi FormData).
    const ketQua = await suaMonAn(
      1,
      formDataMonAn({ ten: "Bò xào", hang: [{ id: 10, ten: "" }] }),
    );

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGUYEN_LIEU_TEN_TRONG");
    expect(ketQua.error.field).toBe("nguyenLieuTen");
    expect(prismaMock.nguyenLieu.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("sửa: giữ nguyên toàn bộ Nguyên liệu khi hàng còn lại KHÔNG bị gỡ -> không gọi deleteMany", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({ nguyenLieu: [{ id: 10, ten: "thịt bò", anh: null }] }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(hangMonAnPrisma());

    await suaMonAn(1, formDataMonAn({ ten: "Món", hang: [{ id: 10, ten: "thịt bò" }] }));

    expect(prismaMock.nguyenLieu.deleteMany).not.toHaveBeenCalled();
  });

  it("sửa: thêm một Nguyên liệu MỚI giữa lúc sửa -> createMany, không đụng hàng cũ", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({ nguyenLieu: [{ id: 10, ten: "thịt bò", anh: null }] }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(hangMonAnPrisma());

    await suaMonAn(
      1,
      formDataMonAn({
        ten: "Món",
        hang: [{ id: 10, ten: "thịt bò" }, { ten: "rau mới" }],
      }),
    );

    expect(prismaMock.nguyenLieu.createMany).toHaveBeenCalledWith({
      data: [{ ten: "rau mới", anh: null, monAnId: 1 }],
    });
    expect(prismaMock.nguyenLieu.deleteMany).not.toHaveBeenCalled();
  });

  it("giữ ảnh Nguyên liệu cũ khi sửa hàng đó mà không chọn ảnh mới", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({
        nguyenLieu: [{ id: 10, ten: "thịt bò", anh: "nguyen-lieu/cu.jpg" }],
      }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(hangMonAnPrisma());

    await suaMonAn(
      1,
      formDataMonAn({ ten: "Món", hang: [{ id: 10, ten: "thịt bò mới tên" }] }),
    );

    expect(prismaMock.nguyenLieu.updateMany).toHaveBeenCalledWith({
      where: { id: 10, monAnId: 1 },
      data: { ten: "thịt bò mới tên", anh: "nguyen-lieu/cu.jpg" },
    });
  });

  it("sửa: bấm 'Xoá ảnh' món (xoaAnh=1, không chọn file mới) -> anh: null, không ghi file", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({ anh: "mon-an/anh-cu.jpg", nguyenLieu: [] }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(hangMonAnPrisma({ anh: null }));

    const ketQua = await suaMonAn(1, formDataMonAn({ ten: "Món", xoaAnh: true }));

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.monAn.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ten: "Món", anh: null },
    });
    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });

  it("sửa: xoaAnh=1 NHƯNG có chọn file mới -> file mới thắng", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({ anh: "mon-an/anh-cu.jpg", nguyenLieu: [] }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(hangMonAnPrisma());

    await suaMonAn(
      1,
      formDataMonAn({ ten: "Món", anh: fileAnh(bytesJpeg()), xoaAnh: true }),
    );

    expect(prismaMock.monAn.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { ten: "Món", anh: "mon-an/uuid-1.jpg" },
    });
  });

  it("sửa: 'Xoá ảnh' một Nguyên liệu -> chỉ hàng đó về anh: null, hàng khác giữ ảnh cũ", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({
        nguyenLieu: [
          { id: 10, ten: "thịt bò", anh: "nguyen-lieu/bo.jpg" },
          { id: 11, ten: "hành tây", anh: "nguyen-lieu/hanh.jpg" },
        ],
      }),
    );
    prismaMock.monAn.findUniqueOrThrow.mockResolvedValue(hangMonAnPrisma());

    await suaMonAn(
      1,
      formDataMonAn({
        ten: "Món",
        hang: [
          { id: 10, ten: "thịt bò", xoaAnh: true },
          { id: 11, ten: "hành tây", xoaAnh: false },
        ],
      }),
    );

    expect(prismaMock.nguyenLieu.updateMany).toHaveBeenCalledWith({
      where: { id: 10, monAnId: 1 },
      data: { ten: "thịt bò", anh: null },
    });
    expect(prismaMock.nguyenLieu.updateMany).toHaveBeenCalledWith({
      where: { id: 11, monAnId: 1 },
      data: { ten: "hành tây", anh: "nguyen-lieu/hanh.jpg" },
    });
  });

  it("mảng nguyenLieuXoaAnh lệch độ dài -> DU_LIEU_KHONG_HOP_LE", async () => {
    const fd = formDataMonAn({
      ten: "Món",
      hang: [{ ten: "a", xoaAnh: false }, { ten: "b", xoaAnh: false }],
    });
    fd.append("nguyenLieuXoaAnh", "");

    const ketQua = await suaMonAn(1, fd);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
  });

  it("chặn nguyenLieuId không thuộc Món ăn đang sửa (id lạc từ Món ăn khác)", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(
      hangMonAnPrisma({ nguyenLieu: [{ id: 10, ten: "thịt bò", anh: null }] }),
    );

    const ketQua = await suaMonAn(
      1,
      formDataMonAn({ ten: "Món", hang: [{ id: 999, ten: "lạ" }] }),
    );

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGUYEN_LIEU_KHONG_HOP_LE");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.monAn.findUnique.mockRejectedValue(new Error("disk I/O error"));

    const ketQua = await suaMonAn(1, formDataMonAn({ ten: "Món" }));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});

describe("xoaMonAn", () => {
  it("Delete a Món ăn: xoá ngay không xác nhận, revalidate, KHÔNG đụng file ảnh nào trên đĩa", async () => {
    const ketQua = await xoaMonAn(1);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.monAn.deleteMany).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/thuc-don/chon-mon");
    expect(fsMock.writeFile).not.toHaveBeenCalled();
  });

  it("báo lỗi khi Món ăn không còn tồn tại", async () => {
    prismaMock.monAn.deleteMany.mockResolvedValue({ count: 0 });

    const ketQua = await xoaMonAn(999);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_MON_AN");
  });

  it("chặn id không phải số nguyên", async () => {
    const ketQua = await xoaMonAn(Number.NaN);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("ID_KHONG_HOP_LE");
    expect(prismaMock.monAn.deleteMany).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.monAn.deleteMany.mockRejectedValue(new Error("disk I/O error"));

    const ketQua = await xoaMonAn(1);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});

/** `path.sep` gián tiếp — tránh import `node:path` chỉ để lấy một ký tự. */
function path(): string {
  return process.platform === "win32" ? "\\" : "/";
}

// ---------------------------------------------------------------------------
// Thực đơn ngày (Story 7, CAP-9/CAP-10) — I/O & Edge-Case Matrix của story.
// ---------------------------------------------------------------------------

describe("luuThucDonNguoiLon", () => {
  it("chặn ngày dị dạng", async () => {
    const ketQua = await luuThucDonNguoiLon("khong-phai-ngay", "Sang", 1, null);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGAY_KHONG_HOP_LE");
    expect(prismaMock.thucDonNguoiLon.upsert).not.toHaveBeenCalled();
  });

  it("chặn bữa không hợp lệ", async () => {
    const ketQua = await luuThucDonNguoiLon("2026-09-12", "Chieu", 1, null);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("BUOI_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("buoi");
  });

  it("chặn monAnId không hợp lệ", async () => {
    const ketQua = await luuThucDonNguoiLon("2026-09-12", "Sang", 0, null);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MON_AN_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("monAnId");
  });

  it("chặn ghi chú vượt quá 200 ký tự", async () => {
    const ketQua = await luuThucDonNguoiLon(
      "2026-09-12",
      "Sang",
      1,
      "a".repeat(201),
    );

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GHI_CHU_QUA_DAI");
    expect(ketQua.error.field).toBe("ghiChu");
    expect(prismaMock.monAn.findUnique).not.toHaveBeenCalled();
  });

  it("chấp nhận ghi chú đúng 200 ký tự (biên trên)", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.thucDonNguoiLon.upsert.mockResolvedValue({
      monAnId: 1,
      ghiChu: "a".repeat(200),
      monAn: { ten: "Bò xào thập cẩm" },
    });

    const ketQua = await luuThucDonNguoiLon(
      "2026-09-12",
      "Sang",
      1,
      "a".repeat(200),
    );

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.ghiChu).toBe("a".repeat(200));
  });

  it("chặn gán một Món ăn không còn tồn tại", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(null);

    const ketQua = await luuThucDonNguoiLon("2026-09-12", "Sang", 999, null);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MON_AN_KHONG_TON_TAI");
    expect(ketQua.error.field).toBe("monAnId");
    expect(prismaMock.thucDonNguoiLon.upsert).not.toHaveBeenCalled();
  });

  it("Assign a dish to an empty slot: upsert đúng khoá (ngay, buoi), trả tên món + ghiChu null khi không nhập", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.thucDonNguoiLon.upsert.mockResolvedValue({
      monAnId: 1,
      ghiChu: null,
      monAn: { ten: "Bò xào thập cẩm" },
    });

    const ketQua = await luuThucDonNguoiLon("2026-09-12", "Trua", 1, "   ");

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toEqual({
      buoi: "Trua",
      monAnId: 1,
      tenMon: "Bò xào thập cẩm",
      ghiChu: null,
    });
    expect(prismaMock.thucDonNguoiLon.upsert).toHaveBeenCalledWith({
      where: { ngay_buoi: { ngay: tuThamSoNgayTest("2026-09-12"), buoi: "Trua" } },
      create: {
        ngay: tuThamSoNgayTest("2026-09-12"),
        buoi: "Trua",
        monAnId: 1,
        ghiChu: null,
      },
      update: { monAnId: 1, ghiChu: null },
      include: { monAn: { select: { ten: true } } },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/thuc-don/chon-mon");
  });

  it("Add a note to a slot: ghi chú có nội dung được trim rồi lưu", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.thucDonNguoiLon.upsert.mockResolvedValue({
      monAnId: 1,
      ghiChu: "Bớt cay",
      monAn: { ten: "Bò xào thập cẩm" },
    });

    const ketQua = await luuThucDonNguoiLon(
      "2026-09-12",
      "Trua",
      1,
      "  Bớt cay  ",
    );

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.ghiChu).toBe("Bớt cay");
    expect(prismaMock.thucDonNguoiLon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ ghiChu: "Bớt cay" }),
        update: expect.objectContaining({ ghiChu: "Bớt cay" }),
      }),
    );
  });

  it("Replace a slot's dish: upsert cùng khoá (ngay, buoi) — không tạo hàng thứ hai", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 2 });
    prismaMock.thucDonNguoiLon.upsert.mockResolvedValue({
      monAnId: 2,
      ghiChu: null,
      monAn: { ten: "Canh chua cá lóc" },
    });

    await luuThucDonNguoiLon("2026-09-12", "Sang", 2, null);

    expect(prismaMock.thucDonNguoiLon.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.thucDonNguoiLon.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ngay_buoi: { ngay: tuThamSoNgayTest("2026-09-12"), buoi: "Sang" } },
        update: { monAnId: 2, ghiChu: null },
      }),
    );
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 1 });
    prismaMock.thucDonNguoiLon.upsert.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await luuThucDonNguoiLon("2026-09-12", "Sang", 1, null);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("xoaThucDonNguoiLon", () => {
  it("Clear a slot: xoá đúng hàng theo (ngay, buoi), thành công", async () => {
    prismaMock.thucDonNguoiLon.deleteMany.mockResolvedValue({ count: 1 });

    const ketQua = await xoaThucDonNguoiLon("2026-09-12", "Trua");

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toEqual({ buoi: "Trua" });
    expect(prismaMock.thucDonNguoiLon.deleteMany).toHaveBeenCalledWith({
      where: { ngay: tuThamSoNgayTest("2026-09-12"), buoi: "Trua" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/thuc-don/chon-mon");
  });

  it("xoá một slot vốn đã trống -> vẫn thành công (không phải lỗi)", async () => {
    prismaMock.thucDonNguoiLon.deleteMany.mockResolvedValue({ count: 0 });

    const ketQua = await xoaThucDonNguoiLon("2026-09-12", "Toi");

    expect(ketQua.ok).toBe(true);
  });

  it("chặn ngày/bữa không hợp lệ trước khi chạm Prisma", async () => {
    const ketQuaNgay = await xoaThucDonNguoiLon("khong-hop-le", "Sang");
    expect(ketQuaNgay.ok).toBe(false);

    const ketQuaBuoi = await xoaThucDonNguoiLon("2026-09-12", "khong-hop-le");
    expect(ketQuaBuoi.ok).toBe(false);

    expect(prismaMock.thucDonNguoiLon.deleteMany).not.toHaveBeenCalled();
  });
});

describe("luuThucDonBe", () => {
  it("chặn ngày dị dạng", async () => {
    const ketQua = await luuThucDonBe("khong-phai-ngay", "Sang", 1);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGAY_KHONG_HOP_LE");
    expect(prismaMock.thucDonBe.upsert).not.toHaveBeenCalled();
  });

  it("chặn bữa không hợp lệ", async () => {
    const ketQua = await luuThucDonBe("2026-09-12", "Chieu", 1);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("BUOI_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("buoi");
    expect(prismaMock.thucDonBe.upsert).not.toHaveBeenCalled();
  });

  it("chặn monAnId không hợp lệ", async () => {
    const ketQua = await luuThucDonBe("2026-09-12", "Sang", 0);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MON_AN_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("monAnId");
    expect(prismaMock.monAn.findUnique).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 3 });
    prismaMock.thucDonBe.upsert.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await luuThucDonBe("2026-09-12", "Sang", 3);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("Assign a dish (Bé dưới 1 tuổi): upsert không có ghiChu trong payload", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 3 });
    prismaMock.thucDonBe.upsert.mockResolvedValue({
      monAnId: 3,
      monAn: { ten: "Cháo yến mạch bí đỏ" },
    });

    const ketQua = await luuThucDonBe("2026-09-12", "Sang", 3);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toEqual({
      buoi: "Sang",
      monAnId: 3,
      tenMon: "Cháo yến mạch bí đỏ",
    });
    expect(prismaMock.thucDonBe.upsert).toHaveBeenCalledWith({
      where: { ngay_buoi: { ngay: tuThamSoNgayTest("2026-09-12"), buoi: "Sang" } },
      create: { ngay: tuThamSoNgayTest("2026-09-12"), buoi: "Sang", monAnId: 3 },
      update: { monAnId: 3 },
      include: { monAn: { select: { ten: true } } },
    });
  });

  it("chặn gán Món ăn không tồn tại, không tạo/sửa gì", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue(null);

    const ketQua = await luuThucDonBe("2026-09-12", "Sang", 999);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MON_AN_KHONG_TON_TAI");
    expect(prismaMock.thucDonBe.upsert).not.toHaveBeenCalled();
  });

  it("hai nhánh Nhóm khẩu phần độc lập: luuThucDonBe không đụng bảng ThucDonNguoiLon", async () => {
    prismaMock.monAn.findUnique.mockResolvedValue({ id: 3 });
    prismaMock.thucDonBe.upsert.mockResolvedValue({
      monAnId: 3,
      monAn: { ten: "Cháo yến mạch bí đỏ" },
    });

    await luuThucDonBe("2026-09-12", "Sang", 3);

    expect(prismaMock.thucDonNguoiLon.upsert).not.toHaveBeenCalled();
  });
});

describe("xoaThucDonBe", () => {
  it("Clear a slot (Bé dưới 1 tuổi): xoá đúng hàng, không đụng ThucDonNguoiLon", async () => {
    prismaMock.thucDonBe.deleteMany.mockResolvedValue({ count: 1 });

    const ketQua = await xoaThucDonBe("2026-09-12", "Toi");

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.thucDonBe.deleteMany).toHaveBeenCalledWith({
      where: { ngay: tuThamSoNgayTest("2026-09-12"), buoi: "Toi" },
    });
    expect(prismaMock.thucDonNguoiLon.deleteMany).not.toHaveBeenCalled();
  });

  it("xoá một slot vốn đã trống -> vẫn thành công (không phải lỗi)", async () => {
    prismaMock.thucDonBe.deleteMany.mockResolvedValue({ count: 0 });

    const ketQua = await xoaThucDonBe("2026-09-12", "Sang");

    expect(ketQua.ok).toBe(true);
  });

  it("chặn ngày/bữa không hợp lệ trước khi chạm Prisma", async () => {
    const ketQuaNgay = await xoaThucDonBe("khong-hop-le", "Sang");
    expect(ketQuaNgay.ok).toBe(false);

    const ketQuaBuoi = await xoaThucDonBe("2026-09-12", "khong-hop-le");
    expect(ketQuaBuoi.ok).toBe(false);

    expect(prismaMock.thucDonBe.deleteMany).not.toHaveBeenCalled();
  });
});

/** Cùng phép tính mốc ngày VN với `lib/ngayVn.ts`'s `tuThamSoNgay()`, dùng để
 * khớp giá trị `Date` mong đợi trong assertion mà không import thẳng
 * `lib/ngayVn` (giữ test độc lập khỏi việc mock module đó). */
function tuThamSoNgayTest(gia: string): Date {
  const [nam, thang, ngay] = gia.split("-").map(Number);
  return new Date(Date.UTC(nam, thang - 1, ngay) - 7 * 60 * 60 * 1000);
}
