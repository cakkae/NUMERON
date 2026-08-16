"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getPeriodValidationStatus, isValidOrEmptyJib, isValidOrEmptyVatNumber, validateBookEntries, validateEntryForm } from "@/lib/validation-engine";
import type { BookTable, Company, Entry, EntryForm, ExportArchive, InvoiceDocument, Partner, PartnerForm, Period } from "@/types/accounting";

export function useAccountingWorkspace() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [purchases, setPurchases] = useState<Entry[]>([]);
  const [sales, setSales] = useState<Entry[]>([]);
  const [exportArchives, setExportArchives] = useState<ExportArchive[]>([]);
  const [documents, setDocuments] = useState<InvoiceDocument[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const activeCompany = companies.find((company) => company.id === activeCompanyId);
  const activePeriod = periods.find((period) => period.id === activePeriodId);
  const periodIsOpen = activePeriod?.status === "open";
  const validationPartners = useMemo(() => partners.map((item) => ({ id: item.id, vatNumber: item.vat_number, jib: item.jib })), [partners]);
  const periodContext = useMemo(() => activePeriod && activeCompany ? { id: activePeriod.id, companyId: activeCompany.id, year: activePeriod.year, month: activePeriod.month } : null, [activeCompany, activePeriod]);
  const toValidationEntries = (entries: Entry[]) => entries.map((entry) => ({
    id: entry.id, companyId: entry.company_id, taxPeriodId: entry.tax_period_id, partnerId: entry.partner_id,
    documentType: entry.document_type, invoiceNumber: entry.invoice_number, invoiceDate: entry.invoice_date,
    receivedDate: entry.received_date, amount: entry.amount,
    invoiceAmountExcludingVat: entry.invoice_amount_excluding_vat, invoiceAmountWithVat: entry.invoice_amount_with_vat,
    flatRateCompensation: entry.flat_rate_compensation, inputVatAmount: entry.input_vat_amount,
    deductibleInputVat: entry.deductible_input_vat, nonDeductibleInputVat: entry.non_deductible_input_vat,
    inputVatField32: entry.input_vat_field_32, inputVatField33: entry.input_vat_field_33, inputVatField34: entry.input_vat_field_34,
    invoiceTotalAmount: entry.invoice_total_amount, internalInvoiceAmount: entry.internal_invoice_amount,
    exportInvoiceAmount: entry.export_invoice_amount, vatExemptSupplyAmount: entry.vat_exempt_supply_amount,
    taxableBaseRegistered: entry.taxable_base_registered, outputVatRegistered: entry.output_vat_registered,
    taxableBaseNonRegistered: entry.taxable_base_non_registered, outputVatNonRegistered: entry.output_vat_non_registered,
    outputVatField32: entry.output_vat_field_32, outputVatField33: entry.output_vat_field_33, outputVatField34: entry.output_vat_field_34,
  }));
  const kufErrors = useMemo(() => periodContext ? validateBookEntries({ book: "KUF", activeCompanyId, period: periodContext, partners: validationPartners, entries: toValidationEntries(purchases) }) : [], [activeCompanyId, periodContext, purchases, validationPartners]);
  const kifErrors = useMemo(() => periodContext ? validateBookEntries({ book: "KIF", activeCompanyId, period: periodContext, partners: validationPartners, entries: toValidationEntries(sales) }) : [], [activeCompanyId, periodContext, sales, validationPartners]);
  const validationStatus = useMemo(() => getPeriodValidationStatus(kufErrors, kifErrors), [kufErrors, kifErrors]);

  async function loadCompanies() {
    const { data, error } = await createSupabaseBrowserClient().from("companies").select("id, workspace_id, name, vat_number").eq("status", "active").order("name");
    if (error) return setMessage(error.message);
    const visibleCompanies = (data ?? []) as Company[];
    setCompanies(visibleCompanies);
    setActiveCompanyId((current) => current || visibleCompanies[0]?.id || "");
  }

  async function loadCompanyData(companyId: string) {
    const supabase = createSupabaseBrowserClient();
    const [periodResult, partnerResult] = await Promise.all([
      supabase.from("tax_periods").select("id, company_id, year, month, status").eq("company_id", companyId).order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("partners").select("id, name, address, vat_number, jib").eq("company_id", companyId).order("name"),
    ]);
    if (periodResult.error || partnerResult.error) return setMessage(periodResult.error?.message ?? partnerResult.error?.message ?? "Greška pri učitavanju.");
    const loadedPeriods = (periodResult.data ?? []) as Period[];
    setPeriods(loadedPeriods);
    setPartners((partnerResult.data ?? []) as Partner[]);
    setActivePeriodId((current) => loadedPeriods.some((period) => period.id === current) ? current : loadedPeriods[0]?.id || "");
  }

  async function loadEntries(periodId: string) {
    const common = "id, company_id, tax_period_id, partner_id, source_document_id, document_type, invoice_number, invoice_date, amount, is_archived";
    const purchaseSelect = `${common}, received_date, invoice_amount_excluding_vat, invoice_amount_with_vat, flat_rate_compensation, input_vat_amount, deductible_input_vat, non_deductible_input_vat, input_vat_field_32, input_vat_field_33, input_vat_field_34`;
    const salesSelect = `${common}, invoice_total_amount, internal_invoice_amount, export_invoice_amount, vat_exempt_supply_amount, taxable_base_registered, output_vat_registered, taxable_base_non_registered, output_vat_non_registered, output_vat_field_32, output_vat_field_33, output_vat_field_34`;
    const supabase = createSupabaseBrowserClient();
    const [purchaseResult, salesResult] = await Promise.all([
      supabase.from("purchase_entries").select(purchaseSelect).eq("tax_period_id", periodId).eq("is_archived", false).order("received_date", { ascending: false }),
      supabase.from("sales_entries").select(salesSelect).eq("tax_period_id", periodId).eq("is_archived", false).order("invoice_date", { ascending: false }),
    ]);
    if (purchaseResult.error || salesResult.error) return setMessage(purchaseResult.error?.message ?? salesResult.error?.message ?? "Greška pri učitavanju stavki.");
    setPurchases((purchaseResult.data ?? []) as Entry[]);
    setSales((salesResult.data ?? []) as Entry[]);
  }

  async function loadDocuments(companyId: string) {
    const { data, error } = await createSupabaseBrowserClient().from("invoice_documents").select("id, company_id, tax_period_id, uploaded_by, original_filename, mime_type, byte_size, sha256, status, suggested_ledger, linked_entry_id, created_at, updated_at").eq("company_id", companyId).order("created_at", { ascending: false });
    if (error) return setMessage(error.message);
    setDocuments((data ?? []) as InvoiceDocument[]);
  }

  async function loadExports(periodId: string) {
    const { data, error } = await createSupabaseBrowserClient().from("uino_exports").select("id, book_type, file_name, content_sha256, item_count, size_bytes, totals, generated_at").eq("tax_period_id", periodId).order("generated_at", { ascending: false });
    if (error) return setMessage(error.message);
    setExportArchives((data ?? []) as ExportArchive[]);
  }

  useEffect(() => {
    void createSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) void loadCompanies();
      setLoading(false);
    });
  }, []);
  useEffect(() => { if (activeCompanyId) { void loadCompanyData(activeCompanyId); void loadDocuments(activeCompanyId); } else setDocuments([]); }, [activeCompanyId]);
  useEffect(() => { if (activePeriodId) { void loadEntries(activePeriodId); void loadExports(activePeriodId); } else { setPurchases([]); setSales([]); setExportArchives([]); } }, [activePeriodId]);

  async function signIn(email: string, password: string) {
    setLoading(true);
    const { data, error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMessage(error.message);
    setUserEmail(data.user.email ?? email); setMessage(""); await loadCompanies();
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    setUserEmail(null); setCompanies([]); setActiveCompanyId(""); setMessage("");
  }

  async function createPeriod(year: number, month: number) {
    if (!activeCompany) return;
    const { error } = await createSupabaseBrowserClient().from("tax_periods").insert({ workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, year, month });
    if (error) return setMessage(error.message);
    setMessage(""); await loadCompanyData(activeCompany.id);
  }

  async function setPeriodStatus(status: Period["status"]) {
    if (!activePeriod || !activeCompany) return;
    if (status === "ready_for_export" && !validationStatus.readyForExport) return setMessage("Period ima blokirajuće greške.");
    const { error } = await createSupabaseBrowserClient().from("tax_periods").update({ status }).eq("id", activePeriod.id);
    if (error) return setMessage(error.message);
    setMessage(""); await loadCompanyData(activeCompany.id);
  }

  async function createPartner(partner: PartnerForm) {
    if (!activeCompany) return false;
    const vatNumber = partner.vatNumber.trim() || null;
    const jib = partner.jib.trim() || null;
    if (!isValidOrEmptyVatNumber(vatNumber) || !isValidOrEmptyJib(jib)) { setMessage("PDV broj mora biti prazan ili imati 12, a JIB prazan ili imati 13 cifara."); return false; }
    const { error } = await createSupabaseBrowserClient().from("partners").insert({ workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, name: partner.name.trim(), address: partner.address.trim(), vat_number: vatNumber, jib });
    if (error) { setMessage(error.message); return false; }
    setMessage(""); await loadCompanyData(activeCompany.id); return true;
  }

  async function saveEntry(table: BookTable, form: EntryForm, editingId: string | null) {
    if (!activeCompany || !activePeriod) { setMessage("Prvo odaberite porezni period."); return false; }
    if (!periodIsOpen) { setMessage("Period nije otvoren za izmjene."); return false; }
    const book = table === "purchase_entries" ? "KUF" : "KIF";
    const errors = validateEntryForm(book, form);
    if (errors.length) { setMessage(errors.join(" ")); return false; }
    const currentEntries = table === "purchase_entries" ? purchases : sales;
    if (currentEntries.some((entry) => entry.invoice_number.trim().toLowerCase() === form.invoiceNumber.trim().toLowerCase() && entry.id !== editingId)) { setMessage("Broj fakture već postoji u ovoj knjizi."); return false; }
    const periodDate = book === "KUF" ? form.receivedDate : form.invoiceDate;
    if (Number(periodDate.slice(0, 4)) !== activePeriod.year || Number(periodDate.slice(5, 7)) !== activePeriod.month) { setMessage(book === "KUF" ? "Datum prijema mora biti unutar aktivnog perioda." : "Datum fakture mora biti unutar aktivnog perioda."); return false; }
    const money = (value: string) => value === "" ? null : Number(value);
    const commonValues = { workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, tax_period_id: activePeriod.id, partner_id: form.partnerId, document_type: form.documentType, invoice_number: form.invoiceNumber.trim(), invoice_date: form.invoiceDate };
    const supabase = createSupabaseBrowserClient();
    let error: { message: string } | null;
    if (table === "purchase_entries") {
      const values = {
        ...commonValues, received_date: form.receivedDate, amount: money(form.invoiceAmountWithVat),
        invoice_amount_excluding_vat: money(form.invoiceAmountExcludingVat), invoice_amount_with_vat: money(form.invoiceAmountWithVat),
        flat_rate_compensation: money(form.flatRateCompensation), input_vat_amount: money(form.inputVatAmount),
        deductible_input_vat: money(form.deductibleInputVat), non_deductible_input_vat: money(form.nonDeductibleInputVat),
        input_vat_field_32: money(form.inputVatField32), input_vat_field_33: money(form.inputVatField33), input_vat_field_34: money(form.inputVatField34),
      };
      ({ error } = await (editingId ? supabase.from("purchase_entries").update(values).eq("id", editingId) : supabase.from("purchase_entries").insert(values)));
    } else {
      const values = {
        ...commonValues, amount: money(form.invoiceTotalAmount), invoice_total_amount: money(form.invoiceTotalAmount),
        internal_invoice_amount: money(form.internalInvoiceAmount), export_invoice_amount: money(form.exportInvoiceAmount),
        vat_exempt_supply_amount: money(form.vatExemptSupplyAmount), taxable_base_registered: money(form.taxableBaseRegistered),
        output_vat_registered: money(form.outputVatRegistered), taxable_base_non_registered: money(form.taxableBaseNonRegistered),
        output_vat_non_registered: money(form.outputVatNonRegistered), output_vat_field_32: money(form.outputVatField32),
        output_vat_field_33: money(form.outputVatField33), output_vat_field_34: money(form.outputVatField34),
      };
      ({ error } = await (editingId ? supabase.from("sales_entries").update(values).eq("id", editingId) : supabase.from("sales_entries").insert(values)));
    }
    if (error) { setMessage(error.message); return false; }
    setMessage(""); await loadEntries(activePeriod.id); return true;
  }

  async function mutateEntry(table: BookTable, id: string, action: "archive" | "delete") {
    if (!activePeriod || !periodIsOpen) return setMessage("Period nije otvoren za izmjene.");
    const query = action === "archive" ? createSupabaseBrowserClient().from(table).update({ is_archived: true }).eq("id", id) : createSupabaseBrowserClient().from(table).delete().eq("id", id);
    const { error } = await query;
    if (error) return setMessage(error.message);
    await loadEntries(activePeriod.id);
  }

  async function refreshAfterDocumentPosting(periodId: string) {
    if (activeCompany) await loadDocuments(activeCompany.id);
    if (periodId === activePeriodId) await loadEntries(periodId);
  }

  return { userEmail, loading, companies, activeCompanyId, setActiveCompanyId, activeCompany, periods, activePeriodId, setActivePeriodId, activePeriod, periodIsOpen, partners, purchases, sales, documents, refreshDocuments: loadDocuments, refreshAfterDocumentPosting, exportArchives, refreshExports: loadExports, kufErrors, kifErrors, validationStatus, message, setMessage, signIn, signOut, createPeriod, setPeriodStatus, createPartner, saveEntry, mutateEntry };
}
