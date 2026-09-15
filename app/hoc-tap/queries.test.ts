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
    moc: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    baiTestDanhGia: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  layThangSomNhatHocTap,
  layLichSuThang,
  tinhStreak,
  damBaoMocDaKhoiTao,
  layMocHienTai,
  layLoTrinh,
} = await import("./queries");

beforeEach(() => {
  vi.clearAllMocks();

  // Mặc định cho `damBaoMocDaKhoiTao()` — gọi ngầm ở đầu MỌI hàm đọc Lộ
  // trình dưới đây. Giá trị trả về không được đọc lại ở nơi gọi (chỉ dùng để
  // seed), nên một hình dạng tối thiểu là đủ.
  prismaMock.moc.upsert.mockImplementation(
    async ({ create }: { create: { kyNang: string; thuTu: number } }) => ({
      id: create.thuTu,
      ngayHoanThanh: null,
      ...create,
    }),
  );
  prismaMock.baiTestDanhGia.count.mockResolvedValue(0);
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

/**
 * Unit test cho Lộ trình & Mốc (CAP-13, Story 10): `damBaoMocDaKhoiTao`,
 * `layMocHienTai`, `layLoTrinh`. Trọng tâm — mọi hàng liên quan ở I/O &
 * Edge-Case Matrix của story (10-lo-trinh-va-moc.md).
 */
describe("damBaoMocDaKhoiTao", () => {
  it("upsert đúng 10 slot cố định (3 TiengAnh + 7 AutomationTest), trên khoá (kyNang, thuTu)", async () => {
    await damBaoMocDaKhoiTao();

    expect(prismaMock.moc.upsert).toHaveBeenCalledTimes(10);
    expect(prismaMock.moc.upsert).toHaveBeenCalledWith({
      where: { kyNang_thuTu: { kyNang: "TiengAnh", thuTu: 1 } },
      create: { kyNang: "TiengAnh", thuTu: 1 },
      update: {},
    });
    expect(prismaMock.moc.upsert).toHaveBeenCalledWith({
      where: { kyNang_thuTu: { kyNang: "TiengAnh", thuTu: 3 } },
      create: { kyNang: "TiengAnh", thuTu: 3 },
      update: {},
    });
    expect(prismaMock.moc.upsert).toHaveBeenCalledWith({
      where: { kyNang_thuTu: { kyNang: "AutomationTest", thuTu: 7 } },
      create: { kyNang: "AutomationTest", thuTu: 7 },
      update: {},
    });
    // `update: {}` trên mọi lệnh — gọi lại nhiều lần không bao giờ ghi đè
    // trạng thái Hoàn thành đã có (idempotent).
    for (const call of prismaMock.moc.upsert.mock.calls) {
      expect(call[0].update).toEqual({});
    }
  });
});

describe("layMocHienTai", () => {
  it("seed trước khi đọc, rồi trả Mốc thuTu nhỏ nhất chưa Hoàn thành", async () => {
    prismaMock.moc.findFirst.mockResolvedValue({ id: 5, thuTu: 1 });

    const ketQua = await layMocHienTai("TiengAnh");

    expect(prismaMock.moc.upsert).toHaveBeenCalled();
    expect(prismaMock.moc.findFirst).toHaveBeenCalledWith({
      where: { kyNang: "TiengAnh", ngayHoanThanh: null },
      orderBy: { thuTu: "asc" },
      select: { id: true, thuTu: true },
    });
    expect(ketQua).toEqual({ id: 5, thuTu: 1 });
  });

  it("All Mốc completed for a Kỹ năng: trả null (terminal state)", async () => {
    prismaMock.moc.findFirst.mockResolvedValue(null);

    expect(await layMocHienTai("AutomationTest")).toBeNull();
  });

  it("lọc theo đúng kyNang truyền vào", async () => {
    prismaMock.moc.findFirst.mockResolvedValue(null);

    await layMocHienTai("AutomationTest");

    expect(prismaMock.moc.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kyNang: "AutomationTest", ngayHoanThanh: null } }),
    );
  });
});

type MocHangGia = {
  id: number;
  kyNang: string;
  thuTu: number;
  ngayHoanThanh: Date | null;
};

/**
 * `layLoTrinh()` giờ gọi `layMocHienTai()` thay vì tự `rows.find(...)` lại
 * (fix cho finding #1 của code review) — nên `findMany` VÀ `findFirst` giờ
 * PHẢI được mock nhất quán với nhau trong mọi test dưới đây, y như Prisma
 * thật sẽ trả về nhất quán từ cùng một bảng. Helper này tính "Mốc hiện tại"
 * kỳ vọng (thuTu nhỏ nhất, `ngayHoanThanh` null) từ CHÍNH mảng `rows` rồi
 * mock cả hai lời gọi cùng lúc — một mock rời rạc/không khớp sẽ khiến test
 * tự mâu thuẫn ngay, thay vì âm thầm pass với dữ liệu giả không nhất quán.
 */
function moPhongMocData(rows: MocHangGia[]): void {
  prismaMock.moc.findMany.mockResolvedValue(rows);

  const hienTai = [...rows]
    .filter((r) => r.ngayHoanThanh === null)
    .sort((a, b) => a.thuTu - b.thuTu)[0];
  prismaMock.moc.findFirst.mockResolvedValue(
    hienTai ? { id: hienTai.id, thuTu: hienTai.thuTu } : null,
  );
}

