"use client";

import { useId, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";

export function CollapsibleAnswer({ children }: { children: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const contentId = useId();

  return (
    <div className="qa-answer">
      <button
        type="button"
        className="btn-subtle qa-answer-toggle"
        aria-expanded={!collapsed}
        aria-controls={contentId}
        onClick={() => setCollapsed(value => !value)}
      >
        {collapsed ? "Развернуть ответ" : "Свернуть ответ"}
      </button>
      <div id={contentId} hidden={collapsed}>
        <MarkdownContent>{children}</MarkdownContent>
      </div>
    </div>
  );
}
