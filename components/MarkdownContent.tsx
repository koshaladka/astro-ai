import ReactMarkdown from "react-markdown";

type MarkdownContentProps = {
  children: string;
  className?: string;
};

// Показывает markdown-текст с оформлением приложения
export function MarkdownContent({ children, className = "" }: MarkdownContentProps) {
  return (
    <div className={`markdown-content ${className}`.trim()}>
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}
