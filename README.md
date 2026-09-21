# Wedding Platform

Platforma do obsługi wielu, niezależnych zaproszeń ślubnych. Publiczna strona jest statycznym artefaktem przypisanym do jednej realizacji; panel administracyjny przechowuje dane, media, wersje i prowadzi publikację do osobnego projektu Vercel.

## Aplikacje

- `apps/site` — publiczna, responsywna strona Vite. W buildzie otrzymuje tylko manifest jednej wersji zaproszenia.
- `apps/admin` — panel Next.js dla administratora i klientów.
- `packages/domain` — schemat Zod, walidacja danych oraz dane demonstracyjne.
- `packages/renderer` — wspólny renderer React/Mantine używany przez stronę i podgląd w panelu.
- `supabase/migrations` — baza, reguły RLS i procedury wersjonowania.

Projekt wymaga Node.js 22 LTS i npm 11.

## Uruchomienie lokalne

```powershell
npm.cmd ci
Copy-Item apps/admin/.env.example apps/admin/.env.local
npm.cmd run dev
```

Panel uruchomisz osobno poleceniem `npm.cmd run dev:admin`. Bez zmiennych Supabase dostępny jest wyłącznie ekran demonstracyjny pod `/demo`; interfejs nie udaje wtedy zapisu do bazy.

Do migracji poprzedniej strony użyj:

```powershell
npm.cmd run import:legacy -- "Imię 1" "Imię 2"
```

Skrypt tworzy lokalny, ignorowany przez Git katalog `.local/legacy`. Przed publikacją sprawdź treść i zdjęcie w panelu.

## Kontrola jakości

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build:demo
npm.cmd run build:admin
npm.cmd run test:e2e
```

Test E2E sprawdza wszystkie warianty strony przy szerokościach 320–1920 px, bezpośrednie ścieżki oraz demonstracyjny panel.

`npm.cmd run build` jest celowo buildem produkcyjnym i wymaga `RELEASE_MANIFEST_URL` oraz `RELEASE_TOKEN` albo lokalnego `SITE_CONFIG`. Nie używa danych demonstracyjnych bez jawnego wyboru, aby przypadkowo nie opublikować przykładowej realizacji.

Przed wpisaniem sekretów w Vercel można sprawdzić ich kompletność bez wyświetlania wartości:

```powershell
npm.cmd run check:production-env -- apps/admin/.env.production.local
```

## Wdrożenie

Instrukcja dla pierwszego wdrożenia platformy i codziennej publikacji realizacji jest w [docs/WDROZENIE-PLATFORMY.md](docs/WDROZENIE-PLATFORMY.md). Założenia i uzasadnienie techniczne opisują [audyt](docs/AUDYT-ARCHITEKTURY-KODU-I-PRODUKTU.md) oraz [plan](docs/PLAN-ROZWOJU-I-KOMPONENTY.md).
