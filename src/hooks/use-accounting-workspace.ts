"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getPeriodValidationStatus, isValidJib, isValidVatNumber, validateBasicEntry, validateBookEntries } from "@/lib/validation-engine";
import type { BookTable, Company, Entry, EntryForm, Partner, PartnerForm, Period } from "@/types/accounting";

export function useAccountingWorkspace() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [purchases, setPurchases] = useState<Entry[]>([]);
  const [sales, setSales] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const activeCompany = companies.find((company) => company.id === activeCompanyId);
  const activePeriod = periods.find((period) => period.id === activePeriodId);
  const periodIsOpen = activePeriod?.status === "open";
  const validationPartners = useMemo(() => partners.map((item) => ({ id: item.id, vatNumber: item.vat_number, jib: item.jib })), [partners]);
  const periodContext = useMemo(() => activePeriod && activeCompany ? { id: activePeriod.id, companyId: activeCompany.id, year: activePeriod.year, month: activePeriod.month } : null, [activeCompany, activePeriod]);
  const toValidationEntries = (entries: Entry[]) => entries.map((entry) => ({ id: entry.id, companyId: entry.company_id, taxPeriodId: entry.tax_period_id, partnerId: entry.partner_id, documentType: entry.document_type, invoiceNumber: entry.invoice_number, invoiceDate: entry.invoice_date, amount: entry.amount }));
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
    const select = "id, company_id, tax_period_id, partner_id, document_type, invoice_number, invoice_date, amount, is_archived";
    const supabase = createSupabaseBrowserClient();
    const [purchaseResult, salesResult] = await Promise.all([
      supabase.from("purchase_entries").select(select).eq("tax_period_id", periodId).eq("is_archived", false).order("invoice_date", { ascending: false }),
      supabase.from("sales_entries").select(select).eq("tax_period_id", periodId).eq("is_archived", false).order("invoice_date", { ascending: false }),
    ]);
    if (purchaseResult.error || salesResult.error) return setMessage(purchaseResult.error?.message ?? salesResult.error?.message ?? "Greška pri učitavanju stavki.");
    setPurchases((purchaseResult.data ?? []) as Entry[]);
    setSales((salesResult.data ?? []) as Entry[]);
  }

  useEffect(() => {
    void createSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) void loadCompanies();
      setLoading(false);
    });
  }, []);
  useEffect(() => { if (activeCompanyId) void loadCompanyData(activeCompanyId); }, [activeCompanyId]);
  useEffect(() => { if (activePeriodId) void loadEntries(activePeriodId); else { setPurchases([]); setSales([]); } }, [activePeriodId]);

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
    if (!isValidVatNumber(partner.vatNumber) || !isValidJib(partner.jib)) { setMessage("PDV broj mora imati 12, a JIB 13 cifara."); return false; }
    const { error } = await createSupabaseBrowserClient().from("partners").insert({ workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, name: partner.name, address: partner.address, vat_number: partner.vatNumber, jib: partner.jib });
    if (error) { setMessage(error.message); return false; }
    setMessage(""); await loadCompanyData(activeCompany.id); return true;
  }

  async function saveEntry(table: BookTable, form: EntryForm, editingId: string | null) {
    if (!activeCompany || !activePeriod) { setMessage("Prvo odaberite porezni period."); return false; }
    if (!periodIsOpen) { setMessage("Period nije otvoren za izmjene."); return false; }
    const errors = validateBasicEntry(form);
    if (errors.length) { setMessage(errors.join(" ")); return false; }
    const currentEntries = table === "purchase_entries" ? purchases : sales;
    if (currentEntries.some((entry) => entry.invoice_number.trim().toLowerCase() === form.invoiceNumber.trim().toLowerCase() && entry.id !== editingId)) { setMessage("Broj fakture već postoji u ovoj knjizi."); return false; }
    if (Number(form.invoiceDate.slice(0, 4)) !== activePeriod.year || Number(form.invoiceDate.slice(5, 7)) !== activePeriod.month) { setMessage("Datum fakture mora biti unutar aktivnog perioda."); return false; }
    const values = { workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, tax_period_id: activePeriod.id, partner_id: form.partnerId, document_type: form.documentType, invoice_number: form.invoiceNumber.trim(), invoice_date: form.invoiceDate, amount: Number(form.amount) };
    const query = editingId ? createSupabaseBrowserClient().from(table).update(values).eq("id", editingId) : createSupabaseBrowserClient().from(table).insert(values);
    const { error } = await query;
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

  return { userEmail, loading, companies, activeCompanyId, setActiveCompanyId, activeCompany, periods, activePeriodId, setActivePeriodId, activePeriod, periodIsOpen, partners, purchases, sales, kufErrors, kifErrors, validationStatus, message, setMessage, signIn, signOut, createPeriod, setPeriodStatus, createPartner, saveEntry, mutateEntry };
}
