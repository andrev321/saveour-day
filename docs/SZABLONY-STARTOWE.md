# Szablony startowe zaproszeń

Implementacja: 2026-09-23. Plan uniwersalnych zaproszeń został zastąpiony tym opisem działania. Konfiguracja usług i zastosowanie trzeciej migracji pozostają osobnymi czynnościami operatora.

## Wybór szablonu

Praca z nowym projektem zaczyna się od ekranu wyboru szablonu, także w lokalnej demonstracji `/demo`. Żaden szablon nie jest wybrany automatycznie. Wpisz nazwę projektu, wybierz **Szablon startowy** i **Język treści szablonu**, a następnie utwórz zaproszenie. Nazwa projektu w panelu jest niezależna od głównego napisu widocznego dla gości.

Dostępne są: ślub, wesele, ślub i wesele, urodziny, impreza firmowa, rocznica/jubileusz, chrzciny/komunia, baby shower, parapetówka, spotkanie/warsztaty oraz **puste zaproszenie**. Każdy szablon ma treści PL/EN/DE. Przykładowe informacje należy dopasować przed publikacją. Pusty start nie zawiera osób, dat, wydarzeń, sekcji, kontaktów ani zdjęć.

Szablon dostarcza wartości początkowe wspólnego konfiguratora. Po wyborze można dowolnie edytować pola, układ i kolory. Nie powstaje osobny typ aplikacji. Zmiana języka panelu nie zmienia wpisanych treści.

## Zmiana w edytorze

W edytorze otwórz zakładkę **Ustawienia** i rozwiń domyślnie zamkniętą sekcję **Zmiana szablonu i kopie szkicu**. Wybór szablonu nie jest stale wyświetlany nad edytorem. Wybierz szablon i język, kliknij **Zmień szablon startowy**, przeczytaj zakres resetu i potwierdź **Zastąp konfigurację**. Anulowanie nie zmienia szkicu.

Reset zastępuje teksty, wydarzenia, sekcje, warianty, wygląd i przypisania zdjęć. Niezapisane zmiany są odrzucane. Serwer zachowuje kopię ostatniego **zapisanego** szkicu; jeśli chcesz zachować bieżące zmiany, najpierw je zapisz lub wyeksportuj.

Pozostają: ID i adres strony, nazwa projektu, właściciel, ustawienia dostępu, termin RSVP, rodziny, linki, odpowiedzi i pliki biblioteki mediów. Publiczna strona zmieni się dopiero po publikacji nowego szkicu.

Nowe wydarzenia dostają nowe ID. Stare odpowiedzi pozostają w historii, ale nie są odpowiedziami na nowe wydarzenia. Jeśli reset usuwa wariant używany przez aktywną rodzinę lub stronę ogólną, operacja jest blokowana i wskazuje zależności. Najpierw przypisz zachowany wariant główny lub cofnij odpowiednie zaproszenia.

## Kopie i pusty szkic

W tej samej rozwijanej sekcji z listy **Kopia zapisanego szkicu** wybierz jedną z 20 najnowszych kopii i kliknij **Przywróć kopię szkicu**. Przywrócenie również wymaga potwierdzenia, kontroli rewizji i zależności wariantów. Przed nadpisaniem zachowuje kolejną kopię. Nie jest rollbackiem publikacji.

Pusty szkic można zapisać bez wydarzeń i sekcji. Przed publikacją uzupełnij **Główny napis**. Brak daty czy zdjęcia nie blokuje publikacji. Gość zaproszenia bez wydarzeń zobaczy informację o braku wydarzeń do potwierdzenia.

## Zgodność i testowanie

Nowy format konfiguracji to v2 z `identity.displayName`. Starsze v1 są odczytywane przez adapter, który zachowuje istniejące ID wydarzeń i ich RSVP. Migracja `202609230001_invitation_templates.sql` konwertuje szkice, tworzy ich kopie i aktualizuje funkcje publikacji; historyczne wydania v1 pozostają niezmienione.

Demonstracja pod `/demo` panelu otwiera najpierw wybór szablonu. Dopiero przycisk „Utwórz zaproszenie” otwiera konfigurator. Opcjonalny przycisk „Otwórz gotowy przykład” otwiera wypełniony przykład do szybkiego przeglądu. Reset i kopie również można sprawdzić bez Supabase. Dane demonstracji znikają po odświeżeniu strony. Trwały zapis wymaga konfiguracji usług i wszystkich migracji.

Testy obejmują katalog we wszystkich językach, walidację pustego szkicu, tworzenie przez API, migrację v1, SQL resetu i kopii, izolację użytkowników, konflikty rewizji, zależności wariantów, zachowanie RSVP i publikacji oraz potwierdzenie/anulowanie resetu w przeglądarce.
