mod schema;

use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub use schema::MIGRATIONS;

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: PathBuf) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&path)?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys = ON;")?;

        let db = Self {
            conn: Mutex::new(conn),
        };

        db.run_migrations()?;

        Ok(db)
    }

    fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Create migrations table if it doesn't exist
        conn.execute(
            "CREATE TABLE IF NOT EXISTS _migrations (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                applied_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            [],
        )?;

        // Get list of applied migrations
        let mut stmt = conn.prepare("SELECT name FROM _migrations")?;
        let applied: Vec<String> = stmt
            .query_map([], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        // Apply pending migrations
        for (name, sql) in MIGRATIONS.iter() {
            if !applied.contains(&name.to_string()) {
                conn.execute_batch(sql)?;
                conn.execute(
                    "INSERT INTO _migrations (name) VALUES (?1)",
                    [name],
                )?;
            }
        }

        Ok(())
    }

    pub fn conn(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().unwrap()
    }
}

pub fn get_database_path() -> PathBuf {
    let proj_dirs = directories::ProjectDirs::from("com", "tangential", "Tangential")
        .expect("Failed to get project directories");

    proj_dirs.data_dir().join("tangential.db")
}
