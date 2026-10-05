# Redesign motywów — 10 koncepcji

Otwórz **index.html**: galeria zawiera po dwie propozycje dla każdego motywu, podgląd komputer/telefon, porównanie z obecnym wyglądem, uzasadnienie zmian oraz lokalną listę wyborów. Żywe makiety mają program, miejsce i sekcję RSVP. Formularz RSVP jest demonstracją wyglądu i nie zapisuje danych.

**To propozycje, nie wdrożone motywy aplikacji.** Przykładowe dane i fotografie AI służą wyłącznie prezentacji. Zdjęcia, teksty i fonty są dostępne lokalnie; katalog działa bez usług zewnętrznych.

## Rekomendowane kierunki

| Obecny motyw | A | B | Moja rekomendacja |
|---|---|---|---|
| Klasyczna elegancja | Maison — ciepły, fotograficzny minimalizm | The Modern Vow — typografia bez zdjęcia | A jako motyw bazowy; B dla par bez fotografii |
| Botaniczny ogród | Olive Atelier — jasna oliwka, asymetria | The Garden Society — leśna zieleń, symetria | A dla pleneru; B jako odważniejsza alternatywa |
| Nowoczesny editorial | The Wedding Issue — magazyn i szeryf | Gallery 12 — galeria, sans i kobalt | B najlepiej odróżnia ten motyw od klasyki |
| Wieczorowy blask | Midnight Cinema — fotografia i światło | Champagne Club — ciepłe art déco | A dla wieczornego klimatu; B bez zdjęcia |
| Radosne świętowanie | Aperitivo — maślana żółć i burgund | Modern Muse — róż i śliwka | A daje radość przy zachowaniu elegancji |

## Ocena obecnych widoków

- **Klasyczny:** dobry punkt wyjścia w kolorze i kroju; ograniczyć konkurujące nagłówki, podwójne ramki i pustą przestrzeń bez wyraźnej funkcji.
- **Botaniczny:** zieleń pasuje do charakteru, ale łuk zdjęcia i kafelki dominują nad subtelnym detalem roślinnym. Zbudować wyraźniejszą, indywidualną kompozycję.
- **Editorial:** czytelny i uporządkowany, lecz za bliski ogólnej stronie firmowej. Wzmocnić skalę, siatkę i charakter redakcyjny.
- **Wieczorowy:** dobry kontrast, ale panel zasłania fotografię, a liczne obramowania obciążają widok. Oprzeć klimat na zdjęciu i świetle lub pojedynczej geometrii.
- **Radosny:** przyjazny, lecz przechylone zdjęcie i wiele miękkich pól osłabiają elegancję. Zostawić ekspresję kolorowi i literom.

## Badanie i interpretacja

Stan badania: **29.09.2026**. Materiały branżowe i aktualne kolekcje pokazują współistnienie kilku kierunków, nie jedną dominującą estetykę. To przegląd jakościowy; nie badano sprzedaży ani udziałów rynkowych.

1. [Shutterfly — Top 7 Modern Wedding Invitation Trends for 2026](https://www.shutterfly.com/ideas/modern-wedding-invitation-trends/), aktualizacja 20.01.2026. Punkt odniesienia dla czytelnej hierarchii, oszczędnych układów, pojedynczej fotografii oraz cieplejszych palet.
2. [Paperlust — 2026 Wedding Invitation Trends](https://paperlust.co/blog/2026-wedding-invitation-trends/). Inspiracja nowoczesnym szeryfem i typografią o skali magazynowej.
3. [Every Little Something — 2026 Wedding Stationery Trends: What Is Actually Changing](https://everylittlesomething.com/2026-wedding-stationery-trends/). Perspektywa pracowni: materiał, powściągliwa kompozycja, świadoma przestrzeń i porządkowanie treści.
4. [Papier — New In Wedding Invitations](https://www.papier.com/wedding/new-in/wedding-invitation). Przegląd oferty: botanika, ilustracja, typografia i kolorowe warianty.

Autorskie decyzje projektowe: konkretne palety, nazwy kierunków, siatki, podział sekcji, wybór fontów i fotograficzny klimat. Nie są to odtworzenia cudzych szablonów. Efekty papieru i druku przełożono na proporcje, linie i kontrast, zamiast symulować je ciężkimi teksturami.

## Wspólne zasady przyszłego wdrożenia

- Jedna główna akcja RSVP; data i miejsce blisko imion.
- Nazwy sekcji i szczegóły czytelne w prostym kroju, co najmniej 16 px dla podstawowej treści.
- Responsywne kompozycje z osobnym ustawieniem kadru zdjęcia na telefonie.
- Wariant bez zdjęcia zaprojektowany świadomie, a nie jako puste pole.
- Typografia elastyczna dla dłuższych imion; wdrożenie powinno uwzględnić również PL/EN/DE, inne wydarzenia i niestandardowe treści.
- W wersji produkcyjnej sprawdzić kontrast wszystkich edytowalnych palet, nawigację klawiaturą, treści dynamiczne i autentyczny przepływ RSVP.

## Pliki i odtwarzanie

- `overview.png` — wszystkie 10 propozycji na jednej planszy.
- `previews/*-comparison.png` — 5 plansz A/B.
- `previews/*-desktop.png` i `*-mobile.png` — indywidualne zrzuty.
- `concepts/*.html`, `style.css` — responsywne makiety, zawierające dalsze sekcje.
- `media/PROMPTS.md` — pełne prompty dwóch fotografii, wygenerowanych narzędziem wbudowanym image_gen.
- `verification.json` — kontrola szerokości desktop/mobile, działania demonstracyjnego okna RSVP i błędów wykonania.

W katalogu głównym repozytorium: `node assets/theme-redesign/build.mjs` odtwarza makiety i zrzuty za pomocą zainstalowanego Playwright. `node assets/theme-redesign/serve.mjs` udostępnia galerię lokalnie na porcie 4788. Makiety można też otworzyć bez serwera, bezpośrednio z pliku.
