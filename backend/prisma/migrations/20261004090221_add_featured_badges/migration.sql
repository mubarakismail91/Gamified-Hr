-- AlterTable
ALTER TABLE "User" ADD COLUMN     "featuredBadgeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
