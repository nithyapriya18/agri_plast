-- LLM usage tracking. user_id references users(id).

CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('chat', 'planning', 'explanation', 'optimization')),
  model_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  input_cost REAL NOT NULL,
  output_cost REAL NOT NULL,
  total_cost REAL GENERATED ALWAYS AS (input_cost + output_cost) STORED,
  request_duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_user_id ON llm_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_project_id ON llm_usage(project_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at ON llm_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_usage_operation_type ON llm_usage(operation_type);

CREATE OR REPLACE VIEW llm_usage_stats AS
SELECT
  user_id,
  project_id,
  operation_type,
  DATE(created_at) AS usage_date,
  COUNT(*) AS request_count,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(total_tokens) AS total_tokens,
  SUM(total_cost) AS total_cost,
  AVG(request_duration_ms) AS avg_duration_ms
FROM llm_usage
WHERE success = true
GROUP BY user_id, project_id, operation_type, DATE(created_at);
