"use client";

import { Badge, Button, Group, Modal, Stack, Text } from "@mantine/core";
import {
  guestDisplayName,
  invitationDisplayName,
  type InvitationGuest,
} from "@invitations/domain/invitation";
import { usePanelI18n } from "../lib/i18n";
import { CopyableLinkRow } from "./CopyableLinkRow";
import { QrCodeCard } from "./QrCodeCard";
import { ModalStickyFooter } from "./modal-layout.styles";

export type ShareInvitationTarget = {
  groupName: string | null;
  guests: Pick<InvitationGuest, "kind" | "name">[];
  variantLabel?: string;
  url: string;
  shortCode: string | null;
  isPersonalUrl: boolean;
  justCreated?: boolean;
};

export function InvitationShareModal({
  target,
  onClose,
  onAddAnother,
}: {
  target: ShareInvitationTarget | null;
  onClose: () => void;
  onAddAnother?: () => void;
}) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;

  const companionLabel = labelText(
    "Osoba towarzysząca",
    "Companion",
    "Begleitperson",
  );
  const andLabel = labelText("i", "and", "und");

  const title = target
    ? invitationDisplayName(
        { groupName: target.groupName, guests: target.guests },
        { companion: companionLabel, and: andLabel },
      )
    : "";

  return (
    <Modal
      opened={!!target}
      onClose={onClose}
      size="lg"
      title={
        target?.justCreated
          ? labelText(
              "Zaproszenie utworzone",
              "Invitation created",
              "Einladung erstellt",
            )
          : labelText(
              "Link i kod zaproszenia",
              "Invitation link and code",
              "Einladungslink und Code",
            )
      }
    >
      {target && (
        <Stack gap="md">
          <Stack gap={6}>
            <Group gap="xs" justify="space-between" wrap="wrap">
              <Text fw={600} size="md">
                {title}
              </Text>
              {target.variantLabel && (
                <Badge variant="light" size="sm">
                  {target.variantLabel}
                </Badge>
              )}
            </Group>
            <Group gap={6} wrap="wrap">
              {target.guests.map((g, index) => (
                <Badge
                  key={index}
                  size="sm"
                  variant={g.kind === "companion" ? "outline" : "light"}
                  color="gray"
                  style={
                    g.kind === "companion"
                      ? { borderStyle: "dashed" }
                      : undefined
                  }
                >
                  {guestDisplayName(g, { companion: companionLabel })}
                </Badge>
              ))}
            </Group>
          </Stack>

          <Text size="sm" c="dimmed">
            {labelText(
              "Przekaż ten link lub kod zaproszonym osobom, aby mogły potwierdzić obecność.",
              "Share this link or code with the invited guests so they can RSVP.",
              "Teilen Sie diesen Link oder Code mit den eingeladenen Gästen für die Rückmeldung.",
            )}
          </Text>

          <Stack gap={4}>
            <Text size="xs" fw={600}>
              {target.isPersonalUrl
                ? labelText(
                    "Link do zaproszenia",
                    "Invitation link",
                    "Einladungslink",
                  )
                : labelText(
                    "Adres strony (do użycia z kodem)",
                    "Site link (use with code)",
                    "Seitenlink (mit Code verwenden)",
                  )}
            </Text>
            <CopyableLinkRow
              value={target.url}
              copyLabel={labelText("Kopiuj link", "Copy link", "Link kopieren")}
              copiedMessage={labelText(
                "Skopiowano link.",
                "Link copied.",
                "Link kopiert.",
              )}
              openAction={{
                label: labelText(
                  "Otwórz zaproszenie",
                  "Open invitation",
                  "Einladung öffnen",
                ),
                href: target.url,
              }}
            />
          </Stack>

          {target.shortCode && (
            <Stack gap={4}>
              <Text size="xs" fw={600}>
                {labelText(
                  "Kod zaproszenia",
                  "Invitation code",
                  "Einladungscode",
                )}
              </Text>
              <CopyableLinkRow
                value={target.shortCode}
                copyLabel={labelText(
                  "Kopiuj kod",
                  "Copy code",
                  "Code kopieren",
                )}
                copiedMessage={labelText(
                  `Skopiowano kod (${target.shortCode}).`,
                  `Code copied (${target.shortCode}).`,
                  `Code kopiert (${target.shortCode}).`,
                )}
              />
            </Stack>
          )}

          <QrCodeCard
            url={target.url}
            title={labelText(
              "Kod QR zaproszenia",
              "Invitation QR code",
              "Einladungs-QR-Code",
            )}
          />

          <ModalStickyFooter justify="flex-end">
            {target.justCreated && onAddAnother && (
              <Button variant="light" onClick={onAddAnother}>
                {labelText(
                  "Dodaj kolejne",
                  "Add another",
                  "Weitere hinzufügen",
                )}
              </Button>
            )}
            <Button onClick={onClose}>
              {labelText("Zamknij", "Close", "Schließen")}
            </Button>
          </ModalStickyFooter>
        </Stack>
      )}
    </Modal>
  );
}
