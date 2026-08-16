import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { generateKifExport, generateKufExport, UinoExportError, type UinoBook, type UinoPartner, type UinoPurchaseEntry, type UinoSalesEntry } from "./generator";

export class UinoServerError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "UinoServerError";
  }
}

function environment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new UinoServerError(500, "Supabase server konfiguracija nedostaje.");
  return { url, anonKey };
}

export async function authenticatedServerContext(authorization: string | null) {
  if (!authorization?.startsWith("Bearer ")) throw new UinoServerError(401, "Prijava je obavezna.");
  const token = authorization.slice(7);
  const { url, anonKey } = environment();
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new UinoServerError(401, "Sesija nije važeća.");
  return { supabase, user: data.user };
}

function requiredPartner(value: unknown): UinoPartner {
  const partner = (Array.isArray(value) ? value[0] : value) as { name?: unknown; address?: unknown; vat_number?: unknown; jib?: unknown } | null;
  if (!partner) throw new UinoServerError(422, "Partner stavke nije pronađen.");
  return {
    name: String(partner.name ?? ""), address: String(partner.address ?? ""),
    vatNumber: partner.vat_number == null ? null : String(partner.vat_number),
    jib: partner.jib == null ? null : String(partner.jib),
  };
}

function mapPurchase(row: Record<string, unknown>): UinoPurchaseEntry {
  return {
    id: String(row.id), companyId: String(row.company_id), taxPeriodId: String(row.tax_period_id), documentType: String(row.document_type),
    invoiceNumber: String(row.invoice_number), invoiceDate: String(row.invoice_date), receivedDate: String(row.received_date), partner: requiredPartner(row.partners),
    invoiceAmountExcludingVat: row.invoice_amount_excluding_vat as string | number | null,
    invoiceAmountWithVat: row.invoice_amount_with_vat as string | number | null,
    flatRateCompensation: row.flat_rate_compensation as string | number | null,
    inputVatAmount: row.input_vat_amount as string | number | null,
    deductibleInputVat: row.deductible_input_vat as string | number | null,
    nonDeductibleInputVat: row.non_deductible_input_vat as string | number | null,
    inputVatField32: row.input_vat_field_32 as string | number | null,
    inputVatField33: row.input_vat_field_33 as string | number | null,
    inputVatField34: row.input_vat_field_34 as string | number | null,
  };
}

function mapSale(row: Record<string, unknown>): UinoSalesEntry {
  return {
    id: String(row.id), companyId: String(row.company_id), taxPeriodId: String(row.tax_period_id), documentType: String(row.document_type),
    invoiceNumber: String(row.invoice_number), invoiceDate: String(row.invoice_date), partner: requiredPartner(row.partners),
    invoiceTotalAmount: row.invoice_total_amount as string | number | null,
    internalInvoiceAmount: row.internal_invoice_amount as string | number | null,
    exportInvoiceAmount: row.export_invoice_amount as string | number | null,
    vatExemptSupplyAmount: row.vat_exempt_supply_amount as string | number | null,
    taxableBaseRegistered: row.taxable_base_registered as string | number | null,
    outputVatRegistered: row.output_vat_registered as string | number | null,
    taxableBaseNonRegistered: row.taxable_base_non_registered as string | number | null,
    outputVatNonRegistered: row.output_vat_non_registered as string | number | null,
    outputVatField32: row.output_vat_field_32 as string | number | null,
    outputVatField33: row.output_vat_field_33 as string | number | null,
    outputVatField34: row.output_vat_field_34 as string | number | null,
  };
}

