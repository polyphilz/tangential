use serde::{Deserialize, Serialize};

/// Project - a container for related conversation trees
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// Tree - a branching conversation tree within a project
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tree {
    pub id: String,
    pub project_id: Option<String>,
    pub name: String,
    pub system_prompt: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// Node - a single conversation turn (user prompt + assistant response)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: String,
    pub tree_id: String,
    pub parent_id: Option<String>,
    pub user_content: String,
    pub assistant_content: Option<String>,
    pub summary: Option<String>,
    pub model: Option<String>,
    pub tokens: Option<i32>,
    pub created_at: String,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
    pub failed: bool,
}

/// Setting - key-value configuration entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

/// Input types for creating/updating entities

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProject {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProject {
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTree {
    pub project_id: Option<String>,
    pub name: String,
    pub system_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTree {
    pub project_id: Option<String>,
    pub name: Option<String>,
    pub system_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNode {
    pub tree_id: String,
    pub parent_id: Option<String>,
    pub user_content: String,
    pub assistant_content: Option<String>,
    pub summary: Option<String>,
    pub model: Option<String>,
    pub tokens: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateNode {
    pub user_content: Option<String>,
    pub assistant_content: Option<String>,
    pub summary: Option<String>,
    pub model: Option<String>,
    pub tokens: Option<i32>,
    pub failed: Option<bool>,
}
