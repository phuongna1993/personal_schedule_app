-- CreateTable
CREATE TABLE "MauLichTrinh" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ten" TEXT NOT NULL,
    "thoiHan" TEXT NOT NULL,
    "mucUuTien" TEXT NOT NULL,
    "mauLichTrinhId" INTEGER NOT NULL,
    CONSTRAINT "Task_mauLichTrinhId_fkey" FOREIGN KEY ("mauLichTrinhId") REFERENCES "MauLichTrinh" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Task_mauLichTrinhId_idx" ON "Task"("mauLichTrinhId");
