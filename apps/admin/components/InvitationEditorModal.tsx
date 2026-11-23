"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { loadingText } from "@invitations/ui/loading-copy";
import {
  parseQuickAdd,
  type GuestKind,
  type ImportedInvitation,
} from "@invitations/domain/invitation";
import { ActionButton } from "./ActionButton";
import { FormRow } from "./form-layout.styles";
import { ModalStickyFooter, ModalStickyTop } from "./modal-layout.styles";
import { type InvitationRow } from "../lib/guest-management";
import { usePanelI18n } from "../lib/i18n";

export type InvitationEditorSubmit =
  | {
      action: "create";
      payload: ImportedInvitation;
    }
  | {
      action: "update";
      payload: ImportedInvitation & { id: string; version: number };
      removedAnsweredGuests: boolean;
    }
  | {
      action: "quick-import";
      entries: ImportedInvitation[];
    };

type DraftGuest = { id?: string; kind: GuestKind; name: string };

type InvitationEditorProps = {
  opened: boolean;
  invitation: InvitationRow | null;
  answeredGuestIds?: Set<string>;
  variants: { value: string; label: string }[];
  defaultVariantId: string;
  busy: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (submission: InvitationEditorSubmit) => void;
};

export function InvitationEditorModal(props: InvitationEditorProps) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;

  return (
    <Modal
      opened={props.opened}
      onClose={() => !props.busy && props.onClose()}
      title={
        props.invitation
          ? labelText(
              "Edycja zaproszenia",
              "Edit invitation",
              "Einladung bearbeiten",
            )
          : labelText("Nowe zaproszenie", "New invitation", "Neue Einladung")
      }
      size="lg"
    >
      {props.opened && (
        <InvitationEditorForm
          key={`${props.invitation?.id ?? "new"}-${props.defaultVariantId}`}
          {...props}
        />
      )}
    </Modal>
  );
}

function initialMode(invitation: InvitationRow | null): "single" | "group" {
  if (!invitation) return "single";
  const named = invitation.guests.filter((g) => g.kind === "named");
  const companions = invitation.guests.filter((g) => g.kind === "companion");
  if (invitation.group_name || named.length > 1 || companions.length > 1) {
    return "group";
  }
  return "single";
}

