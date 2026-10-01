# Konfigurator: Focus × Paper

Aktualna struktura panelu: Treść, Wygląd, Zdjęcia, Goście; osobno Ustawienia i Historia. Model danych i kontekstową edycję opisuje [Edytor treści](EDYTOR-TRESCI.md).

Konfigurator używa układu Focus oraz ciepłej palety Paper: kremowe tło, jasny formularz, szałwiowe zaznaczenia i leśna zieleń. Ikony panelu i formularzy pochodzą z Phosphor (Duotone). Wygląd panelu nie zmienia palety samego zaproszenia.

## Układ adaptacyjny

| Szerokość okna | Zachowanie |
| --- | --- |
| Od 1600 px | Nawigacja z opisami, formularz 440–560 px, pozostałe miejsce na podgląd. |
| 1100–1599 px | Węższa nawigacja, formularz 380–460 px, elastyczny podgląd. |
| 768–1099 px | Przełączanie Edycja / Podgląd, nawigacja w wysuwanym menu. |
| Poniżej 768 px | Formularz w jednej kolumnie, dolne Menu / Edycja / Podgląd, zapis w nagłówku i pozostałe akcje w opcjach projektu. |

Na desktopie formularz i podgląd przewijają się niezależnie. Nawigację można zwinąć do ikon z podpowiedziami. Granicę paneli można przeciągnąć; po ustawieniu na niej fokusu działają strzałki oraz Home / End. Preferowana szerokość jest ograniczana do zakresu bieżącego ekranu.

Podgląd ma przyciski z ikonami: Telefon (390 px), Tablet (768 px) i Komputer (1440 px). Zapisana wcześniej szerokość 320 px pozostaje obsługiwana. Wspólny, jednowierszowy pasek zawiera etykietę, urządzenia, wariant, przełącznik dopasowania i powiększenie/zamknięcie. Telefon i tablet mają obudowę, a ekran jest przycinany jedną maską zaokrągleń. Tryb „Dopasuj” skaluje całe urządzenie do szerokości i wysokości dostępnego miejsca, zachowując rzeczywistą szerokość iframe i breakpointy zaproszenia. Wyłączenie dopasowania daje skalę 100% i przewijanie w panelu. Podgląd powiększony zajmuje pełną szerokość i wysokość okna, także po zmianie jego rozmiaru.

Ustawienia widoku pod boczną nawigacją pozwalają wybrać gęstość Wygodna / Zwarta i przywrócić układ. Na urządzeniach dotykowych kontrolki zachowują minimum 44 px wysokości. Mobilne menu również pozwala przywrócić układ. Powiększanie przeglądarki pozostaje dostępne; obszar pracy reaguje na wysokość visualViewport przy otwartej klawiaturze ekranowej.

## Stan i dostępność

### Biblioteka zdjęć i kadry

Biblioteka służy do uploadu, podglądu i opisu zdjęć oraz zarządzania plikami. Kadrowanie jest częścią edycji początku zaproszenia albo galerii. To samo zdjęcie może mieć różne kadry w każdym użyciu, osobno na komputerze, tablecie i telefonie. Ramkę można przesuwać myszą lub strzałkami; Home i przycisk „Wyśrodkuj kadr” przywracają środek. Ostateczny kształt kadru zależy od motywu i urządzenia.

„Usuń z zaproszenia” usuwa odwołania w początku i galeriach, pozostawiając plik w bibliotece. Zmiany wymagają zapisania szkicu i publikacji. Limit zaproszenia wynosi 30 zdjęć; kolejne uploady mogą pozostać w bibliotece.

„Usuń plik z biblioteki” trwale usuwa upload i jego rozmiary po potwierdzeniu. Aby usunąć zdjęcie używane w bieżącej konfiguracji, najpierw wybierz „Usuń z zaproszenia” i zapisz szkic, a następnie otwórz je ponownie w bibliotece. Baza blokuje usuwanie plików obecnych w zapisanym szkicu, dowolnej publikacji lub kopii szkicu. Dzięki temu stare publikacje i przywracanie historii pozostają kompletne.

