# Audyt projektu moj-slub

Data: 20.09.2026. Zakres: architektura → kod → produkt, ze szczególnym uwzględnieniem konfiguracji, prywatności i skalowania interfejsu. Punkt odniesienia: lokalny kod na commicie `71c7753`; przed analizą katalog roboczy był czysty.

Projekt jest niewielkim, sensownie podzielonym zaproszeniem dla jednej pary. Nadaje się do rozwinięcia w bazę realizacji na zamówienie, ale obecnie nie zapewnia pełnej personalizacji ani kontroli dostępu do danych. Najważniejsza zmiana to oddzielenie treści, motywu, układu i zasad dostępu. Sama zamiana kolejnych literałów na zmienne środowiskowe nie rozwiąże problemu.

> **Status po wdrożeniu planu:** raport opisuje stan początkowy i pozostaje zapisem decyzji architektonicznych. Aktualna implementacja ma panel, walidowany model danych, wersje i publikację, prywatne media, responsywny renderer, lokalne fonty oraz CI. Bieżący zakres i pozostałe zadania są w [planie rozwoju](PLAN-ROZWOJU-I-KOMPONENTY.md).

## 1. Architektura

### Obecny przepływ

```text
.env.local / środowisko budowania
  → sześć VITE_CONFIG_* zawierających JSON
  → weddingEnv.ts: parsowanie i trzy fabryki konfiguracji
  → App.tsx: /slub, /obiad, /grill
  → WeddingRoutePage: stała kolejność sekcji
  → komponenty React + Emotion
  → publiczne HTML / JS / obraz + zewnętrzne mapy i fonty
```

React 19, TypeScript 6, Vite 8, React Router 7 i Emotion. Brak backendu, bazy danych, panelu edycji, uwierzytelniania i uploadu. `vercel.json` zapewnia przekierowanie obsługi tras SPA do `index.html`. Nie sprawdzano rzeczywistej konfiguracji hostingu.

**Dobre podstawy:** wspólny renderer dla trzech wariantów, typy domenowe, małe komponenty, centralny plik konfiguracji i częściowe tokeny CSS. Wspólna implementacja pozwala uniknąć trzech kopii strony. Mały zakres ogranicza koszty utrzymania.

**Granice obecnego modelu:**

- `weddingEnv.ts` jednocześnie obsługuje wejście, wartości domyślne, model wydarzeń i logikę wariantów. Zmiana źródła danych będzie dotykała logiki produktu.
- Interfejs importuje `mapsSearchQuery` z modułu środowiskowego. Narzędzia do linków powinny być niezależne od ładowania konfiguracji.
- Warianty są zakodowane jako konkretne uroczystości. Dodanie wesela, brunchu lub spotkania w innym dniu wymaga zmian w fabrykach i routingu.
- Wszystkie dane są pakowane do jednego klienta. Inny URL nie daje izolacji grup gości.
- Brak wersjonowania schematu, walidacji publikacji, adapterów źródeł treści i rozdziału konfiguracji publicznej od prywatnej.
- Kod nie opisuje cyklu realizacji: dane od klienta → podgląd → akceptacja → publikacja → poprawki → zamknięcie strony.

### Zalecana architektura dla realizacji na zamówienie

Na początek zachować React/Vite/Emotion. Audyt nie daje podstaw do obowiązkowej migracji frameworka. Utrzymywać jeden wspólny silnik oraz osobną konfigurację, media i wdrożenie dla każdego klienta. Unikać trwałego kopiowania całego repozytorium dla każdej realizacji, ponieważ poprawki bezpieczeństwa rozjadą się między kopiami.

```text
formularz / plik treści / przyszły CMS
  → adapter wejścia
  → walidacja schematu i odnośników
  → wersjonowany model strony
  → wybór wariantu + sekcji + motywu
  → komponenty prezentacyjne
  → podgląd → zaakceptowana wersja → publikacja
```

Proponowany podział odpowiedzialności:

