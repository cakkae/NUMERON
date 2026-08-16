"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BookView } from "@/components/book-view";
import { DashboardView } from "@/components/dashboard-view";
import { ExportsView } from "@/components/exports-view";
import { LoginScreen } from "@/components/login-screen";
import { PartnersView } from "@/components/partners-view";
import { PeriodDialog } from "@/components/period-dialog";
import { PlaceholderView } from "@/components/placeholder-view";
import { useAccountingWorkspace } from "@/hooks/use-accounting-workspace";
import type { ViewKey } from "@/types/accounting";

export default function HomePage() {
  const workspace = useAccountingWorkspace();
  const [view, setView] = useState<ViewKey>("dashboard");
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);

  if (!workspace.userEmail || !workspace.activeCompany) return <LoginScreen loading={workspace.loading} message={workspace.message} onSubmit={workspace.signIn} />;

  const periodLabel = workspace.activePeriod ? `${String(workspace.activePeriod.month).padStart(2, "0")}/${workspace.activePeriod.year}` : "Period nije odabran";
  const content = view === "dashboard" ? <DashboardView company={workspace.activeCompany} period={workspace.activePeriod} purchaseCount={workspace.purchases.length} salesCount={workspace.sales.length} errorCount={workspace.validationStatus.errorCount} errors={workspace.validationStatus.errors} onNavigate={setView} onReady={() => void workspace.setPeriodStatus("ready_for_export")} onTogglePeriod={() => void workspace.setPeriodStatus(workspace.activePeriod?.status === "open" ? "locked" : "open")} /> : view === "kuf" ? <BookView title="KUF" entries={workspace.purchases} partners={workspace.partners} periodIsOpen={workspace.periodIsOpen} periodLabel={periodLabel} errors={workspace.kufErrors} onSave={(form, id) => workspace.saveEntry("purchase_entries", form, id)} onMutate={(id, action) => void workspace.mutateEntry("purchase_entries", id, action)} /> : view === "kif" ? <BookView title="KIF" entries={workspace.sales} partners={workspace.partners} periodIsOpen={workspace.periodIsOpen} periodLabel={periodLabel} errors={workspace.kifErrors} onSave={(form, id) => workspace.saveEntry("sales_entries", form, id)} onMutate={(id, action) => void workspace.mutateEntry("sales_entries", id, action)} /> : view === "partners" ? <PartnersView partners={workspace.partners} onCreate={workspace.createPartner} /> : view === "exports" ? <ExportsView company={workspace.activeCompany} period={workspace.activePeriod} purchases={workspace.purchases} sales={workspace.sales} archives={workspace.exportArchives} onRefresh={workspace.refreshExports} onMessage={workspace.setMessage} /> : <PlaceholderView title={view === "documents" ? "Dokumenti" : "Postavke"} />;

  return <><AppShell view={view} onNavigate={setView} companies={workspace.companies} activeCompanyId={workspace.activeCompanyId} onCompanyChange={workspace.setActiveCompanyId} periods={workspace.periods} activePeriodId={workspace.activePeriodId} onPeriodChange={workspace.setActivePeriodId} onCreatePeriod={() => setPeriodDialogOpen(true)} activePeriod={workspace.activePeriod} userEmail={workspace.userEmail} onSignOut={() => void workspace.signOut()}>{content}</AppShell><PeriodDialog open={periodDialogOpen} onClose={() => setPeriodDialogOpen(false)} onCreate={workspace.createPeriod} />{workspace.message && <div className="toast" role="alert"><span>{workspace.message}</span><button aria-label="Zatvori poruku" onClick={() => workspace.setMessage("")}><X size={17} /></button></div>}</>;
}
