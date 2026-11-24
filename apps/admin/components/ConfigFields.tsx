"use client";
import {
  Checkbox,
  ColorInput,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import type { SiteConfig } from "@invitations/domain";
import { usePanelI18n } from "../lib/i18n";
const labels: Record<string, [string, string, string]> = {
  paper: ["Tło strony", "Page background", "Seitenhintergrund"],
  surface: ["Tło kart", "Card background", "Kartenhintergrund"],
  ink: ["Kolor tekstu", "Text color", "Textfarbe"],
  accent: ["Kolor akcentu", "Accent color", "Akzentfarbe"],
  title: ["Tytuł strony", "Page title", "Seitentitel"],
  description: ["Opis strony", "Page description", "Seitenbeschreibung"],
  indexing: [
    "Indeksowanie w wyszukiwarkach",
    "Search indexing",
    "Suchmaschinenindexierung",
  ],
  navigate: ["Przycisk nawigacji", "Navigation button", "Navigation"],
  eventLink: ["Przycisk wydarzenia", "Event link", "Veranstaltungslink"],
  call: ["Przycisk połączenia", "Call button", "Anrufen"],
  sms: ["Przycisk SMS", "SMS button", "SMS"],
  copyPhone: ["Kopiowanie numeru", "Copy phone", "Nummer kopieren"],
  copied: ["Komunikat po skopiowaniu", "Copied message", "Kopiermeldung"],
  variantLabel: ["Etykieta wariantu", "Variant label", "Variantenlabel"],
  footer: ["Stopka", "Footer", "Fußzeile"],
};
export function Fields({
  value,
  onChange,
}: {
  config?: SiteConfig;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  const { language } = usePanelI18n();
  const i = language === "pl" ? 0 : language === "en" ? 1 : 2;
  return (
    <Stack>
      {Object.entries(value)
        .filter(([key]) => labels[key])
        .map(([key, v]) =>
          typeof v === "boolean" ? (
            <Checkbox
              key={key}
              label={labels[key][i]}
              checked={v}
              onChange={(e) =>
                onChange({ ...value, [key]: e.currentTarget.checked })
              }
            />
          ) : ["paper", "surface", "ink", "accent"].includes(key) ? (
            <ColorInput
              key={key}
              label={labels[key][i]}
              value={String(v)}
              format="hex"
              eyeDropperButtonProps={{ "aria-label": labels[key][i] }}
              onChange={(color) => onChange({ ...value, [key]: color })}
            />
          ) : key === "description" || key === "footer" ? (
            <Textarea
              key={key}
              label={labels[key][i]}
              value={String(v)}
              onChange={(e) =>
                onChange({ ...value, [key]: e.currentTarget.value })
              }
            />
          ) : (
            <TextInput
              key={key}
              label={labels[key][i]}
              value={String(v)}
              onChange={(e) =>
                onChange({ ...value, [key]: e.currentTarget.value })
              }
            />
          ),
        )}
    </Stack>
  );
}