async function loadExportInput(supabase: SupabaseClient, user: User, companyId: string, periodId: string, book: UinoBook) {
  const [companyResult, periodResult, membershipResult] = await Promise.all([
    supabase.from("companies").select("id, workspace_id, vat_number").eq("id", companyId).single(),
    supabase.from("tax_periods").select("id, company_id, year, month, status").eq("id", periodId).eq("company_id", companyId).single(),
    supabase.from("company_members").select("role").eq("company_id", companyId).eq("user_id", user.id).single(),
  ]);
  if (companyResult.error || !companyResult.data) throw new UinoServerError(404, "Firma nije pronađena ili nije dostupna.");
  if (periodResult.error || !periodResult.data) throw new UinoServerError(404, "Porezni period nije pronađen.");
  if (membershipResult.error || membershipResult.data?.role !== "owner") throw new UinoServerError(403, "Samo vlasnik servisa može generisati UINO izvoz.");

  const common = "id, company_id, tax_period_id, document_type, invoice_number, invoice_date, partners!inner(name, address, vat_number, jib)";
  const result = book === "KUF"
    ? await supabase.from("purchase_entries").select(`${common}, received_date, invoice_amount_excluding_vat, invoice_amount_with_vat, flat_rate_compensation, input_vat_amount, deductible_input_vat, non_deductible_input_vat, input_vat_field_32, input_vat_field_33, input_vat_field_34`).eq("company_id", companyId).eq("tax_period_id", periodId).eq("is_archived", false).order("received_date").order("id")
    : await supabase.from("sales_entries").select(`${common}, invoice_total_amount, internal_invoice_amount, export_invoice_amount, vat_exempt_supply_amount, taxable_base_registered, output_vat_registered, taxable_base_non_registered, output_vat_non_registered, output_vat_field_32, output_vat_field_33, output_vat_field_34`).eq("company_id", companyId).eq("tax_period_id", periodId).eq("is_archived", false).order("invoice_date").order("id");
  if (result.error) throw new UinoServerError(422, result.error.message);
  return {
    company: { id: companyResult.data.id, workspaceId: companyResult.data.workspace_id, vatNumber: companyResult.data.vat_number },
    period: { id: periodResult.data.id, companyId: periodResult.data.company_id, year: periodResult.data.year, month: periodResult.data.month, status: periodResult.data.status },
    rows: (result.data ?? []) as unknown as Record<string, unknown>[],
  };
}

export async function createAndArchiveUinoExports(args: { authorization: string | null; companyId: string; periodId: string; book: UinoBook }) {
  const { supabase, user } = await authenticatedServerContext(args.authorization);
  const input = await loadExportInput(supabase, user, args.companyId, args.periodId, args.book);
  const generatedAt = new Date();
  let files;
  try {
    files = args.book === "KUF"
      ? generateKufExport({ company: input.company, period: input.period, entries: input.rows.map(mapPurchase), generatedAt })
      : generateKifExport({ company: input.company, period: input.period, entries: input.rows.map(mapSale), generatedAt });
  } catch (error) {
    if (error instanceof UinoExportError) throw new UinoServerError(error.code === "PERIOD_NOT_READY" ? 409 : 422, error.message);
    throw error;
  }

  const uploadedPaths: string[] = [];
  const archiveIds: string[] = [];
  try {
    const archives = [];
    for (const file of files) {
      const id = randomUUID();
      const storagePath = `${input.company.id}/${input.period.id}/${id}/${file.fileName}`;
      const hash = createHash("sha256").update(file.bytes).digest("hex");
      const upload = await supabase.storage.from("uino-exports").upload(storagePath, file.bytes, { contentType: "text/csv", upsert: false });
      if (upload.error) throw new UinoServerError(500, `Privatno čuvanje izvoza nije uspjelo: ${upload.error.message}`);
      uploadedPaths.push(storagePath);
      const archive = {
        id, workspace_id: input.company.workspaceId, company_id: input.company.id, tax_period_id: input.period.id,
        created_by: user.id, book_type: args.book, file_name: file.fileName, sequence: file.sequence,
        content_sha256: hash, storage_path: storagePath, item_count: file.itemCount, size_bytes: file.bytes.byteLength,
        totals: file.totals, generated_at: generatedAt.toISOString(),
      };
      const insert = await supabase.from("uino_exports").insert(archive);
      if (insert.error) throw new UinoServerError(500, `Arhiviranje izvoza nije uspjelo: ${insert.error.message}`);
      archiveIds.push(id);
      archives.push({ id, fileName: file.fileName, sequence: file.sequence, itemCount: file.itemCount, sizeBytes: file.bytes.byteLength, hash, totals: file.totals, generatedAt: archive.generated_at });
    }
    return archives;
  } catch (error) {
    if (archiveIds.length) await supabase.from("uino_exports").delete().in("id", archiveIds);
    if (uploadedPaths.length) await supabase.storage.from("uino-exports").remove(uploadedPaths);
    throw error;
  }
}
