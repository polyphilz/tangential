import { useState, useCallback } from "react";
import { CanvasProvider, useCanvas } from "./contexts";
import { TreeCanvas } from "./components/Canvas";
import { ChatPanel } from "./components/ChatPanel";
import { Sidebar } from "./components/Sidebar";
import { MarkdownRenderer } from "./components/MarkdownRenderer";
import { MessageInput } from "./components/MessageInput";
import { useStreamingResponse } from "./hooks";
import { StreamingMessage } from "./components/StreamingMessage";

function AppContent() {
  const { tree, selectedNode, highlightedPathNodes, clearHighlightedPath } = useCanvas();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { state: streamingState, startStreaming, reset: resetStreaming } = useStreamingResponse();

  const showChatPanel = highlightedPathNodes.length > 0;

  const handleSendMessage = useCallback((message: string, model: string, _parentNodeId: string) => {
    console.log("Sending message:", { message, model, _parentNodeId });
    // In Phase 6, this will call the actual LLM API
  }, []);

  const handleSingleNodeMessage = useCallback(
    (message: string, model: string) => {
      if (selectedNode) {
        startStreaming(message, model);
        console.log("Sending message from single node:", {
          message,
          model,
          nodeId: selectedNode.id,
        });
      }
    },
    [selectedNode, startStreaming]
  );

  return (
    <div className="h-screen w-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Optional header showing current tree info */}
        {tree && (
          <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-gray-700">{tree.name}</h2>
              {tree.system_prompt && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                  System prompt
                </span>
              )}
            </div>
          </header>
        )}

        {/* Canvas and right sheet */}
        <div className="flex-1 flex overflow-hidden">
          {/* Canvas */}
          <main className="flex-1 relative">
            <TreeCanvas />
          </main>

          {/* Right panel - ChatPanel for path, or single node view */}
          {showChatPanel ? (
            <ChatPanel
              nodes={highlightedPathNodes}
              onClose={clearHighlightedPath}
              onSendMessage={handleSendMessage}
            />
          ) : (
            selectedNode && (
              <aside className="w-[520px] bg-white border-l border-gray-200 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-800">Node Details</h2>
                  {selectedNode.model && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {selectedNode.model}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* User Message */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      User Message
                    </h3>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {selectedNode.user_content}
                      </p>
                    </div>
                  </div>

                  {/* Assistant Response */}
                  {selectedNode.assistant_content && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Assistant Response
                      </h3>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <MarkdownRenderer
                          content={selectedNode.assistant_content}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Streaming response for single node */}
                  {streamingState.isStreaming && (
                    <div>
                      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                        Response
                      </h3>
                      <StreamingMessage
                        content={streamingState.content}
                        isStreaming={streamingState.isStreaming}
                        model={selectedNode.model || undefined}
                      />
                    </div>
                  )}

                  {/* Error display */}
                  {streamingState.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <svg
                          className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="text-sm text-red-700">{streamingState.error}</p>
                          <button
                            onClick={resetStreaming}
                            className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Failed state */}
                  {selectedNode.failed && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm text-red-600">
                        This message failed to generate a response.
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Metadata
                    </h3>
                    <dl className="text-sm text-gray-600 space-y-1">
                      {selectedNode.tokens && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Tokens:</dt>
                          <dd>{selectedNode.tokens.toLocaleString()}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Created:</dt>
                        <dd>{new Date(selectedNode.created_at).toLocaleString()}</dd>
                      </div>
                      {selectedNode.summary && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Summary:</dt>
                          <dd className="text-right max-w-[200px] truncate">
                            {selectedNode.summary}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Message input */}
                <MessageInput
                  onSend={handleSingleNodeMessage}
                  disabled={streamingState.isStreaming}
                  placeholder="Branch from this node..."
                  defaultModel={selectedNode.model || "claude-3-5-sonnet"}
                />
              </aside>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <CanvasProvider>
      <AppContent />
    </CanvasProvider>
  );
}

export default App;
