# Plan rozwoju bazy stron dla klientów

Data: 20.09.2026. Dokument wykonawczy do [audytu](AUDYT-ARCHITEKTURY-KODU-I-PRODUKTU.md). Status: zalecenia do realizacji; opisane moduły i skrypty nie zostały jeszcze wdrożone.

## 1. Decyzje rekomendowane

- Zachować React, TypeScript, Vite i Vercel.
- Przyjąć **Mantine** jako podstawową bibliotekę komponentów wizualnych.
- Utrzymywać jeden wspólny kod aplikacji, a dla każdego klienta osobne treści, media, motyw, projekt Vercel i domenę.
- Konfigurować realizacje przez walidowany dokument danych. Zmienne środowiskowe mają wskazywać realizację i ustawienia infrastruktury, nie zastępować edytora treści.
- Publiczne zaproszenia mogą pozostać statyczne. Zaproszenia prywatne wymagają ochrony danych i mediów przed ich pobraniem.
- Zacząć od konfiguracji obsługiwanej przez wykonawcę; panel klienta rozwijać po ustabilizowaniu schematu.

## 2. Biblioteka komponentów

| Biblioteka       | Dopasowanie do projektu                                                                                                                                                       | Decyzja                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Mantine**      | Pakiet React z gotowymi komponentami; centralny motyw; dobry zestaw do strony i przyszłego panelu. Estetykę ślubną budujemy przez kompozycję i motyw.                         | **Rekomendowana**                              |
| **Material UI**  | Rozbudowana biblioteka z centralnym motywem. Moja ocena: dobry wybór dla panelu, ale uzyskanie lekkiej, redakcyjnej estetyki zaproszenia wymaga większej pracy stylistycznej. | Alternatywa, jeśli preferujesz Material Design |
| **Radix Themes** | Instalowane, ostylowane komponenty z konfiguracją wyglądu. Moja ocena: dobry wybór dla minimalistycznej realizacji, z większą ilością kompozycji po stronie aplikacji.        | Alternatywa dla prostszego stylu               |
| **shadcn/ui**    | Model udostępniania kodu komponentów do własnego projektu oznacza lokalne utrzymywanie ich implementacji.                                                                     | Nie pasuje do wskazanego wymagania             |

