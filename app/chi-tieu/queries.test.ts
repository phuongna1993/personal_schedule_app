import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho đường ĐỌC của module Chi tiêu (`layGiaoDichThangHienTai`,
 * `layDanhSachDanhMuc`).
 *
 * Trọng tâm:
 *  1. Lọc đúng ranh giới tháng VN `[dauThang, dauThangKeTiep)`.
 *  2. Tổng Chi/Thu CỘNG THEO `loai`, không cộng dồn `soTien` trực tiếp bất kể
 *     chiều (Data & formats convention, ARCHITECTURE-SPINE.md).
 *  3. `tenDanhMuc` join sẵn từ `danhMucChiTieu`, `null` khi là Thu.
 *
 * Prisma được mock để test chạy thuần in-memory, không đụng `app-data/db.sqlite`.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    giaoDich: {
      findMany: vi.fn(),
    },
    danhMucChiTieu: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { layGiaoDichThangHienTai, layDanhSachDanhMuc } = await import(
  "./queries"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("layGiaoDichThangHienTai", () => {
  it("trả rỗng và tổng 0 khi tháng chưa có Giao dịch nào", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);

    const du = await layGiaoDichThangHienTai();

    expect(du.giaoDich).toEqual([]);
    expect(du.tongChi).toBe(0);
    expect(du.tongThu).toBe(0);
  });

  /**
   * Kỳ vọng ở đây được tính TAY (mốc ISO cụ thể), KHÔNG gọi `layMocDauThangVN`/
   * `layMocDauThangKeTiepVN` để suy ra "giá trị đúng" — làm vậy sẽ không bao
   * giờ bắt được một lỗi hồi quy trong chính phép toán ranh giới tháng (ví dụ
   * lệch 1 ở cận trên loại trừ, hay cuộn tháng 12->01 sai). Cùng quy ước với
   * `lib/ngayVn.test.ts`. Coverage đầy đủ cho chính hai hàm mốc tháng nằm ở đó
   * — test này chỉ chốt rằng `layGiaoDichThangHienTai` TRUYỀN đúng các mốc đó
   * vào Prisma.
   */
  it("lọc theo đúng ranh giới tháng VN [dauThang, dauThangKeTiep)", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);
    // 2026-08-15T10:00:00.000Z = 15/08/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-08-15T10:00:00.000Z");

    await layGiaoDichThangHienTai(thoiDiem);

    expect(prismaMock.giaoDich.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ngay: {
            // 01/08/2026 00:00 VN == 2026-07-31T17:00:00.000Z.
            gte: new Date("2026-07-31T17:00:00.000Z"),
            // 01/09/2026 00:00 VN == 2026-08-31T17:00:00.000Z.
            lt: new Date("2026-08-31T17:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("lọc đúng khi băng qua ranh giới năm (tháng 12 -> 01 năm sau)", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);
    // 2026-12-20T10:00:00.000Z = 20/12/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-12-20T10:00:00.000Z");

    await layGiaoDichThangHienTai(thoiDiem);

    expect(prismaMock.giaoDich.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ngay: {
            // 01/12/2026 00:00 VN == 2026-11-30T17:00:00.000Z.
            gte: new Date("2026-11-30T17:00:00.000Z"),
            // 01/01/2027 00:00 VN == 2026-12-31T17:00:00.000Z.
            lt: new Date("2026-12-31T17:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("cộng dồn tổng Chi/Thu theo `loai`, không cộng thẳng soTien", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 45000,
        ngay: new Date(),
        ghiChu: null,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        id: 2,
        loai: "Chi",
        soTien: 10000,
        ngay: new Date(),
        ghiChu: null,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        id: 3,
        loai: "Thu",
        soTien: 5000000,
        ngay: new Date(),
        ghiChu: null,
        danhMucChiTieuId: null,
        danhMucChiTieu: null,
      },
    ]);

    const du = await layGiaoDichThangHienTai();

    expect(du.tongChi).toBe(55000);
    expect(du.tongThu).toBe(5000000);
    expect(du.giaoDich).toHaveLength(3);
  });

  it("join tenDanhMuc từ danhMucChiTieu, null khi là Thu", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 45000,
        ngay: new Date(),
        ghiChu: "Cà phê",
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        id: 2,
        loai: "Thu",
        soTien: 5000000,
        ngay: new Date(),
        ghiChu: null,
        danhMucChiTieuId: null,
        danhMucChiTieu: null,
      },
    ]);

    const du = await layGiaoDichThangHienTai();

    expect(du.giaoDich[0].tenDanhMuc).toBe("Ăn uống");
    expect(du.giaoDich[1].tenDanhMuc).toBeNull();
  });

  it("chuẩn hoá loai ngoài union cố định về Chi ở biên đọc", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "rác",
        soTien: 1000,
        ngay: new Date(),
        ghiChu: null,
        danhMucChiTieuId: null,
        danhMucChiTieu: null,
      },
    ]);

    const du = await layGiaoDichThangHienTai();

    expect(du.giaoDich[0].loai).toBe("Chi");
  });

  it("yêu cầu Prisma sắp theo ngay giảm dần rồi id giảm dần", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);

    await layGiaoDichThangHienTai();

    expect(prismaMock.giaoDich.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ ngay: "desc" }, { id: "desc" }],
        include: { danhMucChiTieu: true },
      }),
    );
  });
});

describe("layDanhSachDanhMuc", () => {
  it("trả mảng rỗng khi chưa có Danh mục nào", async () => {
    prismaMock.danhMucChiTieu.findMany.mockResolvedValue([]);

    const ds = await layDanhSachDanhMuc();

    expect(ds).toEqual([]);
  });

  it("yêu cầu Prisma sắp theo ten tăng dần rồi id tăng dần", async () => {
    prismaMock.danhMucChiTieu.findMany.mockResolvedValue([
      { id: 2, ten: "Ăn uống" },
      { id: 1, ten: "Đi lại" },
    ]);

    const ds = await layDanhSachDanhMuc();

    expect(prismaMock.danhMucChiTieu.findMany).toHaveBeenCalledWith({
      orderBy: [{ ten: "asc" }, { id: "asc" }],
    });
    expect(ds).toEqual([
      { id: 2, ten: "Ăn uống" },
      { id: 1, ten: "Đi lại" },
    ]);
  });
});
