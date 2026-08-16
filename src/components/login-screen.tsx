"use client";

import { useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button, Field, Input } from "@/components/ui/primitives";

export function LoginScreen(props: { loading: boolean; message: string; onSubmit: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <main className="login-page"><section className="login-brand"><div className="brand-mark large">N</div><span className="eyebrow light">Računovodstveni workspace</span><h1>Jasna evidencija.<br />Sigurno poslovanje.</h1><p>Upravljajte poreznim evidencijama više firmi iz jednog organizovanog radnog prostora.</p><div className="login-trust"><LockKeyhole size={18} /><span>Podaci svake firme zaštićeni su zasebnim pravilima pristupa.</span></div></section><section className="login-panel"><div className="login-card"><div className="mobile-login-logo"><div className="brand-mark">N</div><strong>NUMERON</strong></div><span className="eyebrow">Dobro došli</span><h2>Prijava u NUMERON</h2><p>Unesite pristupne podatke svog računovodstvenog workspacea.</p><form onSubmit={(event) => { event.preventDefault(); void props.onSubmit(email, password); }}><Field label="Email adresa" required><Input type="email" autoComplete="email" placeholder="ime@firma.ba" value={email} onChange={(event) => setEmail(event.target.value)} required /></Field><Field label="Lozinka" required><Input type="password" autoComplete="current-password" placeholder="Unesite lozinku" value={password} onChange={(event) => setPassword(event.target.value)} required /></Field><Button className="login-button" disabled={props.loading}>{props.loading ? "Prijava…" : "Prijavi se"}<ArrowRight size={17} /></Button>{props.message && <p className="form-error" role="alert">{props.message}</p>}</form><div className="login-security"><ShieldCheck size={16} /><span>Sigurna sesija i pristup ograničen po firmi</span></div></div></section></main>;
}
