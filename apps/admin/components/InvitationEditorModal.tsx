"use client";
import { useState } from "react";
import {
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { loadingText } from "@invitations/ui/loading-copy";
import { ActionButton } from "./ActionButton";
import { FormRow } from "./form-layout.styles";
import { type InvitationRow } from "../lib/guest-management";
import { usePanelI18n } from "../lib/i18n";

export type InvitationEditorSubmit =
  | {
      action: "create";
      payload: {
        label: string;
        variantId: string;
        emails: string[];
        names: string[];
        allowPlusOne: boolean;
      };
    }
  | {
      action: "update";
      payload: {
        id: string;
        version: number;
        label: string;
        variantId: string;
        emails: string[];
        guests: { id?: string; name: string }[];
        allowPlusOne: boolean;
      };
      removedGuests: boolean;
    };

type InvitationEditorProps = {
  opened: boolean;
  invitation: InvitationRow | null;
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
          : labelText(
              "Nowe zaproszenie",
              "New invitation",
              "Neue Einladung",
            )
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

function InvitationEditorForm({
  invitation,
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

  const [label, setLabel] = useState(invitation?.label ?? "");
  const [names, setNames] = useState(
    invitation ? invitation.guests.map((g) => g.name).join("\n") : "",
  );
  const [members, setMembers] = useState<{ id?: string; name: string }[]>(() =>
    invitation ? invitation.guests.map((g) => ({ ...g })) : [],
  );
  const [variantId, setVariantId] = useState(
    invitation?.variant_id ?? defaultVariantId,
  );
  const [allowPlusOne, setAllowPlusOne] = useState(
    invitation?.allow_plus_one ?? false,
  );

  return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (invitation) {
            const removedGuests = invitation.guests.some(
              (g) => !members.some((m) => m.id === g.id),
            );
            onSubmit({
              action: "update",
              removedGuests,
              payload: {
                id: invitation.id,
                version: invitation.version,
                label,
                variantId,
                emails: [],
                guests: members,
                allowPlusOne,
              },
            });
          } else {
            onSubmit({
              action: "create",
              payload: {
                label,
                variantId,
                emails: [],
                names: names
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                allowPlusOne,
              },
            });
          }
        }}
      >
        <Stack>
          <Text size="sm">
            {labelText(
              "Link rodzinny pozwala odpowiadać za zaproszone osoby. Przekazuj go tylko odbiorcom. Wyświetlamy go po utworzeniu lub wygenerowaniu nowego; nowy link unieważnia poprzedni.",
              "The family link allows responses for invited people. Share it only with recipients. It is shown after creation or regeneration; a new link invalidates the old one.",
              "Der Familienlink erlaubt Antworten für eingeladene Personen. Nur an Empfänger weitergeben. Nach Erstellung oder Erneuerung sichtbar; ein neuer Link ersetzt den bisherigen.",
            )}
          </Text>
          <TextInput
            label={labelText(
              "Nazwa osoby lub rodziny",
              "Person or family name",
              "Name der Person oder Familie",
            )}
            value={label}
            onChange={(e) => setLabel(e.currentTarget.value)}
            required
            maxLength={200}
          />
          {invitation ? (
            <Stack>
              {members.map((member, index) => (
                <FormRow key={member.id || `new-${index}`}>
                  <TextInput
                    label={`${labelText("Gość", "Guest", "Gast")} ${index + 1}`}
                    value={member.name}
                    required
                    maxLength={200}
                    onChange={(e) => {
                      const name = e.currentTarget.value;
                      setMembers((old) =>
                        old.map((m, n) => (n === index ? { ...m, name } : m)),
                      );
                    }}
                  />
                  <Button
                    variant="subtle"
                    color="red"
                    disabled={members.length <= 1}
                    onClick={() =>
                      setMembers((old) => old.filter((_, n) => n !== index))
                    }
                  >
                    {labelText(
                      "Usuń osobę",
                      "Remove person",
                      "Person entfernen",
                    )}
                  </Button>
                </FormRow>
              ))}
              <Button
                variant="light"
                disabled={members.length >= 20}
                onClick={() => setMembers((old) => [...old, { name: "" }])}
              >
                {labelText("Dodaj osobę", "Add person", "Person hinzufügen")}
              </Button>
              {invitation.archived_guests?.map((g) => (
                <Button
                  key={g.id}
                  variant="subtle"
                  disabled={
                    members.some((m) => m.id === g.id) || members.length >= 20
                  }
                  onClick={() => setMembers((old) => [...old, g])}
                >
                  {labelText(
                    "Przywróć osobę",
                    "Restore person",
                    "Person wiederherstellen",
                  )}
                  : {g.name}
                </Button>
              ))}
            </Stack>
          ) : (
            <Textarea
              label={labelText(
                "Goście — każda osoba w osobnym wierszu",
                "Guests — one person per line",
                "Gäste — eine Person pro Zeile",
              )}
              value={names}
              onChange={(e) => setNames(e.currentTarget.value)}
              required
              autosize
              minRows={2}
            />
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
          <Switch
            label={labelText(
              "Pozwól na osobę towarzyszącą (+1)",
              "Allow plus-one (+1)",
              "Begleitperson (+1) erlauben",
            )}
            description={
              invitation?.plus_one && !allowPlusOne
                ? labelText(
                    "Wyłączenie +1 usunie wpisaną osobę towarzyszącą oraz jej odpowiedzi RSVP.",
                    "Disabling +1 will remove the registered plus-one guest and their RSVP answers.",
                    "Das Deaktivieren von +1 entfernt die eingetragene Begleitperson und deren Antworten.",
                  )
                : undefined
            }
            checked={allowPlusOne}
            onChange={(e) => setAllowPlusOne(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="default" disabled={busy} onClick={onClose}>
              {labelText("Anuluj", "Cancel", "Abbrechen")}
            </Button>
            <ActionButton
              disabled={busy}
              type="submit"
              loading={saving}
              pendingLabel={loadingText(
                language,
                invitation ? "save" : "create",
              )}
            >
              {invitation
                ? labelText(
                    "Zapisz zaproszenie",
                    "Save invitation",
                    "Einladung speichern",
                  )
                : labelText(
                    "Utwórz zaproszenie i link",
                    "Create invitation and link",
                    "Einladung und Link erstellen",
                  )}
            </ActionButton>
          </Group>
        </Stack>
      </form>
  );
}
