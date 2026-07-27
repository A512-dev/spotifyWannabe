"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  /** Stable selection key, tab-button copy, and lazily selected React content. */
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
}

export function Tabs({ defaultTabId, tabs }: TabsProps) {
  // Default to the first tab when the caller does not choose one.
  const [activeTabId, setActiveTabId] = useState(defaultTabId ?? tabs[0]?.id);
  // Undefined is safe for an empty tab list; optional rendering below handles it.
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-surface-600">
        {tabs.map((tab) => (
          // This is a controlled visual selection local to the Tabs component.
          <button
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition",
              activeTabId === tab.id
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-slate-400 hover:text-slate-100"
            )}
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{activeTab?.content}</div>
    </div>
  );
}
