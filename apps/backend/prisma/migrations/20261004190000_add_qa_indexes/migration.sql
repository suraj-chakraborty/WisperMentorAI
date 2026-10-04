-- CreateIndex
CREATE INDEX IF NOT EXISTS "questions_userId_idx" ON "questions"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "answers_questionId_idx" ON "answers"("questionId");
