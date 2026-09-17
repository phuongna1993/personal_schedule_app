import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho Server Action của module Học tập.
 *
 * Trọng tâm: I/O & Edge-Case Matrix của story (8-ghi-buoi-hoc.md, cập nhật
 * bởi 13-nhap-gio-buoi-hoc.md) —
 *  - Log a session for Tiếng Anh / Automation Test: hai Kỹ năng độc lập
 *    hoàn toàn, không action nào đọc/ghi chéo Kỹ năng còn lại.
 *  - Empty nội dung (rỗng/chỉ khoảng trắng) -> `NOI_DUNG_TRONG`.
 *  - `gioBatDau`/`gioKetThuc` (Story 13) — server tự tính `thoiLuongPhut` từ
 *    hai chuỗi `"HH:mm"`, không nhận thời lượng đã tính sẵn từ client; giờ
 *    kết thúc phải strictly sau giờ bắt đầu, không hỗ trợ overnight wrap.
 *  - Log twice cùng một Kỹ năng -> hai hàng độc lập, không hàng nào bị ghi
 *    đè.
 *  - `ngay` luôn stamp bằng `layMocNgayVN()` tại thời điểm ghi — không có
 *    trường ngày nhận từ client.
 *
 * Prisma và `next/cache` được mock để test chạy thuần in-memory, không đụng
 * vào `app-data/db.sqlite` thật.
 */

const { prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  prismaMock: {
    buoiHoc: {
      create: vi.fn(),
    },
    moc: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    baiTestDanhGia: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { ghiBuoiHoc, hoanThanhMoc, ghiDiemBaiTest } = await import("./actions");
const { biChanHoanThanhBoiGateDiem } = await import("./model");
// `layLichSuDiemBaiTest()` (CAP-12, Story 12) sống ở `./queries`, không phải
// `./actions` — import riêng để test round-trip ghi/đọc bên dưới, dùng
// CHUNG `prismaMock` ở trên (cùng module registry của file test này) với
// `ghiDiemBaiTest()`.
const { layLichSuDiemBaiTest } = await import("./queries");

const BUOI_HOC_TIENG_ANH_HOP_LE = {
  kyNang: "TiengAnh",
  noiDung: "Ôn 20 từ vựng chủ đề du lịch",
  // 20:00 -> 20:30 == 30 phút, khớp `hangBuoiHocPrisma()`'s default bên dưới.
  gioBatDau: "20:00",
  gioKetThuc: "20:30",
};

const BUOI_HOC_AUTOMATION_HOP_LE = {
  kyNang: "AutomationTest",
  noiDung: "Học Playwright locators",
  // 20:00 -> 20:45 == 45 phút.
  gioBatDau: "20:00",
  gioKetThuc: "20:45",
};

let demId = 0;

function hangBuoiHocPrisma(overrides: Record<string, unknown> = {}) {
  return {
    id: ++demId,
    kyNang: "TiengAnh",
    noiDung: "Ôn 20 từ vựng chủ đề du lịch",
    thoiLuongPhut: 30,
    ngay: new Date("2026-09-12T17:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  demId = 0;
  prismaMock.buoiHoc.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) =>
      hangBuoiHocPrisma(data),
  );

  // Mặc định cho `damBaoMocDaKhoiTao()` — được gọi ngầm ở đầu MỌI action Lộ
  // trình (CAP-13). Giá trị `upsert` trả về không được action nào đọc lại
  // (chỉ dùng để seed), nên một hình dạng tối thiểu là đủ cho mọi test dưới
  // đây không cần tự mock lại riêng.
  prismaMock.moc.upsert.mockImplementation(
    async ({ create }: { create: { kyNang: string; thuTu: number } }) => ({
      id: create.thuTu,
      kyNang: create.kyNang,
      thuTu: create.thuTu,
      ngayHoanThanh: null,
    }),
  );
  // Mặc định: hàng khớp `where` (đường thường — hàng chưa Hoàn thành tại
  // thời điểm ghi). Test riêng cho race double-completion tự override thành
  // `{ count: 0 }` để mô phỏng "hàng đã bị một lượt gọi khác ghi mất trước".
  prismaMock.moc.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.baiTestDanhGia.count.mockResolvedValue(0);
});

describe("ghiBuoiHoc — Log a session for Tiếng Anh", () => {
  it("ghi Buổi học hợp lệ cho Tiếng Anh, revalidate /hoc-tap", async () => {
    const ketQua = await ghiBuoiHoc(BUOI_HOC_TIENG_ANH_HOP_LE);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toMatchObject({
      kyNang: "TiengAnh",
      noiDung: "Ôn 20 từ vựng chủ đề du lịch",
      thoiLuongPhut: 30,
    });
    expect(prismaMock.buoiHoc.create).toHaveBeenCalledWith({
      data: {
        kyNang: "TiengAnh",
        noiDung: "Ôn 20 từ vựng chủ đề du lịch",
        thoiLuongPhut: 30,
        ngay: expect.any(Date),
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/hoc-tap");
  });

  it("ngay luôn stamp bằng layMocNgayVN() tại thời điểm ghi, không nhận từ client", async () => {
    vi.useFakeTimers();
    // 12/09/2026 20:00 giờ VN -> mốc ngày 00:00 VN cùng ngày.
    vi.setSystemTime(new Date("2026-09-12T13:00:00.000Z"));

    try {
      await ghiBuoiHoc({
        ...BUOI_HOC_TIENG_ANH_HOP_LE,
        // Dù client có cố gửi kèm một trường `ngay` lạ, kiểu `unknown` của
        // action bỏ qua nó hoàn toàn — không có trường ngày nào được đọc.
        ngay: "2020-01-01",
      });

      expect(prismaMock.buoiHoc.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          // 12/09/2026 00:00 VN == 2026-09-11T17:00:00.000Z.
          ngay: new Date("2026-09-11T17:00:00.000Z"),
        }),
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ghiBuoiHoc — Log a session for Automation Test", () => {
  it("ghi Buổi học hợp lệ cho Automation Test, độc lập với Tiếng Anh", async () => {
    const ketQua = await ghiBuoiHoc(BUOI_HOC_AUTOMATION_HOP_LE);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toMatchObject({
      kyNang: "AutomationTest",
      noiDung: "Học Playwright locators",
      thoiLuongPhut: 45,
    });
    expect(prismaMock.buoiHoc.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kyNang: "AutomationTest" }),
    });
  });

  it("Automation Test dùng cùng validation giờ bắt đầu/kết thúc như Tiếng Anh — hành vi giống hệt", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_AUTOMATION_HOP_LE,
      gioBatDau: "20:00",
      gioKetThuc: "20:00",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn kyNang không hợp lệ (không phải TiengAnh/AutomationTest)", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      kyNang: "Toan",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KY_NANG_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("kyNang");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });
});

describe("ghiBuoiHoc — Empty nội dung", () => {
  it("chặn nội dung rỗng, không tạo hàng nào", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      noiDung: "",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NOI_DUNG_TRONG");
    expect(ketQua.error.field).toBe("noiDung");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("coi nội dung chỉ có khoảng trắng là rỗng", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      noiDung: "   \n\t ",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NOI_DUNG_TRONG");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("trim nội dung trước khi lưu", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      noiDung: "  Ôn ngữ pháp  ",
    });

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.buoiHoc.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ noiDung: "Ôn ngữ pháp" }),
      }),
    );
  });

  it("chặn nội dung vượt quá 500 ký tự, chấp nhận đúng 500 ký tự", async () => {
    const quaDai = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      noiDung: "a".repeat(501),
    });
    expect(quaDai.ok).toBe(false);
    if (quaDai.ok) throw new Error("unreachable");
    expect(quaDai.error.code).toBe("NOI_DUNG_QUA_DAI");
    expect(quaDai.error.field).toBe("noiDung");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();

    const dungMuc = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      noiDung: "a".repeat(500),
    });
    expect(dungMuc.ok).toBe(true);
  });
});

