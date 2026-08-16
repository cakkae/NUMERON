"use client";

import { useMemo, useState } from "react";
import { Archive, Filter, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DOCUMENT_TYPES } from "@/lib/document-types";
import type { ValidationError } from "@/lib/validation-engine";
import { emptyEntry, type Entry, type EntryForm, type Partner } from "@/types/accounting";
import { EntryDrawer } from "./entry-drawer";

export function BookView(props: { title: "KUF" | "KIF"; entries: Entry[]; partners: Partner[]; periodIsOpen: boolean; periodLabel: string; errors: ValidationError[]; onSave: (form: EntryForm, editingId: string | null) => Promise<boolean>; onMutate: (id: string, action: "archive" | "delete") => void }) {
  const [query, setQuery] = useState("");
  const [documentType, setDocumentType] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(emptyEntry());
  const [partnerSearch, setPartnerSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const visibleEntries = useMemo(() => props.entries.filter((entry) => {
    const partnerName = props.partners.find((partner) => partner.id === entry.partner_id)?.name ?? "";
    const matchesSearch = `${entry.invoice_number} ${partnerName}`.toLowerCase().includes(query.toLowerCase());
    return matchesSearch && (documentType === "all" || entry.document_type === documentType);
  }), [documentType, props.entries, props.partners, query]);

  function openNew() { setEditingId(null); setForm(emptyEntry()); setPartnerSearch(""); setDrawerOpen(true); }
  function openEdit(entry: Entry) { setEditingId(entry.id); setForm({ partnerId: entry.partner_id, documentType: entry.document_type as EntryForm["documentType"], invoiceNumber: entry.invoice_number, invoiceDate: entry.invoice_date, amount: String(entry.amount) }); setPartnerSearch(props.partners.find((partner) => partner.id === entry.partner_id)?.name ?? ""); setDrawerOpen(true); }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (await props.onSave(form, editingId)) setDrawerOpen(false); }

  return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">Porezna evidencija</span><h1>{props.title}</h1><p>{props.title === "KUF" ? "Knjiga ulaznih faktura" : "Knjiga izlaznih faktura"} · {props.periodLabel}</p></div><button className="button primary" disabled={!props.periodIsOpen} onClick={openNew}><Plus size={18} />Dodaj stavku</button></div>{!props.periodIsOpen && <div className="locked-banner">Period nije otvoren. Stavke možete pregledati, ali ne i mijenjati.</div>}<section className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={18} /><input aria-label={`Pretraži ${props.title}`} placeholder="Pretraži broj fakture ili partnera..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><label className="filter-field"><Filter size={17} /><select aria-label="Filter tipa dokumenta" value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="all">Svi tipovi</option>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>Tip {type}</option>)}</select></label><span className="toolbar-count">{visibleEntries.length} stavki</span></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Datum</th><th>Tip</th><th>Broj fakture</th><th>Partner</th><th className="numeric">Iznos</th><th className="actions-column">Akcije</th></tr></thead><tbody>{visibleEntries.length ? visibleEntries.map((entry) => { const hasError = props.errors.some((error) => error.entryId === entry.id); return <tr key={entry.id} className={hasError ? "row-error" : ""}><td>{new Intl.DateTimeFormat("bs-BA").format(new Date(`${entry.invoice_date}T00:00:00`))}</td><td><span className="document-badge">{entry.document_type}</span></td><td><strong>{entry.invoice_number}</strong>{hasError && <small className="inline-error">Potrebna provjera</small>}</td><td>{props.partners.find((partner) => partner.id === entry.partner_id)?.name ?? "—"}</td><td className="numeric amount-cell">{Number(entry.amount).toLocaleString("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM</td><td><div className="row-actions"><button aria-label="Izmijeni" title="Izmijeni" disabled={!props.periodIsOpen} onClick={() => openEdit(entry)}><Pencil size={16} /></button><button aria-label="Arhiviraj" title="Arhiviraj" disabled={!props.periodIsOpen} onClick={() => props.onMutate(entry.id, "archive")}><Archive size={16} /></button><button className="danger" aria-label="Obriši" title="Obriši" disabled={!props.periodIsOpen} onClick={() => props.onMutate(entry.id, "delete")}><Trash2 size={16} /></button></div></td></tr>; }) : <tr><td colSpan={6}><div className="empty-table"><span className="metric-icon blue"><Search size={22} /></span><strong>Nema pronađenih stavki</strong><p>Promijenite filtere ili dodajte prvu {props.title} stavku.</p></div></td></tr>}</tbody></table></div></section><EntryDrawer open={drawerOpen} title={props.title} form={form} setForm={setForm} partnerSearch={partnerSearch} setPartnerSearch={setPartnerSearch} partners={props.partners} editing={Boolean(editingId)} onClose={() => setDrawerOpen(false)} onSubmit={(event) => void submit(event)} /></div>;
}
