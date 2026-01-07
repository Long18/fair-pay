import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownCommentProps {
  content: string;
  className?: string;
}

export const MarkdownComment = ({ content, className }: MarkdownCommentProps) => {
  if (!content || content.trim() === "") {
    return null;
  }

  return (
    <div className={cn("max-w-none", className)}>
      <ReactMarkdown
        components={{
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 text-foreground" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-lg font-semibold mt-3 mb-2 text-foreground" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-base font-semibold mt-3 mb-1 text-foreground" {...props} />
          ),
          // Paragraphs
          p: ({ node, ...props }) => (
            <p className="mb-2 text-sm md:text-base text-foreground leading-relaxed" {...props} />
          ),
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-2 space-y-1 text-sm md:text-base text-foreground" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-2 space-y-1 text-sm md:text-base text-foreground" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="text-foreground" {...props} />
          ),
          // Links
          a: ({ node, ...props }) => (
            <a
              className="text-primary hover:text-primary/80 underline break-words"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Code blocks
          code: ({ node, className, ...props }: any) => {
            const isInline = !className;
            return isInline ? (
              <code
                className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs font-mono"
                {...props}
              />
            ) : (
              <code
                className="block p-3 rounded-md bg-muted text-foreground text-xs font-mono overflow-x-auto"
                {...props}
              />
            );
          },
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-primary/30 pl-4 italic my-2 text-muted-foreground"
              {...props}
            />
          ),
          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-border" {...props} />
          ),
          // Strong and emphasis
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-foreground" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-foreground" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
