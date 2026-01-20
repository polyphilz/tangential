// Typed wrappers around Tauri IPC commands
// These functions provide type-safe access to the Rust backend

import { invoke } from "@tauri-apps/api/core";
import type {
  Project,
  Tree,
  Node,
  Setting,
  CreateProject,
  UpdateProject,
  CreateTree,
  UpdateTree,
  CreateNode,
  UpdateNode,
} from "./types";

// ============================================================================
// Projects
// ============================================================================

export const projects = {
  create: (input: CreateProject): Promise<Project> => invoke("create_project", { input }),

  get: (id: string): Promise<Project> => invoke("get_project", { id }),

  list: (): Promise<Project[]> => invoke("list_projects"),

  listDeleted: (): Promise<Project[]> => invoke("list_deleted_projects"),

  update: (id: string, input: UpdateProject): Promise<Project> =>
    invoke("update_project", { id, input }),

  delete: (id: string): Promise<Project> => invoke("delete_project", { id }),

  restore: (id: string): Promise<Project> => invoke("restore_project", { id }),

  permanentlyDelete: (id: string): Promise<void> => invoke("permanently_delete_project", { id }),
};

// ============================================================================
// Trees
// ============================================================================

export const trees = {
  create: (input: CreateTree): Promise<Tree> => invoke("create_tree", { input }),

  get: (id: string): Promise<Tree> => invoke("get_tree", { id }),

  list: (projectId?: string): Promise<Tree[]> => invoke("list_trees", { projectId }),

  listStaging: (): Promise<Tree[]> => invoke("list_staging_trees"),

  listDeleted: (): Promise<Tree[]> => invoke("list_deleted_trees"),

  update: (id: string, input: UpdateTree): Promise<Tree> => invoke("update_tree", { id, input }),

  delete: (id: string): Promise<Tree> => invoke("delete_tree", { id }),

  restore: (id: string): Promise<Tree> => invoke("restore_tree", { id }),

  permanentlyDelete: (id: string): Promise<void> => invoke("permanently_delete_tree", { id }),
};

// ============================================================================
// Nodes
// ============================================================================

export const nodes = {
  create: (input: CreateNode): Promise<Node> => invoke("create_node", { input }),

  get: (id: string): Promise<Node> => invoke("get_node", { id }),

  list: (treeId: string): Promise<Node[]> => invoke("list_nodes", { treeId }),

  getRoots: (treeId: string): Promise<Node[]> => invoke("get_root_nodes", { treeId }),

  getChildren: (parentId: string): Promise<Node[]> => invoke("get_child_nodes", { parentId }),

  getPath: (nodeId: string): Promise<Node[]> => invoke("get_node_path", { nodeId }),

  getLeaves: (treeId: string): Promise<Node[]> => invoke("get_leaf_nodes", { treeId }),

  update: (id: string, input: UpdateNode): Promise<Node> => invoke("update_node", { id, input }),

  delete: (id: string): Promise<Node> => invoke("delete_node", { id }),

  restore: (id: string): Promise<Node> => invoke("restore_node", { id }),

  permanentlyDelete: (id: string): Promise<void> => invoke("permanently_delete_node", { id }),
};

// ============================================================================
// Settings
// ============================================================================

export const settings = {
  get: (key: string): Promise<Setting> => invoke("get_setting", { key }),

  getValue: (key: string): Promise<string | null> => invoke("get_setting_value", { key }),

  set: (key: string, value: string): Promise<Setting> => invoke("set_setting", { key, value }),

  list: (): Promise<Setting[]> => invoke("list_settings"),

  delete: (key: string): Promise<void> => invoke("delete_setting", { key }),
};
