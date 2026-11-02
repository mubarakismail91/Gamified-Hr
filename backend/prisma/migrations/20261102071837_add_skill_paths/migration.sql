-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "skillBranch" "SkillBranch";

-- CreateTable
CREATE TABLE "UserSkillPath" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branch" "SkillBranch" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkillPath_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillPath_userId_branch_key" ON "UserSkillPath"("userId", "branch");

-- AddForeignKey
ALTER TABLE "UserSkillPath" ADD CONSTRAINT "UserSkillPath_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
