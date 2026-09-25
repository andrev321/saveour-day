# Wdrożenie wspólnej platformy zaproszeń

Aktualny stan środowiska i pozostałe kroki: [status stagingu](STAGING-STATUS.md). Obie aplikacje są wdrożone; konfiguracja Resend SMTP czeka na domenę nadawczą.

## Architektura

**Wdrażasz samodzielnie? Zacznij od [checklisty kont, ustawień i kliknięć](CHECKLISTA-WDROZENIA.md).** Zawiera kolejność konfiguracji Supabase/SMTP/Vercel/DNS, tabelę zmiennych i zadania operatora.

Instrukcja dla implementacji z 2026-09-23; jej obecność nie potwierdza wykonania kroków na produkcji. Szczegółowy model opisują [architektura](ARCHITEKTURA.md) i [decyzje techniczne](DECYZJE-TECHNICZNE.md).

Skonfiguruj dwa projekty Next.js na Vercel: panel (`apps/admin`) i wspólną aplikację zaproszeń (`apps/site`). Jeden projekt Supabase na środowisko zapewnia bazę, Auth i prywatny Storage. Dla stagingu i produkcji użyj oddzielnych baz i kluczy. Używaj Node.js 24, zgodnie z CI.

Publikacja jest transakcją: waliduje szkic i media, tworzy niezmienne wydanie oraz ustawia `sites.published_release_id`. Nie uruchamia Vercel API ani builda. Cofnięcie wersji nie cofa RSVP ani uprawnień. Wdrożenie kodu aktualizuje renderer wszystkich stron; nowe konfiguracje mają schemat v2, a odczyt starszych v1 obsługuje adapter.

- Panel: `https://app.twojamarka.pl`.
- Strona wydarzenia: `https://zaproszenia.twojamarka.pl/s/<public_slug>`.
- Osoba/rodzina: `/i/<token>`.
- Wybór po OTP na stronie ogólnej: `/v/<invitation_id>` — zawsze wymaga sesji.

Własne domeny, płatności i wysyłka zaproszeń są poza tym etapem. Strony mają `noindex`. Konfiguracja nie trafia do HTML ekranu logowania. Po autoryzacji API zwraca tylko wariant odbiorcy. Treść i zdjęcia używają `private, no-store`; zdjęcia nie przechodzą przez publiczny optymalizator.

## Konfiguracja usług

