-- CreateEnum
CREATE TYPE "SdtScale" AS ENUM ('autonomy', 'competence', 'relatedness');

-- CreateTable
CREATE TABLE "SurveyRound" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3),
    "targetCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "scale" "SdtScale" NOT NULL,
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyParticipation" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyParticipation_roundId_userId_key" ON "SurveyParticipation"("roundId", "userId");

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SurveyRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyResponse" ADD CONSTRAINT "SurveyResponse_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SurveyRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyParticipation" ADD CONSTRAINT "SurveyParticipation_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SurveyRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyParticipation" ADD CONSTRAINT "SurveyParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
