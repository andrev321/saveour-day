# Plan rozwoju platformy zaproszeń

Status: aktualizacja po wdrożeniu panelu, publikacji Vercel i edytora stron.

## Stan obecny

Gotowe są: walidowany model danych, renderer React/Mantine, trzy motywy i bezpieczne kolory, responsywny widok, media z wariantami WebP, panel z draftami, podglądem, publikacją, historią wydań i rollbackiem. Panel oraz szablony startowe obsługują polski, angielski i niemiecki. Instrukcja uruchomienia platformy i publikacji klienta jest w [WDROZENIE-PLATFORMY.md](WDROZENIE-PLATFORMY.md).

Zastosowane komponenty pochodzą z Mantine; ikony zapewnia Tabler. Nie utrzymujemy lokalnych kopii przycisków, pól, dialogów ani akordeonów.

## Priorytet 1 — stabilizacja stron

1. Utrzymać jedną stronę główną w nowym szablonie. Jest nieusuwalna, pokazuje wszystkie elementy i nie ma własnej konfiguracji kolejności ani widoczności.
2. Strony dodatkowe mają pełną listę wydarzeń i sekcji. Można zmienić ich kolejność oraz pokazać lub ukryć element, bez dodawania i usuwania relacji.
3. Rozdzielić w modelu danych kolejność od widoczności stron dodatkowych oraz przygotować migrację istniejących konfiguracji. Obecne `eventIds` i `sectionIds` pozostają warstwą zgodności do czasu migracji.
4. Dostosować testy jednostkowe i E2E do jednego szablonu startowego oraz sprawdzać stronę główną, stronę dodatkową, ukrywanie i zmianę kolejności.
5. Zachować techniczne identyfikatory poza panelem użytkownika; mają pozostawać stabilne w eksporcie i danych.

**Odbiór:** nowy projekt ma wyłącznie stronę główną. Dodana strona pokazuje wszystkie elementy, zapisuje niezależną kolejność i widoczność, a jej URL pozostaje unikalny. Nie można usunąć strony głównej ani przypadkowo zmienić jej układu.

## Priorytet 2 — odbiór produkcyjny i CI

1. Przeprowadzić rzeczywisty cykl na testowej realizacji: Supabase, upload, preview, publikacja Vercel, domena i rollback.
2. Dodać workflow CI: `npm ci`, typecheck, lint, testy jednostkowe, build demonstracyjny, build panelu oraz E2E.
3. Utrzymać checklistę odbiorową: 320, 390, 768, 1440 px, długie dane, brak zdjęcia lub mapy, linki, Safari iOS oraz Chrome Android.

**Odbiór:** nową realizację można przygotować zgodnie z dokumentacją bez nieopisanych kroków, a każde wdrożenie ma zapisany commit, release i adres preview.

## Priorytet 3 — prywatne zaproszenia

Publiczne zaproszenia mogą być statyczne. Dla ofert prywatnych trzeba przed publikacją wdrożyć uprawnienia gości do konkretnych stron, sesje, ograniczanie prób, prywatny cache i ochronę wszystkich zasobów, również mediów oraz starszych wdrożeń.

**Odbiór:** osoba bez uprawnienia nie pobiera danych ani obrazów przez bezpośredni URL, alternatywną domenę lub stare wydanie.

## Kolejne rozszerzenia

RSVP, eksport odpowiedzi, FAQ, noclegi, kalendarz i dodatkowe rodzaje sekcji są niezależnymi modułami. Każdy wymaga osobnego modelu danych, walidacji, retencji i testów.

## Decyzje utrzymane

- React, TypeScript, Vite, Next.js i Vercel pozostają bazą techniczną.
- Mantine pozostaje biblioteką komponentów i systemem motywów.
- Jedna realizacja klienta ma własne treści, media, domeny i projekt publikacyjny Vercel.
- Dane treściowe są walidowane, a sekrety infrastruktury nie trafiają do konfiguracji strony ani do kodu przeglądarki.