1. Uruchom migracje kolejno: `202609200001_platform.sql`, `202609210001_guest_platform.sql`, `202609230001_invitation_templates.sql`. Każda rozszerza poprzedni stan. Trzecia dodaje kopie szkiców, konwertuje szkice do v2 i aktualizuje publikację/rollback.
2. Pozostaw bucket `site-media` prywatny. Klucz `service_role` jest wyłącznie serwerowy.
3. W Supabase Auth włącz potwierdzanie e-maila, logowanie e-mail/hasło i e-mail OTP. Site URL: adres panelu; dozwolony redirect: `https://app.twojamarka.pl/auth/confirm`.
4. Skonfiguruj własny SMTP z uwierzytelnioną domeną nadawcy i limitami dostosowanymi do ruchu. Domyślny SMTP Supabase nie jest produkcyjny. Wyłącz śledzenie linków w wiadomościach uwierzytelniających.
5. Szablon **Magic Link** powinien pokazywać `{{ .Token }}`. Gość wpisuje kod w aplikacji; nie wysyłamy go do panelu.
6. Szablon **Confirm signup**: link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`. W szablonie **Reset password** użyj `type=recovery`. Sam redirect bez tokena nie wystarcza.
7. Utwórz projekty Vercel z Root Directory odpowiednio `apps/admin` i `apps/site`, framework Next.js i domyślny katalog wyjściowy. Nie używaj rewrite do `index.html`.
8. W obu projektach ustaw `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`. W panelu dodatkowo `APP_URL`. Adresy są kanonicznymi originami HTTPS bez ścieżki.
9. Usuń nieużywane sekrety publikacji: `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_GITHUB_REPO_ID`, `ENGINE_GIT_SHA`, `VERCEL_WEBHOOK_SECRET`; wyłącz dawny webhook.
10. Limity rejestracji ustaw w Supabase Auth. Próby kodu i OTP są dodatkowo ograniczane w bazie. Na Vercel używamy nagłówka IP nadpisywanego przez platformę; inne hostingi wymagają wdrożenia zaufanego ustalania IP.

Organizator rejestruje konto, potwierdza e-mail, loguje się i sam zakłada realizację. Nie potrzebuje roli administratora. Goście i organizatorzy korzystają ze wspólnego Auth, ale uprawnienia i ciasteczka są oddzielone. Wcześniejszy gość OTP może ustawić hasło panelu przez odzyskiwanie hasła. Nie włączaj CAPTCHA bez podłączenia odpowiedniego widgetu do formularza.

## Publikacja i zapraszanie

1. Utwórz zaproszenie, wybierz szablon lub pusty start i język treści, uzupełnij szkic oraz zdjęcia i zapisz. W edytorze można zmienić szablon po potwierdzeniu resetu; szczegóły opisuje [instrukcja szablonów](SZABLONY-STARTOWE.md).
2. Ustaw wariant strony ogólnej, tryb dostępu i opcjonalny termin RSVP (Europe/Warsaw). Kod ma minimum 8 znaków; puste pole przy edycji zachowuje poprzedni.
3. Publikuj. Po pierwszej publikacji nowe warianty trzeba opublikować przed przypisaniem ich zaproszeniom.
4. Dodaj rodzinę/osobę, listę gości, wariant i dopuszczone e-maile. Każdy dopuszczony adres odpowiada za całą rodzinę. Adresy i wariant można edytować bez usuwania RSVP.
5. Skopiuj link. Przechowujemy tylko hash, więc link pokazujemy przy utworzeniu/rotacji. Nowy link unieważnia stary oraz sesje zaproszenia.
6. Publiczny link rodzinny pozwala także zapisywać RSVP. W trybie kodowym dodatkowo potrzebny jest kod; w e-mailowym potwierdzenie adresu. Ogólna strona e-mailowa pokazuje po OTP zaproszenia przypisane do adresu.
7. Odpowiedzi i uwagi są widoczne w panelu. Goście poprawiają je do terminu; organizator również po terminie. Brak odpowiedzi różni się od „nie”. Odpowiedzi na usunięte wydarzenia pozostają w historii.

Zmiana ustawień unieważnia sesje realizacji. Edycja adresów/wariantu unieważnia sesje zaproszenia. Sesje wygasają po 7 dniach. Cofnięcie dostępu blokuje następne żądania; nie usuwa już pobranych lub skopiowanych treści.

## Wdrożenie schematu v2

Przed trzecią migracją zrób backup. Przetestuj migrację oraz tę wersję obu aplikacji na stagingu. W istniejącym środowisku wstrzymaj zapisy na czas skoordynowanej migracji i wdrożenia obu aplikacji: stary kod obsługujący wyłącznie v1 nie może pracować na przekonwertowanych szkicach. Wersja po wdrożeniu musi obsługiwać v1 i v2. Nie cofaj samego kodu do wersji obsługującej wyłącznie v1. Po wdrożeniu sprawdź wybór szablonu, pusty szkic, reset, kopię szkicu, odczyt starej publikacji i jej przywrócenie. Migracja nie zmienia już opublikowanych wydań ani odpowiedzi gości.

## Migracja dawnych realizacji

Migracja nie publikuje automatycznie starych wydań i nie usuwa deploymentów.

1. Zrób backup bazy, zinwentaryzuj stare projekty, deploymenty i domeny. Najpierw sprawdź nową aplikację na stagingu.
2. Dla każdej realizacji wybierz szkic lub wydanie i opublikuj w nowym runtime. Ostatnie dawne wydanie mogło mieć nieudany build.
3. Przekaż nowy adres. Jeśli zachowujesz stare domeny, przekieruj je do nowej strony bez serwowania dawnych plików.
4. Przed włączeniem kodu/OTP usuń lub zabezpiecz WSZYSTKIE stare publiczne deploymenty, pliki i aliasy. Sprawdź anonimowo stare domeny, adresy `vercel.app` i bezpośrednie URL-e zdjęć. Zmiana DNS nie usuwa dawnych kopii.
5. Dopiero po kontroli operator zeruje `sites.vercel_project_id` dla konkretnej realizacji. Niepuste pole blokuje chroniony tryb (`LEGACY_PUBLICATION_ACTIVE`). Nie zeruj go zbiorczo przed kontrolą.
6. Usuń nieużywane projekty/webhooki. Zachowaj historię wydań i audytu. Nie usuwaj mediów przypisanych do wydań.

Rollback kodu musi wracać do zgodnego wspólnego runtime. Nie przywracaj statycznego procesu dla chronionych stron. Odtwarzanie bazy i rollback aplikacji są odrębne.

## Testy i odbiór stagingu

```powershell
npm.cmd ci
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/site/.env.example apps/site/.env.local
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build:admin
npm.cmd run build
npm.cmd run test:e2e
```

`npm run dev` uruchamia zaproszenia na 5173, `npm run dev:admin` panel na 3000. Jawne demonstracje zaproszeń: `/demo/glowna`, `/demo/pelna`, `/demo/ograniczona`; demonstracja panelu: `/demo` na porcie 3000. Błąd konfiguracji nie zastępuje strony klienta przykładem. Testy obsługują `E2E_SITE_URL` i `E2E_ADMIN_URL`. Skrypt `build:demo` używany w CI buduje pełną aplikację `apps/site`.

Testy automatyczne sprawdzają funkcje SQL i RLS w PGlite, projekcję treści, hashe kodów oraz interfejsy. Test `guest-api.test.ts` wykonuje rzeczywiste handlery Next.js i klienta Supabase przy kontrolowanym HTTP usług zewnętrznych oraz magazynie ciasteczek. Sprawdza m.in. autoryzację treści i zdjęć, unieważnianie sesji, RSVP i rozdzielenie limitów OTP. Testy gości/panelu w przeglądarce używają kontrolowanych odpowiedzi HTTP — nie potwierdzają SMTP ani produkcyjnego Storage.

Konfigurację produkcyjną sprawdź osobno dla obu aplikacji (skrypt nie wypisuje wartości sekretów):

```powershell
npm.cmd run check:production-env -- apps/admin/.env.production.local
npm.cmd run check:production-env -- --site apps/site/.env.production.local
```

Przed produkcją wykonaj na rzeczywistym stagingu Supabase:

- rejestrację dwóch organizatorów, potwierdzenie e-maili i próbę dostępu do cudzej realizacji;
- upload, publikację, niezależną edycję szkicu, ponowną publikację i cofnięcie wersji;
- wejście we wszystkich trzech trybach na świeżych sesjach;
- dostarczenie OTP, zły/wygasły kod, niedopuszczony e-mail i ponowną wysyłkę;
- kontrolę HTML, metadanych, API i bezpośrednich zdjęć przed autoryzacją;
- podmianę identyfikatorów rodziny, gościa, wydarzenia i zdjęcia na cudze;
- cofnięcie dostępu, zmianę kodu oraz wycofanie publikacji przy istniejących sesjach;
- RSVP za dwie osoby, zmianę odpowiedzi, konflikt dwóch kart, termin i poprawkę organizatora;
- brak nowego deploymentu przy publikacji i brak mieszania danych dwóch realizacji.

Monitoruj 5xx, odrzucenia 429, dostarczalność SMTP i audyt publikacji/RSVP. Logi aplikacyjne zapisują kategorię oraz status błędu bez payloadu. Nie dodawaj kodów, tokenów, e-maili ani pełnych ścieżek `/i/...` do analityki. Ogranicz dostęp i retencję logów hostingu zawierających adresy. Skonfiguruj alarmy, backupy i test odtwarzania w usługach przed produkcją.
