import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho các Server Action của module Chi tiêu.
 *
 * Trọng tâm: I/O & Edge-Case Matrix của story —
 *  - Add Chi: cần Danh mục (tạo inline nếu chưa có) — thiếu Danh mục hoặc tên
 *    Danh mục rỗng khi tạo bị chặn inline.
 *  - Add Thu: KHÔNG persist `danhMucChiTieuId` dù client gửi kèm.
 *  - Edit/Delete: sửa số tiền cập nhật in-place; xoá gỡ khỏi log.
 *
 * Prisma và `next/cache` được mock để test chạy thuần in-memory, không đụng
 * vào `app-data/db.sqlite` thật.
 */

const { prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  prismaMock: {
    danhMucChiTieu: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    giaoDich: {
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { themGiaoDich, suaGiaoDich, xoaGiaoDich, themDanhMuc } = await import(
  "./actions"
);

const GIAO_DICH_CHI_HOP_LE = {
  loai: "Chi",
  soTien: 45000,
  ngay: "2026-08-20",
  ghiChu: "Cà phê chiều",
  danhMucChiTieuId: 1,
};

const GIAO_DICH_THU_HOP_LE = {
  loai: "Thu",
  soTien: 5000000,
  ngay: "2026-08-20",
};

function hangGiaoDich(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    loai: "Chi",
    soTien: 45000,
    ngay: new Date("2026-08-20T00:00:00.000-07:00"),
    ghiChu: "Cà phê chiều",
    danhMucChiTieuId: 1,
    danhMucChiTieu: { ten: "Ăn uống" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.danhMucChiTieu.findUnique.mockResolvedValue({ id: 1 });
  prismaMock.giaoDich.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) =>
      hangGiaoDich({ ...data, danhMucChiTieu: { ten: "Ăn uống" } }),
  );
  prismaMock.giaoDich.update.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) =>
      hangGiaoDich({ ...data, danhMucChiTieu: { ten: "Ăn uống" } }),
  );
  prismaMock.giaoDich.deleteMany.mockResolvedValue({ count: 1 });
  prismaMock.danhMucChiTieu.create.mockImplementation(
    async ({ data }: { data: { ten: string } }) => ({ id: 7, ten: data.ten }),
  );
});

