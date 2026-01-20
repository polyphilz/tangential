# Tangential - Product Specification

## Overview

Tangential is a local-first desktop application for visualizing and managing LLM conversations as branching trees. It solves the problem of context pollution in long research sessions by allowing users to explore multiple tangents from any point in a conversation without losing the original thread.

**Target Platforms:** macOS, Windows, Linux (simultaneous release)
**Tech Stack:** Tauri 2.0, React, SQLite, React Flow, Tailwind CSS

---

## Core Concept: Conversation Trees

### The Node Model
- **Each node = one turn** (user prompt + assistant response pair)
- A node with 3 children means 3 different follow-up prompts branching from the same response
- Full context inheritance: child branches inherit complete history from root to branch point
- Each node displays:
  - Editable summary (auto-generated via small model like Haiku, user can override)
  - Token count for that node's context usage
  - Visual indicator during streaming (animated/squiggly border)
  - Failed state indicator for API errors

### Tree Visualization
- **Figma-style infinite canvas** with zoom and pan
- **Vertical flow layout:** root at top, branches flow downward
- **Powered by React Flow** (or similar library)
- One tree per window, sidebar for project/tree navigation
- Clicking canvas background deselects current node and closes right sheet

---

## Application Structure

### System Tray / Menu Bar
- Lives in system tray (macOS menu bar, Windows system tray, Linux app indicator)
- **Minimal chat popup:** quick questions without opening full UI
  - Conversations saved to "Staging" area (not in a project)
  - User can later sort staging items into projects
- Click tray icon opens main application window

