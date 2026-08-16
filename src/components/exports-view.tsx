"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileCheck2, FileOutput, ShieldCheck } from "lucide-react";
import { Button, Card, EmptyState, IconButton, StatusBadge } from "@/components/ui/primitives";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { Company, Entry, ExportArchive, Period } from "@/types/accounting";

function moneyTotal(entries: Entry[], book: "KUF" | "KIF") {
  return entries.reduce((sum, entry) => sum + Number(book === "KUF" ? entry.invoice_amount_with_vat ?? 0 : entry.invoice_total_amount ?? 0), 0);
}

export function ExportsView(props: { company: Company; period?: Period; purchases: Entry[]; sales: Entry[]; archives: ExportArchive[]; onRefresh: (periodId: string) => Promise<void>; onMessage: (message: string) => void }) {
  const [busyBook, setBusyBook] = useState<"KUF" | "KIF" | null>(null);
  const ready = props.period?.status === "ready_for_export";
  async function accessToken() { const { data } = await createSupabaseBrowserClient().auth.getSession(); if (!data.session?.access_token) throw new Error("Prijava je istekla."); return data.session.access_token; }
  async function download(id: string, fileName: string) {
    const response = await fetch(`/api/exports/${id}/download`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    if (!response.ok) { const payload = await response.json() as { error?: string }; throw new Error(payload.error ?? "Preuzimanje nije uspjelo."); }
    const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = fileName; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
  }
  async function generate(book: "KUF" | "KIF") {
    if (!props.period) return;
    setBusyBook(book);
    try {
      const response = await fetch("/api/exports", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify({ companyId: props.company.id, periodId: props.period.id, book }) });
      const payload = await response.json() as { error?: string; exports?: Array<{ id: string; fileName: string }> };
      if (!response.ok || !payload.exports) throw new Error(payload.error ?? "Generisanje nije uspjelo.");
      await props.onRefresh(props.period.id); for (const file of payload.exports) await download(file.id, file.fileName); props.onMessage(`${book} izvoz je generisan, arhiviran i preuzet.`);
    } catch (error) { props.onMessage(error instanceof Error ? error.message : "Generisanje nije uspjelo."); }
    finally { setBusyBook(null); }
  }

  const periodLabel = props.period ? `${String(props.period.month).padStart(2, "0")}/${props.period.year}` : "Nije odabran";
  return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">UINO e-PDV</span><h1>Izvozi</h1><p>{props.company.name} · {periodLabel}</p></div></div>
    <Card className={`export-readiness ${ready ? "ready" : "blocked"}`}><span>{ready ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}</span><div><small>Status aktivnog perioda</small><strong>{ready ? "Spreman za izvoz" : "Izvoz je blokiran"}</strong><p>{ready ? "Validacije su uspješne. Možete generisati i preuzeti UINO CSV fajlove." : "Period mora imati status Spreman prije generisanja CSV fajla."}</p></div><StatusBadge tone={ready ? "success" : "error"}>{ready ? "READY" : "NOT READY"}</StatusBadge></Card>
    <div className="export-grid"><Card className="export-card"><span className="metric-icon blue"><FileOutput size={20} /></span><div><small>e-Nabavke / KUF</small><strong>{props.purchases.length} stavki</strong><p>Ukupan iznos sa PDV-om: {moneyTotal(props.purchases, "KUF").toLocaleString("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</p></div><Button disabled={!ready || busyBook !== null} onClick={() => void generate("KUF")}><Download size={16} />{busyBook === "KUF" ? "Generisanje…" : "Preuzmi KUF CSV"}</Button></Card><Card className="export-card"><span className="metric-icon blue"><FileOutput size={20} /></span><div><small>e-Isporuke / KIF</small><strong>{props.sales.length} stavki</strong><p>Ukupan iznos: {moneyTotal(props.sales, "KIF").toLocaleString("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</p></div><Button disabled={!ready || busyBook !== null} onClick={() => void generate("KIF")}><Download size={16} />{busyBook === "KIF" ? "Generisanje…" : "Preuzmi KIF CSV"}</Button></Card></div>
    <Card className="table-panel"><div className="panel-header export-history-header"><div><h2>Arhiva izvoza</h2><p>Privatno sačuvani fajlovi sa SHA-256 provjerom</p></div><span className="audit-label"><ShieldCheck size={15} />Audit trag</span></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Fajl</th><th>Knjiga</th><th>Vrijeme</th><th className="numeric">Stavke</th><th>Hash</th><th>Preuzmi</th></tr></thead><tbody>{props.archives.length ? props.archives.map((archive) => <tr key={archive.id}><td><div className="export-file"><FileCheck2 size={16} /><strong>{archive.file_name}</strong></div></td><td><StatusBadge tone="neutral">{archive.book_type}</StatusBadge></td><td>{new Intl.DateTimeFormat("bs-BA", { dateStyle: "short", timeStyle: "medium", timeZone: "Europe/Sarajevo" }).format(new Date(archive.generated_at))}</td><td className="numeric">{archive.item_count}</td><td><code title={archive.content_sha256}>{archive.content_sha256.slice(0, 12)}…</code></td><td><IconButton label={`Preuzmi ${archive.file_name}`} onClick={() => void download(archive.id, archive.file_name).catch((error) => props.onMessage(error.message))}><Download size={16} /></IconButton></td></tr>) : <tr><td colSpan={6}><EmptyState icon={FileOutput} title="Nema arhiviranih izvoza" description="Generisani CSV fajlovi pojavit će se ovdje sa hashom i vremenom izrade." /></td></tr>}</tbody></table></div></Card>
  </div>;
}
