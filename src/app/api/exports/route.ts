import { NextResponse } from "next/server";
import { createAndArchiveUinoExports, UinoServerError } from "@/modules/uino-export/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { companyId?: unknown; periodId?: unknown; book?: unknown };
    if (typeof body.companyId !== "string" || typeof body.periodId !== "string" || (body.book !== "KUF" && body.book !== "KIF")) {
      return NextResponse.json({ error: "Firma, period i knjiga su obavezni." }, { status: 400 });
    }
    const exports = await createAndArchiveUinoExports({ authorization: request.headers.get("authorization"), companyId: body.companyId, periodId: body.periodId, book: body.book });
    return NextResponse.json({ exports }, { status: 201 });
  } catch (error) {
    const status = error instanceof UinoServerError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Generisanje izvoza nije uspjelo.";
    return NextResponse.json({ error: message }, { status });
  }
}