| Warstwa               | Odpowiedzialność                                                            |
| --------------------- | --------------------------------------------------------------------------- |
| `domain/`             | Wersjonowany schemat, identyfikatory wydarzeń, miejsc, kontaktów i mediów   |
| `content/`            | Adaptery JSON/CMS, normalizacja i komunikaty błędów bez ujawniania wartości |
| `templates/`          | Dostępne układy, rejestr sekcji, zasady rozmieszczenia                      |
| `theme/`              | Kolory, fonty, odstępy, obramowania i warianty dekoracji                    |
| `components/`         | Wspólne przyciski, karty miejsc, mapy i sekcje                              |
| `media/`              | Metadane, warianty rozdzielczości, kadry i powiązanie z klientem            |
| backend, gdy wymagany | Dostęp do zaproszeń, administracja, prywatne media, RSVP                    |

Osobne wdrożenie zmniejsza ryzyko pomieszania klientów, ale nie chroni publicznych danych przed odczytem. Jeśli klient wymaga prywatnych zaproszeń lub odmiennych uprawnień grup gości, potrzebna jest weryfikacja dostępu na serwerze przed wydaniem danych i zdjęć. Dane nieuprawnionych wariantów nie mogą wtedy znajdować się w publicznym JS, JSON ani prefetchu.

Panel samoobsługowy i wspólna wieloklientowa baza to możliwy kolejny etap. Dla usługi wykonywanej przez Ciebie nie są warunkiem pierwszej wersji. Priorytetem jest szybka i niezawodna konfiguracja realizacji bez edycji komponentów.

## 2. Kod: ustalenia i priorytety

P0 oznacza blokadę oferowania prywatności; P1 — konieczne przed powtarzalnymi realizacjami; P2 — usprawnienie jakości i utrzymania.

| Priorytet                        | Ustalenie i dowód                                                             | Skutek i kierunek naprawy                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P0, jeśli dane mają być prywatne | `App.tsx:10–23`: publiczne trasy; `weddingEnv.ts:17–70`: konfiguracja klienta | Dostęp do `/slub` nie ogranicza odczytu `/obiad` i `/grill`. Backend powinien wydawać wyłącznie dozwolony wariant.                             |
| P1                               | `weddingEnv.ts:4–13`: `JSON.parse(...) as T`                                  | Rzutowanie nie waliduje danych. `null` oraz liczba zamiast nazwy powodują wyjątki. Potrzebny schemat runtime i walidacja przed publikacją.     |
| P1                               | `WeddingHeader.tsx:57`, `App.tsx:3`, `layout.tsx:3–23`                        | Imiona, główne zdjęcie i wygląd wymagają edycji kodu. Przenieść do modelu treści i motywu.                                                     |
| P1                               | `ReceptionSection.tsx:100–101`                                                | Brak któregokolwiek z pięciu pól, w tym mapy lub opisu, usuwa całą sekcję. Treść i mapa muszą być niezależnie opcjonalne.                      |
| P1                               | `ReceptionSection.tsx:94–143`                                                 | Opis jest warunkiem wyświetlenia, lecz nie występuje w JSX. Użytkownik konfiguruje niewidoczną treść.                                          |
| P1                               | `WeddingRoutePage.tsx:31–42`                                                  | Opisy ceremonii i parkingu nie są przekazywane do widoku. `CeremonySection` istnieje, ale nie jest używany.                                    |
| P1                               | `layout.tsx:18`                                                               | `min-width:350px` wymusza przekroczenie szerokości viewportu 320 px. Usunąć minimalną szerokość całej strony.                                  |
| P1                               | `layout.tsx:91–95`, `WeddingHeader.tsx:28–32`                                 | Skokowe zmiany szerokości i wielkości nagłówka oraz ujemne położenie u dołu hero. Przebudować zależność nagłówka od zdjęcia i długości tekstu. |
| P1                               | `ParkingSection`, `ReceptionSection`, `TimelineSection`                       | URL-e z konfiguracji trafiają do `href`/`src` bez walidacji aplikacyjnej. Ograniczyć protokoły i dostawców zgodnie z przeznaczeniem pola.      |
| P2                               | `LocationSection`, `ParkingSection`, `ReceptionSection`                       | Powielone siatki, style, mapy i przyciski. Wspólna karta miejsca ograniczy rozbieżności.                                                       |
| P2                               | `tsconfig.app.json`                                                           | Brak `strict`; bez rozszerzania innej konfiguracji rygorystyczne sprawdzanie pozostaje wyłączone. Włączyć po dodaniu poprawnego modelu danych. |
| P2                               | `vite-env.d.ts`                                                               | Deklaruje dawny zestaw zmiennych, nie sześć używanych JSON-ów. Poprawić deklaracje; nadal nie zastąpią walidacji runtime.                      |
| P2                               | `index.html:2–7`                                                              | `lang="en"` dla polskiej strony i techniczny tytuł; brak opisu i metadanych udostępniania. Generować metadane per realizacja.                  |
| P2                               | `README.md`, brak testów/CI w repo                                            | README szablonu Vite nie opisuje wdrożenia klienta. Brak automatycznej kontroli konfiguracji i responsywności.                                 |

