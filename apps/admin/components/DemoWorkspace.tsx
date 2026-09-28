"use client";
import { useState } from "react";
import { Button, Container, Stack, Text } from "@mantine/core";
import { createDemo } from "@invitations/domain/demo";
import { createTemplate } from "@invitations/domain/templates";
import { Editor, type EditorData } from "./Editor";
import { ProjectStart } from "./ProjectStart";
import { LanguageSelect } from "./LanguageSelect";
import { usePanelI18n } from "../lib/i18n";
import type { SiteConfig } from "@invitations/domain";
import { BrandLogo } from "@invitations/ui/brand";
export function DemoWorkspace() {
  const [initial, setInitial] = useState<EditorData | null>(null);
  const { language } = usePanelI18n();
  const open = (config: SiteConfig, name: string) =>
    setInitial({
      site: { id: config.id, name },
      draft: { config, revision: 1 },
      releases: [],
      media: [],
      urls: {},
    });
  if (initial) return <Editor demo initial={initial} />;
  return (
    <Container size="sm" py="xl">
      <Stack>
        <BrandLogo animated height={56} />
        <LanguageSelect />
        <ProjectStart
          onCreate={({ name, templateId, locale }) =>
            open(createTemplate(templateId, crypto.randomUUID(), locale), name)
          }
        />
        <Text size="sm" c="dimmed">
          {language === "pl"
            ? "Demonstracja lokalna: projekt istnieje tylko do odświeżenia strony."
            : language === "en"
              ? "Local demo: the project lasts until you reload the page."
              : "Lokale Demo: Das Projekt besteht bis zum Neuladen der Seite."}
        </Text>
        <Button
          variant="subtle"
          onClick={() => open(createDemo(), "Przykładowe zaproszenie")}
        >
          {language === "pl"
            ? "Otwórz gotowy przykład"
            : language === "en"
              ? "Open a completed example"
              : "Fertiges Beispiel öffnen"}
        </Button>
      </Stack>
    </Container>
  );
}
