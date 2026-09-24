# Samodzielne wdrożenie — checklista operatora

Stan: 2026-09-23. Odznaczaj punkty po wykonaniu. Dokument nie potwierdza wdrożenia. Najpierw wykonaj kroki na stagingu, potem powtórz dla produkcji. Szczegóły migracji i pełne testy opisuje [instrukcja techniczna](WDROZENIE-PLATFORMY.md).

## 1. Co musisz zapewnić

- [ ] Repozytorium Git z wypchniętym aktualnym kodem, lockfile i migracjami.
- [ ] Konto Vercel z dostępem do repozytorium i możliwością tworzenia projektów.
- [ ] Konto Supabase z możliwością tworzenia projektów i uruchamiania SQL.
- [ ] Dostawcę poczty transakcyjnej z SMTP: host, port, użytkownik, hasło, adres i nazwa nadawcy.
- [ ] Dostęp do DNS domeny nadawczej poczty; dla własnych adresów aplikacji także DNS ich domeny.
- [ ] Dostęp do rozliczeń i budżet na hosting, bazę, zdjęcia oraz pocztę. Repozytorium nie wykupuje planów usług.
- [ ] Dwie skrzynki testowych organizatorów oraz skrzynkę gościa do odbioru prawdziwych wiadomości.

Na początek aplikacje mogą używać stałych adresów projektów `vercel.app`. Osobno zweryfikuj domenę nadawcy u dostawcy SMTP. Nie potrzebujesz domeny ani projektu Vercel dla każdej rodziny.

Zapisz bez sekretów: środowisko, identyfikator projektu Supabase, nazwy dwóch projektów Vercel, adres panelu, adres zaproszeń i nadawcę poczty. Klucze i hasła przechowuj w menedżerze haseł oraz ustawieniach usług, nie w Git ani dokumentacji.

## 2. Supabase — baza i Storage