Podstawy porównania: [MantineProvider](https://mantine.dev/theming/mantine-provider/), [Material UI — theming](https://mui.com/material-ui/customization/theming/), [Radix Themes](https://www.radix-ui.com/themes/docs/overview/getting-started), [model shadcn/ui](https://ui.shadcn.com/docs). Ocena dopasowania estetycznego jest rekomendacją dla tego projektu, nie obiektywnym rankingiem bibliotek.

### Co będzie dostarczane przez Mantine

Planowane użycie: `Container`, `Box`, `Stack`, `Group`, `SimpleGrid`, `Paper`/`Card`, `Title`, `Text`, `Button`, `Image`, `Timeline`, `Accordion`; w przyszłym panelu również pola formularzy, okna dialogowe i komunikaty. Harmonogram można oprzeć na gotowym [Timeline](https://mantine.dev/core/timeline/).

Komponenty importujemy z pakietu. Nie kopiujemy ich kodu do `src/components/ui`, nie tworzymy własnych odpowiedników przycisków, dialogów czy pól. Nie instalujemy drugiej biblioteki do tych samych zadań.

Lokalnie nadal powstaną **sekcje domenowe**: hero zaproszenia, miejsce uroczystości, harmonogram i kontakt. Ich zadaniem będzie składanie komponentów biblioteki oraz przekazywanie danych. Żadna ogólna biblioteka nie dostarczy kompletnej logiki zaproszenia ani automatycznie nie ustawi poprawnych kadrów zdjęć. Dopuszczalny lokalny CSS obejmuje układ, kadrowanie i dekoracje; nie odtwarza zachowania gotowych kontrolek.

### Motywy

Jeden `MantineProvider` na aplikację i adapter konfiguracji do `createTheme`. Motyw obejmuje fonty, kolor przewodni, promienie i domyślne właściwości komponentów; dodatkowe semantyczne tokeny opisują tło strony, powierzchnie, tekst i dekoracje. [Dokumentacja motywu](https://mantine.dev/theming/mantine-provider/).

Przygotować trzy ocenione wizualnie presety: krem/złoto, szałwia/kość słoniowa i bordo/jasne tło. Każdy preset musi definiować również kolory tekstu i stanów przycisku. Paleta Mantine zawiera skalę odcieni, więc wpisanie jednego dowolnego HEX-a nie zastępuje przygotowania kompletnego motywu. [Kolory Mantine](https://mantine.dev/theming/colors/).

Konfiguracja klienta wybiera preset i zatwierdzone nadpisania. Nie przyjmuje wykonywalnego JS ani dowolnego CSS. Zmiana motywu ma działać bez edycji JSX. Tryb ciemny nie jest wymaganiem pierwszego wydania — nie dodawać go automatycznie kosztem niezweryfikowanego wyglądu.

Wdrożona konfiguracja udostępnia cztery tokeny HEX: tło strony, tło kart, tekst i akcent. Panel korzysta z `ColorInput` Mantine, a walidator odrzuca kolory bez wymaganego kontrastu. Dzięki temu preset może być punktem startowym, a projekt pozostaje bezpieczny i czytelny po dostosowaniu do identyfikacji klienta.

## 3. Docelowy podział projektu

```text
src/
  domain/         schemat treści i typy
  content/        adapter wybranej realizacji
  theme/          presety i adapter do Mantine
  sections/       kompozycje gotowych komponentów
  templates/      układy i rejestr sekcji
  lib/           daty, linki i normalizacja
clients/
  demo/          wyłącznie przykładowe dane
  klient-001/    konfiguracja i źródłowe media realizacji
scripts/         walidacja i przygotowanie jednej realizacji
docs/            instrukcje operatora
```

To projekt struktury, nie istniejące już katalogi. Przy danych klientów repozytorium powinno mieć ograniczony dostęp; sekretów nie przechowujemy w nim niezależnie od widoczności.

Planowany parametr budowania `CLIENT_ID` wybiera realizację przez sprawdzenie jawnej listy identyfikatorów. Nie może pozwalać na dowolną ścieżkę. Proces generuje wejście aplikacji i kopiuje tylko media wybranego klienta. Bez szerokiego `import.meta.glob` obejmującego wszystkie dane oraz bez wspólnego `public/clients`, którego cała zawartość trafiłaby do wdrożenia.

W wariancie publicznym wybrane treści pozostają publiczne po zbudowaniu. W wariancie prywatnym build nie zawiera chronionych treści — są wydawane po autoryzacji. Osobny projekt Vercel ogranicza mieszanie realizacji, lecz nie zapewnia prywatności sam w sobie.

## 4. Etapy realizacji

### Etap 1 — model treści i naprawa błędów, P1

**Zadania:** zdefiniować wersjonowany schemat runtime; nadać wydarzeniom i miejscom stabilne ID; przenieść imiona, etykiety, zdjęcia i tytuły do danych; wyświetlić dziś ignorowane opisy; odłączyć widoczność sekcji od obecności mapy. Zastąpić realne fallbacki neutralnymi przykładami. Walidować URL-e, numery, daty i wymagane pola przed buildem. Poprawić deklaracje środowiska i włączyć rygorystyczne typowanie.

**Rezultat:** kontrakt danych i adapter starej konfiguracji, umożliwiający zachowanie obecnej realizacji podczas migracji.

**Odbiór:** `null`, błędne typy i brak wymaganych pól zatrzymują publikację z nazwą pola; brak pola opcjonalnego nie usuwa innych danych. Dwie syntetyczne realizacje działają bez edycji komponentów. Wszystkie zadeklarowane opisy są widoczne.

### Etap 2 — migracja UI do Mantine, P1

**Zadania:** sprawdzić zgodność wybranego wydania z React 19 i narzędziami projektu; zablokować sprawdzone wersje w lockfile. Dodać konfigurację i arkusze według [instrukcji Vite](https://mantine.dev/guides/vite/). Wprowadzić provider, trzy motywy i zastąpić lokalne prymitywy komponentami biblioteki. Usunąć Emotion dopiero po migracji ostatniego użycia. Uporządkować nieużywane pliki szablonu.

**Rezultat:** spójne elementy wizualne obsługiwane przez bibliotekę, lokalne sekcje odpowiadają wyłącznie za kompozycję i dane.

**Odbiór:** zmiana presetu zmienia cały interfejs; brak niezależnych kopii przycisków i kart; przechodzą build, lint oraz kontrola klawiatury i kontrastu. Zmierzyć bundle przed/po, nie zakładać z góry poprawy wydajności.

### Etap 3 — responsywność i media, P1

**Zadania:** usunąć minimum 350 px i skok nagłówka przy 801 px. Użyć responsywnych układów Mantine, płynnej typografii i limitów szerokości tekstu. Dodać hero nakładane oraz wariant zdjęcie/tekst obok siebie. Dodać wymiary obrazów, `srcset`, kadry mobile/desktop, punkt kadru i obsługę błędu ładowania. Ujednolicić rzeczywisty format i rozszerzenia zdjęć.

Mantine obsługuje responsywne właściwości i breakpointy, ale dobór układu oraz testy pozostają odpowiedzialnością aplikacji. [Responsywność Mantine](https://mantine.dev/styles/responsive/).

**Odbiór:** screenshoty 320, 360, 390, 430, 768, 1024, 1440 i 1920 px; dodatkowo granice zmiany układu, orientacja pozioma oraz zoom 200%. Brak przewijania poziomego i obciętych danych dla długich imion/adresów. Sprawdzenie Safari iOS i Chrome Android. Test portretu, panoramy, jasnego zdjęcia, braku mapy i wolnego połączenia.

### Etap 4 — model publikacji klienta, P1

**Zadania:** wdrożyć wybór `CLIENT_ID`, generowanie tylko wybranej realizacji, walidację treści przed bundlowaniem i kontrolę artefaktów. Oddzielić publiczną treść od sekretów. Zapewnić metadane HTML i podglądy linków zgodne z trybem prywatności.

**Odbiór:** dwa projekty Vercel korzystają z tego samego kodu i różnych realizacji. W plikach, zasobach i mapach źródeł klienta A nie ma danych ani zdjęć B. Brak identyfikatora zatrzymuje build zamiast publikować demo. Aktualizacja wspólnego kodu nie przełącza automatycznie wszystkich domen bez odbioru.

### Etap 5 — bezpieczeństwo i prywatność, P0 dla ofert prywatnych

**Zadania wspólne:** walidacja odnośników, kontrolowane źródła map i zdjęć, ograniczanie metadanych EXIF/GPS, lokalne fonty, zasady przechowywania oraz przegląd nagłówków hostingu. CSP musi uwzględniać sposób generowania stylów wybranej biblioteki.

**Dodatkowo dla zaproszeń prywatnych:** backend lub właściwa ochrona hostingu obejmująca wszystkie adresy i zasoby; uprawnienia wariantów gości; sesje, ograniczanie prób, prywatny cache i media dostępne tylko po kontroli dostępu. Ochrona całego wdrożenia nie zastępuje odrębnych uprawnień grup gości.

**Odbiór:** niezalogowany odbiorca nie pobiera chronionych danych ani zdjęć również przez alternatywną domenę i stare wdrożenie. Zmiana URL-a nie otwiera innego wariantu. Nie obiecywać blokady kopiowania obrazu, który uprawniony odbiorca już widzi.

### Etap 6 — proces wdrażania i dokumentacja operatora, P1

**Zadania:** przetestować na projekcie demonstracyjnym pełny cykl: nowy klient → preview → build produkcyjny do odbioru → domena → aktualizacja → rollback. Przypisać właściciela projektu, domeny i kosztów. Dodać CI: instalacja z lockfile, walidacja konfiguracji, lint, build i test wybranej realizacji.

**Dokumentacja:** [instrukcja Vercela](DEPLOYMENT-VERCEL.md) opisuje aktualny proces i docelowe rozszerzenia. Podczas wdrażania planu należy zastąpić oznaczone założenia rzeczywistymi skryptami oraz udokumentować tworzenie klienta, edycję pól i zdjęć, motywy, diagnostykę i archiwizację.

**Odbiór:** nową syntetyczną realizację da się opublikować na podstawie dokumentacji, bez nieopisanych kroków. Zanotowane są commit, wersja treści, identyfikator wdrożenia i sposób odtworzenia.

### Etap 7 — opcjonalny panel i dodatki, P2

Panel ma edytować istniejący schemat, zawierać bezpieczny upload, podgląd oraz rozdział zapisania szkicu od publikacji. RSVP z bazą odpowiedzi, galeria, FAQ i kolejne języki są osobnymi rozszerzeniami. Nie blokują przygotowania pierwszej solidnej bazy do realizacji przez wykonawcę.

## 5. Kolejność i granica gotowości

Kolejność: **1 → 2 → 3 → 4 → 6**. Etap 5 realizować wraz z odpowiednimi częściami danych i wdrożeń; musi być ukończony przed publikacją oferty prywatnej. Etap 7 uruchamiać zgodnie z realnymi potrzebami klientów.

Pierwsza gotowa wersja to dwa różne zaproszenia testowe, trzy sprawdzone motywy, pełna konfiguracja treści i mediów bez zmian JSX, poprawne ekrany mobilne/desktop, walidacja builda i powtarzalny deployment klienta. Samo zainstalowanie biblioteki nie zamyka żadnego z tych kryteriów.

Przed estymacją czasu należy ustalić, czy pierwsze realizacje są publiczne czy prywatne oraz czy treści edytujesz Ty czy klient. Te decyzje istotnie zmieniają zakres backendu i panelu; pozostałe etapy można rozpocząć niezależnie.
