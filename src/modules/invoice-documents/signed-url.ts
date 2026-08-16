type SignedUrlAccess = {
  loadStoragePath(documentId: string): Promise<{ data: { storage_path: string } | null; error: { message: string } | null }>;
  signStoragePath(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
};

export async function createPrivateDocumentSignedUrl(access: SignedUrlAccess, documentId: string, expiresIn = 120) {
  const document = await access.loadStoragePath(documentId);
  if (document.error || !document.data) throw new Error("Dokument nije pronađen ili nije dostupan.");
  const signed = await access.signStoragePath(document.data.storage_path, expiresIn);
  if (signed.error || !signed.data) throw new Error(`Privremeni pristup dokumentu nije uspio: ${signed.error?.message ?? "nepoznata greška"}`);
  return { signedUrl: signed.data.signedUrl, expiresIn };
}
