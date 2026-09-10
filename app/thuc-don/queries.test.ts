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
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { layDanhSachMonAn, layDanhSachNguyenLieuDuyNhat } = await import(
  "./queries"
);

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
