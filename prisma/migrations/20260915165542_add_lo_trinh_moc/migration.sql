-- CreateTable
CREATE TABLE "Moc" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kyNang" TEXT NOT NULL,
    "thuTu" INTEGER NOT NULL,
    "ngayHoanThanh" DATETIME
);

-- CreateTable
CREATE TABLE "BaiTestDanhGia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mocId" INTEGER NOT NULL,
    "diemSo" TEXT NOT NULL,
    "ngay" DATETIME NOT NULL,
    CONSTRAINT "BaiTestDanhGia_mocId_fkey" FOREIGN KEY ("mocId") REFERENCES "Moc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Moc_kyNang_idx" ON "Moc"("kyNang");

-- CreateIndex
CREATE UNIQUE INDEX "Moc_kyNang_thuTu_key" ON "Moc"("kyNang", "thuTu");

-- CreateIndex
CREATE INDEX "BaiTestDanhGia_mocId_idx" ON "BaiTestDanhGia"("mocId");
