"use client";

import { FormEvent } from "react";
import { X } from "lucide-react";
import { DOCUMENT_TYPES, getDocumentTypeLabel, type DocumentType } from "@/lib/document-types";
import { PURCHASE_MONEY_FIELDS, SALES_MONEY_FIELDS, UINO_MONEY_FIELD_LABELS, type UinoMoneyField } from "@/lib/uino-fields";
import type { EntryForm, Partner } from "@/types/accounting";

function AmountField(props: { field: UinoMoneyField; form: EntryForm; setForm: (form: EntryForm) => void }) {
  return <label><span>{UINO_MONEY_FIELD_LABELS[props.field]}</span><div className="amount-input"><input type="number" step="0.01" min="0" placeholder="Prazno" value={props.form[props.field]} onChange={(event) => props.setForm({ ...props.form, [props.field]: event.target.value })} /><span>KM</span></div></label>;
}

function primarySalesFields(type: DocumentType): UinoMoneyField[] {
  if (type === "02") return ["invoiceTotalAmount", "internalInvoiceAmount"];
  if (type === "04") return ["invoiceTotalAmount", "exportInvoiceAmount"];
  if (type === "05") return ["invoiceTotalAmount", "vatExemptSupplyAmount"];
  return ["invoiceTotalAmount", "taxableBaseRegistered", "outputVatRegistered", "taxableBaseNonRegistered", "outputVatNonRegistered"];
}

export function EntryDrawer(props: { open: boolean; title: "KUF" | "KIF"; form: EntryForm; setForm: (form: EntryForm) => void; partnerSearch: string; setPartnerSearch: (value: string) => void; partners: Partner[]; editing: boolean; sourceDocumentName?: string; submitLabel?: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  if (!props.open) return null;
  const listId = `${props.title.toLowerCase()}-drawer-partners`;
  const allFields: readonly UinoMoneyField[] = props.title === "KUF" ? PURCHASE_MONEY_FIELDS : SALES_MONEY_FIELDS;
  const primaryFields: UinoMoneyField[] = props.title === "KUF"
    ? ["invoiceAmountExcludingVat", "invoiceAmountWithVat", "inputVatAmount", "deductibleInputVat", "nonDeductibleInputVat"]
    : primarySalesFields(props.form.documentType);
  const additionalFields = allFields.filter((field) => !primaryFields.includes(field));

  return <div className="drawer-layer"><button className="drawer-backdrop" aria-label="Zatvori formu" onClick={props.onClose} /><aside className="drawer" aria-label={`${props.title} forma`}><div className="drawer-header"><div><span className="eyebrow">{props.editing ? "Izmjena stavke" : "Nova stavka"}</span><h2>{props.title} dokument</h2></div><button className="icon-button" aria-label="Zatvori" onClick={props.onClose}><X size={20} /></button></div><form className="drawer-form" onSubmit={props.onSubmit}>
    <label><span>Partner</span><input list={listId} placeholder="Počnite unositi naziv partnera" value={props.partnerSearch} onChange={(event) => { const value = event.target.value; props.setPartnerSearch(value); props.setForm({ ...props.form, partnerId: props.partners.find((partner) => partner.name === value)?.id ?? "" }); }} required /></label>
    <datalist id={listId}>{props.partners.map((partner) => <option key={partner.id} value={partner.name}>{partner.vat_number || "Bez PDV broja"}</option>)}</datalist>
    <div className="form-row"><label><span>Tip dokumenta</span><select value={props.form.documentType} onChange={(event) => props.setForm({ ...props.form, documentType: event.target.value as DocumentType })}>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type} — {getDocumentTypeLabel(props.title, type)}</option>)}</select></label><label><span>Broj fakture / dokumenta</span><input placeholder="npr. 2026-001" value={props.form.invoiceNumber} onChange={(event) => props.setForm({ ...props.form, invoiceNumber: event.target.value })} required /></label></div>
    <div className="form-row"><label><span>Datum fakture / dokumenta</span><input type="date" value={props.form.invoiceDate} onChange={(event) => props.setForm({ ...props.form, invoiceDate: event.target.value })} required /></label>{props.title === "KUF" && <label><span>Datum prijema / knjiženja</span><input type="date" value={props.form.receivedDate} onChange={(event) => props.setForm({ ...props.form, receivedDate: event.target.value })} required /></label>}</div>
    <div className="form-section"><div><strong>UINO iznosi</strong><p>Unesite samo iznose koje dokument sadrži. PDV se ne računa automatski.</p></div><div className="form-row uino-fields">{primaryFields.map((field) => <AmountField key={field} field={field} form={props.form} setForm={props.setForm} />)}</div></div>
    {additionalFields.length > 0 && <details className="additional-fields"><summary>Dodatna UINO polja</summary><div className="form-row uino-fields">{additionalFields.map((field) => <AmountField key={field} field={field} form={props.form} setForm={props.setForm} />)}</div></details>}
    <div className="drawer-note">{props.sourceDocumentName ? <>Izvor: <strong>{props.sourceDocumentName}</strong>. Stavka i dokument biće povezani tek kada eksplicitno kliknete Spremi i potvrdi.</> : "Stavka će biti spremljena u aktivnu firmu i porezni period. Prazni iznosi ostaju prazni."}</div><div className="drawer-actions"><button type="button" className="button secondary" onClick={props.onClose}>Odustani</button><button className="button primary">{props.submitLabel ?? (props.editing ? "Sačuvaj izmjene" : "Dodaj stavku")}</button></div>
  </form></aside></div>;
}
