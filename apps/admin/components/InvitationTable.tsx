"use client";
import { Fragment, useState } from "react";
import { NoticePopover } from "./NoticePopover";
import {
  Alert,
  Badge,
  Button,
  Group,
  Menu,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { formatShareMessage } from "@invitations/domain/hybrid-rsvp";
import {
  guestDisplayName,
  invitationDisplayName,
  type InvitationStatus,
  type PersonStatus,
} from "@invitations/domain/invitation";
import {
  formatQuestionValue,
  indexQuestionAnswers,
  questionRecordKey,
  type QuestionAnswerInput,
  type QuestionAnswerRecord,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";
import { RsvpGridEditor } from "./RsvpGridEditor";
import type { InvitationRow } from "../lib/guest-management";
import { usePanelI18n } from "../lib/i18n";

export function InvitationTable({
  invitations,
  allActiveInvitations,
  answerMap,
  byGuest,
  byInvitation,
  collisions,
  questions,
  questionAnswers,
  locale,
  displayName,
  publicUrl,
  deadline,
  publishedReleaseId,
  busy,
  savingRsvp,
  onCopy,
  onEdit,
  onRotate,
  onRevoke,
  onApprovePending,
  onMergePending,
  onConvertCompanion,
  onSaveRsvp,
}: {
  invitations: InvitationRow[];
  allActiveInvitations: InvitationRow[];
  answerMap: ReadonlyMap<string, boolean>;
  byGuest: ReadonlyMap<string, PersonStatus>;
  byInvitation: ReadonlyMap<string, InvitationStatus>;
  collisions: ReadonlyMap<string, string[]>;
  questions: RsvpQuestion[];
  questionAnswers: QuestionAnswerRecord[];
  locale: string;
  displayName: string;
  publicUrl: string;
  deadline: string | null;
  publishedReleaseId: string | null;
  busy: boolean;
  savingRsvp: boolean;
  onCopy: (text: string, msg: string) => void;
  onEdit: (inv: InvitationRow) => void;
  onRotate: (inv: InvitationRow) => void;
  onRevoke: (inv: InvitationRow) => void;
  onApprovePending: (id: string) => void;
  onMergePending: (
    pendingId: string,
    targetId: string,
    targetGuestId: string | null,
  ) => void;
  onConvertCompanion: (
    inv: InvitationRow,
    guestId: string,
    name: string,
  ) => void;
  onSaveRsvp: (payload: {
    id: string;
    revision: number;
    note: string;
    answers: { guestId: string; eventId: string; attending: boolean }[];
    companionNames: Record<string, string | null>;
    questionAnswers: QuestionAnswerInput[];
  }) => Promise<boolean>;
}) {
  const { language } = usePanelI18n();
  const labelText = (pl: string, en: string, de: string) =>
    language === "pl" ? pl : language === "en" ? en : de;

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingRsvpId, setEditingRsvpId] = useState<string | null>(null);
  const [mergeTargets, setMergeTargets] = useState<Record<string, string>>({});
  const [mergeGuestTargets, setMergeGuestTargets] = useState<
    Record<string, string>
  >({});
  const [convertingGuestId, setConvertingGuestId] = useState<string | null>(
    null,
  );
  const [convertingName, setConvertingName] = useState("");

  const companionLabel = labelText(
    "Osoba towarzysząca",
    "Companion",
    "Begleitperson",
  );
  const andLabel = labelText("i", "and", "und");
  const otherLabel = labelText("Inne", "Other", "Sonstiges");

  const qAnswerMap = indexQuestionAnswers(questionAnswers);

  const personBadgeColor = (status: PersonStatus | undefined) => {
    if (status === "attending") return "green";
    if (status === "declined") return "red";
    if (status === "partial") return "yellow";
    return "gray";
  };

  const invitationStatusLabel = (inv: InvitationRow) => {
    if (inv.revoked) return labelText("Cofnięte", "Revoked", "Widerrufen");
    if (inv.review_status === "pending_match")
      return labelText("Do akceptacji", "Pending review", "Ausstehend");
    const s = byInvitation.get(inv.id);
    if (s === "answered")
      return labelText("Odpowiedziano", "Answered", "Beantwortet");
    if (s === "partial") return labelText("Częściowo", "Partial", "Teilweise");
    return labelText("Czekamy", "Pending", "Offen");
  };

  const invitationStatusColor = (inv: InvitationRow) => {
    if (inv.revoked) return "gray";
    if (inv.review_status === "pending_match") return "orange";
    const s = byInvitation.get(inv.id);
    if (s === "answered") return "green";
    if (s === "partial") return "yellow";
    return "gray";
  };

  const approvedMergeOptions = allActiveInvitations.map((inv) => ({
    value: inv.id,
    label: invitationDisplayName(
      { groupName: inv.group_name, guests: inv.guests },
      { companion: companionLabel, and: andLabel },
    ),
  }));

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              {labelText("Zaproszenie", "Invitation", "Einladung")}
            </Table.Th>
            <Table.Th>{labelText("Osoby", "Guests", "Gäste")}</Table.Th>
            <Table.Th>{labelText("Odpowiedź", "Status", "Status")}</Table.Th>
            <Table.Th>{labelText("Kod", "Code", "Code")}</Table.Th>
            <Table.Th style={{ textAlign: "right" }}>
              {labelText("Akcje", "Actions", "Aktionen")}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {invitations.map((inv) => {
            const title = invitationDisplayName(
              { groupName: inv.group_name, guests: inv.guests },
              { companion: companionLabel, and: andLabel },
            );
            const collidingNames = collisions.get(inv.id);
            const isPending =
              inv.review_status === "pending_match" && !inv.revoked;
            const isExpanded =
              Boolean(expanded[inv.id]) ||
              isPending ||
              editingRsvpId === inv.id;

            const selectedMergeTarget = mergeTargets[inv.id]
              ? allActiveInvitations.find((x) => x.id === mergeTargets[inv.id])
              : null;
            const mergeGuestOptions = [
              ...(selectedMergeTarget?.guests
                .filter((g) => g.kind === "named")
                .map((g) => ({
                  value: g.id,
                  label: g.name || companionLabel,
                })) || []),
              {
                value: "__new__",
                label: labelText(
                  "+ Dodaj jako nową osobę",
                  "+ Add as a new person",
                  "+ Als neue Person hinzufügen",
                ),
              },
            ];

            return (
              <Fragment key={inv.id}>
                <Table.Tr>
                  <Table.Td>
                    <Group gap={6} wrap="wrap">
                      <Text fw={600} size="sm">
                        {title}
                      </Text>
                      {collidingNames && (
                        <Badge size="xs" color="yellow" variant="light">
                          {labelText("Kolizja", "Collision", "Kollision")}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} wrap="wrap">
                      {inv.guests.map((g) => {
                        const status = byGuest.get(g.id);
                        return (
                          <Badge
                            key={g.id}
                            size="sm"
                            variant={
                              g.kind === "companion" ? "outline" : "light"
                            }
                            color={personBadgeColor(status)}
                            style={
                              g.kind === "companion"
                                ? { borderStyle: "dashed" }
                                : undefined
                            }
                          >
                            {guestDisplayName(g, { companion: companionLabel })}
                          </Badge>
                        );
                      })}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="sm"
                      variant="light"
                      color={invitationStatusColor(inv)}
                    >
                      {invitationStatusLabel(inv)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {inv.short_code && (
                      <Badge variant="outline" color="dark" size="sm">
                        {inv.short_code}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: "right" }}>
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        onClick={() =>
                          setExpanded((old) => ({
                            ...old,
                            [inv.id]: !old[inv.id],
                          }))
                        }
                      >
                        {isExpanded
                          ? labelText("Zwiń", "Hide", "Weniger")
                          : labelText("Szczegóły", "Details", "Details")}
                      </Button>
                      <Menu position="bottom-end" shadow="md">
                        <Menu.Target>
                          <Button size="compact-xs" variant="light">
                            ⋯
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          {!inv.revoked && inv.short_code && (
                            <Menu.Item
                              onClick={() =>
                                onCopy(
                                  formatShareMessage({
                                    locale,
                                    displayName,
                                    kind: "shared_with_code",
                                    url: publicUrl,
                                    shortCode: inv.short_code,
                                    deadline,
                                  }),
                                  labelText(
                                    `Skopiowano link + kod (${inv.short_code}).`,
                                    `Copied link + code (${inv.short_code}).`,
                                    `Link + Code kopiert (${inv.short_code}).`,
                                  ),
                                )
                              }
                            >
                              {labelText(
                                "Kopiuj link + kod",
                                "Copy link + code",
                                "Link + Code kopieren",
                              )}
                            </Menu.Item>
                          )}
                          <Menu.Item
                            disabled={busy}
                            onClick={() => onEdit(inv)}
                          >
                            {labelText(
                              "Edytuj zaproszenie",
                              "Edit invitation",
                              "Einladung bearbeiten",
                            )}
                          </Menu.Item>
                          <Menu.Item
                            disabled={
                              busy || !publishedReleaseId || !inv.events.length
                            }
                            onClick={() => {
                              setEditingRsvpId(inv.id);
                              setExpanded((old) => ({
                                ...old,
                                [inv.id]: true,
                              }));
                            }}
                          >
                            {labelText(
                              "Popraw odpowiedzi",
                              "Edit RSVP",
                              "RSVP bearbeiten",
                            )}
                          </Menu.Item>
                          <Menu.Item
                            disabled={busy}
                            onClick={() => onRotate(inv)}
                          >
                            {labelText(
                              "Wygeneruj nowy link",
                              "Generate new link",
                              "Neuen Link erstellen",
                            )}
                          </Menu.Item>
                          <Menu.Item
                            color="red"
                            disabled={busy || inv.revoked}
                            onClick={() => onRevoke(inv)}
                          >
                            {labelText(
                              "Cofnij dostęp",
                              "Revoke access",
                              "Zugang widerrufen",
                            )}
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>

                {isExpanded && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Stack gap="xs" py="xs" pl="sm">
                        {collidingNames && (
                          <Group gap="xs" align="center">
                            <NoticePopover
                              color="yellow"
                              label={labelText(
                                `Powtarzające się dane: ${collidingNames.join(", ")}. Przekaż gościowi link ogólny wraz z kodem ${inv.short_code}.`,
                                `Duplicate name: ${collidingNames.join(", ")}. Share the general link with code ${inv.short_code}.`,
                                `Doppelter Name: ${collidingNames.join(", ")}. Allgemeinen Link mit Code ${inv.short_code} teilen.`,
                              )}
                            >
                              {labelText(
                                `Powtarzające się dane: ${collidingNames.join(", ")}. Przekaż gościowi link ogólny wraz z kodem ${inv.short_code}.`,
                                `Duplicate name: ${collidingNames.join(", ")}. Share the general link with code ${inv.short_code}.`,
                                `Doppelter Name: ${collidingNames.join(", ")}. Allgemeinen Link mit Code ${inv.short_code} teilen.`,
                              )}
                            </NoticePopover>
                            <Text size="xs" c="dimmed">
                              {labelText(
                                "Powtarzające się dane",
                                "Duplicate name",
                                "Doppelter Name",
                              )}
                            </Text>
                          </Group>
                        )}

                        {isPending && (
                          <Alert color="orange">
                            <Stack gap="xs">
                              <Text size="xs">
                                {labelText(
                                  "Gość dopisał się samodzielnie na stronie. Zatwierdź jako nowe zaproszenie lub połącz z istniejącym.",
                                  "Guest self-registered on the site. Approve as new or merge into an existing invitation.",
                                  "Gast hat sich selbst registriert. Genehmigen oder mit bestehender Einladung zusammenführen.",
                                )}
                                {inv.guests.some((g) => g.kind === "companion")
                                  ? ` (${labelText("Z osobą towarzyszącą", "With companion", "Mit Begleitperson")})`
                                  : ""}
                              </Text>
                              <Group align="flex-end" wrap="wrap">
                                <Button
                                  size="xs"
                                  color="green"
                                  disabled={busy}
                                  onClick={() => onApprovePending(inv.id)}
                                >
                                  {labelText(
                                    "Zatwierdź",
                                    "Approve",
                                    "Genehmigen",
                                  )}
                                </Button>
                                {approvedMergeOptions.length > 0 && (
                                  <>
                                    <Select
                                      size="xs"
                                      placeholder={labelText(
                                        "Zaproszenie docelowe",
                                        "Target invitation",
                                        "Zieleinladung",
                                      )}
                                      data={approvedMergeOptions}
                                      value={mergeTargets[inv.id] || null}
                                      onChange={(v) => {
                                        setMergeTargets((old) => ({
                                          ...old,
                                          [inv.id]: v || "",
                                        }));
                                        setMergeGuestTargets((old) => ({
                                          ...old,
                                          [inv.id]: "__new__",
                                        }));
                                      }}
                                      searchable
                                    />
                                    {selectedMergeTarget && (
                                      <Select
                                        size="xs"
                                        placeholder={labelText(
                                          "Osoba docelowa",
                                          "Target person",
                                          "Zielperson",
                                        )}
                                        data={mergeGuestOptions}
                                        value={
                                          mergeGuestTargets[inv.id] || "__new__"
                                        }
                                        onChange={(v) =>
                                          setMergeGuestTargets((old) => ({
                                            ...old,
                                            [inv.id]: v || "__new__",
                                          }))
                                        }
                                      />
                                    )}
                                    <Button
                                      size="xs"
                                      variant="light"
                                      disabled={busy || !mergeTargets[inv.id]}
                                      onClick={() => {
                                        const gTarget =
                                          mergeGuestTargets[inv.id];
                                        onMergePending(
                                          inv.id,
                                          mergeTargets[inv.id]!,
                                          gTarget && gTarget !== "__new__"
                                            ? gTarget
                                            : null,
                                        );
                                      }}
                                    >
                                      {labelText(
                                        "Połącz",
                                        "Merge",
                                        "Zusammenführen",
                                      )}
                                    </Button>
                                  </>
                                )}
                              </Group>
                            </Stack>
                          </Alert>
                        )}

                        {inv.guests.map((g) => {
                          const guestQs = questions.filter(
                            (q) =>
                              q.scope === "guest" &&
                              (q.variantIds.length === 0 ||
                                q.variantIds.includes(inv.variant_id)),
                          );
                          return (
                            <Stack key={g.id} gap={2}>
                              <Group gap="xs" wrap="wrap">
                                <Text size="sm" fw={600}>
                                  {guestDisplayName(g, {
                                    companion: companionLabel,
                                  })}
                                </Text>
                                {g.kind === "companion" && (
                                  <>
                                    <Badge size="xs" variant="outline">
                                      {companionLabel}
                                    </Badge>
                                    {convertingGuestId === g.id ? (
                                      <Group gap={4}>
                                        <TextInput
                                          size="xs"
                                          placeholder={labelText(
                                            "Imię i nazwisko",
                                            "Full name",
                                            "Vor- und Nachname",
                                          )}
                                          value={convertingName}
                                          onChange={(e) =>
                                            setConvertingName(
                                              e.currentTarget.value,
                                            )
                                          }
                                        />
                                        <Button
                                          size="compact-xs"
                                          disabled={
                                            busy || !convertingName.trim()
                                          }
                                          onClick={() => {
                                            onConvertCompanion(
                                              inv,
                                              g.id,
                                              convertingName.trim(),
                                            );
                                            setConvertingGuestId(null);
                                          }}
                                        >
                                          {labelText(
                                            "Zapisz",
                                            "Save",
                                            "Speichern",
                                          )}
                                        </Button>
                                        <Button
                                          size="compact-xs"
                                          variant="subtle"
                                          onClick={() =>
                                            setConvertingGuestId(null)
                                          }
                                        >
                                          ✕
                                        </Button>
                                      </Group>
                                    ) : (
                                      <Button
                                        size="compact-xs"
                                        variant="subtle"
                                        disabled={busy}
                                        onClick={() => {
                                          if (g.name?.trim()) {
                                            onConvertCompanion(
                                              inv,
                                              g.id,
                                              g.name.trim(),
                                            );
                                          } else {
                                            setConvertingGuestId(g.id);
                                            setConvertingName("");
                                          }
                                        }}
                                      >
                                        {labelText(
                                          "Zamień w osobę imienną",
                                          "Convert to named guest",
                                          "In namentlichen Gast umwandeln",
                                        )}
                                      </Button>
                                    )}
                                  </>
                                )}
                              </Group>

                              <Group gap="md" wrap="wrap">
                                {inv.events.map((ev) => {
                                  const v = answerMap.get(
                                    `${inv.id}:${g.id}:${ev.id}`,
                                  );
                                  return (
                                    <Text size="xs" key={ev.id}>
                                      {ev.title}:{" "}
                                      {v === undefined
                                        ? labelText(
                                            "Brak odpowiedzi",
                                            "No response",
                                            "Keine Antwort",
                                          )
                                        : v
                                          ? labelText("Tak", "Yes", "Ja")
                                          : labelText("Nie", "No", "Nein")}
                                    </Text>
                                  );
                                })}
                              </Group>

                              {guestQs.map((q) => {
                                const qa = qAnswerMap.get(
                                  questionRecordKey(q.id, inv.id, g.id),
                                );
                                if (!qa) return null;
                                return (
                                  <Text size="xs" c="dimmed" key={q.id}>
                                    {q.label}:{" "}
                                    {formatQuestionValue(q, qa, otherLabel)}
                                  </Text>
                                );
                              })}
                            </Stack>
                          );
                        })}

                        {questions
                          .filter(
                            (q) =>
                              q.scope === "invitation" &&
                              (q.variantIds.length === 0 ||
                                q.variantIds.includes(inv.variant_id)),
                          )
                          .map((q) => {
                            const qa = qAnswerMap.get(
                              questionRecordKey(q.id, inv.id, null),
                            );
                            if (!qa) return null;
                            return (
                              <Text size="xs" c="dimmed" key={q.id}>
                                {q.label}:{" "}
                                {formatQuestionValue(q, qa, otherLabel)}
                              </Text>
                            );
                          })}

                        {inv.note && (
                          <Text size="xs">
                            {labelText("Uwagi", "Notes", "Anmerkungen")}:{" "}
                            {inv.note}
                          </Text>
                        )}

                        {editingRsvpId === inv.id && (
                          <RsvpGridEditor
                            invitation={inv}
                            initialAnswers={answerMap}
                            questions={questions}
                            initialQuestionAnswers={questionAnswers}
                            busy={busy}
                            saving={savingRsvp}
                            onCancel={() => setEditingRsvpId(null)}
                            onSave={async (payload) => {
                              const ok = await onSaveRsvp(payload);
                              if (ok) setEditingRsvpId(null);
                            }}
                          />
                        )}
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Fragment>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
