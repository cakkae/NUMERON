import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260816240000_invoice_documents.sql"), "utf8");

describe("invoice documents schema", () => {
  it("creates a private company-scoped document model and storage policies", () => {
    expect(migration).toContain("create table public.invoice_documents");
    expect(migration).toContain("'invoice-documents', 'invoice-documents', false");
    expect(migration).toContain("public.has_company_access(((storage.foldername(name))[1])::uuid)");
    expect(migration).toContain("New document must start as an unlinked upload");
  });

  it("links a document to at most one KUF or KIF entry", () => {
    expect(migration).toContain("purchase_entries_source_document_unique_idx");
    expect(migration).toContain("sales_entries_source_document_unique_idx");
    expect(migration).toContain("Source document is already linked");
    expect(migration).toContain("insert into public.purchase_entries");
    expect(migration).toContain("insert into public.sales_entries");
  });

  it("blocks confirmation outside the atomic reviewed-posting function", () => {
    expect(migration).toContain("Document can only be confirmed through reviewed posting");
    expect(migration).toContain("Tax period is not open");
    expect(migration).toContain("Document was already resolved");
  });
});
