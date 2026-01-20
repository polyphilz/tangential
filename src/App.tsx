import { useState } from "react";
import { CanvasProvider, useCanvas } from "./contexts";
import { TreeCanvas } from "./components/Canvas";
import { ChatPanel } from "./components/ChatPanel";
import { Sidebar } from "./components/Sidebar";

function AppContent() {
  const { tree, selectedNode, highlightedPathNodes, clearHighlightedPath } = useCanvas();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const showChatPanel = highlightedPathNodes.length > 0;

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
            <ChatPanel nodes={highlightedPathNodes} onClose={clearHighlightedPath} />
          ) : (
            selectedNode && (
              <aside className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <h2 className="text-sm font-medium text-gray-500 mb-2">User Message</h2>
                  <div className="prose prose-sm max-w-none mb-4">
                    <p className="whitespace-pre-wrap text-gray-800">{selectedNode.user_content}</p>
                  </div>

                  {selectedNode.assistant_content && (
                    <>
                      <h2 className="text-sm font-medium text-gray-500 mb-2">Assistant Response</h2>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-gray-800">
                          {selectedNode.assistant_content}
                        </p>
                      </div>
                    </>
                  )}

                  {selectedNode.failed && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
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
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <dl className="text-xs text-gray-400 space-y-1">
                      {selectedNode.model && (
                        <div className="flex justify-between">
                          <dt>Model:</dt>
                          <dd className="text-gray-600">{selectedNode.model}</dd>
                        </div>
                      )}
                      {selectedNode.tokens && (
                        <div className="flex justify-between">
                          <dt>Tokens:</dt>
                          <dd className="text-gray-600">{selectedNode.tokens}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt>Created:</dt>
                        <dd className="text-gray-600">
                          {new Date(selectedNode.created_at).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
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