- [ ] Utwórz oddzielne projekty staging i produkcja. Wybierz region i zapisz hasło bazy.
- [ ] W pustym projekcie otwórz **SQL Editor → New query**. Uruchom pełną zawartość [pierwszej migracji](../supabase/migrations/202609200001_platform.sql), potem [drugiej](../supabase/migrations/202609210001_guest_platform.sql) i [trzeciej](../supabase/migrations/202609230001_invitation_templates.sql). Zapisz datę i wynik. Nie uruchamiaj ponownie zastosowanych migracji — nie są wielokrotnego wykonania. Przy istniejącej bazie najpierw sprawdź historię i zrób backup.
- [ ] W **Table Editor** sprawdź m.in. `sites`, `drafts`, `releases`, `invitations`, `rsvp_answers`, `guest_sessions` i `access_attempts` i `draft_snapshots`.
- [ ] W **Storage** sprawdź bucket `site-media` utworzony migracją: **Public wyłączone**, limit 8 MB, JPEG/PNG/WebP. Nie dodawaj anonimowej polityki odczytu.
- [ ] W **Connect** znajdź URL projektu. W **Settings → API Keys** skopiuj klucz publiczny `sb_publishable_...` i serwerowy `sb_secret_...`. Kod nadal odczytuje serwerowy klucz ze zmiennej `SUPABASE_SERVICE_ROLE_KEY` — nazwa nie wymaga starego formatu JWT. W istniejącym projekcie dawny klucz `service_role` jest odpowiednikiem uprzywilejowanego klucza serwera. [Klucze Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

Migracje tworzą tabele i uprawnienia. Organizator rejestruje się sam, a tworzenie realizacji nadaje członkostwo. Nie musisz ręcznie dodawać klientów do `platform_admins` ani tworzyć wpisów `site_members`.

## 3. Poczta i Auth

- [ ] U dostawcy SMTP zweryfikuj domenę nadawcy. Dodaj wskazane rekordy DNS, w tym SPF/DKIM i uzgodnioną politykę DMARC; poczekaj na poprawny status.
- [ ] W **Supabase → Authentication → ustawienia e-mail/SMTP** włącz własny SMTP. Wpisz host, port, użytkownika, hasło, adres i nazwę nadawcy. Wyłącz śledzenie linków u dostawcy poczty. Domyślna poczta Supabase nie służy do produkcyjnej obsługi klientów. [Konfiguracja SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
- [ ] W ustawieniach **Authentication** włącz dostawcę Email, rejestracje i potwierdzanie e-maila. Nowy gość OTP też wymaga możliwości utworzenia konta Auth. Nie włączaj CAPTCHA bez obsługi w formularzach aplikacji.
- [ ] W **Authentication → URL Configuration** ustaw **Site URL** na adres panelu, np. `https://app.twojamarka.pl`; w **Redirect URLs** dodaj `https://app.twojamarka.pl/auth/confirm`. Staging ma własny adres panelu. To ustawienie nie jest adresem aplikacji gości. [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
- [ ] W **Authentication → Email Templates** ustaw poniższe treści. Zachowaj dosłowne zmienne w podwójnych nawiasach. [Szablony Supabase](https://supabase.com/docs/guides/auth/auth-email-templates).

| Szablon | Wymagana treść HTML |
| --- | --- |
| Magic Link | `<p>Kod logowania: <strong>{{ .Token }}</strong></p>` |
| Confirm signup | `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Potwierdź konto</a>` |
| Reset password | `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Ustaw hasło</a>` |

- [ ] Sprawdź limity w Supabase Auth i u dostawcy SMTP, ustaw czas ważności OTP. Formularz przyjmuje kody numeryczne długości 6–10 cyfr. Przetestuj dostarczenie kodu także osobie bez wcześniejszego konta.

Hasło SMTP wpisujesz w Supabase, nie w Vercel. Wiadomości uwierzytelniające wysyła Supabase Auth. Rodzinne linki zaproszeń organizator kopiuje i przekazuje samodzielnie.

## 4. Vercel — dwie aplikacje

- [ ] Wybierz **Add New → Project**, zaimportuj repozytorium i utwórz projekt panelu. Zaimportuj to samo repozytorium drugi raz dla zaproszeń. [Monorepo Vercel](https://vercel.com/docs/monorepos).
- [ ] Ustaw poniższe wartości. Zachowaj dostęp do współdzielonych `packages/` poza katalogiem aplikacji; jeśli panel pokazuje opcję uwzględniania plików spoza Root Directory, włącz ją.

| Ustawienie | Panel | Zaproszenia |
| --- | --- | --- |
| Root Directory | `apps/admin` | `apps/site` |
| Framework Preset | Next.js | Next.js |
| Node.js | 24.x | 24.x |
| Output Directory | Domyślne Next.js | Domyślne Next.js |
| Build | Skrypt `build` aplikacji | Konfiguracja `apps/site/vercel.json` |

- [ ] Usuń stare nadpisania Vite: katalog `dist`, rewrite do `index.html`, stare komendy i `VITE_CONFIG_*`. Instalacja musi obejmować npm workspaces oraz główny lockfile.
- [ ] Ustal stałe adresy obu aplikacji. Własne subdomeny dodaj w **Settings → Domains** odpowiedniego projektu; w DNS wpisz dokładnie rekordy wskazane przez Vercel. Poczekaj na poprawny status i HTTPS. [Domeny Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
- [ ] W **Settings → Environment Variables** każdego projektu ustaw poniższe zmienne dla **Production**. Staging najprościej skonfigurować jako dwa odrębne projekty Vercel z osobnym Supabase i stałymi adresami.

| Zmienna | Panel | Zaproszenia | Wartość |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Tak | Tak | URL projektu Supabase danego środowiska |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Tak | Tak | Publiczny klucz tego projektu |
| `SUPABASE_SERVICE_ROLE_KEY` | Tak, sekret | Tak, sekret | Serwerowy klucz tego projektu |
| `APP_URL` | Tak | Nie | Kanoniczny adres panelu, np. `https://app.twojamarka.pl` |
| `SITE_URL` | Tak | Tak | Kanoniczny adres zaproszeń, np. `https://zaproszenia.twojamarka.pl` |

Adresy wpisuj bez ścieżek i parametrów. Oba projekty mają ten sam `SITE_URL` i ten sam Supabase w danym środowisku. Nie przekazuj produkcyjnych sekretów niezaufanym preview. Formularze wymagają originów zgodnych z konfiguracją; losowy URL preview nie zastępuje stagingu.

- [ ] Wdróż oba projekty. Po zmianie zmiennych wykonaj **Redeploy** — wartości publiczne są używane podczas budowania. [Zmienne Vercel](https://vercel.com/docs/environment-variables/managing-environment-variables).
- [ ] Sprawdź ochronę deploymentów: produkcyjna aplikacja gości musi być dostępna dla odbiorcy bez konta Vercel. Właściwe uprawnienia do treści sprawdza aplikacja. Staging może pozostać chroniony.

Nie potrzebujesz tokena Vercel w aplikacji, webhooka builda, projektu dla każdego klienta ani builda po zmianie zaproszenia.

## 5. Odbiór i utrzymanie

- [ ] W istniejącym środowisku zastosuj procedurę „Wdrożenie schematu v2” z instrukcji technicznej — skoordynuj migrację i wdrożenie obu aplikacji.
- [ ] Sprawdź wybór szablonu, pusty szkic, anulowanie i zatwierdzenie resetu oraz przywrócenie kopii.
- [ ] Zarejestruj organizatora, potwierdź e-mail, utwórz realizację, wgraj zdjęcie i opublikuj.
- [ ] W prywatnym oknie sprawdź stronę i zdjęcia w trzech trybach dostępu. Dla OTP najpierw przypisz adres skrzynki do rodzinnego zaproszenia.
- [ ] Utwórz rodzinę z dwiema osobami, skopiuj link, odpowiedz za obie i sprawdź wynik w panelu.
- [ ] Sprawdź zmianę kodu, cofnięcie zaproszenia i wycofanie publikacji przy istniejącej sesji.
- [ ] Drugim kontem organizatora sprawdź brak dostępu do pierwszej realizacji.
- [ ] Wykonaj pełny odbiór z [instrukcji technicznej](WDROZENIE-PLATFORMY.md). Zapisz datę, commit i wyniki.
- [ ] Jeśli istniały stare publiczne strony, wykonaj opisaną tam migrację dawnych realizacji. Zmiana DNS nie usuwa publicznych kopii. Pustego projektu ten krok nie dotyczy.
- [ ] Zapewnij backup bazy **i plików Storage**, sprawdź odtwarzanie, ustaw odbiorcę alarmów błędów i kontroluj koszty oraz dostarczalność poczty. Potwierdź dostępność funkcji w wybranych planach usług.

## Szybka diagnostyka

| Objaw | Sprawdź |
| --- | --- |
| Demo działa, strona klienta zwraca 503 | Zmienne obu aplikacji, migracje, logi serwerowe |
| Błąd źródła żądania | Bieżący adres względem `APP_URL`/`SITE_URL` |
| OTP nie dochodzi | SMTP, DNS nadawcy, limity, adres w zaproszeniu, spam, logi Auth |
| Potwierdzenie konta nie działa | Site URL, `token_hash`, `type=signup`, ważność tokena |
| 404 zaproszenia | Publikację, poprawność linku, cofnięcie dostępu |
| `LEGACY_PUBLICATION_ACTIVE` | Wyłączenie dawnych kopii przed wyczyszczeniem `vercel_project_id` |
