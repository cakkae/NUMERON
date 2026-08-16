"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/document-types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getPeriodValidationStatus, isValidJib, isValidVatNumber, validateBasicEntry, validateBookEntries } from "@/lib/validation-engine";

type Company = { id: string; workspace_id: string; name: string; vat_number: string };
type Period = { id: string; company_id: string; year: number; month: number; status: "open" | "locked" | "ready_for_export" };
type Partner = { id: string; name: string; address: string; vat_number: string; jib: string };
type Entry = { id: string; company_id: string; tax_period_id: string; partner_id: string; document_type: string; invoice_number: string; invoice_date: string; amount: number; is_archived: boolean };
type EntryForm = { partnerId: string; documentType: DocumentType; invoiceNumber: string; invoiceDate: string; amount: string };
type BookTable = "purchase_entries" | "sales_entries";

const emptyPartner = { name: "", address: "", vatNumber: "", jib: "" };
const emptyEntry = (): EntryForm => ({ partnerId: "", documentType: "01", invoiceNumber: "", invoiceDate: "", amount: "" });

function EntryBook(props: {
  title: "KUF" | "KIF";
  entries: Entry[];
  partners: Partner[];
  form: EntryForm;
  setForm: (form: EntryForm) => void;
  partnerSearch: string;
  setPartnerSearch: (value: string) => void;
  editingId: string | null;
  periodIsOpen: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (entry: Entry) => void;
}) {
  const [search, setSearch] = useState("");
  const visibleEntries = useMemo(() => props.entries.filter((entry) => `${entry.invoice_number} ${entry.document_type} ${props.partners.find((partner) => partner.id === entry.partner_id)?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [props.entries, props.partners, search]);
  const dataListId = `${props.title.toLowerCase()}-partners`;

  return <section><h2>{props.title}</h2><form className="purchase-form" onSubmit={props.onSave}><input list={dataListId} placeholder="Pretražite partnera" value={props.partnerSearch} onChange={(event) => { const value = event.target.value; props.setPartnerSearch(value); props.setForm({ ...props.form, partnerId: props.partners.find((partner) => partner.name === value)?.id ?? "" }); }} required /><datalist id={dataListId}>{props.partners.map((partner) => <option key={partner.id} value={partner.name}>{partner.vat_number}</option>)}</datalist><select aria-label="Tip dokumenta" value={props.form.documentType} onChange={(event) => props.setForm({ ...props.form, documentType: event.target.value as DocumentType })}>{DOCUMENT_TYPES.map((type) => <option key={type} value={type}>Tip {type}</option>)}</select><input placeholder="Broj fakture" value={props.form.invoiceNumber} onChange={(event) => props.setForm({ ...props.form, invoiceNumber: event.target.value })} required /><input type="date" value={props.form.invoiceDate} onChange={(event) => props.setForm({ ...props.form, invoiceDate: event.target.value })} required /><input type="number" step="0.01" min="0" placeholder="Iznos" value={props.form.amount} onChange={(event) => props.setForm({ ...props.form, amount: event.target.value })} required /><button disabled={!props.periodIsOpen}>{props.editingId ? "Sačuvaj izmjenu" : `Dodaj ${props.title} stavku`}</button></form><input className="search" placeholder={`Pretraga ${props.title} stavki`} value={search} onChange={(event) => setSearch(event.target.value)} /><table><thead><tr><th>Datum</th><th>Tip</th><th>Faktura</th><th>Partner</th><th>Iznos</th><th>Akcije</th></tr></thead><tbody>{visibleEntries.map((entry) => <tr id={`${props.title.toLowerCase()}-${entry.id}`} key={entry.id}><td>{entry.invoice_date}</td><td>{entry.document_type}</td><td>{entry.invoice_number}</td><td>{props.partners.find((partner) => partner.id === entry.partner_id)?.name}</td><td>{Number(entry.amount).toFixed(2)}</td><td><button type="button" disabled={!props.periodIsOpen} onClick={() => props.onEdit(entry)}>Izmijeni</button><button type="button" disabled={!props.periodIsOpen} onClick={() => props.onArchive(entry.id)}>Arhiviraj</button><button type="button" disabled={!props.periodIsOpen} onClick={() => props.onDelete(entry.id)}>Obriši</button></td></tr>)}</tbody></table></section>;
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [purchases, setPurchases] = useState<Entry[]>([]);
  const [sales, setSales] = useState<Entry[]>([]);
  const [partner, setPartner] = useState(emptyPartner);
  const [purchaseForm, setPurchaseForm] = useState(emptyEntry);
  const [salesForm, setSalesForm] = useState(emptyEntry);
  const [purchasePartnerSearch, setPurchasePartnerSearch] = useState("");
  const [salesPartnerSearch, setSalesPartnerSearch] = useState("");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editingSalesId, setEditingSalesId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const activeCompany = companies.find((company) => company.id === activeCompanyId);
  const activePeriod = periods.find((period) => period.id === activePeriodId);
  const periodIsOpen = activePeriod?.status === "open";
  const validationPartners = useMemo(() => partners.map((item) => ({ id: item.id, vatNumber: item.vat_number, jib: item.jib })), [partners]);
  const periodContext = activePeriod && activeCompany ? { id: activePeriod.id, companyId: activeCompany.id, year: activePeriod.year, month: activePeriod.month } : null;
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

  useEffect(() => { void createSupabaseBrowserClient().auth.getUser().then(({ data }) => { if (data.user) void loadCompanies(); }); }, []);
  useEffect(() => { if (activeCompanyId) void loadCompanyData(activeCompanyId); }, [activeCompanyId]);
  useEffect(() => { if (activePeriodId) void loadEntries(activePeriodId); else { setPurchases([]); setSales([]); } }, [activePeriodId]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (error) return setMessage(error.message);
    setMessage(""); await loadCompanies();
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeCompany) return;
    const values = new FormData(event.currentTarget);
    const { error } = await createSupabaseBrowserClient().from("tax_periods").insert({ workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, year: Number(values.get("year")), month: Number(values.get("month")) });
    if (error) return setMessage(error.message);
    event.currentTarget.reset(); setMessage(""); await loadCompanyData(activeCompany.id);
  }

  async function setPeriodStatus(status: Period["status"]) {
    if (!activePeriod || !activeCompany) return;
    if (status === "ready_for_export" && !validationStatus.readyForExport) return setMessage("Period ima blokirajuće greške.");
    const { error } = await createSupabaseBrowserClient().from("tax_periods").update({ status }).eq("id", activePeriod.id);
    if (error) return setMessage(error.message);
    setMessage(""); await loadCompanyData(activeCompany.id);
  }

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeCompany) return;
    if (!isValidVatNumber(partner.vatNumber) || !isValidJib(partner.jib)) return setMessage("PDV broj mora imati 12, a JIB 13 cifara.");
    const { error } = await createSupabaseBrowserClient().from("partners").insert({ workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, name: partner.name, address: partner.address, vat_number: partner.vatNumber, jib: partner.jib });
    if (error) return setMessage(error.message);
    setPartner(emptyPartner); setMessage(""); await loadCompanyData(activeCompany.id);
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>, table: BookTable, form: EntryForm, editingId: string | null) {
    event.preventDefault();
    if (!activeCompany || !activePeriod) return setMessage("Prvo odaberite porezni period.");
    if (!periodIsOpen) return setMessage("Period nije otvoren za izmjene.");
    const errors = validateBasicEntry(form);
    if (errors.length) return setMessage(errors.join(" "));
    const currentEntries = table === "purchase_entries" ? purchases : sales;
    if (currentEntries.some((entry) => entry.invoice_number.trim().toLowerCase() === form.invoiceNumber.trim().toLowerCase() && entry.id !== editingId)) return setMessage("Broj fakture već postoji u ovoj knjizi.");
    if (Number(form.invoiceDate.slice(0, 4)) !== activePeriod.year || Number(form.invoiceDate.slice(5, 7)) !== activePeriod.month) return setMessage("Datum fakture mora biti unutar aktivnog perioda.");
    const values = { workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, tax_period_id: activePeriod.id, partner_id: form.partnerId, document_type: form.documentType, invoice_number: form.invoiceNumber.trim(), invoice_date: form.invoiceDate, amount: Number(form.amount) };
    const query = editingId ? createSupabaseBrowserClient().from(table).update(values).eq("id", editingId) : createSupabaseBrowserClient().from(table).insert(values);
    const { error } = await query;
    if (error) return setMessage(error.message);
    if (table === "purchase_entries") { setPurchaseForm(emptyEntry()); setPurchasePartnerSearch(""); setEditingPurchaseId(null); }
    else { setSalesForm(emptyEntry()); setSalesPartnerSearch(""); setEditingSalesId(null); }
    setMessage(""); await loadEntries(activePeriod.id);
  }

  async function mutateEntry(table: BookTable, id: string, action: "archive" | "delete") {
    if (!activePeriod || !periodIsOpen) return setMessage("Period nije otvoren za izmjene.");
    const query = action === "archive" ? createSupabaseBrowserClient().from(table).update({ is_archived: true }).eq("id", id) : createSupabaseBrowserClient().from(table).delete().eq("id", id);
    const { error } = await query;
    if (error) return setMessage(error.message);
    await loadEntries(activePeriod.id);
  }

  function editEntry(entry: Entry, book: "KUF" | "KIF") {
    const form = { partnerId: entry.partner_id, documentType: entry.document_type as DocumentType, invoiceNumber: entry.invoice_number, invoiceDate: entry.invoice_date, amount: String(entry.amount) };
    const partnerName = partners.find((item) => item.id === entry.partner_id)?.name ?? "";
    if (book === "KUF") { setEditingPurchaseId(entry.id); setPurchaseForm(form); setPurchasePartnerSearch(partnerName); }
    else { setEditingSalesId(entry.id); setSalesForm(form); setSalesPartnerSearch(partnerName); }
  }

  if (!activeCompany) return <main className="card"><h1>NUMERON</h1><p>Prijavite se za pristup dodijeljenim firmama.</p><form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Lozinka<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button type="submit">Prijava</button>{message && <p role="alert">{message}</p>}</form></main>;

  return <main className="card wide"><header><div><h1>{activeCompany.name}</h1><p>PDV: {activeCompany.vat_number}</p></div><label>Aktivna firma<select value={activeCompanyId} onChange={(event) => setActiveCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label></header><section className="controls"><form onSubmit={createPeriod}><h2>Porezni period</h2><input name="year" type="number" min="2000" max="2100" placeholder="Godina" required /><input name="month" type="number" min="1" max="12" placeholder="Mjesec" required /><button>Otvori period</button></form><label>Aktivni period<select value={activePeriodId} onChange={(event) => setActivePeriodId(event.target.value)}><option value="">Odaberite period</option>{periods.map((period) => <option key={period.id} value={period.id}>{String(period.month).padStart(2, "0")}/{period.year} — {period.status}</option>)}</select></label>{activePeriod && <div className="button-row">{periodIsOpen ? <button type="button" onClick={() => setPeriodStatus("locked")}>Zaključaj period</button> : <button type="button" onClick={() => setPeriodStatus("open")}>Ponovo otvori</button>}<button type="button" disabled={!validationStatus.readyForExport || !periodIsOpen} onClick={() => setPeriodStatus("ready_for_export")}>Spremno za export</button></div>}</section><section className="dashboard"><h2>Status perioda</h2><div><strong>{purchases.length}</strong><span>KUF stavki</span></div><div><strong>{sales.length}</strong><span>KIF stavki</span></div><div><strong>{validationStatus.errorCount}</strong><span>grešaka</span></div><div><strong>{activePeriod?.status === "ready_for_export" ? "DA" : "NE"}</strong><span>spremno za export</span></div>{validationStatus.errors.length > 0 && <ul>{validationStatus.errors.slice(0, 8).map((error, index) => <li key={`${error.book}-${error.entryId}-${error.code}-${index}`}>{error.entryId ? <a href={`#${error.book.toLowerCase()}-${error.entryId}`}>{error.book}: {error.message}</a> : `${error.book}: ${error.message}`}</li>)}</ul>}</section><section className="controls"><form onSubmit={createPartner}><h2>Novi partner</h2><input placeholder="Naziv" value={partner.name} onChange={(event) => setPartner({ ...partner, name: event.target.value })} required /><input placeholder="Adresa" value={partner.address} onChange={(event) => setPartner({ ...partner, address: event.target.value })} required /><input placeholder="PDV broj (12 cifara)" value={partner.vatNumber} onChange={(event) => setPartner({ ...partner, vatNumber: event.target.value })} required /><input placeholder="JIB (13 cifara)" value={partner.jib} onChange={(event) => setPartner({ ...partner, jib: event.target.value })} required /><button>Spremi partnera</button></form></section><EntryBook title="KUF" entries={purchases} partners={partners} form={purchaseForm} setForm={setPurchaseForm} partnerSearch={purchasePartnerSearch} setPartnerSearch={setPurchasePartnerSearch} editingId={editingPurchaseId} periodIsOpen={periodIsOpen} onSave={(event) => void saveEntry(event, "purchase_entries", purchaseForm, editingPurchaseId)} onArchive={(id) => void mutateEntry("purchase_entries", id, "archive")} onDelete={(id) => void mutateEntry("purchase_entries", id, "delete")} onEdit={(entry) => editEntry(entry, "KUF")} /><EntryBook title="KIF" entries={sales} partners={partners} form={salesForm} setForm={setSalesForm} partnerSearch={salesPartnerSearch} setPartnerSearch={setSalesPartnerSearch} editingId={editingSalesId} periodIsOpen={periodIsOpen} onSave={(event) => void saveEntry(event, "sales_entries", salesForm, editingSalesId)} onArchive={(id) => void mutateEntry("sales_entries", id, "archive")} onDelete={(id) => void mutateEntry("sales_entries", id, "delete")} onEdit={(entry) => editEntry(entry, "KIF")} />{message && <p role="alert">{message}</p>}</main>;
}
