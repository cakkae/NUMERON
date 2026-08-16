"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, CircleDollarSign, FileOutput, LockKeyhole, Plus, ReceiptText, RotateCcw, Users } from "lucide-react";
import { Button, Card, ConfirmDialog, EmptyState, StatusBadge } from "@/components/ui/primitives";
import type { ValidationError } from "@/lib/validation-engine";
import type { Company, Period, ViewKey } from "@/types/accounting";

export function DashboardView(props: {
  company: Company; period?: Period; purchaseCount: number; salesCount: number; errorCount: number; errors: ValidationError[];
  onNavigate: (view: ViewKey) => void; onReady: () => void; onTogglePeriod: () => void; onCreatePeriod: () => void;
}) {
  const [confirmLock, setConfirmLock] = useState(false);
  const ready = props.period?.status === "ready_for_export";
  const periodLabel = props.period ? `${String(props.period.month).padStart(2, "0")}/${props.period.year}` : "Period nije odabran";

  const nextAction = !props.period
    ? { label: "Otvori porezni period", detail: "Kreirajte period da biste počeli evidentirati stavke.", icon: Plus, run: props.onCreatePeriod }
    : ready
      ? { label: "Otvori izvoze", detail: "Period je provjeren i spreman za generisanje UINO fajlova.", icon: FileOutput, run: () => props.onNavigate("exports") }
      : props.period.status === "locked"
        ? { label: "Ponovo otvori period", detail: "Period je zaključan i trenutno ne prihvata izmjene.", icon: RotateCcw, run: props.onTogglePeriod }
        : props.errorCount > 0
          ? { label: "Pregledaj greške", detail: `${props.errorCount} blokirajućih grešaka zahtijeva provjeru.`, icon: AlertTriangle, run: () => props.onNavigate(props.errors[0]?.book === "KIF" ? "kif" : "kuf") }
          : { label: "Označi period kao spreman", detail: "Sve trenutne provjere su uspješne.", icon: CheckCircle2, run: props.onReady };
  const NextIcon = nextAction.icon;

  return <div className="view-stack"><div className="page-heading dashboard-heading"><div><span className="eyebrow">Radni pregled</span><h1>{props.company.name}</h1><div className="heading-context"><span>{periodLabel}</span>{props.period && <StatusBadge tone={props.period.status === "open" ? "open" : props.period.status === "locked" ? "locked" : "ready"} dot>{props.period.status === "open" ? "Otvoren" : props.period.status === "locked" ? "Zaključan" : "Spreman"}</StatusBadge>}</div></div></div>
    <Card className="next-action-card"><span className="next-action-icon"><NextIcon size={20} /></span><div><small>Preporučeni sljedeći korak</small><strong>{nextAction.label}</strong><p>{nextAction.detail}</p></div><Button onClick={nextAction.run}>{nextAction.label}<ArrowRight size={16} /></Button></Card>
    <div className="metric-grid"><button className="metric-card" onClick={() => props.onNavigate("kuf")}><span className="metric-icon blue"><BookOpen size={20} /></span><span><small>KUF stavke</small><strong>{props.purchaseCount}</strong><em>Ulazne fakture</em></span><ArrowRight size={17} /></button><button className="metric-card" onClick={() => props.onNavigate("kif")}><span className="metric-icon blue"><ReceiptText size={20} /></span><span><small>KIF stavke</small><strong>{props.salesCount}</strong><em>Izlazne fakture</em></span><ArrowRight size={17} /></button><div className="metric-card"><span className={`metric-icon ${props.errorCount ? "amber" : "green"}`}><AlertTriangle size={20} /></span><span><small>Blokirajuće greške</small><strong>{props.errorCount}</strong><em>{props.errorCount ? "Potrebna provjera" : "Nema grešaka"}</em></span></div><div className="metric-card"><span className={`metric-icon ${ready ? "green" : "slate"}`}>{ready ? <CheckCircle2 size={20} /> : <CircleDollarSign size={20} />}</span><span><small>Spremnost perioda</small><strong className="metric-word">{ready ? "Spreman" : "U radu"}</strong><em>UINO izvoz</em></span></div></div>
    <div className="dashboard-columns"><Card><div className="panel-header"><div><h2>Brze akcije</h2><p>Najčešći koraci za aktivni period</p></div></div><div className="quick-actions"><button onClick={() => props.onNavigate("kuf")}><span><Plus size={17} /></span><div><strong>Dodaj KUF stavku</strong><small>Evidentiraj ulaznu fakturu</small></div><ArrowRight size={16} /></button><button onClick={() => props.onNavigate("kif")}><span><Plus size={17} /></span><div><strong>Dodaj KIF stavku</strong><small>Evidentiraj izlaznu fakturu</small></div><ArrowRight size={16} /></button><button onClick={() => props.onNavigate("partners")}><span><Users size={17} /></span><div><strong>Dodaj partnera</strong><small>Kupac ili dobavljač</small></div><ArrowRight size={16} /></button><button disabled={!props.period} onClick={() => props.period?.status === "open" ? setConfirmLock(true) : props.onTogglePeriod()}><span>{props.period?.status === "open" ? <LockKeyhole size={17} /> : <RotateCcw size={17} />}</span><div><strong>{props.period?.status === "open" ? "Zaključaj period" : "Ponovo otvori period"}</strong><small>Kontrola izmjena evidencije</small></div><ArrowRight size={16} /></button></div></Card>
      <Card><div className="panel-header"><div><h2>Najvažnije greške</h2><p>Stavke koje blokiraju spremnost perioda</p></div><StatusBadge tone={props.errorCount ? "error" : "success"}>{props.errorCount}</StatusBadge></div>{props.errors.length ? <div className="error-list">{props.errors.slice(0, 5).map((error, index) => <button key={`${error.book}-${error.entryId}-${error.code}-${index}`} onClick={() => props.onNavigate(error.book === "KUF" ? "kuf" : "kif")}><AlertTriangle size={17} /><span><strong>{error.book} · {error.code}</strong><small>{error.message}</small></span><ArrowRight size={16} /></button>)}</div> : <EmptyState compact icon={CheckCircle2} title="Nema blokirajućih grešaka" description="Aktivni period je validan prema trenutnim pravilima." />}</Card></div>
    <ConfirmDialog open={confirmLock} title="Zaključati porezni period?" description="Nakon zaključavanja neće biti moguće dodavati, mijenjati ili brisati KUF/KIF stavke dok period ponovo ne otvorite." confirmLabel="Zaključaj period" tone="danger" onCancel={() => setConfirmLock(false)} onConfirm={() => { setConfirmLock(false); props.onTogglePeriod(); }} />
  </div>;
}
