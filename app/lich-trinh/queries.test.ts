import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho đường ĐỌC của module Lịch trình (`layMauLichTrinh`).
 *
 * Ba hành vi được chốt ở đây, vì cả ba đều là bất biến mà UI dựa vào:
 *  1. Chưa có hàng `MauLichTrinh` (lần chạy đầu) -> `[]`, và KHÔNG ghi gì (AD-3).
 *  2. `mucUuTien` lưu trong DB nằm ngoài union cố định -> chuẩn hoá về
 *     "TrungBinh" ở biên đọc (cột là String vì SQLite không có enum).
 *  3. Sắp xếp theo `gioBatDau` tăng dần, rồi `id` tăng dần.
 *
 * Prisma được mock để test chạy thuần in-memory, không đụng `app-data/db.sqlite`.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    mauLichTrinh: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    lichTrinhNgay: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { layMauLichTrinh, layLichTrinhNgay, layNgaySomNhat } = await import(
  "./queries"
);
const { layMocNgayVN, themNgay } = await import("@/lib/ngayVn");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("layMauLichTrinh", () => {
  it("trả mảng rỗng khi chưa có hàng MauLichTrinh nào, và không ghi gì", async () => {
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue(null);

    const tasks = await layMauLichTrinh();

    expect(tasks).toEqual([]);
    // Đường đọc KHÔNG BAO GIỜ tạo hàng Mẫu — đó là việc của Server Action ghi.
    expect(prismaMock.mauLichTrinh.create).not.toHaveBeenCalled();
    expect(prismaMock.mauLichTrinh.upsert).not.toHaveBeenCalled();
  });

  it("chuẩn hoá mucUuTien ngoài union cố định về TrungBinh", async () => {
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue({
      id: 1,
      tasks: [
        { id: 1, ten: "Rác", gioBatDau: "07:00", mucUuTien: "Khẩn cấp" },
        { id: 2, ten: "Rỗng", gioBatDau: "08:00", mucUuTien: "" },
        { id: 3, ten: "Hợp lệ", gioBatDau: "09:00", mucUuTien: "Cao" },
      ],
    });

    const tasks = await layMauLichTrinh();

    expect(tasks.map((t) => t.mucUuTien)).toEqual([
      "TrungBinh",
      "TrungBinh",
      "Cao",
    ]);
  });

  it("yêu cầu Prisma sắp theo gioBatDau tăng dần rồi id tăng dần", async () => {
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue({ id: 1, tasks: [] });

    await layMauLichTrinh();

    expect(prismaMock.mauLichTrinh.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          tasks: {
            orderBy: [{ gioBatDau: "asc" }, { id: "asc" }],
          },
        },
      }),
    );
  });

  it("giữ nguyên thứ tự Prisma trả về (gioBatDau tăng dần, rồi id tăng dần)", async () => {
    // Prisma đã sắp sẵn; test khẳng định hàm đọc không đảo lại thứ tự đó.
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue({
      id: 1,
      tasks: [
        { id: 9, ten: "Sớm", gioBatDau: "06:30", mucUuTien: "Cao" },
        { id: 2, ten: "Trùng giờ A", gioBatDau: "08:00", mucUuTien: "Thap" },
        { id: 5, ten: "Trùng giờ B", gioBatDau: "08:00", mucUuTien: "Thap" },
        { id: 1, ten: "Muộn", gioBatDau: "21:45", mucUuTien: "TrungBinh" },
      ],
    });

    const tasks = await layMauLichTrinh();

    expect(tasks.map((t) => [t.gioBatDau, t.id])).toEqual([
      ["06:30", 9],
      ["08:00", 2],
      ["08:00", 5],
      ["21:45", 1],
    ]);
  });
});

/**
 * Unit test cho đường ĐỌC của Lịch trình ngày (Story 2) — `layLichTrinhNgay`
 * và `layNgaySomNhat`.
 *
 * I/O & Edge-Case Matrix của story được chốt ở đây, phần đọc:
 *  - "View day with no row" -> `tonTai: false`, không phải lỗi.
 *  - "View past day" -> Tasks/ratio của đúng ngày đó, không đổi.
 *  - Check-off/ratio: `soDaXong`/`tongSo` tính đúng từ `daXong` trong DB.
 */