function InvitationEditorForm({
  invitation,
  answeredGuestIds,
  variants,
  defaultVariantId,
  busy,
  saving,
  onClose,
  onSubmit,
}: InvitationEditorProps) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;

  const [mode, setMode] = useState<"single" | "group" | "quick">(() =>
    initialMode(invitation),
  );
  const [groupName, setGroupName] = useState(invitation?.group_name ?? "");
  const [guests, setGuests] = useState<DraftGuest[]>(() =>
    invitation
      ? invitation.guests.map((g) => ({
          id: g.id,
          kind: g.kind,
          name: g.name ?? "",
        }))
      : [{ kind: "named", name: "" }],
  );
  const [variantId, setVariantId] = useState(
    invitation?.variant_id ?? defaultVariantId,
  );
  const [quickText, setQuickText] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const namedGuests = guests.filter((g) => g.kind === "named");
  const companionGuests = guests.filter((g) => g.kind === "companion");
  const singlePrimary = namedGuests[0] ?? { kind: "named" as const, name: "" };
  const singleHasCompanion = companionGuests.length > 0;

  const quickParsed =
    mode === "quick" && quickText.trim()
      ? parseQuickAdd(quickText, variantId)
      : null;

  function setSingleName(name: string) {
    setGuests((old) => {
      const idx = old.findIndex((g) => g.kind === "named");
      if (idx === -1) return [{ kind: "named", name }, ...old];
      return old.map((g, i) => (i === idx ? { ...g, name } : g));
    });
  }

  function toggleSingleCompanion(checked: boolean) {
    setGuests((old) => {
      if (checked) {
        if (old.some((g) => g.kind === "companion")) return old;
        return [...old, { kind: "companion", name: "" }];
      }
      const firstComp = old.findIndex((g) => g.kind === "companion");
      if (firstComp === -1) return old;
      return old.filter((_, i) => i !== firstComp);
    });
    setConfirmRemove(false);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "quick") {
      if (!quickParsed || !quickParsed.ok || !quickParsed.items.length) return;
      onSubmit({ action: "quick-import", entries: quickParsed.items });
      return;
    }

    const normalizedGuests = guests
      .filter((g) => g.kind === "companion" || g.name.trim().length > 0)
      .map((g) => ({
        ...(g.id ? { id: g.id } : {}),
        kind: g.kind,
        name: g.name.trim() ? g.name.trim() : null,
      }));

    if (invitation) {
      const removedAnsweredGuests = invitation.guests.some(
        (oldG) =>
          !normalizedGuests.some((nextG) => nextG.id === oldG.id) &&
          (answeredGuestIds?.has(oldG.id) ?? false),
      );
      if (removedAnsweredGuests && !confirmRemove) {
        setConfirmRemove(true);
        return;
      }
      onSubmit({
        action: "update",
        removedAnsweredGuests,
        payload: {
          id: invitation.id,
          version: invitation.version,
          groupName: mode === "group" ? groupName.trim() || null : null,
          variantId,
          guests: normalizedGuests,
        },
      });
    } else {
      onSubmit({
        action: "create",
        payload: {
          groupName: mode === "group" ? groupName.trim() || null : null,
          variantId,
          guests: normalizedGuests,
        },
      });
    }
  }

  const modeOptions = [
    {
      value: "single",
      label: labelText("Jedna osoba", "One person", "Eine Person"),
    },
    {
      value: "group",
      label: labelText("Grupa", "Group", "Gruppe"),
    },
    ...(!invitation
      ? [
          {
            value: "quick",
            label: labelText(
              "Szybkie dodawanie",
              "Quick add",
              "Schnell hinzufügen",
            ),
          },
        ]
      : []),
  ];

  return (
    <form onSubmit={handleFormSubmit}>
      <Stack>
        <ModalStickyTop>
          <SegmentedControl
            value={mode}
            onChange={(v) => {
              setMode(v as "single" | "group" | "quick");
              setConfirmRemove(false);
            }}
            data={modeOptions}
          />
        </ModalStickyTop>

        {mode === "single" && (
          <>
            <TextInput
              label={labelText(
                "Imię i nazwisko",
                "Full name",
                "Vor- und Nachname",
              )}
              value={singlePrimary.name}
              onChange={(e) => setSingleName(e.currentTarget.value)}
              required
              maxLength={200}
            />
            <Checkbox
              label={labelText(
                "Może przyjść z osobą towarzyszącą",
                "Can bring a companion",
                "Kann eine Begleitperson mitbringen",
              )}
              checked={singleHasCompanion}
              onChange={(e) => toggleSingleCompanion(e.currentTarget.checked)}
            />
          </>
        )}

        {mode === "group" && (
          <>
            <TextInput
              label={labelText(
                "Nazwa grupy (opcjonalnie)",
                "Group name (optional)",
                "Gruppenname (optional)",
              )}
              placeholder={labelText(
                "Np. Rodzina Nowaków",
                "E.g. The Smiths",
                "Z. B. Familie Schmidt",
              )}
              value={groupName}
              onChange={(e) => setGroupName(e.currentTarget.value)}
              maxLength={200}
            />
            <Stack gap="xs">
              {guests.map((g, index) => (
                <FormRow key={g.id || `new-${index}`}>
                  {g.kind === "named" ? (
                    <TextInput
                      label={`${labelText("Osoba", "Person", "Person")} ${index + 1}`}
                      value={g.name}
                      required
                      maxLength={200}
                      onChange={(e) => {
                        const name = e.currentTarget.value;
                        setGuests((old) =>
                          old.map((m, n) => (n === index ? { ...m, name } : m)),
                        );
                      }}
                    />
                  ) : (
                    <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                      {index + 1}.{" "}
                      {g.name.trim()
                        ? `${labelText("Osoba towarzysząca", "Companion", "Begleitperson")}: ${g.name}`
                        : labelText(
                            "Osoba towarzysząca (bez imienia)",
                            "Companion (unnamed)",
                            "Begleitperson (ohne Namen)",
                          )}
                    </Text>
                  )}
                  <Button
                    variant="subtle"
                    color="red"
                    disabled={
                      guests.length <= 1 ||
                      (g.kind === "named" && namedGuests.length <= 1)
                    }
                    onClick={() => {
                      setGuests((old) => old.filter((_, n) => n !== index));
                      setConfirmRemove(false);
                    }}
                  >
                    {labelText("Usuń", "Remove", "Entfernen")}
                  </Button>
                </FormRow>
              ))}
              <Group>
                <Button
                  variant="light"
                  disabled={guests.length >= 20}
                  onClick={() =>
                    setGuests((old) => [...old, { kind: "named", name: "" }])
                  }
                >
                  {labelText(
                    "+ Dodaj osobę",
                    "+ Add person",
                    "+ Person hinzufügen",
                  )}
                </Button>
                <Button
                  variant="default"
                  disabled={guests.length >= 20}
                  onClick={() =>
                    setGuests((old) => [
                      ...old,
                      { kind: "companion", name: "" },
                    ])
                  }
                >
                  {labelText(
                    "+ Osoba towarzysząca",
                    "+ Companion",
                    "+ Begleitperson",
                  )}
                </Button>
              </Group>
            </Stack>
          </>
        )}

        {mode === "quick" && (
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              {labelText(
                "Jedna linia to jedno zaproszenie. Osoby rozdziel przecinkami, +N dodaje osoby towarzyszące, a „Nazwa:” ustawia nazwę grupy.",
                "One line per invitation. Separate people with commas, +N adds companions, and “Name:” sets a group name.",
                "Eine Zeile pro Einladung. Personen mit Komma trennen, +N fügt Begleitpersonen hinzu, „Name:“ setzt einen Gruppennamen.",
              )}
            </Text>
            <Textarea
              label={labelText(
                "Lista zaproszeń",
                "Invitations list",
                "Einladungsliste",
              )}
              placeholder={labelText(
                "Anna Kowalska +1\nRodzina Nowaków: Jan Nowak, Ewa Nowak +2\nPiotr Wiśniewski",
                "Anna Smith +1\nThe Smiths: John Smith, Emma Smith +2\nPeter Brown",
                "Anna Schmidt +1\nFamilie Müller: Jan Müller, Eva Müller +2\nPeter Weber",
              )}
              autosize
              minRows={4}
              value={quickText}
              onChange={(e) => setQuickText(e.currentTarget.value)}
            />
            {quickParsed && quickParsed.ok && (
              <Alert color="green">
                {labelText(
                  `Gotowe do dodania: ${quickParsed.items.length} zaproszeń, ${quickParsed.items.reduce((s, i) => s + i.guests.length, 0)} osób (w tym ${quickParsed.items.reduce((s, i) => s + i.guests.filter((g) => g.kind === "companion").length, 0)} towarzyszących).`,
                  `Ready to create: ${quickParsed.items.length} invitations, ${quickParsed.items.reduce((s, i) => s + i.guests.length, 0)} people.`,
                  `Bereit: ${quickParsed.items.length} Einladungen, ${quickParsed.items.reduce((s, i) => s + i.guests.length, 0)} Personen.`,
                )}
              </Alert>
            )}
            {quickParsed && !quickParsed.ok && (
              <Alert color="red">
                {quickParsed.errors.map((err) => (
                  <Text size="sm" key={err.line}>
                    {labelText("Wiersz", "Line", "Zeile")} {err.line}:{" "}
                    {err.message}
                  </Text>
                ))}
              </Alert>
            )}
          </Stack>
        )}

        <Select
          label={labelText(
            "Wariant zaproszenia",
            "Invitation variant",
            "Einladungsvariante",
          )}
          data={variants}
          value={variantId}
          onChange={(v) => setVariantId(v || "")}
          required
        />

        {confirmRemove && (
          <Alert color="orange">
            {labelText(
              "Usuwasz osobę, która zapisała już odpowiedzi. Jej odpowiedzi zostaną trwale usunięte. Kliknij „Zapisz zaproszenie” ponownie, aby potwierdzić.",
              "You are removing a person who already answered. Their answers will be permanently deleted. Click Save again to confirm.",
              "Sie entfernen eine Person mit Antworten. Ihre Antworten werden gelöscht. Zum Bestätigen erneut speichern.",
            )}
          </Alert>
        )}

        <ModalStickyFooter justify="flex-end">
          <Button variant="default" disabled={busy} onClick={onClose}>
            {labelText("Anuluj", "Cancel", "Abbrechen")}
          </Button>
          <ActionButton
            disabled={
              busy ||
              (mode === "quick" &&
                (!quickParsed || !quickParsed.ok || !quickParsed.items.length))
            }
            type="submit"
            loading={saving}
            pendingLabel={loadingText(language, invitation ? "save" : "create")}
          >
            {invitation
              ? labelText(
                  "Zapisz zaproszenie",
                  "Save invitation",
                  "Einladung speichern",
                )
              : mode === "quick"
                ? labelText(
                    "Utwórz zaproszenia",
                    "Create invitations",
                    "Einladungen erstellen",
                  )
                : labelText(
                    "Utwórz zaproszenie i link",
                    "Create invitation and link",
                    "Einladung und Link erstellen",
                  )}
          </ActionButton>
        </ModalStickyFooter>
      </Stack>
    </form>
  );
}
