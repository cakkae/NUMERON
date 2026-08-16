"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { validatePurchase } from "@/lib/kuf-validation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Company = { id: string; workspace_id: string; name: string; vat_number: string };
type Period = { id: string; year: number; month: number; status: "open" | "locked" };
type Partner = { id: string; name: string; address: string; vat_number: string; jib: string };
type Purchase = { id: string; invoice_number: string; invoice_date: string; amount: number; partner_id: string; is_archived: boolean };

const emptyPartner = { name: "", address: "", vatNumber: "", jib: "" };
const emptyPurchase = { partnerId: "", invoiceNumber: "", invoiceDate: "", amount: "" };

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [activePeriodId, setActivePeriodId] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [partner, setPartner] = useState(emptyPartner);
  const [purchase, setPurchase] = useState(emptyPurchase);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const activeCompany = companies.find((company) => company.id === activeCompanyId);
  const activePeriod = periods.find((period) => period.id === activePeriodId);
  const periodIsOpen = activePeriod?.status === "open";

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
      supabase.from("tax_periods").select("id, year, month, status").eq("company_id", companyId).order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("partners").select("id, name, address, vat_number, jib").eq("company_id", companyId).order("name"),
    ]);
    if (periodResult.error || partnerResult.error) return setMessage(periodResult.error?.message ?? partnerResult.error?.message ?? "Greška pri učitavanju.");
    const loadedPeriods = (periodResult.data ?? []) as Period[];
    setPeriods(loadedPeriods);
    setPartners((partnerResult.data ?? []) as Partner[]);
    setActivePeriodId((current) => loadedPeriods.some((period) => period.id === current) ? current : loadedPeriods[0]?.id || "");
  }

  async function loadPurchases(periodId: string) {
    const { data, error } = await createSupabaseBrowserClient().from("purchase_entries").select("id, invoice_number, invoice_date, amount, partner_id, is_archived").eq("tax_period_id", periodId).eq("is_archived", false).order("invoice_date", { ascending: false });
    if (error) return setMessage(error.message);
    setPurchases((data ?? []) as Purchase[]);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void loadCompanies(); });
  }, []);
  useEffect(() => { if (activeCompanyId) void loadCompanyData(activeCompanyId); }, [activeCompanyId]);
  useEffect(() => { if (activePeriodId) void loadPurchases(activePeriodId); else setPurchases([]); }, [activePeriodId]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (error) return setMessage(error.message);
    setMessage("");
    await loadCompanies();
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCompany) return;
    const values = new FormData(event.currentTarget);
    const { error } = await createSupabaseBrowserClient().from("tax_periods").insert({ workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, year: Number(values.get("year")), month: Number(values.get("month")) });
    if (error) return setMessage(error.message);
    setMessage("");
    event.currentTarget.reset();
    await loadCompanyData(activeCompany.id);
  }

  async function togglePeriod() {
    if (!activePeriod || !activeCompany) return;
    const status = activePeriod.status === "open" ? "locked" : "open";
    const { error } = await createSupabaseBrowserClient().from("tax_periods").update({ status }).eq("id", activePeriod.id);
    if (error) return setMessage(error.message);
    await loadCompanyData(activeCompany.id);
  }

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCompany) return;
    if (!/^\d{12}$/.test(partner.vatNumber) || !/^\d{13}$/.test(partner.jib)) return setMessage("PDV broj mora imati 12, a JIB 13 cifara.");
    const { error } = await createSupabaseBrowserClient().from("partners").insert({ workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, name: partner.name, address: partner.address, vat_number: partner.vatNumber, jib: partner.jib });
    if (error) return setMessage(error.message);
    setPartner(emptyPartner); setMessage(""); await loadCompanyData(activeCompany.id);
  }

  async function savePurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCompany || !activePeriod) return setMessage("Prvo odaberite porezni period.");
    if (!periodIsOpen) return setMessage("Zaključan period se ne može mijenjati.");
    const errors = validatePurchase(purchase);
    if (errors.length) return setMessage(errors.join(" "));
    const duplicate = purchases.some((entry) => entry.invoice_number.trim().toLowerCase() === purchase.invoiceNumber.trim().toLowerCase() && entry.id !== editingPurchaseId);
    if (duplicate) return setMessage("Broj fakture već postoji u ovoj firmi.");
    const values = { workspace_id: activeCompany.workspace_id, company_id: activeCompany.id, tax_period_id: activePeriod.id, partner_id: purchase.partnerId, invoice_number: purchase.invoiceNumber.trim(), invoice_date: purchase.invoiceDate, amount: Number(purchase.amount) };
    const query = editingPurchaseId ? createSupabaseBrowserClient().from("purchase_entries").update(values).eq("id", editingPurchaseId) : createSupabaseBrowserClient().from("purchase_entries").insert(values);
    const { error } = await query;
    if (error) return setMessage(error.message);
    setPurchase(emptyPurchase); setPartnerSearch(""); setEditingPurchaseId(null); setMessage(""); await loadPurchases(activePeriod.id);
  }

  async function archivePurchase(id: string) {
    if (!activePeriod || !periodIsOpen) return setMessage("Zaključan period se ne može mijenjati.");
    const { error } = await createSupabaseBrowserClient().from("purchase_entries").update({ is_archived: true }).eq("id", id);
    if (error) return setMessage(error.message);
    await loadPurchases(activePeriod.id);
  }

  async function deletePurchase(id: string) {
    if (!activePeriod || !periodIsOpen) return setMessage("Zaključan period se ne može mijenjati.");
    const { error } = await createSupabaseBrowserClient().from("purchase_entries").delete().eq("id", id);
    if (error) return setMessage(error.message);
    await loadPurchases(activePeriod.id);
  }

  const visiblePurchases = useMemo(() => purchases.filter((entry) => `${entry.invoice_number} ${partners.find((partnerItem) => partnerItem.id === entry.partner_id)?.name ?? ""}`.toLowerCase().includes(search.toLowerCase())), [purchases, partners, search]);

  if (!activeCompany) return <main className="card"><h1>NUMERON</h1><p>Prijavite se za pristup dodijeljenim firmama.</p><form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Lozinka<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button type="submit">Prijava</button>{message && <p role="alert">{message}</p>}</form></main>;

  return <main className="card wide"><header><div><h1>{activeCompany.name}</h1><p>PDV: {activeCompany.vat_number}</p></div><label>Aktivna firma<select value={activeCompanyId} onChange={(event) => setActiveCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label></header><section className="controls"><form onSubmit={createPeriod}><h2>Porezni period</h2><input name="year" type="number" min="2000" max="2100" placeholder="Godina" required /><input name="month" type="number" min="1" max="12" placeholder="Mjesec" required /><button>Otvori period</button></form><label>Aktivni period<select value={activePeriodId} onChange={(event) => setActivePeriodId(event.target.value)}><option value="">Odaberite period</option>{periods.map((period) => <option key={period.id} value={period.id}>{String(period.month).padStart(2, "0")}/{period.year} — {period.status === "open" ? "otvoren" : "zaključan"}</option>)}</select></label>{activePeriod && <button type="button" onClick={togglePeriod}>{periodIsOpen ? "Zaključaj period" : "Otvori period"}</button>}</section><section className="controls"><form onSubmit={createPartner}><h2>Novi partner</h2><input placeholder="Naziv" value={partner.name} onChange={(event) => setPartner({ ...partner, name: event.target.value })} required /><input placeholder="Adresa" value={partner.address} onChange={(event) => setPartner({ ...partner, address: event.target.value })} required /><input placeholder="PDV broj (12 cifara)" value={partner.vatNumber} onChange={(event) => setPartner({ ...partner, vatNumber: event.target.value })} required /><input placeholder="JIB (13 cifara)" value={partner.jib} onChange={(event) => setPartner({ ...partner, jib: event.target.value })} required /><button>Spremi partnera</button></form></section><section><h2>KUF</h2><form className="purchase-form" onSubmit={savePurchase}><input list="partners" placeholder="Pretražite partnera" value={partnerSearch} onChange={(event) => { const value = event.target.value; setPartnerSearch(value); setPurchase({ ...purchase, partnerId: partners.find((partnerItem) => partnerItem.name === value)?.id ?? "" }); }} required /><datalist id="partners">{partners.map((partnerItem) => <option key={partnerItem.id} value={partnerItem.name}>{partnerItem.vat_number}</option>)}</datalist><input placeholder="Broj fakture" value={purchase.invoiceNumber} onChange={(event) => setPurchase({ ...purchase, invoiceNumber: event.target.value })} required /><input type="date" value={purchase.invoiceDate} onChange={(event) => setPurchase({ ...purchase, invoiceDate: event.target.value })} required /><input type="number" step="0.01" min="0" placeholder="Iznos" value={purchase.amount} onChange={(event) => setPurchase({ ...purchase, amount: event.target.value })} required /><button disabled={!periodIsOpen}>{editingPurchaseId ? "Sačuvaj izmjenu" : "Dodaj KUF stavku"}</button></form><input className="search" placeholder="Pretraga fakture ili partnera" value={search} onChange={(event) => setSearch(event.target.value)} /><table><thead><tr><th>Datum</th><th>Faktura</th><th>Partner</th><th>Iznos</th><th>Akcije</th></tr></thead><tbody>{visiblePurchases.map((entry) => <tr key={entry.id}><td>{entry.invoice_date}</td><td>{entry.invoice_number}</td><td>{partners.find((partnerItem) => partnerItem.id === entry.partner_id)?.name}</td><td>{Number(entry.amount).toFixed(2)}</td><td><button type="button" disabled={!periodIsOpen} onClick={() => { setEditingPurchaseId(entry.id); setPartnerSearch(partners.find((partnerItem) => partnerItem.id === entry.partner_id)?.name ?? ""); setPurchase({ partnerId: entry.partner_id, invoiceNumber: entry.invoice_number, invoiceDate: entry.invoice_date, amount: String(entry.amount) }); }}>Izmijeni</button><button type="button" disabled={!periodIsOpen} onClick={() => archivePurchase(entry.id)}>Arhiviraj</button><button type="button" disabled={!periodIsOpen} onClick={() => deletePurchase(entry.id)}>Obriši</button></td></tr>)}</tbody></table></section>{message && <p role="alert">{message}</p>}</main>;
}
