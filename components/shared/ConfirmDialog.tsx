"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ConfirmDialogProps {
  /** Copy and callbacks are supplied by the destructive action's owner. */
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Standard two-action confirmation built on the shared Modal primitive. */
export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  description,
  onCancel,
  onConfirm,
  open,
  title
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onCancel} open={open} title={title}>
      <p className="text-sm text-slate-300">{description}</p>
      {/* Cancel is visually quiet; confirm is red to signal destructive intent. */}
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} variant="ghost">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant="danger">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
