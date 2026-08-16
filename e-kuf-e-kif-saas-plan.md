# e-KUF / e-KIF Cloud SaaS — plan proizvoda i razvoja

> Cilj: napraviti cloud aplikaciju za računovodstveni servis koja vodi KUF i KIF za više klijentskih firmi, provjerava podatke i jednim klikom generiše UINO-kompatibilne CSV fajlove za e-Porezi.

## 1. Problem koji rješavamo

Trenutni `.xls` fajl radi kao kombinacija ručnog unosa, formula i dugmadi za generisanje CSV-a. To nosi nekoliko problema:

- lokalni fajlovi, putanje i Excel makroi;
- mogućnost da se podaci jedne firme pomiješaju s drugom;
- veliki broj unaprijed popunjenih formula i skrivenih podešavanja;
- zastarjela šifra tipova dokumenta (stari fajl navodi `01–05`, a UINO izmjenom koristi `01–09`);
- greške se otkrivaju tek prilikom izvoza ili uvoza na UINO portal;
- nema jasne arhive ko je izmijenio podatak, kada i za koju firmu.

Aplikacija nije zamjena za kompletno finansijsko knjigovodstvo. Ona je specijalizovan, brz i pouzdan alat za KUF/KIF evidencije, provjeru i UINO izvoz.

## 2. Korisnici i način rada

### Glavni korisnik

Računovodstveni servis ima jedan nalog i upravlja s više firmi-klijenata. Nakon prijave korisnik bira aktivnu firmu, pa zatim porezni period.

```text
Računovodstveni servis / workspace
├── NovaTech Solutions d.o.o.
├── Ekonomika d.o.o.
└── Klijent 3 d.o.o.
```

Primjer zaglavlja aplikacije:

```text
Ekonomika d.o.o. (PDV: 209934990006) ▼   Period: 01/2026 ▼
```

Sve što korisnik vidi ili mijenja pripada aktivnoj firmi: partneri, dokumenti, KUF, KIF, porezni periodi, CSV fajlovi i audit zapis.

### Role

| Rola | Ovlasti |
|---|---|
| Vlasnik servisa | Dodaje firme, dodjeljuje korisnike, vidi sve firme i postavke. |
| Knjigovođa | Vidi i uređuje samo firme koje mu je vlasnik dodijelio. |
| Klijent | Opcionalno: vidi samo svoju firmu, dostavlja dokumente i prati status. |
| Pregled | Može pregledati i preuzeti izvještaje, bez izmjena. |

## 3. MVP scope

Prva verzija mora savršeno raditi sljedeće:

1. Prijava korisnika, računovodstveni servis i više firmi.
2. Kreiranje firme sa PDV brojem, nazivom, adresom i statusom.
3. Otvaranje i zatvaranje poreznog perioda.
4. Partneri/dobavljači/kupci sa nazivom, adresom, PDV brojem i JIB-om.
5. Brz unos, izmjena, filtriranje i pretraga KUF i KIF stavki.
6. Automatski obračun relevantnih PDV iznosa.
7. Validacija prije izvoza.
8. Generisanje e-Nabavke i e-Isporuke CSV fajlova.
9. Arhiva dokumenata i ranije generisanih CSV fajlova.
10. Audit log: korisnik, firma, vrijeme, radnja i izmijenjene vrijednosti.

### Izvan MVP-a

Ovo namjerno odgađamo za kasnije faze:

- automatska prijava/učitavanje na e-Porezi portal;
- čuvanje kvalifikovanog elektronskog certifikata;
- obračun plata, glavna knjiga, skladište i kompletan ERP;
- automatsko OCR knjiženje PDF faktura bez potvrde korisnika;
- integracije sa drugim knjigovodstvenim programima;
- online naplata pretplate klijentima.

## 4. UINO pravila koja aplikacija implementira

CSV engine je najvažniji poslovni dio aplikacije. Mora biti implementiran kao verzionisan modul, sa automatskim testovima i bez oslanjanja na Excel formule.

Za svaki izvoz aplikacija provjerava:

