-- CreateIndex
CREATE INDEX "Kudo_toUserId_idx" ON "Kudo"("toUserId");

-- CreateIndex
CREATE INDEX "Kudo_createdAt_idx" ON "Kudo"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestAssignment_employeeId_status_idx" ON "QuestAssignment"("employeeId", "status");

-- CreateIndex
CREATE INDEX "QuestSubmission_employeeId_idx" ON "QuestSubmission"("employeeId");
