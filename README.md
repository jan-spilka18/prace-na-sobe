# Práce na sobě

Platforma pro koučovací programy Honzy Spilky. Klient si odškrtává denní návyky
a čte zápisy ze sezení, kouč vidí všechny klienty, dostává ranní souhrn a má
soukromý prostor na přípravy a poznámky.

Celé rozhraní je česky, časové pásmo Europe/Prague.

## Stav

Hotové je **všechno**: účty a role, 90denní výzva s odškrtáváním, mřížka
průběhu, vize, zápisy ze sezení, PWA s připomínkami, ranní souhrn
a soukromý prostor kouče.

| Etapa | Obsah | Stav |
|---|---|---|
| 1 | Projekt, Supabase, přihlášení, role, založení klienta | hotovo |
| 2 | 90denní výzva: typy návyků, zpětné vyplňování, poznámky, vize | hotovo |
| 3 | PWA, web push, připomínky návyků | hotovo |
| 4 | Ranní vyhodnocení v 8:00: push, e-mail, vzorce | hotovo |
| 5 | Zápisy ze sezení a zpětná vazba klienta | hotovo |
| 6 | Admin: přípravy, soukromé poznámky, odkazy | hotovo |

> **Po aktualizaci aplikace znovu spusť `supabase/schema.sql`** v SQL Editoru.
> Dá se pustit opakovaně a nic nesmaže — dorovná jen to, co v databázi chybí.

## Technologie

- **Next.js 16** (App Router) + TypeScript, hosting na Vercelu
- **Supabase** — Postgres, Auth, Row Level Security
- **Tailwind 4** — vzhled vychází z palety níž

## Název aplikace

Je na jednom místě: `src/lib/config.ts`.

```ts
export const APP_NAME = "Práce na sobě";
export const APP_SHORT_NAME = "Na sobě";   // pod ikonou v telefonu
```

Ve stejném souboru jsou i výchozí délka programu, uzávěrka dne a časové pásmo.

## Paleta

| Barva | Kód | Kde |
|---|---|---|
| Tyrkysová | `#5FC3CE` | hlavní tlačítka, aktivní stavy, karta dne |
| Žlutá | `#FFF0A6` | zvýraznění, série splněných dní |
| Černá | `#171717` | texty |
| Bílá | `#FFFFFF` | karty a seznamy |

Definované jsou v `src/app/globals.css` v bloku `@theme`. Odvozené odstíny
(`turquoise-100`, `ink-600`) slouží jen k podkladům a okrajům.

---

# Nasazení krok za krokem

Potřebuješ účet na **Supabase** (databáze) a na **Vercelu** (hosting). Oboje
zdarma na začátek, viz poznámka o tarifech na konci.

## 1. Založ projekt v Supabase

1. Na `supabase.com` klikni **New project**.
2. Jméno třeba `prace-na-sobe`, region **Frankfurt** (nejblíž Česku).
3. Zvol silné databázové heslo a ulož si ho.
4. Počkej, než se projekt vytvoří — trvá to asi dvě minuty.

## 2. Vytvoř tabulky

1. Otevři na GitHubu soubor **`supabase/schema.sql`** a zkopíruj ho celý
   (tlačítko **Copy raw file** vpravo nahoře).
2. V Supabase otevři **SQL Editor**, vlož obsah a klikni **Run**.
3. Musí to skončit hláškou **Success**. Kdyby to spadlo, napiš mi, co hlásí.

`schema.sql` je spojení všech migrací ze `supabase/migrations/` do jednoho
souboru, aby se dal vložit najednou. Negeneruje se ručně — po každé změně
migrací ho přegeneruj příkazem `npm run build:schema`.

## 3. Vypni veřejnou registraci

Tohle je důležité. Bez toho si účet může založit kdokoli, i když v aplikaci
žádný registrační formulář není.

**Authentication → Sign In / Providers → Email** a vypni **Allow new users to
sign up**. Účty od téhle chvíle zakládáš jen ty z adminu.

## 4. Vytvoř si vlastní admin účet