### Zachowanie konfiguracji

Wykonano odizolowane wywołania rzeczywistego modułu konfiguracji po transpilacji TypeScript, z syntetycznymi danymi:

| Wejście                                     | Wynik                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| Brak zmiennych                              | Konfiguracja powstaje z wartości domyślnych                                          |
| `VITE_CONFIG_COMMON=null`                   | `Cannot read properties of null (reading 'weddingDate')`                             |
| `VITE_CONFIG_COMMON={"venueName":123}`      | `commonConfig.venueName?.trim is not a function`                                     |
| `VITE_CONFIG_COMMON={"weddingDate":"TEST"}` | Pole `phone` pozostaje `undefined`; nie ma uzupełniania pojedynczych brakujących pól |

`try/catch` obejmuje składnię JSON, a nie późniejsze użycie wyniku. Prawidłowy składniowo, lecz błędny strukturalnie dokument przechodzi parsowanie. Każda fabryka konfiguracji jest wywoływana przy renderowaniu `App`, więc błędna konfiguracja jednego wariantu może zakłócić również wejście na inny wariant.

W produkcji błędne wymagane dane powinny zatrzymywać publikację z komunikatem wskazującym pole. W podglądzie można pokazywać jawne ostrzeżenia. Cichy fallback z nazwą konkretnego dawnego lokalu jest ryzykowny: technicznie działająca strona może skierować gości w złe miejsce. Fallbacki powinny być neutralne, a przykładowe dane syntetyczne.

### Bezpieczeństwo i prywatność

Nie można zagwarantować „pełnego bezpieczeństwa” ani uniemożliwić zapisania zdjęcia osobie, która może je obejrzeć. Można zdefiniować i egzekwować: kto ma dostęp, jakie dane otrzymuje, gdzie trafiają pliki i jak długo są przechowywane.

