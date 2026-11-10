"use client";
import { Plus, type LucideIcon } from "lucide-react";
export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: { icon?: LucideIcon; title: string; description?: string; actionLabel?: string; onAction?: () => void }) { const StateIcon = Icon ?? Plus; return <div className="empty-state"><span><StateIcon size={28}/></span><strong>{title}</strong>{description ? <p>{description}</p> : null}{actionLabel && onAction ? <button type="button" className="primary-button" onClick={onAction}><Plus size={16}/>{actionLabel}</button> : null}</div>; }
