-- CreateEnum
CREATE TYPE "SkillBranch" AS ENUM ('teaching', 'research', 'leadership', 'digital');

-- CreateEnum
CREATE TYPE "SkillState" AS ENUM ('unlocked', 'in_progress', 'locked');

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "branch" "SkillBranch" NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "state" "SkillState" NOT NULL,
    "level" INTEGER NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "requires" TEXT[],
    "col" INTEGER NOT NULL,
    "row" INTEGER NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);
