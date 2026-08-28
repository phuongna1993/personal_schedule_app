import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit test cho các Server Action của module Lịch trình.
 *
 * Trọng tâm: edge case "empty `ten` blocked with an inline message" trong
 * I/O & Edge-Case Matrix của story — cùng luật kiểm tra phải chặn ở CẢ
 * `themTask` lẫn `suaTask`, và không được để lọt bất kỳ lệnh ghi nào xuống
 * Prisma khi dữ liệu không hợp lệ.
 *
 * Prisma và `next/cache` được mock để test chạy thuần in-memory, không đụng
 * vào `app-data/db.sqlite` thật.
 */

const { prismaMock, revalidatePathMock } = vi.hoisted(() => ({
  prismaMock: {
    mauLichTrinh: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    task: {
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const { themTask, suaTask, xoaTask } = await import("./actions");

const TASK_HOP_LE = {
  ten: "Đưa bé đi học",
  thoiHan: "07:15",
  mucUuTien: "TrungBinh",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.mauLichTrinh.findFirst.mockResolvedValue({ id: 1 });
  prismaMock.task.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: 42,
      ...data,
    }),
  );
  prismaMock.task.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.task.deleteMany.mockResolvedValue({ count: 1 });
});

describe("themTask", () => {
  it("chặn `ten` rỗng và trả lỗi gắn đúng trường để UI hiện inline", async () => {
    const ketQua = await themTask({ ...TASK_HOP_LE, ten: "" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
    expect(ketQua.error.field).toBe("ten");
    expect(ketQua.error.message).toBeTruthy();
    expect(prismaMock.task.create).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("coi `ten` chỉ có khoảng trắng là rỗng", async () => {
    const ketQua = await themTask({ ...TASK_HOP_LE, ten: "   \n\t " });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("chặn Thời hạn không đúng dạng HH:mm", async () => {
    const ketQua = await themTask({ ...TASK_HOP_LE, thoiHan: "25:00" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("THOI_HAN_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("thoiHan");
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("chặn Mức ưu tiên ngoài 3 giá trị cố định", async () => {
    const ketQua = await themTask({ ...TASK_HOP_LE, mucUuTien: "Khẩn cấp" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("MUC_UU_TIEN_KHONG_HOP_LE");
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("ghi Task hợp lệ (đã trim tên) và revalidate màn hình", async () => {
    const ketQua = await themTask({ ...TASK_HOP_LE, ten: "  Nấu tối  " });

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toMatchObject({
      id: 42,
      ten: "Nấu tối",
      thoiHan: "07:15",
      mucUuTien: "TrungBinh",
    });
    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: {
        ten: "Nấu tối",
        thoiHan: "07:15",
        mucUuTien: "TrungBinh",
        mauLichTrinhId: 1,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh/mau-lich-trinh");
  });

  it("tạo hàng MauLichTrinh lười ở lần ghi đầu tiên", async () => {
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue(null);
    prismaMock.mauLichTrinh.create.mockResolvedValue({ id: 7 });

    const ketQua = await themTask(TASK_HOP_LE);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.mauLichTrinh.create).toHaveBeenCalledOnce();
    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ mauLichTrinhId: 7 }),
    });
  });
});

describe("suaTask", () => {
  it("áp dụng cùng luật chặn `ten` rỗng và không ghi gì", async () => {
    const ketQua = await suaTask(3, { ...TASK_HOP_LE, ten: "" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
    expect(ketQua.error.field).toBe("ten");
    expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
  });

  it("chỉ cập nhật đúng Task được chỉ định", async () => {
    const ketQua = await suaTask(3, { ...TASK_HOP_LE, thoiHan: "20:00" });

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { ten: "Đưa bé đi học", thoiHan: "20:00", mucUuTien: "TrungBinh" },
    });
  });

  it("báo lỗi khi Task không còn tồn tại", async () => {
    prismaMock.task.updateMany.mockResolvedValue({ count: 0 });

    const ketQua = await suaTask(999, TASK_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_TASK");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("xoaTask", () => {
  it("xoá ngay, không có bước xác nhận nào ở tầng action", async () => {
    const ketQua = await xoaTask(3);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({ where: { id: 3 } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh/mau-lich-trinh");
  });

  it("báo lỗi khi Task không còn tồn tại", async () => {
    prismaMock.task.deleteMany.mockResolvedValue({ count: 0 });

    const ketQua = await xoaTask(999);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_TASK");
  });
});
