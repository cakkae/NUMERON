import type { DocumentType } from "@/lib/document-types";

export type ViewKey = "dashboard" | "kuf" | "kif" | "partners" | "documents" | "exports" | "settings";
export type Company = { id: string; workspace_id: string; name: string; vat_number: string };
export type Period = { id: string; company_id: string; year: number; month: number; status: "open" | "locked" | "ready_for_export" };
export type Partner = { id: string; name: string; address: string; vat_number: string; jib: string };
export type Entry = { id: string; company_id: string; tax_period_id: string; partner_id: string; document_type: string; invoice_number: string; invoice_date: string; amount: number; is_archived: boolean };
export type EntryForm = { partnerId: string; documentType: DocumentType; invoiceNumber: string; invoiceDate: string; amount: string };
export type PartnerForm = { name: string; address: string; vatNumber: string; jib: string };
export type BookTable = "purchase_entries" | "sales_entries";

export const emptyEntry = (): EntryForm => ({ partnerId: "", documentType: "01", invoiceNumber: "", invoiceDate: "", amount: "" });
export const emptyPartner = (): PartnerForm => ({ name: "", address: "", vatNumber: "", jib: "" });
