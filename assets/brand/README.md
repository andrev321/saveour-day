# saveour.day — zestaw marki

Wektorowe opracowanie wybranego konceptu 04: składane zaproszenie w kolorach
indygo i ciemnego turkusu. Znak składa się z przedniej klapy oraz tylnego,
złożonego arkusza (dwie powierzchnie). Są to dwa niezależnie animowane elementy.

## Warianty

- `full`: znak + **saveour.day**.
- `short`: znak + **saveour**; do miejsc, w których pełna nazwa jest już znana.
- `mark`: sam znak, do małych powierzchni i ikon.
- `on-light`: ciemne logo na jasnym tle.
- `on-dark`: jasne logo na ciemnym tle, np. `#171C36`.
- `*-animated.svg`: jednorazowe połączenie elementów, 900 ms. Przy
  `prefers-reduced-motion: reduce` od razu wyświetla się nieruchomy znak.

Każdy z sześciu wariantów jest dostępny jako statyczny SVG, transparentny PNG
i animowany SVG. SVG zawierają napis zamieniony na krzywe: nie wymagają
zainstalowania fontu ani połączenia z siecią. PNG: wysokość 384 px dla napisów,
1024 px dla samego znaku. SVG można skalować bez utraty jakości.

`saveour-day-icon.svg` ma własne jasne tło, zapewniające kontrast w karcie
przeglądarki. W obu aplikacjach dostępne są również ikony Apple 180×180 px.

## Podgląd

Otwórz `index.html` w przeglądarce: pokazuje jasne i ciemne wersje oraz animację
z przyciskiem ponownego odtworzenia. Brak zależności zewnętrznych.

Zostaw wokół logo wolne miejsce co najmniej równe 1/4 wysokości znaku.
Zalecana minimalna szerokość: pełny napis 160 px, skrócony 116 px, sam znak 24 px.
Nie rozciągaj proporcji, nie zmieniaj kolejności elementów ani kolorów.

## Integracja

```tsx
import { BrandLogo } from "@invitations/ui/brand";

<BrandLogo />
<BrandLogo variant="short" height={40} />
<BrandLogo variant="mark" tone="dark" height={32} />
<BrandLogo animated height={56} />
```

`tone` oznacza kolor **tła**, nie logo. Komponent domyślnie ma dostępną nazwę
`saveour.day`. W opisanym linku użyj `decorative`, aby nie dublować odczytu.
Animacja jest dekoracyjna, nie sygnalizuje postępu ani zakończenia zapisu.

Logo znajduje się w panelu/logowaniu, demonstracji, ustawianiu hasła, nagłówku
edytora (skrócony napis / znak po zwinięciu) oraz na stronie głównej aplikacji
gości i ekranie dostępu do zaproszenia. Własna kompozycja opublikowanego
zaproszenia pozostaje projektem organizatora.

## Paleta panelu

Przyciski i fokus używają indygo `#3D518B`, tekst granatu `#242B59`,
a aktywna nawigacja turkusu `#24485C` na tle `#DFF0F4`.
Główne tło to `#F4F6FB`, formularze są białe, a obramowania mają kolor
`#DCE2EE`. Skala `brand` w `PanelTheme.tsx` obsługuje komponenty Mantine.
Kolory komunikatów błędu i sukcesu zachowują swoje znaczenie.

## Źródła i regeneracja

- Geometria, kolory i ruch: `packages/ui/src/brand-art.ts`.
- Krzywe napisu: `packages/ui/src/brand-wordmarks.json`.
- Typografia: Inter SemiBold 600 z zainstalowanej paczki `@fontsource/inter`;
  licencja SIL OFL w `FONT-LICENSE.txt`.
- `npm run build:brand` odtwarza SVG, PNG, podgląd HTML i ikony aplikacji.
- Opcjonalne odtworzenie krzywych: Python z `fonttools` i `brotli`, następnie
  `python scripts/outline-brand.py` i `npm run build:brand`.

Dodanie identyfikacji do kodu nie oznacza zakupu domeny ani rejestracji znaku.
