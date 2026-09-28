import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
    task: {
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    lichTrinhNgay: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    taskNgay: {
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const {
  themTask,
  suaTask,
  xoaTask,
  taoLichTrinhNgayTuMau,
  themTaskNgay,
  suaTaskNgay,
  xoaTaskNgay,
  danhDauTask,
  luuGhiChuNgay,
  lenLichNgayTuongLai,
} = await import("./actions");

const TASK_HOP_LE = {
  ten: "Đưa bé đi học",
  gioBatDau: "07:15",
  gioKetThuc: "07:45",
  mucUuTien: "TrungBinh",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.mauLichTrinh.upsert.mockResolvedValue({ id: 1 });
  prismaMock.mauLichTrinh.findFirst.mockResolvedValue(null);
  prismaMock.task.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: 42,
      ...data,
    }),
  );
  prismaMock.task.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.task.deleteMany.mockResolvedValue({ count: 1 });

  prismaMock.lichTrinhNgay.findUnique.mockResolvedValue(null);
  prismaMock.lichTrinhNgay.upsert.mockImplementation(
    async ({ create }: { create: { ngay: Date } }) => ({ id: 99, ngay: create.ngay }),
  );
  prismaMock.taskNgay.create.mockImplementation(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: 42,
      daXong: false,
      ...data,
    }),
  );
  prismaMock.taskNgay.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.taskNgay.deleteMany.mockResolvedValue({ count: 1 });
  const taskNgayHienTai = {
    id: 3,
    ten: "Đưa bé đi học",
    gioBatDau: "20:00",
    mucUuTien: "TrungBinh",
    daXong: false,
    lichTrinhNgayId: 99,
  };
  prismaMock.taskNgay.findUnique.mockResolvedValue(taskNgayHienTai);
  prismaMock.taskNgay.findFirst.mockResolvedValue(taskNgayHienTai);
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

  it("chặn giờ bắt đầu không đúng dạng HH:mm", async () => {
    const ketQua = await themTask({ ...TASK_HOP_LE, gioBatDau: "25:00" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GIO_BAT_DAU_KHONG_HOP_LE");
    expect(ketQua.error.field).toBe("gioBatDau");
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it.each(["", "7:5", "24:00", undefined])(
    "chặn giờ kết thúc thiếu/sai dạng (%s)",
    async (gioKetThuc) => {
      const ketQua = await themTask({ ...TASK_HOP_LE, gioKetThuc } as never);

      expect(ketQua.ok).toBe(false);
      if (ketQua.ok) throw new Error("unreachable");
      expect(ketQua.error.code).toBe("GIO_KET_THUC_KHONG_HOP_LE");
      expect(ketQua.error.field).toBe("gioKetThuc");
      expect(prismaMock.task.create).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["kết thúc trước bắt đầu", "09:00", "08:00"],
    ["kết thúc bằng bắt đầu", "09:00", "09:00"],
    ["vắt qua nửa đêm", "23:00", "01:00"],
  ])("chặn khung giờ %s -> GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU", async (_, gioBatDau, gioKetThuc) => {
    const ketQua = await themTask({ ...TASK_HOP_LE, gioBatDau, gioKetThuc });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GIO_KET_THUC_KHONG_SAU_GIO_BAT_DAU");
    expect(ketQua.error.field).toBe("gioKetThuc");
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("chấp nhận khung giờ sát biên trong ngày (00:00 ~ 23:59)", async () => {
    const ketQua = await themTask({ ...TASK_HOP_LE, gioBatDau: "00:00", gioKetThuc: "23:59" });

    expect(ketQua.ok).toBe(true);
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
      gioBatDau: "07:15",
      mucUuTien: "TrungBinh",
    });
    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: {
        ten: "Nấu tối",
        gioBatDau: "07:15",
        gioKetThuc: "07:45",
        mucUuTien: "TrungBinh",
        mauLichTrinhId: 1,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh/mau-lich-trinh");
    // Màn hình Lịch trình hôm nay (Story 2) cũng được làm mới, phòng xa.
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh");
  });

  it("tạo hàng MauLichTrinh lười bằng MỘT lệnh upsert nguyên tử", async () => {
    prismaMock.mauLichTrinh.upsert.mockResolvedValue({ id: 1 });

    const ketQua = await themTask(TASK_HOP_LE);

    expect(ketQua.ok).toBe(true);
    // Nguyên tử: không có khoảng hở findFirst-rồi-create để hai lệnh ghi gần
    // như đồng thời chèn được hai hàng Mẫu.
    expect(prismaMock.mauLichTrinh.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    expect(prismaMock.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ mauLichTrinhId: 1 }),
    });
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    // Action có log lỗi ra server; nuốt log để output test sạch.
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.task.create.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await themTask(TASK_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
    expect(ketQua.error.message).toBe("Không lưu được, thử lại.");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});

describe("payload thô từ HTTP (kiểu bị xoá ở runtime)", () => {
  // Server Action là một endpoint công khai: client có thể gửi bất cứ gì.
  const RAC = [null, undefined, "chuỗi", 42, [], true];

  it.each(RAC)("themTask chặn payload %o trước khi chạm thuộc tính", async (rac) => {
    const ketQua = await themTask(rac as never);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
    expect(prismaMock.task.create).not.toHaveBeenCalled();
    expect(prismaMock.mauLichTrinh.upsert).not.toHaveBeenCalled();
  });

  it.each(RAC)("suaTask chặn payload %o trước khi chạm thuộc tính", async (rac) => {
    const ketQua = await suaTask(3, rac as never);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
    expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
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

  it("chỉ cập nhật đúng Task được chỉ định, và phải thuộc Mẫu của module", async () => {
    const ketQua = await suaTask(3, { ...TASK_HOP_LE, gioBatDau: "20:00", gioKetThuc: "20:30" });

    expect(ketQua.ok).toBe(true);
    // `mauLichTrinhId` nằm trong chính câu truy vấn: bất biến AD-1 được DB ép,
    // không chỉ là quy ước gọi hàm.
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: 3, mauLichTrinhId: 1 },
      data: {
        ten: "Đưa bé đi học",
        gioBatDau: "20:00",
        gioKetThuc: "20:30",
        mucUuTien: "TrungBinh",
      },
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
    expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
      where: { id: 3, mauLichTrinhId: 1 },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh/mau-lich-trinh");
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh");
  });

  it("báo lỗi khi Task không còn tồn tại", async () => {
    prismaMock.task.deleteMany.mockResolvedValue({ count: 0 });

    const ketQua = await xoaTask(999);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_TASK");
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    // Action có log lỗi ra server; nuốt log để output test sạch.
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.task.deleteMany.mockRejectedValue(new Error("disk I/O error"));

    const ketQua = await xoaTask(3);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});

/**
 * Unit test cho các Server Action của Lịch trình ngày (Story 2).
 *
 * `taoLichTrinhNgayTuMau` chốt hai hành vi trọng tâm của I/O matrix:
 *  - Idempotent: gọi lại khi hàng hôm nay đã tồn tại không tạo hàng/Task
 *    thứ hai.
 *  - Copy đúng giá trị field từ Task hiện hành của Mẫu vào TaskNgay mới —
 *    KHÔNG share hàng/FK (AD-2).
 *
 * `danhDauTask`/`suaTaskNgay`/`xoaTaskNgay` chốt ownership-scoped theo
 * `lichTrinhNgayId`: where của lệnh ghi phải kèm cả `id` lẫn `lichTrinhNgayId`,
 * không chỉ `id` — một Task thuộc ngày khác không được sửa/xoá/đánh dấu qua
 * `lichTrinhNgayId` sai.
 */
describe("taoLichTrinhNgayTuMau", () => {
  it("tạo hàng mới, copy đúng Task hiện hành của Mẫu vào, khi chưa có hàng cho hôm nay", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue(null);
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue({
      id: 1,
      tasks: [
        { id: 10, ten: "Đưa bé đi học", gioBatDau: "07:00", gioKetThuc: "07:30", mucUuTien: "Cao" },
        // Task cũ chưa có giờ kết thúc -> copy nguyên `null` sang ngày mới.
        { id: 11, ten: "Nấu tối", gioBatDau: "18:00", gioKetThuc: null, mucUuTien: "TrungBinh" },
      ],
    });

    const ketQua = await taoLichTrinhNgayTuMau();

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.id).toBe(99);
    expect(prismaMock.lichTrinhNgay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tasks: {
            create: [
              { ten: "Đưa bé đi học", gioBatDau: "07:00", gioKetThuc: "07:30", mucUuTien: "Cao" },
              { ten: "Nấu tối", gioBatDau: "18:00", gioKetThuc: null, mucUuTien: "TrungBinh" },
            ],
          },
        }),
        update: {},
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh");
  });

  it("tạo hàng rỗng (không Task nào) khi Mẫu chưa có Task nào", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue(null);
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue(null);

    const ketQua = await taoLichTrinhNgayTuMau();

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.lichTrinhNgay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ tasks: { create: [] } }),
      }),
    );
  });

  it("idempotent: không gọi upsert/đọc Mẫu lần nữa khi hàng hôm nay đã tồn tại", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue({ id: 5 });

    const ketQua = await taoLichTrinhNgayTuMau();

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toEqual({ id: 5 });
    expect(prismaMock.lichTrinhNgay.upsert).not.toHaveBeenCalled();
    expect(prismaMock.mauLichTrinh.findFirst).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.lichTrinhNgay.findUnique.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await taoLichTrinhNgayTuMau();

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});

