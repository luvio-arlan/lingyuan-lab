-- Bootstrap snapshot of frontend/src/content/questions as of 2026-09-29.
-- WP4 sync-topics will replace manual updates when question files change.
BEGIN;

INSERT INTO discussion_topics (slug, state, sort_order) VALUES
  ('what-changes-first', 'open', 1),
  ('which-element-moves', 'open', 2),
  ('task-process-or-relationship', 'planned', 4),
  ('who-owns-agent-output', 'planned', 5)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
