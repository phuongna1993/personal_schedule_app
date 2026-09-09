import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho các Server Action của module Chi tiêu.
 *
 * Trọng tâm: I/O & Edge-Case Matrix của story —
 *  - Add Chi: cần Danh mục (tạo inline nếu chưa có) — thiếu Danh mục hoặc tên
 *    Danh mục rỗng khi tạo bị chặn inline.
 *  - Add Thu: KHÔNG persist `danhMucChiTieuId` dù client gửi kèm.
 *  - Edit/Delete: sửa số tiền cập nhật in-place; xoá gỡ khỏi log.
 *  - Cảnh báo Ngân sách (CAP-6, Story 4): `data.canhBaoNganSach` đúng ngưỡng
 *    30%/100%, `null` khi không có `NganSach` tháng này hoặc khi là Thu.
 *  - `datHanMucNganSach`: upsert đúng khoá (danhMucChiTieuId, thang), luôn
 *    ép về THÁNG HIỆN TẠI, chặn hạn mức không hợp lệ.
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
      aggregate: vi.fn(),
    },
    nganSach: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { themGiaoDich, suaGiaoDich, xoaGiaoDich, themDanhMuc, datHanMucNganSach } =
  await import("./actions");

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
  prismaMock.danhMucChiTieu.findUnique.mockResolvedValue({
    id: 1,
    ten: "Ăn uống",
  });
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
  // Mặc định KHÔNG có Ngân sách tháng này -> không có cảnh báo (I/O matrix
  // row "no NganSach row this month"). Test riêng ở dưới override khi cần.
  prismaMock.nganSach.findUnique.mockResolvedValue(null);
  prismaMock.giaoDich.aggregate.mockResolvedValue({ _sum: { soTien: 0 } });
  prismaMock.nganSach.upsert.mockImplementation(
    async ({
      where,
      create,
      update,
    }: {
      where: { danhMucChiTieuId_thang: { danhMucChiTieuId: number; thang: Date } };
      create: { hanMuc: number };
      update: { hanMuc: number };
    }) => ({
      id: 9,
      danhMucChiTieuId: where.danhMucChiTieuId_thang.danhMucChiTieuId,
      thang: where.danhMucChiTieuId_thang.thang,
      hanMuc: update.hanMuc ?? create.hanMuc,
    }),
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

/**
 * Cảnh báo Ngân sách (Story 4, CAP-6) — I/O & Edge-Case Matrix của story:
 *  - crossing 30% remaining -> "Dưới ngưỡng cảnh báo 30%"
 *  - exceeding hạn mức -> "Đã vượt ngân sách" (daChi > hanMuc)
 *  - no NganSach row this month, hoặc loai=Thu -> null
 */
describe("themGiaoDich/suaGiaoDich — canhBaoNganSach (CAP-6)", () => {
  it("Add Chi crossing 30% remaining -> canhBaoNganSach dưới ngưỡng", async () => {
    prismaMock.nganSach.findUnique.mockResolvedValue({
      id: 1,
      danhMucChiTieuId: 1,
      thang: new Date("2026-07-31T17:00:00.000Z"),
      hanMuc: 3_000_000,
    });
    // Tổng đã Chi trong tháng SAU khi Giao dịch này được lưu.
    prismaMock.giaoDich.aggregate.mockResolvedValue({
      _sum: { soTien: 2_200_000 },
    });

    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 2_200_000,
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toEqual({
      danhMucChiTieuId: 1,
      tenDanhMuc: "Ăn uống",
      hanMuc: 3_000_000,
      daChi: 2_200_000,
      // floor((3.000.000 - 2.200.000) / 3.000.000 * 100) = 26.
      phanTramConLai: 26,
    });

    // Chốt đúng SCOPE của phép tính: đúng Danh mục, đúng ranh giới tháng suy
    // ra từ `ngay` của CHÍNH Giao dịch vừa lưu (GIAO_DICH_CHI_HOP_LE.ngay =
    // "2026-08-20") — không phải tháng hệ thống hiện tại, không phải một
    // Danh mục khác. Cả hai mock đều trả giá trị đóng cứng bất kể `where`
    // truyền vào, nên không có assertion này thì một lỗi hồi quy làm sai
    // `danhMucChiTieuId` hoặc lệch ranh giới tháng vẫn lọt qua mọi test khác
    // ở trên.
    expect(prismaMock.nganSach.findUnique).toHaveBeenCalledWith({
      where: {
        danhMucChiTieuId_thang: {
          danhMucChiTieuId: 1,
          // 01/08/2026 00:00 VN == 2026-07-31T17:00:00.000Z.
          thang: new Date("2026-07-31T17:00:00.000Z"),
        },
      },
    });
    expect(prismaMock.giaoDich.aggregate).toHaveBeenCalledWith({
      where: {
        danhMucChiTieuId: 1,
        loai: "Chi",
        ngay: {
          gte: new Date("2026-07-31T17:00:00.000Z"),
          // 01/09/2026 00:00 VN == 2026-08-31T17:00:00.000Z.
          lt: new Date("2026-08-31T17:00:00.000Z"),
        },
      },
      _sum: { soTien: true },
    });
  });

  it("Add Chi exceeding hạn mức -> canhBaoNganSach với daChi > hanMuc", async () => {
    prismaMock.nganSach.findUnique.mockResolvedValue({
      id: 1,
      danhMucChiTieuId: 1,
      thang: new Date("2026-07-31T17:00:00.000Z"),
      hanMuc: 1_000_000,
    });
    prismaMock.giaoDich.aggregate.mockResolvedValue({
      _sum: { soTien: 1_200_000 },
    });

    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 1_200_000,
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toMatchObject({
      hanMuc: 1_000_000,
      daChi: 1_200_000,
    });
    // UI tự suy ra "Đã vượt ngân sách" từ daChi > hanMuc (Boundaries: field
    // này không mã hoá sẵn một "loại cảnh báo").
    expect(
      ketQua.data.canhBaoNganSach!.daChi > ketQua.data.canhBaoNganSach!.hanMuc,
    ).toBe(true);
  });

  it("đúng CHẠM ngưỡng 70% đã chi (daChi * 10 === hanMuc * 7) -> cảnh báo VẪN hiện", async () => {
    // Biên chính xác của điều kiện `daChi * 10 < hanMuc * 7` (không cảnh báo)
    // — 700.000 * 10 == 1.000.000 * 7 == 7.000.000, tức đúng 70% đã chi / 30%
    // còn lại. Điều kiện dùng `<` (không phải `<=`) nên mốc này PHẢI vẫn kích
    // hoạt cảnh báo, không được lọt qua như "chưa chạm ngưỡng".
    prismaMock.nganSach.findUnique.mockResolvedValue({
      id: 1,
      danhMucChiTieuId: 1,
      thang: new Date("2026-07-31T17:00:00.000Z"),
      hanMuc: 1_000_000,
    });
    prismaMock.giaoDich.aggregate.mockResolvedValue({
      _sum: { soTien: 700_000 },
    });

    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 700_000,
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toEqual({
      danhMucChiTieuId: 1,
      tenDanhMuc: "Ăn uống",
      hanMuc: 1_000_000,
      daChi: 700_000,
      // floor((1.000.000 - 700.000) / 1.000.000 * 100) = 30.
      phanTramConLai: 30,
    });
  });

  it("đúng BẰNG hạn mức (daChi === hanMuc, 100%) -> daVuot (daChi > hanMuc) là false", async () => {
    // Spec: "Đã vượt ngân sách" chỉ áp dụng cho chi VƯỢT hạn mức (`>`), không
    // phải chi ĐÚNG BẰNG hạn mức. UI (`KhoiCanhBaoNganSach`) suy ra trạng
    // thái "đã vượt" bằng `daChi > hanMuc` từ đúng hai field này — chốt ở
    // đây rằng tại mốc 100% chẵn, biểu thức đó vẫn là `false` (nhãn phải là
    // "Dưới ngưỡng cảnh báo 30%", không phải "Đã vượt ngân sách").
    prismaMock.nganSach.findUnique.mockResolvedValue({
      id: 1,
      danhMucChiTieuId: 1,
      thang: new Date("2026-07-31T17:00:00.000Z"),
      hanMuc: 1_000_000,
    });
    prismaMock.giaoDich.aggregate.mockResolvedValue({
      _sum: { soTien: 1_000_000 },
    });

    const ketQua = await themGiaoDich({
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 1_000_000,
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toEqual({
      danhMucChiTieuId: 1,
      tenDanhMuc: "Ăn uống",
      hanMuc: 1_000_000,
      daChi: 1_000_000,
      phanTramConLai: 0,
    });
    expect(
      ketQua.data.canhBaoNganSach!.daChi > ketQua.data.canhBaoNganSach!.hanMuc,
    ).toBe(false);
  });

  it("chưa chạm 70% hạn mức -> canhBaoNganSach null (không aggregate quá ngưỡng)", async () => {
    prismaMock.nganSach.findUnique.mockResolvedValue({
      id: 1,
      danhMucChiTieuId: 1,
      thang: new Date("2026-07-31T17:00:00.000Z"),
      hanMuc: 1_000_000,
    });
    prismaMock.giaoDich.aggregate.mockResolvedValue({
      _sum: { soTien: 600_000 },
    });

    const ketQua = await themGiaoDich(GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toBeNull();
  });

  it("không có NganSach tháng này -> canhBaoNganSach null, không gọi aggregate", async () => {
    const ketQua = await themGiaoDich(GIAO_DICH_CHI_HOP_LE);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toBeNull();
    expect(prismaMock.giaoDich.aggregate).not.toHaveBeenCalled();
  });

  it("Add Thu -> canhBaoNganSach null, không tra NganSach", async () => {
    const ketQua = await themGiaoDich(GIAO_DICH_THU_HOP_LE);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toBeNull();
    expect(prismaMock.nganSach.findUnique).not.toHaveBeenCalled();
  });

  it("suaGiaoDich cũng tính canhBaoNganSach cho Chi đã sửa", async () => {
    prismaMock.nganSach.findUnique.mockResolvedValue({
      id: 1,
      danhMucChiTieuId: 1,
      thang: new Date("2026-07-31T17:00:00.000Z"),
      hanMuc: 1_000_000,
    });
    prismaMock.giaoDich.aggregate.mockResolvedValue({
      _sum: { soTien: 900_000 },
    });
    prismaMock.giaoDich.update.mockResolvedValue(
      hangGiaoDich({ soTien: 900_000 }),
    );

    const ketQua = await suaGiaoDich(42, {
      ...GIAO_DICH_CHI_HOP_LE,
      soTien: 900_000,
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.canhBaoNganSach).toMatchObject({ daChi: 900_000 });
  });

  it("xoaGiaoDich KHÔNG trả canhBaoNganSach (Never — story boundary)", async () => {
    const ketQua = await xoaGiaoDich(42);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).not.toHaveProperty("canhBaoNganSach");
  });
});

/**
 * `datHanMucNganSach` — set/sửa hạn mức Ngân sách, LUÔN upsert THÁNG HIỆN
 * TẠI (AD-2: never một tháng đã qua).
 */
describe("datHanMucNganSach", () => {
  it("chặn hanMuc <= 0", async () => {
    const ketQua = await datHanMucNganSach(1, 0);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("HAN_MUC_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("hanMuc");
    expect(prismaMock.nganSach.upsert).not.toHaveBeenCalled();
  });

  it("chặn hanMuc không phải số nguyên", async () => {
    const ketQua = await datHanMucNganSach(1, 3_000_000.5);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("HAN_MUC_KHONG_HOP_LE");
  });

  it("chặn hanMuc vượt giới hạn Int32", async () => {
    const ketQua = await datHanMucNganSach(1, 2_147_483_648);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("HAN_MUC_KHONG_HOP_LE");
  });

  it("chặn danhMucChiTieuId không hợp lệ", async () => {
    const ketQua = await datHanMucNganSach(0, 3_000_000);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DANH_MUC_KHONG_HOP_LE");
    expect(prismaMock.nganSach.upsert).not.toHaveBeenCalled();
  });

  it("báo lỗi khi Danh mục không còn tồn tại", async () => {
    prismaMock.danhMucChiTieu.findUnique.mockResolvedValue(null);

    const ketQua = await datHanMucNganSach(1, 3_000_000);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DANH_MUC_KHONG_TON_TAI");
    expect(prismaMock.nganSach.upsert).not.toHaveBeenCalled();
  });

  it("upsert đúng khoá (danhMucChiTieuId, thang) của THÁNG HIỆN TẠI, revalidate /chi-tieu", async () => {
    vi.useFakeTimers();
    // 15/08/2026 17:00 giờ VN — cùng mốc thời gian dùng ở `queries.test.ts`.
    vi.setSystemTime(new Date("2026-08-15T10:00:00.000Z"));

    try {
      const ketQua = await datHanMucNganSach(1, 3_000_000);

      expect(ketQua.ok).toBe(true);
      if (!ketQua.ok) throw new Error("unreachable");
      expect(prismaMock.nganSach.upsert).toHaveBeenCalledWith({
        where: {
          danhMucChiTieuId_thang: {
            danhMucChiTieuId: 1,
            // 01/08/2026 00:00 VN == 2026-07-31T17:00:00.000Z.
            thang: new Date("2026-07-31T17:00:00.000Z"),
          },
        },
        create: {
          danhMucChiTieuId: 1,
          thang: new Date("2026-07-31T17:00:00.000Z"),
          hanMuc: 3_000_000,
        },
        update: { hanMuc: 3_000_000 },
      });
      expect(ketQua.data).toEqual({
        id: 9,
        danhMucChiTieuId: 1,
        thang: new Date("2026-07-31T17:00:00.000Z"),
        hanMuc: 3_000_000,
      });
      expect(revalidatePathMock).toHaveBeenCalledWith("/chi-tieu");
    } finally {
      vi.useRealTimers();
    }
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.nganSach.upsert.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await datHanMucNganSach(1, 3_000_000);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});