describe("layLichTrinhNgay", () => {
  it("trả tonTai=false, mảng rỗng, tỷ lệ 0/0 khi chưa có hàng cho ngày đó", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue(null);

    const du = await layLichTrinhNgay(layMocNgayVN());

    expect(du.tonTai).toBe(false);
    expect(du.id).toBeNull();
    expect(du.tasks).toEqual([]);
    expect(du.soDaXong).toBe(0);
    expect(du.tongSo).toBe(0);
  });

  it("tính đúng tỷ lệ đã xong / tổng số từ Task của đúng ngày đó", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue({
      id: 7,
      ngay: layMocNgayVN(),
      tasks: [
        { id: 1, ten: "A", gioBatDau: "07:00", mucUuTien: "Cao", daXong: true },
        { id: 2, ten: "B", gioBatDau: "08:00", mucUuTien: "Thap", daXong: false },
        { id: 3, ten: "C", gioBatDau: "09:00", mucUuTien: "Cao", daXong: true },
      ],
    });

    const du = await layLichTrinhNgay(layMocNgayVN());

    expect(du.tonTai).toBe(true);
    expect(du.id).toBe(7);
    expect(du.soDaXong).toBe(2);
    expect(du.tongSo).toBe(3);
  });

  it("chuẩn hoá mucUuTien ngoài union cố định về TrungBinh, như layMauLichTrinh", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue({
      id: 1,
      ngay: layMocNgayVN(),
      tasks: [
        { id: 1, ten: "Rác", gioBatDau: "07:00", mucUuTien: "Khẩn cấp", daXong: false },
      ],
    });

    const du = await layLichTrinhNgay(layMocNgayVN());

    expect(du.tasks[0].mucUuTien).toBe("TrungBinh");
  });

  it("chuẩn hoá tham số `ngay` bất kỳ về đúng mốc VN qua layMocNgayVN trước khi query", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue(null);
    // Giữa trưa VN (không phải mốc 00:00) — vẫn phải khớp đúng mốc ngày đó.
    const giuaTruaVN = new Date(layMocNgayVN().getTime() + 12 * 60 * 60 * 1000);

    const du = await layLichTrinhNgay(giuaTruaVN);

    expect(du.ngay.getTime()).toBe(layMocNgayVN().getTime());
    expect(prismaMock.lichTrinhNgay.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ngay: layMocNgayVN() } }),
    );
  });

  it("mặc định đọc hôm nay (giờ VN) khi không truyền `ngay`", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue(null);

    const du = await layLichTrinhNgay();

    expect(du.ngay.getTime()).toBe(layMocNgayVN().getTime());
  });

  it("đọc đúng ngày trong quá khứ, không lẫn với hôm nay", async () => {
    const homQua = themNgay(layMocNgayVN(), -1);
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue({
      id: 2,
      ngay: homQua,
      tasks: [{ id: 1, ten: "Việc cũ", gioBatDau: "06:00", mucUuTien: "Cao", daXong: true }],
    });

    const du = await layLichTrinhNgay(homQua);

    expect(prismaMock.lichTrinhNgay.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ngay: homQua } }),
    );
    expect(du.tasks).toHaveLength(1);
    expect(du.soDaXong).toBe(1);
  });

  it("yêu cầu Prisma sắp Task theo gioBatDau tăng dần rồi id tăng dần", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue({
      id: 1,
      ngay: layMocNgayVN(),
      tasks: [],
    });

    await layLichTrinhNgay();

    expect(prismaMock.lichTrinhNgay.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          tasks: {
            orderBy: [{ gioBatDau: "asc" }, { id: "asc" }],
          },
        },
      }),
    );
  });
});

describe("layNgaySomNhat", () => {
  it("trả null khi chưa có hàng LichTrinhNgay nào", async () => {
    prismaMock.lichTrinhNgay.findFirst.mockResolvedValue(null);

    const somNhat = await layNgaySomNhat();

    expect(somNhat).toBeNull();
  });

  it("trả ngay của hàng sớm nhất, sắp theo ngay tăng dần", async () => {
    const moc = themNgay(layMocNgayVN(), -10);
    prismaMock.lichTrinhNgay.findFirst.mockResolvedValue({ id: 1, ngay: moc });

    const somNhat = await layNgaySomNhat();

    expect(somNhat?.getTime()).toBe(moc.getTime());
    expect(prismaMock.lichTrinhNgay.findFirst).toHaveBeenCalledWith({
      orderBy: { ngay: "asc" },
    });
  });
});
