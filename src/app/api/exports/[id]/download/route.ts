import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticatedServerContext, UinoServerError } from "@/modules/uino-export/server";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { supabase } = await authenticatedServerContext(request.headers.get("authorization"));
    const archive = await supabase.from("uino_exports").select("file_name, content_sha256, storage_path").eq("id", id).single();
    if (archive.error || !archive.data) throw new UinoServerError(404, "Arhivirani izvoz nije pronađen.");
    const stored = await supabase.storage.from("uino-exports").download(archive.data.storage_path);
    if (stored.error || !stored.data) throw new UinoServerError(404, "CSV fajl nije pronađen u privatnoj arhivi.");
    const bytes = new Uint8Array(await stored.data.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");
    if (hash !== archive.data.content_sha256) throw new UinoServerError(409, "Hash arhiviranog CSV fajla nije ispravan.");
    return new Response(bytes, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${archive.data.file_name}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const status = error instanceof UinoServerError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Preuzimanje izvoza nije uspjelo.";
    return NextResponse.json({ error: message }, { status });
  }
}
