import { isDocumentType } from "./document-types";

export type BookType = "KUF" | "KIF";

export type ValidationError = {
  code: "COMPANY_ACCESS" | "PERIOD" | "DATE" | "PARTNER" | "VAT_NUMBER" | "JIB" | "REQUIRED" | "DUPLICATE" | "AMOUNT" | "DOCUMENT_TYPE";
  book: BookType;
  entryId?: string;
  message: string;
};

export type EntryValidationInput = {
  id?: string;
  companyId: string;
  taxPeriodId: string;
  partnerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string | number;
  documentType: string;
};

export type PartnerValidationInput = { id: string; vatNumber: string; jib: string };
export type PeriodValidationInput = { id: string; companyId: string; year: number; month: number };

export function isValidVatNumber(value: string) { return /^\d{12}$/.test(value); }
export function isValidJib(value: string) { return /^\d{13}$/.test(value); }

export function isValidDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateBasicEntry(input: Pick<EntryValidationInput, "partnerId" | "invoiceNumber" | "invoiceDate" | "amount" | "documentType">) {
  const messages: string[] = [];
  if (!input.partnerId) messages.push("Odaberite partnera.");
  if (!input.invoiceNumber.trim()) messages.push("Broj fakture je obavezan.");
  if (!isValidDate(input.invoiceDate)) messages.push("Datum fakture nije ispravan.");
  if (input.amount === "" || !Number.isFinite(Number(input.amount)) || Number(input.amount) < 0) messages.push("Iznos mora biti nula ili pozitivan broj.");
  if (!isDocumentType(input.documentType)) messages.push("Tip dokumenta mora biti između 01 i 09.");
  return messages;
}

export function validateBookEntries(args: {
  book: BookType;
  activeCompanyId: string;
  period: PeriodValidationInput;
  partners: PartnerValidationInput[];
  entries: EntryValidationInput[];
}) {
  const { book, activeCompanyId, period, partners, entries } = args;
  const errors: ValidationError[] = [];
  const duplicateCounts = new Map<string, number>();
  for (const entry of entries) {
    const key = entry.invoiceNumber.trim().toLowerCase();
    if (key) duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  for (const entry of entries) {
    const add = (code: ValidationError["code"], message: string) => errors.push({ code, book, entryId: entry.id, message });
    const partner = partners.find((item) => item.id === entry.partnerId);
    if (entry.companyId !== activeCompanyId || period.companyId !== activeCompanyId) add("COMPANY_ACCESS", "Stavka ne pripada aktivnoj firmi.");
    if (entry.taxPeriodId !== period.id) add("PERIOD", "Stavka ne pripada aktivnom periodu.");
    if (!entry.partnerId || !entry.invoiceNumber.trim()) add("REQUIRED", "Partner i broj fakture su obavezni.");
    if (!isValidDate(entry.invoiceDate)) add("DATE", "Datum fakture nije ispravan.");
    else if (Number(entry.invoiceDate.slice(0, 4)) !== period.year || Number(entry.invoiceDate.slice(5, 7)) !== period.month) add("PERIOD", "Datum fakture nije unutar aktivnog perioda.");
    if (entry.amount === "" || !Number.isFinite(Number(entry.amount)) || Number(entry.amount) < 0) add("AMOUNT", "Iznos mora biti nula ili pozitivan broj.");
    if (!isDocumentType(entry.documentType)) add("DOCUMENT_TYPE", "Tip dokumenta mora biti između 01 i 09.");
    if ((duplicateCounts.get(entry.invoiceNumber.trim().toLowerCase()) ?? 0) > 1) add("DUPLICATE", "Broj fakture je duplikat u istoj knjizi.");
    if (!partner) add("PARTNER", "Partner nije pronađen u aktivnoj firmi.");
    else {
      if (!isValidVatNumber(partner.vatNumber)) add("VAT_NUMBER", "PDV broj partnera nije ispravan.");
      if (!isValidJib(partner.jib)) add("JIB", "JIB partnera nije ispravan.");
    }
  }
  return errors;
}

export function getPeriodValidationStatus(kufErrors: ValidationError[], kifErrors: ValidationError[]) {
  const errors = [...kufErrors, ...kifErrors];
  return { errorCount: errors.length, readyForExport: errors.length === 0, errors };
}
