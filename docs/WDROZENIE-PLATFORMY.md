# Wdrożenie platformy i publikacja klienta

Instrukcja dotyczy implementacji z tego repozytorium. Rozdziela panel administracyjny od każdego publicznego zaproszenia, dzięki czemu w artefakcie klienta nie ma danych pozostałych realizacji ani kluczy dostępowych.

## 1. Jednorazowe przygotowanie usług

1. Utwórz produkcyjny projekt Supabase oraz osobny projekt do testów/stagingu.
2. W SQL Editor uruchom plik `supabase/migrations/202609200001_platform.sql`. Następnie w Authentication włącz logowanie e-mail/hasło, ustaw adres panelu jako Site URL oraz dodaj adresy Preview do Redirect URLs.
3. W Storage utwórz prywatny bucket `site-media`. Nie zmieniaj go na publiczny. Migracja dodaje zasady dostępu do metadanych; pliki są pobierane przez podpisane URL-e generowane na serwerze.
4. Załóż projekt Vercel `wedding-admin` z Root Directory `apps/admin`. Importuje on to repozytorium i wdraża panel.
5. Dodaj w Vercel dla panelu zmienne z `apps/admin/.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN` i `VERCEL_WEBHOOK_SECRET` są sekretami serwerowymi: wpisuj je wyłącznie do środowisk Vercel, nigdy z prefiksem `NEXT_PUBLIC_`.
6. Ustaw `APP_URL` na produkcyjny adres panelu. Ustaw `VERCEL_TEAM_ID`, `VERCEL_GITHUB_REPO_ID` oraz `ENGINE_GIT_SHA` dla zespołu i repozytorium zawierającego ten kod. `ENGINE_GIT_SHA` musi być pełnym, 40-znakowym SHA zaakceptowanego commitu silnika. Token Vercel musi mieć dostęp tylko do tego zespołu i projektów zaproszeń.
7. Pierwszego administratora dodaj w tabeli `platform_admins` po utworzeniu jego konta w Supabase Auth. Id użytkownika pobierzesz z Authentication → Users.

Przykład nadania roli administratora:

```sql
insert into public.platform_admins (user_id)
values ('UUID-UŻYTKOWNIKA-Z-SUPABASE-AUTH');
```

## 2. Sprawdzenie wdrożenia panelu

Po wdrożeniu otwórz panel, zaloguj się, utwórz testową realizację i sprawdź:

- użytkownik bez sesji otrzymuje `401` z endpointów `/api/sites`;
- użytkownik klienta widzi wyłącznie realizację, do której został zaproszony;
- przesłane zdjęcie w Storage nie jest dostępne przez anonimowy URL;
- zapis tworzy nową wersję roboczą, a publikacja nie zmienia wcześniejszego wydania;
- dziennik `audit_events` zawiera wpisy zapisu i publikacji.

Przed uruchomieniem z prawdziwymi danymi ustaw Deployment Protection dla Preview panelu. Produkcyjny panel powinien używać własnej domeny oraz HTTPS.

## 3. Pierwsza publikacja dla klienta

1. W panelu utwórz realizację z identyfikatorem klienta. Utwórz dla niej użytkownika klienta w Supabase Auth i dodaj go przez funkcję „Zaproś użytkownika”.
2. Wprowadź teksty, harmonogram, lokalizacje i linki. Walidator przyjmuje tylko bezpieczne adresy HTTPS, a obrazki mogą wskazywać wyłącznie pliki dodane przez panel.
3. Prześlij zdjęcia. Serwer sprawdza MIME i rozmiar, usuwa metadane EXIF oraz zapisuje trzy warianty WebP.
4. W sekcji projektu Vercel utwórz projekt publikacji o nazwie np. `zaproszenie-anna-piotr`. Projekt wskazuje to repozytorium, Root Directory `apps/site`, Install Command `npm ci`, Build Command `npm run build --workspace @wedding/site`, Output Directory `dist`.
5. W panelu przypisz identyfikator projektu Vercel do realizacji. Przyciskiem „Publikuj” panel zapisze niezmienny manifest, zaszyfruje jednorazowy token w zmiennych projektu i zleci deployment.
6. Otwórz zwrócony adres Preview. Sprawdź dane, każde zaproszenie, zdjęcia, linki, mapy oraz widoki 320, 390, 768 i 1440 px. Po odbiorze przypisz domenę w projekcie Vercel.

Publiczny build pobiera manifest podczas kompilacji. Token jest używany wyłącznie w tym kroku i nie trafia do JavaScriptu ani do przeglądarki gości. Wydanie jest przypięte do wersji konfiguracji i listy zasobów z chwili publikacji.

## 4. Domena i webhook

Dodaj domenę klienta w Settings → Domains właściwego projektu Vercel i ustaw rekord DNS pokazany przez Vercel. Po weryfikacji HTTPS w panelu wybierz „Dodaj domenę”; panel zapisze domenę przy realizacji.

Dodaj webhook Vercel dla zdarzeń deploymentu, skierowany na:

`https://ADRES-PANELU/api/webhooks/vercel`

Ustaw ten sam sekret jako `VERCEL_WEBHOOK_SECRET`. Endpoint sprawdza podpis HMAC przed zmianą stanu wydania.

## 5. Kolejne zmiany i cofnięcie

Każda poprawka powstaje jako nowy draft. Po publikacji otrzymuje nowy release oraz deployment; poprzednia wersja pozostaje możliwa do przywrócenia w panelu. Przywrócenie publikuje wcześniejszy manifest jako kolejne wydanie, więc zachowuje pełny ślad audytowy.

Jeśli awaria dotyczy wyłącznie hostingu, użyj rollbacku Vercel dla konkretnego projektu. Jeśli dotyczy danych, przywróć wydanie w panelu i opublikuj ponownie. Nie usuwaj ręcznie plików Storage przypiętych do opublikowanych wersji.

## 6. Zasady operacyjne

- Jeden projekt Vercel przypada na jedną realizację i jej domeny.
- Osobne środowiska Supabase i Vercel stosuj dla testów oraz produkcji.
- Rzeczywiste dane i zdjęcia wprowadzaj przez panel, nie przez pliki `.env` ani commit Git.
- Co kwartał sprawdzaj listę członków Vercel, Supabase i wygasaj dostęp byłych współpracowników.
- Ustal z klientem termin retencji. Po nim usuń domenę, wydania, media i rekord realizacji w kontrolowanej procedurze.
