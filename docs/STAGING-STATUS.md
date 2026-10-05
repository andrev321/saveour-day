# Staging — stan 2026-09-30

Obie aplikacje są wdrożone (READY), ale pełny odbiór OTP, zdjęć i RSVP nie jest zakończony. Wybrano testową wysyłkę Resend bez własnej domeny; SMTP jest aktywne, trzy szablony Auth zapisane, a rejestracja i potwierdzenie e-maila zostały sprawdzone.

## Adresy i wdrożenia

| Aplikacja | Adres |
| --- | --- |
| Panel | https://moj-slub-admin-staging.vercel.app |
| Zaproszenia | https://moj-slub-site-staging.vercel.app |

Branch `main`, repozytorium GitHub `andrev321/slub-strona`. Zespół Vercel: `andrev-s-projects`. Stary projekt `slub-strona` pozostał bez zmian. Bieżący commit i identyfikatory wdrożeń sprawdzaj w historii Git oraz panelu Vercel.

Oba projekty: Next.js, Node 24.x, Root Directory odpowiednio `apps/admin` i `apps/site`, włączony dostęp do plików poza Root Directory. Install Command:

```sh
cd ../.. && npm ci --include=dev --workspaces --include-workspace-root
```

Pierwsze buildy nie instalowały wspólnych zależności z głównego package.json. Powyższa komenda naprawiła problem; oba ponowne wdrożenia zakończyły się sukcesem. Zmienne zapisano w zakresie Production osobnych projektów stagingowych. To nadal staging, a nie środowisko klientów. Klucz serwerowy wprowadził właściciel bezpośrednio w Vercelu.

## Supabase i weryfikacja

- Projekt stagingu: `ymhffmoxwmrvkviuwajw`, Frankfurt; API: https://ymhffmoxwmrvkviuwajw.supabase.co.
- Zastosowane trzy migracje; 13 tabel z RLS; prywatny bucket `site-media`, limit 8 MiB, JPEG/PNG/WebP.
- Site URL zapisany: `https://moj-slub-admin-staging.vercel.app`.
- Redirect URL zapisany: `https://moj-slub-admin-staging.vercel.app/auth/confirm`.
- Potwierdzono: Email Enabled, rejestracje włączone, Confirm email włączone, anonymous sign-ins wyłączone.
- Lokalne typecheck, lint, 24 testy i oba buildy przeszły.
- W przeglądarce działa ekran logowania panelu i demonstracja `/demo/glowna` zaproszeń; brak błędów konsoli podczas tych kontroli.
- Rejestracja i potwierdzenie konta przez Resend działają. Nie wykonano jeszcze pełnego testu resetu hasła, OTP, uploadu, publikacji ani RSVP na prawdziwych usługach.

## Resend — testy bez własnej domeny

Właściciel wybrał wariant testowy `onboarding@resend.dev`. Resend nie ma dodanej własnej domeny. Ten nadawca pozwala wysyłać tylko do dokładnego adresu właściciela konta Resend, potwierdzonego w rozmowie. Inne adresy, w tym aliasy z plusem, nie są objęte tym testem.

W formularzu Supabase → Authentication → Emails → SMTP Settings przygotowano poniższe parametry. **Właściciel zapisał klucz API, custom SMTP jest aktywne.** Potwierdzono odblokowanie edycji szablonów oraz zapis szablonów Confirm sign up, Magic link or OTP i Reset password.

| Pole | Wartość |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | klucz API Resend, wpisany bezpośrednio w Supabase |
| Sender email | `onboarding@resend.dev` |
| Sender name | `Pracownia zaproszeń — staging` |
| Minimum interval per user | `60` sekund |

Klucz `supabase-staging` z uprawnieniem `Sending access` został zapisany bezpośrednio w Supabase. Hasło SMTP nie trafia do Vercela; SDK Resend w aplikacji nie jest potrzebne. Wszystkie trzy szablony zostały zapisane zgodnie z checklistą (polskie tematy i treści).

Pozostaje przetestować reset hasła i OTP na skrzynce właściciela Resend. Dla OTP przypisz ten sam adres do rodzinnego zaproszenia.

## Panel i kody QR

Po potwierdzeniu adresu e-mail panel pokazuje komunikat o aktywacji konta. Nowe szablony wydarzeń osobistych zawierają spójne, fikcyjne imiona i przykładowe treści w języku polskim, angielskim i niemieckim.

