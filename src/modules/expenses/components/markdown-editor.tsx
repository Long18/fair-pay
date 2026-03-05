import React, { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownComment } from "./markdown-comment";
import {
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  CodeIcon,
  EyeIcon,
  PencilIcon,
} from "@/components/ui/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHaptics } from "@/hooks/use-haptics";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxLength?: number;
}

interface ToolbarButton {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  action: () => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Add any notes or details about this expense...",
  className,
  minHeight = "min-h-[120px]",
  maxLength = 1000,
}) => {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { tap } = useHaptics();

  // Insert markdown syntax
  const insertMarkdown = useCallback((syntax: {
    prefix: string;
    suffix?: string;
    placeholder?: string;
    newLine?: boolean;
  }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || "";
    const selectedText = text.substring(start, end);
    const placeholderText = syntax.placeholder || "text";

    let newText: string;
    let cursorPosition: number;

    if (selectedText) {
      // Wrap selected text
      newText = text.substring(0, start) +
        syntax.prefix +
        selectedText +
        (syntax.suffix || "") +
        text.substring(end);
      cursorPosition = start + syntax.prefix.length + selectedText.length + (syntax.suffix?.length || 0);
    } else {
      // Insert with placeholder
      const insertion = syntax.prefix + placeholderText + (syntax.suffix || "");
      newText = text.substring(0, start) + insertion + text.substring(end);
      cursorPosition = start + syntax.prefix.length + placeholderText.length + (syntax.suffix?.length || 0);
    }

    onChange(newText);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  }, [value, onChange]);

  // Toolbar actions
  const toolbarActions: ToolbarButton[] = [
    {
      icon: <BoldIcon className="h-4 w-4" />,
      label: "Bold (Ctrl+B)",
      shortcut: "b",
      action: () => insertMarkdown({ prefix: "**", suffix: "**", placeholder: "bold text" }),
    },
    {
      icon: <ItalicIcon className="h-4 w-4" />,
      label: "Italic (Ctrl+I)",
      shortcut: "i",
      action: () => insertMarkdown({ prefix: "_", suffix: "_", placeholder: "italic text" }),
    },
    {
      icon: <LinkIcon className="h-4 w-4" />,
      label: "Link (Ctrl+K)",
      shortcut: "k",
      action: () => insertMarkdown({ prefix: "[", suffix: "](url)", placeholder: "link text" }),
    },
    {
      icon: <ListIcon className="h-4 w-4" />,
      label: "Bullet List",
      action: () => insertMarkdown({ prefix: "- ", placeholder: "list item", newLine: true }),
    },
    {
      icon: <CodeIcon className="h-4 w-4" />,
      label: "Code",
      action: () => insertMarkdown({ prefix: "`", suffix: "`", placeholder: "code" }),
    },
  ];

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const action = toolbarActions.find(a => a.shortcut === e.key.toLowerCase());
      if (action) {
        e.preventDefault();
        action.action();
      }
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 border rounded-lg bg-background/50">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {toolbarActions.map((action, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { tap(); action.action(); }}
                    className="h-8 px-2 hover:bg-accent"
                    disabled={isPreview}
                  >
                    {action.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {action.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {/* Preview Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { tap(); setIsPreview(!isPreview); }}
          className="h-8 px-3 gap-2 hover:bg-accent"
        >
          {isPreview ? (
            <>
              <PencilIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </>
          ) : (
            <>
              <EyeIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </>
          )}
        </Button>
      </div>

      {/* Editor/Preview */}
      <div className="relative">
        {isPreview ? (
          <div
            className={cn(
              "w-full rounded-lg border border-input bg-background px-3 py-2",
              minHeight,
              "overflow-y-auto"
            )}
          >
            {value ? (
              <MarkdownComment content={value} className="prose-sm" />
            ) : (
              <p className="text-muted-foreground text-sm">{placeholder}</p>
            )}
          </div>
        ) : (
          <>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(minHeight, "resize-none pr-16")}
              maxLength={maxLength}
            />
            {/* Character count */}
            <span
              className={cn(
                "absolute bottom-2 right-2 text-xs",
                value.length > maxLength * 0.9
                  ? "text-warning"
                  : value.length >= maxLength
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {value.length}/{maxLength}
            </span>
          </>
        )}
      </div>

      {/* Help Text */}
      {!isPreview && (
        <p className="text-xs text-muted-foreground">
          Supports markdown formatting. Use toolbar or shortcuts (Ctrl+B for bold, Ctrl+I for italic)
        </p>
      )}
    </div>
  );
};
