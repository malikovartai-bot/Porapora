-- CreateTable
CREATE TABLE "PlayRoleCast" (
    "id" TEXT NOT NULL,
    "playRoleId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayRoleCast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayRoleCast_playRoleId_key" ON "PlayRoleCast"("playRoleId");

-- CreateIndex
CREATE INDEX "PlayRoleCast_personId_idx" ON "PlayRoleCast"("personId");

-- AddForeignKey
ALTER TABLE "PlayRoleCast" ADD CONSTRAINT "PlayRoleCast_playRoleId_fkey" FOREIGN KEY ("playRoleId") REFERENCES "PlayRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayRoleCast" ADD CONSTRAINT "PlayRoleCast_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