describe("layLoTrinh", () => {
  it("First visit, no Mốc seeded yet: sau seed, Mốc 1 (AutomationTest) và A1 (TiengAnh) là hiện tại", async () => {
    const rowsTheoKyNang = (kyNang: string): MocHangGia[] => {
      const soLuong = kyNang === "TiengAnh" ? 3 : 7;
      return Array.from({ length: soLuong }, (_, i) => ({
        id: i + 1,
        kyNang,
        thuTu: i + 1,
        ngayHoanThanh: null,
      }));
    };
    prismaMock.moc.findMany.mockImplementation(
      async ({ where }: { where: { kyNang: string } }) =>
        rowsTheoKyNang(where.kyNang),
    );
    prismaMock.moc.findFirst.mockImplementation(
      async ({ where }: { where: { kyNang: string } }) => {
        const [dau] = rowsTheoKyNang(where.kyNang);
        return dau ? { id: dau.id, thuTu: dau.thuTu } : null;
      },
    );

    const loTrinhAT = await layLoTrinh("AutomationTest");
    expect(loTrinhAT.moc).toHaveLength(7);
    expect(loTrinhAT.mocHienTaiId).toBe(1);
    expect(loTrinhAT.moc[0].ten).toBe("Nền tảng Python + SQL");

    const loTrinhTA = await layLoTrinh("TiengAnh");
    expect(loTrinhTA.moc).toHaveLength(3);
    expect(loTrinhTA.mocHienTaiId).toBe(1);
    expect(loTrinhTA.moc[0].ten).toBe("A1");
  });

  it("merge tiêu đề cố định + trạng thái DB — Mốc đã Hoàn thành giữ nguyên ngayHoanThanh, Mốc kế tiếp là hiện tại", async () => {
    moPhongMocData([
      {
        id: 1,
        kyNang: "AutomationTest",
        thuTu: 1,
        ngayHoanThanh: new Date("2026-09-01T00:00:00.000Z"),
      },
      { id: 2, kyNang: "AutomationTest", thuTu: 2, ngayHoanThanh: null },
      { id: 3, kyNang: "AutomationTest", thuTu: 3, ngayHoanThanh: null },
    ]);

    const loTrinh = await layLoTrinh("AutomationTest");

    expect(loTrinh.moc[0]).toMatchObject({
      ten: "Nền tảng Python + SQL",
      ngayHoanThanh: new Date("2026-09-01T00:00:00.000Z"),
    });
    expect(loTrinh.mocHienTaiId).toBe(2);
    // Mốc hiện tại phải tới từ `layMocHienTai()` — cùng lời gọi/shape mà
    // `layMocHienTai`'s own test bên trên xác nhận, không phải một lần suy
    // luận thứ hai (finding #1).
    expect(prismaMock.moc.findFirst).toHaveBeenCalledWith({
      where: { kyNang: "AutomationTest", ngayHoanThanh: null },
      orderBy: { thuTu: "asc" },
      select: { id: true, thuTu: true },
    });
  });

  it("Tiếng Anh: coDiemBaiTest=true cho Mốc HIỆN TẠI khi đã có ít nhất một BaiTestDanhGia", async () => {
    moPhongMocData([
      { id: 1, kyNang: "TiengAnh", thuTu: 1, ngayHoanThanh: null },
      { id: 2, kyNang: "TiengAnh", thuTu: 2, ngayHoanThanh: null },
      { id: 3, kyNang: "TiengAnh", thuTu: 3, ngayHoanThanh: null },
    ]);
    prismaMock.baiTestDanhGia.count.mockResolvedValue(2);

    const loTrinh = await layLoTrinh("TiengAnh");

    expect(prismaMock.baiTestDanhGia.count).toHaveBeenCalledWith({
      where: { mocId: 1 },
    });
    expect(loTrinh.moc[0].coDiemBaiTest).toBe(true);
    // Chỉ Mốc hiện tại được đánh dấu — các Mốc còn lại luôn false, không
    // phải một history đầy đủ (Boundaries: no dedicated Điểm số history).
    expect(loTrinh.moc[1].coDiemBaiTest).toBe(false);
    expect(loTrinh.moc[2].coDiemBaiTest).toBe(false);
  });

  it("Automation Test's score-entry path: không bao giờ gọi baiTestDanhGia.count, coDiemBaiTest luôn false", async () => {
    moPhongMocData([
      { id: 1, kyNang: "AutomationTest", thuTu: 1, ngayHoanThanh: null },
    ]);

    const loTrinh = await layLoTrinh("AutomationTest");

    expect(prismaMock.baiTestDanhGia.count).not.toHaveBeenCalled();
    expect(loTrinh.moc[0].coDiemBaiTest).toBe(false);
  });

  it("All Mốc completed for a Kỹ năng: mocHienTaiId null, không gọi baiTestDanhGia.count", async () => {
    moPhongMocData([
      {
        id: 1,
        kyNang: "TiengAnh",
        thuTu: 1,
        ngayHoanThanh: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: 2,
        kyNang: "TiengAnh",
        thuTu: 2,
        ngayHoanThanh: new Date("2026-02-01T00:00:00.000Z"),
      },
      {
        id: 3,
        kyNang: "TiengAnh",
        thuTu: 3,
        ngayHoanThanh: new Date("2026-03-01T00:00:00.000Z"),
      },
    ]);

    const loTrinh = await layLoTrinh("TiengAnh");

    expect(loTrinh.mocHienTaiId).toBeNull();
    expect(prismaMock.baiTestDanhGia.count).not.toHaveBeenCalled();
    expect(loTrinh.moc.every((m) => m.coDiemBaiTest === false)).toBe(true);
  });
});
