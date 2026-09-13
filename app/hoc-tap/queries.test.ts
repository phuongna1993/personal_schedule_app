import { beforeEach, describe, expect, it, vi } from "vitest";
import { layMocNgayVN, themNgay } from "@/lib/ngayVn";

/**
 * Unit test cho đường ĐỌC của module Học tập (CAP-12, Story 9):
 * `layThangSomNhatHocTap`, `layLichSuThang`, `tinhStreak`.
 *
 * Trọng tâm — mọi hàng ở I/O & Edge-Case Matrix của story:
 *  1. `tinhStreak` dedupe nhiều Buổi học cùng ngày, đi lùi từ hôm nay, và
 *     KHÔNG đứt streak khi hôm nay chưa có Buổi học (chỉ mới "chưa qua").
 *  2. `layLichSuThang` lọc đúng ranh giới tháng VN + đúng `kyNang`, cộng dồn
 *     TẤT CẢ các hàng (kể cả nhiều hàng cùng ngày) vào `tongThoiLuongPhut`.
 *  3. `layThangSomNhatHocTap` không lọc theo `kyNang` (gộp cả hai Kỹ năng).
 *
 * Prisma được mock để test chạy thuần in-memory, không đụng `app-data/db.sqlite`.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    buoiHoc: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { layThangSomNhatHocTap, layLichSuThang, tinhStreak } = await import(
  "./queries"
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("layThangSomNhatHocTap", () => {
  it("trả null khi chưa có BuoiHoc nào (ở cả hai Kỹ năng)", async () => {
    prismaMock.buoiHoc.findFirst.mockResolvedValue(null);

    expect(await layThangSomNhatHocTap()).toBeNull();
  });

  it("quy BuoiHoc sớm nhất về mốc ĐẦU THÁNG (VN) chứa nó, không phải mốc ngày", async () => {
    // 15/07/2026 giờ VN.
    prismaMock.buoiHoc.findFirst.mockResolvedValue({
      ngay: new Date("2026-07-14T17:00:00.000Z"),
    });

    const thang = await layThangSomNhatHocTap();

    // 01/07/2026 00:00 VN == 2026-06-30T17:00:00.000Z.
    expect(thang?.getTime()).toBe(
      new Date("2026-06-30T17:00:00.000Z").getTime(),
    );
  });

  it("không lọc theo kyNang — gộp BuoiHoc của cả hai Kỹ năng", async () => {
    prismaMock.buoiHoc.findFirst.mockResolvedValue(null);

    await layThangSomNhatHocTap();

    expect(prismaMock.buoiHoc.findFirst).toHaveBeenCalledWith({
      orderBy: { ngay: "asc" },
    });
  });
});

describe("layLichSuThang", () => {
  it("trả rỗng và tổng 0 khi tháng chưa có BuoiHoc nào", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([]);

    const du = await layLichSuThang("TiengAnh");

    expect(du.buoiHoc).toEqual([]);
    expect(du.tongThoiLuongPhut).toBe(0);
  });

  it("lọc theo đúng kyNang và ranh giới tháng VN [dauThang, dauThangKeTiep)", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([]);
    // 2026-08-15T10:00:00.000Z = 15/08/2026 17:00 giờ VN.
    const thoiDiem = new Date("2026-08-15T10:00:00.000Z");

    await layLichSuThang("AutomationTest", thoiDiem);

    expect(prismaMock.buoiHoc.findMany).toHaveBeenCalledWith({
      where: {
        kyNang: "AutomationTest",
        ngay: {
          // 01/08/2026 00:00 VN == 2026-07-31T17:00:00.000Z.
          gte: new Date("2026-07-31T17:00:00.000Z"),
          // 01/09/2026 00:00 VN == 2026-08-31T17:00:00.000Z.
          lt: new Date("2026-08-31T17:00:00.000Z"),
        },
      },
      orderBy: [{ ngay: "desc" }, { id: "desc" }],
    });
  });

  it("cộng dồn tongThoiLuongPhut kể cả nhiều hàng cùng ngày", async () => {
    const homNay = layMocNgayVN();
    prismaMock.buoiHoc.findMany.mockResolvedValue([
      {
        id: 1,
        kyNang: "TiengAnh",
        noiDung: "Ôn từ vựng",
        thoiLuongPhut: 20,
        ngay: homNay,
      },
      {
        id: 2,
        kyNang: "TiengAnh",
        noiDung: "Nghe podcast",
        thoiLuongPhut: 15,
        ngay: homNay,
      },
    ]);

    const du = await layLichSuThang("TiengAnh");

    expect(du.tongThoiLuongPhut).toBe(35);
    expect(du.buoiHoc).toHaveLength(2);
  });

  it("chuẩn hoá kyNang ngoài union cố định về TiengAnh ở biên đọc", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([
      {
        id: 1,
        kyNang: "rác",
        noiDung: "x",
        thoiLuongPhut: 10,
        ngay: new Date(),
      },
    ]);

    const du = await layLichSuThang("TiengAnh");

    expect(du.buoiHoc[0].kyNang).toBe("TiengAnh");
  });
});

describe("tinhStreak", () => {
  const homNay = () => layMocNgayVN();
  const homQua = () => themNgay(homNay(), -1);
  const homKiaNua = () => themNgay(homNay(), -2);
  const baNgayTruoc = () => themNgay(homNay(), -3);

  it("streak = 0 khi Kỹ năng chưa có BuoiHoc nào", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([]);

    expect(await tinhStreak("TiengAnh")).toBe(0);
  });

  it("streak = 1 khi chỉ có một Buổi học hôm nay", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([{ ngay: homNay() }]);

    expect(await tinhStreak("TiengAnh")).toBe(1);
  });

  it("streak = 2 khi có Buổi học hôm nay và hôm qua (hai ngày liên tiếp)", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([
      { ngay: homNay() },
      { ngay: homQua() },
    ]);

    expect(await tinhStreak("TiengAnh")).toBe(2);
  });

  it("streak = 2 khi hôm qua và hôm kia có Buổi học nhưng hôm nay chưa (chưa đứt)", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([
      { ngay: homQua() },
      { ngay: homKiaNua() },
    ]);

    expect(await tinhStreak("TiengAnh")).toBe(2);
  });

  it("streak = 0 khi có khoảng trống (chỉ có 3 ngày trước, không có hôm qua/hôm nay)", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([{ ngay: baNgayTruoc() }]);

    expect(await tinhStreak("TiengAnh")).toBe(0);
  });

  it("hai Buổi học cùng ngày chỉ tính một lần cho streak", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([
      { ngay: homNay() },
      { ngay: homNay() },
    ]);

    expect(await tinhStreak("TiengAnh")).toBe(1);
  });

  it("lọc theo đúng kyNang truyền vào", async () => {
    prismaMock.buoiHoc.findMany.mockResolvedValue([]);

    await tinhStreak("AutomationTest");

    expect(prismaMock.buoiHoc.findMany).toHaveBeenCalledWith({
      where: { kyNang: "AutomationTest" },
      select: { ngay: true },
    });
  });

  /**
   * Test "lọc theo đúng kyNang" ở trên chỉ xác nhận THAM SỐ gửi cho Prisma —
   * không bắt được lỗi kiểu "vẫn gọi đúng where nhưng lỡ tính streak trên dữ
   * liệu sai" (ví dụ copy-paste nhầm biến). Test này mock `findMany` theo
   * đúng hành vi Prisma thật (trả hàng KHÁC NHAU tuỳ `where.kyNang` được
   * truyền vào) rồi so KẾT QUẢ STREAK — dựng dữ liệu sao cho nếu filter bị
   * rớt/sai, con số trả về sẽ LỘ RA NGAY (2 so với 0), không phải một phép so
   * sánh trùng lặp với test where ở trên.
   */
  it("hai Kỹ năng độc lập — streak tính đúng theo đúng kyNang, không lẫn dữ liệu của nhau", async () => {
    const homNay = layMocNgayVN();
    const homQua = themNgay(homNay, -1);
    const baNgayTruoc = themNgay(homNay, -3);

    prismaMock.buoiHoc.findMany.mockImplementation(
      async ({ where }: { where: { kyNang: string } }) => {
        if (where.kyNang === "AutomationTest") {
          // 2 ngày liên tiếp (hôm nay + hôm qua) -> streak kỳ vọng = 2.
          return [{ ngay: homNay }, { ngay: homQua }];
        }
        if (where.kyNang === "TiengAnh") {
          // Có khoảng trống (3 ngày trước, không có hôm qua/hôm nay) -> streak
          // kỳ vọng = 0 (cùng quy tắc "Gap in history" ở trên).
          return [{ ngay: baNgayTruoc }];
        }
        throw new Error(`kyNang không mong đợi trong where: ${where.kyNang}`);
      },
    );

    // Nếu `tinhStreak` lỡ đọc nhầm dữ liệu Kỹ năng kia (ví dụ hard-code sai
    // where, hoặc trộn kết quả của cả hai lần gọi), một trong hai assertion
    // dưới đây sẽ fail vì 2 Kỹ năng cho ra hai con số streak khác hẳn nhau.
    expect(await tinhStreak("AutomationTest")).toBe(2);
    expect(await tinhStreak("TiengAnh")).toBe(0);
  });
});
