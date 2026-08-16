# NUMERON

Cloud aplikacija za računovodstvene servise: više firmi, KUF/KIF evidencije, validacija i UINO CSV izvoz.

Detaljan plan razvoja je u [e-kuf-e-kif-saas-plan.md](e-kuf-e-kif-saas-plan.md).

## Lokalno pokretanje

1. Kopirati `.env.example` u `.env.local` i unijeti Supabase URL i anon key.
2. Primijeniti SQL iz `supabase/migrations/` i, po želji, `supabase/seed.sql` na lokalni Supabase projekt.
3. Pokrenuti `npm install` pa `npm run dev`.

Trenutno su dostupni prijava, izbor dodijeljene firme, porezni periodi, partneri, KUF/KIF unos i zajednička validacija. CSV izvoz nije implementiran.

Radni prostor koristi odvojene Dashboard, KUF, KIF i Partneri poglede. Unos se otvara u desnom panelu, dok su aktivna firma, porezni period i status stalno dostupni u gornjoj traci.

## Pristup

Postoje samo dvije role:

- `owner` je vlasnik računovodstvenog servisa i ujedno njegov knjigovođa. Može imati pristup većem broju klijentskih firmi.
- `client` ima pristup samo svojoj dodijeljenoj firmi i njenom pregledu. Preuzimanje i dostava faktura bit će dodani uz modul dokumenata; nisu dio Faze 1.
