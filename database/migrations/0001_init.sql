-- WP3 baseline. Migrations are applied in lexical order by the WP4 admin command.
-- This file can also be run with psql for the WP3 database-only verification.
BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS discussion_topics (
  slug       text PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  state      text NOT NULL CHECK (state IN ('open', 'planned', 'closed')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contributions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_slug   text NOT NULL REFERENCES discussion_topics (slug) ON UPDATE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('opinion', 'case', 'counterexample')),
  body         text NOT NULL CHECK (char_length(body) BETWEEN 20 AND 2000),
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'published', 'rejected')),
  lab_response text CHECK (lab_response IS NULL OR char_length(lab_response) <= 2000),
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CHECK ((status = 'published') = (published_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS contributions_public_idx
  ON contributions (topic_slug, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS contributions_pending_idx
  ON contributions (created_at) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS moderation_events (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contribution_id uuid NOT NULL REFERENCES contributions (id) ON DELETE RESTRICT,
  action          text NOT NULL
                    CHECK (action IN ('publish', 'reject', 'respond', 'unpublish')),
  reason          text,
  actor           text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (action NOT IN ('reject', 'unpublish') OR reason IS NOT NULL)
);

INSERT INTO schema_migrations (version) VALUES ('0001_init')
ON CONFLICT (version) DO NOTHING;

COMMIT;
