import { beforeEach, describe, expect, it, vi } from "vitest";
import { type CanhBaoNganSach, xacDinhTrangThaiNganSach } from "./model";

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
      findFirst: vi.fn(),
    },
    danhMucChiTieu: {
      findMany: vi.fn(),
    },
    nganSach: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  layGiaoDichThangHienTai,
  layDanhSachDanhMuc,
  layDanhMucVoiHanMucThangHienTai,
  layThangSomNhat,
  layBaoCaoThang,
  layCanhBaoNganSachHienTai,
} = await import("./queries");

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

/**
 * `layDanhMucVoiHanMucThangHienTai` (Story 4, CAP-5/CAP-6) — prefill "Hạn
 * mức tháng này": lọc `NganSach` đúng THÁNG chứa `thoiDiem`, `hanMuc: null`
 * khi Danh mục chưa có hàng `NganSach` cho đúng tháng đó.
 */
describe("layDanhMucVoiHanMucThangHienTai", () => {
  it("hanMuc null khi Danh mục chưa có NganSach tháng này", async () => {
    prismaMock.danhMucChiTieu.findMany.mockResolvedValue([
      { id: 1, ten: "Ăn uống", nganSach: [] },
    ]);

    const ds = await layDanhMucVoiHanMucThangHienTai();

    expect(ds).toEqual([{ danhMucChiTieuId: 1, ten: "Ăn uống", hanMuc: null }]);
  });

  it("trả đúng hanMuc khi Danh mục có NganSach tháng này", async () => {
    prismaMock.danhMucChiTieu.findMany.mockResolvedValue([
      { id: 1, ten: "Ăn uống", nganSach: [{ hanMuc: 3_000_000 }] },
    ]);

    const ds = await layDanhMucVoiHanMucThangHienTai();

    expect(ds).toEqual([
      { danhMucChiTieuId: 1, ten: "Ăn uống", hanMuc: 3_000_000 },
    ]);
  });

  it("lọc nganSach theo đúng ranh giới THÁNG VN chứa thoiDiem", async () => {
    prismaMock.danhMucChiTieu.findMany.mockResolvedValue([]);
    // 2026-08-15T10:00:00.000Z = 15/08/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-08-15T10:00:00.000Z");

    await layDanhMucVoiHanMucThangHienTai(thoiDiem);

    expect(prismaMock.danhMucChiTieu.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          nganSach: {
            // 01/08/2026 00:00 VN == 2026-07-31T17:00:00.000Z.
            where: { thang: new Date("2026-07-31T17:00:00.000Z") },
            select: { hanMuc: true },
          },
        },
      }),
    );
  });

  it("trả mảng rỗng khi chưa có Danh mục nào", async () => {
    prismaMock.danhMucChiTieu.findMany.mockResolvedValue([]);

    const ds = await layDanhMucVoiHanMucThangHienTai();

    expect(ds).toEqual([]);
  });
});

/**
 * `layThangSomNhat` (Story 5, CAP-7) — mốc đầu tháng của Giao dịch sớm nhất,
 * mirror `layNgaySomNhat()` của module Lịch trình.
 */
describe("layThangSomNhat", () => {
  it("trả null khi chưa có Giao dịch nào", async () => {
    prismaMock.giaoDich.findFirst.mockResolvedValue(null);

    expect(await layThangSomNhat()).toBeNull();
  });

  it("quy Giao dịch sớm nhất về mốc ĐẦU THÁNG (VN) chứa nó, không phải mốc ngày", async () => {
    // 15/07/2026 giờ VN.
    prismaMock.giaoDich.findFirst.mockResolvedValue({
      ngay: new Date("2026-07-14T17:00:00.000Z"),
    });

    const thang = await layThangSomNhat();

    // 01/07/2026 00:00 VN == 2026-06-30T17:00:00.000Z.
    expect(thang?.getTime()).toBe(new Date("2026-06-30T17:00:00.000Z").getTime());
  });

  it("yêu cầu Prisma sắp theo ngay tăng dần (lấy giao dịch sớm nhất)", async () => {
    prismaMock.giaoDich.findFirst.mockResolvedValue(null);

    await layThangSomNhat();

    expect(prismaMock.giaoDich.findFirst).toHaveBeenCalledWith({
      orderBy: { ngay: "asc" },
    });
  });
});