const TASK_NGAY_HOP_LE = {
  ten: "Đưa bé đi học",
  gioBatDau: "07:15",
  gioKetThuc: "07:45",
  mucUuTien: "TrungBinh",
};

describe("themTaskNgay", () => {
  it("chặn `ten` rỗng, không ghi gì (dùng lại đúng luật kiểm tra của Mẫu)", async () => {
    const ketQua = await themTaskNgay(99, { ...TASK_NGAY_HOP_LE, ten: "" });

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("TEN_TRONG");
    expect(prismaMock.taskNgay.create).not.toHaveBeenCalled();
  });

  it("chặn lichTrinhNgayId không phải số nguyên", async () => {
    const ketQua = await themTaskNgay(Number.NaN, TASK_NGAY_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("ID_KHONG_HOP_LE");
    expect(prismaMock.taskNgay.create).not.toHaveBeenCalled();
  });

  it("tạo Task gắn đúng lichTrinhNgayId của ngày đang xem, không đụng Mẫu", async () => {
    const ketQua = await themTaskNgay(99, TASK_NGAY_HOP_LE);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.taskNgay.create).toHaveBeenCalledWith({
      data: { ...TASK_NGAY_HOP_LE, lichTrinhNgayId: 99 },
    });
    expect(prismaMock.mauLichTrinh.upsert).not.toHaveBeenCalled();
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });
});

