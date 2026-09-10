-- CreateTable
CREATE TABLE "MonAn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ten" TEXT NOT NULL,
    "anh" TEXT
);

-- CreateTable
CREATE TABLE "NguyenLieu" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ten" TEXT NOT NULL,
    "anh" TEXT,
    "monAnId" INTEGER NOT NULL,
    CONSTRAINT "NguyenLieu_monAnId_fkey" FOREIGN KEY ("monAnId") REFERENCES "MonAn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NguyenLieu_monAnId_idx" ON "NguyenLieu"("monAnId");
