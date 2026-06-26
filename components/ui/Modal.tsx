"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ children, onClose, open, title }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <section className="w-full max-w-lg rounded-lg border border-surface-600 bg-surface-800 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
          <Button aria-label="Close modal" onClick={onClose} size="sm" variant="ghost">
            Close
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </section>
    </div>
  );
}

