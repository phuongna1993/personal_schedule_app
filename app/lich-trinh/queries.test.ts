import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho đường ĐỌC của module Lịch trình (`layMauLichTrinh`).
 *
 * Ba hành vi được chốt ở đây, vì cả ba đều là bất biến mà UI dựa vào:
 *  1. Chưa có hàng `MauLichTrinh` (lần chạy đầu) -> `[]`, và KHÔNG ghi gì (AD-3).
 *  2. `mucUuTien` lưu trong DB nằm ngoài union cố định -> chuẩn hoá về
 *     "TrungBinh" ở biên đọc (cột là String vì SQLite không có enum).
 *  3. Sắp xếp theo `thoiHan` tăng dần, rồi `id` tăng dần.
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
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { layMauLichTrinh } = await import("./queries");

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
        { id: 1, ten: "Rác", thoiHan: "07:00", mucUuTien: "Khẩn cấp" },
        { id: 2, ten: "Rỗng", thoiHan: "08:00", mucUuTien: "" },
        { id: 3, ten: "Hợp lệ", thoiHan: "09:00", mucUuTien: "Cao" },
      ],
    });

    const tasks = await layMauLichTrinh();

    expect(tasks.map((t) => t.mucUuTien)).toEqual([
      "TrungBinh",
      "TrungBinh",
      "Cao",
    ]);
  });

  it("yêu cầu Prisma sắp theo thoiHan tăng dần rồi id tăng dần", async () => {
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue({ id: 1, tasks: [] });

    await layMauLichTrinh();

    expect(prismaMock.mauLichTrinh.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          tasks: {
            orderBy: [{ thoiHan: "asc" }, { id: "asc" }],
          },
        },
      }),
    );
  });

  it("giữ nguyên thứ tự Prisma trả về (thoiHan tăng dần, rồi id tăng dần)", async () => {
    // Prisma đã sắp sẵn; test khẳng định hàm đọc không đảo lại thứ tự đó.
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue({
      id: 1,
      tasks: [
        { id: 9, ten: "Sớm", thoiHan: "06:30", mucUuTien: "Cao" },
        { id: 2, ten: "Trùng giờ A", thoiHan: "08:00", mucUuTien: "Thap" },
        { id: 5, ten: "Trùng giờ B", thoiHan: "08:00", mucUuTien: "Thap" },
        { id: 1, ten: "Muộn", thoiHan: "21:45", mucUuTien: "TrungBinh" },
      ],
    });

    const tasks = await layMauLichTrinh();

    expect(tasks.map((t) => [t.thoiHan, t.id])).toEqual([
      ["06:30", 9],
      ["08:00", 2],
      ["08:00", 5],
      ["21:45", 1],
    ]);
  });
});
