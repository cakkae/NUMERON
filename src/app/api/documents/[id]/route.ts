import { NextResponse } from "next/server";
import { authenticatedDocumentContext, DocumentServerError, documentRouteError } from "@/modules/invoice-documents/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { action?: unknown; ledger?: unknown; periodId?: unknown };
    if (body.action !== "review" && body.action !== "reject") return NextResponse.json({ error: "Akcija nije podržana." }, { status: 400 });
    const { supabase } = await authenticatedDocumentContext(request.headers.get("authorization"));
    const current = await supabase.from("invoice_documents").select("id, company_id, status, linked_entry_id").eq("id", id).single();
    if (current.error || !current.data) throw new DocumentServerError(404, "Dokument nije pronađen ili nije dostupan.");
    if (current.data.status === "confirmed" || current.data.status === "rejected" || current.data.linked_entry_id) throw new DocumentServerError(409, "Dokument je već riješen.");
    if (body.periodId != null && typeof body.periodId !== "string") throw new DocumentServerError(400, "Porezni period nije ispravan.");
    if (body.ledger != null && body.ledger !== "kuf" && body.ledger !== "kif") throw new DocumentServerError(400, "Ručno odaberite KUF ili KIF.");
    if (body.periodId) {
      const period = await supabase.from("tax_periods").select("id").eq("id", body.periodId).eq("company_id", current.data.company_id).single();
      if (period.error) throw new DocumentServerError(400, "Porezni period ne pripada firmi dokumenta.");
    }
    const values = body.action === "reject"
      ? { status: "rejected", suggested_ledger: null, tax_period_id: body.periodId || null }
      : { status: "reviewing", suggested_ledger: body.ledger || null, tax_period_id: body.periodId || null };
    const update = await supabase.from("invoice_documents").update(values).eq("id", id).select("id, status, suggested_ledger, tax_period_id").single();
    if (update.error) throw new DocumentServerError(409, update.error.message);
    return NextResponse.json({ document: update.data });
  } catch (error) {
    const failure = documentRouteError(error, "Ažuriranje dokumenta nije uspjelo.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
