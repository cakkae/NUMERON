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

## 2026-08-16 — UI workspace

UI je podijeljen na shell komponente i poslovni workspace hook. Dashboard je pregled, KUF/KIF i Partneri su odvojeni radni pogledi, a forme se otvaraju u desnom panelu. Supabase upiti i validation engine ostaju izvan prezentacijskih komponenti.

## 2026-08-16 — UINO model bez izmišljanja PDV-a

UINO monetarna polja su nullable i unose se ručno; aplikacija ne računa PDV po fiksnoj stopi. Legacy `amount` ostaje radi kompatibilnosti i zrcali samo ukupni iznos (`invoice_amount_with_vat` za KUF, `invoice_total_amount` za KIF). Stare KUF stavke dobijaju `received_date = invoice_date` kao najmanju sigurnu migracijsku pretpostavku jer prethodni model nije čuvao datum prijema. Identifikatori partnera mogu biti prazni za neobveznika, a tip 04 zahtijeva UINO vrijednosti od 12 odnosno 13 nula. Detaljno mapiranje i otvorene potvrde su u `docs/uino-field-mapping.md`.

## 2026-08-16 — Server-side UINO izvoz i privatna arhiva

CSV se generiše isključivo u server API ruti iz RLS-zaštićenih podataka, nikada iz HTML tabele. Redoslijed stavki je determinističan: KUF po datumu prijema pa ID-u, KIF po datumu fakture pa ID-u. Svaki fajl je UTF-8 sa CRLF redovima, SHA-256 hashom i strogim limitom od 5.000.000 bajtova; pri podjeli svaki dio dobija vlastiti zaglavni i zbirni slog te sekvencu `01`–`99`. CSV se čuva u privatnom `uino-exports` Storage bucketu, a nepromjenjivi metapodaci ostaju u `uino_exports`. Tipovi 06 i 07 se ne izvoze dok se poslovno ne potvrdi pravilo predznaka. Sva monetarna polja moraju imati eksplicitnu vrijednost prije izvoza; generator nikada ne dopisuje nulu niti obračunava PDV.

## Faza 5A — privatni dokumenti i ručno knjiženje

- Limit od 15 MB tumači se kao 15.000.000 bajtova, jednako ograničenju privatnog Supabase Storage bucketa.
- MIME tip se ne prihvata samo iz browser metapodataka: server provjerava PDF/JPEG/PNG/WebP potpis u sadržaju i zahtijeva podudaranje s prijavljenim tipom. HEIC ostaje eksplicitno nepodržan.
- Storage putanja je `<company_id>/<random_uuid>` bez originalnog naziva. Originalni naziv ostaje samo u zaštićenom zapisu baze.
- Pregled se otvara signed URL-om koji traje 120 sekundi. Browser ne dobija service-role ključ niti trajnu javnu putanju.
- KUF/KIF i period nikada se ne određuju automatski. Korisnik ih bira, ručno popunjava postojeću formu i potvrđuje dugmetom `Spremi i potvrdi`.
- Potvrda, kreiranje stavke i obostrano povezivanje izvršavaju se u jednoj SQL funkciji/transakciji. Potvrđene stavke nastale iz dokumenta nije moguće brisati ili prevezati; ispravke se rade postojećim kontrolisanim tokom bez gubitka izvornog dokumenta.
- Odbacivanje je terminalno i ne briše storage objekat. Brisanje storage objekta dozvoljeno je uploaderu samo za čišćenje neuspjelog uploada prije evidentiranja u tabeli.
