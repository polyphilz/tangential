use crate::error::{AppError, Result};
use crate::models::{CreateNode, Node, UpdateNode};
use crate::AppState;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;

/// Create a new node
#[tauri::command]
pub fn create_node(state: State<Arc<AppState>>, input: CreateNode) -> Result<Node> {
    let conn = state.db.conn();
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO nodes (id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        (
            &id,
            &input.tree_id,
            &input.parent_id,
            &input.user_content,
            &input.assistant_content,
            &input.summary,
            &input.model,
            &input.tokens,
        ),
    )?;

    get_node_by_id(&conn, &id)
}

/// Get a node by ID
#[tauri::command]
pub fn get_node(state: State<Arc<AppState>>, id: String) -> Result<Node> {
    let conn = state.db.conn();
    get_node_by_id(&conn, &id)
}

/// List all active (non-deleted) nodes in a tree
#[tauri::command]
pub fn list_nodes(state: State<Arc<AppState>>, tree_id: String) -> Result<Vec<Node>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens, created_at, updated_at, deleted_at, failed
         FROM nodes
         WHERE tree_id = ?1 AND deleted_at IS NULL
         ORDER BY created_at ASC",
    )?;

    let nodes = stmt
        .query_map([&tree_id], map_node)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(nodes)
}

/// Get root nodes (nodes without a parent) in a tree
#[tauri::command]
pub fn get_root_nodes(state: State<Arc<AppState>>, tree_id: String) -> Result<Vec<Node>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens, created_at, updated_at, deleted_at, failed
         FROM nodes
         WHERE tree_id = ?1 AND parent_id IS NULL AND deleted_at IS NULL
         ORDER BY created_at ASC",
    )?;

    let nodes = stmt
        .query_map([&tree_id], map_node)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(nodes)
}

/// Get children of a node
#[tauri::command]
pub fn get_child_nodes(state: State<Arc<AppState>>, parent_id: String) -> Result<Vec<Node>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens, created_at, updated_at, deleted_at, failed
         FROM nodes
         WHERE parent_id = ?1 AND deleted_at IS NULL
         ORDER BY created_at ASC",
    )?;

    let nodes = stmt
        .query_map([&parent_id], map_node)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(nodes)
}

/// Get the path from a node to the root (for context building)
/// Returns nodes in order from root to the specified node
#[tauri::command]
pub fn get_node_path(state: State<Arc<AppState>>, node_id: String) -> Result<Vec<Node>> {
    let conn = state.db.conn();

    // Use recursive CTE to traverse up the tree
    let mut stmt = conn.prepare(
        "WITH RECURSIVE path AS (
            SELECT id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens, created_at, updated_at, deleted_at, failed, 0 as depth
            FROM nodes
            WHERE id = ?1 AND deleted_at IS NULL
            UNION ALL
            SELECT n.id, n.tree_id, n.parent_id, n.user_content, n.assistant_content, n.summary, n.model, n.tokens, n.created_at, n.updated_at, n.deleted_at, n.failed, p.depth + 1
            FROM nodes n
            INNER JOIN path p ON n.id = p.parent_id
            WHERE n.deleted_at IS NULL
        )
        SELECT id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens, created_at, updated_at, deleted_at, failed
        FROM path
        ORDER BY depth DESC",
    )?;

    let nodes = stmt
        .query_map([&node_id], map_node)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    if nodes.is_empty() {
        return Err(AppError::NotFound(format!("Node {} not found", node_id)));
    }

    Ok(nodes)
}

/// Get all leaf nodes in a tree (nodes without children)
#[tauri::command]
pub fn get_leaf_nodes(state: State<Arc<AppState>>, tree_id: String) -> Result<Vec<Node>> {
    let conn = state.db.conn();

    let mut stmt = conn.prepare(
        "SELECT n.id, n.tree_id, n.parent_id, n.user_content, n.assistant_content, n.summary, n.model, n.tokens, n.created_at, n.updated_at, n.deleted_at, n.failed
         FROM nodes n
         WHERE n.tree_id = ?1
           AND n.deleted_at IS NULL
           AND NOT EXISTS (
               SELECT 1 FROM nodes child
               WHERE child.parent_id = n.id AND child.deleted_at IS NULL
           )
         ORDER BY n.created_at ASC",
    )?;

    let nodes = stmt
        .query_map([&tree_id], map_node)?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(nodes)
}

