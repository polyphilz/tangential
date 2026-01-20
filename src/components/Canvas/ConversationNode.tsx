// memo removed to debug highlight sync issue
import { Handle, Position, type NodeProps } from "reactflow";
import type { Node as ConversationNodeData } from "../../lib/types";

export interface ConversationNodeProps {
  data: ConversationNodeData;
  isSelected: boolean;
  isHighlighted: boolean;
  isStreaming?: boolean;
}

const NODE_WIDTH = 240;

function ConversationNodeComponent({ data, selected }: NodeProps<ConversationNodeProps>) {
  const { data: nodeData, isSelected, isHighlighted, isStreaming } = data;

  const displayText =
    nodeData.summary ||
    nodeData.user_content.slice(0, 80) + (nodeData.user_content.length > 80 ? "..." : "");

  // Force repaint in WebKit by using a key that changes with highlight state
  // This works around a Safari/WebKit repaint bug in Tauri's WebView
  const highlightKey = `${nodeData.id}-${isHighlighted}-${isSelected}`;

  return (
    <div
      key={highlightKey}
      className={`
        relative rounded-lg border bg-white shadow-sm
        ${NODE_WIDTH ? `w-[${NODE_WIDTH}px]` : "w-60"}
        ${nodeData.failed ? "border-red-400 bg-red-50" : ""}
        ${isStreaming ? "animate-pulse border-blue-400" : ""}
      `}
      style={{
        width: NODE_WIDTH,
        borderColor: isHighlighted ? "#fbbf24" : isSelected ? "#3b82f6" : "#e5e7eb",
        boxShadow: isHighlighted ? "0 0 0 2px #fbbf24" : isSelected ? "0 0 0 2px #3b82f6" : "none",
        // Force GPU layer to help with repainting
        transform: "translateZ(0)",
      }}
    >
      {/* Top handle for incoming edge from parent */}
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />

      <div className="p-3">
        {/* Summary / Preview */}
        <p className="text-sm text-gray-700 line-clamp-2 leading-snug">{displayText}</p>

        {/* Metadata row */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
          {nodeData.model && <span className="truncate max-w-[120px]">{nodeData.model}</span>}
          {nodeData.tokens && <span>{nodeData.tokens} tokens</span>}
        </div>

        {/* Status indicators */}
        {nodeData.failed && (
          <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Failed
          </div>
        )}

        {!nodeData.assistant_content && !nodeData.failed && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 italic">
            <svg
              className="w-3 h-3 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Awaiting response...
          </div>
        )}
      </div>

      {/* Bottom handle for outgoing edges to children */}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />

      {/* Selection indicator dot */}
      {selected && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />}
    </div>
  );
}

// Removing memo entirely to debug highlight sync issue
export const ConversationNode = ConversationNodeComponent;
