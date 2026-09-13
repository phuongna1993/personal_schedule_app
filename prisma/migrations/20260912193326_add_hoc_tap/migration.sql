-- CreateTable
CREATE TABLE "BuoiHoc" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kyNang" TEXT NOT NULL,
    "noiDung" TEXT NOT NULL,
    "thoiLuongPhut" INTEGER NOT NULL,
    "ngay" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BuoiHoc_kyNang_idx" ON "BuoiHoc"("kyNang");
