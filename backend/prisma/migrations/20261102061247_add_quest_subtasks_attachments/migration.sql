-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "instructionsAr" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "instructionsEn" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "QuestSubtask" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,

    CONSTRAINT "QuestSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubtask" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "subtaskId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentSubtask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestAttachment" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubtask_assignmentId_subtaskId_key" ON "AssignmentSubtask"("assignmentId", "subtaskId");

-- AddForeignKey
ALTER TABLE "QuestSubtask" ADD CONSTRAINT "QuestSubtask_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubtask" ADD CONSTRAINT "AssignmentSubtask_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "QuestAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubtask" ADD CONSTRAINT "AssignmentSubtask_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "QuestSubtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestAttachment" ADD CONSTRAINT "QuestAttachment_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