Sekcja „Publikacja, goście i odpowiedzi” zawiera generator kodu QR publicznego adresu zaproszenia. Generator działa lokalnie w przeglądarce, pozwala wybrać kolor kodu i tła, styl elementów oraz serduszko pośrodku. Po publikacji kod można skopiować do schowka jako PNG. Należy sprawdzić odczyt gotowego kodu co najmniej dwoma telefonami, szczególnie po zmianie kolorów.

Do testów z innymi organizatorami i gośćmi potrzebna będzie własna domena nadawcza: dodaj ją w Resend, ustaw dokładne rekordy DNS wskazane przez usługę, poczekaj na weryfikację i zmień Sender email oraz ewentualne ograniczenie klucza. Aplikacje mogą pozostać na adresach vercel.app. Wyłącz śledzenie linków dla maili Auth i sprawdź limity wysyłki.

Źródła: [Supabase + Resend SMTP](https://resend.com/docs/send-with-supabase-smtp), [ograniczenia resend.dev](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## Historia migracji

Integracja nadała własne wersje historii. Nie uruchamiaj ponownie migracji ani `supabase db push` bez uzgodnienia historii lokalnej i zdalnej:

| Plik lokalny | Zdalna wersja | Nazwa |
| --- | --- | --- |
| 202609200001_platform.sql | 20260924210635 | platform |
| 202609210001_guest_platform.sql | 20260924210649 | guest_platform |
| 202609230001_invitation_templates.sql | 20260924210816 | invitation_templates |
| 20260929060915_site_soft_delete.sql | 20260929062727 | site_soft_delete |
| 20260929060918_monthly_site_purge.sql | 20260929062743 | monthly_site_purge |
| 20260929063114_isolate_purge_extension.sql | 20260929063222 | isolate_purge_extension |
| 20260929112149_fix_storage_media_read_policy.sql | 20260929112326 | fix_storage_media_read_policy |
| 20260929112334_delete_unused_media.sql | 20260929113018 | delete_unused_media |
| 20260930165858_harden_media_lifecycle.sql | 20260930173525 | harden_media_lifecycle |

## Odczyt i usuwanie zdjęć — 29.09.2026

Naprawiono politykę `storage.objects.read_own_media`: niekwalifikowane `name` w podzapytaniu odnosiło się do `sites.name`, więc właściciel nie mógł generować podpisanych adresów zdjęć. Reguła używa teraz `storage.objects.name`. Na rzeczywistym koncie właściciela, przez transakcyjne ustawienie roli do testu RLS, potwierdzono widoczność sześciu plików obu zdjęć. Test lokalny odtwarzał brak dostępu przed poprawką i sprawdza odczyt właściciela, członka oraz izolację pozostałych realizacji po poprawce.

Wdrożono funkcje rezerwacji i finalizacji usuwania nieużywanego zdjęcia. Dostęp do nich ma wyłącznie serwer (`service_role`), a aktor jest sprawdzany w bazie. Nie usuwano zdjęć użytkownika w ramach weryfikacji. Testy usuwania korzystają z odizolowanej bazy i atrap Storage. Doradca bezpieczeństwa nie zgłosił nowych ostrzeżeń związanych z tymi funkcjami.

## Usuwanie realizacji — 29.09.2026

Wdrożono migracje soft delete oraz Edge Function `purge-sites` (wersja 1). Aktywny Cron `purge-deleted-sites-monthly` ma harmonogram `0 3 1 * *` (03:00 UTC, pierwszy dzień miesiąca). Funkcja odrzuciła próbę z nieprawidłowym tokenem kodem 403. Sprawdzono uprawnienia: funkcje czyszczące nie są wykonywalne przez `anon` ani klienta panelu. Nie usuwano istniejących realizacji podczas weryfikacji; mechanizm trwałego usuwania sprawdzono na odizolowanej bazie PGlite i atrapach Storage.

Szczegóły retencji, konfiguracji oraz kontroli nieudanych zadań: [Usuwanie realizacji](USUWANIE-REALIZACJI.md).

Doradca zgłasza `extension_in_public` dla nowo włączonego `pg_net`. Automatyczna kontrola odrzuciła jego odtworzenie w schemacie `extensions` ze względu na ryzyko przerwania dispatchera. Rozszerzenie pozostaje w dotychczasowej lokalizacji. Migracja `isolate_purge_extension` zawiera tylko REVOKE USAGE, ale ponowna kontrola wykazała, że uprawnienia nadane przez właściciela `supabase_admin` nadal obowiązują na zarządzanym środowisku. Schemat `net` nie jest standardowo udostępniony przez Data API; nie należy go tam dodawać. Nie traktuj samego sukcesu tej migracji jako potwierdzenia cofnięcia uprawnień. [Opis ostrzeżenia](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [uprawnienia pg_net](https://supabase.com/docs/guides/database/extensions/pg_net#permissions).

## Wynik doradcy bezpieczeństwa

Doradca zwrócił ostrzeżenia o wykonywaniu funkcji SECURITY DEFINER: `can_access_site`, `is_platform_admin` oraz zastanej funkcji `rls_auto_enable`. Dwie pierwsze mają w kodzie kontrolę tożsamości i obsługują RLS; samo ostrzeżenie nie dowodzi obejścia uprawnień. Przed produkcją przejrzyj uprawnienia tych funkcji, w szczególności anonimowy EXECUTE oraz funkcję zastaną. Nie zmieniano ich poza migracjami repozytorium.

Wskazówki: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable i https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.

Informacje o braku polityk dla `access_attempts` i `guest_sessions` są zgodne z projektem: dostęp tylko przez serwer, RLS włączone, brak uprawnień anon/authenticated. Nie dodawaj publicznych polityk dla tych tabel.





## Poprawki cyklu mediów — wdrożone 30.09.2026

PR #1 został scalony do `main` jako `9905cac55f2a9db50a8d4f5434d638bdc5fe7b8f`. Integracja GitHub–Vercel automatycznie wdrożyła obie aplikacje przed zastosowaniem migracji; baza została następnie zaktualizowana o 17:35 UTC (19:35 w Polsce). Dla kolejnych zmian wymagających migracji stosuj kolejność opisaną w instrukcji wdrożenia.

| Komponent | Potwierdzony stan |
| --- | --- |
| Panel | READY, `dpl_DHddorTz5y6bUZ3JmoW7bNG3smKg`, alias `moj-slub-admin-staging.vercel.app` |
| Zaproszenia | READY, `dpl_2LWgzvYRrGnk7b5a2k1qB4rzhjdr`, alias `moj-slub-site-staging.vercel.app` |
| Supabase | `harden_media_lifecycle`, wersja historii `20260930173525` |
| Worker purge | ACTIVE, wersja 1; kod zgodny z repozytorium, bez potrzeby ponownego wdrożenia |
| Cron purge | Aktywny, `0 3 1 * *`, poprawny adres workera |

Weryfikacja na stagingu po migracji:
- Prywatny bucket `site-media`; jedyna polityka klienta Storage to INSERT przez `can_upload_media`. Kolumna `original_path` jest ukryta przed klientem.
- Funkcje rezerwacji, finalizacji i usuwania są dostępne wyłącznie dla `service_role`.
- Test w transakcji z ROLLBACK potwierdził rezerwację uploadu, zgodę tylko na właściwą ścieżkę wariantu, odmowę odczytu Storage przez właściciela, stan terminalny `deleting`, odrzucenie spóźnionej finalizacji oraz zakończenie usuwania metadanych.
- Panel główny i demo zaproszeń zwracają 200. Niezalogowane wywołania listy realizacji, uploadu i odczytu zdjęcia zwracają 401 z `no-store`; nieistniejące zaproszenie zwraca 404.
- Worker odrzuca nieprawidłowy token zadania kodem 403; uprawnienia klienta do funkcji purge pozostają zablokowane.
- Zachowano 2 istniejące rekordy zdjęć i 6 obiektów Storage. Nie uruchamiano purge istniejących realizacji ani nie usuwano zdjęć użytkownika.
- Brak logów error/fatal obu wdrożeń w sprawdzonym okresie po zastosowaniu migracji.

CI PR #1 zakończyło się sukcesem: 36 testów (w tym współbieżność na PostgreSQL), 54 E2E, lint, TypeScript i buildy demo/panelu; build zaproszeń przeszedł również lokalnie. W tej kontroli stagingu nie wykonano pełnego uploadu/odczytu z sesją użytkownika ani pozytywnego trwałego purge na rzeczywistym Storage.

Doradca bezpieczeństwa nadal zgłasza wcześniejsze ostrzeżenia dla `pg_net`, funkcji pomocniczych SECURITY DEFINER i wyłączonej ochrony przed wyciekłymi hasłami. Nowe ostrzeżenie dla `can_upload_media` wynika z celowego EXECUTE dla authenticated: funkcja kontroluje tożsamość, realizację, stan uploadu, jego wygaśnięcie i tajną ścieżkę, a dostęp anon jest cofnięty. Nie zmieniano niezwiązanej konfiguracji Auth ani zarządzanego rozszerzenia.

Ograniczenie wdrożenia: wcześniej wystawione signed URLs nie zostały odwołane. Stare tokeny uploadu mogą działać do dwóch godzin, a tokeny odczytu do swojego terminu wygaśnięcia; klient z dawnym SELECT mógł wystawić dłuższe. Nowe API ich nie wystawia. Szczegóły i procedura natychmiastowego odcięcia dawnych uprawnień: [Usuwanie realizacji](USUWANIE-REALIZACJI.md), sekcja „Cykl mediów po poprawkach z 30.09.2026”.

Źródła ostrzeżeń doradcy: [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [ochrona haseł](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).


## Edytor kontekstowy v3 — wdrożony 01.10.2026

Zmiana `0a38e3b` przebudowuje panel wokół sekcji zaproszenia. Program zawiera edycję wydarzeń i miejsc, kontakt zawiera edycję osób, a kadry zdjęć należą do konkretnego użycia. Warianty mają własną kolejność, widoczność sekcji i uprawnienia do wydarzeń. Kod przyjmuje wyłącznie konfiguracje v3.

Migracja `20260930204955_contextual_editor_v3.sql` została zastosowana jako zdalna wersja `20261001054945`. Pierwsza próba wycofała się z powodu ochrony archiwalnej, usuniętej realizacji. Poprawka `21b6c9c` konwertuje także archiwa: w transakcji blokuje cztery tabele, zawiesza potrzebne triggery tylko na czas konwersji i przywraca je przed zatwierdzeniem. Nie zmienia stanu usunięcia, identyfikatorów ani ścieżek zdjęć.

Potwierdzono po migracji:

- Wszystkie 7 istniejących konfiguracji szkiców, publikacji i historii przechodzi ścisłą walidację v3 bez dodatkowego normalizowania w aplikacji. Podczas wdrożenia powstała kolejna realizacja; obecny stan to 3 realizacje i szkice, 2 publikacje, 2 migawki i 2 rekordy mediów.
- Nie pozostały adaptery `upgrade_config_v2` ani pomocnicze funkcje konwersji. Wszystkie triggery ochronne są aktywne.
- Test procedur przywrócił migawkę, opublikował szkic i odrzucił nieaktualną rewizję. Cała kontrola zakończyła się ROLLBACK, bez trwałych zmian treści użytkownika.
- Doradca bezpieczeństwa nie zgłosił nowych ostrzeżeń względem stanu przed zmianą. Wcześniejsze uwagi opisano powyżej.
- Oba projekty Vercel są READY; publiczne demo zaproszeń działa w przeglądarce. Panel wymaga logowania, a deweloperska ścieżka `/demo` pozostaje wyłączona na Vercelu. Pełny edytor zweryfikowano lokalnymi E2E i w CI.

Pełne CI zmiany interfejsu (`0a38e3b`) przeszło: TypeScript, lint, 42 testy z PostgreSQL, buildy oraz 59 E2E. Po poprawce migracji uzupełniono starsze fixture'y testów bazowych o wszystkie poprzedzające migracje; ich skrócony schemat nie zawierał wymaganych triggerów. Bieżący wynik końcowego CI jest dostępny w GitHub Actions.

## Przykładowe zdjęcia — 2026-10-05

Zastosowano migrację `template_sample_media` na stagingu `ymhffmoxwmrvkviuwajw`; wersja historii zdalnej: `20261005193143`, plik lokalny: `20261005123525_template_sample_media.sql`. Wcześniejsze migracje zweryfikowano po nazwach (historia zdalna ma inne znaczniki czasu).

Kontrola SQL potwierdziła akceptację kompletnego manifestu przykładu, odrzucenie podmienionej ścieżki i brak bezpośredniego EXECUTE dla anon/authenticated na nowej funkcji prywatnej. Lokalnie: 55 testów poprawnych, 1 test zewnętrznego PostgreSQL pominięty; 9 E2E, lint, TypeScript i oba buildy poprawne.

Advisors nie wskazał nowych funkcji tej migracji. Zgłosił istniejące ustawienia poza jej zakresem: pg_net w public, dostępność wcześniejszych funkcji SECURITY DEFINER, wyłączoną ochronę wyciekłych haseł oraz informacyjne RLS bez polityk na tabelach obsługiwanych przez serwer. Odnośniki do analizy: [rozszerzenia](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [funkcje dostępne anonimowo](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [funkcje użytkowników](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [ochrona haseł](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
