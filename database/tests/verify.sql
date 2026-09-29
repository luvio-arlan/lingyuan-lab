-- Run with psql -X -v ON_ERROR_STOP=1 -f database/tests/verify.sql.
-- The transaction is rolled back so this test leaves no discussion data behind.
BEGIN;

CREATE FUNCTION pg_temp.expect_error(statement text, expected_code text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  actual_code text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_code = RETURNED_SQLSTATE;
  END;

  IF actual_code IS DISTINCT FROM expected_code THEN
    RAISE EXCEPTION 'Expected SQLSTATE %, got % for %', expected_code, actual_code, statement;
  END IF;
END;
$$;

DO $$
BEGIN
  IF (SELECT count(*) FROM schema_migrations WHERE version = '0001_init') <> 1 THEN
    RAISE EXCEPTION 'Migration 0001_init must be recorded exactly once';
  END IF;
  IF (SELECT count(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN
        ('schema_migrations', 'discussion_topics', 'contributions', 'moderation_events')) <> 4 THEN
    RAISE EXCEPTION 'Expected all four WP3 tables';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('discussion_topics', 'contributions', 'moderation_events')
        AND column_name IN ('name', 'email', 'ip', 'user_agent')) THEN
    RAISE EXCEPTION 'Discussion tables contain a forbidden personal-data column';
  END IF;
END;
$$;

INSERT INTO discussion_topics (slug, state) VALUES ('test-topic', 'open');
INSERT INTO contributions (topic_slug, kind, body)
VALUES ('test-topic', 'opinion', repeat('字', 20));
INSERT INTO contributions (topic_slug, kind, body, status, published_at)
VALUES ('test-topic', 'case', repeat('字', 2000), 'published', now());

SELECT pg_temp.expect_error(
  $sql$INSERT INTO discussion_topics (slug, state) VALUES ('bad-state', 'unknown')$sql$, '23514');
SELECT pg_temp.expect_error(
  $sql$INSERT INTO contributions (topic_slug, kind, body) VALUES ('test-topic', 'unknown', repeat('x', 20))$sql$, '23514');
SELECT pg_temp.expect_error(
  $sql$INSERT INTO contributions (topic_slug, kind, body, status) VALUES ('test-topic', 'opinion', repeat('x', 20), 'unknown')$sql$, '23514');
SELECT pg_temp.expect_error(
  $sql$INSERT INTO contributions (topic_slug, kind, body) VALUES ('test-topic', 'opinion', repeat('x', 19))$sql$, '23514');
SELECT pg_temp.expect_error(
  $sql$INSERT INTO contributions (topic_slug, kind, body) VALUES ('test-topic', 'opinion', repeat('x', 2001))$sql$, '23514');
SELECT pg_temp.expect_error(
  $sql$INSERT INTO contributions (topic_slug, kind, body, status) VALUES ('test-topic', 'opinion', repeat('x', 20), 'published')$sql$, '23514');
SELECT pg_temp.expect_error(
  $sql$INSERT INTO contributions (topic_slug, kind, body) VALUES ('missing-topic', 'opinion', repeat('x', 20))$sql$, '23503');

ROLLBACK;
