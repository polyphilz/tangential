import type { Node as ConversationNode } from "../../lib/types";

interface ChatPanelProps {
  nodes: ConversationNode[];
  onClose: () => void;
}

export function ChatPanel({ nodes, onClose }: ChatPanelProps) {
  if (nodes.length === 0) {
    return null;
  }

  return (
    <aside className="w-[480px] bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-700">Conversation Path</h2>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close panel"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {nodes.map((node) => (
          <div key={node.id} className="space-y-3">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[85%] bg-blue-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md">
                <p className="text-sm whitespace-pre-wrap">{node.user_content}</p>
              </div>
            </div>

            {/* Assistant message */}
            {node.assistant_content && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
                  <p className="text-sm whitespace-pre-wrap">{node.assistant_content}</p>
                  {node.model && <p className="text-xs text-gray-400 mt-2">{node.model}</p>}
                </div>
              </div>
            )}

            {/* Failed state */}
            {node.failed && !node.assistant_content && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-2xl rounded-bl-md">
                  <p className="text-sm">Failed to generate response</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer with metadata */}
      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {nodes.length} message{nodes.length !== 1 ? "s" : ""}
          </span>
          <span>{nodes.reduce((sum, n) => sum + (n.tokens || 0), 0).toLocaleString()} tokens</span>
        </div>
      </div>
    </aside>
  );
}