/**
 * `layBaoCaoThang` (Story 5, CAP-7) — Báo cáo tháng bất kỳ: tổng Chi/Thu +
 * chi tiết theo Danh mục, kèm hạn mức NganSach của đúng tháng đó khi có.
 */
describe("layBaoCaoThang", () => {
  beforeEach(() => {
    prismaMock.nganSach.findMany.mockResolvedValue([]);
  });

  it("trả tổng 0 và chiTietDanhMuc rỗng khi tháng chưa có Giao dịch nào", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);

    const bc = await layBaoCaoThang();

    expect(bc.tongChi).toBe(0);
    expect(bc.tongThu).toBe(0);
    expect(bc.chiTietDanhMuc).toEqual([]);
  });

  it("lọc theo đúng ranh giới tháng VN [dauThang, dauThangKeTiep) của thoiDiem truyền vào", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);
    // 2026-07-15T10:00:00.000Z = 15/07/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-07-15T10:00:00.000Z");

    await layBaoCaoThang(thoiDiem);

    expect(prismaMock.giaoDich.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ngay: {
            // 01/07/2026 00:00 VN == 2026-06-30T17:00:00.000Z.
            gte: new Date("2026-06-30T17:00:00.000Z"),
            // 01/08/2026 00:00 VN == 2026-07-31T17:00:00.000Z.
            lt: new Date("2026-07-31T17:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("lọc đúng khi băng qua ranh giới năm (tháng 12 -> 01 năm sau)", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);
    // 2026-12-20T10:00:00.000Z = 20/12/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-12-20T10:00:00.000Z");

    await layBaoCaoThang(thoiDiem);

    expect(prismaMock.giaoDich.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ngay: {
            gte: new Date("2026-11-30T17:00:00.000Z"),
            lt: new Date("2026-12-31T17:00:00.000Z"),
          },
        },
      }),
    );
  });

  it("cộng tongChi/tongThu theo loai, không cộng thẳng soTien", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 45000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        id: 2,
        loai: "Chi",
        soTien: 10000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        id: 3,
        loai: "Thu",
        soTien: 5000000,
        danhMucChiTieuId: null,
        danhMucChiTieu: null,
      },
    ]);

    const bc = await layBaoCaoThang();

    expect(bc.tongChi).toBe(55000);
    expect(bc.tongThu).toBe(5000000);
  });

  it("gộp daChi theo danhMucChiTieuId, chỉ những Danh mục có Chi mới xuất hiện", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 45000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        id: 2,
        loai: "Chi",
        soTien: 30000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        id: 3,
        loai: "Chi",
        soTien: 20000,
        danhMucChiTieuId: 2,
        danhMucChiTieu: { ten: "Đi lại" },
      },
      {
        id: 4,
        loai: "Thu",
        soTien: 100000,
        danhMucChiTieuId: null,
        danhMucChiTieu: null,
      },
    ]);

    const bc = await layBaoCaoThang();

    expect(bc.chiTietDanhMuc).toEqual([
      { danhMucChiTieuId: 1, ten: "Ăn uống", daChi: 75000, hanMuc: null },
      { danhMucChiTieuId: 2, ten: "Đi lại", daChi: 20000, hanMuc: null },
    ]);
  });

  it("sắp chiTietDanhMuc theo tên tăng dần dù Prisma trả hàng KHÔNG theo thứ tự đó", async () => {
    // Hàng "Đi lại" đứng TRƯỚC "Ăn uống" trong dữ liệu thô — nếu `.sort()`
    // trong `layBaoCaoThang` bị xoá, test này phải fail (khác test gộp daChi
    // ở trên, vốn đã vô tình đưa input theo đúng thứ tự alphabet nên không
    // bắt được lỗi thiếu sort).
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 20000,
        danhMucChiTieuId: 2,
        danhMucChiTieu: { ten: "Đi lại" },
      },
      {
        id: 2,
        loai: "Chi",
        soTien: 45000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);

    const bc = await layBaoCaoThang();

    expect(bc.chiTietDanhMuc).toEqual([
      { danhMucChiTieuId: 1, ten: "Ăn uống", daChi: 45000, hanMuc: null },
      { danhMucChiTieuId: 2, ten: "Đi lại", daChi: 20000, hanMuc: null },
    ]);
  });

  it("hanMuc null khi Danh mục có Chi nhưng chưa có NganSach tháng này", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 45000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.nganSach.findMany.mockResolvedValue([]);

    const bc = await layBaoCaoThang();

    expect(bc.chiTietDanhMuc).toEqual([
      { danhMucChiTieuId: 1, ten: "Ăn uống", daChi: 45000, hanMuc: null },
    ]);
  });

  it("trả đúng hanMuc khi Danh mục có NganSach của đúng tháng đang xem", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 45000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.nganSach.findMany.mockResolvedValue([
      { danhMucChiTieuId: 1, hanMuc: 3_000_000 },
    ]);

    const bc = await layBaoCaoThang();

    expect(bc.chiTietDanhMuc).toEqual([
      { danhMucChiTieuId: 1, ten: "Ăn uống", daChi: 45000, hanMuc: 3_000_000 },
    ]);
  });

  it("truy vấn NganSach đúng tháng đang xem, không phải tháng hiện tại thật", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([
      {
        id: 1,
        loai: "Chi",
        soTien: 45000,
        danhMucChiTieuId: 1,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    // 2026-07-15T10:00:00.000Z = 15/07/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-07-15T10:00:00.000Z");

    await layBaoCaoThang(thoiDiem);

    expect(prismaMock.nganSach.findMany).toHaveBeenCalledWith({
      // 01/07/2026 00:00 VN == 2026-06-30T17:00:00.000Z.
      where: {
        thang: new Date("2026-06-30T17:00:00.000Z"),
        danhMucChiTieuId: { in: [1] },
      },
      select: { danhMucChiTieuId: true, hanMuc: true },
    });
  });

  it("không gọi prisma.nganSach.findMany khi tháng không có Danh mục nào có Chi", async () => {
    prismaMock.giaoDich.findMany.mockResolvedValue([]);

    await layBaoCaoThang();

    expect(prismaMock.nganSach.findMany).not.toHaveBeenCalled();
  });
});

