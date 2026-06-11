CREATE TYPE pool_directed_invite_status AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE notification_event_type AS ENUM ('MATCH_STARTED', 'MATCH_FINISHED', 'POOL_INVITE', 'GLOBAL_RANK_IMPROVED', 'GOAL_SCORED');
CREATE TYPE notification_event_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE notification_delivery_status AS ENUM ('SENT', 'FAILED', 'SKIPPED');

CREATE TABLE pool_directed_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  invited_email_hash varchar(128),
  invited_nickname varchar(32),
  invite_token varchar(12) NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status pool_directed_invite_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE UNIQUE INDEX pool_directed_invites_pool_user_key
  ON pool_directed_invites(pool_id, invited_user_id)
  WHERE invited_user_id IS NOT NULL;
CREATE INDEX pool_directed_invites_invited_user_id_idx ON pool_directed_invites(invited_user_id);
CREATE INDEX pool_directed_invites_created_by_user_id_idx ON pool_directed_invites(created_by_user_id);
CREATE INDEX pool_directed_invites_invited_email_hash_idx ON pool_directed_invites(invited_email_hash);
CREATE INDEX pool_directed_invites_invite_token_idx ON pool_directed_invites(invite_token);

CREATE TABLE notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  match_started boolean NOT NULL DEFAULT false,
  match_finished boolean NOT NULL DEFAULT false,
  pool_invite boolean NOT NULL DEFAULT false,
  global_rank_improved boolean NOT NULL DEFAULT false,
  goal_scored boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent varchar(500),
  is_active boolean NOT NULL DEFAULT true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_reason varchar(500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_user_id_is_active_idx ON push_subscriptions(user_id, is_active);

CREATE TABLE notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_event_type NOT NULL,
  dedupe_key varchar(200) NOT NULL UNIQUE,
  recipient_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  status notification_event_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX notification_events_recipient_user_id_status_idx ON notification_events(recipient_user_id, status);
CREATE INDEX notification_events_status_created_at_idx ON notification_events(status, created_at);

CREATE TABLE notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES notification_events(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  status notification_delivery_status NOT NULL,
  provider_status_code integer,
  error_message varchar(500),
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_deliveries_event_id_idx ON notification_deliveries(event_id);
CREATE INDEX notification_deliveries_subscription_id_idx ON notification_deliveries(subscription_id);

ALTER TABLE pool_directed_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pool directed invites visible to participants"
  ON pool_directed_invites FOR SELECT
  USING (created_by_user_id = auth.uid() OR invited_user_id = auth.uid());

CREATE POLICY "notification preferences own read"
  ON notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notification preferences own write"
  ON notification_preferences FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "push subscriptions own read"
  ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push subscriptions own write"
  ON push_subscriptions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification events own read"
  ON notification_events FOR SELECT USING (recipient_user_id = auth.uid());

CREATE POLICY "notification deliveries own read"
  ON notification_deliveries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM push_subscriptions ps
    WHERE ps.id = notification_deliveries.subscription_id AND ps.user_id = auth.uid()
  ));
