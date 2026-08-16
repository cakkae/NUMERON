import { isDocumentType } from "../../lib/document-types";
import { isValidDate, isValidJib, isValidVatNumber } from "../../lib/validation-engine";

export const MAX_UINO_FILE_BYTES = 5_000_000;
const LINE_ENDING = "\r\n";
const encoder = new TextEncoder();

export type UinoBook = "KUF" | "KIF";
export type MoneyInput = string | number | null | undefined;

export type UinoCompany = { id: string; workspaceId: string; vatNumber: string };
export type UinoPeriod = { id: string; companyId: string; year: number; month: number; status: "open" | "locked" | "ready_for_export" };
export type UinoPartner = { name: string; address: string; vatNumber: string | null; jib: string | null };

type CommonEntry = {
  id: string;
  companyId: string;
  taxPeriodId: string;
  documentType: string;
  invoiceNumber: string;
  invoiceDate: string;
  partner: UinoPartner;
};

export type UinoPurchaseEntry = CommonEntry & {
  receivedDate: string;
  invoiceAmountExcludingVat: MoneyInput;
  invoiceAmountWithVat: MoneyInput;
  flatRateCompensation: MoneyInput;
  inputVatAmount: MoneyInput;
  deductibleInputVat: MoneyInput;
  nonDeductibleInputVat: MoneyInput;
  inputVatField32: MoneyInput;
  inputVatField33: MoneyInput;
  inputVatField34: MoneyInput;
};

export type UinoSalesEntry = CommonEntry & {
  invoiceTotalAmount: MoneyInput;
  internalInvoiceAmount: MoneyInput;
  exportInvoiceAmount: MoneyInput;
  vatExemptSupplyAmount: MoneyInput;
  taxableBaseRegistered: MoneyInput;
  outputVatRegistered: MoneyInput;
  taxableBaseNonRegistered: MoneyInput;
  outputVatNonRegistered: MoneyInput;
  outputVatField32: MoneyInput;
  outputVatField33: MoneyInput;
  outputVatField34: MoneyInput;
};

export type UinoExportFile = {
  fileName: string;
  sequence: number;
  itemCount: number;
  content: string;
  bytes: Uint8Array;
  totals: string[];
};

export class UinoExportError extends Error {
  constructor(public readonly code: "PERIOD_NOT_READY" | "VALIDATION" | "UNCONFIRMED_CORRECTION" | "FILE_SIZE", message: string) {
    super(message);
    this.name = "UinoExportError";
  }
}

type PreparedRow = { line: string; lineBytes: number; cents: bigint[] };

function fail(message: string): never {
  throw new UinoExportError("VALIDATION", message);
}

function assertSafeText(value: string, label: string, maxLength: number) {
  if (!value.trim()) fail(`${label} nedostaje.`);
  if (value.length > maxLength) fail(`${label} prelazi ${maxLength} znakova.`);
  if (/[;\r\n]/.test(value)) fail(`${label} sadrži nedozvoljen separator ili novi red.`);
}

function toCents(value: MoneyInput, label: string) {
  if (value === null || value === undefined || value === "") fail(`${label} nedostaje; unesite eksplicitnu UINO vrijednost, uključujući 0.00 kada je primjenjivo.`);
  const normalized = String(value).trim();
  const match = /^(\d{1,22})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) fail(`${label} mora biti nenegativan iznos sa najviše dvije decimale.`);
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? "").padEnd(2, "0") || "0");
}

function formatCents(value: bigint) {
  const units = value / 100n;
  const decimals = String(value % 100n).padStart(2, "0");
  return `${units}.${decimals}`;
}

function validatePartner(partner: UinoPartner, documentType: string) {
  assertSafeText(partner.name, "Naziv partnera", 100);
  assertSafeText(partner.address, "Adresa partnera", 100);
  const vatNumber = partner.vatNumber ?? "";
  const jib = partner.jib ?? "";
  if (/[;\r\n]/.test(vatNumber) || /[;\r\n]/.test(jib)) fail("Identifikator partnera sadrži nedozvoljen separator ili novi red.");
  if (documentType === "04") {
    if (vatNumber !== "000000000000" || jib !== "0000000000000") fail("Uvoz/izvoz tipa 04 zahtijeva PDV broj od 12 i JIB od 13 nula.");
  } else {
    if (vatNumber && !isValidVatNumber(vatNumber)) fail("PDV broj partnera mora biti prazan ili imati 12 cifara.");
    if (jib && !isValidJib(jib)) fail("JIB partnera mora biti prazan ili imati 13 cifara.");
  }
}

