import { memo } from "react";
import { MarkdownRenderer } from "../MarkdownRenderer";

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  model?: string;
}

export const StreamingMessage = memo(function StreamingMessage({
  content,
  isStreaming,
  model,
}: StreamingMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] bg-gray-50 border border-gray-200 text-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
        {content ? (
          <div className="text-sm">
            <MarkdownRenderer content={content} />
            {isStreaming && <StreamingCursor />}
          </div>
        ) : isStreaming ? (
          <LoadingDots />
        ) : null}
        {model && !isStreaming && <p className="text-xs text-gray-400 mt-2">{model}</p>}
      </div>
    </div>
  );
});

// Blinking cursor for streaming
function StreamingCursor() {
  return (
    <span className="inline-block w-2 h-4 bg-gray-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
  );
}

// Loading dots animation
function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
    </div>
  );
}

export default StreamingMessage;
