-- CreateTable
CREATE TABLE "NganSach" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "thang" DATETIME NOT NULL,
    "hanMuc" INTEGER NOT NULL,
    "danhMucChiTieuId" INTEGER NOT NULL,
    CONSTRAINT "NganSach_danhMucChiTieuId_fkey" FOREIGN KEY ("danhMucChiTieuId") REFERENCES "DanhMucChiTieu" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "NganSach_danhMucChiTieuId_thang_key" ON "NganSach"("danhMucChiTieuId", "thang");
