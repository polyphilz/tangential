import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Node as ReactFlowNode } from "reactflow";
import type { Node as ConversationNode } from "../lib/types";

interface UseArrowKeyNavigationOptions {
  nodes: ConversationNode[];
  layoutNodes: ReactFlowNode[];
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  enabled?: boolean;
}

/**
 * Hook for arrow key navigation in the tree canvas.
 *
 * Navigation rules:
 * - Up: Move to parent node
 * - Down: Move to last visited child (or leftmost if none visited)
 * - Left: Move to previous node at same visual level (by y-position)
 * - Right: Move to next node at same visual level (by y-position)
 *
 * The hook remembers the last visited child for each parent, so navigating
 * up then down returns to the same child you were on.
 */
export function useArrowKeyNavigation({
  nodes,
  layoutNodes,
  selectedNodeId,
  setSelectedNodeId,
  enabled = true,
}: UseArrowKeyNavigationOptions) {
  // Track last visited child for each parent node
  const lastVisitedChildRef = useRef<Map<string, string>>(new Map());

  // Build lookup maps (memoized to avoid recreating on every render)
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const positionMap = useMemo(
    () => new Map(layoutNodes.map((n) => [n.id, n.position])),
    [layoutNodes]
  );

  // Update last visited child when selection changes
  useEffect(() => {
    if (selectedNodeId) {
      const node = nodeMap.get(selectedNodeId);
      if (node?.parent_id) {
        lastVisitedChildRef.current.set(node.parent_id, selectedNodeId);
      }
    }
  }, [selectedNodeId, nodeMap]);

  // Get children of a node, sorted by x-position (left to right)
  const getChildren = useCallback(
    (parentId: string): ConversationNode[] => {
      const children = nodes.filter((n) => n.parent_id === parentId);
      return children.sort((a, b) => {
        const posA = positionMap.get(a.id);
        const posB = positionMap.get(b.id);
        if (!posA || !posB) return 0;
        return posA.x - posB.x;
      });
    },
    [nodes, positionMap]
  );

  // Get all nodes at the same visual level (similar y-position), sorted by x-position
  const getNodesAtSameLevel = useCallback(
    (nodeId: string): ConversationNode[] => {
      const pos = positionMap.get(nodeId);
      if (!pos) return [];

      // Find nodes with similar y-position (within a small threshold to handle float precision)
      const threshold = 10;
      const sameLevel = nodes.filter((n) => {
        const nPos = positionMap.get(n.id);
        if (!nPos) return false;
        return Math.abs(nPos.y - pos.y) < threshold;
      });

      // Sort by x-position (left to right)
      return sameLevel.sort((a, b) => {
        const posA = positionMap.get(a.id);
        const posB = positionMap.get(b.id);
        if (!posA || !posB) return 0;
        return posA.x - posB.x;
      });
    },
    [nodes, positionMap]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || !selectedNodeId) return;

      // Only handle arrow keys
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        return;
      }

      // Don't navigate if focus is in an input, textarea, or contenteditable
      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      const currentNode = nodeMap.get(selectedNodeId);
      if (!currentNode) return;

      let targetNodeId: string | null = null;

      switch (e.key) {
        case "ArrowUp": {
          // Move to parent
          if (currentNode.parent_id) {
            targetNodeId = currentNode.parent_id;
          }
          break;
        }

        case "ArrowDown": {
          // Move to last visited child, or leftmost if none
          const children = getChildren(selectedNodeId);
          if (children.length > 0) {
            const lastVisited = lastVisitedChildRef.current.get(selectedNodeId);
            if (lastVisited && children.some((c) => c.id === lastVisited)) {
              targetNodeId = lastVisited;
            } else {
              targetNodeId = children[0].id;
            }
          }
          break;
        }

        case "ArrowLeft": {
          // Move to previous node at same visual level
          const levelNodes = getNodesAtSameLevel(selectedNodeId);
          const currentIndex = levelNodes.findIndex((n) => n.id === selectedNodeId);
          if (currentIndex > 0) {
            targetNodeId = levelNodes[currentIndex - 1].id;
          }
          break;
        }

        case "ArrowRight": {
          // Move to next node at same visual level
          const levelNodes = getNodesAtSameLevel(selectedNodeId);
          const currentIndex = levelNodes.findIndex((n) => n.id === selectedNodeId);
          if (currentIndex < levelNodes.length - 1) {
            targetNodeId = levelNodes[currentIndex + 1].id;
          }
          break;
        }
      }

      if (targetNodeId) {
        e.preventDefault();
        setSelectedNodeId(targetNodeId);
      }
    },
    [enabled, selectedNodeId, nodeMap, getChildren, getNodesAtSameLevel, setSelectedNodeId]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
