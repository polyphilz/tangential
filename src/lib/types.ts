// Types matching the Rust models in src-tauri/src/models.rs

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface Tree {
  id: string;
  project_id: string | null;
  name: string;
  system_prompt: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface Node {
  id: string;
  tree_id: string;
  parent_id: string | null;
  user_content: string;
  assistant_content: string | null;
  summary: string | null;
  model: string | null;
  tokens: number | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  failed: boolean;
}

export interface Setting {
  key: string;
  value: string;
  created_at: string;
  updated_at: string | null;
}

// Input types for creating/updating entities

export interface CreateProject {
  name: string;
}

export interface UpdateProject {
  name?: string;
}

export interface CreateTree {
  project_id?: string | null;
  name: string;
  system_prompt?: string | null;
}

export interface UpdateTree {
  project_id?: string | null;
  name?: string;
  system_prompt?: string | null;
}

export interface CreateNode {
  tree_id: string;
  parent_id?: string | null;
  user_content: string;
  assistant_content?: string | null;
  summary?: string | null;
  model?: string | null;
  tokens?: number | null;
}

export interface UpdateNode {
  user_content?: string;
  assistant_content?: string;
  summary?: string;
  model?: string;
  tokens?: number;
  failed?: boolean;
}
