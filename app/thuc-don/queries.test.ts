import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho đường ĐỌC của module Thực đơn (`layDanhSachMonAn`,
 * `layDanhSachNguyenLieuDuyNhat`).
 *
 * Trọng tâm:
 *  1. `layDanhSachMonAn` join đúng Nguyên liệu của từng Món ăn, sắp id tăng
 *     dần cho cả hai cấp.
 *  2. `layDanhSachNguyenLieuDuyNhat` trả tên KHÔNG LẶP, sắp theo tên tăng
 *     dần — dữ liệu cho dãy filter-chip (CAP-8).
 *
 * Prisma được mock để test chạy thuần in-memory, không đụng `app-data/db.sqlite`.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    monAn: {
      findMany: vi.fn(),
    },
    nguyenLieu: {
      findMany: vi.fn(),
    },
    thucDonNguoiLon: {
      findMany: vi.fn(),
    },
    thucDonBe: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  layDanhSachMonAn,
  layDanhSachNguyenLieuDuyNhat,
  layThucDonNgay,
} = await import("./queries");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("layDanhSachMonAn", () => {
  it("trả rỗng khi Ngân hàng món ăn chưa có Món ăn nào", async () => {
    prismaMock.monAn.findMany.mockResolvedValue([]);

    const ds = await layDanhSachMonAn();

    expect(ds).toEqual([]);
  });

  it("đọc đúng danh sách Món ăn kèm Nguyên liệu đã join sẵn", async () => {
    prismaMock.monAn.findMany.mockResolvedValue([
      {
        id: 1,
        ten: "Bò xào thập cẩm",
        anh: "mon-an/a.jpg",
        nguyenLieu: [
          { id: 10, ten: "thịt bò", anh: null },
          { id: 11, ten: "hành tây", anh: "nguyen-lieu/b.jpg" },
        ],
      },
      { id: 2, ten: "Canh chua cá lóc", anh: null, nguyenLieu: [] },
    ]);

    const ds = await layDanhSachMonAn();

    expect(ds).toEqual([
      {
        id: 1,
        ten: "Bò xào thập cẩm",
        anh: "mon-an/a.jpg",
        nguyenLieu: [
          { id: 10, ten: "thịt bò", anh: null },
          { id: 11, ten: "hành tây", anh: "nguyen-lieu/b.jpg" },
        ],
      },
      { id: 2, ten: "Canh chua cá lóc", anh: null, nguyenLieu: [] },
    ]);
    expect(prismaMock.monAn.findMany).toHaveBeenCalledWith({
      orderBy: { id: "asc" },
      include: { nguyenLieu: { orderBy: { id: "asc" } } },
    });
  });
});

describe("layDanhSachNguyenLieuDuyNhat", () => {
  it("trả rỗng khi chưa có Nguyên liệu nào", async () => {
    prismaMock.nguyenLieu.findMany.mockResolvedValue([]);

    const ds = await layDanhSachNguyenLieuDuyNhat();

    expect(ds).toEqual([]);
  });

  it("trả tên KHÔNG LẶP, sắp theo tên tăng dần — query bằng distinct + orderBy", async () => {
    prismaMock.nguyenLieu.findMany.mockResolvedValue([
      { ten: "cá" },
      { ten: "rau củ" },
      { ten: "thịt bò" },
    ]);

    const ds = await layDanhSachNguyenLieuDuyNhat();

    expect(ds).toEqual(["cá", "rau củ", "thịt bò"]);
    expect(prismaMock.nguyenLieu.findMany).toHaveBeenCalledWith({
      select: { ten: true },
      distinct: ["ten"],
      orderBy: { ten: "asc" },
    });
  });
});