### Main Window Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Left Sidebar]  │     [Canvas - Tree View]    │  [Right   │
│                  │                             │   Sheet]  │
│  - Projects      │     ┌───┐                   │           │
│    - Tree 1      │     │ R │  (root node)      │  Full     │
│    - Tree 2      │     └─┬─┘                   │  convo    │
│  - Staging       │       │                     │  view     │
│    - Quick chat  │    ┌──┼──┐                  │  for      │
│                  │  ┌─┴┐ │ ┌┴─┐                │  selected │
│                  │  │A1│ │ │A2│                │  path     │
│                  │  └──┘ │ └──┘                │           │
│                  │      ...                    │  [Input]  │
└─────────────────────────────────────────────────────────────┘
```

#### Left Sidebar
- **Collapsible projects** (flat hierarchy, no nested folders)
- Trees listed under each project
- Staging area for unsorted quick chats
- Trash for soft-deleted items (30-day recovery)
- Toggle visibility: keyboard shortcut

#### Canvas (Center)
- React Flow-based tree visualization
- Nodes show truncated summary (1-2 lines)
- Path buttons at root: click to highlight a path through tree (single path at a time)
  - Each path button can be renamed (hybrid: auto-generated name, user-editable)
  - Highlighting shows colored overlay on nodes in that path
- Arrow key navigation when focused on canvas (not in sheet):
  - Down-left is default for ambiguous navigation
  - Selection changes update right sheet content

#### Right Sheet
- Slides out when a node or path is selected
- Shows **full rich content**: markdown, syntax-highlighted code, LaTeX
- When path selected: shows linear conversation view for that path
- **Input box** for continuing conversation (sheet only, keeps canvas clean)
- **`/branch` command** creates new branch from current node
- No message collapsing; all messages fully visible

---

## LLM Integration

### Supported Providers (MVP)
1. **OpenAI** (GPT-4, GPT-4o, etc.)
2. **Anthropic** (Claude)
3. **Google** (Gemini)
4. **xAI** (Grok)

### Model Configuration
- **Model selection only** (no temperature/advanced params for MVP)
- Per-message model switching within same tree
- **Per-tree system prompts** (custom instructions that persist)

### Streaming Behavior
- Streaming text appears in right sheet
- Animated indicator on canvas node during generation (squiggly/pulsing border)
- On completion:
  1. Small model (Haiku) generates summary
  2. Summary appears on node in canvas
  3. User can edit summary later

### Error Handling
- Failed API calls show node as failed (visual indicator)
- Sheet shows error details similar to ChatGPT/Claude UI
- Retry = clean retry with full parent context (regenerates from scratch)

### Context Management
- Token count displayed per node
- When context exceeds model limit:
  - Compacting available (details TBD)
  - Compacted nodes visually distinguished
  - New context size shown

---

## Data Architecture

### Storage
- **SQLite** for all data
- **sqlite-vec** extension for vector search (local embeddings)
- Tables:
  - `projects` (id, name, created_at, updated_at)
  - `trees` (id, project_id, name, system_prompt, created_at, updated_at, deleted_at)
  - `nodes` (id, tree_id, parent_id, user_content, assistant_content, summary, model, tokens, created_at, failed)
  - `embeddings` (node_id, vector)
  - `settings` (key, value)

### Search
- **Full-text search** across all message content
- **Semantic search** via embeddings (API-based: OpenAI/Voyage/etc.)
- **Filters:** by date, model, project
- Accessible via **Cmd+K** command palette

### API Key Storage
- **Primary:** OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- **Fallback:** Encrypted config file in app data directory
- Hardware-backed encryption where available

---

## User Interactions

### Creating Branches
1. **From canvas:** Right-click node → "Branch" (or branch button on node)
2. **From sheet:** Type `/branch` as command in input

### Editing Messages
- Editing a message **auto-creates a branch**
- Original message + children preserved
- New branch contains edited version

### Keyboard Navigation
- **Arrow keys:** traverse tree when canvas focused
  - Down-left default for ambiguous cases
  - Selection changes update sheet content
- **Toggle shortcuts:**
  - Left sidebar toggle
  - Right sheet toggle
- **Cmd+K:** Command palette (search, actions)
- **Cmd+N:** New tree with project picker

### Path Visualization
- Root shows buttons for each valid path (leaf-to-root trace)
- Click button → highlights that path on canvas
- Sheet shows linear conversation for selected path
- Path names: auto-generated, user-renameable

---

## First-Time Experience

### Onboarding
- **Minimal:** prompt for API keys, let user explore
- No guided tour or sample projects for MVP
- Settings easily accessible for adding more API keys later

---

## Additional Features

### Offline Capability
- **Can browse/navigate** existing trees offline
- **Cannot send** new messages without network
- Clear indicator of offline state

### Deletion & Recovery
- **Soft delete:** items go to Trash
- **30-day recovery** window
- Confirmation dialog before delete
- Permanent delete from Trash available

### Updates
- **Notify + prompt** model
- Tauri updater checks for updates
- User chooses when to install

### Theming
- **System default** (follows OS light/dark)
- **Manual override** available in settings
- Minimal/clean aesthetic (Linear/Notion style)

---

## Out of Scope (MVP)

- Image/file attachments (text-only for MVP)
- Export to shareable formats
- Collaboration features
- Time/cost tracking
- Ollama/local model support
- Import from ChatGPT/Claude/Gemini exports
- Custom slash commands beyond `/branch`

---

## Technical Implementation Plan

### Phase 1: Project Setup
1. Initialize Tauri 2.0 project with React frontend
2. Configure for all three platforms (macOS, Windows, Linux)
3. Set up system tray functionality
4. Configure SQLite with migrations

### Phase 2: Core Data Layer
1. Design and implement SQLite schema
2. Create Rust commands for CRUD operations
3. Implement tree data structures and traversal
4. Set up IPC between frontend and backend

### Phase 3: Tooling
1. Configure ESLint + Prettier for TypeScript/React
2. Set up Tailwind CSS with Vite
3. Configure rustfmt + clippy for Rust code

### Phase 4: Canvas & Visualization
1. Integrate React Flow
2. Implement node components with summary display
3. Build tree layout algorithm (vertical flow)
4. Add zoom/pan controls
5. Implement path highlighting system

### Phase 5: Conversation UI
1. Build right sheet component
2. Implement rich content rendering (markdown, code, LaTeX)
3. Build streaming display with node animation

### Phase 6: LLM Integration
1. Implement provider abstraction layer
2. Add OpenAI, Anthropic, Google, xAI clients
3. Build streaming response handling
4. Implement auto-summarization pipeline
5. Add error handling and retry logic
6. **Node creation flow when sending a message:**
   - Create new node in database (user_content, parent_id, model)
   - Add node to canvas tree visualization immediately
   - Auto-select the new node
   - Show "generating" animation on canvas node (pulsing/squiggly border)
   - Stream assistant response into the node's assistant_content
   - Update node with final data (tokens, summary) on completion
   - Handle errors gracefully (show failed state on node)

### Phase 7: Search & Navigation
1. Implement full-text search with SQLite FTS5
2. Add sqlite-vec for semantic search
3. Build Cmd+K command palette
4. Implement keyboard navigation

### Phase 8: Polish & Platform
1. Implement OS keychain integration
2. Add settings UI
3. Build onboarding flow (API key setup)
4. Test and fix platform-specific issues
5. Configure Tauri updater

---

## File Structure (Proposed)

```
tangential/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs
│   │   │   └── migrations/
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── trees.rs
│   │   │   ├── nodes.rs
│   │   │   └── settings.rs
│   │   ├── llm/
│   │   │   ├── mod.rs
│   │   │   ├── provider.rs
│   │   │   ├── openai.rs
│   │   │   ├── anthropic.rs
│   │   │   ├── google.rs
│   │   │   └── xai.rs
│   │   └── keychain/
│   │       └── mod.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── Sidebar/
│   │   ├── Canvas/
│   │   ├── Sheet/
│   │   ├── CommandPalette/
│   │   └── Tray/
│   ├── hooks/
│   ├── stores/
│   ├── lib/
│   └── styles/
├── package.json
└── vite.config.ts
```
