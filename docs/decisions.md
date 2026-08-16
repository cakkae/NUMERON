# Odluke

## 2026-08-16 — Pristup firmama

Aktivna firma je UI stanje. Izvor istine za pristup je Supabase RLS: korisnik može čitati firmu samo ako postoji njegov red u `company_members`. Zato promjena vrijednosti u browseru ne može dati pristup drugoj firmi.

## 2026-08-16 — Dvije role

Postoje samo `owner` i `client`. `owner` predstavlja vlasnika računovodstvenog servisa i njegovog knjigovođu; može imati više firmi. `client` vidi samo dodijeljenu firmu. Preuzimanje i dostava faktura zahtijevaju modul dokumenata i nisu dio Faze 1.

## 2026-08-16 — Dummy korisnici

Seed sadrži samo izmišljeni workspace i firme. Testne korisnike treba kreirati lokalno preko Supabase Auth-a, jer se ne smiju commitati lozinke, tajne ni stvarni korisnički podaci. Nakon toga se njihovi UUID-ovi mogu lokalno dodijeliti u `workspace_members` i `company_members`.

## 2026-08-16 — KUF minimum

KUF stavka u Fazi 2 sadrži partnera, broj i datum fakture te ukupni iznos. PDV broj je 12 cifara, a JIB 13 cifara. Period je `open` ili `locked`; RLS politika baze i UI zajedno sprječavaju izmjene stavki u zaključanom periodu.

## 2026-08-16 — Zajednička validacija KUF/KIF

KUF i KIF koriste isti validation engine. Tipovi dokumenata `01–09` nalaze se u jednoj konfiguraciji verzije `2023-01`. Status `ready_for_export` samo označava da period nema blokirajućih grešaka; CSV se u Fazi 3 ne generiše.
