import { NextResponse } from "next/server";
import { authenticatedDocumentContext, DocumentServerError, documentRouteError } from "@/modules/invoice-documents/server";
import { createPrivateDocumentSignedUrl } from "@/modules/invoice-documents/signed-url";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { supabase } = await authenticatedDocumentContext(request.headers.get("authorization"));
    try {
      return NextResponse.json(await createPrivateDocumentSignedUrl({
        loadStoragePath: async (documentId) => supabase.from("invoice_documents").select("storage_path").eq("id", documentId).single(),
        signStoragePath: async (path, expiresIn) => supabase.storage.from("invoice-documents").createSignedUrl(path, expiresIn),
      }, id, 120));
    } catch (error) {
      throw new DocumentServerError(404, error instanceof Error ? error.message : "Dokument nije dostupan.");
    }
  } catch (error) {
    const failure = documentRouteError(error, "Privremeni pristup dokumentu nije uspio.");
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}
