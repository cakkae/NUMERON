"use client";

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { AlertTriangle, Search, X, type LucideIcon } from "lucide-react";

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; size?: "sm" | "md" }) {
  return <button className={`button ${variant} button-${size} ${className}`.trim()} {...props} />;
}

export function IconButton({ label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button className={`icon-button ${className}`.trim()} aria-label={label} title={props.title ?? label} {...props} />;
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`control ${className}`.trim()} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`control ${className}`.trim()} {...props} />;
}

export function Field(props: { label: string; htmlFor?: string; helper?: string; error?: string; required?: boolean; children: ReactNode }) {
  return <label className={`field ${props.error ? "field-invalid" : ""}`} htmlFor={props.htmlFor}><span className="field-label">{props.label}{props.required && <i aria-hidden="true">*</i>}</span>{props.children}{props.error ? <small className="field-error" role="alert">{props.error}</small> : props.helper ? <small className="field-helper">{props.helper}</small> : null}</label>;
}

export function SearchInput(props: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <label className="search-field"><Search size={16} aria-hidden="true" /><input aria-label={props.label} placeholder={props.placeholder} value={props.value} onChange={(event) => props.onChange(event.target.value)} /></label>;
}

export function StatusBadge(props: { tone: "open" | "ready" | "locked" | "error" | "success" | "neutral" | "reviewing"; children: ReactNode; dot?: boolean }) {
  return <span className={`status-badge status-badge-${props.tone}`}>{props.dot && <i aria-hidden="true" />}{props.children}</span>;
}

export function Card(props: { children: ReactNode; className?: string }) {
  return <section className={`panel ${props.className ?? ""}`.trim()}>{props.children}</section>;
}

export function EmptyState(props: { icon: LucideIcon; title: string; description: string; action?: ReactNode; compact?: boolean }) {
  const Icon = props.icon;
  return <div className={`empty-state ${props.compact ? "empty-state-compact" : ""}`}><span className="empty-state-icon"><Icon size={21} /></span><strong>{props.title}</strong><p>{props.description}</p>{props.action}</div>;
}

export function TableToolbar(props: { children: ReactNode; count?: string }) {
  return <div className="table-toolbar">{props.children}{props.count && <span className="toolbar-count">{props.count}</span>}</div>;
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [onClose, open]);
}

export function Drawer(props: { open: boolean; title: string; eyebrow: string; onClose: () => void; children: ReactNode; className?: string }) {
  useEscape(props.open, props.onClose);
  if (!props.open) return null;
  return <div className="drawer-layer"><button className="drawer-backdrop" aria-label="Zatvori panel" onClick={props.onClose} /><aside className={`drawer ${props.className ?? ""}`.trim()} aria-label={props.title} role="dialog" aria-modal="true"><div className="drawer-header"><div><span className="eyebrow">{props.eyebrow}</span><h2>{props.title}</h2></div><IconButton label="Zatvori" autoFocus onClick={props.onClose}><X size={19} /></IconButton></div>{props.children}</aside></div>;
}

export function ConfirmDialog(props: { open: boolean; title: string; description: string; confirmLabel: string; tone?: "primary" | "danger"; onConfirm: () => void; onCancel: () => void }) {
  useEscape(props.open, props.onCancel);
  if (!props.open) return null;
  return <div className="modal-layer" role="presentation"><button className="modal-backdrop" aria-label="Odustani" onClick={props.onCancel} /><section className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><span className={`confirm-icon ${props.tone === "danger" ? "danger" : ""}`}><AlertTriangle size={21} /></span><div><h2 id="confirm-title">{props.title}</h2><p id="confirm-description">{props.description}</p></div><div className="confirm-actions"><Button variant="secondary" autoFocus onClick={props.onCancel}>Odustani</Button><Button variant={props.tone === "danger" ? "danger" : "primary"} onClick={props.onConfirm}>{props.confirmLabel}</Button></div></section></div>;
}

export function Toast(props: { message: string; onClose: () => void }) {
  return <div className="toast" role="status" aria-live="polite"><span>{props.message}</span><IconButton label="Zatvori poruku" onClick={props.onClose}><X size={16} /></IconButton></div>;
}

export function WorkspaceSkeleton() {
  return <div className="workspace-skeleton" aria-label="Učitavanje radnog prostora"><aside><span className="skeleton-block skeleton-brand" />{Array.from({ length: 6 }, (_, index) => <span key={index} className="skeleton-block skeleton-nav" />)}</aside><main><header><span className="skeleton-block skeleton-control" /><span className="skeleton-block skeleton-control short" /></header><div><span className="skeleton-block skeleton-title" /><section>{Array.from({ length: 4 }, (_, index) => <span key={index} className="skeleton-block skeleton-card" />)}</section></div></main></div>;
}
