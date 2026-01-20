# ReactFlow Node Highlighting Bug

## Problem Statement

When clicking through path summary buttons quickly, or clicking "Clear":
- **Edges** update correctly (highlight/unhighlight as expected)
- **Nodes** retain stale highlight state (previous path's nodes stay highlighted)

## Visual Evidence

- Selected path button: "Framework recommendation" (amber)
- Edges correctly show path to "Framework recommendation" node
- BUT: "ReAct pattern explained" and "ReAct limitations" nodes are ALSO highlighted (from a previous path selection)
- Clicking "Clear" removes edge highlighting but nodes remain highlighted

## Architecture Overview

```
PathButtons.tsx
    │
    ▼ onPathSelect(leafId) / onClearPath()
    │
CanvasContext.tsx
    │ highlightPathToNode() → async API call → setHighlightedPath()
    │ clearHighlightedPath() → setHighlightedPath(null)
    │
    ▼ highlightedPath state
    │
useTreeLayout.ts (useMemo)
    │ Creates new nodes[] and edges[] arrays
    │ Sets node.data.isHighlighted = highlightedPath?.includes(node.id)
    │ Sets edge.style.stroke based on highlightedPath
    │
    ▼ { nodes, edges }
    │
TreeCanvas.tsx
    │
    ▼ <ReactFlow nodes={nodes} edges={edges} />
    │
ConversationNode.tsx (memo)
    │ Reads data.isHighlighted for styling
    ▼
```

## Attempted Fixes

### Fix 1: Race Condition in Async Path Fetching

**Hypothesis:** When clicking paths quickly, stale async responses overwrite newer state.

**Implementation:**
- Added `pathRequestIdRef` counter in CanvasContext
- Each `highlightPathToNode` call increments counter and captures current ID
- Only updates state if request ID still matches when response returns
- `clearHighlightedPath()` also increments counter to invalidate pending requests

**Result:** Did not fix the issue.

**Why it didn't work:** The edges update correctly, which means the state IS updating properly. The issue is downstream in rendering.

### Fix 2: Custom memo Comparison Function

**Hypothesis:** `memo()` shallow comparison doesn't detect changes to nested `data.isHighlighted`.

**Implementation:**
```tsx
export const ConversationNode = memo(ConversationNodeComponent, (prevProps, nextProps) => {
  return (
    prevProps.selected === nextProps.selected &&
    prevProps.data.isHighlighted === nextProps.data.isHighlighted &&
    prevProps.data.isSelected === nextProps.data.isSelected &&
    prevProps.data.isStreaming === nextProps.data.isStreaming &&
    prevProps.data.data.id === nextProps.data.data.id &&
    prevProps.data.data.failed === nextProps.data.data.failed &&
    prevProps.data.data.assistant_content === nextProps.data.data.assistant_content &&
    prevProps.data.data.summary === nextProps.data.data.summary
  );
});
```

**Result:** Did not fix the issue.

**Why it didn't work:** Unknown. The comparison function should force re-renders when `isHighlighted` changes.

## Key Observations

1. **Edges always update correctly** - This proves:
   - `highlightedPath` state IS changing
   - `useTreeLayout` IS recomputing
   - ReactFlow IS receiving new edge data
   - ReactFlow IS re-rendering edges

2. **Nodes don't update** - This suggests:
   - ReactFlow may have internal node caching/memoization
   - The issue is specific to custom node components
   - Something prevents ConversationNode from re-rendering

3. **The bug is timing-dependent** - happens when clicking "quickly"

## Hypotheses to Investigate

### Hypothesis A: ReactFlow Internal Node Store

ReactFlow maintains an internal store for nodes. It may be:
- Caching node data by ID
- Doing its own comparison that doesn't detect data changes
- Requiring explicit signals to update custom nodes

**To test:**
- Check ReactFlow docs for node update patterns
- Try using `useNodesState` hook instead of passing nodes directly
- Try adding a `key` prop that changes with highlight state

### Hypothesis B: React Concurrent Mode / Batching

React 18's automatic batching might be:
- Batching multiple rapid state updates
- Causing intermediate states to be skipped

**To test:**
- Wrap state updates in `flushSync`
- Add console logs to track render cycles

### Hypothesis C: ReactFlow Version / Known Bug

This might be a known ReactFlow issue.

**To test:**
- Check ReactFlow GitHub issues for similar problems
- Check what version is installed and if updates available

### Hypothesis D: Node Identity

ReactFlow may track nodes by reference or by a combination of id + data hash.

**To test:**
- Force new node identity by changing the node `id` format to include highlight state
- Use `nodesDraggable={false}` and other props that might affect caching

## Code Locations

- `src/contexts/CanvasContext.tsx` - State management, async path fetching
- `src/hooks/useTreeLayout.ts` - Node/edge generation with highlight flags
- `src/components/Canvas/TreeCanvas.tsx` - ReactFlow wrapper
- `src/components/Canvas/ConversationNode.tsx` - Custom node component
- `src/components/Canvas/PathButtons.tsx` - Path selection UI

## Next Steps

1. Add console.log in ConversationNode to verify if component receives new props
2. Check if ReactFlow's `useNodesState` hook behaves differently
3. Search ReactFlow issues for "node not updating" or "custom node stale"
4. Try removing memo() entirely to isolate the issue
5. Check if using `setNodes` from ReactFlow's hooks helps