describe("layThucDonNgay", () => {
  // Mốc 00:00 giờ VN của 12/09/2026 — cùng cách tính với `lib/ngayVn.ts`'s
  // `layMocNgayVN()` (UTC+7 cố định): 12/09/2026 00:00 VN = 11/09/2026 17:00 UTC.
  const NGAY = new Date("2026-09-11T17:00:00.000Z");

  it("First visit to a day, no menu yet: trả đủ 3 slot mỗi nhánh, tất cả monAnId/tenMon null, ghiChu null", async () => {
    prismaMock.thucDonNguoiLon.findMany.mockResolvedValue([]);
    prismaMock.thucDonBe.findMany.mockResolvedValue([]);

    const duLieu = await layThucDonNgay(NGAY);

    expect(duLieu.nguoiLon).toEqual([
      { buoi: "Sang", monAnId: null, tenMon: null, ghiChu: null },
      { buoi: "Trua", monAnId: null, tenMon: null, ghiChu: null },
      { buoi: "Toi", monAnId: null, tenMon: null, ghiChu: null },
    ]);
    expect(duLieu.be).toEqual([
      { buoi: "Sang", monAnId: null, tenMon: null },
      { buoi: "Trua", monAnId: null, tenMon: null },
      { buoi: "Toi", monAnId: null, tenMon: null },
    ]);
    expect(prismaMock.thucDonNguoiLon.findMany).toHaveBeenCalledWith({
      where: { ngay: NGAY },
      include: { monAn: { select: { ten: true } } },
    });
    expect(prismaMock.thucDonBe.findMany).toHaveBeenCalledWith({
      where: { ngay: NGAY },
      include: { monAn: { select: { ten: true } } },
    });
  });

  it("đọc đúng slot đã gán, kèm ghi chú của nhánh Người lớn — slot chưa gán vẫn trả null", async () => {
    prismaMock.thucDonNguoiLon.findMany.mockResolvedValue([
      {
        buoi: "Trua",
        monAnId: 1,
        ghiChu: "Bớt cay, cắt nhỏ miếng thịt",
        monAn: { ten: "Bò xào thập cẩm" },
      },
    ]);
    prismaMock.thucDonBe.findMany.mockResolvedValue([
      { buoi: "Sang", monAnId: 2, monAn: { ten: "Cháo yến mạch bí đỏ" } },
    ]);

    const duLieu = await layThucDonNgay(NGAY);

    expect(duLieu.nguoiLon).toEqual([
      { buoi: "Sang", monAnId: null, tenMon: null, ghiChu: null },
      {
        buoi: "Trua",
        monAnId: 1,
        tenMon: "Bò xào thập cẩm",
        ghiChu: "Bớt cay, cắt nhỏ miếng thịt",
      },
      { buoi: "Toi", monAnId: null, tenMon: null, ghiChu: null },
    ]);
    expect(duLieu.be).toEqual([
      { buoi: "Sang", monAnId: 2, tenMon: "Cháo yến mạch bí đỏ" },
      { buoi: "Trua", monAnId: null, tenMon: null },
      { buoi: "Toi", monAnId: null, tenMon: null },
    ]);
  });

  it("hai nhánh hoàn toàn độc lập: gán ở Người lớn không xuất hiện ở Bé và ngược lại", async () => {
    prismaMock.thucDonNguoiLon.findMany.mockResolvedValue([
      { buoi: "Sang", monAnId: 1, ghiChu: null, monAn: { ten: "Món A" } },
    ]);
    prismaMock.thucDonBe.findMany.mockResolvedValue([]);

    const duLieu = await layThucDonNgay(NGAY);

    expect(duLieu.nguoiLon[0].monAnId).toBe(1);
    expect(duLieu.be.every((slot) => slot.monAnId === null)).toBe(true);
  });

  it("chuẩn hoá `ngay` truyền vào qua `layMocNgayVN()` trước khi query", async () => {
    prismaMock.thucDonNguoiLon.findMany.mockResolvedValue([]);
    prismaMock.thucDonBe.findMany.mockResolvedValue([]);

    // Giữa trưa (giờ UTC) của cùng ngày lịch VN vẫn phải chuẩn hoá về đúng
    // mốc 00:00 giờ VN như `NGAY` — không truyền thẳng giá trị thô vào query.
    const giuaNgay = new Date("2026-09-12T04:00:00.000Z");
    await layThucDonNgay(giuaNgay);

    expect(prismaMock.thucDonNguoiLon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ngay: NGAY } }),
    );
  });
});