1. **Authentication → Users → Add user → Create new user**.
2. Vyplň svůj e-mail a heslo, zaškrtni **Auto Confirm User**.
3. Jdi do **SQL Editoru** a spusť (svůj e-mail si doplň):

```sql
update public.profiles
set role = 'admin', full_name = 'Honza'
where email = 'tvuj@email.cz';
```

Bez tohohle kroku by ses přihlásil jako klient a admina bys neviděl.

## 5. Opiš si klíče

**Project Settings → API Keys**. Budeš potřebovat tři hodnoty:

| Kde v Supabase | Do čeho |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` klíč | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` klíč | `SUPABASE_SERVICE_ROLE_KEY` |

**Servisní klíč obchází všechna bezpečnostní pravidla.** Patří jen do
nastavení Vercelu, nikdy do gitu, nikdy do zprávy a nikdy do prohlížeče.

## 6. Nahraj projekt na GitHub

Repozitář ať je **privátní** — jde o data z osobního rozvoje.

## 7. Nasaď na Vercel

1. Na `vercel.com` se přihlas přes GitHub.
2. **Add New → Project**, vyber repozitář, dej **Import**.
3. Ještě před nasazením rozbal **Environment Variables** a přidej všechny tři
   hodnoty z kroku 5.
4. **Deploy**. Za minutu dostaneš adresu typu `https://neco.vercel.app`.

## 8. Vyzkoušej to

1. Otevři adresu, přihlas se svým admin účtem.
2. Měl bys vidět obrazovku **Klienti**.
3. **Nový klient** → vyplň jméno, e-mail a začátek programu.
4. Aplikace ti ukáže vygenerované heslo. **Zobrazí se jen jednou** — zkopíruj
   si ho hned. Kdyby se ztratilo, v detailu klienta vygeneruješ nové.
5. Odhlas se a zkus se přihlásit jako ten klient. Měl bys vidět kartu
   „Den X z 90" a nic z admina.

## 9. Zapni notifikace

Tohle je potřeba jen jednou a bez toho nepřijde žádná připomínka.

1. V aplikaci otevři **Klienti → Notifikace**.
2. Klepni na **Vygenerovat**. Ukážou se čtyři hodnoty — zkopíruj je hned,
   podruhé se neukážou.
3. Ve Vercelu je vlož do **Settings → Environment Variables**, každou zvlášť
   pod jménem, které u ní svítí.
4. U `VAPID_SUBJECT` nahraď adresu svým e-mailem.
5. **Deployments → tři tečky u nejnovějšího → Redeploy.** Bez toho se nové
   hodnoty nenačtou.
6. Vrať se na **Notifikace**. Nahoře musí svítit obojí zeleně.

Volitelně e-mail se souhrnem: založ si účet na `resend.com`, vytvoř API klíč
a přidej ve Vercelu `RESEND_API_KEY` a `EMAIL_FROM` (odesílatel musí být
adresa na ověřené doméně). Bez nich souhrn chodí jen jako push.

| Proměnná | K čemu |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push — veřejná část, smí do prohlížeče |
| `VAPID_PRIVATE_KEY` | push — **nikdy nikam kromě Vercelu** |
| `VAPID_SUBJECT` | tvůj e-mail ve tvaru `mailto:…` |
| `CRON_SECRET` | chrání naplánované úlohy před cizím spuštěním |
| `RESEND_API_KEY` | e-mail se souhrnem, nepovinné |
| `EMAIL_FROM` | odesílatel souhrnu, nepovinné |
| `NEXT_PUBLIC_APP_URL` | adresa v odkazu v e-mailu, nepovinné |

### Kdy se úlohy spouštějí

V `vercel.json` jsou dvě: připomínky každou hodinu a ranní souhrn v 6 a 7 UTC.
Souhrn si sám ohlídá, že je v Praze osm, a přes `notification_log` se pojistí,
aby ani při dvou spuštěních neodešel dvakrát.

**Vercel na tarifu Hobby spouští cron jen jednou denně**, takže připomínky
v přesný čas potřebují tarif Pro. Levnější cesta: na `cron-job.org` si zdarma
nastav volání
`https://tvoje-adresa.vercel.app/api/cron/pripominky?klic=TVUJ_CRON_SECRET`
každých patnáct minut. Stejně tak pro `/api/cron/rano`.

