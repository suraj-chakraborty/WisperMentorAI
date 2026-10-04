-- CreateIndex
CREATE INDEX "sessions_mentorId_idx" ON "sessions"("mentorId");

-- CreateIndex
CREATE INDEX "concept_relations_fromId_idx" ON "concept_relations"("fromId");

-- CreateIndex
CREATE INDEX "concept_relations_toId_idx" ON "concept_relations"("toId");

-- CreateIndex
CREATE INDEX "memory_chunks_sessionId_idx" ON "memory_chunks"("sessionId");
