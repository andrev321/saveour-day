# Wybrane designy i palety

W edytorze otwórz **Wygląd → Wersja kolorystyczna**. Każdy motyw ma cztery palety. Zmiana palety zachowuje treść, zdjęcia, kadrowanie, układ, dekoracje i warianty odbiorców. Ręczne kolory pozostają dostępne poniżej; etykieta zmienia się na „Własne kolory”. Ponowne kliknięcie aktywnego motywu nie kasuje własnych ustawień.

| Motyw       | Wybrany projekt | Palety                                      |
| ----------- | --------------- | ------------------------------------------- |
| classic     | The Modern Vow  | Porcelana i wino, Szampan, Grafit, Atrament |
| botanical   | Olive Atelier   | Oliwka, Szałwia, Terakota, Leśna zieleń     |
| editorial   | Gallery 12      | Kobalt, Monochrom, Mech, Nocny błękit       |
| evening     | Midnight Cinema | Północ, Espresso i szampan, Szmaragd, Perła |
| celebration | Modern Muse     | Róż i śliwka, Morela, Lawenda, Morski       |

Motyw jest niezależny od rodzaju wydarzenia. Wszystkie 11 szablonów startowych może korzystać z każdego designu. Renderer nie dodaje inicjałów, ślubnych sformułowań ani znaku „&”, którego nie ma w treści. Zdjęcie jest opcjonalne. Zachowano kadry na telefon, tablet i komputer oraz edycję sekcji z podglądu z aktualnej gałęzi main.

Formularz RSVP korzysta z kolorów i typografii motywu. Zachowano tłumaczenia, dodatkowe pytania, podsumowanie odpowiedzi i pobieranie wydarzeń do kalendarza.

## Dane i kompatybilność

Stabilne identyfikatory pięciu motywów pozostają bez zmian. Konfiguracja nadal zapisuje cztery kolory w `design`; rozpoznawanie palety porównuje kolory, bez nowego pola wymagającego migracji. Zapisane własne kolory nie są nadpisywane podczas wczytywania. Schemat v3 i migracje przyjęto z main. Wybór innego motywu ustawia jego domyślną paletę, dekoracje i układ nagłówka, zachowując treść.

Jasny lub ciemny tryb zależy od koloru tła, a nie nazwy motywu. Palety mają kontrast minimum 4,5:1 dla tekstu i akcentu na obu tłach. Tekst pasa daty jest dobierany do koloru akcentu. Nie dotyczy to dowolnych własnych kolorów ani każdego możliwego zdjęcia; nad zdjęciem stosowany jest ciemny gradient.

## Podglądy i weryfikacja

`tests/themes.test.ts` sprawdza kontrast, wszystkie kombinacje szablonów, języków i palet oraz zapis/odczyt konfiguracji. Testy przeglądarkowe sprawdzają wybór palet, zachowanie treści, zdjęcia, układy na telefonie i komputerze oraz brak poziomego przewijania.

Po teście `tests/e2e/design-examples.spec.ts` uruchom `npx tsx scripts/build-theme-designs.ts`, aby odświeżyć galerię w `assets/theme-designs/index.html`. To zrzuty działającej aplikacji. Pliki w `assets/theme-redesign` zawierają wcześniejsze propozycje projektowe i źródła zdjęć; nie stanowią opublikowanej strony produkcyjnej.
