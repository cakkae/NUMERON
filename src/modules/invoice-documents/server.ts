import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { validateInvoiceDocumentFile } from "./file-validation";

export class DocumentServerError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "DocumentServerError";
  }
}

export async function authenticatedDocumentContext(authorization: string | null): Promise<{ supabase: SupabaseClient; user: User }> {
  if (!authorization?.startsWith("Bearer ")) throw new DocumentServerError(401, "Prijava je obavezna.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new DocumentServerError(500, "Supabase server konfiguracija nedostaje.");
  const token = authorization.slice(7);
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new DocumentServerError(401, "Sesija nije važeća.");
  return { supabase, user: data.user };
}

export async function uploadInvoiceDocument(input: { authorization: string | null; companyId: string; taxPeriodId?: string | null; file: File }) {
  const { supabase, user } = await authenticatedDocumentContext(input.authorization);
  const company = await supabase.from("companies").select("id, workspace_id").eq("id", input.companyId).single();
  if (company.error || !company.data) throw new DocumentServerError(404, "Firma nije pronađena ili nije dostupna.");
  if (input.taxPeriodId) {
    const period = await supabase.from("tax_periods").select("id").eq("id", input.taxPeriodId).eq("company_id", input.companyId).single();
    if (period.error) throw new DocumentServerError(400, "Porezni period ne pripada odabranoj firmi.");
  }

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  let validated;
  try {
    validated = validateInvoiceDocumentFile({ filename: input.file.name, declaredMime: input.file.type, bytes });
  } catch (error) {
    throw new DocumentServerError(415, error instanceof Error ? error.message : "Fajl nije podržan.");
  }
  const storagePath = `${input.companyId}/${randomUUID()}`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const upload = await supabase.storage.from("invoice-documents").upload(storagePath, bytes, { contentType: validated.mimeType, upsert: false });
  if (upload.error) throw new DocumentServerError(500, `Upload nije uspio: ${upload.error.message}`);
  const insert = await supabase.from("invoice_documents").insert({
    workspace_id: company.data.workspace_id,
    company_id: input.companyId,
    tax_period_id: input.taxPeriodId || null,
    uploaded_by: user.id,
    original_filename: validated.filename,
    storage_path: storagePath,
    mime_type: validated.mimeType,
    byte_size: validated.byteSize,
    sha256,
  }).select("id, company_id, tax_period_id, uploaded_by, original_filename, mime_type, byte_size, sha256, status, suggested_ledger, linked_entry_id, created_at, updated_at").single();
  if (insert.error || !insert.data) {
    await supabase.storage.from("invoice-documents").remove([storagePath]);
    throw new DocumentServerError(500, `Evidentiranje dokumenta nije uspjelo: ${insert.error?.message ?? "nepoznata greška"}`);
  }
  return insert.data;
}

export function documentRouteError(error: unknown, fallback: string) {
  return { status: error instanceof DocumentServerError ? error.status : 500, message: error instanceof Error ? error.message : fallback };
}