describe("ghiBuoiHoc — Giờ bắt đầu/kết thúc (Story 13)", () => {
  it("chặn giờ kết thúc bằng giờ bắt đầu", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "20:00",
      gioKetThuc: "20:00",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU");
    expect(ketQua.error.field).toBe("gioKetThuc");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn giờ kết thúc trước giờ bắt đầu — không hỗ trợ overnight wraparound", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "23:00",
      gioKetThuc: "00:30",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn giờ bắt đầu rỗng/thiếu", async () => {
    const rong = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "",
    });
    expect(rong.ok).toBe(false);
    if (rong.ok) throw new Error("unreachable");
    expect(rong.error.code).toBe("GIO_BAT_DAU_KHONG_HOP_LE");
    expect(rong.error.field).toBe("gioBatDau");

    const { gioBatDau: _boQua, ...thieuGioBatDau } = BUOI_HOC_TIENG_ANH_HOP_LE;
    void _boQua;
    const thieu = await ghiBuoiHoc(thieuGioBatDau);
    expect(thieu.ok).toBe(false);
    if (thieu.ok) throw new Error("unreachable");
    expect(thieu.error.code).toBe("GIO_BAT_DAU_KHONG_HOP_LE");

    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn giờ kết thúc rỗng/thiếu", async () => {
    const rong = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioKetThuc: "",
    });
    expect(rong.ok).toBe(false);
    if (rong.ok) throw new Error("unreachable");
    expect(rong.error.code).toBe("GIO_KET_THUC_KHONG_HOP_LE");
    expect(rong.error.field).toBe("gioKetThuc");

    const { gioKetThuc: _boQua, ...thieuGioKetThuc } =
      BUOI_HOC_TIENG_ANH_HOP_LE;
    void _boQua;
    const thieu = await ghiBuoiHoc(thieuGioKetThuc);
    expect(thieu.ok).toBe(false);
    if (thieu.ok) throw new Error("unreachable");
    expect(thieu.error.code).toBe("GIO_KET_THUC_KHONG_HOP_LE");

    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn chuỗi giờ bắt đầu sai định dạng (không phải HH:mm), TRƯỚC khi chạm Prisma", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "8pm",
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GIO_BAT_DAU_KHONG_HOP_LE");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn chuỗi giờ kết thúc sai định dạng (không phải HH:mm), với giờ bắt đầu hợp lệ", async () => {
    const chuoiKhongPhaiSo = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "20:00",
      gioKetThuc: "abc",
    });
    expect(chuoiKhongPhaiSo.ok).toBe(false);
    if (chuoiKhongPhaiSo.ok) throw new Error("unreachable");
    expect(chuoiKhongPhaiSo.error.code).toBe("GIO_KET_THUC_KHONG_HOP_LE");
    expect(chuoiKhongPhaiSo.error.field).toBe("gioKetThuc");

    const phutVuotNgoai = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "20:00",
      gioKetThuc: "20:60",
    });
    expect(phutVuotNgoai.ok).toBe(false);
    if (phutVuotNgoai.ok) throw new Error("unreachable");
    expect(phutVuotNgoai.error.code).toBe("GIO_KET_THUC_KHONG_HOP_LE");

    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chấp nhận buổi học trọn ngày 00:00 -> 23:59, thoiLuongPhut = 1439", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "00:00",
      gioKetThuc: "23:59",
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.thoiLuongPhut).toBe(1439);
  });

  it("chấp nhận cận dưới 1 phút: 20:00 -> 20:01, thoiLuongPhut = 1", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      gioBatDau: "20:00",
      gioKetThuc: "20:01",
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.thoiLuongPhut).toBe(1);
  });

  it("bỏ qua/từ chối một thoiLuongPhut client tự tính gửi kèm — server chỉ đọc gioBatDau/gioKetThuc", async () => {
    const ketQua = await ghiBuoiHoc({
      kyNang: "TiengAnh",
      noiDung: "Ôn ngữ pháp",
      thoiLuongPhut: 999,
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    // Không có gioBatDau/gioKetThuc trong payload này -> từ chối ở bước
    // kiểm tra giờ bắt đầu, thoiLuongPhut gửi kèm không bao giờ được đọc.
    expect(ketQua.error.code).toBe("GIO_BAT_DAU_KHONG_HOP_LE");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("một thoiLuongPhut client tự tính gửi kèm CÙNG với gioBatDau/gioKetThuc hợp lệ bị bỏ qua hoàn toàn — hàng ghi vẫn dùng giá trị server tự tính", async () => {
    const ketQua = await ghiBuoiHoc({
      kyNang: "TiengAnh",
      noiDung: "Ôn ngữ pháp",
      gioBatDau: "20:00",
      gioKetThuc: "20:30",
      // Giá trị giả mạo — nếu server lỡ đọc trường này thay vì tự tính,
      // hàng ghi sẽ sai thành 9999 thay vì 30.
      thoiLuongPhut: 9999,
    });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.thoiLuongPhut).toBe(30);
    expect(prismaMock.buoiHoc.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ thoiLuongPhut: 30 }),
    });
  });
});

