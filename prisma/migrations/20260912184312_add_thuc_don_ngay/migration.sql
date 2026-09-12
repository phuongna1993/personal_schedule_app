-- CreateTable
CREATE TABLE "ThucDonNguoiLon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ngay" DATETIME NOT NULL,
    "buoi" TEXT NOT NULL,
    "ghiChu" TEXT,
    "monAnId" INTEGER NOT NULL,
    CONSTRAINT "ThucDonNguoiLon_monAnId_fkey" FOREIGN KEY ("monAnId") REFERENCES "MonAn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ThucDonBe" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ngay" DATETIME NOT NULL,
    "buoi" TEXT NOT NULL,
    "monAnId" INTEGER NOT NULL,
    CONSTRAINT "ThucDonBe_monAnId_fkey" FOREIGN KEY ("monAnId") REFERENCES "MonAn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ThucDonNguoiLon_monAnId_idx" ON "ThucDonNguoiLon"("monAnId");

-- CreateIndex
CREATE UNIQUE INDEX "ThucDonNguoiLon_ngay_buoi_key" ON "ThucDonNguoiLon"("ngay", "buoi");

-- CreateIndex
CREATE INDEX "ThucDonBe_monAnId_idx" ON "ThucDonBe"("monAnId");

-- CreateIndex
CREATE UNIQUE INDEX "ThucDonBe_ngay_buoi_key" ON "ThucDonBe"("ngay", "buoi");
