import { isDocumentType } from "./document-types";
import { getMoneyFields, type UinoMoneyField } from "./uino-fields";

export type BookType = "KUF" | "KIF";

export type ValidationError = {
  code: "COMPANY_ACCESS" | "PERIOD" | "DATE" | "PARTNER" | "VAT_NUMBER" | "JIB" | "REQUIRED" | "DUPLICATE" | "AMOUNT" | "DOCUMENT_TYPE";
  book: BookType;
  entryId?: string;
  message: string;
};

type MoneyValue = string | number | null | undefined;

export type EntryValidationInput = {
  id?: string;
  companyId: string;
  taxPeriodId: string;
  partnerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  receivedDate?: string;
  amount?: MoneyValue;
  documentType: string;
} & Partial<Record<UinoMoneyField, MoneyValue>>;

export type PartnerValidationInput = { id: string; vatNumber: string | null; jib: string | null };
export type PeriodValidationInput = { id: string; companyId: string; year: number; month: number };

export function isValidVatNumber(value: string) { return /^\d{12}$/.test(value); }
export function isValidJib(value: string) { return /^\d{13}$/.test(value); }
export function isValidOrEmptyVatNumber(value: string | null | undefined) { return !value || isValidVatNumber(value); }
export function isValidOrEmptyJib(value: string | null | undefined) { return !value || isValidJib(value); }

export function isValidDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidUinoAmount(value: MoneyValue) {
  if (value === "" || value === null || value === undefined) return true;
  const normalized = String(value);
  return /^\d{1,22}(\.\d{1,2})?$/.test(normalized) && Number.isFinite(Number(value)) && Number(value) >= 0;
}

export function validateBasicEntry(input: { partnerId: string; invoiceNumber: string; invoiceDate: string; amount: MoneyValue; documentType: string }) {
  const messages: string[] = [];
  if (!input.partnerId) messages.push("Odaberite partnera.");
  if (!input.invoiceNumber.trim()) messages.push("Broj fakture je obavezan.");
  if (!isValidDate(input.invoiceDate)) messages.push("Datum fakture nije ispravan.");
  if (input.amount === "" || !isValidUinoAmount(input.amount)) messages.push("Iznos mora biti nula ili pozitivan broj sa najviše dvije decimale.");
  if (!isDocumentType(input.documentType)) messages.push("Tip dokumenta mora biti između 01 i 09.");
  return messages;
}

export function validateEntryForm(book: BookType, input: Omit<EntryValidationInput, "companyId" | "taxPeriodId">) {
  const messages: string[] = [];
  if (!input.partnerId) messages.push("Odaberite partnera.");
  if (!input.invoiceNumber.trim()) messages.push("Broj fakture je obavezan.");
  if (!isValidDate(input.invoiceDate)) messages.push("Datum fakture nije ispravan.");
  if (book === "KUF" && !isValidDate(input.receivedDate ?? "")) messages.push("Datum prijema ili knjiženja nije ispravan.");
  if (!isDocumentType(input.documentType)) messages.push("Tip dokumenta mora biti između 01 i 09.");
  for (const field of getMoneyFields(book)) {
    if (!isValidUinoAmount(input[field])) {
      messages.push("UINO iznosi moraju biti nula ili pozitivni brojevi sa najviše dvije decimale.");
      break;
    }
  }
  return messages;
}

function identifierErrors(partner: PartnerValidationInput, documentType: string) {
  const errors: Array<{ code: "VAT_NUMBER" | "JIB"; message: string }> = [];
  if (documentType === "04") {
    if (partner.vatNumber !== "000000000000") errors.push({ code: "VAT_NUMBER", message: "Za uvoz ili izvoz PDV broj mora sadržavati 12 nula." });
    if (partner.jib !== "0000000000000") errors.push({ code: "JIB", message: "Za uvoz ili izvoz JIB mora sadržavati 13 nula." });
    return errors;
  }
  if (!isValidOrEmptyVatNumber(partner.vatNumber)) errors.push({ code: "VAT_NUMBER", message: "PDV broj partnera mora biti prazan ili imati 12 cifara." });
  if (!isValidOrEmptyJib(partner.jib)) errors.push({ code: "JIB", message: "JIB partnera mora biti prazan ili imati 13 cifara." });
  return errors;
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
    const periodDate = book === "KUF" ? entry.receivedDate ?? entry.invoiceDate : entry.invoiceDate;
    if (entry.companyId !== activeCompanyId || period.companyId !== activeCompanyId) add("COMPANY_ACCESS", "Stavka ne pripada aktivnoj firmi.");
    if (entry.taxPeriodId !== period.id) add("PERIOD", "Stavka ne pripada aktivnom periodu.");
    if (!entry.partnerId || !entry.invoiceNumber.trim()) add("REQUIRED", "Partner i broj fakture su obavezni.");
    const invoiceDateIsValid = isValidDate(entry.invoiceDate);
    if (!invoiceDateIsValid) add("DATE", "Datum fakture nije ispravan.");
    if (book === "KUF" && !isValidDate(periodDate)) add("DATE", "Datum prijema ili knjiženja nije ispravan.");
    else if ((book === "KUF" || invoiceDateIsValid) && (Number(periodDate.slice(0, 4)) !== period.year || Number(periodDate.slice(5, 7)) !== period.month)) add("PERIOD", book === "KUF" ? "Datum prijema nije unutar aktivnog perioda." : "Datum fakture nije unutar aktivnog perioda.");
    for (const field of getMoneyFields(book)) {
      if (!isValidUinoAmount(entry[field])) {
        add("AMOUNT", "UINO iznos nije ispravan.");
        break;
      }
    }
    if (entry.amount !== undefined && entry.amount !== null && !isValidUinoAmount(entry.amount)) add("AMOUNT", "Legacy ukupni iznos nije ispravan.");
    if (!isDocumentType(entry.documentType)) add("DOCUMENT_TYPE", "Tip dokumenta mora biti između 01 i 09.");
    if ((duplicateCounts.get(entry.invoiceNumber.trim().toLowerCase()) ?? 0) > 1) add("DUPLICATE", "Broj fakture je duplikat u istoj knjizi.");
    if (!partner) add("PARTNER", "Partner nije pronađen u aktivnoj firmi.");
    else for (const error of identifierErrors(partner, entry.documentType)) add(error.code, error.message);
  }
  return errors;
}

export function getPeriodValidationStatus(kufErrors: ValidationError[], kifErrors: ValidationError[]) {
  const errors = [...kufErrors, ...kifErrors];
  return { errorCount: errors.length, readyForExport: errors.length === 0, errors };
}
