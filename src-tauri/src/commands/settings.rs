use crate::error::{AppError, Result};
use crate::models::Setting;
use crate::AppState;
use std::sync::Arc;
use tauri::State;

/// Get a setting by key
#[tauri::command]
pub fn get_setting(state: State<Arc<AppState>>, key: String) -> Result<Setting> {
    let conn = state.db.conn();

    conn.query_row(
        "SELECT key, value, created_at, updated_at FROM settings WHERE key = ?1",
        [&key],
        |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("Setting '{}' not found", key))
        }
        _ => AppError::Database(e),
    })
}

/// Get a setting value by key, returning None if not found
#[tauri::command]
pub fn get_setting_value(state: State<Arc<AppState>>, key: String) -> Result<Option<String>> {
    let conn = state.db.conn();

    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        [&key],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

/// Set a setting (insert or update)
#[tauri::command]
pub fn set_setting(state: State<Arc<AppState>>, key: String, value: String) -> Result<Setting> {
    let conn = state.db.conn();

    // Use INSERT OR REPLACE (UPSERT) pattern
    conn.execute(
        "INSERT INTO settings (key, value, created_at, updated_at)
         VALUES (?1, ?2, datetime('now'), NULL)
         ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = datetime('now')",
        (&key, &value),
    )?;

    // Return the setting
    conn.query_row(
        "SELECT key, value, created_at, updated_at FROM settings WHERE key = ?1",
        [&key],
        |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        },
    )
    .map_err(|e| AppError::Database(e))
}

/// List all settings
#[tauri::command]
pub fn list_settings(state: State<Arc<AppState>>) -> Result<Vec<Setting>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT key, value, created_at, updated_at FROM settings ORDER BY key ASC",
    )?;

    let settings = stmt
        .query_map([], |row| {
            Ok(Setting {
                key: row.get(0)?,
                value: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(settings)
}

/// Delete a setting
#[tauri::command]
pub fn delete_setting(state: State<Arc<AppState>>, key: String) -> Result<()> {
    let conn = state.db.conn();

    let rows_affected = conn.execute("DELETE FROM settings WHERE key = ?1", (&key,))?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Setting '{}' not found", key)));
    }

    Ok(())
}
