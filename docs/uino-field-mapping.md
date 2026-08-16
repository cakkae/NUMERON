# UINO mapiranje polja

Ovaj dokument mapira format knjigovodstvenih evidencija iz službenog [Tehničkog uputstva UINO](https://www.uino.gov.ba/portal/wp-content/uploads/8-E-PROPISI/1-ePDV/3-Tehnicko-uputstvo-Dostavljanje-podataka-iz-knjigovodstvenih-evidencija.pdf) i [izmjena iz 2023. godine](https://www.uino.gov.ba/portal/wp-content/uploads/8-E-PROPISI/1-ePDV/3-3-BOS-Tehnicko-Upustvo-o-Izmjenama-i-dopunama-tehnickog-uputstvo-o-podnosenju-knjigovodstvenih-evidencija.pdf).

Opća pravila: datoteka je UTF-8, polja su razdvojena tačkom-zarezom, datum je `YYYY-MM-DD`, period `YYMM`, a vrijeme `HH:MM:SS`. Novčani iznosi imaju najviše 25 znakova, tačku kao decimalni separator i dvije decimale pri izvozu. Model dopušta `NULL` tokom unosa da ne bi izmišljao vrijednost, ali Faza 4B blokira izvoz dok svako monetarno polje nema eksplicitnu vrijednost; korisnik unosi `0.00` samo kada je poslovno tačno.

## Zaglavlje (isto mapiranje za KUF i KIF)

| # | UINO polje | Izvor u aplikaciji | Format | Obavezno | Validacija | Nastanak |
|---|---|---|---|---|---|---|
| 1 | Vrsta sloga | Konstanta budućeg izvoza | `1` | Da | Tačno `1` | Pouzdano izračunato |
| 2 | PDV broj obveznika | `companies.vat_number` | 12 cifara | Da | `^[0-9]{12}$` | Podatak firme |
| 3 | Porezni period | `tax_periods.year/month` | `YYMM` | Da | Valjan mjesec 01–12 | Pouzdano izračunato |
| 4 | Tip datoteke | KUF: `1`; KIF: `2` | 1 cifra | Da | Samo `1` ili `2` | Pouzdano izračunato |
| 5 | Redni broj datoteke u periodu | `uino_exports.sequence` | `01`–`99` | Da | Dvije cifre; raste pri podjeli preko 5 MB | Pouzdano izračunato |
| 6 | Datum kreiranja | Vrijeme kreiranja budućeg izvoza | `YYYY-MM-DD` | Da | Valjan datum | Pouzdano izračunato |
| 7 | Vrijeme kreiranja | Vrijeme kreiranja budućeg izvoza | `HH:MM:SS` | Da | Valjano vrijeme | Pouzdano izračunato |

## KUF — slog nabavke

| # | UINO polje | Izvor u aplikaciji | Format | Obavezno | Validacija | Nastanak |
|---|---|---|---|---|---|---|
| 1 | Vrsta sloga | Konstanta budućeg izvoza | `2` | Da | Tačno `2` | Pouzdano izračunato |
| 2 | Porezni period | `tax_periods.year/month` | `YYMM` | Da | Slaže se s aktivnim periodom | Pouzdano izračunato |
| 3 | Redni broj iz knjige nabavki | Redoslijed budućeg izvoza | Do 10 cifara | Da | Jedinstven redni broj u datoteci | Pouzdano izračunato |
| 4 | Tip dokumenta | `purchase_entries.document_type` | `01`–`09` | Da | Centralna konfiguracija `DOCUMENT_TYPES_VERSION=2023-01` | Ručni unos |
| 5 | Broj fakture ili dokumenta | `purchase_entries.invoice_number` | Do 100 znakova | Da | Neprazno; bez duplikata u KUF-u firme | Ručni unos |
| 6 | Datum fakture ili dokumenta | `purchase_entries.invoice_date` | `YYYY-MM-DD` | Da | Valjan datum | Ručni unos |
| 7 | Datum prijema fakture ili dokumenta | `purchase_entries.received_date` | `YYYY-MM-DD` | Da | Valjan datum u poreznom periodu | Ručni unos |
| 8 | Naziv dobavljača | `partners.name` | Do 100 znakova | Da | Neprazno | Partner |
| 9 | Sjedište dobavljača | `partners.address` | Do 100 znakova | Da | Neprazno | Partner |
| 10 | PDV broj dobavljača | `partners.vat_number` | 12 cifara ili prazno | Uslovno | Obveznik: 12 cifara; uvoz (tip 04): 12 nula; neobveznik: prazno | Partner |
| 11 | JIB dobavljača | `partners.jib` | 13 cifara ili prazno | Uslovno | Ako postoji: 13 cifara; uvoz (tip 04): 13 nula; bez JIB-a: prazno | Partner |
| 12 | Iznos bez PDV-a | `purchase_entries.invoice_amount_excluding_vat` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 13 | Iznos sa PDV-om | `purchase_entries.invoice_amount_with_vat` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 14 | Paušalna naknada | `purchase_entries.flat_rate_compensation` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 15 | Ulazni PDV | `purchase_entries.input_vat_amount` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 16 | Odbitni ulazni PDV | `purchase_entries.deductible_input_vat` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 17 | Neodbitni ulazni PDV | `purchase_entries.non_deductible_input_vat` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 18 | Neodbitni ulazni PDV za polje 32 PDV prijave | `purchase_entries.input_vat_field_32` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 19 | Neodbitni ulazni PDV za polje 33 PDV prijave | `purchase_entries.input_vat_field_33` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 20 | Neodbitni ulazni PDV za polje 34 PDV prijave | `purchase_entries.input_vat_field_34` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |

## KUF — prateći slog

| # | UINO polje | Izvor u aplikaciji | Format | Obavezno | Validacija | Nastanak |
|---|---|---|---|---|---|---|
| 1 | Vrsta sloga | Konstanta budućeg izvoza | `3` | Da | Tačno `3` | Pouzdano izračunato |
| 2 | Ukupan iznos bez PDV-a | Zbir `invoice_amount_excluding_vat` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 3 | Ukupan iznos sa PDV-om | Zbir `invoice_amount_with_vat` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 4 | Ukupna paušalna naknada | Zbir `flat_rate_compensation` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 5 | Ukupan ulazni PDV | Zbir `input_vat_amount` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 6 | Ukupan odbitni ulazni PDV | Zbir `deductible_input_vat` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 7 | Ukupan neodbitni ulazni PDV | Zbir `non_deductible_input_vat` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 8 | Ukupan neodbitni ulazni PDV za polje 32 | Zbir `input_vat_field_32` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 9 | Ukupan neodbitni ulazni PDV za polje 33 | Zbir `input_vat_field_33` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 10 | Ukupan neodbitni ulazni PDV za polje 34 | Zbir `input_vat_field_34` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 11 | Ukupan broj redova | Broj aktivnih KUF stavki | Do 10 cifara | Da | Cijeli nenegativan broj | Pouzdano izračunato |

## KIF — slog isporuke

| # | UINO polje | Izvor u aplikaciji | Format | Obavezno | Validacija | Nastanak |
|---|---|---|---|---|---|---|
| 1 | Vrsta sloga | Konstanta budućeg izvoza | `2` | Da | Tačno `2` | Pouzdano izračunato |
| 2 | Porezni period | `tax_periods.year/month` | `YYMM` | Da | Slaže se s aktivnim periodom | Pouzdano izračunato |
| 3 | Redni broj iz knjige isporuka | Redoslijed budućeg izvoza | Do 10 cifara | Da | Jedinstven redni broj u datoteci | Pouzdano izračunato |
| 4 | Tip dokumenta | `sales_entries.document_type` | `01`–`09` | Da | Centralna konfiguracija `DOCUMENT_TYPES_VERSION=2023-01` | Ručni unos |
| 5 | Broj fakture ili dokumenta | `sales_entries.invoice_number` | Do 100 znakova | Da | Neprazno; bez duplikata u KIF-u firme | Ručni unos |
| 6 | Datum fakture ili dokumenta | `sales_entries.invoice_date` | `YYYY-MM-DD` | Da | Valjan datum u poreznom periodu | Ručni unos |
| 7 | Naziv kupca / posrednika u doniranju hrane | `partners.name` | Do 100 znakova | Da | Neprazno | Partner |
| 8 | Sjedište kupca / posrednika u doniranju hrane | `partners.address` | Do 100 znakova | Da | Neprazno | Partner |
| 9 | PDV broj kupca / posrednika | `partners.vat_number` | 12 cifara ili prazno | Uslovno | Obveznik: 12 cifara; izvoz (tip 04): 12 nula; neobveznik: prazno | Partner |
| 10 | JIB kupca / posrednika | `partners.jib` | 13 cifara ili prazno | Uslovno | Ako postoji: 13 cifara; izvoz (tip 04): 13 nula; bez JIB-a: prazno | Partner |
| 11 | Ukupan iznos fakture ili dokumenta | `sales_entries.invoice_total_amount` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 12 | Interna faktura u vanposlovne svrhe | `sales_entries.internal_invoice_amount` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 13 | Izvozne isporuke po carinskim ispravama | `sales_entries.export_invoice_amount` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 14 | Ostale isporuke oslobođene PDV-a | `sales_entries.vat_exempt_supply_amount` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 15 | Osnovica — registrovani kupac | `sales_entries.taxable_base_registered` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 16 | Izlazni PDV — registrovani kupac | `sales_entries.output_vat_registered` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 17 | Osnovica — neregistrovani kupac | `sales_entries.taxable_base_non_registered` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 18 | Izlazni PDV — neregistrovani kupac | `sales_entries.output_vat_non_registered` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 19 | Izlazni PDV za polje 32 PDV prijave | `sales_entries.output_vat_field_32` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 20 | Izlazni PDV za polje 33 PDV prijave | `sales_entries.output_vat_field_33` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |
| 21 | Izlazni PDV za polje 34 PDV prijave | `sales_entries.output_vat_field_34` | Decimalni iznos | Ne | Prazno ili nenegativno, najviše dvije decimale | Ručni unos |

## KIF — prateći slog

| # | UINO polje | Izvor u aplikaciji | Format | Obavezno | Validacija | Nastanak |
|---|---|---|---|---|---|---|
| 1 | Vrsta sloga | Konstanta budućeg izvoza | `3` | Da | Tačno `3` | Pouzdano izračunato |
| 2 | Ukupan iznos faktura/dokumenata | Zbir `invoice_total_amount` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 3 | Ukupan iznos internih faktura | Zbir `internal_invoice_amount` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 4 | Ukupan iznos izvoznih isporuka | Zbir `export_invoice_amount` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 5 | Ukupan iznos ostalih oslobođenih isporuka | Zbir `vat_exempt_supply_amount` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 6 | Ukupna osnovica — registrovani kupci | Zbir `taxable_base_registered` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 7 | Ukupan izlazni PDV — registrovani kupci | Zbir `output_vat_registered` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 8 | Ukupna osnovica — neregistrovani kupci | Zbir `taxable_base_non_registered` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 9 | Ukupan izlazni PDV — neregistrovani kupci | Zbir `output_vat_non_registered` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 10 | Ukupan izlazni PDV za polje 32 | Zbir `output_vat_field_32` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 11 | Ukupan izlazni PDV za polje 33 | Zbir `output_vat_field_33` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 12 | Ukupan izlazni PDV za polje 34 | Zbir `output_vat_field_34` | Decimalni iznos | Da | Zbir aktivnih stavki, dvije decimale | Pouzdano izračunato |
| 13 | Ukupan broj redova | Broj aktivnih KIF stavki | Do 10 cifara | Da | Cijeli nenegativan broj | Pouzdano izračunato |

## Tipovi dokumenata 01–09

Tipovi su centralno verzionisani u `src/lib/document-types.ts`. Tipovi 01–05 dolaze iz osnovnog uputstva, a 06–09 iz izmjene iz 2023. KUF: 06 naknadna umanjenja/popusti, 07 ispravak odbitka ulaznog poreza, 08 posebna šema građevinarstva, 09 ostalo. KIF: 06 umanjenje PDV-a po PDV-SL-2, 07 manjak, 08 donacije, 09 ostalo. UINO dokument ne propisuje automatsku raspodjelu iznosa po monetarnim kolonama za svaki tip, pa aplikacija relevantna polja ističe, ali korisniku ostavlja dostupna sva polja knjige.

## Legacy `amount`

`purchase_entries.amount` je u Fazama 2–3 značio ukupan KUF iznos, a `sales_entries.amount` ukupan KIF iznos. Migracija ga ne briše: stare KUF vrijednosti kopira u `invoice_amount_with_vat`, stare KIF vrijednosti u `invoice_total_amount`, a UI pri novom unosu zrcali upravo ta ukupna polja u `amount`. `amount` više nije izvor UINO sloga i može biti `NULL`; ostaje samo radi kompatibilnosti dok se ne potvrdi sigurno uklanjanje u zasebnoj odluci.

## Otvorene poslovne potvrde

- Uputstvo ne određuje aplikacijsko pravilo za predznak korektivnih dokumenata 06/07. Faza 4A zadržava postojeće pravilo nenegativnih unosa; način evidentiranja umanjenja mora se potvrditi prije CSV izvoza.
- Za postojeće KUF stavke migracija postavlja `received_date = invoice_date`, jer stariji model nije imao datum prijema. Te stavke treba poslovno pregledati prije prvog izvoza.
