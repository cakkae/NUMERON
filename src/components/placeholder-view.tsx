import { Construction } from "lucide-react";

export function PlaceholderView({ title }: { title: string }) {
  return <div className="view-stack"><div className="page-heading"><div><span className="eyebrow">NUMERON</span><h1>{title}</h1><p>Ovaj modul nije dio trenutne faze.</p></div></div><section className="panel placeholder-panel"><span className="metric-icon slate"><Construction size={26} /></span><h2>Modul dolazi u narednoj fazi</h2><p>Trenutni redesign ne dodaje nove poslovne funkcije.</p></section></div>;
}
