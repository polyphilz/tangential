import { useEffect, useState, useMemo, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";
import type { Highlighter } from "shiki";
import { createHighlighter } from "shiki";
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Singleton highlighter instance
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: [
        "javascript",
        "typescript",
        "python",
        "rust",
        "go",
        "java",
        "c",
        "cpp",
        "csharp",
        "ruby",
        "php",
        "swift",
        "kotlin",
        "scala",
        "html",
        "css",
        "json",
        "yaml",
        "toml",
        "markdown",
        "bash",
        "shell",
        "sql",
        "graphql",
        "dockerfile",
        "plaintext",
      ],
    });
  }
  return highlighterPromise;
}

// Inline code component
function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[0.9em] font-mono">
      {children}
    </code>
  );
}

// Code block component with syntax highlighting
function CodeBlockWithHighlighting({
  code,
  lang,
  highlighter,
}: {
  code: string;
  lang: string;
  highlighter: Highlighter | null;
}) {
  if (!highlighter) {
    return (
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    );
  }

  // Use shiki for syntax highlighting
  const html = highlighter.codeToHtml(code, {
    lang: highlighter.getLoadedLanguages().includes(lang) ? lang : "plaintext",
    theme: "github-light",
  });

  return (
    <div
      className="rounded-lg overflow-hidden text-sm [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:m-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);

  useEffect(() => {
    getHighlighter().then(setHighlighter);
  }, []);

  const components: Components = useMemo(
    () => ({
      // Handle code blocks via pre element
      pre({ children }) {
        // Extract code element and its props
        const codeElement = children as React.ReactElement<{
          className?: string;
          children?: React.ReactNode;
        }>;
        if (codeElement?.props) {
          const { className: codeClassName, children: codeChildren } = codeElement.props;
          const match = /language-(\w+)/.exec(codeClassName || "");
          const lang = match ? match[1] : "plaintext";
          const code = String(codeChildren).replace(/\n$/, "");
          return <CodeBlockWithHighlighting code={code} lang={lang} highlighter={highlighter} />;
        }
        return <pre>{children}</pre>;
      },
      // Handle inline code
      code({ children }) {
        return <InlineCode>{children}</InlineCode>;
      },
      // Style other markdown elements
      p({ children }) {
        return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
      },
      h1({ children }) {
        return <h1 className="text-xl font-semibold mt-6 mb-3 first:mt-0">{children}</h1>;
      },
      h2({ children }) {
        return <h2 className="text-lg font-semibold mt-5 mb-2 first:mt-0">{children}</h2>;
      },
      h3({ children }) {
        return <h3 className="text-base font-semibold mt-4 mb-2 first:mt-0">{children}</h3>;
      },
      ul({ children }) {
        return <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>;
      },
      ol({ children }) {
        return <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>;
      },
      li({ children }) {
        return <li className="leading-relaxed">{children}</li>;
      },
      blockquote({ children }) {
        return (
          <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">
            {children}
          </blockquote>
        );
      },
      a({ href, children }) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {children}
          </a>
        );
      },
      table({ children }) {
        return (
          <div className="overflow-x-auto my-3">
            <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
              {children}
            </table>
          </div>
        );
      },
      th({ children }) {
        return (
          <th className="px-3 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
            {children}
          </th>
        );
      },
      td({ children }) {
        return <td className="px-3 py-2 text-sm border-b border-gray-100">{children}</td>;
      },
      hr() {
        return <hr className="my-4 border-gray-200" />;
      },
    }),
    [highlighter]
  );

  return (
    <div className={`text-gray-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownRenderer;
