"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

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

