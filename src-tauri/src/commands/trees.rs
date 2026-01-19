use crate::error::{AppError, Result};
use crate::models::{CreateTree, Tree, UpdateTree};
use crate::AppState;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

/// Create a new tree
#[tauri::command]
pub fn create_tree(state: State<Arc<AppState>>, input: CreateTree) -> Result<Tree> {
    let conn = state.db.conn();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO trees (id, project_id, name, system_prompt) VALUES (?1, ?2, ?3, ?4)",
        (&id, &input.project_id, &input.name, &input.system_prompt),
    )?;

    get_tree_by_id(&conn, &id)
}

/// Get a tree by ID
#[tauri::command]
pub fn get_tree(state: State<Arc<AppState>>, id: String) -> Result<Tree> {
    let conn = state.db.conn();
    get_tree_by_id(&conn, &id)
}

/// List all active (non-deleted) trees, optionally filtered by project
#[tauri::command]
pub fn list_trees(state: State<Arc<AppState>>, project_id: Option<String>) -> Result<Vec<Tree>> {
    let conn = state.db.conn();

    let trees = if let Some(pid) = project_id {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, system_prompt, created_at, updated_at, deleted_at
             FROM trees
             WHERE project_id = ?1 AND deleted_at IS NULL
             ORDER BY created_at DESC",
        )?;
        let result = stmt
            .query_map([&pid], map_tree)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        result
    } else {
        let mut stmt = conn.prepare(
            "SELECT id, project_id, name, system_prompt, created_at, updated_at, deleted_at
             FROM trees
             WHERE deleted_at IS NULL
             ORDER BY created_at DESC",
        )?;
        let result = stmt
            .query_map([], map_tree)?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        result
    };

    Ok(trees)
}

/// List trees in staging (no project assigned)
#[tauri::command]
pub fn list_staging_trees(state: State<Arc<AppState>>) -> Result<Vec<Tree>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, system_prompt, created_at, updated_at, deleted_at
         FROM trees
         WHERE project_id IS NULL AND deleted_at IS NULL
         ORDER BY created_at DESC",
    )?;

    let trees = stmt
        .query_map([], map_tree)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(trees)
}

/// List deleted trees (trash)
#[tauri::command]
pub fn list_deleted_trees(state: State<Arc<AppState>>) -> Result<Vec<Tree>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT id, project_id, name, system_prompt, created_at, updated_at, deleted_at
         FROM trees
         WHERE deleted_at IS NOT NULL
         ORDER BY deleted_at DESC",
    )?;

    let trees = stmt
        .query_map([], map_tree)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(trees)
}

/// Update a tree
#[tauri::command]
pub fn update_tree(state: State<Arc<AppState>>, id: String, input: UpdateTree) -> Result<Tree> {
    let conn = state.db.conn();

    // Check if tree exists and is not deleted
    let existing = get_tree_by_id(&conn, &id)?;
    if existing.deleted_at.is_some() {
        return Err(AppError::NotFound(format!("Tree {} is deleted", id)));
    }

    // Build dynamic update query
    let mut updates = vec!["updated_at = datetime('now')".to_string()];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(ref project_id) = input.project_id {
        updates.push(format!("project_id = ?{}", params.len() + 1));
        params.push(Box::new(project_id.clone()));
    }
    if let Some(ref name) = input.name {
        updates.push(format!("name = ?{}", params.len() + 1));
        params.push(Box::new(name.clone()));
    }
    if let Some(ref system_prompt) = input.system_prompt {
        updates.push(format!("system_prompt = ?{}", params.len() + 1));
        params.push(Box::new(system_prompt.clone()));
    }

    let query = format!(
        "UPDATE trees SET {} WHERE id = ?{}",
        updates.join(", "),
        params.len() + 1
    );
    params.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;

    get_tree_by_id(&conn, &id)
}

/// Soft delete a tree (move to trash)
#[tauri::command]
pub fn delete_tree(state: State<Arc<AppState>>, id: String) -> Result<Tree> {
    let conn = state.db.conn();

    let rows_affected = conn.execute(
        "UPDATE trees SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1 AND deleted_at IS NULL",
        (&id,),
    )?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Tree {} not found", id)));
    }

    get_tree_by_id(&conn, &id)
}

/// Restore a tree from trash
#[tauri::command]
pub fn restore_tree(state: State<Arc<AppState>>, id: String) -> Result<Tree> {
    let conn = state.db.conn();

    let rows_affected = conn.execute(
        "UPDATE trees SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?1 AND deleted_at IS NOT NULL",
        (&id,),
    )?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Deleted tree {} not found", id)));
    }

    get_tree_by_id(&conn, &id)
}

/// Permanently delete a tree (cannot be undone)
#[tauri::command]
pub fn permanently_delete_tree(state: State<Arc<AppState>>, id: String) -> Result<()> {
    let conn = state.db.conn();

    // Due to CASCADE, this will also delete all nodes in the tree
    let rows_affected = conn.execute("DELETE FROM trees WHERE id = ?1", (&id,))?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Tree {} not found", id)));
    }

    Ok(())
}

/// Helper function to map a row to a Tree
fn map_tree(row: &rusqlite::Row<'_>) -> rusqlite::Result<Tree> {
    Ok(Tree {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        system_prompt: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
        deleted_at: row.get(6)?,
    })
}

/// Helper function to get a tree by ID
fn get_tree_by_id(
    conn: &std::sync::MutexGuard<'_, rusqlite::Connection>,
    id: &str,
) -> Result<Tree> {
    conn.query_row(
        "SELECT id, project_id, name, system_prompt, created_at, updated_at, deleted_at FROM trees WHERE id = ?1",
        [id],
        map_tree,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Tree {} not found", id)),
        _ => AppError::Database(e),
    })
}