/**
 * `layCanhBaoNganSachHienTai` (Story 11, CAP-6) — thẻ Chi tiêu ở Hôm nay.
 * Trọng tâm: I/O matrix của story (no Ngân sách at all / all healthy / one
 * or more in warning-or-over), cùng ngưỡng 30%-còn-lại với
 * `tinhCanhBaoNganSach()` (`actions.ts`).
 */
describe("layCanhBaoNganSachHienTai", () => {
  it("trả mảng rỗng khi chưa có NganSach nào tháng này (không gọi giaoDich.findMany)", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([]);

    const canhBao = await layCanhBaoNganSachHienTai();

    expect(canhBao).toEqual([]);
    expect(prismaMock.giaoDich.findMany).not.toHaveBeenCalled();
  });

  it("trả mảng rỗng khi có NganSach nhưng mọi Danh mục đều lành mạnh (dưới 70% hạn mức)", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 1,
        hanMuc: 1_000_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([
      { danhMucChiTieuId: 1, soTien: 500_000 },
    ]);

    const canhBao = await layCanhBaoNganSachHienTai();

    expect(canhBao).toEqual([]);
  });

  it("trả đúng Danh mục chạm ngưỡng cảnh báo (đã chi đúng 70% hạn mức)", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 1,
        hanMuc: 1_000_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([
      { danhMucChiTieuId: 1, soTien: 700_000 },
    ]);

    const canhBao = await layCanhBaoNganSachHienTai();

    expect(canhBao).toEqual([
      {
        danhMucChiTieuId: 1,
        tenDanhMuc: "Ăn uống",
        hanMuc: 1_000_000,
        daChi: 700_000,
        phanTramConLai: 30,
      },
    ]);
  });

  it("cộng dồn daChi từ NHIỀU Giao dịch cùng Danh mục trong tháng, không chỉ lấy hàng cuối", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 1,
        hanMuc: 1_000_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([
      { danhMucChiTieuId: 1, soTien: 300_000 },
      { danhMucChiTieuId: 1, soTien: 250_000 },
      { danhMucChiTieuId: 1, soTien: 200_000 },
    ]);

    const canhBao = await layCanhBaoNganSachHienTai();

    // Tổng 750_000 -> đúng 75% hạn mức, đã chạm ngưỡng cảnh báo (>=70%).
    expect(canhBao).toEqual([
      {
        danhMucChiTieuId: 1,
        tenDanhMuc: "Ăn uống",
        hanMuc: 1_000_000,
        daChi: 750_000,
        phanTramConLai: 25,
      },
    ]);
  });

  it("phanTramConLai làm tròn XUỐNG (về -vô cực) cho một tỷ lệ không tròn, không tròn về 0", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 1,
        hanMuc: 300_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([
      { danhMucChiTieuId: 1, soTien: 400_000 },
    ]);

    const canhBao = await layCanhBaoNganSachHienTai();

    // (300_000 - 400_000) / 300_000 * 100 = -33.333...% -> Math.floor -> -34
    // (không phải -33, vốn là kết quả nếu lỡ dùng Math.round/Math.trunc thay
    // vì Math.floor) — cùng hướng làm tròn với `tinhCanhBaoNganSach()`
    // (`actions.ts`), khớp docstring của `CanhBaoNganSach.phanTramConLai`.
    expect(canhBao[0]?.phanTramConLai).toBe(-34);
  });

  it("phanTramConLai âm khi đã chi vượt hạn mức", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 1,
        hanMuc: 1_000_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([
      { danhMucChiTieuId: 1, soTien: 1_200_000 },
    ]);

    const canhBao = await layCanhBaoNganSachHienTai();

    expect(canhBao).toEqual([
      {
        danhMucChiTieuId: 1,
        tenDanhMuc: "Ăn uống",
        hanMuc: 1_000_000,
        daChi: 1_200_000,
        phanTramConLai: -20,
      },
    ]);
  });

  it("chỉ trả các Danh mục chạm ngưỡng, bỏ qua Danh mục lành mạnh, sắp theo tên", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 2,
        hanMuc: 500_000,
        danhMucChiTieu: { ten: "Đi lại" },
      },
      {
        danhMucChiTieuId: 1,
        hanMuc: 1_000_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
      {
        danhMucChiTieuId: 3,
        hanMuc: 2_000_000,
        danhMucChiTieu: { ten: "Giải trí" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([
      // Đi lại: 400_000 / 500_000 = 80% -> cảnh báo.
      { danhMucChiTieuId: 2, soTien: 400_000 },
      // Ăn uống: 100_000 / 1_000_000 = 10% -> lành mạnh, bị lọc bỏ.
      { danhMucChiTieuId: 1, soTien: 100_000 },
      // Giải trí: 1_800_000 / 2_000_000 = 90% -> cảnh báo.
      { danhMucChiTieuId: 3, soTien: 1_800_000 },
    ]);

    const canhBao = await layCanhBaoNganSachHienTai();

    // Thứ tự theo `localeCompare()` mặc định (không truyền locale) — cùng quy
    // ước `layBaoCaoThang()` ở trên, không tự suy đoán một thứ tự "trực quan"
    // khác đi.
    expect(canhBao.map((c) => c.danhMucChiTieuId)).toEqual([2, 3]);
    expect(canhBao.map((c) => c.tenDanhMuc)).toEqual(["Đi lại", "Giải trí"]);
  });

  it("Danh mục có NganSach nhưng chưa có Giao dịch Chi nào tháng này -> daChi 0, không cảnh báo", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 1,
        hanMuc: 1_000_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([]);

    const canhBao = await layCanhBaoNganSachHienTai();

    expect(canhBao).toEqual([]);
  });

  it("lọc theo đúng ranh giới THÁNG VN của thoiDiem truyền vào, chỉ Giao dịch loai Chi", async () => {
    prismaMock.nganSach.findMany.mockResolvedValue([
      {
        danhMucChiTieuId: 1,
        hanMuc: 1_000_000,
        danhMucChiTieu: { ten: "Ăn uống" },
      },
    ]);
    prismaMock.giaoDich.findMany.mockResolvedValue([]);
    // 2026-07-15T10:00:00.000Z = 15/07/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-07-15T10:00:00.000Z");

    await layCanhBaoNganSachHienTai(thoiDiem);

    expect(prismaMock.nganSach.findMany).toHaveBeenCalledWith({
      // 01/07/2026 00:00 VN == 2026-06-30T17:00:00.000Z.
      where: { thang: new Date("2026-06-30T17:00:00.000Z") },
      include: { danhMucChiTieu: { select: { ten: true } } },
    });
    expect(prismaMock.giaoDich.findMany).toHaveBeenCalledWith({
      where: {
        loai: "Chi",
        danhMucChiTieuId: { in: [1] },
        ngay: {
          gte: new Date("2026-06-30T17:00:00.000Z"),
          // 01/08/2026 00:00 VN == 2026-07-31T17:00:00.000Z.
          lt: new Date("2026-07-31T17:00:00.000Z"),
        },
      },
      select: { danhMucChiTieuId: true, soTien: true },
    });
  });
});

