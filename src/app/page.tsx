"use client";

import { FormEvent, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Company = { id: string; name: string; vat_number: string };

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState("");
  const [message, setMessage] = useState("");

  async function loadCompanies() {
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, vat_number")
      .eq("status", "active")
      .order("name");

    if (error) {
      setMessage(error.message);
      return;
    }

    const visibleCompanies = data ?? [];
    setCompanies(visibleCompanies);
    setActiveCompanyId((current) => current || visibleCompanies[0]?.id || "");
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void loadCompanies();
    });
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("");
    await loadCompanies();
  }

  const activeCompany = companies.find((company) => company.id === activeCompanyId);

  if (!activeCompany) {
    return <main className="card"><h1>NUMERON</h1><p>Prijavite se za pristup dodijeljenim firmama.</p><form onSubmit={signIn}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Lozinka<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button type="submit">Prijava</button>{message && <p role="alert">{message}</p>}</form></main>;
  }

  return <main className="card"><header><div><h1>{activeCompany.name}</h1><p>PDV: {activeCompany.vat_number}</p></div><label>Aktivna firma<select value={activeCompanyId} onChange={(event) => setActiveCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label></header><section><h2>Pregled</h2><p>Prikazani su samo podaci aktivne, dodijeljene firme. KUF/KIF, fakture i dostava dokumenata još nisu dio ove faze.</p></section></main>;
}