- KUF i KIF se izvoze u odvojenim fajlovima;
- fajl je CSV, kodiran u UTF-8, a separator je `;`;
- iznosi su zaokruženi na dvije decimale i koriste tačku kao decimalni separator;
- CSV ima obavezni zaglavni slog, slogove stavki i završni zbirni slog;
- PDV broj, period, tip fajla i broj fajla se međusobno podudaraju;
- pojedinačni fajl ne prelazi 5 MB; ako prelazi, sistem ga dijeli na više fajlova;
- KUF koristi tip fajla `1`, a KIF tip fajla `2`;
- podržani su tipovi dokumenata `01–09`, uključujući izmjene iz 2023.

Prije produkcije treba testirati najmanje jedan KUF i jedan KIF CSV kroz UINO testni/stvarni postupak. Naziv fajla i svako rubno pravilo zaključuju se prema važećoj službenoj specifikaciji i uspješnom testnom uvozu.

Službeni izvori:

- [UINO: e-Porezi i tehničke upute](https://www.uino.gov.ba/portal/hr/e-usluge-hr/e-portal-2/)
- [Tehnička uputa za dostavljanje knjigovodstvenih evidencija](https://www.uino.gov.ba/portal/wp-content/uploads/OGLASNA-PLOCA/8-E-PROPISI/1-ePDV/3-Tehnicko-uputstvo-Dostavljanje-podataka-iz-knjigovodstvenih-evidencija.pdf)
- [Izmjena i dopuna tehničke upute iz 2023.](https://www.uino.gov.ba/portal/wp-content/uploads/OGLASNA-PLOCA/8-E-PROPISI/1-ePDV/3-3-HR-Tehnicko-Upustvo-o-Izmjenama-i-dopunama-tehnickog-uputstvo-o-podnosenju-knjigovstvenih-evidencija.pdf)

## 5. Predloženi tehnički stack

| Sloj | Tehnologija | Namjena |
|---|---|---|
| Aplikacija | Next.js + TypeScript | Frontend, server-side API i poslovna logika u jednom projektu. |
| UI | Tailwind CSS + shadcn/ui | Brze, konzistentne forme, dijalozi i tabele. |
| Baza | PostgreSQL preko Supabasea | Pouzdani relacijski podaci, migracije i upiti. |
| Prijava i ovlasti | Supabase Auth + Row Level Security | Siguran pristup po korisniku, workspaceu i firmi. |
| Fajlovi | Supabase Storage | PDF fakture, import fajlovi i generisani CSV-ovi. |
| Validacija | Zod + TypeScript | Ista pravila na formi i na serveru. |
| CSV | Vlastiti TypeScript export modul | Potpuna kontrola UINO formata i testova. |
| Monitoring | Sentry | Praćenje grešaka u produkciji. |
| Hosting | Vercel + Supabase | Staging, production i jednostavan deployment. |
| CI/CD | GitHub Actions | Testovi, provjera koda i automatski deployment. |

### Zašto ovaj stack

- Brz je za MVP, bez održavanja vlastitih servera.
- PostgreSQL je pravi relacijski model za firme, periode, stavke i audit log.
- Može početi s tri firme, a bez promjene arhitekture rasti na stotine firmi.
- Sve kritične CSV operacije rade se server-side, nikada u browseru.
- Nije vezan za Excel ili Windows.

## 6. Arhitektura i izolacija firmi

Svaka poslovna tabela sadrži `workspace_id` i `company_id`. Aplikacija nikada ne prihvata `company_id` samo na osnovu vrijednosti iz browsera; server provjerava da prijavljeni korisnik ima pravo pristupa.

```text
Browser
  → Next.js aplikacija / server API
    → provjera korisnika i aktivne firme
      → PostgreSQL + Row Level Security
      → Storage za dokumente i CSV fajlove
      → CSV generator
```

### Osnovne tabele

| Tabela | Svrha |
|---|---|
| `workspaces` | Računovodstveni servis. |
| `workspace_members` | Korisnici i njihove globalne role u servisu. |
| `companies` | Klijentske firme, PDV broj i poslovni podaci. |
| `company_members` | Pristup pojedinačnim firmama. |
| `tax_periods` | Period, status: otvoren, spreman, zaključen. |
| `partners` | Kupci i dobavljači po firmi. |
| `purchase_entries` | KUF stavke. |
| `sales_entries` | KIF stavke. |
| `attachments` | PDF i drugi dokumenti povezani sa stavkom. |
| `exports` | CSV verzije, hash, period, status i vrijeme izvoza. |
| `audit_events` | Ko je i kada napravio, izmijenio ili obrisao podatak. |

### Sigurnosna pravila

- Row Level Security je uključen na svim poslovnim tabelama.
- Korisnik smije čitati/mijenjati samo firme koje su mu dodijeljene.
- PDV broj, JIB i finansijski podaci se ne loguju u alatima za praćenje grešaka u punom obliku.
- Dokumenti se čuvaju u privatnim storage bucketima; pristup ide preko vremenski ograničenih linkova.
- CSV se ne može generisati za zaključan period bez eksplicitnog ponovnog otvaranja i audit zapisa.
- Brisanje se u pravilu radi kao arhiviranje; evidencije i izvozi se ne gube.
- Produkcija ima dnevni backup baze i zasebnu politiku backupa storage fajlova.

## 7. UX i ekrani

### Glavna navigacija

```text
Pregled | KUF | KIF | Partneri | Dokumenti | Izvozi | Postavke firme
```

### Ključni ekrani

1. **Izbor firme** — pretraga i lista firmi kojima korisnik ima pristup.
2. **Pregled perioda** — broj KUF/KIF stavki, ukupni iznosi, otvorene greške i status izvoza.
3. **KUF tabela** — brzi unos, kopiranje prethodne stavke, partner autocomplete, prilog dokumenta.
4. **KIF tabela** — identičan princip, prilagođen poljima isporuka.
5. **Validacija** — čitljiva lista grešaka s direktnim linkom na stavku koju treba popraviti.
6. **Izvozi** — pregled prije kreiranja, dugme `Generiši e-KUF i e-KIF`, download, historija verzija.
7. **Administracija** — firme, korisnici i ovlasti.

### Zaštita od ljudske greške

- Aktivna firma i PDV broj stalno su vidljivi u zaglavlju.
- Promjena firme pita korisnika za potvrdu ako postoje nesnimljene izmjene.
- Period je jasno prikazan i datum van perioda daje upozorenje.
- Dupli broj fakture i dupli dokument se označavaju prije spremanja.
- Izvoz prikazuje firmu, PDV broj, period, broj stavki i sume prije kreiranja CSV-a.

## 8. Roadmap — šest sedmica

Pretpostavka: fokusiran razvoj jednog proizvoda, sa redovnim pregledom stvarnog rada računovodstvenog servisa.

### Sedmica 0 — odluke i uzorci (2–3 dana)

- Potvrditi tačan MVP i korisničke role.
- Uzeti 2–3 stvarna anonimizirana mjeseca KUF/KIF podataka.
- Napraviti tabelu preslikavanja: postojeći Excel stupac → novo polje → UINO CSV polje.
- Definisati CSV acceptance test sa UINO portalom.
- Potvrditi gdje će se čuvati podaci i dokumenti.

**Isporuka:** odobrena specifikacija, UX wireframe i CSV test plan.

### Sedmica 1 — temelj aplikacije

- Kreirati repozitorij, staging i production okruženje.
- Next.js aplikacija, Supabase projekt, migracije i osnovni CI.
- Login, workspace, firme, korisnici i role.
- Row Level Security politike i audit osnova.
- Izbor aktivne firme.

**Isporuka:** korisnik se prijavljuje, vidi samo dodijeljene firme i može ih izabrati.

### Sedmica 2 — partneri, periodi i KUF

- Partneri sa provjerom PDV/JIB broja.
- Otvaranje perioda.
- KUF unos, izmjena, pretraga, filteri i izračuni.
- Automatsko spremanje i audit događaji.
- Prve poslovne validacije.

**Isporuka:** kompletan KUF za jednu firmu i period može se unijeti bez Excela.

### Sedmica 3 — KIF i validacijski engine

- KIF unos i obračunska pravila.
- Podrška dokument tipovima `01–09`.
- Detekcija grešaka: period, obavezna polja, PDV/JIB, duplikati, iznosi i tip dokumenta.
- Dashboard perioda: broj stavki, iznosi i greške.

**Isporuka:** kompletne KUF/KIF evidencije sa jasnim statusom spremnosti.

### Sedmica 4 — UINO CSV export

- Implementirati KUF i KIF CSV mapping.
- Zaglavni, stavkovni i zbirni slogovi.
- UTF-8, `;`, dvije decimale, naziv fajla i limit od 5 MB.
- Generisanje oba fajla i trajna arhiva izvoza.
- Jedinični i integracijski testovi za tipične i rubne slučajeve.

**Isporuka:** CSV fajlovi spremni za testni UINO upload.

### Sedmica 5 — import, dokumenti i stvarni paralelni rad

- Uvoz strukturiranog Excel/CSV fajla u KUF/KIF.
- Upload i pregled PDF priloga.
- Testiranje s jednim stvarnim periodom paralelno s postojećim Excel procesom.
- Usklađivanje zbirnih iznosa i rješavanje razlika.

**Isporuka:** jedan kompletan period provjeren od unosa do UINO CSV-a.

### Sedmica 6 — stabilizacija i produkcija

- Korekcije na osnovu rada računovođe.
- Kontrola pristupa, backup, monitoring i recovery procedura.
- Kratko uputstvo za korisnika i administraciju firmi.
- Produkcijski deployment i kontrolisano puštanje u rad.

**Isporuka:** produkcijski MVP spreman za tri ili više firmi.

## 9. Kriteriji prihvatanja prije produkcije

MVP je spreman tek kada:

- korisnik servisa može kreirati i birati više firmi;
- korisnik bez ovlasti ne može vidjeti ni pogoditi podatke druge firme;
- KUF i KIF se mogu unijeti bez Excel makroa;
- sve UINO validacijske greške su čitljive i vezane uz tačnu stavku;
- generisana dva CSV fajla prolaze dogovoreni UINO test;
- zbirni iznosi se podudaraju s ručno provjerenim primjerom;
- svaka izmjena i svaki izvoz imaju audit zapis;
- backup i vraćanje podataka su testirani;
- najmanje jedan stvarni porezni period je uspješno urađen paralelno sa starim procesom.

## 10. Rizici i način rješavanja

| Rizik | Kontrola |
|---|---|
| UINO promijeni specifikaciju | CSV pravila su u zasebnom verzionisanom modulu; pratiti UINO objave i testirati promjenu. |
| Pogrešan automatski PDV obračun | Jasna pravila, testovi i ručno odobravanje prije izvoza. |
| Miješanje podataka firmi | `company_id` svuda, server-side provjera i RLS politike. |
| Nepotpuni podaci iz starog Excela | Import daje izvještaj grešaka; ništa ne izvozi dok nije potvrđeno. |
| Prevelik scope | MVP ostaje samo KUF/KIF + export; ERP i OCR ostaju u fazi 2. |
| Gubitak podataka/dokumenata | Backupi baze, storage backup politika i audit log. |

## 11. Faza 2 nakon uspješnog MVP-a

- OCR pomoćnik za čitanje PDF fakture uz potvrdu korisnika.
- Automatski import iz drugih računovodstvenih sistema.
- Klijentski portal za dostavljanje ulaznih faktura.
- Notifikacije o roku predaje i nedostajućim dokumentima.
- PDF/Excel izvještaji po firmi i periodu.
- Komercijalni planovi, naplata i self-service registracija.
- Dodatne računovodstvene evidencije samo ako stvarni korisnici to traže.

## 12. Prva konkretna naredna akcija

Prvo treba napraviti mali projektni dokument sa tri stvari:

1. Anonimizirani uzorci stvarnih KUF i KIF podataka za dvije do tri firme.
2. Definitivna tabela preslikavanja Excel → aplikacija → UINO CSV.
3. Wireframe pet najvažnijih ekrana: izbor firme, pregled perioda, KUF, KIF i izvoz.

Tek nakon toga kreće implementacija Sedmice 1.

## 13. Identitet projekta i Git preporuka

### Preporučeni radni naziv

Za sada koristiti jednostavan i opisni naziv, bez pokušaja da odmah zaključimo javni brend:

| Stavka | Preporuka |
|---|---|
| Naziv repozitorija | `NUMERON` |
| Lokalni folder | `NUMERON` |
| GitHub organizacija | GitHub nalog `cakkae`; kasnije zasebna organizacija ako bude potrebna |
| Naziv aplikacije u kodu | `NUMERON` |
| Radni proizvodni naziv | `NUMERON` *(provjeriti dostupnost domene i žiga prije javne upotrebe)* |
| Primarna domena kasnije | birati tek poslije provjere brenda; ne vezati kod za domenu |

`NUMERON` je radni brend za proizvod koji olakšava porezne evidencije. Kratak je, profesionalan i nije ograničen samo na KUF/KIF. Prije javnog lansiranja obavezno provjeriti dostupnost željene domene i žiga u BiH i ciljnim tržištima.

### Git strategija

Za mali tim koristiti jednostavan **trunk-based** tok rada:

```text
main                         → uvijek stabilna, deployable verzija
codex/phase-1-foundation     → trenutni veći radni dio
codex/feature-company-access → jedna funkcionalna cjelina
codex/fix-csv-rounding       → hitna ispravka
```

- `main` se ne uređuje direktno.
- Svaka funkcionalna cjelina ima vlastiti branch.
- Branch se spaja tek nakon testova i pregleda izmjena.
- Za početak ne koristiti `develop` branch; nepotrebno usporava mali projekat.
- Tagovi: `v0.1.0-foundation`, `v0.2.0-kuf-kif`, `v0.3.0-csv-export`, `v1.0.0`.

### Commit konvencija

```text
feat(companies): add company switcher
feat(auth): enforce company membership policies
fix(csv): use dot as decimal separator
test(export): cover KUF trailing record totals
docs: add UINO field mapping
chore: configure CI checks
```

Nikada ne commitati `.env`, Supabase service key, privatne fakture, stvarne PDV/JIB brojeve ili generisane produkcijske CSV fajlove. Commitati samo `.env.example` sa imenima potrebnih varijabli.

### Gdje staviti stvarne primjere faktura i Excel fajlova

Stvarne dokumente **ne stavljati u Git** i ne slati u javni GitHub repozitorij. Držati ih lokalno, u root folderu projekta, ali potpuno ignorisano od Git-a:

```text
NUMERON/
├── private-fixtures/                 # lokalno; nikada nije commitano
│   ├── README.md                      # opis bez osjetljivih podataka
│   ├── raw/                           # originalni XLS/PDF/CSV fajlovi
│   │   ├── firma-a/
│   │   │   └── 2026-01/
│   │   ├── firma-b/
│   │   └── firma-c/
│   ├── redacted/                      # anonimizirani primjeri za lokalni test
│   └── expected/                      # ručno potvrđeni očekivani CSV rezultati
├── tests/
│   └── fixtures/                      # samo potpuno izmišljeni, commitani podaci
└── docs/
    └── reference/                     # specifikacije i prazni templatei
```

U `.gitignore` dodati najmanje:

```gitignore
# Stvarni računovodstveni podaci — nikada u Git
/private-fixtures/raw/
/private-fixtures/redacted/
/private-fixtures/expected/
/private-fixtures/*.xls
/private-fixtures/*.xlsx
/private-fixtures/*.csv
/private-fixtures/*.pdf
```

`private-fixtures/README.md` može ostati u Git-u samo ako ne sadrži stvarne podatke. U njemu navesti strukturu i poruku: "Ovaj folder je lokalni i sadrži povjerljive podatke; ne commitati sadržaj." Za automatizovane testove koristiti samo `tests/fixtures/` sa potpuno dummy firmama, izmišljenim PDV/JIB brojevima i izmišljenim fakturama.

## 14. Operativni plan za Codex agenta

Ovo je redoslijed za razvoj. Svaka faza je zaseban Codex zadatak/branch. Agent ne smije prelaziti u sljedeću fazu bez eksplicitne upute korisnika i bez prolaska kriterija završetka.

### Pravila za svaki agent zadatak

1. Prije izmjene pročitati `README.md`, `AGENTS.md` i relevantne postojeće fajlove.
2. Raditi samo ono što je navedeno u scopeu trenutne faze.
3. Ne dodavati nove pakete ako postojeće rješenje pokriva potrebu; obrazložiti svaki novi paket.
4. Ne unositi stvarne podatke firmi, PDV brojeve, JIB-ove ili fakture u testove i Git.
5. Za poslovna UINO pravila pisati test prije ili zajedno s implementacijom.
6. Nakon izmjena pokrenuti lint, typecheck i relevantne testove.
7. U završnom odgovoru agenta navesti: izmijenjene fajlove, izvršene testove, ograničenja i sljedeći mali korak.
8. Nikada ne implementirati automatsku predaju na e-Porezi niti rukovati certifikatom bez zasebne, eksplicitne odluke.

### Faza 0 — specifikacija i projektni ugovor

**Cilj:** ukloniti nejasnoće prije koda.

**Agent radi:**

- kreira `README.md` sa ciljem, scopeom i lokalnim pokretanjem;
- kreira `AGENTS.md` sa pravilima iz ovog dokumenta;
- kreira `docs/` strukturu: `architecture.md`, `uino-csv-spec.md`, `field-mapping.md`, `decisions.md`;
- prenosi službena UINO pravila u tabelu: polje, KUF/KIF, izvor, format, obaveznost, validacija;
- dokumentuje svaku pretpostavku pod oznakom `TODO: potvrditi`.

**Agent ne radi:** ne kreira UI, bazu, Supabase projekt niti CSV generator.

**Kriterij završetka:** postoje jasno navedeni MVP scope, zabrane, data model nacrt i lista otvorenih poslovnih pitanja.

**Copy/paste prompt:**

```text
Implementiraj samo Fazu 0 iz e-kuf-e-kif-saas-plan.md. Kreiraj dokumentaciju i AGENTS.md, bez aplikacijskog koda, paketa, baze ili deploya. Sve UINO pretpostavke jasno označi kao TODO dok nisu potvrđene službenim testnim uploadom. Na kraju provjeri markdown linkove i sažmi otvorena pitanja.
```

### Faza 1 — temelj, multi-company pristup i sigurnost

**Cilj:** sigurno postaviti aplikaciju tako da su firme potpuno izolovane.

**Agent radi:**

- inicijalizira Next.js + TypeScript projekat;
- postavlja lint, formatter, typecheck i test runner;
- dodaje Supabase konfiguraciju bez tajni;
- piše SQL migracije za `workspaces`, `workspace_members`, `companies`, `company_members` i `audit_events`;
- uključuje RLS na svakoj tabeli i piše politike pristupa;
- dodaje seed podatke sa izmišljenim firmama;
- implementira prijavu, izbor aktivne firme i osnovni dashboard;
- dodaje test koji dokazuje da korisnik firme A ne može pročitati firmu B.

**Agent ne radi:** KUF/KIF, CSV, import, PDF upload, naplatu, OCR ili produkcijski deployment.

**Kriterij završetka:** dva testna korisnika vide samo dodijeljene firme; promjena firme ažurira sve prikazane podatke; RLS testovi prolaze.

**Copy/paste prompt:**

```text
Implementiraj samo Fazu 1 iz e-kuf-e-kif-saas-plan.md u branchu codex/phase-1-foundation. Napravi Next.js/TypeScript temelj, Supabase SQL migracije, multi-company RLS, seed podatke, autentikaciju i izbor aktivne firme. Ne implementiraj KUF, KIF, CSV, import, PDF, OCR ili deploy. Dodaj testove koji dokazuju izolaciju firmi. Pokreni lint, typecheck i testove prije završetka.
```

### Faza 2 — porezni periodi, partneri i KUF

**Cilj:** omogućiti računovođi da za izabranu firmu vodi KUF bez Excela.

**Agent radi:**

- dodaje `tax_periods`, `partners` i `purchase_entries` migracije;
- pravi kreiranje/otvaranje/zatvaranje perioda;
- pravi partner autocomplete i validaciju formata PDV/JIB;
- pravi KUF tabelu, unos, izmjenu, brisanje/arhiviranje, pretragu i filtere;
- implementira samo jasno potvrđena pravila izračuna;
- zapisuje audit događaj za svaku promjenu;
- dodaje testove za period, partnera, duplikat i izračun.

**Agent ne radi:** KIF, UINO CSV, napredni import i OCR.

**Kriterij završetka:** računovođa može unijeti KUF stavke za više firmi i periode; ne može mijenjati zaključan period; podaci ostaju izolovani po firmi.

**Copy/paste prompt:**

```text
Implementiraj samo Fazu 2 iz plana. Dodaj periode, partnere i kompletan KUF CRUD za aktivnu firmu. Zaštiti zaključane periode, dodaj audit log i testove za izolaciju firmi, validaciju i izračune. Ne implementiraj KIF, CSV, import, PDF ili OCR.
```

### Faza 3 — KIF i zajednički validation engine

**Cilj:** kompletirati unos isporuka i spriječiti grešku prije eksportovanja.

**Agent radi:**

- dodaje `sales_entries` i KIF ekran;
- implementira dokument tipove `01–09` kao verzionisanu konfiguraciju, ne kao hardkodirane magic brojeve u UI-u;
- kreira zajednički validation engine za KUF/KIF;
- označava grešku s porukom, kodom greške i linkom na tačnu stavku;
- provjerava period, format datuma, PDV/JIB, potrebna polja, duplikate, iznose i logiku tipa dokumenta;
- prikazuje dashboard perioda: broj stavki, sume i broj grešaka;
- pokriva svako pravilo testovima, uključujući rubne iznose i prazna polja.

**Agent ne radi:** generisanje CSV fajla ili UINO portal integraciju.

**Kriterij završetka:** period može dobiti status `ready_for_export` samo ako nema blokirajućih grešaka.

**Copy/paste prompt:**

```text
Implementiraj samo Fazu 3 iz plana. Dodaj KIF i zajednički validation engine za KUF/KIF. Tipovi dokumenata 01–09 moraju biti u centralnoj verzionisanoj konfiguraciji. Dodaj dashboard statusa perioda i testove za svako blokirajuće pravilo. Ne generiši CSV i ne integriraj e-Porezi.
```

### Faza 4 — UINO CSV generator i testna matrica

**Cilj:** sigurno generisati UINO prihvatljive e-Nabavke i e-Isporuke fajlove.

**Agent radi:**

- kreira odvojeni modul, npr. `src/modules/uino-export/`;
- koristi ulazne validirane stavke, nikada HTML tabelu ili klijentske formule;
- pravi zaglavni, stavkovni i završni slog za oba tipa fajla;
- koristi UTF-8, `;`, decimalnu tačku i zaokruživanje na dvije decimale;
- računa zbirne redove iz istih stavki koje izvozi;
- provjerava veličinu i dijeli fajlove kada je potrebno;
- čuva export metapodatke, hash sadržaja i CSV fajl;
- dodaje fixture testove za najmanje: praznu knjigu, jednu stavku, više tipova, neobveznika, uvoz/izvoz, ispravku, duge nazive i više fajlova;
- dodaje ekran pregleda izvoza sa firmom, PDV brojem, periodom, brojem stavki i sumama.

**Agent ne radi:** automatski upload na UINO portal.

**Kriterij završetka:** deterministički testovi daju isti CSV za isti ulaz; stvarni testni upload je ručno potvrđen od korisnika.

**Copy/paste prompt:**

```text
Implementiraj samo Fazu 4 iz plana. Izgradi server-side UINO CSV generator za KUF i KIF kao izdvojen, testiran modul. Implementiraj validirani export, UTF-8, separator ;, decimalnu tačku, zbirne slogove, limit fajla i arhivu izvoza. Ne pokušavaj upload na e-Porezi. Dodaj fixture testove za normalne i rubne slučajeve.
```

### Faza 5 — import, dokumenti i pilot

**Cilj:** ubrzati prelazak sa Excela i potvrditi aplikaciju na stvarnom radu.

**Agent radi:**

- pravi import wizard za unaprijed definisan Excel/CSV template;
- prvo radi dry-run: mapiranje, broj importovanih redova i lista grešaka;
- import ne smije parcijalno upisati podatke ako postoje blokirajuće greške;
- dodaje privatni upload PDF dokumenata vezanih uz firmu i stavku;
- pravi export/import audit događaje;
- priprema anonimizirani demo dataset i UAT checklistu;
- radi usporedbu zbirnih iznosa sa starim Excelom za jedan period.

**Agent ne radi:** OCR automatsko knjiženje ili integracije trećih strana.

**Kriterij završetka:** jedan stvarni period može se importovati/ručno završiti, provjeriti i izvesti bez vraćanja na Excel.

**Copy/paste prompt:**

```text
Implementiraj samo Fazu 5 iz plana. Dodaj sigurni import wizard sa dry-runom i atomskim upisom, privatni PDF upload po stavci i UAT checklistu. Ne dodaj OCR niti eksterne integracije. Import mora dati čitljive greške i ne smije miješati firme ili periode.
```

### Faza 6 — produkcijska spremnost

**Cilj:** bezbjedno pustiti proizvod u stvarni rad.

**Agent radi:**

- dodaje monitoring grešaka, health endpoint i backup/recovery uputstvo;
- uvodi CI obavezne provjere na pull requestu;
- pregleda RLS, storage politike, tajne i logove;
- dodaje rate limiting za osjetljive akcije;
- priprema staging i produkcijske environment varijable;
- piše kratko korisničko i administratorsko uputstvo;
- provjerava da se svaki kritični workflow može završiti bez administratorskog pristupa bazi.

**Kriterij završetka:** staging prolazi UAT, backup/restore je demonstriran i produkcija ima jasnu rollback proceduru.

**Copy/paste prompt:**

```text
Implementiraj samo Fazu 6 iz plana. Fokus je produkcijska spremnost: CI, monitoring, sigurnosni pregled, storage/RLS provjera, backup/recovery dokumentacija i staging checklist. Ne dodaj nove poslovne funkcije.
```

## 15. Backlog redoslijed i prioriteti

| Prioritet | Stavka | Faza |
|---|---|---|
| P0 | Izolacija firmi, autentikacija i RLS | 1 |
| P0 | KUF/KIF unos, periodi i validacija | 2–3 |
| P0 | Tačan, testiran UINO CSV export | 4 |
| P1 | Excel/CSV import i PDF arhiva | 5 |
| P1 | Produkcijski monitoring, backup i CI | 6 |
| P2 | OCR pomoćnik sa potvrdom korisnika | poslije MVP-a |
| P2 | Klijentski portal i podsjetnici | poslije MVP-a |
| P3 | Integracije s drugim programima i naplata | poslije MVP-a |

## 16. Kako najefikasnije koristiti ograničenu Codex kvotu

- Jedan agent zadatak = jedna faza ili mali jasno definisan dio faze.
- Prvo završiti i commitati temelj; ne pokušavati istovremeno UI, CSV i deploy.
- Za kritična pravila koristiti jači model i tražiti testove; za obične UI izmjene koristiti balansirani model.
- U svakom promptu navesti **šta ne treba raditi**. To sprječava rasipanje na OCR, marketing stranice ili nepotrebne integracije.
- Nastavljati u istom threadu ili direktno referencirati ovaj plan i zadnji commit, da agent ne troši kontekst na ponovno istraživanje.
- Nakon svake faze napraviti commit i dodati kratki zapis u `docs/decisions.md`.

### Prvi Git zadatak kada se nastavi razvoj

```text
Napraviti repozitorij `NUMERON`, inicijalni branch `codex/phase-1-foundation` i implementirati samo Fazu 1 iz ovog plana.
```
