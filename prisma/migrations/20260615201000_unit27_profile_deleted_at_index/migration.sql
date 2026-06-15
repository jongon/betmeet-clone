-- Unit 27: Index on Profile.deletedAt
-- Accelerates getGlobalRankSnapshot() (seq scan → index scan on deleted_at IS NULL)
-- and checkNicknameAvailability (WHERE deleted_at IS NULL filter).
CREATE INDEX "profiles_deleted_at_idx" ON "profiles"("deleted_at");
