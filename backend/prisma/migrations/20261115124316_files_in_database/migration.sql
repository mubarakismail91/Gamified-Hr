-- Uploaded files move from the server's disk into PostgreSQL (item 12): free hosting platforms
-- wipe the disk on every restart. Files already on disk can't be carried over by SQL, so:
--   * submissions keep their file name/type/size but lose the (unrecoverable) path;
--   * attachments without stored contents are removed, since an attachment is only its file.
-- At the time of this migration no environment held uploaded files (the dev database was reset).

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- QuestSubmission: filePath -> fileId
ALTER TABLE "QuestSubmission" DROP COLUMN "filePath",
ADD COLUMN "fileId" TEXT;
CREATE UNIQUE INDEX "QuestSubmission_fileId_key" ON "QuestSubmission"("fileId");
ALTER TABLE "QuestSubmission" ADD CONSTRAINT "QuestSubmission_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- QuestAttachment: filePath -> fileId (required)
DELETE FROM "QuestAttachment";
ALTER TABLE "QuestAttachment" DROP COLUMN "filePath",
ADD COLUMN "fileId" TEXT NOT NULL;
CREATE UNIQUE INDEX "QuestAttachment_fileId_key" ON "QuestAttachment"("fileId");
ALTER TABLE "QuestAttachment" ADD CONSTRAINT "QuestAttachment_fileId_fkey"
  FOREIGN KEY ("fileId") REFERENCES "StoredFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
