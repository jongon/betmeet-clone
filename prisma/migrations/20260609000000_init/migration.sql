-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'ADMIN');

-- CreateEnum
CREATE TYPE "AvatarSource" AS ENUM ('GOOGLE_PHOTO', 'DEFAULT_SET', 'CUSTOM_UPLOAD');

-- CreateEnum
CREATE TYPE "PoolType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "CompetitionPhaseType" AS ENUM ('GROUP', 'KNOCKOUT', 'LEAGUE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LOCKED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProviderSyncStatus" AS ENUM ('STARTED', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'RATE_LIMITED', 'SKIPPED_LOCKED');

-- CreateEnum
CREATE TYPE "ProviderSyncScope" AS ENUM ('TEAMS', 'FIXTURES', 'LIVE_STATUS', 'RESULTS', 'FULL', 'CLEANUP');

-- CreateEnum
CREATE TYPE "pool_directed_invite_status" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PredictionLockReason" AS ENUM ('KICKOFF_REACHED', 'MATCH_STATUS_LOCKED', 'MATCH_NOT_EDITABLE', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScoreMatchedCase" AS ENUM ('EXACT', 'RESULT', 'PARTIAL', 'MISS');

-- CreateEnum
CREATE TYPE "notification_event_type" AS ENUM ('MATCH_STARTED', 'MATCH_FINISHED', 'POOL_INVITE', 'GLOBAL_RANK_IMPROVED', 'GOAL_SCORED');

-- CreateEnum
CREATE TYPE "notification_event_status" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "notification_delivery_status" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "nickname_base" VARCHAR(20),
    "nickname_discriminator" CHAR(4),
    "avatar_url" TEXT NOT NULL,
    "avatar_source" "AvatarSource" NOT NULL DEFAULT 'DEFAULT_SET',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avatar_assets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "storage_path" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "avatar_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pools" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "type" "PoolType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "invite_token" VARCHAR(12) NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_directed_invites" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "invited_user_id" UUID,
    "invited_email_hash" VARCHAR(128),
    "invited_nickname" VARCHAR(32),
    "invite_token" VARCHAR(12) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "status" "pool_directed_invite_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "pool_directed_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pool_memberships" (
    "id" UUID NOT NULL,
    "pool_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "pool_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "season" VARCHAR(20) NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'UTC',
    "provider" VARCHAR(40),
    "provider_competition_id" VARCHAR(80),
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_phases" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "CompetitionPhaseType" NOT NULL,
    "group_code" VARCHAR(8),
    "display_order" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "provider_phase_id" VARCHAR(80),

    CONSTRAINT "competition_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "fifa_code" CHAR(3) NOT NULL,
    "iso_alpha2" VARCHAR(12),
    "flag_key" VARCHAR(24) NOT NULL,
    "flag_path" VARCHAR(120) NOT NULL,
    "provider_team_id" VARCHAR(80),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "phase_id" UUID NOT NULL,
    "provider_match_id" VARCHAR(80),
    "match_number" INTEGER,
    "kickoff_at" TIMESTAMP(3),
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "raw_status" VARCHAR(80),
    "home_team_id" UUID,
    "away_team_id" UUID,
    "home_placeholder" VARCHAR(120),
    "away_placeholder" VARCHAR(120),
    "home_score" INTEGER,
    "away_score" INTEGER,
    "home_penalty_score" INTEGER,
    "away_penalty_score" INTEGER,
    "winner_team_id" UUID,
    "manual_override" BOOLEAN NOT NULL DEFAULT false,
    "manual_override_reason" VARCHAR(500),
    "overridden_by_user_id" UUID,
    "overridden_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_sync_runs" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "scope" "ProviderSyncScope" NOT NULL,
    "window_key" VARCHAR(120) NOT NULL,
    "status" "ProviderSyncStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "lock_expires_at" TIMESTAMP(3),
    "items_fetched" INTEGER NOT NULL DEFAULT 0,
    "items_updated" INTEGER NOT NULL DEFAULT 0,
    "error_message" VARCHAR(1000),
    "provider_request_id" VARCHAR(120),
    "metadata" JSONB,

    CONSTRAINT "provider_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "home_score" INTEGER NOT NULL,
    "away_score" INTEGER NOT NULL,
    "penalty_winner_team_id" UUID,
    "locked_at" TIMESTAMP(3),
    "lock_reason" "PredictionLockReason",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction_scores" (
    "id" UUID NOT NULL,
    "prediction_id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "matched_case" "ScoreMatchedCase" NOT NULL,
    "base_points" INTEGER NOT NULL,
    "penalty_applied" BOOLEAN NOT NULL DEFAULT false,
    "penalty_points" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL,
    "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "match_started" BOOLEAN NOT NULL DEFAULT false,
    "match_finished" BOOLEAN NOT NULL DEFAULT false,
    "pool_invite" BOOLEAN NOT NULL DEFAULT false,
    "global_rank_improved" BOOLEAN NOT NULL DEFAULT false,
    "goal_scored" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "failure_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" UUID NOT NULL,
    "type" "notification_event_type" NOT NULL,
    "dedupe_key" VARCHAR(200) NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "notification_event_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "status" "notification_delivery_status" NOT NULL,
    "provider_status_code" INTEGER,
    "error_message" VARCHAR(500),
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_nickname_base_nickname_discriminator_key" ON "profiles"("nickname_base", "nickname_discriminator");