function validateCommon(entry: CommonEntry, company: UinoCompany, period: UinoPeriod, duplicateNumbers: Set<string>) {
  if (entry.companyId !== company.id || entry.taxPeriodId !== period.id) fail("Stavka ne pripada izabranoj firmi i periodu.");
  if (!isDocumentType(entry.documentType)) fail("Tip dokumenta mora biti između 01 i 09.");
  if (entry.documentType === "06" || entry.documentType === "07") {
    throw new UinoExportError("UNCONFIRMED_CORRECTION", `Tip dokumenta ${entry.documentType} nije moguće izvesti dok se ne potvrdi pravilo predznaka.`);
  }
  assertSafeText(entry.invoiceNumber, "Broj fakture ili dokumenta", 100);
  if (!isValidDate(entry.invoiceDate)) fail("Datum fakture ili dokumenta nije ispravan.");
  const duplicateKey = entry.invoiceNumber.trim().toLocaleLowerCase("bs-BA");
  if (duplicateNumbers.has(duplicateKey)) fail(`Broj dokumenta ${entry.invoiceNumber} je duplikat.`);
  duplicateNumbers.add(duplicateKey);
  validatePartner(entry.partner, entry.documentType);
}

function periodCode(period: UinoPeriod) {
  return `${String(period.year).slice(-2)}${String(period.month).padStart(2, "0")}`;
}

