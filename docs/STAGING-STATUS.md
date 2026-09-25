# Staging — stan 2026-09-25

Obie aplikacje są wdrożone (READY), ale pełny odbiór OTP, zdjęć i RSVP nie jest zakończony. Wybrano testową wysyłkę Resend bez własnej domeny; SMTP jest aktywne, trzy szablony Auth zapisane, a rejestracja i potwierdzenie e-maila zostały sprawdzone.

## Adresy i wdrożenia

| Aplikacja | Adres |
| --- | --- |
| Panel | https://example-admin-staging.example.com |
| Zaproszenia | https://example-site-staging.example.com |

Branch `main`, repozytorium GitHub `andrev321/slub-strona`. Zespół Vercel: `example-team`. Stary projekt `slub-strona` pozostał bez zmian. Bieżący commit i identyfikatory wdrożeń sprawdzaj w historii Git oraz panelu Vercel.

Oba projekty: Next.js, Node 24.x, Root Directory odpowiednio `apps/admin` i `apps/site`, włączony dostęp do plików poza Root Directory. Install Command:

```sh
cd ../.. && npm ci --include=dev --workspaces --include-workspace-root
```

Pierwsze buildy nie instalowały wspólnych zależności z głównego package.json. Powyższa komenda naprawiła problem; oba ponowne wdrożenia zakończyły się sukcesem. Zmienne zapisano w zakresie Production osobnych projektów stagingowych. To nadal staging, a nie środowisko klientów. Klucz serwerowy wprowadził właściciel bezpośrednio w Vercelu.

## Supabase i weryfikacja

- Projekt stagingu: `example-staging-project`, Frankfurt; API: https://example-staging-project.example.com.
- Zastosowane trzy migracje; 13 tabel z RLS; prywatny bucket `site-media`, limit 8 MiB, JPEG/PNG/WebP.
- Site URL zapisany: `https://example-admin-staging.example.com`.
- Redirect URL zapisany: `https://example-admin-staging.example.com/auth/confirm`.
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

Klucz `example-staging-sender` z uprawnieniem `Sending access` został zapisany bezpośrednio w Supabase. Hasło SMTP nie trafia do Vercela; SDK Resend w aplikacji nie jest potrzebne. Wszystkie trzy szablony zostały zapisane zgodnie z checklistą (polskie tematy i treści).

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

## Wynik doradcy bezpieczeństwa

Doradca zwrócił ostrzeżenia o wykonywaniu funkcji SECURITY DEFINER: `can_access_site`, `is_platform_admin` oraz zastanej funkcji `rls_auto_enable`. Dwie pierwsze mają w kodzie kontrolę tożsamości i obsługują RLS; samo ostrzeżenie nie dowodzi obejścia uprawnień. Przed produkcją przejrzyj uprawnienia tych funkcji, w szczególności anonimowy EXECUTE oraz funkcję zastaną. Nie zmieniano ich poza migracjami repozytorium.

Wskazówki: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable i https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable.

Informacje o braku polityk dla `access_attempts` i `guest_sessions` są zgodne z projektem: dostęp tylko przez serwer, RLS włączone, brak uprawnień anon/authenticated. Nie dodawaj publicznych polityk dla tych tabel.



