# Edytor treści i schemat 3

Panel ma cztery obszary: Treść, Wygląd, Zdjęcia i Goście. Ustawienia projektu i historia są osobnymi narzędziami. Jeden wybór wariantu steruje edycją oraz podglądem.

## Edycja w kontekście

Treść pokazuje kolejność sekcji wybranego wariantu, ich widoczność, początek zaproszenia i stopkę. Sekcje można przesuwać myszą, klawiaturą lub strzałkami. Program umożliwia dodawanie, wybieranie i edycję wydarzeń oraz ich miejsc. Kontakt analogicznie zarządza kontaktami. Galeria zarządza zdjęciami i kadrami każdego użycia. Biblioteka zdjęć służy do uploadu, opisu oraz usuwania plików.

Treści i encje są współdzielone. Edytor pokazuje liczbę użyć i umożliwia utworzenie niezależnej kopii. Usunięcie z sekcji odłącza element; zarządzanie wspólnymi danymi usuwa go z całego szkicu i sprząta odwołania. Wydania i historyczne RSVP pozostają zachowane.

## Dane

- `schemaVersion: 3` jest jedyną wersją akceptowaną przez aplikację.
- Sekcje są unią typów: `timeline.eventIds`, `contact.contactIds`, `venue.venueId`, `gallery.mediaIds` i `gallery.crops`, oraz `text`.
- `variant.sections` to uporządkowana lista `{sectionId, visible}`. Każdy wariant, także domyślny, ma własną kolejność i widoczność.
- `variant.eventIds` określa dostęp do wydarzeń i RSVP. Ukrywanie sekcji nie zmienia uprawnień. Program pokazuje przecięcie swoich wydarzeń z uprawnieniami wariantu.
- `hero.crops` i `gallery.crops[mediaId]` zawierają niezależne ustawienia `desktop/tablet/mobile`, każde `{x,y}` w zakresie 0–100. Bez kadru urządzenia używany jest kadr desktop, następnie środek.
- Projekcja gościa zwraca wyłącznie widoczne sekcje i powiązane kontakty/zdjęcia/miejsca. Dostępne wydarzenia mogą istnieć w RSVP bez widocznej sekcji programu.

## Jednorazowa migracja

Migracja `contextual_editor_v3` konwertuje szkice, wydania i kopie szkiców, zachowując identyfikatory oraz ścieżki mediów. Dawne globalne kadry przenosi do użyć. Przenosi reguły domyślnego wariantu i starych ukrytych odwołań do jawnych list, po czym usuwa adapter starszej wersji. Rewizja szkicu wzrasta, aby otwarty stary edytor nie nadpisał nowych danych. Historyczny motyw `ivory` staje się `classic`; zapisane kolory pozostają zachowane. Uzupełnia ustawienia wyglądu, aby przywracanie kopii porównywało identyczne konfiguracje.

Wdrożenie wymaga skoordynowanej publikacji obu aplikacji i migracji bazy. Nie uruchamiaj dawnych klientów po migracji. Staging ma własne numery historycznych migracji — nową migrację stosuj osobno, nie wykonuj bezpośrednio `db push` całej lokalnej historii.

## Weryfikacja

Testy domeny i PGlite sprawdzają migrację, odwołania, niezależność wariantów, uprawnienia RSVP, izolację kontaktów oraz zachowanie historii. E2E sprawdzają edycję w kontekście, wybór z podglądu, kadry per urządzenie, warianty i ekrany 320–2560 px. Test współbieżności wymaga `TEST_DATABASE_URL`; CI udostępnia PostgreSQL 17.

Migracja obejmuje również archiwalne realizacje oznaczone do usunięcia. Wyłączne blokady tabel obowiązują do końca transakcji; wymagane triggery są przywracane przed zatwierdzeniem. Błąd wycofuje całość. Historia zdalnych wersji migracji znajduje się w `STAGING-STATUS.md`; nie uruchamiaj wszystkich historycznych migracji ponownie na stagingu.
