"use client";

import { useState } from "react";
import { CalendarPlus, X } from "lucide-react";

export function PeriodDialog(props: { open: boolean; onClose: () => void; onCreate: (year: number, month: number) => Promise<void> }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  if (!props.open) return null;
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); await props.onCreate(year, month); props.onClose(); }
  return <div className="modal-layer"><button className="modal-backdrop" aria-label="Zatvori" onClick={props.onClose} /><div className="modal-card"><div className="drawer-header"><div className="modal-title-icon"><CalendarPlus size={21} /></div><div><span className="eyebrow">Porezna evidencija</span><h2>Novi period</h2></div><button className="icon-button" aria-label="Zatvori" onClick={props.onClose}><X size={20} /></button></div><form className="drawer-form" onSubmit={(event) => void submit(event)}><div className="form-row"><label><span>Godina</span><input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} required /></label><label><span>Mjesec</span><select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>)}</select></label></div><div className="drawer-actions"><button type="button" className="button secondary" onClick={props.onClose}>Odustani</button><button className="button primary">Otvori period</button></div></form></div></div>;
}