1. **Dane klienta są publiczne w obecnym modelu.** Sprawdzono wynikowy JS: zawiera ścieżki wszystkich wariantów oraz wartości z każdego z sześciu zestawów lokalnej konfiguracji. W raporcie nie zapisano tych wartości. `.env.local` jest ignorowany przez Git i nie występuje w sprawdzonej historii tego pliku, ale nie chroni danych w buildzie. Takie zachowanie `VITE_*` dokumentuje [Vite](https://vite.dev/guide/env-and-mode).
2. **Ukrycie nawigacji nie jest kontrolą dostępu.** `RouteNav` nie jest montowany, ale trasy pozostają dostępne. Również `noindex`, losowy adres lub hasło sprawdzane tylko w React nie chronią pobranego zestawu danych. Dla prywatności: serwerowa autoryzacja, ograniczanie prób dostępu, sesja i kontrola uprawnień do każdego zasobu. Nie współdzielić publicznego cache odpowiedzi prywatnych.
3. **Linki i ramki wymagają odrębnych reguł.** Linki zewnętrzne: zwykle HTTPS; numery: normalizacja i generowanie `tel:`/`sms:`; mapy: sprawdzenie hosta oraz ścieżki osadzania. Nie przyjmować dowolnego HTML iframe. Obecne renderowanie tekstu przez React i brak `dangerouslySetInnerHTML` są zaletą. Nie stwierdzono exploita XSS; problemem jest brak własnego kontraktu walidacji.
4. **Zewnętrzne zasoby.** Google Fonts są importowane w CSS; mapy mogą nawiązać połączenie po załadowaniu leniwej ramki. Proponuję lokalne fonty i mapę aktywowaną świadomym kliknięciem, z zawsze dostępnym adresem i linkiem nawigacji. Nie jest to ocena prawna obowiązków cookies.
5. **Nagłówki ochronne.** Repozytorium nie konfiguruje CSP, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options` ani ochrony osadzania strony. Należy sprawdzić faktyczne nagłówki hostingu i ustawić politykę dopasowaną do Emotion oraz wybranych dostawców. Nie wdrażać CSP na ślepo, bo może zablokować style lub mapy.
6. **Sekrety i środowiska.** Sekrety przyszłego backendu nie mogą mieć prefiksu `VITE_`. Rozszerzyć ochronę plików środowiskowych, ponieważ `.env` i `.env.production` nie są objęte aktualną regułą `*.local`. Nie umieszczać prawdziwych danych klientów w publicznych fixture'ach, przykładach i screenshotach CI.

### Media: stan i wymagany kontrakt

Aktualnie główne zdjęcie jest importem pliku z repozytorium. Nie ma uploadu ani mechanizmu prywatnych zdjęć. `wedding-bg.png` ma 329 167 bajtów i wymiary 1020 × 535. Sygnatura pliku wskazuje JPEG/JFIF mimo rozszerzenia `.png` — należy ujednolicić format, rozszerzenie i MIME.

Docelowy model obrazu powinien zawierać: identyfikator zasobu, rolę dekoracyjną lub opis `alt`, wymiary, warianty rozdzielczości, kadr mobilny i desktopowy, punkt skupienia kadru oraz status publikacji. Samo pole z URL-em nie wystarczy do zapewnienia dobrego wyglądu przy różnych zdjęciach.

Dla uploadu w przyszłym panelu: autoryzacja właściciela, limity bajtów i liczby pikseli, sprawdzanie rzeczywistego formatu po dekodowaniu, ponowne kodowanie do obsługiwanych formatów, usuwanie EXIF/GPS, losowe nazwy oraz rozdzielenie oryginałów od opublikowanych pochodnych. SVG i HTML nie powinny być przyjmowane jako zwykłe zdjęcia. Prywatne zasoby wymagają kontrolowanego wydawania, np. krótkotrwałych podpisanych URL-i po autoryzacji. Te kierunki odpowiadają zasadom [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

Widoczne dziś puste `alt` jest prawidłowe, jeżeli hero jest dekoracją. Gdy zdjęcie przekazuje treść, opis powinien pochodzić z konfiguracji.

## 3. Responsywność i jakość wizualna

Ta część opiera się na analizie CSS i parametrów obrazu. Nie wykonano skutecznego renderowania w przeglądarce, dlatego nie deklaruję przejścia testów urządzeń, kontrastu, kadrowania ani braku błędów konsoli.

### Pewne ograniczenia

- **320 px:** strona ma minimum 350 px, więc jest szersza niż viewport o co najmniej 30 px. To koliduje z celem reflow przy 320 CSS px opisanym przez [W3C](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- **Duży desktop:** strona nie przekracza 850 px, a główna treść 600 px. To świadomy wąski format zaproszenia, ale nie osobno zaprojektowany widok komputerowy. Na szerokim monitorze pozostaje dużo wolnego miejsca.
- **800 → 801 px:** obszar nagłówka zmienia się z maksymalnie 568 px na 40% szerokości rodzica, przy jednoczesnym wzroście tytułu z 34 do 42 px. To duża zmiana przy różnicy jednego piksela viewportu.
- **Zdjęcia:** wysokość hero wynika wyłącznie z proporcji pliku (`height:auto`). Zamiana obecnego poziomego zdjęcia na portret zmieni całą wysokość pierwszego ekranu.
- **Małe ekrany:** absolutne położenie nagłówka z `bottom:-15px`/`-10px` oraz `overflow:hidden` hero sprawia, że kontener tekstu wychodzi poza dolną krawędź sekcji. Rzeczywiste obcięcie tekstu wymaga sprawdzenia po renderze.
- **Karty:** od 480 px narzucona jest kolumna mapy 160 px. Gdy mapy brak, definicja dwóch kolumn pozostaje i tekst nie wykorzystuje pełnej szerokości.

### Zalecany system skalowania

1. Płynna szerokość od 320 px, bez minimalnej szerokości strony; bez maskowania problemu przez globalne `overflow-x:hidden`.
2. Osobny limit szerokości sekcji i czytelnej kolumny tekstowej. Dla desktopu zaprojektować szersze hero i opcjonalny układ dwóch kolumn, np. harmonogram obok informacji organizacyjnych. Nie rozciągać samych akapitów na cały monitor.
3. Wielkości tekstu i odstępy oparte na `clamp()` z granicami w `rem`. Układ powinien znosić zoom i długie imiona; usunąć nagły skok przy 801 px.
4. Hero z własnymi zasadami proporcji dla układów oraz obrazem `object-fit:cover`, konfigurowalnym punktem kadru i opcjonalnym osobnym zdjęciem mobilnym. Wariant bez nakładania tekstu na zdjęcie powinien być pełnoprawną opcją.
5. `picture`/`srcset`/`sizes`, wymiary rezerwujące miejsce, sensowna jakość WebP/AVIF z fallbackiem. Głównego hero nie ładować leniwie; dalsze zdjęcia mogą być lazy. Obecny obraz przy maksymalnej szerokości 850 px nie pokrywa pełnej rozdzielczości 2×.
6. Karty reagujące na własną dostępną szerokość. Mapa nie powinna wymuszać nieczytelnej kolumny tekstu ani pozostawiać pustego miejsca po wyłączeniu.
7. Obsługa długich nazw i adresów przez prawidłowe zawijanie, `min-width:0` oraz kontrolowane `overflow-wrap`. Nie stosować obcinania ważnych informacji organizacyjnych.
8. Widoczny fokus, spójne cele dotykowe — projektowo co najmniej 44 × 44 CSS px — oraz kontrola kontrastu każdej palety. Uwzględnić `prefers-reduced-motion` dla transformacji i przyszłych animacji.

### Macierz odbioru

| Obszar         | Scenariusze                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| Telefony       | 320, 360, 375, 390, 430 px; pion i poziom; Safari iOS oraz Chrome Android    |
| Granice układu | 479/480, 599/600, 800/801 px albo odpowiedniki po przebudowie                |
| Tablety        | 768, 820, 1024 px                                                            |
| Komputery      | 1280, 1440, 1920 px; brak nieuzasadnionego rozciągania tekstu                |
| Dostępność     | Zoom 200%, reflow 320 CSS px, klawiatura, czytnik ekranu i zwiększony tekst  |
| Zmienna treść  | Krótkie/długie imiona; długie adresy; 1 i 12 wydarzeń; puste pola opcjonalne |
| Media          | Portret, panorama, jasne/ciemne zdjęcie, brak pliku, wolne połączenie        |

Warunek odbioru: brak poziomego przewijania treści, obciętych dat i nagłówków, nakładania elementów oraz utraty informacji po wyłączeniu map lub fontów zewnętrznych. Automatyczne screenshoty trzeba uzupełnić oceną kompozycji i kadru.

## 4. Analiza produktowa

### Co klient rzeczywiście kupuje

Spersonalizowane zaproszenie, które można bez stresu przesłać gościom, aktualizować i utrzymać do końca wydarzenia. Gość ma szybko zrozumieć: kto zaprasza, kiedy, na którą część, gdzie przyjechać, gdzie zaparkować i jak odpowiedzieć.

Obecna aplikacja realizuje podstawową prezentację harmonogramu, miejsc i kontaktu telefonicznego. Nie zapisuje potwierdzeń obecności — przyciski RSVP uruchamiają telefon lub SMS. Na komputerze przyda się również widoczny numer i kopiowanie go. Opis przyjęcia, instrukcje parkingu i dodatkowe wskazówki powinny być faktycznie widoczne.

### Zakres personalizacji

| Element          | Obecnie                                        | Docelowo                                                              |
| ---------------- | ---------------------------------------------- | --------------------------------------------------------------------- |
| Imiona           | Literał JSX                                    | Dane realizacji                                                       |
| Daty i godziny   | Ręczne stringi w JSON-ach                      | Strukturalne wydarzenia, strefa czasowa, formatowanie lokalne         |
| Zdjęcie          | Import wspólnego pliku                         | Biblioteka mediów z kadrami i wariantami                              |
| Opisy            | Częściowo konfigurowalne, częściowo ignorowane | Każde zadeklarowane pole ma przewidywalny efekt w widoku              |
| Sekcje           | Stały porządek i zestaw                        | Lista identyfikowalnych sekcji, włączanie, kolejność i wariant układu |
| Warianty gości   | Trzy stałe trasy                               | Nazwane warianty odwołujące się do wspólnych wydarzeń                 |
| Styl             | Tokeny i literały w komponentach               | Zestawy motywów i kontrolowane nadpisania                             |
| Etykiety i język | Polski w JSX                                   | Słownik etykiet oraz nadpisania konkretnej realizacji                 |
| RSVP             | Jeden telefon                                  | Konfigurowalne kanały, odbiorcy, termin i instrukcja                  |
| Udostępnianie    | Techniczny tytuł strony                        | Tytuł, opis i bezpieczny podgląd linku per realizacja                 |
| Prywatność       | Publiczny klient                               | Jawny wybór publiczne/prywatne, egzekwowany technicznie               |

Model danych powinien zawierać co najmniej `schemaVersion`, `locale`, `timeZone`, `couple`, `events`, `venues`, `contacts`, `media`, `variants`, `sections`, `theme`, `copy` i `metadata`. Politykę dostępu należy przechowywać i egzekwować po stronie serwera, jeśli chroni zasoby. Nie wystarczy pole `private:true` wysłane do przeglądarki.

Wydarzenia powinny mieć stabilne ID i odniesienia do miejsca, zamiast kopiowania tych samych dat i lokalizacji do wielu wariantów. Schemat sekcji powinien rozróżniać typy, np. hero, timeline, venue, parking, gallery i contact, z odrębnymi wymaganiami. Niezwykłe realizacje mogą dodawać nowy komponent do rejestru, bez obchodzenia zasad bezpieczeństwa.

Pełna personalizacja nie musi oznaczać dowolnego HTML/JS wpisywanego przez klienta. Bezpieczniejszy i łatwiejszy do utrzymania jest zestaw elastycznych sekcji oraz motywów, z możliwością napisania dedykowanej sekcji przez wykonawcę.

### Proces realizacji

1. Zbieranie treści, mediów, zakresu wariantów i oczekiwań co do prywatności.
2. Wybór motywu i układu; przypisanie zdjęć wraz z kadrami.
3. Walidowany podgląd desktop/mobile na syntetycznych lub chronionych danych.
4. Akceptacja treści i konkretnej wersji przez klienta.
5. Publikacja z historią wersji i możliwością wycofania.
6. Poprawki organizacyjne bez modyfikacji JSX.
7. Ustalony termin wyłączenia/archiwizacji oraz usunięcia danych i mediów, również z uwzględnieniem kopii i cache.

Przy różnych grupach gości nie należy automatycznie przywracać `RouteNav`: brak przełącznika może być poprawnym wyborem produktowym. Najpierw określić, czy warianty to tylko odmienne prezentacje, czy faktycznie poufne zaproszenia.

## 5. Kolejność prac

**Etap 1 — niezawodna konfiguracja.** Schemat runtime, neutralne przykłady, walidacja publikacji, imiona i obrazy poza JSX, poprawienie ignorowanych opisów, opcjonalne mapy, normalizacja URL-i i numerów. Gotowe, gdy drugą realizację można przygotować wyłącznie przez zmianę treści, mediów i motywu, a błędne dane nie przechodzą publikacji.

**Etap 2 — system układów.** Hero niezależne od konkretnego zdjęcia, płynna typografia, poprawne 320 px, kadry mobile/desktop, wspólne karty oraz kontrola długich treści. Gotowe po przejściu macierzy ekranów i ocenie wizualnej kilku wyraźnie różnych realizacji.

**Etap 3 — publikacja i prywatność.** Oddzielne wdrożenia, podgląd/akceptacja/rollback, polityka mediów, metadane i konfiguracja nagłówków. Jeżeli pierwsza sprzedawana realizacja ma być prywatna, serwerowa kontrola dostępu jest warunkiem jej publikacji, a nie opcjonalną pracą na później.

**Etap 4 — narzędzia edytorskie.** Panel z opisami pól, podglądem, wyborem sekcji, uploadem i historią zmian. Formularz lub plik ze schematem wystarczy na początek; panel warto budować wokół ustalonego modelu, nie bezpośrednio wokół obecnych zmiennych środowiskowych.

**Etap 5 — funkcje dodatkowe.** Formularz RSVP, eksport odpowiedzi, galeria, noclegi, FAQ, kalendarz i wielojęzyczność zgodnie z ofertą. Formularz RSVP wprowadzi nowe dane i backend, więc wymaga osobnego zakresu uprawnień, walidacji oraz retencji.

## 6. Weryfikacja i ograniczenia

- `npm.cmd run build`: PASS. 62 moduły; JS 274,02 kB / 88,61 kB gzip, CSS 0,42 kB, obraz 329,16 kB. Mały osobny CSS nie obejmuje całego kosztu stylowania, ponieważ Emotion jest w JS.
- `npm.cmd run lint`: PASS.
- Cztery syntetyczne przypadki konfiguracji: wykonane; dwa potwierdzone wyjątki opisano wyżej.
- Inspekcja bundla: potwierdzona obecność wszystkich tras i wartości wszystkich zestawów konfiguracji.
- Metadane obrazu: potwierdzona rozdzielczość i niezgodność formatu z rozszerzeniem.
- `npm audit`: nie zakończył audytu; środowisko odmówiło dostępu do endpointu npm. Brak wyniku nie oznacza braku podatności zależności.
- Dev server wystartował. `agent-browser` nie był dostępny lokalnie, pobranie z npm nie powiodło się; próba połączenia z lokalnym Chromium zwróciła `ECONNREFUSED`, a późniejsze logi ujawniły awarie procesów sieci/GPU i zakończenie przeglądarki (`GPU process isn't usable`). Narzędzie UI zgłosiło brak dostępnych przeglądarek. Brak skutecznej weryfikacji wizualnej i pomiarów viewportów. Proces serwera audytowego zatrzymano po analizie.
- Nie wykonywano testów na rzeczywistym iOS/Android, pomiarów Core Web Vitals, testów penetracyjnych ani inspekcji wdrożenia produkcyjnego. Obserwacje o CSS są analizą kodu, nie wynikami screenshotów.
- Nie zmieniano aplikacji, treści `.env.local`, zależności ani wdrożeń. Raport jest podstawą zakresu refaktoryzacji.

Źródła zasad technicznych: [Vite — env](https://vite.dev/guide/env-and-mode), [OWASP — upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [W3C — reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Google — osadzanie map](https://developers.google.com/maps/documentation/embed/embedding-map). Przykładowe URL-e `maps.google.com/?q=...` w `.env.example` nie są gwarancją poprawnego osadzania; konfiguracja powinna generować lub sprawdzać właściwy format embed.
