import { useState, useCallback, useRef } from "react";

interface StreamingState {
  isStreaming: boolean;
  content: string;
  error: string | null;
}

interface UseStreamingResponseReturn {
  state: StreamingState;
  startStreaming: (message: string, model: string) => void;
  stopStreaming: () => void;
  reset: () => void;
}

// Mock response for development - will be replaced with real API calls in Phase 6
const MOCK_RESPONSE = `I'll help you with that! Here's a detailed explanation:

## Key Points

1. **First point** - This is an important consideration
2. **Second point** - Another key factor to keep in mind
3. **Third point** - Don't forget about this

### Code Example

Here's a simple example in TypeScript:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

const message = greet("World");
console.log(message);
\`\`\`

### Mathematical Formula

The quadratic formula is: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

> Note: This is a mock response for testing the streaming UI. In production, this will be replaced with real LLM responses.

Let me know if you have any questions!`;

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: "",
    error: null,
  });

  const streamingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const stopStreaming = useCallback(() => {
    streamingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const reset = useCallback(() => {
    stopStreaming();
    setState({ isStreaming: false, content: "", error: null });
  }, [stopStreaming]);

  const startStreaming = useCallback(
    (_message: string, _model: string) => {
      reset();
      streamingRef.current = true;
      setState({ isStreaming: true, content: "", error: null });

      // Simulate streaming by adding characters one by one
      let index = 0;
      const streamChunk = () => {
        if (!streamingRef.current) return;

        if (index < MOCK_RESPONSE.length) {
          // Add a random number of characters (1-5) to simulate chunked streaming
          const chunkSize = Math.floor(Math.random() * 5) + 1;
          const nextIndex = Math.min(index + chunkSize, MOCK_RESPONSE.length);
          const chunk = MOCK_RESPONSE.slice(0, nextIndex);

          setState((prev) => ({ ...prev, content: chunk }));
          index = nextIndex;

          // Random delay between chunks to simulate network latency
          const delay = Math.floor(Math.random() * 30) + 10;
          timeoutRef.current = window.setTimeout(streamChunk, delay);
        } else {
          // Streaming complete
          streamingRef.current = false;
          setState((prev) => ({ ...prev, isStreaming: false }));
        }
      };

      // Initial delay before streaming starts
      timeoutRef.current = window.setTimeout(streamChunk, 500);
    },
    [reset]
  );

  return {
    state,
    startStreaming,
    stopStreaming,
    reset,
  };
}