const CANH_BAO_MAU: CanhBaoNganSach = {
  danhMucChiTieuId: 1,
  tenDanhMuc: "Ăn uống",
  hanMuc: 1_000_000,
  daChi: 800_000,
  phanTramConLai: 20,
};

/**
 * `xacDinhTrangThaiNganSach` (Story 11, `app/chi-tieu/model.ts`) — hàm THUẦN
 * đứng sau ba trạng thái của thẻ Chi tiêu ở Hôm nay. `canhBao` rỗng khớp cả
 * "chưa đặt Ngân sách" lẫn "đã đặt nhưng lành mạnh" — `coNganSach` là tín
 * hiệu DUY NHẤT phân biệt hai trạng thái đó (I/O matrix của story).
 */
describe("xacDinhTrangThaiNganSach", () => {
  it('trả "chua-dat" khi chưa có Danh mục nào có NganSach tháng này', () => {
    expect(xacDinhTrangThaiNganSach(false, [])).toBe("chua-dat");
  });

  it('trả "chua-dat" ngay cả khi canhBao (vô lý) không rỗng, vì coNganSach là tín hiệu quyết định', () => {
    // Trường hợp không nên xảy ra trong thực tế (canhBao chỉ có phần tử khi
    // đã có NganSach) — chốt rằng hàm tin vào `coNganSach` trước, không tự
    // suy luận lại từ độ dài `canhBao`.
    expect(xacDinhTrangThaiNganSach(false, [CANH_BAO_MAU])).toBe("chua-dat");
  });

  it('trả "lanh-manh" khi đã có NganSach nhưng không Danh mục nào chạm ngưỡng', () => {
    expect(xacDinhTrangThaiNganSach(true, [])).toBe("lanh-manh");
  });

  it('trả "canh-bao" khi có ÍT NHẤT một Danh mục chạm ngưỡng/vượt', () => {
    expect(xacDinhTrangThaiNganSach(true, [CANH_BAO_MAU])).toBe("canh-bao");
  });

  it('trả "canh-bao" khi có NHIỀU Danh mục cùng chạm ngưỡng', () => {
    expect(
      xacDinhTrangThaiNganSach(true, [
        CANH_BAO_MAU,
        { ...CANH_BAO_MAU, danhMucChiTieuId: 2, tenDanhMuc: "Đi lại" },
      ]),
    ).toBe("canh-bao");
  });
});
