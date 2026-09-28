# Szablony startowe zaproszeń

Implementacja: 2026-09-23. Plan uniwersalnych zaproszeń został zastąpiony tym opisem działania. Konfiguracja usług i zastosowanie trzeciej migracji pozostają osobnymi czynnościami operatora.

## Wybór szablonu

Przycisk **Utwórz zaproszenie** otwiera popup wyboru szablonu, także w lokalnej demonstracji `/demo`. Żaden szablon nie jest wybrany automatycznie. Wpisz nazwę projektu, wybierz **Szablon startowy** i **Język treści szablonu**, a następnie utwórz zaproszenie. Nazwa projektu w panelu jest niezależna od głównego napisu widocznego dla gości.

Dostępne są: ślub, wesele, ślub i wesele, urodziny, impreza firmowa, rocznica/jubileusz, chrzciny/komunia, baby shower, parapetówka, spotkanie/warsztaty oraz **puste zaproszenie**. Każdy szablon ma treści PL/EN/DE. Przykładowe informacje należy dopasować przed publikacją. Pusty start nie zawiera osób, dat, wydarzeń, sekcji, kontaktów ani zdjęć.

Szablon dostarcza wartości początkowe wspólnego konfiguratora. Po wyborze można dowolnie edytować pola, układ i kolory. Nie powstaje osobny typ aplikacji. Zmiana języka panelu nie zmienia wpisanych treści.

## Zmiana w edytorze

W górnym pasku edytora kliknij ikonę **Zmień szablon startowy**. Otworzy się ten sam popup wyboru co przy tworzeniu projektu, tym razem z ostrzeżeniem o resecie konfiguracji. Wybierz szablon i język, przeczytaj zakres resetu i potwierdź **Zastąp konfigurację**. Wybór nie jest dokonywany automatycznie. Anulowanie ani samo otwarcie popupu nie zmienia szkicu.

Reset zastępuje teksty, wydarzenia, sekcje, warianty, wygląd i przypisania zdjęć. Niezapisane zmiany są odrzucane. Serwer zachowuje kopię ostatniego **zapisanego** szkicu; jeśli chcesz zachować bieżące zmiany, najpierw je zapisz lub wyeksportuj.

Pozostają: ID i adres strony, nazwa projektu, właściciel, ustawienia dostępu, termin RSVP, rodziny, linki, odpowiedzi i pliki biblioteki mediów. Publiczna strona zmieni się dopiero po publikacji nowego szkicu.

Nowe wydarzenia dostają nowe ID. Stare odpowiedzi pozostają w historii, ale nie są odpowiedziami na nowe wydarzenia. Jeśli reset usuwa wariant używany przez aktywną rodzinę lub stronę ogólną, operacja jest blokowana i wskazuje zależności. Najpierw przypisz zachowany wariant główny lub cofnij odpowiednie zaproszenia.

## Kopie i pusty szkic

W zakładce **Ustawienia**, w rozwijanej sekcji **Kopie szkicu**, z listy **Kopia zapisanego szkicu** wybierz jedną z 20 najnowszych kopii i kliknij **Przywróć kopię szkicu**. Przywrócenie również wymaga potwierdzenia, kontroli rewizji i zależności wariantów. Przed nadpisaniem zachowuje kolejną kopię. Nie jest rollbackiem publikacji.

Pusty szkic można zapisać bez wydarzeń i sekcji. Przed publikacją uzupełnij **Główny napis**. Brak daty czy zdjęcia nie blokuje publikacji. Gość zaproszenia bez wydarzeń zobaczy informację o braku wydarzeń do potwierdzenia.

## Zgodność i testowanie

### Domyślne motywy nowych szablonów

Implementacja z 2026-09-28: pięć motywów `classic`, `botanical`, `editorial`, `evening` i `celebration` zastępuje dawne palety. Katalog `packages/domain/src/themes.ts` określa kolory, fonty, zaokrąglenia, domyślny układ hero, ikony i dekoracje. Przypisania i warianty palet szablonów znajdują się w `templateStyle` w `packages/domain/src/templates.ts`.

Decyzja użytkownika: na tym etapie nie ma klientów i nie wymagamy kompatybilności wstecznej. Nowy system może zastąpić dotychczasowy format konfiguracji i stare motywy bez adapterów, migracji zachowujących wygląd ani obsługi wcześniej utworzonych stron. Przykłady, dane demonstracyjne i testy należy dostosować do nowego formatu. Opis istniejącej zgodności v1/v2 poniżej dokumentuje aktualną implementację, a nie wymaganie dla nowego systemu.

