"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function confirmationCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => characters[byte % characters.length]).join("");
}

export function AnnouncementPurgeDialog({ title, description, pending, onClose, onConfirm }: {
  title: string;
  description: string;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [code] = useState(confirmationCode);
  const [typed, setTyped] = useState("");
  return <div className="modal-layer" onKeyDown={(event) => { if (event.key === "Escape" && !pending) onClose(); }}>
    <button type="button" className="modal-backdrop" aria-label="ปิดหน้าต่างยืนยัน" onClick={() => { if (!pending) onClose(); }}/>
    <div className="cms-confirm-dialog news-purge-dialog" role="alertdialog" aria-modal="true" aria-labelledby="announcement-purge-title" aria-describedby="announcement-purge-description">
      <div className="cms-confirm-dialog-icon" aria-hidden="true"><Trash2 size={30}/></div>
      <h2 id="announcement-purge-title">{title}</h2>
      <p id="announcement-purge-description">{description}</p>
      <label htmlFor="announcement-purge-confirm">พิมพ์รหัส <strong className="news-purge-code">{code}</strong> เพื่อยืนยัน</label>
      <input id="announcement-purge-confirm" autoFocus value={typed} onChange={(event) => setTyped(event.target.value.toUpperCase())} autoComplete="off" autoCapitalize="characters" maxLength={6}/>
      <div className="cms-confirm-dialog-actions"><button type="button" disabled={pending} onClick={onClose}>ยกเลิก</button><button type="button" className="cms-confirm-dialog-danger" disabled={pending || typed.trim() !== code} onClick={onConfirm}>ลบถาวร</button></div>
    </div>
  </div>;
}
