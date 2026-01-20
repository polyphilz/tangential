import { useMemo } from "react";
import dagre from "@dagrejs/dagre";
import type { Node as ReactFlowNode, Edge } from "reactflow";
import type { Node as ConversationNode } from "../lib/types";
import type { ConversationNodeProps } from "../components/Canvas/ConversationNode";

const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;
const HORIZONTAL_SPACING = 60;
const VERTICAL_SPACING = 80;

interface LayoutResult {
  nodes: ReactFlowNode<ConversationNodeProps>[];
  edges: Edge[];
}

export function useTreeLayout(
  conversationNodes: ConversationNode[],
  selectedNodeId: string | null,
  highlightedPath: string[] | null
): LayoutResult {
  return useMemo(() => {
    if (conversationNodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Create dagre graph
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "TB", // Top to bottom
      nodesep: HORIZONTAL_SPACING,
      ranksep: VERTICAL_SPACING,
      marginx: 40,
      marginy: 40,
    });
    g.setDefaultEdgeLabel(() => ({}));

    // Create a map for quick lookup
    const nodeMap = new Map(conversationNodes.map((n) => [n.id, n]));

    // Add nodes to dagre
    conversationNodes.forEach((node) => {
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    // Add edges based on parent_id relationships
    const edges: Edge[] = [];
    conversationNodes.forEach((node) => {
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        g.setEdge(node.parent_id, node.id);
        edges.push({
          id: `${node.parent_id}-${node.id}`,
          source: node.parent_id,
          target: node.id,
          type: "smoothstep",
          style: {
            stroke:
              highlightedPath?.includes(node.id) && highlightedPath?.includes(node.parent_id)
                ? "#f59e0b" // amber-500
                : "#d1d5db", // gray-300
            strokeWidth:
              highlightedPath?.includes(node.id) && highlightedPath?.includes(node.parent_id)
                ? 2
                : 1,
          },
        });
      }
    });

    // Run dagre layout
    dagre.layout(g);

    // Convert dagre positions to React Flow nodes
    const reactFlowNodes: ReactFlowNode<ConversationNodeProps>[] = conversationNodes.map((node) => {
      const dagreNode = g.node(node.id);
      const isHighlighted = highlightedPath?.includes(node.id) ?? false;
      const isSelected = node.id === selectedNodeId;

      return {
        id: node.id,
        type: "conversationNode",
        // className is compared at ReactFlow's NodeWrapper level (before internal memo)
        // This forces re-render when highlight/selection state changes
        className: `node-${isHighlighted ? "highlighted" : "normal"}-${isSelected ? "selected" : "unselected"}`,
        position: {
          // Dagre gives center position, React Flow expects top-left
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        },
        data: {
          data: node,
          isSelected,
          isHighlighted,
          isStreaming: false,
        },
      };
    });

    return { nodes: reactFlowNodes, edges };
  }, [conversationNodes, selectedNodeId, highlightedPath]);
}