Operacja najpierw rezerwuje plik statusem `deleting`, blokując nowe odwołania w szkicach, publikacjach i kopiach szkicu. Dopiero po pomyślnym usunięciu obiektów przez Storage API usuwa metadane. Jeśli usługa nie odpowie, wpis pozostaje widoczny z możliwością ponowienia; nie należy przywracać mu ręcznie statusu `ready`, ponieważ część plików może już nie istnieć.

Po uploadzie edytor pobiera podpisane adresy Storage przed przekazaniem zdjęcia do podglądu. Renderer wiąże błąd pobrania z konkretnym zestawem adresów, dzięki czemu odświeżenie adresu lub wybór innego zdjęcia ponawia wyświetlanie zamiast pozostawiać pusty zamiennik. Testy `photo-recovery.spec.ts` i `photo-library.spec.ts` obejmują tę regresję oraz obsługę biblioteki na telefonie i komputerze.

### Preferencje edytora

- Preferencje urządzenia zapisują się w localStorage pod kluczami `invitations-view-v1-*`: szerokość formularza, zwinięcie nawigacji, gęstość, szerokość i dopasowanie podglądu.
- Preferencje nie są częścią konfiguracji zaproszenia, szkicu ani publikacji.
- Przełączanie Edycja / Podgląd nie demontuje formularza i zachowuje edytowane wartości, rozwinięte sekcje i pozycję przewijania.
- Subtelne animacje paneli i nawigacji trwają 160–180 ms i są wyłączane przez `prefers-reduced-motion`.
- Uchwyt przeciągania sekcji jest osobną kontrolką obok przycisku rozwijania sekcji.
- Goście są osobnym obszarem; historia znajduje się w narzędziach nawigacji. Ikona zmiany szablonu obok wyboru wariantu otwiera wspólny popup tworzenia/resetowania z ostrzeżeniem i jawnym potwierdzeniem. Kopie szkicu pozostają w Ustawieniach.

## Implementacja i wdrożenie

`EditorWorkspace` zarządza rozmieszczeniem paneli, nawigacją i preferencjami; `PreviewCanvas` mierzy dostępne miejsce przez ResizeObserver; `PanelTheme` definiuje paletę Mantine oraz domyślny styl ikon. `Editor` zachowuje logikę edycji, zapisu, publikacji i komunikacji z podglądem.

Własne style aplikacji są implementowane w styled-components, bez ręcznych `className` w JSX i osobnych arkuszy CSS. Panel dzieli je na `workspace.styles.ts`, `preview.styles.ts` oraz `fields.styles.ts`. Renderer zaproszeń i interfejs gości mają własne moduły `styles.ts`. Globalne style ograniczają się do bazowych ustawień dokumentu; podstawowe style Mantine i fonty nadal pochodzą z pakietów bibliotek. Selektory wewnętrznych elementów Mantine są ograniczone do odpowiednich styled-components.

Obie aplikacje używają `StyledRegistry` z `@invitations/ui/registry`, zbierającego style osobno dla każdego renderowania serwerowego, oraz kompilatora Next.js `styledComponents`. Style trafiają do HTML przed hydratacją. Testy korzystają z ról i stabilnych atrybutów `data-ui`, niezależnych od wygenerowanych klas. Nie należy stylować po `data-ui` ani uzależniać testów od hashów klas.

Przebudowa wymaga wdrożenia obu aplikacji oraz jednorazowej migracji `contextual_editor_v3`. Nie wymaga nowych zmiennych środowiskowych.

Testy przeglądarkowe znajdują się w `tests/e2e/workspace.spec.ts`; obejmują szerokości 320–2560 px, edycję i zapis, menu mobilne, skalowanie desktopowego iframe, obsługę separatora klawiaturą, zapamiętywanie/reset preferencji oraz ograniczenie animacji.

