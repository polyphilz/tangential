import { useRef, useEffect, useCallback } from "react";
import type { Node as ConversationNode } from "../../lib/types";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { MessageInput } from "../MessageInput";
import { StreamingMessage } from "../StreamingMessage";
import { useStreamingResponse } from "../../hooks";

interface ChatPanelProps {
  nodes: ConversationNode[];
  onClose: () => void;
  onSendMessage?: (message: string, model: string, parentNodeId: string) => void;
}

export function ChatPanel({ nodes, onClose, onSendMessage }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { state: streamingState, startStreaming, reset: resetStreaming } = useStreamingResponse();

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [nodes, streamingState.content]);

  const handleSendMessage = useCallback(
    (message: string, model: string) => {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode) {
        // Start streaming mock response
        startStreaming(message, model);

        // Call the actual onSendMessage handler if provided
        onSendMessage?.(message, model, lastNode.id);
      }
    },
    [nodes, onSendMessage, startStreaming]
  );

  if (nodes.length === 0) {
    return null;
  }

  const totalTokens = nodes.reduce((sum, n) => sum + (n.tokens || 0), 0);
  const lastNode = nodes[nodes.length - 1];

  return (
    <aside className="w-[520px] bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-800">Conversation</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            {nodes.length} turn{nodes.length !== 1 ? "s" : ""}
          </span>
        </div>
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
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-6">
          {nodes.map((node, index) => (
            <MessageTurn key={node.id} node={node} isFirst={index === 0} />
          ))}

          {/* Streaming response */}
          {streamingState.isStreaming && (
            <div className="space-y-3">
              <StreamingMessage
                content={streamingState.content}
                isStreaming={streamingState.isStreaming}
                model={lastNode?.model || undefined}
              />
            </div>
          )}

          {/* Error display */}
          {streamingState.error && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm">{streamingState.error}</p>
                </div>
                <button
                  onClick={resetStreaming}
                  className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Footer with token count */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Context: {totalTokens.toLocaleString()} tokens</span>
          {lastNode?.model && <span>{lastNode.model}</span>}
        </div>
      </div>

      {/* Message input */}
      <MessageInput
        onSend={handleSendMessage}
        disabled={streamingState.isStreaming}
        placeholder="Continue the conversation..."
        defaultModel={lastNode?.model || "claude-3-5-sonnet"}
      />
    </aside>
  );
}

// Individual message turn component
interface MessageTurnProps {
  node: ConversationNode;
  isFirst: boolean;
}

function MessageTurn({ node, isFirst }: MessageTurnProps) {
  return (
    <div className={`space-y-3 ${!isFirst ? "pt-3 border-t border-gray-100" : ""}`}>
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-md shadow-sm">
          <div className="text-sm">
            <UserMessageContent content={node.user_content} />
          </div>
        </div>
      </div>

      {/* Assistant message */}
      {node.assistant_content && (
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
            <div className="text-sm">
              <MarkdownRenderer content={node.assistant_content} />
            </div>
            {node.model && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">{node.model}</span>
                {node.tokens && (
                  <span className="text-xs text-gray-400">
                    {node.tokens.toLocaleString()} tokens
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Failed state */}
      {node.failed && !node.assistant_content && (
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl rounded-bl-md">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium">Failed to generate response</p>
                <p className="text-xs mt-1 text-red-600">
                  The API request failed. You can try again or switch models.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// User message content - simple rendering (user messages are typically plain text)
function UserMessageContent({ content }: { content: string }) {
  // For user messages, we render them more simply but still handle basic formatting
  return <p className="whitespace-pre-wrap break-words">{content}</p>;
}