describe("ghiBuoiHoc — Log twice in a row for the same Kỹ năng", () => {
  it("hai lượt ghi liên tiếp cho cùng Kỹ năng tạo hai hàng độc lập, không ghi đè", async () => {
    const lanMot = await ghiBuoiHoc(BUOI_HOC_TIENG_ANH_HOP_LE);
    const lanHai = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      noiDung: "Luyện nghe podcast",
      thoiLuongPhut: 20,
    });

    expect(lanMot.ok).toBe(true);
    expect(lanHai.ok).toBe(true);
    if (!lanMot.ok || !lanHai.ok) throw new Error("unreachable");

    expect(lanMot.data.id).not.toBe(lanHai.data.id);
    expect(lanMot.data.noiDung).toBe("Ôn 20 từ vựng chủ đề du lịch");
    expect(lanHai.data.noiDung).toBe("Luyện nghe podcast");
    expect(prismaMock.buoiHoc.create).toHaveBeenCalledTimes(2);
  });
});

describe("payload thô từ HTTP (kiểu bị xoá ở runtime)", () => {
  const RAC = [null, undefined, "chuỗi", 42, [], true];

  it.each(RAC)(
    "ghiBuoiHoc chặn payload %o trước khi chạm thuộc tính",
    async (rac) => {
      const ketQua = await ghiBuoiHoc(rac as never);

      expect(ketQua.ok).toBe(false);
      if (ketQua.ok) throw new Error("unreachable");
      expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
      expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
    },
  );

  it("một object hợp dạng nhưng THIẾU HẲN key kyNang -> KY_NANG_KHONG_HOP_LE, không tạo gì", async () => {
    // Khác với payload rác ở trên (không phải object/array/kiểu nguyên
    // thuỷ) — đây là một object hợp lệ về hình dạng nhưng thiếu hẳn key
    // `kyNang` (không phải `kyNang: undefined`, mà key không tồn tại), mô
    // phỏng đúng payload lỗi client thực tế (ví dụ quên gán state) thay vì
    // chỉ test giá trị `undefined` tường minh.
    const { kyNang: _boQua, ...thieuKyNang } = BUOI_HOC_TIENG_ANH_HOP_LE;
    void _boQua;

    const ketQua = await ghiBuoiHoc(thieuKyNang);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KY_NANG_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("kyNang");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });
});

