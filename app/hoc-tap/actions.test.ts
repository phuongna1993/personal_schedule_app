import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho Server Action của module Học tập.
 *
 * Trọng tâm: I/O & Edge-Case Matrix của story (8-ghi-buoi-hoc.md) —
 *  - Log a session for Tiếng Anh / Automation Test: hai Kỹ năng độc lập
 *    hoàn toàn, không action nào đọc/ghi chéo Kỹ năng còn lại.
 *  - Empty nội dung (rỗng/chỉ khoảng trắng) -> `NOI_DUNG_TRONG`.
 *  - Thời lượng <= 0, hoặc vượt biên Int32 -> `THOI_LUONG_KHONG_HOP_LE`,
 *    chặn TRƯỚC khi chạm Prisma.
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
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { ghiBuoiHoc } = await import("./actions");

const BUOI_HOC_TIENG_ANH_HOP_LE = {
  kyNang: "TiengAnh",
  noiDung: "Ôn 20 từ vựng chủ đề du lịch",
  thoiLuongPhut: 30,
};

const BUOI_HOC_AUTOMATION_HOP_LE = {
  kyNang: "AutomationTest",
  noiDung: "Học Playwright locators",
  thoiLuongPhut: 45,
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

describe("ghiBuoiHoc — Thời lượng zero or negative", () => {
  it("chặn thời lượng bằng 0", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      thoiLuongPhut: 0,
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("THOI_LUONG_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("thoiLuongPhut");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn thời lượng âm", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      thoiLuongPhut: -15,
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("THOI_LUONG_KHONG_HOP_LE");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chặn thời lượng thập phân", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      thoiLuongPhut: 30.5,
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("THOI_LUONG_KHONG_HOP_LE");
  });
});

describe("ghiBuoiHoc — Thời lượng exceeds Int32 max", () => {
  it("chặn thời lượng vượt giới hạn Int32, TRƯỚC khi chạm Prisma", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      thoiLuongPhut: 2_147_483_648,
    });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("THOI_LUONG_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("thoiLuongPhut");
    expect(prismaMock.buoiHoc.create).not.toHaveBeenCalled();
  });

  it("chấp nhận thời lượng đúng bằng giới hạn Int32", async () => {
    const ketQua = await ghiBuoiHoc({
      ...BUOI_HOC_TIENG_ANH_HOP_LE,
      thoiLuongPhut: 2_147_483_647,
    });

    expect(ketQua.ok).toBe(true);
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
