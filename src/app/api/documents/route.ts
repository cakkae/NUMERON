import { NextResponse } from "next/server";
import { documentRouteError, uploadInvoiceDocument } from "@/modules/invoice-documents/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const companyId = form.get("companyId");
    const taxPeriodId = form.get("taxPeriodId");
    const file = form.get("file");
    if (typeof companyId !== "string" || !(file instanceof File)) return NextResponse.json({ error: "Firma i fajl su obavezni." }, { status: 400 });
    if (taxPeriodId !== null && typeof taxPeriodId !== "string") return NextResponse.json({ error: "Porezni period nije ispravan." }, { status: 400 });
    const document = await uploadInvoiceDocument({ authorization: request.headers.get("authorization"), companyId, taxPeriodId: taxPeriodId || null, file });
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    const failure = documentRouteError(error, "Upload dokumenta nije uspio.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
