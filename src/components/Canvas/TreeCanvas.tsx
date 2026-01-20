import { useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type NodeMouseHandler,
  type NodeTypes,
} from "reactflow";
import "reactflow/dist/style.css";

import { useCanvas } from "../../contexts/CanvasContext";
import { useTreeLayout, useArrowKeyNavigation } from "../../hooks";
import { ConversationNode } from "./ConversationNode";
import { PathButtons } from "./PathButtons";

const nodeTypes: NodeTypes = {
  conversationNode: ConversationNode,
};

function TreeCanvasInner() {
  const {
    nodes: conversationNodes,
    selectedNodeId,
    setSelectedNodeId,
    highlightedPath,
    clearHighlightedPath,
    isLoading,
    error,
    leafNodes,
    highlightPathToNode,
  } = useCanvas();

  const { fitView } = useReactFlow();

  // Get layout-computed nodes and edges - pass directly to ReactFlow
  const { nodes, edges } = useTreeLayout(conversationNodes, selectedNodeId, highlightedPath);

  // Arrow key navigation between nodes
  useArrowKeyNavigation({
    nodes: conversationNodes,
    layoutNodes: nodes,
    selectedNodeId,
    setSelectedNodeId,
  });

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    clearHighlightedPath();
  }, [setSelectedNodeId, clearHighlightedPath]);

  // Fit view when nodes change
  const prevNodeCount = useRef(0);
  useEffect(() => {
    if (nodes.length > 0 && nodes.length !== prevNodeCount.current) {
      prevNodeCount.current = nodes.length;
      // Small delay to ensure nodes are rendered
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    }
  }, [nodes.length, fitView]);

  // Handle Escape key to deselect node
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNodeId) {
        setSelectedNodeId(null);
        clearHighlightedPath();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, setSelectedNodeId, clearHighlightedPath]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-500">Loading tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (conversationNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-gray-400">No conversation yet. Select a tree to view.</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Path buttons at top */}
      <PathButtons
        leafNodes={leafNodes}
        highlightedPath={highlightedPath}
        onPathSelect={highlightPathToNode}
        onClearPath={clearHighlightedPath}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesFocusable={false}
        edgesFocusable={false}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="!shadow-md !border-gray-200"
        />
        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            if (node.data?.isHighlighted) return "#fbbf24";
            if (node.data?.isSelected) return "#3b82f6";
            if (node.data?.data?.failed) return "#ef4444";
            return "#d1d5db";
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
          className="!shadow-md !border-gray-200"
        />
      </ReactFlow>
    </div>
  );
}

export function TreeCanvas() {
  return (
    <ReactFlowProvider>
      <TreeCanvasInner />
    </ReactFlowProvider>
  );
}