describe("themGiaoDich — Add Chi", () => {
  it("chặn khi thiếu danhMucChiTieuId cho khoản Chi", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      danhMucChiTieuId: undefined,
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DANH_MUC_BAT_BUOC");
    expect(ketQua.error.field).toBe("danhMucChiTieuId");
    expect(prismaMock.giaoDich.create).not.toHaveBeenCalled();
  });

  it("chặn khi Danh mục được chọn không còn tồn tại", async () => {
    prismaMock.danhMucChiTieu.findUnique.mockResolvedValue(null);

    const ketQua = await themGiaoDich(GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DANH_MUC_KHONG_TON_TAI");
    expect(ketQua.error.field).toBe("danhMucChiTieuId");
    expect(prismaMock.giaoDich.create).not.toHaveBeenCalled();
  });

  it("ghi Giao dịch Chi hợp lệ, gắn đúng danhMucChiTieuId, revalidate /chi-tieu", async () => {
    const ketQua = await themGiaoDich(GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toMatchObject({
      loai: "Chi",
      soTien: 45000,
      danhMucChiTieuId: 1,
      tenDanhMuc: "Ăn uống",
      ghiChu: "Cà phê chiều",
    });
    expect(prismaMock.giaoDich.create).toHaveBeenCalledWith({
      data: {
        loai: "Chi",
        soTien: 45000,
        ngay: expect.any(Date),
        ghiChu: "Cà phê chiều",
        danhMucChiTieuId: 1,
      },
      include: { danhMucChiTieu: true },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/chi-tieu");
  });

  it("chặn số tiền không phải số nguyên dương", async () => {
    const ketQua = await themGiaoDich({ ...GIAO_DICH_CHI_HOP_LE, soTien: 0 });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("SO_TIEN_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("soTien");
    expect(prismaMock.giaoDich.create).not.toHaveBeenCalled();
  });

  it("chặn số tiền âm hoặc thập phân", async () => {
    const amChan = await themGiaoDich({ ...GIAO_DICH_CHI_HOP_LE, soTien: -100 });
    const thapPhan = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 45.5,
    });

    expect(amChan.ok).toBe(false);
    expect(thapPhan.ok).toBe(false);
    expect(prismaMock.giaoDich.create).not.toHaveBeenCalled();
  });

  it("chặn số tiền vượt giới hạn Int32 của Prisma", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 2_147_483_648,
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("SO_TIEN_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("soTien");
    expect(prismaMock.giaoDich.create).not.toHaveBeenCalled();
  });

  it("chấp nhận số tiền đúng bằng giới hạn Int32", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 2_147_483_647,
    });

    expect(ketQua.ok).toBe(true);
  });

  it("chặn ghi chú vượt quá 200 ký tự", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      ghiChu: "a".repeat(201),
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GHI_CHU_QUA_DAI");
    expect(ketQua.error.field).toBe("ghiChu");
    expect(prismaMock.giaoDich.create).not.toHaveBeenCalled();
  });

  it("chấp nhận ghi chú đúng 200 ký tự", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      ghiChu: "a".repeat(200),
    });

    expect(ketQua.ok).toBe(true);
  });

  it("chặn ngày không hợp lệ", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      ngay: "2026-02-30",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGAY_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("ngay");
  });

  it("trim ghi chú, và ghi chú rỗng lưu thành null", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      ghiChu: "   \n\t ",
    });

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.giaoDich.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ ghiChu: null }) }),
    );
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.giaoDich.create.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await themGiaoDich(GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("themGiaoDich — Add Thu", () => {
  it("ghi Giao dịch Thu, không cần Danh mục", async () => {
    const ketQua = await themGiaoDich(GIAO_DICH_THU_HOP_LE);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.danhMucChiTieu.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.giaoDich.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ loai: "Thu", danhMucChiTieuId: null }),
      }),
    );
  });

  it("KHÔNG persist danhMucChiTieuId dù client gửi kèm một id (chuyển Chi->Thu mid-form)", async () => {
    const ketQua = await themGiaoDich({
      ...GIAO_DICH_THU_HOP_LE,
      danhMucChiTieuId: 1,
    });

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.danhMucChiTieu.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.giaoDich.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ danhMucChiTieuId: null }),
      }),
    );
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.danhMucChiTieuId).toBeNull();
  });
});

describe("payload thô từ HTTP (kiểu bị xoá ở runtime)", () => {
  const RAC = [null, undefined, "chuỗi", 42, [], true];

  it.each(RAC)("themGiaoDich chặn payload %o trước khi chạm thuộc tính", async (rac) => {
    const ketQua = await themGiaoDich(rac as never);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
    expect(prismaMock.giaoDich.create).not.toHaveBeenCalled();
  });

  it.each(RAC)("suaGiaoDich chặn payload %o trước khi chạm thuộc tính", async (rac) => {
    const ketQua = await suaGiaoDich(3, rac as never);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
    expect(prismaMock.giaoDich.update).not.toHaveBeenCalled();
  });
});

