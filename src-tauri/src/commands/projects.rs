use crate::error::{AppError, Result};
use crate::models::{CreateProject, Project, UpdateProject};
use crate::AppState;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

/// Create a new project
#[tauri::command]
pub fn create_project(state: State<Arc<AppState>>, input: CreateProject) -> Result<Project> {
    let conn = state.db.conn();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO projects (id, name) VALUES (?1, ?2)",
        (&id, &input.name),
    )?;

    get_project_by_id(&conn, &id)
}

/// Get a project by ID
#[tauri::command]
pub fn get_project(state: State<Arc<AppState>>, id: String) -> Result<Project> {
    let conn = state.db.conn();
    get_project_by_id(&conn, &id)
}

/// List all active (non-deleted) projects
#[tauri::command]
pub fn list_projects(state: State<Arc<AppState>>) -> Result<Vec<Project>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT id, name, created_at, updated_at, deleted_at
         FROM projects
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC",
    )?;

    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(projects)
}

/// List deleted projects (trash)
#[tauri::command]
pub fn list_deleted_projects(state: State<Arc<AppState>>) -> Result<Vec<Project>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT id, name, created_at, updated_at, deleted_at
         FROM projects
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC",
    )?;

    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(projects)
}

/// Update a project
#[tauri::command]
pub fn update_project(
    state: State<Arc<AppState>>,
    id: String,
    input: UpdateProject,
) -> Result<Project> {
    let conn = state.db.conn();

    // Check if project exists and is not deleted
    let existing = get_project_by_id(&conn, &id)?;
    if existing.deleted_at.is_some() {
        return Err(AppError::NotFound(format!("Project {id} is deleted")));
    }

    if let Some(name) = input.name {
        conn.execute(
            "UPDATE projects SET name = ?1, updated_at = datetime('now') WHERE id = ?2",
            (&name, &id),
        )?;
    }

    get_project_by_id(&conn, &id)
}

/// Soft delete a project (move to trash)
#[tauri::command]
pub fn delete_project(state: State<Arc<AppState>>, id: String) -> Result<Project> {
    let conn = state.db.conn();

    let rows_affected = conn.execute(
        "UPDATE projects SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1 AND deleted_at IS NULL",
        (&id,),
    )?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Project {id} not found")));
    }

    get_project_by_id(&conn, &id)
}

/// Restore a project from trash
#[tauri::command]
pub fn restore_project(state: State<Arc<AppState>>, id: String) -> Result<Project> {
    let conn = state.db.conn();

    let rows_affected = conn.execute(
        "UPDATE projects SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?1 AND deleted_at IS NOT NULL",
        (&id,),
    )?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!(
            "Deleted project {id} not found"
        )));
    }

    get_project_by_id(&conn, &id)
}

/// Permanently delete a project (cannot be undone)
#[tauri::command]
pub fn permanently_delete_project(state: State<Arc<AppState>>, id: String) -> Result<()> {
    let conn = state.db.conn();

    let rows_affected = conn.execute("DELETE FROM projects WHERE id = ?1", (&id,))?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Project {id} not found")));
    }

    Ok(())
}

/// Helper function to get a project by ID
fn get_project_by_id(
    conn: &std::sync::MutexGuard<'_, rusqlite::Connection>,
    id: &str,
) -> Result<Project> {
    conn.query_row(
        "SELECT id, name, created_at, updated_at, deleted_at FROM projects WHERE id = ?1",
        [id],
        |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                created_at: row.get(2)?,
                updated_at: row.get(3)?,
                deleted_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => {
            AppError::NotFound(format!("Project {id} not found"))
        }
        _ => AppError::Database(e),
    })
}