describe("ghiBuoiHoc — lỗi hệ thống", () => {
  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.buoiHoc.create.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await ghiBuoiHoc(BUOI_HOC_TIENG_ANH_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

/**
 * Unit test cho Lộ trình & Mốc (CAP-13, Story 10) — `hoanThanhMoc()`,
 * `ghiDiemBaiTest()`. Trọng tâm: I/O & Edge-Case Matrix của story
 * (10-lo-trinh-va-moc.md).
 *
 * `hoanThanhMoc` là MỘT action DUY NHẤT cho cả hai Kỹ năng — mọi test dưới
 * đây gọi đúng một hàm này cho cả AutomationTest lẫn TiengAnh, không có
 * biến thể riêng theo Kỹ năng nào khác được import (Acceptance Criteria:
 * "grepped for hoanThanhMoc, exactly one exported function").
 */
describe("hoanThanhMoc — Automation Test (không cần Bài test)", () => {
  it("hoàn thành Mốc hiện tại của Automation Test dù chưa có BaiTestDanhGia nào (gate chỉ áp cho Tiếng Anh)", async () => {
    const mocHienTai = {
      id: 10,
      kyNang: "AutomationTest",
      thuTu: 1,
      ngayHoanThanh: null,
    };
    prismaMock.moc.findUnique.mockResolvedValue(mocHienTai);
    prismaMock.moc.findFirst.mockResolvedValue({ id: 10, thuTu: 1 });

    const ketQua = await hoanThanhMoc(10);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toEqual({ mocId: 10 });
    // Gate chỉ chạm baiTestDanhGia khi kyNang === "TiengAnh" — Automation
    // Test không bao giờ chạm nhánh kiểm tra này (Acceptance Criteria).
    expect(prismaMock.baiTestDanhGia.count).not.toHaveBeenCalled();
    expect(prismaMock.moc.updateMany).toHaveBeenCalledWith({
      where: { id: 10, ngayHoanThanh: null },
      data: { ngayHoanThanh: expect.any(Date) },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/hoc-tap");
  });
});

describe("hoanThanhMoc — Tiếng Anh (gate Bài test đánh giá)", () => {
  it("chặn hoàn thành Mốc Tiếng Anh khi chưa có Điểm số Bài test nào gắn với Mốc đó", async () => {
    const moc = { id: 20, kyNang: "TiengAnh", thuTu: 1, ngayHoanThanh: null };
    prismaMock.moc.findUnique.mockResolvedValue(moc);
    prismaMock.moc.findFirst.mockResolvedValue({ id: 20, thuTu: 1 });
    prismaMock.baiTestDanhGia.count.mockResolvedValue(0);

    const ketQua = await hoanThanhMoc(20);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("CHUA_CO_DIEM_BAI_TEST");
    expect(prismaMock.moc.updateMany).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("ghiDiemBaiTest() rồi hoanThanhMoc() thành công — gate mở ra sau khi có Điểm số", async () => {
    prismaMock.moc.findFirst.mockResolvedValue({ id: 21, thuTu: 1 });
    prismaMock.baiTestDanhGia.create.mockResolvedValue({
      id: 1,
      mocId: 21,
      diemSo: "8.0",
      ngay: new Date(),
    });

    const ketQuaDiem = await ghiDiemBaiTest("8.0");
    expect(ketQuaDiem.ok).toBe(true);

    const moc = { id: 21, kyNang: "TiengAnh", thuTu: 1, ngayHoanThanh: null };
    prismaMock.moc.findUnique.mockResolvedValue(moc);
    prismaMock.baiTestDanhGia.count.mockResolvedValue(1);

    const ketQua = await hoanThanhMoc(21);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.moc.updateMany).toHaveBeenCalledWith({
      where: { id: 21, ngayHoanThanh: null },
      data: { ngayHoanThanh: expect.any(Date) },
    });
  });
});

describe("hoanThanhMoc — Complete out of sequence", () => {
  it("chặn hoàn thành một Mốc không phải Mốc hiện tại (tương lai)", async () => {
    const mocTuongLai = {
      id: 30,
      kyNang: "AutomationTest",
      thuTu: 3,
      ngayHoanThanh: null,
    };
    prismaMock.moc.findUnique.mockResolvedValue(mocTuongLai);
    // Mốc hiện tại thực sự là một id khác (thuTu nhỏ hơn 3).
    prismaMock.moc.findFirst.mockResolvedValue({ id: 28, thuTu: 1 });

    const ketQua = await hoanThanhMoc(30);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MOC_KHONG_PHAI_VI_TRI_HIEN_TAI");
    expect(prismaMock.moc.updateMany).not.toHaveBeenCalled();
  });
});

describe("hoanThanhMoc — Try to complete an already-completed Mốc twice", () => {
  it("chặn hoàn thành một Mốc đã Hoàn thành — không có undo", async () => {
    const mocDaXong = {
      id: 31,
      kyNang: "AutomationTest",
      thuTu: 1,
      ngayHoanThanh: new Date("2026-09-01T00:00:00.000Z"),
    };
    prismaMock.moc.findUnique.mockResolvedValue(mocDaXong);

    const ketQua = await hoanThanhMoc(31);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MOC_DA_HOAN_THANH");
    // Không cần đi xa tới layMocHienTai — từ chối ngay từ bước đọc Mốc.
    expect(prismaMock.moc.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.moc.updateMany).not.toHaveBeenCalled();
  });

  it("đóng race double-click: hai lượt gọi gần như đồng thời cùng vượt qua check ban đầu, nhưng chỉ MỘT lượt ghi thắng — lượt còn lại nhận MOC_DA_HOAN_THANH từ chính updateMany, không giả định thành công", async () => {
    // Cả hai lượt gọi đều đọc thấy Mốc CHƯA Hoàn thành (race thật: check này
    // không đủ để chặn, phải chặn ở chính lệnh ghi — đây là lý do #3 đổi
    // sang `updateMany` + kiểm tra `count`).
    const mocChuaXong = {
      id: 32,
      kyNang: "AutomationTest",
      thuTu: 1,
      ngayHoanThanh: null,
    };
    prismaMock.moc.findUnique.mockResolvedValue(mocChuaXong);
    prismaMock.moc.findFirst.mockResolvedValue({ id: 32, thuTu: 1 });
    // Lượt ghi đầu tiên khớp đúng 1 hàng; lượt thứ hai không còn khớp hàng
    // nào nữa (hàng đã bị lượt đầu đổi `ngayHoanThanh` khỏi `null`).
    prismaMock.moc.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const [lanMot, lanHai] = await Promise.all([
      hoanThanhMoc(32),
      hoanThanhMoc(32),
    ]);

    expect(lanMot.ok).toBe(true);
    expect(lanHai.ok).toBe(false);
    if (lanHai.ok) throw new Error("unreachable");
    expect(lanHai.error.code).toBe("MOC_DA_HOAN_THANH");
    expect(prismaMock.moc.updateMany).toHaveBeenCalledTimes(2);
  });
});

describe("hoanThanhMoc — payload thô/không tồn tại", () => {
  it("chặn mocId không tồn tại trong DB", async () => {
    prismaMock.moc.findUnique.mockResolvedValue(null);

    const ketQua = await hoanThanhMoc(999);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MOC_KHONG_TON_TAI");
  });

  it.each([null, undefined, "10", 1.5, {}, [], true])(
    "chặn mocId %o trước khi chạm Prisma",
    async (giaTri) => {
      const ketQua = await hoanThanhMoc(giaTri as never);

      expect(ketQua.ok).toBe(false);
      if (ketQua.ok) throw new Error("unreachable");
      expect(ketQua.error.code).toBe("MOC_KHONG_HOP_LE");
      expect(prismaMock.moc.findUnique).not.toHaveBeenCalled();
    },
  );
});

describe("hoanThanhMoc — lỗi hệ thống", () => {
  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.moc.findUnique.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await hoanThanhMoc(1);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("ghiDiemBaiTest — luôn nhắm tới Mốc hiện tại của Tiếng Anh", () => {
  it("không nhận tham số kyNang — luôn gọi layMocHienTai với 'TiengAnh'", async () => {
    prismaMock.moc.findFirst.mockResolvedValue({ id: 41, thuTu: 2 });
    prismaMock.baiTestDanhGia.create.mockResolvedValue({
      id: 1,
      mocId: 41,
      diemSo: "8.0",
      ngay: new Date(),
    });

    await ghiDiemBaiTest("8.0");

    expect(prismaMock.moc.findFirst).toHaveBeenCalledWith({
      where: { kyNang: "TiengAnh", ngayHoanThanh: null },
      orderBy: { thuTu: "asc" },
      select: { id: true, thuTu: true },
    });
    expect(prismaMock.baiTestDanhGia.create).toHaveBeenCalledWith({
      data: { mocId: 41, diemSo: "8.0", ngay: expect.any(Date) },
    });
  });

  it("trả lỗi khi Lộ trình Tiếng Anh đã hoàn thành hết (không còn Mốc hiện tại)", async () => {
    prismaMock.moc.findFirst.mockResolvedValue(null);

    const ketQua = await ghiDiemBaiTest("9.0");

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_CO_MOC_HIEN_TAI");
    expect(prismaMock.baiTestDanhGia.create).not.toHaveBeenCalled();
  });
});

describe("ghiDiemBaiTest — Two Điểm số entered for the same Mốc", () => {
  it("cho phép ghi nhiều Điểm số trước khi hoàn thành — cả hai hàng đều tồn tại, không ghi đè", async () => {
    prismaMock.moc.findFirst.mockResolvedValue({ id: 40, thuTu: 1 });
    let demIdDiem = 0;
    prismaMock.baiTestDanhGia.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: ++demIdDiem,
        ...data,
      }),
    );

    const lanMot = await ghiDiemBaiTest("6.5");
    const lanHai = await ghiDiemBaiTest("7.0");

    expect(lanMot.ok).toBe(true);
    expect(lanHai.ok).toBe(true);
    if (!lanMot.ok || !lanHai.ok) throw new Error("unreachable");
    expect(lanMot.data.id).not.toBe(lanHai.data.id);
    expect(prismaMock.baiTestDanhGia.create).toHaveBeenCalledTimes(2);
  });
});

/**
 * Round-trip GHI (`ghiDiemBaiTest()`, `./actions`) -> ĐỌC
 * (`layLichSuDiemBaiTest()`, `./queries`) — cả hai hàm độc lập hardcode
 * "luôn và chỉ Tiếng Anh, không nhận tham số kyNang" (Story 10's kỷ luật,
 * mirror trong Story 12). Test riêng lẻ cho từng hàm không bắt được việc
 * hai đường GHI/ĐỌC lệch nhau (ví dụ đọc nhầm field, hoặc lệch cách merge
 * tiêu đề Mốc) — chỉ một round-trip thật mới xác nhận được điều đó.
 *
 * `prismaMock.baiTestDanhGia.create`/`findMany` được nối với nhau qua một
 * mảng in-memory `banGhi`, mô phỏng đúng ngữ nghĩa "findMany đọc lại hàng
 * vừa create tạo ra" của Prisma thật — không phải hai mock độc lập, không
 * liên quan tới nhau.
 */
describe("Round-trip: ghiDiemBaiTest() -> layLichSuDiemBaiTest()", () => {
  it("Điểm số ghi qua ghiDiemBaiTest() xuất hiện lại đúng qua layLichSuDiemBaiTest(), gắn đúng Mốc hiện tại", async () => {
    // Mốc hiện tại giả lập: A2 (thuTu 2) của Tiếng Anh — `layMocHienTai()`'s
    // kết quả mà cả `ghiDiemBaiTest()` (biên GHI) lẫn `layLichSuDiemBaiTest()`
    // (biên ĐỌC, qua `include: { moc: { select: { thuTu } } }`) đều phải
    // thấy CÙNG một Mốc.
    const MOC_HIEN_TAI = { id: 41, thuTu: 2 };
    prismaMock.moc.findFirst.mockResolvedValue(MOC_HIEN_TAI);

    const banGhi: { id: number; mocId: number; diemSo: string; ngay: Date }[] =
      [];
    prismaMock.baiTestDanhGia.create.mockImplementation(
      async ({
        data,
      }: {
        data: { mocId: number; diemSo: string; ngay: Date };
      }) => {
        const row = { id: banGhi.length + 1, ...data };
        banGhi.push(row);
        return row;
      },
    );
    // Mô phỏng đúng hành vi `findMany` thật của Prisma cho query của
    // `layLichSuDiemBaiTest()`: đọc lại các hàng đã `create()`, kèm
    // `moc.thuTu` join từ Mốc hiện tại (mọi hàng trong `banGhi` đều gắn
    // `MOC_HIEN_TAI.id`).
    prismaMock.baiTestDanhGia.findMany.mockImplementation(async () =>
      banGhi.map((row) => ({ ...row, moc: { thuTu: MOC_HIEN_TAI.thuTu } })),
    );

    const ketQuaGhi = await ghiDiemBaiTest("8.5");
    expect(ketQuaGhi.ok).toBe(true);
    if (!ketQuaGhi.ok) throw new Error("unreachable");
    expect(ketQuaGhi.data.mocId).toBe(MOC_HIEN_TAI.id);

    const lichSu = await layLichSuDiemBaiTest();

    expect(lichSu).toHaveLength(1);
    expect(lichSu[0]).toMatchObject({
      id: ketQuaGhi.data.id,
      mocThuTu: MOC_HIEN_TAI.thuTu,
      mocTen: "A2",
      diemSo: "8.5",
    });
    expect(lichSu[0].ngay).toEqual(ketQuaGhi.data.ngay);
  });
});

describe("ghiDiemBaiTest — Điểm số rỗng/quá dài", () => {
  it("chặn Điểm số rỗng hoặc chỉ khoảng trắng, không tạo hàng nào", async () => {
    const rong = await ghiDiemBaiTest("");
    expect(rong.ok).toBe(false);
    if (rong.ok) throw new Error("unreachable");
    expect(rong.error.code).toBe("DIEM_SO_TRONG");
    expect(rong.error.field).toBe("diemSo");

    const trang = await ghiDiemBaiTest("   \n\t ");
    expect(trang.ok).toBe(false);
    if (trang.ok) throw new Error("unreachable");
    expect(trang.error.code).toBe("DIEM_SO_TRONG");

    expect(prismaMock.baiTestDanhGia.create).not.toHaveBeenCalled();
  });

  it("chặn Điểm số vượt quá 100 ký tự, chấp nhận đúng 100 ký tự", async () => {
    prismaMock.moc.findFirst.mockResolvedValue({ id: 50, thuTu: 1 });
    prismaMock.baiTestDanhGia.create.mockResolvedValue({
      id: 1,
      mocId: 50,
      diemSo: "a".repeat(100),
      ngay: new Date(),
    });

    const quaDai = await ghiDiemBaiTest("a".repeat(101));
    expect(quaDai.ok).toBe(false);
    if (quaDai.ok) throw new Error("unreachable");
    expect(quaDai.error.code).toBe("DIEM_SO_QUA_DAI");
    expect(prismaMock.baiTestDanhGia.create).not.toHaveBeenCalled();

    const dungMuc = await ghiDiemBaiTest("a".repeat(100));
    expect(dungMuc.ok).toBe(true);
  });

  it.each([null, undefined, 42, {}, [], true])(
    "chặn diemSo %o (không phải chuỗi) trước khi chạm Prisma",
    async (giaTri) => {
      const ketQua = await ghiDiemBaiTest(giaTri as never);

      expect(ketQua.ok).toBe(false);
      if (ketQua.ok) throw new Error("unreachable");
      expect(ketQua.error.code).toBe("DIEM_SO_TRONG");
      expect(prismaMock.baiTestDanhGia.create).not.toHaveBeenCalled();
    },
  );
});

describe("ghiDiemBaiTest — lỗi hệ thống", () => {
  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.moc.findFirst.mockResolvedValue({ id: 60, thuTu: 1 });
    prismaMock.baiTestDanhGia.create.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await ghiDiemBaiTest("8.0");

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

/**
 * `biChanHoanThanhBoiGateDiem()` (`app/hoc-tap/model.ts`) — hàm THUẦN đứng
 * sau nút "Hoàn thành Mốc" bị vô hiệu hoá ở `HocTapView.tsx`. Đây là bất
 * biến quan trọng nhất của story (gate CHỈ áp cho Tiếng Anh); test này tồn
 * tại RIÊNG vì repo không có hạ tầng test component nào để bắt lỗi nếu logic
 * này bị đơn giản hoá nhầm ở tầng JSX (ví dụ lỡ bỏ điều kiện kyNang, khoá
 * vĩnh viễn nút Automation Test — không action test nào ở trên chạm được vì
 * `hoanThanhMoc()` được gọi trực tiếp, bỏ qua hoàn toàn logic UI).
 */
describe("biChanHoanThanhBoiGateDiem", () => {
  it("Automation Test: luôn false, bất kể coDiemBaiTest", () => {
    expect(biChanHoanThanhBoiGateDiem("AutomationTest", false)).toBe(false);
    expect(biChanHoanThanhBoiGateDiem("AutomationTest", true)).toBe(false);
  });

  it("Tiếng Anh: mirror đúng coDiemBaiTest (đảo dấu — chặn khi CHƯA có điểm)", () => {
    expect(biChanHoanThanhBoiGateDiem("TiengAnh", false)).toBe(true);
    expect(biChanHoanThanhBoiGateDiem("TiengAnh", true)).toBe(false);
  });
});