describe("suaTaskNgay", () => {
  it("chỉ cập nhật Task khớp CẢ id lẫn lichTrinhNgayId (ownership-scoped)", async () => {
    const ketQua = await suaTaskNgay(3, 99, {
      ...TASK_NGAY_HOP_LE,
      gioBatDau: "20:00",
      gioKetThuc: "20:30",
    });

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.taskNgay.updateMany).toHaveBeenCalledWith({
      where: { id: 3, lichTrinhNgayId: 99 },
      data: {
        ten: "Đưa bé đi học",
        gioBatDau: "20:00",
        gioKetThuc: "20:30",
        mucUuTien: "TrungBinh",
      },
    });
  });

  it("báo lỗi khi Task không thuộc lichTrinhNgayId này (không sửa lẹm ngày khác)", async () => {
    prismaMock.taskNgay.updateMany.mockResolvedValue({ count: 0 });

    const ketQua = await suaTaskNgay(3, 99, TASK_NGAY_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_TASK");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("không đổi daXong hiện tại của Task", async () => {
    prismaMock.taskNgay.findFirst.mockResolvedValue({
      id: 3,
      ten: "x",
      gioBatDau: "20:00",
      mucUuTien: "TrungBinh",
      daXong: true,
      lichTrinhNgayId: 99,
    });

    const ketQua = await suaTaskNgay(3, 99, TASK_NGAY_HOP_LE);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data.daXong).toBe(true);
  });

  it("đọc lại daXong bằng CẢ id lẫn lichTrinhNgayId, không chỉ id một mình", async () => {
    await suaTaskNgay(3, 99, TASK_NGAY_HOP_LE);

    expect(prismaMock.taskNgay.findFirst).toHaveBeenCalledWith({
      where: { id: 3, lichTrinhNgayId: 99 },
    });
  });

  it("báo lỗi (không default daXong về false) nếu Task bị xoá giữa lúc updateMany và lúc đọc lại", async () => {
    // updateMany báo đã cập nhật 1 dòng, nhưng lượt đọc lại ownership-scoped
    // sau đó không thấy hàng nào — không được lặng lẽ trả `daXong: false`.
    prismaMock.taskNgay.findFirst.mockResolvedValue(null);

    const ketQua = await suaTaskNgay(3, 99, TASK_NGAY_HOP_LE);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_TASK");
  });
});

