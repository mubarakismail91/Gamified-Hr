/*
  Warnings:

  - You are about to drop the column `submittedAt` on the `SurveyResponse` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Generation" AS ENUM ('gen_z', 'millennial', 'gen_x', 'boomer', 'undisclosed');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('academic', 'administrative', 'undisclosed');

-- AlterTable
ALTER TABLE "SurveyResponse" DROP COLUMN "submittedAt",
ADD COLUMN     "generation" "Generation",
ADD COLUMN     "staffType" "StaffType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "generation" "Generation",
ADD COLUMN     "staffType" "StaffType";

-- Existing responses had time-ordered cuid ids; give them random ids so their
-- order can't be matched against SurveyParticipation either.
UPDATE "SurveyResponse" SET "id" = gen_random_uuid()::text;