-- CreateIndex
CREATE UNIQUE INDEX "pools_invite_token_key" ON "pools"("invite_token");

-- CreateIndex
CREATE INDEX "pools_owner_id_idx" ON "pools"("owner_id");

-- CreateIndex
CREATE INDEX "pools_type_idx" ON "pools"("type");

-- CreateIndex
CREATE INDEX "pool_directed_invites_invited_user_id_idx" ON "pool_directed_invites"("invited_user_id");

-- CreateIndex
CREATE INDEX "pool_directed_invites_created_by_user_id_idx" ON "pool_directed_invites"("created_by_user_id");

-- CreateIndex
CREATE INDEX "pool_directed_invites_invited_email_hash_idx" ON "pool_directed_invites"("invited_email_hash");

-- CreateIndex
CREATE INDEX "pool_directed_invites_invite_token_idx" ON "pool_directed_invites"("invite_token");

-- CreateIndex
CREATE UNIQUE INDEX "pool_directed_invites_pool_id_invited_user_id_key" ON "pool_directed_invites"("pool_id", "invited_user_id");

-- CreateIndex
CREATE INDEX "pool_memberships_user_id_idx" ON "pool_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pool_memberships_pool_id_user_id_key" ON "pool_memberships"("pool_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE INDEX "competitions_is_active_idx" ON "competitions"("is_active");

-- CreateIndex
CREATE INDEX "competition_phases_competition_id_type_idx" ON "competition_phases"("competition_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "competition_phases_competition_id_display_order_key" ON "competition_phases"("competition_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "teams_fifa_code_key" ON "teams"("fifa_code");

-- CreateIndex
CREATE UNIQUE INDEX "teams_provider_team_id_key" ON "teams"("provider_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "matches_provider_match_id_key" ON "matches"("provider_match_id");

-- CreateIndex
CREATE INDEX "matches_competition_id_idx" ON "matches"("competition_id");

-- CreateIndex
CREATE INDEX "matches_phase_id_idx" ON "matches"("phase_id");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_kickoff_at_idx" ON "matches"("kickoff_at");

-- CreateIndex
CREATE UNIQUE INDEX "matches_competition_id_match_number_key" ON "matches"("competition_id", "match_number");

-- CreateIndex
CREATE INDEX "provider_sync_runs_provider_scope_status_idx" ON "provider_sync_runs"("provider", "scope", "status");

-- CreateIndex
CREATE INDEX "provider_sync_runs_started_at_idx" ON "provider_sync_runs"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_sync_runs_provider_scope_window_key_key" ON "provider_sync_runs"("provider", "scope", "window_key");

-- CreateIndex
CREATE INDEX "predictions_user_id_idx" ON "predictions"("user_id");

-- CreateIndex
CREATE INDEX "predictions_match_id_idx" ON "predictions"("match_id");

-- CreateIndex
CREATE INDEX "predictions_locked_at_idx" ON "predictions"("locked_at");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_user_id_match_id_key" ON "predictions"("user_id", "match_id");

-- CreateIndex
CREATE UNIQUE INDEX "prediction_scores_prediction_id_key" ON "prediction_scores"("prediction_id");

-- CreateIndex
CREATE INDEX "prediction_scores_match_id_idx" ON "prediction_scores"("match_id");

-- CreateIndex
CREATE INDEX "prediction_scores_user_id_idx" ON "prediction_scores"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_is_active_idx" ON "push_subscriptions"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notification_events_dedupe_key_key" ON "notification_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "notification_events_recipient_user_id_status_idx" ON "notification_events"("recipient_user_id", "status");

-- CreateIndex
CREATE INDEX "notification_events_status_created_at_idx" ON "notification_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_event_id_idx" ON "notification_deliveries"("event_id");

-- CreateIndex
CREATE INDEX "notification_deliveries_subscription_id_idx" ON "notification_deliveries"("subscription_id");

-- AddForeignKey
ALTER TABLE "pools" ADD CONSTRAINT "pools_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_directed_invites" ADD CONSTRAINT "pool_directed_invites_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_directed_invites" ADD CONSTRAINT "pool_directed_invites_invited_user_id_fkey" FOREIGN KEY ("invited_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_directed_invites" ADD CONSTRAINT "pool_directed_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_memberships" ADD CONSTRAINT "pool_memberships_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "pools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pool_memberships" ADD CONSTRAINT "pool_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_phases" ADD CONSTRAINT "competition_phases_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "competition_phases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_team_id_fkey" FOREIGN KEY ("winner_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_penalty_winner_team_id_fkey" FOREIGN KEY ("penalty_winner_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_scores" ADD CONSTRAINT "prediction_scores_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "predictions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_scores" ADD CONSTRAINT "prediction_scores_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_scores" ADD CONSTRAINT "prediction_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "notification_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "push_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

