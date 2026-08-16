"use client";

import { FormEvent } from "react";
import { Button, Drawer, Field, Input, Select } from "@/components/ui/primitives";
import { DOCUMENT_TYPES, getDocumentTypeLabel, type DocumentType } from "@/lib/document-types";
import { PURCHASE_MONEY_FIELDS, SALES_MONEY_FIELDS, UINO_MONEY_FIELD_LABELS, type UinoMoneyField } from "@/lib/uino-fields";
import type { EntryForm, Partner } from "@/types/accounting";

function AmountField(props: { field: UinoMoneyField; form: EntryForm; setForm: (form: EntryForm) => void }) {
  return <Field label={UINO_MONEY_FIELD_LABELS[props.field]} helper="Unesite iznos s najviše dvije decimale."><div className="amount-input"><Input type="number" step="0.01" min="0" placeholder="0,00" value={props.form[props.field]} onChange={(event) => props.setForm({ ...props.form, [props.field]: event.target.value })} /><span>KM</span></div></Field>;
}

function primarySalesFields(type: DocumentType): UinoMoneyField[] {
  if (type === "02") return ["invoiceTotalAmount", "internalInvoiceAmount"];
  if (type === "04") return ["invoiceTotalAmount", "exportInvoiceAmount"];
  if (type === "05") return ["invoiceTotalAmount", "vatExemptSupplyAmount"];
  return ["invoiceTotalAmount", "taxableBaseRegistered", "outputVatRegistered", "taxableBaseNonRegistered", "outputVatNonRegistered"];
}

export function EntryDrawer(props: { open: boolean; title: "KUF" | "KIF"; form: EntryForm; setForm: (form: EntryForm) => void; partnerSearch: string; setPartnerSearch: (value: string) => void; partners: Partner[]; editing: boolean; sourceDocumentName?: string; submitLabel?: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const listId = `${props.title.toLowerCase()}-drawer-partners`;
  const allFields: readonly UinoMoneyField[] = props.title === "KUF" ? PURCHASE_MONEY_FIELDS : SALES_MONEY_FIELDS;
  const primaryFields: UinoMoneyField[] = props.title === "KUF"
    ? ["invoiceAmountExcludingVat", "invoiceAmountWithVat", "inputVatAmount", "deductibleInputVat", "nonDeductibleInputVat"]
    : primarySalesFields(props.form.documentType);
  const additionalFields = allFields.filter((field) => !primaryFields.includes(field));
  const partnerError = props.partnerSearch.length > 0 && !props.form.partnerId ? "Odaberite tačan zapis partnera iz ponuđene liste." : undefined;

  return <Drawer open={props.open} title={`${props.title} dokument`} eyebrow={props.editing ? "Izmjena stavke" : "Nova stavka"} onClose={props.onClose}><form className="drawer-form" onSubmit={props.onSubmit}>
    <section className="form-group"><div className="form-group-heading"><span>01</span><div><strong>Dokument i partner</strong><p>Osnovni identifikacioni podaci fakture.</p></div></div><div className="form-group-fields"><Field label="Partner" required error={partnerError}><Input list={listId} placeholder="Počnite unositi naziv partnera" value={props.partnerSearch} aria-invalid={Boolean(partnerError)} onChange={(event) => { const value = event.target.value; props.setPartnerSearch(value); props.setForm({ ...props.form, partnerId: props.partners.find((partner) => partner.name === value)?.id ?? "" }); }} required /></Field><datalist id={listId}>{props.partners.map((partner) => <option key={partner.id} value={partner.name}>{partner.vat_number || "Bez PDV broja"}</option>)}</datalist><div className="form-row"><Field label="Tip dokumenta" required><Select value={props.form.documentType} onChange={(event) => props.setForm({ ...props.form, documentType: event.target.value as DocumentType })}>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type} — {getDocumentTypeLabel(props.title, type)}</option>)}</Select></Field><Field label="Broj fakture / dokumenta" required helper="Mora biti jedinstven u aktivnoj knjizi."><Input placeholder="npr. 2026-001" value={props.form.invoiceNumber} onChange={(event) => props.setForm({ ...props.form, invoiceNumber: event.target.value })} required /></Field></div></div></section>
    <section className="form-group"><div className="form-group-heading"><span>02</span><div><strong>Datumi</strong><p>Datumi moraju pripadati aktivnom poreznom periodu.</p></div></div><div className="form-group-fields form-row"><Field label="Datum fakture / dokumenta" required><Input type="date" value={props.form.invoiceDate} onChange={(event) => props.setForm({ ...props.form, invoiceDate: event.target.value })} required /></Field>{props.title === "KUF" && <Field label="Datum prijema / knjiženja" required><Input type="date" value={props.form.receivedDate} onChange={(event) => props.setForm({ ...props.form, receivedDate: event.target.value })} required /></Field>}</div></section>
    <section className="form-group"><div className="form-group-heading"><span>03</span><div><strong>UINO iznosi</strong><p>PDV se ne obračunava automatski. Unesite samo vrijednosti sa dokumenta.</p></div></div><div className="form-group-fields form-row uino-fields">{primaryFields.map((field) => <AmountField key={field} field={field} form={props.form} setForm={props.setForm} />)}</div>{additionalFields.length > 0 && <details className="additional-fields"><summary>Dodatna UINO polja</summary><div className="form-row uino-fields">{additionalFields.map((field) => <AmountField key={field} field={field} form={props.form} setForm={props.setForm} />)}</div></details>}</section>
    <div className="drawer-note">{props.sourceDocumentName ? <>Izvor: <strong>{props.sourceDocumentName}</strong>. Stavka i dokument biće povezani tek nakon eksplicitne potvrde.</> : "Stavka će biti spremljena u aktivnu firmu i porezni period. Prazni iznosi ostaju prazni."}</div><div className="drawer-actions"><Button type="button" variant="secondary" onClick={props.onClose}>Odustani</Button><Button>{props.submitLabel ?? (props.editing ? "Sačuvaj izmjene" : "Dodaj stavku")}</Button></div>
  </form></Drawer>;
}