| Szablon startowy | Docelowy motyw | Ustawienia początkowe |
| --- | --- | --- |
| Ślub | Klasyczna elegancja | Krem i złoto, symetryczna kompozycja, cienkie ramki, subtelne ornamenty, bez ikon dekoracyjnych. |
| Wesele | Wieczorowy blask | Granat i szampański akcent, geometryczne obramowania, wyeksponowane godziny programu, subtelne ikony. |
| Ślub i wesele | Botaniczny ogród | Szałwia i kość słoniowa, łukowe zdjęcie, miękkie moduły, botaniczne separatory i cienkie ikony. |
| Urodziny | Radosne świętowanie | Brzoskwinia i kobalt, kolorowe bloki, plakietka daty, pełniejsze ikony i dekoracje. |
| Impreza firmowa | Nowoczesny editorial | Grafit i jasne tło, mocna typografia, otwarte sekcje z liniami, bez ornamentów. |
| Rocznica / jubileusz | Klasyczna elegancja | Krem i srebrzystoszary akcent pasujący do przykładowych srebrnych godów, wyeksponowany jubileusz, delikatne ramki. |
| Chrzciny / komunia | Botaniczny ogród | Jasna szałwia i krem, subtelne dekoracje roślinne, bez domyślnych symboli konkretnej ceremonii. |
| Baby shower | Radosne świętowanie | Pastelowa brzoskwinia i jasny błękit, miękkie kształty, subtelne dekoracje, przyjazne ikony. |
| Parapetówka | Radosne świętowanie | Ciepły krem i terakota, swobodne bloki, ikony modułów miejsca i kontaktu, subtelne dekoracje. |
| Spotkanie / warsztaty | Nowoczesny editorial | Jasne tło i kobalt, czytelna agenda, oszczędne ikony informacyjne, bez ornamentów. |
| Puste zaproszenie | Nowoczesny editorial | Neutralna paleta, bez dekoracji i ikon; nadal bez przykładowej treści i zdjęć. |

Zasady działania:

- Szablon ustawia motyw, jego paletę, domyślną kompozycję i poziom dekoracji. Warianty kolorów nie są dodatkowymi motywami.
- Każdy motyw jest dostępny dla każdego typu wydarzenia. Późniejsza zmiana samego motywu zachowuje treści, kolejność modułów i ustawienia widoczności; zastąpienie całego szablonu zachowuje opisane wyżej zasady resetu.
- Przypisania są wspólne dla PL/EN/DE i mają jedno źródło w katalogu szablonów, używane przez tworzenie zaproszenia, reset i miniatury wyboru.
- Miniatury pokazują przypisany wygląd oraz nazwę motywu. Podgląd musi dobrze wyglądać również bez zdjęcia, ponieważ szablony nie dostarczają zdjęć.
- Przypisania obowiązują przy tworzeniu i zastępowaniu szablonu. Nie wymagamy zachowania działania ani wyglądu starych szkiców i publikacji; mogą wymagać ponownego utworzenia w nowym formacie.
- Testy mają potwierdzać przypisania wszystkich szablonów w trzech językach, zgodność podglądu z wynikiem tworzenia oraz zachowanie treści przy zmianie samego motywu.

Nowy format konfiguracji to v2 z `identity.displayName`. Starsze v1 są odczytywane przez adapter, który zachowuje istniejące ID wydarzeń i ich RSVP. Migracja `202609230001_invitation_templates.sql` konwertuje szkice, tworzy ich kopie i aktualizuje funkcje publikacji; historyczne wydania v1 pozostają niezmienione.

Demonstracja pod `/demo` panelu udostępnia przycisk „Utwórz zaproszenie”, otwierający popup. Dopiero zatwierdzenie nazwy i szablonu w popupie otwiera konfigurator. Opcjonalny przycisk „Otwórz gotowy przykład” otwiera wypełniony przykład do szybkiego przeglądu. Reset i kopie również można sprawdzić bez Supabase. Dane demonstracji znikają po odświeżeniu strony. Trwały zapis wymaga konfiguracji usług i wszystkich migracji.

Testy obejmują katalog we wszystkich językach, walidację pustego szkicu, tworzenie przez API, migrację v1, SQL resetu i kopii, izolację użytkowników, konflikty rewizji, zależności wariantów, zachowanie RSVP i publikacji oraz potwierdzenie/anulowanie resetu w przeglądarce.

## Personalizacja motywu

W Ustawieniach pięć przycisków z miniaturami zmienia motyw, paletę, domyślny układ hero i oprawę. Treści i kolejność sekcji pozostają zachowane. Ikony modułów można wyłączyć niezależnie od dekoracji (brak / subtelne / pełne). Kolory nadal można edytować osobno. Wybór szablonu startowego pokazuje jego domyślną paletę i nazwę motywu.

Motywy korzystają z lokalnie dostarczanych fontów: Playfair Display + Inter, Cormorant Garamond + Inter, DM Sans, Bodoni Moda + Inter oraz Fraunces + Nunito Sans. Nie pobierają fontów z zewnętrznej usługi w przeglądarce. Bez zdjęcia hero jest kompozycją typograficzną. Ramki zdjęć i galeria mają warianty zależne od motywu.

Demonstracja `/demo/glowna?theme=classic` obsługuje każdy z pięciu identyfikatorów motywu. Testy obejmują przypisania w PL/EN/DE, widok mobilny i desktop, brak poziomego przepełnienia, renderowanie bez JavaScript, zmianę motywu i wyłączenie dekoracji, a także zdjęcia i galerie w obu układach hero.
