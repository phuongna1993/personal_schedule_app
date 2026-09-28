-- Thời hạn (một mốc giờ) -> khung giờ Từ ~ Đến.
-- RENAME COLUMN (không drop/add) để giữ nguyên giờ đã nhập của mọi Task cũ,
-- nay trở thành giờ bắt đầu; giờ kết thúc để NULL cho tới khi được sửa.
ALTER TABLE "Task" RENAME COLUMN "thoiHan" TO "gioBatDau";
ALTER TABLE "Task" ADD COLUMN "gioKetThuc" TEXT;

ALTER TABLE "TaskNgay" RENAME COLUMN "thoiHan" TO "gioBatDau";
ALTER TABLE "TaskNgay" ADD COLUMN "gioKetThuc" TEXT;
