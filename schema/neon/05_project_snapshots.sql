-- Project snapshots (for undo/redo via chat).

CREATE TABLE IF NOT EXISTS project_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_by_message_id UUID REFERENCES chat_messages(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
