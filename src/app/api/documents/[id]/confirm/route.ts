import { NextResponse } from "next/server";
import { validateEntryForm } from "@/lib/validation-engine";
import { authenticatedDocumentContext, DocumentServerError, documentRouteError } from "@/modules/invoice-documents/server";
import { validateDocumentConfirmation } from "@/modules/invoice-documents/workflow";
import type { EntryForm } from "@/types/accounting";

export const runtime = "nodejs";

const toEntryData = (form: EntryForm) => ({
  partner_id: form.partnerId, document_type: form.documentType, invoice_number: form.invoiceNumber.trim(), invoice_date: form.invoiceDate,
  received_date: form.receivedDate, invoice_amount_excluding_vat: form.invoiceAmountExcludingVat, invoice_amount_with_vat: form.invoiceAmountWithVat,
  flat_rate_compensation: form.flatRateCompensation, input_vat_amount: form.inputVatAmount, deductible_input_vat: form.deductibleInputVat,
  non_deductible_input_vat: form.nonDeductibleInputVat, input_vat_field_32: form.inputVatField32, input_vat_field_33: form.inputVatField33,
  input_vat_field_34: form.inputVatField34, invoice_total_amount: form.invoiceTotalAmount, internal_invoice_amount: form.internalInvoiceAmount,
  export_invoice_amount: form.exportInvoiceAmount, vat_exempt_supply_amount: form.vatExemptSupplyAmount, taxable_base_registered: form.taxableBaseRegistered,
  output_vat_registered: form.outputVatRegistered, taxable_base_non_registered: form.taxableBaseNonRegistered,
  output_vat_non_registered: form.outputVatNonRegistered, output_vat_field_32: form.outputVatField32,
  output_vat_field_33: form.outputVatField33, output_vat_field_34: form.outputVatField34,
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json() as { companyId?: unknown; periodId?: unknown; ledger?: unknown; form?: EntryForm };
    if (typeof body.companyId !== "string" || typeof body.periodId !== "string" || (body.ledger !== "kuf" && body.ledger !== "kif") || !body.form) {
      return NextResponse.json({ error: "Firma, period, knjiga i podaci stavke su obavezni." }, { status: 400 });
    }
    const { supabase } = await authenticatedDocumentContext(request.headers.get("authorization"));
    const [document, period] = await Promise.all([
      supabase.from("invoice_documents").select("company_id, status, linked_entry_id").eq("id", id).single(),
      supabase.from("tax_periods").select("id, company_id, status, year, month").eq("id", body.periodId).single(),
    ]);
    if (document.error || !document.data) throw new DocumentServerError(404, "Dokument nije pronađen ili nije dostupan.");
    const workflowErrors = validateDocumentConfirmation({
      document: { companyId: document.data.company_id, status: document.data.status, linkedEntryId: document.data.linked_entry_id },
      activeCompanyId: body.companyId,
      period: period.data ? { id: period.data.id, companyId: period.data.company_id, status: period.data.status } : null,
      ledger: body.ledger,
    });
    const formErrors = validateEntryForm(body.ledger === "kuf" ? "KUF" : "KIF", body.form);
    const periodDate = body.ledger === "kuf" ? body.form.receivedDate : body.form.invoiceDate;
    if (period.data && (Number(periodDate.slice(0, 4)) !== period.data.year || Number(periodDate.slice(5, 7)) !== period.data.month)) formErrors.push("Datum knjiženja mora biti unutar odabranog perioda.");
    const errors = [...workflowErrors, ...formErrors];
    if (errors.length) throw new DocumentServerError(409, errors.join(" "));
    const result = await supabase.rpc("confirm_invoice_document", { target_document_id: id, target_period_id: body.periodId, target_ledger: body.ledger, entry_data: toEntryData(body.form) });
    if (result.error) throw new DocumentServerError(409, result.error.message);
    return NextResponse.json({ entryId: result.data, ledger: body.ledger }, { status: 201 });
  } catch (error) {
    const failure = documentRouteError(error, "Knjiženje dokumenta nije uspjelo.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
