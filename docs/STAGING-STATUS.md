# Staging — stan 2026-09-25

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





## Poprawki cyklu mediów — przygotowane 30.09.2026

Migracja `20260930165858_harden_media_lifecycle.sql` i nowe API uploadu/odczytu wymagają wdrożenia. Ten wpis nie potwierdza zastosowania migracji ani zmiany konfiguracji stagingu. Instrukcja wdrożenia i ograniczenie dotyczące już wystawionych tokenów Storage: `USUWANIE-REALIZACJI.md`, sekcja „Cykl mediów po poprawkach z 30.09.2026”.