describe("suaGiaoDich — Edit", () => {
  it("chặn id không phải số nguyên", async () => {
    const ketQua = await suaGiaoDich(Number.NaN, GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("ID_KHONG_HOP_LE");
    expect(prismaMock.giaoDich.update).not.toHaveBeenCalled();
  });

  it("sửa số tiền cập nhật in-place bằng update() theo khoá chính", async () => {
    prismaMock.giaoDich.update.mockResolvedValue(
      hangGiaoDich({ soTien: 60000 }),
    );

    const ketQua = await suaGiaoDich(42, {
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 60000,
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.soTien).toBe(60000);
    expect(prismaMock.giaoDich.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: expect.objectContaining({ soTien: 60000 }),
      include: { danhMucChiTieu: true },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/chi-tieu");
  });

  it("báo lỗi khi Giao dịch không còn tồn tại (Prisma P2025, ví dụ bị xoá bởi request khác giữa lúc sửa)", async () => {
    prismaMock.giaoDich.update.mockRejectedValue(
      Object.assign(new Error("An operation failed because it depends on one or more records that were required but not found."), {
        code: "P2025",
      }),
    );

    const ketQua = await suaGiaoDich(999, GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_GIAO_DICH");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG (không phải KHONG_TIM_THAY_GIAO_DICH) khi Prisma ném lỗi khác P2025", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.giaoDich.update.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await suaGiaoDich(42, GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("cho đổi chiều Chi -> Thu, xoá danhMucChiTieuId đi", async () => {
    prismaMock.giaoDich.update.mockResolvedValue(
      hangGiaoDich({ loai: "Thu", danhMucChiTieuId: null, danhMucChiTieu: null }),
    );

    const ketQua = await suaGiaoDich(42, {
      ...GIAO_DICH_THU_HOP_LE,
      danhMucChiTieuId: 1,
    });

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.giaoDich.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: expect.objectContaining({ loai: "Thu", danhMucChiTieuId: null }),
      include: { danhMucChiTieu: true },
    });
  });
});

describe("xoaGiaoDich — Delete", () => {
  it("xoá ngay, không có bước xác nhận nào ở tầng action", async () => {
    const ketQua = await xoaGiaoDich(42);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.giaoDich.deleteMany).toHaveBeenCalledWith({
      where: { id: 42 },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/chi-tieu");
  });

  it("báo lỗi khi Giao dịch không còn tồn tại", async () => {
    prismaMock.giaoDich.deleteMany.mockResolvedValue({ count: 0 });

    const ketQua = await xoaGiaoDich(999);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_GIAO_DICH");
  });

  it("chặn id không phải số nguyên", async () => {
    const ketQua = await xoaGiaoDich(Number.NaN);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("ID_KHONG_HOP_LE");
    expect(prismaMock.giaoDich.deleteMany).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.giaoDich.deleteMany.mockRejectedValue(new Error("disk I/O error"));

    const ketQua = await xoaGiaoDich(42);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});

/**
 * `themDanhMuc` — cho phép tạo Danh mục inline ngay giữa lúc đang nhập một
 * Giao dịch Chi (Acceptance: "chưa có Danh mục nào, tạo được inline").
 */
describe("themDanhMuc", () => {
  it("chặn tên rỗng, không ghi gì", async () => {
    const ketQua = await themDanhMuc({ ten: "" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
    expect(ketQua.error.field).toBe("ten");
    expect(prismaMock.danhMucChiTieu.create).not.toHaveBeenCalled();
  });

  it("coi tên chỉ có khoảng trắng là rỗng", async () => {
    const ketQua = await themDanhMuc({ ten: "   " });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
  });

  it("chặn tên vượt quá 50 ký tự", async () => {
    const ketQua = await themDanhMuc({ ten: "a".repeat(51) });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_QUA_DAI");
    expect(ketQua.error.field).toBe("ten");
    expect(prismaMock.danhMucChiTieu.create).not.toHaveBeenCalled();
  });

  it("chấp nhận tên đúng 50 ký tự", async () => {
    const ketQua = await themDanhMuc({ ten: "a".repeat(50) });

    expect(ketQua.ok).toBe(true);
  });

  it("tạo Danh mục hợp lệ (đã trim tên), revalidate /chi-tieu", async () => {
    const ketQua = await themDanhMuc({ ten: "  Ăn uống  " });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toEqual({ id: 7, ten: "Ăn uống" });
    expect(prismaMock.danhMucChiTieu.create).toHaveBeenCalledWith({
      data: { ten: "Ăn uống" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/chi-tieu");
  });

  it.each([null, undefined, "chuỗi", 42, [], true])(
    "chặn payload %o trước khi chạm thuộc tính",
    async (rac) => {
      const ketQua = await themDanhMuc(rac as never);

      expect(ketQua.ok).toBe(false);
      if (ketQua.ok) throw new Error("unreachable");
      expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
      expect(prismaMock.danhMucChiTieu.create).not.toHaveBeenCalled();
    },
  );

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.danhMucChiTieu.create.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await themDanhMuc({ ten: "Ăn uống" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});