/// Update a node
#[tauri::command]
pub fn update_node(state: State<Arc<AppState>>, id: String, input: UpdateNode) -> Result<Node> {
    let conn = state.db.conn();

    // Check if node exists and is not deleted
    let existing = get_node_by_id(&conn, &id)?;
    if existing.deleted_at.is_some() {
        return Err(AppError::NotFound(format!("Node {} is deleted", id)));
    }

    // Build dynamic update query
    let mut updates = vec!["updated_at = datetime('now')".to_string()];
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![];

    if let Some(ref user_content) = input.user_content {
        updates.push(format!("user_content = ?{}", params.len() + 1));
        params.push(Box::new(user_content.clone()));
    }
    if let Some(ref assistant_content) = input.assistant_content {
        updates.push(format!("assistant_content = ?{}", params.len() + 1));
        params.push(Box::new(assistant_content.clone()));
    }
    if let Some(ref summary) = input.summary {
        updates.push(format!("summary = ?{}", params.len() + 1));
        params.push(Box::new(summary.clone()));
    }
    if let Some(ref model) = input.model {
        updates.push(format!("model = ?{}", params.len() + 1));
        params.push(Box::new(model.clone()));
    }
    if let Some(tokens) = input.tokens {
        updates.push(format!("tokens = ?{}", params.len() + 1));
        params.push(Box::new(tokens));
    }
    if let Some(failed) = input.failed {
        updates.push(format!("failed = ?{}", params.len() + 1));
        params.push(Box::new(if failed { 1 } else { 0 }));
    }

    let query = format!(
        "UPDATE nodes SET {} WHERE id = ?{}",
        updates.join(", "),
        params.len() + 1
    );
    params.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    conn.execute(&query, params_refs.as_slice())?;

    get_node_by_id(&conn, &id)
}

/// Soft delete a node (move to trash)
#[tauri::command]
pub fn delete_node(state: State<Arc<AppState>>, id: String) -> Result<Node> {
    let conn = state.db.conn();

    let rows_affected = conn.execute(
        "UPDATE nodes SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?1 AND deleted_at IS NULL",
        (&id,),
    )?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Node {} not found", id)));
    }

    get_node_by_id(&conn, &id)
}

/// Restore a node from trash
#[tauri::command]
pub fn restore_node(state: State<Arc<AppState>>, id: String) -> Result<Node> {
    let conn = state.db.conn();

    let rows_affected = conn.execute(
        "UPDATE nodes SET deleted_at = NULL, updated_at = datetime('now') WHERE id = ?1 AND deleted_at IS NOT NULL",
        (&id,),
    )?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Deleted node {} not found", id)));
    }

    get_node_by_id(&conn, &id)
}

/// Permanently delete a node (cannot be undone)
/// Note: Due to CASCADE, this will also delete all child nodes
#[tauri::command]
pub fn permanently_delete_node(state: State<Arc<AppState>>, id: String) -> Result<()> {
    let conn = state.db.conn();

    let rows_affected = conn.execute("DELETE FROM nodes WHERE id = ?1", (&id,))?;

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Node {} not found", id)));
    }

    Ok(())
}

/// Helper function to map a row to a Node
fn map_node(row: &rusqlite::Row<'_>) -> rusqlite::Result<Node> {
    Ok(Node {
        id: row.get(0)?,
        tree_id: row.get(1)?,
        parent_id: row.get(2)?,
        user_content: row.get(3)?,
        assistant_content: row.get(4)?,
        summary: row.get(5)?,
        model: row.get(6)?,
        tokens: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
        deleted_at: row.get(10)?,
        failed: row.get::<_, i32>(11)? != 0,
    })
}

/// Helper function to get a node by ID
fn get_node_by_id(
    conn: &std::sync::MutexGuard<'_, rusqlite::Connection>,
    id: &str,
) -> Result<Node> {
    conn.query_row(
        "SELECT id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens, created_at, updated_at, deleted_at, failed
         FROM nodes WHERE id = ?1",
        [id],
        map_node,
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Node {} not found", id)),
        _ => AppError::Database(e),
    })
}
