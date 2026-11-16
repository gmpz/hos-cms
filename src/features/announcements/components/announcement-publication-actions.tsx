"use client";

import { LoaderCircle, Save, Send } from "lucide-react";
import type { ReactNode } from "react";
import { PublishDropdown } from "@/components/admin/publish-dropdown";

type AnnouncementPublicationActionsProps = {
  formId: string;
  published: boolean;
  existing: boolean;
  unsaved: boolean;
  savedDraft: boolean;
  pending: boolean;
  pendingAction?: "save" | "publish" | "unpublish" | "discard" | null;
  onUnpublish: () => void;
  children?: ReactNode;
};

export function AnnouncementPublicationActions({
  formId,
  published,
  existing,
  unsaved,
  savedDraft,
  pending,
  pendingAction,
  onUnpublish,
  children,
}: AnnouncementPublicationActionsProps) {
  const saveDisabled = pending || (existing && !unsaved);
  const publishDisabled = pending || (published && !unsaved && !savedDraft);

  return (
    <div className="announcement-edit-actions">
      {children}
      <button className="announcement-footer-save" type="submit" form={formId} disabled={saveDisabled} aria-busy={pending && (!pendingAction || pendingAction === "save")}>
        {pendingAction === "save" ? <LoaderCircle className="cms-action-spinner" size={18}/> : <Save size={18}/>}
        {pending && !pendingAction ? "กำลังบันทึก..." : "บันทึกร่าง"}
      </button>
      <div className="announcement-publish-group">
        <button className="announcement-footer-publish" type="submit" form={formId} data-action="publish" disabled={publishDisabled} aria-busy={pending && (!pendingAction || pendingAction === "publish")}>
          {pendingAction === "publish" ? <LoaderCircle className="cms-action-spinner" size={18}/> : <Send size={18}/>}
          {pending && !pendingAction ? "กำลังดำเนินการ..." : "เผยแพร่"}
        </button>
        {published && existing ? <PublishDropdown variant="announcement" disabled={pending} onUnpublish={onUnpublish}/> : null}
      </div>
    </div>
  );
}
