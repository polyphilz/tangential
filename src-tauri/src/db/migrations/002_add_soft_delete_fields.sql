-- Add deleted_at to projects
ALTER TABLE projects ADD COLUMN deleted_at TEXT;

-- Add updated_at and deleted_at to nodes
ALTER TABLE nodes ADD COLUMN updated_at TEXT;
ALTER TABLE nodes ADD COLUMN deleted_at TEXT;

-- Add timestamps to settings
ALTER TABLE settings ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE settings ADD COLUMN updated_at TEXT;

-- Indexes for soft delete queries
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX idx_nodes_deleted_at ON nodes(deleted_at);