describe("xoaTaskNgay", () => {
  it("xoá đúng Task theo id+lichTrinhNgayId, không có bước xác nhận", async () => {
    const ketQua = await xoaTaskNgay(3, 99);

    expect(ketQua.ok).toBe(true);
    expect(prismaMock.taskNgay.deleteMany).toHaveBeenCalledWith({
      where: { id: 3, lichTrinhNgayId: 99 },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh");
  });

  it("báo lỗi khi Task không thuộc lichTrinhNgayId này", async () => {
    prismaMock.taskNgay.deleteMany.mockResolvedValue({ count: 0 });

    const ketQua = await xoaTaskNgay(3, 99);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_TASK");
  });
});

describe("danhDauTask", () => {
  it("đảo daXong ngay lập tức, ownership-scoped theo lichTrinhNgayId", async () => {
    const ketQua = await danhDauTask(3, 99, true);

    expect(ketQua.ok).toBe(true);
    if (!ketQua.ok) throw new Error("unreachable");
    expect(ketQua.data).toEqual({ id: 3, daXong: true });
    expect(prismaMock.taskNgay.updateMany).toHaveBeenCalledWith({
      where: { id: 3, lichTrinhNgayId: 99 },
      data: { daXong: true },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh");
  });

  it("báo lỗi, không revalidate, khi Task không thuộc lichTrinhNgayId đưa lên (chặn đánh dấu chéo ngày)", async () => {
    prismaMock.taskNgay.updateMany.mockResolvedValue({ count: 0 });

    const ketQua = await danhDauTask(3, 99, true);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_TIM_THAY_TASK");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("chặn payload `daXong` không phải boolean, không ghi gì", async () => {
    const ketQua = await danhDauTask(3, 99, "true" as unknown as boolean);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
    expect(prismaMock.taskNgay.updateMany).not.toHaveBeenCalled();
  });

  it("chặn id/lichTrinhNgayId không phải số nguyên", async () => {
    const ketQua = await danhDauTask(Number.NaN, 99, true);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("ID_KHONG_HOP_LE");
    expect(prismaMock.taskNgay.updateMany).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.taskNgay.updateMany.mockRejectedValue(
      new Error("SQLITE_BUSY: database is locked"),
    );

    const ketQua = await danhDauTask(3, 99, true);

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});

describe("luuGhiChuNgay", () => {
  it("trim rồi lưu ghi chú vào đúng hàng LichTrinhNgay, revalidate", async () => {
    prismaMock.lichTrinhNgay.updateMany.mockResolvedValue({ count: 1 });

    const ketQua = await luuGhiChuNgay(99, "  Đã chạy 5km\nĐọc sách 30p  ");

    expect(ketQua).toEqual({ ok: true, data: { ghiChu: "Đã chạy 5km\nĐọc sách 30p" } });
    expect(prismaMock.lichTrinhNgay.updateMany).toHaveBeenCalledWith({
      where: { id: 99 },
      data: { ghiChu: "Đã chạy 5km\nĐọc sách 30p" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh");
  });

  it.each(["", "   \n ", null, undefined])("ghi chú rỗng (%s) -> xoá ghi chú (null)", async (ghiChu) => {
    prismaMock.lichTrinhNgay.updateMany.mockResolvedValue({ count: 1 });

    const ketQua = await luuGhiChuNgay(99, ghiChu);

    expect(ketQua).toEqual({ ok: true, data: { ghiChu: null } });
    expect(prismaMock.lichTrinhNgay.updateMany).toHaveBeenCalledWith({
      where: { id: 99 },
      data: { ghiChu: null },
    });
  });

  it("chấp nhận đúng 5000 ký tự, chặn 5001 ký tự -> GHI_CHU_QUA_DAI, không ghi", async () => {
    prismaMock.lichTrinhNgay.updateMany.mockResolvedValue({ count: 1 });
    expect((await luuGhiChuNgay(99, "a".repeat(5000))).ok).toBe(true);

    prismaMock.lichTrinhNgay.updateMany.mockClear();
    const ketQua = await luuGhiChuNgay(99, "a".repeat(5001));

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("GHI_CHU_QUA_DAI");
    expect(ketQua.error.field).toBe("ghiChu");
    expect(prismaMock.lichTrinhNgay.updateMany).not.toHaveBeenCalled();
  });

  it("chặn id không hợp lệ và ghi chú không phải chuỗi trước khi chạm Prisma", async () => {
    const idSai = await luuGhiChuNgay("99", "x");
    const ghiChuSai = await luuGhiChuNgay(99, { html: "<b>" });

    expect(idSai.ok || ghiChuSai.ok).toBe(false);
    if (idSai.ok || ghiChuSai.ok) throw new Error("unreachable");
    expect(idSai.error.code).toBe("ID_KHONG_HOP_LE");
    expect(ghiChuSai.error.code).toBe("DU_LIEU_KHONG_HOP_LE");
    expect(prismaMock.lichTrinhNgay.updateMany).not.toHaveBeenCalled();
  });

  it("không có hàng LichTrinhNgay -> KHONG_CO_LICH_TRINH_NGAY, không tự tạo hàng, không revalidate", async () => {
    prismaMock.lichTrinhNgay.updateMany.mockResolvedValue({ count: 0 });

    const ketQua = await luuGhiChuNgay(12345, "x");

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("KHONG_CO_LICH_TRINH_NGAY");
    expect(prismaMock.lichTrinhNgay.upsert).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("trả LOI_HE_THONG thay vì reject khi Prisma ném lỗi", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.lichTrinhNgay.updateMany.mockRejectedValue(new Error("SQLITE_BUSY"));

    const ketQua = await luuGhiChuNgay(99, "x");

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("LOI_HE_THONG");
  });
});

describe("lenLichNgayTuongLai", () => {
  // Hôm nay = 29/09/2026 (10:00 giờ VN).
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T03:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ngày mai chưa có hàng -> tạo từ Mẫu hiện hành, đúng mốc ngày VN, revalidate", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue(null);
    prismaMock.mauLichTrinh.findFirst.mockResolvedValue({
      id: 1,
      tasks: [{ id: 10, ten: "Tập thể dục", gioBatDau: "06:00", gioKetThuc: "06:30", mucUuTien: "Cao" }],
    });

    const ketQua = await lenLichNgayTuongLai("2026-09-30");

    expect(ketQua).toEqual({ ok: true, data: { id: 99 } });
    expect(prismaMock.lichTrinhNgay.upsert).toHaveBeenCalledWith({
      // 30/09/2026 00:00 VN == 2026-09-29T17:00:00.000Z.
      where: { ngay: new Date("2026-09-29T17:00:00.000Z") },
      create: {
        ngay: new Date("2026-09-29T17:00:00.000Z"),
        tasks: {
          create: [{ ten: "Tập thể dục", gioBatDau: "06:00", gioKetThuc: "06:30", mucUuTien: "Cao" }],
        },
      },
      update: {},
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/lich-trinh");
  });

  it("ngày tương lai đã có hàng -> trả id sẵn có, không tạo/ghi đè", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue({ id: 7 });

    const ketQua = await lenLichNgayTuongLai("2026-10-05");

    expect(ketQua).toEqual({ ok: true, data: { id: 7 } });
    expect(prismaMock.lichTrinhNgay.upsert).not.toHaveBeenCalled();
  });

  it("chấp nhận đúng biên 365 ngày, chặn ngày thứ 366 -> NGAY_QUA_XA", async () => {
    prismaMock.lichTrinhNgay.findUnique.mockResolvedValue({ id: 7 });
    expect((await lenLichNgayTuongLai("2027-09-29")).ok).toBe(true);

    const ketQua = await lenLichNgayTuongLai("2027-09-30");

    expect(ketQua.ok).toBe(false);
    if (ketQua.ok) throw new Error("unreachable");
    expect(ketQua.error.code).toBe("NGAY_QUA_XA");
  });

  it.each(["2026-09-29", "2026-09-01"])(
    "hôm nay / quá khứ (%s) -> NGAY_KHONG_PHAI_TUONG_LAI, không tạo bù",
    async (ngay) => {
      const ketQua = await lenLichNgayTuongLai(ngay);

      expect(ketQua.ok).toBe(false);
      if (ketQua.ok) throw new Error("unreachable");
      expect(ketQua.error.code).toBe("NGAY_KHONG_PHAI_TUONG_LAI");
      expect(prismaMock.lichTrinhNgay.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.lichTrinhNgay.upsert).not.toHaveBeenCalled();
    },
  );

  it.each(["2026-02-30", "30/09/2026", "", 20260930, null])(
    "ngày sai dạng (%s) -> NGAY_KHONG_HOP_LE",
    async (ngay) => {
      const ketQua = await lenLichNgayTuongLai(ngay);

      expect(ketQua.ok).toBe(false);
      if (ketQua.ok) throw new Error("unreachable");
      expect(ketQua.error.code).toBe("NGAY_KHONG_HOP_LE");
      expect(prismaMock.lichTrinhNgay.upsert).not.toHaveBeenCalled();
    },
  );
});
