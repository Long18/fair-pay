import { prepareRichHtml } from "../utils";

interface RichTextProps {
  html: string;
  className?: string;
  tagStyles?: Partial<Record<string, string>>;
  "data-email-block"?: string;
}

/** Renders an editor-authored HTML fragment. Token values must already be escaped by the caller. */
export function RichText({ html, className, tagStyles, ...rest }: RichTextProps) {
  if (!html.trim()) return null;
  return (
    <div
      className={className}
      data-email-block={rest["data-email-block"]}
      dangerouslySetInnerHTML={{ __html: prepareRichHtml(html, tagStyles) }}
    />
  );
}
