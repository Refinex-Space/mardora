"use client";

import React from "react";
import { Content } from "./types";
import { FileText } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

type Props = {
  contents: Content[];
  currentContent: number;
  setCurrentContent: (content: number) => void;
};

export default function Sidebar({ contents, currentContent, setCurrentContent }: Props) {
  return (
    <div className="h-full w-full flex flex-col">
      {/* Content List */}
      <div className="flex-1 overflow-y-auto">
        {contents.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">—</div>
        ) : (
          <ul className="py-2">
            {contents.map((content, index) => (
              <li key={content.id}>
                <div
                  onClick={() => setCurrentContent(index)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors hover:bg-accent hover:transition-none cursor-pointer",
                    currentContent === index && "bg-accent"
                  )}
                  aria-selected={currentContent === index}
                  role="option"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{content.title}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
