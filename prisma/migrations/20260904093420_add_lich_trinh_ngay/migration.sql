-- CreateTable
CREATE TABLE "LichTrinhNgay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ngay" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TaskNgay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ten" TEXT NOT NULL,
    "thoiHan" TEXT NOT NULL,
    "mucUuTien" TEXT NOT NULL,
    "daXong" BOOLEAN NOT NULL DEFAULT false,
    "lichTrinhNgayId" INTEGER NOT NULL,
    CONSTRAINT "TaskNgay_lichTrinhNgayId_fkey" FOREIGN KEY ("lichTrinhNgayId") REFERENCES "LichTrinhNgay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "LichTrinhNgay_ngay_key" ON "LichTrinhNgay"("ngay");

-- CreateIndex
CREATE INDEX "TaskNgay_lichTrinhNgayId_idx" ON "TaskNgay"("lichTrinhNgayId");
