-- CreateEnum
CREATE TYPE "Role" AS ENUM ('employee', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "QuestCadence" AS ENUM ('daily', 'epic');

-- CreateEnum
CREATE TYPE "QuestDifficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('draft', 'published');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('accepted', 'pending_approval', 'completed');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'approved', 'denied');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('xp', 'badge', 'social', 'quest', 'system');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('xp', 'badge', 'quest', 'kudo', 'level');

-- CreateEnum
CREATE TYPE "KudoValue" AS ENUM ('collaboration', 'excellence', 'initiative', 'mentorship', 'service', 'integrity');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "gender" "Gender" NOT NULL,
    "departmentId" TEXT,
    "officeEn" TEXT NOT NULL DEFAULT '',
    "officeAr" TEXT NOT NULL DEFAULT '',
    "collegeEn" TEXT NOT NULL DEFAULT '',
    "collegeAr" TEXT NOT NULL DEFAULT '',
    "avatarTone" TEXT NOT NULL,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentStreakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "categoryEn" TEXT NOT NULL,
    "categoryAr" TEXT NOT NULL,
    "cadence" "QuestCadence" NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL DEFAULT 'medium',
    "xp" INTEGER NOT NULL,
    "steps" INTEGER NOT NULL DEFAULT 1,
    "dueAt" TIMESTAMP(3),
    "requireFile" BOOLEAN NOT NULL DEFAULT false,
    "status" "QuestStatus" NOT NULL DEFAULT 'published',
    "departmentId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestAssignment" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'accepted',
    "stepsDone" INTEGER NOT NULL DEFAULT 0,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionNote" TEXT,

    CONSTRAINT "QuestAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fileName" TEXT,
    "filePath" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "feedback" TEXT,

    CONSTRAINT "QuestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "howToEn" TEXT NOT NULL,
    "howToAr" TEXT NOT NULL,
    "groupEn" TEXT NOT NULL,
    "groupAr" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "criteria" JSONB,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awardedById" TEXT,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kudo" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "value" "KudoValue" NOT NULL,
    "messageEn" TEXT NOT NULL,
    "messageAr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "xpDelta" INTEGER NOT NULL DEFAULT 0,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_managerId_key" ON "Department"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffId_key" ON "User"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "QuestAssignment_questId_employeeId_key" ON "QuestAssignment"("questId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAssignment" ADD CONSTRAINT "QuestAssignment_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSubmission" ADD CONSTRAINT "QuestSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "QuestAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSubmission" ADD CONSTRAINT "QuestSubmission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudo" ADD CONSTRAINT "Kudo_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudo" ADD CONSTRAINT "Kudo_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
