# Decyzje techniczne

Stan: 2026-09-23. Poniższe decyzje opisują aktualną implementację, a nie plan funkcji. Szczegóły przepływów i danych znajdują się w [architekturze](ARCHITEKTURA.md).

| Decyzja | Uzasadnienie | Konsekwencja |
| --- | --- | --- |
| Dwie aplikacje Next.js: panel i wspólna aplikacja gości | Oddzielne adresy i konfiguracja części administracyjnej oraz zaproszeń przy współdzieleniu kodu | Każde środowisko wymaga dwóch konfiguracji aplikacji; publikacja klienta nie tworzy nowego projektu Vercel |
| Stałe adresy `/s/` i losowe linki `/i/` | Nie trzeba kupować domen ani wdrażać kodu dla każdej rodziny lub realizacji | Slug identyfikuje realizację, ale nie zastępuje autoryzacji; własne domeny wymagają osobnej implementacji |
| Publikacja przez niezmienne wydania w Postgres | Atomowe przełączenie treści, niezależność szkicu i proste przywracanie publikacji | Powrót do wcześniejszych treści nie przywraca starego kodu, ustawień dostępu ani RSVP |
| Supabase dla Postgres, Auth i prywatnego Storage | Wykorzystanie istniejącej infrastruktury i transakcyjnych kontroli danych | Backend z `service_role` musi sam sprawdzać uprawnienia; RLS i uprawnienia kolumnowe chronią odczyty klienta |
| Wspólny schemat Zod i renderer React/Mantine | Podgląd i publikacja używają tego samego kontraktu i komponentów | Zmiana schematu lub renderera wymaga sprawdzenia istniejących konfiguracji; kod jest wspólny dla wszystkich klientów |
| Wariant przypisany po stronie serwera | Ukryte sekcje i wydarzenia nie powinny być pobierane przez niewłaściwego odbiorcę | Nie wystarczy ukrywanie elementów CSS-em; projekcja treści i kontrola mediów należą do backendu |
| Trzy tryby dostępu na poziomie realizacji | Jasne zasady dla organizatora i wszystkich zaproszeń w realizacji | Nie ma osobnego trybu lub kodu dla każdej rodziny; indywidualizację zapewniają token, wariant i lista e-maili |
| OTP e-mail dla gości, hasło dla organizatora | Gość nie musi zakładać i pamiętać hasła do zaproszenia | Wymagane są właściwe szablony Supabase Auth i działający SMTP; dopuszczony e-mail daje dostęp do całej przypisanej rodziny |
| Odrębne, wersjonowane sesje gości | Możliwość odwołania dostępu bez przekazywania tokenów Supabase do przeglądarki gościa | Każde chronione żądanie sprawdza sesję i aktualne wersje dostępu; trwałość sesji wynosi 7 dni |
| Prywatne media i brak cache treści gości | Spójna kontrola uprawnień również dla bezpośrednich adresów zdjęć | Ruch i koszty obsługi mediów obciążają runtime/Storage; przyszła optymalizacja cache musi zachować izolację uprawnień |
| RSVP poza konfiguracją wydania | Odpowiedzi mają przetrwać publikację, rollback treści i edycję zaproszenia | Zapis wymaga własnej rewizji, kontroli gościa i wydarzenia oraz terminu odpowiedzi |
| Migracja przyrostowa i zachowanie historii | Istniejące realizacje, wydania i audyt muszą pozostać dostępne | Stare tabele i pola nie oznaczają aktywnego mechanizmu deploymentów; dawny publiczny hosting trzeba osobno wyłączyć |
| Node.js 24 w lokalnej weryfikacji i CI | Spójność środowiska z zestawem testów, w tym mockowaniem modułów `node:test` | Dokumentacja uruchomienia przyjmuje Node.js 24; dokładne zależności instaluje `npm ci` |

## Uniwersalne zaproszenia i szablony

- Jeden schemat v2 i renderer obsługują dowolny typ wydarzenia; `identity.displayName` zastępuje obowiązkowe dwa imiona. Ślub jest danymi szablonu, a nie regułą produktu.
- Szablony są wartościami początkowymi. Ich późniejsza aktualizacja nie zmienia istniejących realizacji. Wybór języka szablonu jest niezależny od języka panelu.
- Reset jest operacją na szkicu, z potwierdzeniem, kopią serwerową i kontrolą rewizji. Nie publikuje automatycznie i nie usuwa RSVP. Nowe ID wydarzeń uniemożliwiają przypadkowe odziedziczenie odpowiedzi.
- Aktywne powiązania z usuwanymi wariantami blokują reset. Organizator rozwiązuje zależności przed operacją; rodziny nie są automatycznie przepinane.
- Zapis pustego szkicu jest dozwolony; gotowość do publikacji ma osobną walidację.
- Odczyt i przywracanie v1 używają adaptera w TypeScript/SQL. Migracja konwertuje szkice, a historyczne wydania pozostawia niezmienne.

## Decyzje zastąpione

- Vite jako aplikacja publikowana dla klienta zastąpił wspólny Next.js runtime.
- Osobne projekty Vercel, buildy i domeny realizacji zastąpiły wydania w bazie i wspólne adresowanie.
- Publiczne paczki zawierające konfiguracje wariantów zastąpił autoryzowany odczyt projekcji konkretnego wariantu.
- Webhook zakończenia builda i token manifestu nie uczestniczą w publikacji; aktywne wydanie zmienia transakcja SQL.

Wszystkie trzy migracje bazy pozostają wymagane. Mechanizm `LEGACY_PUBLICATION_ACTIVE` blokuje włączenie ochrony, dopóki operator nie potwierdzi wyłączenia starych publicznych kopii i nie wyczyści pola `vercel_project_id`. Procedura jest opisana w [instrukcji wdrożenia](WDROZENIE-PLATFORMY.md).
