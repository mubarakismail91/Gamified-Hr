-- CreateTable
CREATE TABLE "ResearchConsent" (
    "userId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchConsent_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ResearchResponse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,

    CONSTRAINT "ResearchResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchResponse_code_idx" ON "ResearchResponse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchResponse_code_roundId_key" ON "ResearchResponse"("code", "roundId");

-- AddForeignKey
ALTER TABLE "ResearchConsent" ADD CONSTRAINT "ResearchConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchResponse" ADD CONSTRAINT "ResearchResponse_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "SurveyRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
