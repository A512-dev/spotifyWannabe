"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { useUserPreferences } from "@/providers/UserPreferencesProvider";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ children, onClose, open, title }: ModalProps) {
  const { t } = useUserPreferences();
  if (!open) {
    return null;
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"
      role="dialog"
    >
      <section className="mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-surface-600 bg-surface-800 p-5 shadow-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-50">{title}</h2>

          <Button
            aria-label={t("Close modal")}
            onClick={onClose}
            size="sm"
            variant="ghost"
          >
            {t("Close")}
          </Button>
        </div>

        <div className="mt-4 min-h-0 overflow-y-auto pr-1">
          {children}
        </div>
      </section>
    </div>
  );
}
