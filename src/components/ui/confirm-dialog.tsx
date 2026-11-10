"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useId } from "react";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  variant?: "danger" | "default";
  pending?: boolean;
  pendingLabel?: string;
  layerClassName?: string;
};

export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose, variant = "danger", pending = false, pendingLabel = "กำลังตรวจสอบ...", layerClassName }: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className={`modal-layer${layerClassName ? ` ${layerClassName}` : ""}`} onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}>
      <button type="button" className="modal-backdrop" aria-label="ปิดหน้าต่างยืนยัน" onClick={onClose} />
      <div className="cms-confirm-dialog" data-variant={variant} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div className="cms-confirm-dialog-icon" aria-hidden="true"><TriangleAlert size={30} strokeWidth={2.3} /></div>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="cms-confirm-dialog-actions">
          <button type="button" autoFocus disabled={pending} onClick={onClose}>ยกเลิก</button>
          <button type="button" disabled={pending} aria-busy={pending} className={variant === "danger" ? "cms-confirm-dialog-danger" : "cms-confirm-dialog-confirm"} onClick={onConfirm}>{pending ? <><LoaderCircle className="cms-action-spinner" size={16} aria-hidden="true"/>{pendingLabel}</> : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
