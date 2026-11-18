-- CreateEnum
CREATE TYPE "SquadMemberStatus" AS ENUM ('invited', 'active');

-- CreateEnum
CREATE TYPE "ChallengeMetric" AS ENUM ('quests_completed', 'xp_earned');

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadMember" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SquadMemberStatus" NOT NULL,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "SquadMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadChallenge" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "metric" "ChallengeMetric" NOT NULL,
    "target" INTEGER NOT NULL,
    "bonusXp" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SquadChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadChallengeEntry" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SquadChallengeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SquadMember_userId_idx" ON "SquadMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadMember_squadId_userId_key" ON "SquadMember"("squadId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadChallengeEntry_squadId_challengeId_key" ON "SquadChallengeEntry"("squadId", "challengeId");

-- AddForeignKey
ALTER TABLE "Squad" ADD CONSTRAINT "Squad_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadMember" ADD CONSTRAINT "SquadMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadChallenge" ADD CONSTRAINT "SquadChallenge_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadChallengeEntry" ADD CONSTRAINT "SquadChallengeEntry_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadChallengeEntry" ADD CONSTRAINT "SquadChallengeEntry_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SquadChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One ACTIVE squad per person. A partial unique index: pending invites don't count, so someone
-- can hold several invites, but accepting one while already active elsewhere is refused by the
-- database itself, even if two requests race.
CREATE UNIQUE INDEX "SquadMember_one_active_squad_per_user" ON "SquadMember"("userId") WHERE "status" = 'active';
