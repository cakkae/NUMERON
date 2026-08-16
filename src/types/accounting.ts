import type { DocumentType } from "@/lib/document-types";

export type ViewKey = "dashboard" | "kuf" | "kif" | "partners" | "documents" | "exports" | "settings";
export type Company = { id: string; workspace_id: string; name: string; vat_number: string };
export type Period = { id: string; company_id: string; year: number; month: number; status: "open" | "locked" | "ready_for_export" };
export type Partner = { id: string; name: string; address: string; vat_number: string | null; jib: string | null };
export type Entry = {
  id: string;
  company_id: string;
  tax_period_id: string;
  partner_id: string;
  document_type: string;
  invoice_number: string;
  invoice_date: string;
  amount: number | null;
  source_document_id?: string | null;
  is_archived: boolean;
  received_date?: string;
  invoice_amount_excluding_vat?: number | null;
  invoice_amount_with_vat?: number | null;
  flat_rate_compensation?: number | null;
  input_vat_amount?: number | null;
  deductible_input_vat?: number | null;
  non_deductible_input_vat?: number | null;
  input_vat_field_32?: number | null;
  input_vat_field_33?: number | null;
  input_vat_field_34?: number | null;
  invoice_total_amount?: number | null;
  internal_invoice_amount?: number | null;
  export_invoice_amount?: number | null;
  vat_exempt_supply_amount?: number | null;
  taxable_base_registered?: number | null;
  output_vat_registered?: number | null;
  taxable_base_non_registered?: number | null;
  output_vat_non_registered?: number | null;
  output_vat_field_32?: number | null;
  output_vat_field_33?: number | null;
  output_vat_field_34?: number | null;
};
export type EntryForm = {
  partnerId: string;
  documentType: DocumentType;
  invoiceNumber: string;
  invoiceDate: string;
  receivedDate: string;
  invoiceAmountExcludingVat: string;
  invoiceAmountWithVat: string;
  flatRateCompensation: string;
  inputVatAmount: string;
  deductibleInputVat: string;
  nonDeductibleInputVat: string;
  inputVatField32: string;
  inputVatField33: string;
  inputVatField34: string;
  invoiceTotalAmount: string;
  internalInvoiceAmount: string;
  exportInvoiceAmount: string;
  vatExemptSupplyAmount: string;
  taxableBaseRegistered: string;
  outputVatRegistered: string;
  taxableBaseNonRegistered: string;
  outputVatNonRegistered: string;
  outputVatField32: string;
  outputVatField33: string;
  outputVatField34: string;
};
export type PartnerForm = { name: string; address: string; vatNumber: string; jib: string };
export type BookTable = "purchase_entries" | "sales_entries";
export type ExportArchive = {
  id: string;
  book_type: "KUF" | "KIF";
  file_name: string;
  content_sha256: string;
  item_count: number;
  size_bytes: number;
  totals: string[];
  generated_at: string;
};
export type InvoiceDocument = {
  id: string;
  company_id: string;
  tax_period_id: string | null;
  uploaded_by: string;
  original_filename: string;
  mime_type: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
  byte_size: number;
  sha256: string;
  status: "uploaded" | "reviewing" | "confirmed" | "rejected";
  suggested_ledger: "kuf" | "kif" | null;
  linked_entry_id: string | null;
  created_at: string;
  updated_at: string;
};

export const emptyEntry = (): EntryForm => ({
  partnerId: "", documentType: "01", invoiceNumber: "", invoiceDate: "", receivedDate: "",
  invoiceAmountExcludingVat: "", invoiceAmountWithVat: "", flatRateCompensation: "", inputVatAmount: "",
  deductibleInputVat: "", nonDeductibleInputVat: "", inputVatField32: "", inputVatField33: "", inputVatField34: "",
  invoiceTotalAmount: "", internalInvoiceAmount: "", exportInvoiceAmount: "", vatExemptSupplyAmount: "",
  taxableBaseRegistered: "", outputVatRegistered: "", taxableBaseNonRegistered: "", outputVatNonRegistered: "",
  outputVatField32: "", outputVatField33: "", outputVatField34: "",
});
export const emptyPartner = (): PartnerForm => ({ name: "", address: "", vatNumber: "", jib: "" });
