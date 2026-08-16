"use client";

import { FormEvent, useMemo, useState } from "react";
import { FileImage, FileText, Filter, Search, Upload, X } from "lucide-react";
import { EntryDrawer } from "@/components/entry-drawer";
import { ConfirmDialog, StatusBadge } from "@/components/ui/primitives";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { validateInvoiceDocumentFile } from "@/modules/invoice-documents/file-validation";
import { validateDocumentConfirmation, type ReviewLedger } from "@/modules/invoice-documents/workflow";
import { emptyEntry, type Company, type Entry, type EntryForm, type InvoiceDocument, type Partner, type Period } from "@/types/accounting";

const statusLabels: Record<InvoiceDocument["status"], string> = { uploaded: "Uploadovan", reviewing: "U pregledu", confirmed: "Potvrđen", rejected: "Odbačen" };
const statusTones: Record<InvoiceDocument["status"], "neutral" | "reviewing" | "success" | "error"> = { uploaded: "neutral", reviewing: "reviewing", confirmed: "success", rejected: "error" };

async function authorizedFetch(url: string, init?: RequestInit) {
  const session = await createSupabaseBrowserClient().auth.getSession();
  const token = session.data.session?.access_token;
  if (!token) throw new Error("Prijava je obavezna.");
  const response = await fetch(url, { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Zahtjev nije uspio.");
  return body;
}

function formatBytes(value: number) {
  return value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function periodLabel(periods: Period[], id: string | null) {
  const period = periods.find((item) => item.id === id);
  return period ? `${String(period.month).padStart(2, "0")}/${period.year}` : "—";
}

export function DocumentsView(props: {
  company: Company; periods: Period[]; activePeriodId: string; partners: Partner[]; purchases: Entry[]; sales: Entry[];
  documents: InvoiceDocument[]; onRefresh: () => Promise<void>; onPosted: (periodId: string) => Promise<void>; onMessage: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPeriod, setUploadPeriod] = useState("");
  const [uploadState, setUploadState] = useState<"idle" | "validating" | "uploading">("idle");
  const [localError, setLocalError] = useState("");
  const [selected, setSelected] = useState<InvoiceDocument | null>(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [ledger, setLedger] = useState<ReviewLedger | null>(null);
  const [reviewPeriod, setReviewPeriod] = useState("");
  const [posting, setPosting] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryForm>(emptyEntry());
  const [partnerSearch, setPartnerSearch] = useState("");

  const linked = useMemo(() => new Map<string | undefined | null, string>([
    ...props.purchases.map((entry) => [entry.source_document_id, `KUF ${entry.invoice_number}`] as const),
    ...props.sales.map((entry) => [entry.source_document_id, `KIF ${entry.invoice_number}`] as const),
  ]), [props.purchases, props.sales]);
  const visible = props.documents.filter((document) => document.original_filename.toLocaleLowerCase("bs").includes(search.toLocaleLowerCase("bs"))
    && (status === "all" || document.status === status)
    && (periodFilter === "all" || (periodFilter === "none" ? !document.tax_period_id : document.tax_period_id === periodFilter)));

  async function openPreview(document: InvoiceDocument) {
    setSelected(document); setLedger(document.suggested_ledger); setReviewPeriod(document.tax_period_id ?? props.activePeriodId); setSignedUrl(""); setLocalError(""); setPreviewLoading(true);
    try {
      const result = await authorizedFetch(`/api/documents/${document.id}/signed-url`);
      setSignedUrl(String(result.signedUrl));
      if (document.status === "uploaded") {
        await authorizedFetch(`/api/documents/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review" }) });
        await props.onRefresh();
      }
    } catch (error) { setLocalError(error instanceof Error ? error.message : "Pregled nije dostupan."); }
    finally { setPreviewLoading(false); }
  }

  async function uploadDocument(event: FormEvent) {
    event.preventDefault(); setLocalError("");
    if (!uploadFile) return setLocalError("Odaberite fajl.");
    try {
      setUploadState("validating");
      validateInvoiceDocumentFile({ filename: uploadFile.name, declaredMime: uploadFile.type, bytes: new Uint8Array(await uploadFile.arrayBuffer()) });
      setUploadState("uploading");
      const form = new FormData(); form.set("companyId", props.company.id); form.set("file", uploadFile); if (uploadPeriod) form.set("taxPeriodId", uploadPeriod);
      const result = await authorizedFetch("/api/documents", { method: "POST", body: form });
      await props.onRefresh(); setUploadOpen(false); setUploadFile(null); setUploadPeriod("");
      await openPreview(result.document as InvoiceDocument);
    } catch (error) { setLocalError(error instanceof Error ? error.message : "Upload nije uspio."); }
    finally { setUploadState("idle"); }
  }

  async function rejectDocument() {
    if (!selected) return;
    try {
      await authorizedFetch(`/api/documents/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject", periodId: reviewPeriod || null }) });
      setConfirmReject(false); setSelected(null); setSignedUrl(""); await props.onRefresh();
    } catch (error) { setLocalError(error instanceof Error ? error.message : "Odbacivanje nije uspjelo."); }
  }

  async function beginPosting() {
    if (!selected) return;
    const period = props.periods.find((item) => item.id === reviewPeriod) ?? null;
    const errors = validateDocumentConfirmation({ document: { companyId: selected.company_id, status: selected.status, linkedEntryId: selected.linked_entry_id }, activeCompanyId: props.company.id, period: period ? { id: period.id, companyId: period.company_id, status: period.status } : null, ledger });
    if (errors.length) return setLocalError(errors.join(" "));
    try {
      await authorizedFetch(`/api/documents/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review", ledger, periodId: reviewPeriod }) });
      setEntryForm(emptyEntry()); setPartnerSearch(""); setPosting(true); setLocalError("");
    } catch (error) { setLocalError(error instanceof Error ? error.message : "Pregled nije moguće nastaviti."); }
  }

  async function confirmPosting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !ledger) return;
    try {
      await authorizedFetch(`/api/documents/${selected.id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ companyId: props.company.id, periodId: reviewPeriod, ledger, form: entryForm }) });
      setPosting(false); setSelected(null); setSignedUrl(""); await props.onPosted(reviewPeriod); props.onMessage("");
    } catch (error) { props.onMessage(error instanceof Error ? error.message : "Knjiženje nije uspjelo."); }
  }

  return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">Ulazna dokumentacija</span><h1>Dokumenti</h1><p>Privatni red za ručni pregled i kontrolisano knjiženje.</p></div><button className="button primary" onClick={() => { setUploadOpen(true); setLocalError(""); }}><Upload size={17} /> Upload dokumenta</button></div>
    <section className="panel table-panel"><div className="table-toolbar"><label className="search-field"><Search size={17} /><input aria-label="Pretraga dokumenata" placeholder="Pretraži naziv dokumenta…" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="filter-field"><Filter size={15} /><select aria-label="Status dokumenta" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">Svi statusi</option><option value="uploaded">Uploadovan</option><option value="reviewing">U pregledu</option><option value="confirmed">Potvrđen</option><option value="rejected">Odbačen</option></select></label><label className="filter-field"><select aria-label="Period dokumenta" value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value)}><option value="all">Svi periodi</option><option value="none">Bez perioda</option>{props.periods.map((period) => <option key={period.id} value={period.id}>{periodLabel(props.periods, period.id)}</option>)}</select></label><span className="toolbar-count">{visible.length} dok.</span></div><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Dokument</th><th>Tip / veličina</th><th>Datum</th><th>Status</th><th>Firma</th><th>Period</th><th>Povezano knjiženje</th></tr></thead><tbody>{visible.map((document) => <tr key={document.id} className="document-row" onClick={() => void openPreview(document)}><td><div className="document-file">{document.mime_type === "application/pdf" ? <FileText size={18} /> : <FileImage size={18} />}<strong>{document.original_filename}</strong></div></td><td>{document.mime_type.replace("application/", "").replace("image/", "").toUpperCase()} · {formatBytes(document.byte_size)}</td><td>{new Intl.DateTimeFormat("bs-BA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(document.created_at))}</td><td><StatusBadge tone={statusTones[document.status]}>{statusLabels[document.status]}</StatusBadge></td><td>{props.company.name}</td><td>{periodLabel(props.periods, document.tax_period_id)}</td><td>{linked.get(document.id) ?? (document.linked_entry_id ? `${document.suggested_ledger?.toUpperCase()} stavka` : "—")}</td></tr>)}{visible.length === 0 && <tr><td colSpan={7}><div className="empty-table"><FileText size={32} /><strong>Nema dokumenata</strong><p>Uploadujte PDF ili fotografiju fakture za ručni pregled.</p></div></td></tr>}</tbody></table></div></section>

    {uploadOpen && <div className="drawer-layer"><button className="drawer-backdrop" aria-label="Zatvori upload" onClick={() => uploadState === "idle" && setUploadOpen(false)} /><aside className="drawer"><div className="drawer-header"><div><span className="eyebrow">Privatni storage</span><h2>Upload dokumenta</h2></div><button className="icon-button" aria-label="Zatvori" onClick={() => setUploadOpen(false)} disabled={uploadState !== "idle"}><X size={20} /></button></div><form className="drawer-form" onSubmit={uploadDocument}><label className="upload-dropzone"><Upload size={28} /><strong>{uploadFile?.name ?? "Odaberite PDF ili fotografiju"}</strong><span>PDF, JPEG, PNG ili WebP · maksimalno 15 MB</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} /></label><label><span>Porezni period (opcionalno)</span><select value={uploadPeriod} onChange={(event) => setUploadPeriod(event.target.value)}><option value="">Odaberi kasnije</option>{props.periods.map((period) => <option key={period.id} value={period.id}>{periodLabel(props.periods, period.id)} · {period.status}</option>)}</select></label><div className="drawer-note">HEIC i OCR nisu aktivni. Sistem provjerava stvarni sadržaj, MIME tip, veličinu i SHA-256 hash.</div>{uploadState !== "idle" && <div className="upload-progress"><i /><span>{uploadState === "validating" ? "Provjera fajla…" : "Siguran upload…"}</span></div>}{localError && <div className="form-error">{localError}</div>}<div className="drawer-actions"><button type="button" className="button secondary" onClick={() => setUploadOpen(false)} disabled={uploadState !== "idle"}>Odustani</button><button className="button primary" disabled={!uploadFile || uploadState !== "idle"}>Uploaduj i pregledaj</button></div></form></aside></div>}

    {selected && !posting && <div className="drawer-layer"><button className="drawer-backdrop" aria-label="Zatvori pregled" onClick={() => setSelected(null)} /><aside className="drawer document-preview-drawer"><div className="drawer-header"><div><span className="eyebrow">Ručni pregled</span><h2>{selected.original_filename}</h2></div><button className="icon-button" aria-label="Zatvori" onClick={() => setSelected(null)}><X size={20} /></button></div><div className="document-preview-body"><div className="preview-frame">{previewLoading ? <span>Priprema kratkotrajnog pregleda…</span> : signedUrl ? selected.mime_type === "application/pdf" ? <iframe title={`Pregled ${selected.original_filename}`} src={signedUrl} /> : <img alt={`Pregled ${selected.original_filename}`} src={signedUrl} /> : <span>Pregled nije dostupan.</span>}</div><div className="preview-download">{signedUrl && <a className="button secondary" href={signedUrl} download={selected.original_filename}>Preuzmi original</a>}</div><div className="ocr-notice"><strong>OCR još nije aktivan</strong><span>Podatke sa dokumenta unosite ručno i potvrđujete klikom na Spremi.</span></div><fieldset className="ledger-choice"><legend>Knjiži kao</legend><button type="button" className={ledger === "kuf" ? "selected" : ""} onClick={() => setLedger("kuf")}>KUF <small>Ulazna faktura</small></button><button type="button" className={ledger === "kif" ? "selected" : ""} onClick={() => setLedger("kif")}>KIF <small>Izlazna faktura</small></button></fieldset><label className="preview-period"><span>Porezni period</span><select value={reviewPeriod} onChange={(event) => setReviewPeriod(event.target.value)}><option value="">Odaberite period</option>{props.periods.map((period) => <option key={period.id} value={period.id}>{periodLabel(props.periods, period.id)} · {period.status === "open" ? "otvoren" : "zaključan"}</option>)}</select></label>{localError && <div className="form-error">{localError}</div>}<div className="drawer-actions"><button type="button" className="button secondary danger-text" onClick={() => setConfirmReject(true)} disabled={selected.status === "confirmed" || selected.status === "rejected"}>Odbaci dokument</button><button className="button primary" onClick={() => void beginPosting()} disabled={selected.status === "confirmed" || selected.status === "rejected"}>Otvori formu za knjiženje</button></div></div></aside></div>}

    <EntryDrawer open={posting} title={ledger === "kif" ? "KIF" : "KUF"} form={entryForm} setForm={setEntryForm} partnerSearch={partnerSearch} setPartnerSearch={setPartnerSearch} partners={props.partners} editing={false} sourceDocumentName={selected?.original_filename} submitLabel="Spremi i potvrdi" onClose={() => setPosting(false)} onSubmit={confirmPosting} />
    <ConfirmDialog open={confirmReject} title="Odbaciti dokument?" description="Dokument će ostati sigurno sačuvan, ali više neće biti dostupan za knjiženje. Ovu odluku nije moguće poništiti." confirmLabel="Odbaci dokument" tone="danger" onCancel={() => setConfirmReject(false)} onConfirm={() => void rejectDocument()} />
  </div>;
}
