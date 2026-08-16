export type ReviewLedger = "kuf" | "kif";

export function validateDocumentConfirmation(input: {
  document: { companyId: string; status: string; linkedEntryId: string | null };
  activeCompanyId: string;
  period: { id: string; companyId: string; status: string } | null;
  ledger: string | null;
}) {
  const errors: string[] = [];
  if (input.document.companyId !== input.activeCompanyId) errors.push("Dokument ne pripada aktivnoj firmi.");
  if (input.document.status === "confirmed" || input.document.linkedEntryId) errors.push("Dokument je već potvrđen.");
  if (input.document.status === "rejected") errors.push("Odbačeni dokument nije moguće knjižiti.");
  if (input.ledger !== "kuf" && input.ledger !== "kif") errors.push("Ručno odaberite KUF ili KIF.");
  if (!input.period) errors.push("Odaberite porezni period.");
  else {
    if (input.period.companyId !== input.activeCompanyId) errors.push("Porezni period ne pripada aktivnoj firmi.");
    if (input.period.status !== "open") errors.push("Zaključan period ne dozvoljava knjiženje.");
  }
  return errors;
}
