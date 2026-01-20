import { memo } from "react";
import type { Node as ConversationNode } from "../../lib/types";

interface PathButtonsProps {
  leafNodes: ConversationNode[];
  highlightedPath: string[] | null;
  onPathSelect: (leafNodeId: string) => void;
  onClearPath: () => void;
}

function PathButtonsComponent({
  leafNodes,
  highlightedPath,
  onPathSelect,
  onClearPath,
}: PathButtonsProps) {
  if (leafNodes.length === 0) {
    return null;
  }

  const isPathSelected = highlightedPath && highlightedPath.length > 0;
  const selectedLeafId = isPathSelected ? highlightedPath[highlightedPath.length - 1] : null;

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 max-w-[calc(100%-24px)]">
      {leafNodes.map((leaf, index) => {
        const isSelected = leaf.id === selectedLeafId;
        const label =
          leaf.summary ||
          leaf.user_content.slice(0, 20) + (leaf.user_content.length > 20 ? "..." : "") ||
          `Path ${index + 1}`;

        return (
          <button
            key={leaf.id}
            onClick={() => {
              if (isSelected) {
                onClearPath();
              } else {
                onPathSelect(leaf.id);
              }
            }}
            className={`
              min-h-[44px] px-4 py-2 text-xs font-medium rounded-full
              transition-all shadow-sm
              ${
                isSelected
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }
            `}
            aria-label={`Select path: ${leaf.user_content.slice(0, 50)}${leaf.user_content.length > 50 ? "..." : ""}`}
          >
            {label}
          </button>
        );
      })}

      {isPathSelected && (
        <button
          onClick={onClearPath}
          className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-full bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 transition-all"
          aria-label="Clear path selection"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export const PathButtons = memo(PathButtonsComponent);
