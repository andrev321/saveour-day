# saveour.day

Identyfikacja marki: [warianty logo i instrukcja użycia](assets/brand/README.md),
[podgląd wersji jasnych, ciemnych i animacji](assets/brand/index.html).
Pliki można odtworzyć poleceniem `npm run build:brand`.

Platforma do tworzenia i zarządzania zaproszeniami na różne wydarzenia. Klienci wybierają szablon startowy (np. ślub, urodziny, impreza firmowa) albo pusty szkic, a następnie tworzą zaproszenia dla osób lub rodzin. Szablon można później zmienić z potwierdzeniem resetu; poprzedni zapisany szkic ma kopię do przywrócenia. Publikacja zatwierdza wersję w bazie bez osobnego builda. Dostęp jest publiczny, za kodem lub przez e-mail OTP; panel zbiera RSVP za poszczególnych gości i wydarzenia.

## Aplikacje

- `apps/site` — aplikacja Next.js obsługująca wszystkie realizacje, autoryzację gości, chronione media i RSVP.
- `apps/admin` — panel Next.js dla administratora i klientów.
- `packages/domain` — schemat Zod, walidacja danych oraz dane demonstracyjne.
- `packages/renderer` — wspólny renderer React/Mantine używany przez stronę i podgląd w panelu.
- `supabase/migrations` — baza, reguły RLS i procedury wersjonowania.

Do pracy używaj Node.js 24 (tak jak w CI) i npm 11. `npm ci` instaluje wersje zapisane w lockfile.

## Uruchomienie lokalne

```powershell
npm.cmd ci
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/site/.env.example apps/site/.env.local
npm.cmd run dev
```

Panel uruchomisz osobno poleceniem `npm.cmd run dev:admin`. Aplikacja gości działa na `http://127.0.0.1:5173`, panel na `http://127.0.0.1:3000`. Uzupełnij pliki `.env.local` zgodnie z [instrukcją wdrożenia](docs/WDROZENIE-PLATFORMY.md).

Bez konfiguracji Supabase można sprawdzić panel pod `http://127.0.0.1:3000/demo` oraz zaproszenia pod `http://127.0.0.1:5173/demo/glowna`, `/demo/pelna` i `/demo/ograniczona`. Demonstracja panelu symuluje publikację lokalnie; nie zapisuje jej w bazie.

Konwersję danych poprzedniej strony do lokalnego JSON uruchomisz poleceniem:

```powershell
npm.cmd run import:legacy -- "Imię 1" "Imię 2"
```

Skrypt odczytuje dawne zmienne `VITE_CONFIG_*` z głównego `.env.local` i tworzy lokalny, ignorowany przez Git katalog `.local/legacy`. Nie zapisuje realizacji w Supabase. Panel ma eksport JSON, ale nie ma formularza importu: wynik służy jako materiał do przeniesienia treści lub osobnej migracji danych. Zdjęcie trzeba dodać przez bibliotekę mediów i przypisać w konfiguracji. Obecny runtime nie używa `SITE_CONFIG`; komunikat starego importera o tej zmiennej nie jest instrukcją uruchomienia aplikacji.

## Kontrola jakości

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
npm.cmd run build:admin
npm.cmd run test:e2e
```

Testy sprawdzają SQL/RLS w PGlite, izolację wariantów, dostęp gości i RSVP, interfejsy panelu oraz widoki 320–1920 px. Testy formularzy w przeglądarce używają kontrolowanych odpowiedzi HTTP; rzeczywiste SMTP i Storage wymagają odbioru na stagingu.

CI uruchamia także testy rzeczywistych handlerów API z kontrolowanym HTTP Supabase i magazynem ciasteczek. Nazwa skryptu `build:demo` pozostała dla zgodności z CI — skrypt buduje obecnie pełną aplikację Next.js `apps/site`.

`npm.cmd run build` buduje wspólną aplikację Next.js bez danych klientów. Konfiguracja jest pobierana dopiero w runtime po autoryzacji. Demonstracje dostępne są jawnie pod `/demo/glowna`, `/demo/pelna` i `/demo/ograniczona`. Brak konfiguracji usług nie uruchamia przykładowej realizacji pod adresem klienta.

Przed wpisaniem sekretów w Vercel można sprawdzić ich kompletność bez wyświetlania wartości:

```powershell
npm.cmd run check:production-env -- apps/admin/.env.production.local
npm.cmd run check:production-env -- --site apps/site/.env.production.local
```

## Wdrożenie

Wymagane są wszystkie trzy migracje Supabase oraz własny SMTP. Zmiany w repozytorium i lokalne testy nie oznaczają wykonania zdalnych migracji ani wdrożenia produkcyjnego.

## Dokumentacja

- [Interfejs konfiguratora](docs/KONFIGURATOR-INTERFEJS.md) — Focus × Paper, układ mobilny, skalowanie podglądu i preferencje widoku.

- [Szablony startowe](docs/SZABLONY-STARTOWE.md) — wybór, reset, kopie szkicu oraz zgodność starszych zaproszeń.

- [Samodzielne wdrożenie — checklista](docs/CHECKLISTA-WDROZENIA.md) — co zapewnić, gdzie wpisać ustawienia i jak odebrać wdrożenie.

- [Architektura](docs/ARCHITEKTURA.md) — moduły, model danych, publikacja, uprawnienia i ograniczenia.
- [Decyzje techniczne](docs/DECYZJE-TECHNICZNE.md) — przyjęte rozwiązania, ich uzasadnienia i konsekwencje.
- [Wdrożenie platformy](docs/WDROZENIE-PLATFORMY.md) — konfiguracja usług, migracja dawnych realizacji i odbiór stagingu.
- [Self-review publikacji](docs/SELF-REVIEW-PUBLIKACJI.md) — datowany zapis wykonanej kontroli i jej ograniczeń.