## 10. Zkouška na telefonu

Adresu z Vercelu otevři v mobilu a přidej si ji na plochu — v aplikaci to
najdeš pod **Nastavení → Appka na plochu**.

**iPhone notifikace pouští jen aplikacím spuštěným z plochy.** Dokud appku
otevíráš v Safari, zůstane přepínač notifikací schovaný.

Co se vyplatí projít:

- Přihlášení klientem: vidí jen svoje, nikde není odkaz do admina.
- Přihlášení sebou: vidíš seznam klientů.
- Ovládací prvky se dají pohodlně trefit palcem.
- Klávesnice při psaní e-mailu nepřekrývá tlačítko.

---

# Vývoj

```bash
npm install
cp .env.example .env.local   # doplň hodnoty z kroku 5
npm run dev                  # http://localhost:3000
```

| Příkaz | Co dělá |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` | produkční build a kontrola typů |
| `npm test` | testy práce s daty a časovým pásmem |
| `npm run test:rls` | ověří schéma a bezpečnostní pravidla |
| `npm run build:schema` | přegeneruje `supabase/schema.sql` z migrací |
| `npm run lint` | ESLint |

## Testy bezpečnostních pravidel

`npm run test:rls` si postaví dočasný Postgres, pustí do něj `schema.sql`
a ověří asi padesát tvrzení: že klient nevidí cizí data ani tvoje přípravy,
že se nedostane ke konceptu zápisu, že si nemůže povýšit roli, že změna cíle
nepřepíše minulost a že smazání klienta odstraní všechno.

Testuje se schválně `schema.sql`, tedy přesně to, co se vkládá do Supabase —
jinak by se ověřovalo něco jiného, než co poběží. Runner navíc odmítne
pokračovat, když schéma zestárlo proti migracím.

Potřebuje nainstalovaný PostgreSQL 16, Supabase k tomu potřeba není.

## Struktura

```
src/
  app/
    page.tsx              přehled klienta
    prihlaseni/           přihlášení
    admin/                seznam klientů, zakládání, detail
  components/ui/          tlačítka, seznamy, pole, obrazovka
  lib/
    config.ts             název aplikace a výchozí hodnoty
    date.ts               počítání dní v pražském pásmu
    supabase/             klienti pro prohlížeč, server a servisní klíč
supabase/
  migrations/             schéma databáze
  tests/                  testy bezpečnostních pravidel
```

## Na co si dát pozor

**Datum se nikdy nepočítá z UTC.** Server na Vercelu běží v UTC a po 22:00 by
`new Date()` hlásilo už zítřek. Všechno kolem dní jde přes `src/lib/date.ts`.

**Cíl návyku je časová řada.** Tabulka `habit_targets` drží dvojice (hodnota,
platí od). Díky tomu změna cíle platí jen do budoucna a starší dny si drží
původní hodnotu. Nikdy do ní nepiš `update`, vždy přidej nový řádek.

**Servisní klíč obchází Row Level Security.** Používá se v
`src/app/admin/actions.ts` a v naplánovaných úlohách pod `src/app/api/cron/`.
Adminské akce si na prvním řádku ověří roli, úlohy se prokazují `CRON_SECRET`.

**Naplánované úlohy nesmí polykat chyby.** Když dotaz do databáze selže,
odpověď musí být 500 s popisem — ne prázdný výsledek. Tiché selhání znamená,
že celý den nic neodejde a nikdo se to nedozví.

**`/api/cron/` je vyjmuté z proxy** v `src/proxy.ts`. Bez té výjimky by
naplánovanou úlohu proxy přesměrovala na přihlášení.

## Tarify

Supabase zdarma projekt **po týdnu bez provozu pozastaví** a s ním i
naplánované úlohy. Na ostrý provoz s klienty počítej s tarifem Pro
(25 $ měsíčně).

Vercel na tarifu Hobby utáhne všechno kromě častého cronu — ten běží jen
jednou denně. Buď Pro (20 $ měsíčně), nebo bezplatný externí plánovač,
jak je popsáno v kroku 9.
