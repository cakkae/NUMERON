"use client";

import { useState, type ReactNode } from "react";
import { BarChart3, BookOpen, Building2, CalendarPlus, ChevronDown, FileOutput, Files, Menu, ReceiptText, Settings, Users, X } from "lucide-react";
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

export function AppShell(props: {
  children: ReactNode;
  view: ViewKey;
  onNavigate: (view: ViewKey) => void;
  companies: Company[];
  activeCompanyId: string;
  onCompanyChange: (id: string) => void;
  periods: Period[];
  activePeriodId: string;
  onPeriodChange: (id: string) => void;
  onCreatePeriod: () => void;
  activePeriod?: Period;
  userEmail: string;
  onSignOut: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const navigate = (view: ViewKey) => { props.onNavigate(view); setMobileOpen(false); };

  return <div className="workspace-shell"><aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}><div className="brand"><div className="brand-mark">N</div><div><strong>NUMERON</strong><span>Accounting workspace</span></div><button className="mobile-close icon-button" aria-label="Zatvori meni" onClick={() => setMobileOpen(false)}><X size={20} /></button></div><nav aria-label="Glavna navigacija">{navigation.map(({ key, label, icon: Icon }) => <button key={key} className={`nav-item ${props.view === key ? "active" : ""}`} onClick={() => navigate(key)}><Icon size={19} strokeWidth={1.8} /><span>{label}</span></button>)}</nav><div className="sidebar-footer"><div className="security-dot" /><div><strong>Siguran pristup</strong><span>RLS zaštita aktivna</span></div></div></aside>{mobileOpen && <button className="sidebar-overlay" aria-label="Zatvori meni" onClick={() => setMobileOpen(false)} />}<div className="workspace-main"><header className="topbar"><button className="mobile-menu icon-button" aria-label="Otvori meni" onClick={() => setMobileOpen(true)}><Menu size={22} /></button><div className="topbar-selectors"><label><span>Aktivna firma</span><div className="select-with-icon"><Building2 size={17} /><select value={props.activeCompanyId} onChange={(event) => props.onCompanyChange(event.target.value)}>{props.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div></label><label><span>Porezni period</span><div className="period-select"><select value={props.activePeriodId} onChange={(event) => props.onPeriodChange(event.target.value)}><option value="">Odaberite period</option>{props.periods.map((period) => <option key={period.id} value={period.id}>{String(period.month).padStart(2, "0")}/{period.year}</option>)}</select><button className="icon-button compact" aria-label="Novi period" title="Novi period" onClick={props.onCreatePeriod}><CalendarPlus size={17} /></button></div></label>{props.activePeriod && <span className={`status-pill status-${props.activePeriod.status}`}><i />{statusLabels[props.activePeriod.status]}</span>}</div><div className="user-menu"><button className="user-trigger" onClick={() => setUserOpen((open) => !open)}><span className="avatar">{props.userEmail.slice(0, 1).toUpperCase()}</span><span className="user-copy"><strong>Vlasnik servisa</strong><small>{props.userEmail}</small></span><ChevronDown size={16} /></button>{userOpen && <div className="user-dropdown"><button onClick={props.onSignOut}>Odjava</button></div>}</div></header><div className="content-area">{props.children}</div></div></div>;
}
