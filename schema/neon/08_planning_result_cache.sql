-- Server-side cache for planning results (replaces in-memory Map for chat/planning).

CREATE TABLE IF NOT EXISTS planning_result_cache (
  id TEXT PRIMARY KEY,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planning_result_cache_created_at ON planning_result_cache(created_at);
