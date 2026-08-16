"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, BookOpen, Building2, CalendarDays, CalendarPlus, ChevronDown, FileOutput, Files, Menu, ReceiptText, Settings, Users, X } from "lucide-react";
import { IconButton, StatusBadge } from "@/components/ui/primitives";
import type { Company, Period, ViewKey } from "@/types/accounting";

const navigation = [
  { key: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
  { key: "kuf" as const, label: "KUF", icon: BookOpen },
  { key: "kif" as const, label: "KIF", icon: ReceiptText },
  { key: "partners" as const, label: "Partneri", icon: Users },
  { key: "documents" as const, label: "Dokumenti", icon: Files },
  { key: "exports" as const, label: "Izvozi", icon: FileOutput },
  { key: "settings" as const, label: "Postavke", icon: Settings },
];

const statusLabels: Record<Period["status"], string> = { open: "Otvoren", locked: "Zaključan", ready_for_export: "Spreman" };
const statusTones: Record<Period["status"], "open" | "locked" | "ready"> = { open: "open", locked: "locked", ready_for_export: "ready" };

export function AppShell(props: {
  children: ReactNode; view: ViewKey; onNavigate: (view: ViewKey) => void; companies: Company[]; activeCompanyId: string;
  onCompanyChange: (id: string) => void; periods: Period[]; activePeriodId: string; onPeriodChange: (id: string) => void;
  onCreatePeriod: () => void; activePeriod?: Period; userEmail: string; onSignOut: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const activeCompany = props.companies.find((company) => company.id === props.activeCompanyId);
  const navigate = (view: ViewKey) => { props.onNavigate(view); setMobileOpen(false); };

  const companySelect = <select value={props.activeCompanyId} onChange={(event) => props.onCompanyChange(event.target.value)} aria-label="Aktivna firma">{props.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select>;
  const periodSelect = <select value={props.activePeriodId} onChange={(event) => props.onPeriodChange(event.target.value)} aria-label="Aktivni porezni period"><option value="">Odaberite period</option>{props.periods.map((period) => <option key={period.id} value={period.id}>{String(period.month).padStart(2, "0")}/{period.year}</option>)}</select>;

  return <div className="workspace-shell"><aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}><div className="brand"><div className="brand-mark">N</div><div><strong>NUMERON</strong><span>Računovodstveni workspace</span></div><IconButton className="mobile-close" label="Zatvori meni" onClick={() => setMobileOpen(false)}><X size={19} /></IconButton></div>
    <div className="workspace-context"><span className="workspace-context-icon"><Building2 size={17} /></span><div><small>Aktivna firma</small><strong title={activeCompany?.name}>{activeCompany?.name ?? "Firma nije odabrana"}</strong><span>{activeCompany?.vat_number ? `PDV ${activeCompany.vat_number}` : "Bez PDV broja"}</span></div></div>
    <div className="mobile-context"><label><span>Firma</span>{companySelect}</label><label><span>Period</span><div>{periodSelect}<IconButton label="Novi period" onClick={props.onCreatePeriod}><CalendarPlus size={17} /></IconButton></div></label></div>
    <nav aria-label="Glavna navigacija">{navigation.map(({ key, label, icon: Icon }) => <button key={key} className={`nav-item ${props.view === key ? "active" : ""}`} aria-current={props.view === key ? "page" : undefined} onClick={() => navigate(key)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span></button>)}</nav>
    <div className="sidebar-footer"><div className="security-dot" /><div><strong>Zaštićen radni prostor</strong><span>Pristup je ograničen po firmi</span></div></div></aside>{mobileOpen && <button className="sidebar-overlay" aria-label="Zatvori meni" onClick={() => setMobileOpen(false)} />}
    <div className="workspace-main"><header className="topbar"><IconButton className="mobile-menu" label="Otvori meni" onClick={() => setMobileOpen(true)}><Menu size={21} /></IconButton><div className="topbar-selectors"><label><span>Aktivna firma</span><div className="select-with-icon"><Building2 size={16} />{companySelect}</div></label><label><span>Porezni period</span><div className="period-select"><span className="select-with-icon period-control"><CalendarDays size={16} />{periodSelect}</span><IconButton className="compact" label="Novi period" onClick={props.onCreatePeriod}><CalendarPlus size={16} /></IconButton></div></label>{props.activePeriod && <StatusBadge tone={statusTones[props.activePeriod.status]} dot>{statusLabels[props.activePeriod.status]}</StatusBadge>}</div>
      <div className="user-menu"><button className="user-trigger" aria-expanded={userOpen} onClick={() => setUserOpen((open) => !open)}><span className="avatar">{props.userEmail.slice(0, 1).toUpperCase()}</span><span className="user-copy"><strong>Vlasnik servisa</strong><small>{props.userEmail}</small></span><ChevronDown size={15} /></button>{userOpen && <div className="user-dropdown"><div><small>Prijavljeni korisnik</small><strong>{props.userEmail}</strong></div><button onClick={props.onSignOut}>Odjava</button></div>}</div></header><main className="content-area">{props.children}</main></div></div>;
}
