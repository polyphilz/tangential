-- Projects table
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trees table
CREATE TABLE trees (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    system_prompt TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Nodes table (each node = one conversation turn)
CREATE TABLE nodes (
    id TEXT PRIMARY KEY,
    tree_id TEXT NOT NULL,
    parent_id TEXT,
    user_content TEXT NOT NULL,
    assistant_content TEXT,
    summary TEXT,
    model TEXT,
    tokens INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    failed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (tree_id) REFERENCES trees(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Settings table (key-value store)
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_trees_project_id ON trees(project_id);
CREATE INDEX idx_trees_deleted_at ON trees(deleted_at);
CREATE INDEX idx_nodes_tree_id ON nodes(tree_id);
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);

-- Full-text search for message content
CREATE VIRTUAL TABLE nodes_fts USING fts5(
    user_content,
    assistant_content,
    summary,
    content='nodes',
    content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER nodes_ai AFTER INSERT ON nodes BEGIN
    INSERT INTO nodes_fts(rowid, user_content, assistant_content, summary)
    VALUES (NEW.rowid, NEW.user_content, NEW.assistant_content, NEW.summary);
END;

CREATE TRIGGER nodes_ad AFTER DELETE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, user_content, assistant_content, summary)
    VALUES ('delete', OLD.rowid, OLD.user_content, OLD.assistant_content, OLD.summary);
END;

CREATE TRIGGER nodes_au AFTER UPDATE ON nodes BEGIN
    INSERT INTO nodes_fts(nodes_fts, rowid, user_content, assistant_content, summary)
    VALUES ('delete', OLD.rowid, OLD.user_content, OLD.assistant_content, OLD.summary);
    INSERT INTO nodes_fts(rowid, user_content, assistant_content, summary)
    VALUES (NEW.rowid, NEW.user_content, NEW.assistant_content, NEW.summary);
END;
