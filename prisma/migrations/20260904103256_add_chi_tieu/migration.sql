-- CreateTable
CREATE TABLE "DanhMucChiTieu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ten" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GiaoDich" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "loai" TEXT NOT NULL,
    "soTien" INTEGER NOT NULL,
    "ngay" DATETIME NOT NULL,
    "ghiChu" TEXT,
    "danhMucChiTieuId" INTEGER,
    CONSTRAINT "GiaoDich_danhMucChiTieuId_fkey" FOREIGN KEY ("danhMucChiTieuId") REFERENCES "DanhMucChiTieu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "GiaoDich_ngay_idx" ON "GiaoDich"("ngay");

-- CreateIndex
CREATE INDEX "GiaoDich_danhMucChiTieuId_idx" ON "GiaoDich"("danhMucChiTieuId");
