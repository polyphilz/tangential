import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Node as ConversationNode, Tree } from "../lib/types";
import { nodes as nodesApi, trees as treesApi } from "../lib/api";

// Check if we're running in Tauri or browser-only mode
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// Mock data for browser-only testing
const MOCK_NODES: ConversationNode[] = [
  {
    id: "1",
    tree_id: "mock-tree",
    parent_id: null,
    user_content: "What are the best AI agent patterns?",
    assistant_content: "Here are some popular AI agent patterns...",
    summary: "AI agent patterns overview",
    model: "claude-3-opus",
    tokens: 250,
    failed: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    deleted_at: null,
  },
  {
    id: "2",
    tree_id: "mock-tree",
    parent_id: "1",
    user_content: "Tell me more about ReAct",
    assistant_content: "ReAct is a pattern that combines reasoning and acting...",
    summary: "ReAct pattern explained",
    model: "claude-3-opus",
    tokens: 180,
    failed: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    deleted_at: null,
  },
  {
    id: "3",
    tree_id: "mock-tree",
    parent_id: "1",
    user_content: "What about multi-agent systems?",
    assistant_content: "Multi-agent systems involve multiple AI agents...",
    summary: "Multi-agent systems overview",
    model: "claude-3-opus",
    tokens: 200,
    failed: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    deleted_at: null,
  },
  {
    id: "4",
    tree_id: "mock-tree",
    parent_id: "2",
    user_content: "What are the limitations of ReAct?",
    assistant_content: "Some limitations include...",
    summary: "ReAct limitations",
    model: "claude-3-sonnet",
    tokens: 150,
    failed: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    deleted_at: null,
  },
  {
    id: "5",
    tree_id: "mock-tree",
    parent_id: "3",
    user_content: "Which framework do you recommend?",
    assistant_content: "I recommend considering...",
    summary: "Framework recommendation",
    model: "claude-3-sonnet",
    tokens: 120,
    failed: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    deleted_at: null,
  },
];

// Helper to get path from root to a node
function getMockPath(nodeId: string): ConversationNode[] {
  const path: ConversationNode[] = [];
  let current = MOCK_NODES.find((n) => n.id === nodeId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? MOCK_NODES.find((n) => n.id === current!.parent_id) : undefined;
  }
  return path;
}

// Get leaf nodes (nodes with no children)
function getMockLeaves(): ConversationNode[] {
  const parentIds = new Set(MOCK_NODES.map((n) => n.parent_id).filter(Boolean));
  return MOCK_NODES.filter((n) => !parentIds.has(n.id));
}

interface CanvasContextValue {
  // Current tree
  tree: Tree | null;
  treeId: string | null;
  setTreeId: (id: string | null) => void;

  // Nodes data
  nodes: ConversationNode[];
  isLoading: boolean;
  error: string | null;
  refreshNodes: () => Promise<void>;

  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  selectedNode: ConversationNode | null;

  // Path highlighting
  highlightedPath: string[] | null;
  highlightedPathNodes: ConversationNode[];
  clearHighlightedPath: () => void;
  highlightPathToNode: (nodeId: string) => Promise<void>;

  // Leaf nodes (for path buttons)
  leafNodes: ConversationNode[];
}

const CanvasContext = createContext<CanvasContextValue | null>(null);

export function CanvasProvider({ children }: { children: ReactNode }) {
  // In browser-only mode, auto-load mock data
  const [treeId, setTreeId] = useState<string | null>(isTauri ? null : "mock-tree");
  const [tree, setTree] = useState<Tree | null>(null);
  const [nodes, setNodes] = useState<ConversationNode[]>(isTauri ? [] : MOCK_NODES);
  const [leafNodes, setLeafNodes] = useState<ConversationNode[]>(isTauri ? [] : getMockLeaves());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[] | null>(null);

  // Track the latest path request to ignore stale responses
  const pathRequestIdRef = useRef(0);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  // Compute path nodes from IDs, preserving order
  const highlightedPathNodes = highlightedPath
    ? highlightedPath
        .map((id) => nodes.find((n) => n.id === id))
        .filter((n): n is ConversationNode => n !== undefined)
    : [];

  const refreshNodes = useCallback(async () => {
    // Use mock data in browser-only mode
    if (!isTauri) {
      setNodes(MOCK_NODES);
      setLeafNodes(getMockLeaves());
      return;
    }

    if (!treeId) {
      setNodes([]);
      setLeafNodes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [fetchedNodes, fetchedLeaves] = await Promise.all([
        nodesApi.list(treeId),
        nodesApi.getLeaves(treeId),
      ]);
      setNodes(fetchedNodes);
      setLeafNodes(fetchedLeaves);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load nodes");
    } finally {
      setIsLoading(false);
    }
  }, [treeId]);

  // Load tree data when treeId changes
  useEffect(() => {
    // Skip in browser-only mode - mock data is already loaded
    if (!isTauri) return;

    if (!treeId) {
      setTree(null);
      setNodes([]);
      setLeafNodes([]);
      setSelectedNodeId(null);
      setHighlightedPath(null);
      return;
    }

    const loadTree = async () => {
      try {
        const fetchedTree = await treesApi.get(treeId);
        setTree(fetchedTree);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tree");
      }
    };

    loadTree();
    refreshNodes();
  }, [treeId, refreshNodes]);

  // Wrapper to clear highlighted path and cancel pending requests
  const clearHighlightedPath = useCallback(() => {
    pathRequestIdRef.current += 1;
    setHighlightedPath(null);
  }, []);

  const highlightPathToNode = useCallback(async (nodeId: string) => {
    // Increment request ID to invalidate any in-flight requests
    pathRequestIdRef.current += 1;
    const requestId = pathRequestIdRef.current;

    // Use mock path in browser-only mode (with simulated network delay)
    if (!isTauri) {
      // Simulate async API delay to match Tauri behavior
      await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
      const path = getMockPath(nodeId);
      if (requestId === pathRequestIdRef.current) {
        setHighlightedPath(path.map((n) => n.id));
      }
      return;
    }

    try {
      const path = await nodesApi.getPath(nodeId);
      // Only update if this is still the latest request
      if (requestId === pathRequestIdRef.current) {
        setHighlightedPath(path.map((n) => n.id));
      }
    } catch (err) {
      console.error("Failed to get path:", err);
    }
  }, []);

  const value: CanvasContextValue = {
    tree,
    treeId,
    setTreeId,
    nodes,
    isLoading,
    error,
    refreshNodes,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    highlightedPath,
    highlightedPathNodes,
    clearHighlightedPath,
    highlightPathToNode,
    leafNodes,
  };

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}
