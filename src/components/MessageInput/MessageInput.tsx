import { useState, useRef, useEffect, useCallback, memo } from "react";
import { MarkdownRenderer } from "../MarkdownRenderer";

// Available models - will be configurable later
const AVAILABLE_MODELS = [
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google" },
  { id: "grok-2", name: "Grok 2", provider: "xAI" },
] as const;

interface MessageInputProps {
  onSend: (message: string, model: string) => void;
  disabled?: boolean;
  placeholder?: string;
  defaultModel?: string;
}

export const MessageInput = memo(function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type your message...",
  defaultModel = "claude-3-5-sonnet",
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState(defaultModel);
  const [showPreview, setShowPreview] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Close model picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setShowModelPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = useCallback(() => {
    if (message.trim() && !disabled) {
      onSend(message.trim(), selectedModel);
      setMessage("");
      setShowPreview(false);
    }
  }, [message, selectedModel, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const selectedModelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Preview toggle and model selector */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showPreview
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
        </div>

        {/* Model selector */}
        <div className="relative" ref={modelPickerRef}>
          <button
            type="button"
            onClick={() => setShowModelPicker(!showModelPicker)}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            <span className="font-medium">{selectedModelInfo?.name || selectedModel}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showModelPicker ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showModelPicker && (
            <div className="absolute bottom-full right-0 mb-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              {AVAILABLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setSelectedModel(model.id);
                    setShowModelPicker(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                    selectedModel === model.id ? "bg-blue-50" : ""
                  }`}
                >
                  <span className={selectedModel === model.id ? "text-blue-700 font-medium" : ""}>
                    {model.name}
                  </span>
                  <span className="text-xs text-gray-400">{model.provider}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview panel */}
      {showPreview && message.trim() && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 max-h-40 overflow-y-auto">
          <p className="text-xs text-gray-500 mb-2">Preview:</p>
          <MarkdownRenderer content={message} className="text-sm" />
        </div>
      )}

      {/* Input area */}
      <div className="p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Cmd</kbd>+
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to send
        </p>
      </div>
    </div>
  );
});

export default MessageInput;
