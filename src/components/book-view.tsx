"use client";

import { useMemo, useState } from "react";
import { Archive, CalendarDays, FileSearch, Filter, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, SearchInput, StatusBadge, TableToolbar } from "@/components/ui/primitives";
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const visibleEntries = useMemo(() => props.entries.filter((entry) => {
    const partnerName = props.partners.find((partner) => partner.id === entry.partner_id)?.name ?? "";
    return `${entry.invoice_number} ${partnerName}`.toLowerCase().includes(query.toLowerCase()) && (documentType === "all" || entry.document_type === documentType);
  }), [documentType, props.entries, props.partners, query]);

  function openNew() { setEditingId(null); setForm(emptyEntry()); setPartnerSearch(""); setDrawerOpen(true); }
  function openEdit(entry: Entry) {
    const value = (input: number | null | undefined) => input == null ? "" : String(input);
    setEditingId(entry.id);
    setForm({
      ...emptyEntry(), partnerId: entry.partner_id, documentType: entry.document_type as EntryForm["documentType"], invoiceNumber: entry.invoice_number,
      invoiceDate: entry.invoice_date, receivedDate: entry.received_date ?? "",
      invoiceAmountExcludingVat: value(entry.invoice_amount_excluding_vat), invoiceAmountWithVat: value(entry.invoice_amount_with_vat ?? entry.amount),
      flatRateCompensation: value(entry.flat_rate_compensation), inputVatAmount: value(entry.input_vat_amount), deductibleInputVat: value(entry.deductible_input_vat),
      nonDeductibleInputVat: value(entry.non_deductible_input_vat), inputVatField32: value(entry.input_vat_field_32), inputVatField33: value(entry.input_vat_field_33), inputVatField34: value(entry.input_vat_field_34),
      invoiceTotalAmount: value(entry.invoice_total_amount ?? entry.amount), internalInvoiceAmount: value(entry.internal_invoice_amount), exportInvoiceAmount: value(entry.export_invoice_amount),
      vatExemptSupplyAmount: value(entry.vat_exempt_supply_amount), taxableBaseRegistered: value(entry.taxable_base_registered), outputVatRegistered: value(entry.output_vat_registered),
      taxableBaseNonRegistered: value(entry.taxable_base_non_registered), outputVatNonRegistered: value(entry.output_vat_non_registered), outputVatField32: value(entry.output_vat_field_32),
      outputVatField33: value(entry.output_vat_field_33), outputVatField34: value(entry.output_vat_field_34),
    });
    setPartnerSearch(props.partners.find((partner) => partner.id === entry.partner_id)?.name ?? "");
    setDrawerOpen(true);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (await props.onSave(form, editingId)) setDrawerOpen(false); }

  return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">Porezna evidencija</span><h1>{props.title}</h1><p>{props.title === "KUF" ? "Knjiga ulaznih faktura" : "Knjiga izlaznih faktura"}</p></div><Button disabled={!props.periodIsOpen} onClick={openNew}><Plus size={17} />Dodaj stavku</Button></div>
    {!props.periodIsOpen && <div className="locked-banner">Period nije otvoren. Stavke možete pregledati, ali ne i mijenjati.</div>}
    <section className="panel table-panel"><TableToolbar count={`${visibleEntries.length} stavki`}><span className="toolbar-context"><CalendarDays size={15} />Period {props.periodLabel}</span><SearchInput label={`Pretraži ${props.title}`} placeholder="Broj fakture ili partner…" value={query} onChange={setQuery} /><label className="filter-field"><Filter size={15} /><select aria-label="Filter tipa dokumenta" value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="all">Svi tipovi</option>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>Tip {type}</option>)}</select></label></TableToolbar>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Datum</th><th>Tip</th><th>Broj fakture</th><th>Partner</th><th className="numeric">Ukupan iznos</th><th className="actions-column">Akcije</th></tr></thead><tbody>{visibleEntries.length ? visibleEntries.map((entry) => {
        const hasError = props.errors.some((error) => error.entryId === entry.id);
        const total = props.title === "KUF" ? entry.invoice_amount_with_vat ?? entry.amount : entry.invoice_total_amount ?? entry.amount;
        return <tr key={entry.id} className={hasError ? "row-error" : ""}><td>{new Intl.DateTimeFormat("bs-BA").format(new Date(`${entry.invoice_date}T00:00:00`))}</td><td><StatusBadge tone="neutral">{entry.document_type}</StatusBadge></td><td><strong>{entry.invoice_number}</strong>{hasError && <small className="inline-error">Potrebna provjera</small>}</td><td>{props.partners.find((partner) => partner.id === entry.partner_id)?.name ?? "—"}</td><td className="numeric amount-cell">{total == null ? "—" : `${Number(total).toLocaleString("bs-BA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM`}</td><td><div className="row-actions"><button aria-label="Izmijeni" title="Izmijeni" disabled={!props.periodIsOpen} onClick={() => openEdit(entry)}><Pencil size={15} /></button><button aria-label="Arhiviraj" title="Arhiviraj" disabled={!props.periodIsOpen} onClick={() => props.onMutate(entry.id, "archive")}><Archive size={15} /></button><button className="danger" aria-label="Obriši" title="Obriši" disabled={!props.periodIsOpen} onClick={() => setDeleteId(entry.id)}><Trash2 size={15} /></button></div></td></tr>;
      }) : <tr><td colSpan={6}><EmptyState icon={FileSearch} title={query || documentType !== "all" ? "Nema rezultata" : `Nema ${props.title} stavki`} description={query || documentType !== "all" ? "Promijenite pretragu ili filter tipa dokumenta." : `Dodajte prvu ${props.title} stavku za aktivni period.`} action={props.periodIsOpen && !query && documentType === "all" ? <Button size="sm" onClick={openNew}><Plus size={15} />Dodaj stavku</Button> : undefined} /></td></tr>}</tbody></table></div>
    </section>
    <EntryDrawer open={drawerOpen} title={props.title} form={form} setForm={setForm} partnerSearch={partnerSearch} setPartnerSearch={setPartnerSearch} partners={props.partners} editing={Boolean(editingId)} onClose={() => setDrawerOpen(false)} onSubmit={(event) => void submit(event)} />
    <ConfirmDialog open={Boolean(deleteId)} title="Obrisati stavku?" description="Stavka će biti trajno uklonjena iz aktivne knjige. Ovu radnju nije moguće poništiti." confirmLabel="Obriši stavku" tone="danger" onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) props.onMutate(deleteId, "delete"); setDeleteId(null); }} />
  </div>;
}
