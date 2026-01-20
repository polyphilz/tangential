import { useState, useEffect } from "react";
import { projects as projectsApi, trees as treesApi } from "../../lib/api";
import type { Project, Tree } from "../../lib/types";
import { useCanvas } from "../../contexts/CanvasContext";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { treeId, setTreeId } = useCanvas();
  const [projects, setProjects] = useState<Project[]>([]);
  const [treesByProject, setTreesByProject] = useState<Map<string | null, Tree[]>>(new Map());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedProjects, allTrees, stagingTrees] = await Promise.all([
          projectsApi.list(),
          treesApi.list(),
          treesApi.listStaging(),
        ]);

        setProjects(fetchedProjects);

        // Group trees by project
        const grouped = new Map<string | null, Tree[]>();
        grouped.set(null, stagingTrees);

        for (const project of fetchedProjects) {
          const projectTrees = allTrees.filter((t) => t.project_id === project.id);
          grouped.set(project.id, projectTrees);
        }

        setTreesByProject(grouped);

        // Auto-expand project containing selected tree
        if (treeId) {
          const selectedTree = allTrees.find((t) => t.id === treeId);
          if (selectedTree?.project_id) {
            setExpandedProjects((prev) => new Set([...prev, selectedTree.project_id!]));
          }
        }
      } catch (err) {
        console.error("Failed to load sidebar data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [treeId]);

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const stagingTrees = treesByProject.get(null) || [];

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-3">
        <button
          onClick={onToggleCollapse}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Expand sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white">Tangential</h1>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Collapse sidebar"
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
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* New chat button */}
      <div className="px-3 py-2">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New chat
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="text-sm text-gray-500 px-3">Loading...</div>
        ) : (
          <>
            {/* Projects */}
            {projects.map((project) => {
              const projectTrees = treesByProject.get(project.id) || [];
              const isExpanded = expandedProjects.has(project.id);

              return (
                <div key={project.id} className="mb-1">
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      />
                    </svg>
                    <span className="truncate">{project.name}</span>
                    <span className="ml-auto text-xs text-gray-600">{projectTrees.length}</span>
                  </button>

                  {isExpanded && projectTrees.length > 0 && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {projectTrees.map((tree) => (
                        <TreeItem
                          key={tree.id}
                          tree={tree}
                          isSelected={tree.id === treeId}
                          onSelect={() => setTreeId(tree.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Staging (unsorted chats) */}
            {stagingTrees.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staging
                </div>
                <div className="mt-1 space-y-0.5">
                  {stagingTrees.map((tree) => (
                    <TreeItem
                      key={tree.id}
                      tree={tree}
                      isSelected={tree.id === treeId}
                      onSelect={() => setTreeId(tree.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {projects.length === 0 && stagingTrees.length === 0 && (
              <div className="text-sm text-gray-500 px-3 py-4 text-center">
                No projects yet.
                <br />
                Start a new chat to begin.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TreeItem({
  tree,
  isSelected,
  onSelect,
}: {
  tree: Tree;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
        isSelected
          ? "bg-gray-800 text-white"
          : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
      }`}
    >
      <svg
        className="w-4 h-4 flex-shrink-0 text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <span className="truncate">{tree.name}</span>
    </button>
  );
}