function sarajevoTimestamp(date: Date) {
  if (Number.isNaN(date.getTime())) fail("Vrijeme generisanja nije ispravno.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Sarajevo", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}:${part("second")}` };
}

function header(company: UinoCompany, period: UinoPeriod, fileType: "1" | "2", sequence: number, generatedAt: Date) {
  const stamp = sarajevoTimestamp(generatedAt);
  return ["1", company.vatNumber, periodCode(period), fileType, String(sequence).padStart(2, "0"), stamp.date, stamp.time].join(";");
}

function addTotals(current: bigint[], next: bigint[]) {
  return current.map((value, index) => value + next[index]);
}

function trailer(totals: bigint[], count: number) {
  return ["3", ...totals.map(formatCents), String(count)].join(";");
}

function buildFiles(args: { company: UinoCompany; period: UinoPeriod; fileType: "1" | "2"; rows: PreparedRow[]; generatedAt: Date; maxBytes: number }) {
  const files: UinoExportFile[] = [];
  let sequence = 1;
  let chunk: PreparedRow[] = [];
  let chunkBytes = 0;
  let totals = Array.from({ length: args.fileType === "1" ? 9 : 11 }, () => 0n);

  const finalize = () => {
    if (sequence > 99) throw new UinoExportError("FILE_SIZE", "Izvoz zahtijeva više od 99 datoteka.");
    const headerLine = header(args.company, args.period, args.fileType, sequence, args.generatedAt);
    const trailerLine = trailer(totals, chunk.length);
    const content = [headerLine, ...chunk.map((row) => row.line), trailerLine].join(LINE_ENDING) + LINE_ENDING;
    const bytes = encoder.encode(content);
    if (bytes.byteLength > args.maxBytes) throw new UinoExportError("FILE_SIZE", "Jedna UINO stavka ne može stati u datoteku dozvoljene veličine.");
    const fileName = `${args.company.vatNumber}_${periodCode(args.period)}_${args.fileType}_${String(sequence).padStart(2, "0")}.csv`;
    files.push({ fileName, sequence, itemCount: chunk.length, content, bytes, totals: totals.map(formatCents) });
    sequence += 1;
    chunk = [];
    chunkBytes = 0;
    totals = totals.map(() => 0n);
  };

  for (const row of args.rows) {
    const candidateTotals = addTotals(totals, row.cents);
    const headerBytes = encoder.encode(header(args.company, args.period, args.fileType, sequence, args.generatedAt)).byteLength + 2;
    const trailerBytes = encoder.encode(trailer(candidateTotals, chunk.length + 1)).byteLength + 2;
    const candidateBytes = headerBytes + chunkBytes + row.lineBytes + 2 + trailerBytes;
    if (candidateBytes > args.maxBytes && chunk.length > 0) finalize();
    chunk.push(row);
    chunkBytes += row.lineBytes + 2;
    totals = addTotals(totals, row.cents);
  }
  finalize();
  return files;
}

function validateContext(company: UinoCompany, period: UinoPeriod) {
  if (period.status !== "ready_for_export") throw new UinoExportError("PERIOD_NOT_READY", "Period mora imati status ready_for_export prije izvoza.");
  if (period.companyId !== company.id) fail("Period ne pripada izabranoj firmi.");
  if (!isValidVatNumber(company.vatNumber)) fail("PDV broj firme mora imati 12 cifara.");
  if (period.year < 2000 || period.year > 2100 || period.month < 1 || period.month > 12) fail("Porezni period nije ispravan.");
}

export function generateKufExport(args: { company: UinoCompany; period: UinoPeriod; entries: UinoPurchaseEntry[]; generatedAt?: Date; maxBytes?: number }) {
  validateContext(args.company, args.period);
  const duplicates = new Set<string>();
  const code = periodCode(args.period);
  const rows = args.entries.map((entry, index): PreparedRow => {
    validateCommon(entry, args.company, args.period, duplicates);
    if (!isValidDate(entry.receivedDate)) fail("Datum prijema ili knjiženja nije ispravan.");
    if (Number(entry.receivedDate.slice(0, 4)) !== args.period.year || Number(entry.receivedDate.slice(5, 7)) !== args.period.month) fail("Datum prijema nije u poreznom periodu.");
    const cents = [
      toCents(entry.invoiceAmountExcludingVat, "KUF iznos bez PDV-a"), toCents(entry.invoiceAmountWithVat, "KUF iznos sa PDV-om"),
      toCents(entry.flatRateCompensation, "KUF paušalna naknada"), toCents(entry.inputVatAmount, "KUF ulazni PDV"),
      toCents(entry.deductibleInputVat, "KUF odbitni PDV"), toCents(entry.nonDeductibleInputVat, "KUF neodbitni PDV"),
      toCents(entry.inputVatField32, "KUF PDV polje 32"), toCents(entry.inputVatField33, "KUF PDV polje 33"), toCents(entry.inputVatField34, "KUF PDV polje 34"),
    ];
    const fields = ["2", code, String(index + 1), entry.documentType, entry.invoiceNumber, entry.invoiceDate, entry.receivedDate, entry.partner.name, entry.partner.address, entry.partner.vatNumber ?? "", entry.partner.jib ?? "", ...cents.map(formatCents)];
    const line = fields.join(";");
    return { line, lineBytes: encoder.encode(line).byteLength, cents };
  });
  return buildFiles({ company: args.company, period: args.period, fileType: "1", rows, generatedAt: args.generatedAt ?? new Date(), maxBytes: args.maxBytes ?? MAX_UINO_FILE_BYTES });
}

export function generateKifExport(args: { company: UinoCompany; period: UinoPeriod; entries: UinoSalesEntry[]; generatedAt?: Date; maxBytes?: number }) {
  validateContext(args.company, args.period);
  const duplicates = new Set<string>();
  const code = periodCode(args.period);
  const rows = args.entries.map((entry, index): PreparedRow => {
    validateCommon(entry, args.company, args.period, duplicates);
    if (Number(entry.invoiceDate.slice(0, 4)) !== args.period.year || Number(entry.invoiceDate.slice(5, 7)) !== args.period.month) fail("Datum fakture nije u poreznom periodu.");
    const cents = [
      toCents(entry.invoiceTotalAmount, "KIF ukupan iznos"), toCents(entry.internalInvoiceAmount, "KIF interna faktura"),
      toCents(entry.exportInvoiceAmount, "KIF izvoz"), toCents(entry.vatExemptSupplyAmount, "KIF oslobođene isporuke"),
      toCents(entry.taxableBaseRegistered, "KIF osnovica registrovani"), toCents(entry.outputVatRegistered, "KIF izlazni PDV registrovani"),
      toCents(entry.taxableBaseNonRegistered, "KIF osnovica neregistrovani"), toCents(entry.outputVatNonRegistered, "KIF izlazni PDV neregistrovani"),
      toCents(entry.outputVatField32, "KIF PDV polje 32"), toCents(entry.outputVatField33, "KIF PDV polje 33"), toCents(entry.outputVatField34, "KIF PDV polje 34"),
    ];
    const fields = ["2", code, String(index + 1), entry.documentType, entry.invoiceNumber, entry.invoiceDate, entry.partner.name, entry.partner.address, entry.partner.vatNumber ?? "", entry.partner.jib ?? "", ...cents.map(formatCents)];
    const line = fields.join(";");
    return { line, lineBytes: encoder.encode(line).byteLength, cents };
  });
  return buildFiles({ company: args.company, period: args.period, fileType: "2", rows, generatedAt: args.generatedAt ?? new Date(), maxBytes: args.maxBytes ?? MAX_UINO_FILE_BYTES });
}
