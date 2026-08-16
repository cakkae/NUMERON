"use client";

import { useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { Button, Field, IconButton, Input, Select } from "@/components/ui/primitives";

export function PeriodDialog(props: { open: boolean; onClose: () => void; onCreate: (year: number, month: number) => Promise<void> }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  if (!props.open) return null;
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); await props.onCreate(year, month); props.onClose(); }
  return <div className="modal-layer"><button className="modal-backdrop" aria-label="Zatvori" onClick={props.onClose} /><div className="modal-card"><div className="drawer-header"><div className="modal-title-icon"><CalendarPlus size={20} /></div><div><span className="eyebrow">Porezna evidencija</span><h2>Novi period</h2></div><IconButton label="Zatvori" onClick={props.onClose}><X size={19} /></IconButton></div><form className="drawer-form" onSubmit={(event) => void submit(event)}><p className="modal-description">Otvorite mjesečni period za unos i kontrolu KUF/KIF evidencije.</p><div className="form-row"><Field label="Godina" required helper="Raspon 2000–2100."><Input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} required /></Field><Field label="Mjesec" required><Select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>)}</Select></Field></div><div className="drawer-actions"><Button type="button" variant="secondary" onClick={props.onClose}>Odustani</Button><Button>Otvori period</Button></div></form></div></div>;
}
