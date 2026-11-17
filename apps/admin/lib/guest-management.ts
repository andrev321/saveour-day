import {
  guestDisplayName,
  invitationDisplayName,
  type InvitationGuest,
} from "@invitations/domain/invitation";
import { csvFile } from "@invitations/domain/operations";
import {
  formatQuestionValue,
  indexQuestionAnswers,
  questionRecordKey,
  type QuestionAnswerRecord,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";

export type InvitationRow = {
  id: string;
  group_name: string | null;
  variant_id: string;
  guests: InvitationGuest[];
  revoked: boolean;
  version: number;
  rsvp_revision: number;
  note: string;
  short_code: string;
  origin: "organizer" | "self_registered";
  review_status: "approved" | "pending_match";
  events: { id: string; title: string }[];
};

export type Management = {
  variants: { id: string; label: string }[];
  site: {
    access_mode: string;
    public_variant_id: string | null;
    access_version: number;
    rsvp_deadline: string | null;
    published_release_id: string | null;
    rsvp_enabled: boolean;
    allow_self_registration: boolean;
  };
  locale: string;
  displayName: string;
  url: string;
  invitations: InvitationRow[];
  answers: {
    invitation_id: string;
    guest_id: string;
    event_id: string;
    attending: boolean;
  }[];
  questions: RsvpQuestion[];
  questionAnswers: QuestionAnswerRecord[];
};

export function formatRsvpCsv(
  data: Management | null,
  answerMap: ReadonlyMap<string, boolean>,
  labelText: (pl: string, en: string, de: string) => string,
) {
  const questions = data?.questions || [];
  const qAnswerMap = indexQuestionAnswers(data?.questionAnswers || []);

  const companionLabel = labelText(
    "Osoba towarzysząca",
    "Companion",
    "Begleitperson",
  );
  const andLabel = labelText("i", "and", "und");
  const otherLabel = labelText("Inne", "Other", "Sonstiges");

  const rows: unknown[][] = [
    [
      labelText("Zaproszenie", "Invitation", "Einladung"),
      labelText("Osoba", "Guest", "Gast"),
      labelText("Typ", "Type", "Typ"),
      labelText("Wydarzenie", "Event", "Ereignis"),
      labelText("Odpowiedź", "Response", "Antwort"),
      ...questions.map((q) => q.label),
      labelText("Uwagi", "Notes", "Anmerkungen"),
      labelText("Status zaproszenia", "Invitation status", "Status"),
    ],
  ];

  for (const inv of data?.invitations || []) {
    const invTitle = invitationDisplayName(
      { groupName: inv.group_name, guests: inv.guests },
      { companion: companionLabel, and: andLabel },
    );

    for (const g of inv.guests) {
      const relevant = inv.events.length ? inv.events : [{ id: "", title: "" }];

      for (const event of relevant) {
        const answer = event.id
          ? answerMap.get(`${inv.id}:${g.id}:${event.id}`)
          : undefined;
        const questionCols = questions.map((q) => {
          const val =
            q.scope === "guest"
              ? qAnswerMap.get(questionRecordKey(q.id, inv.id, g.id))
              : qAnswerMap.get(questionRecordKey(q.id, inv.id, null));
          return formatQuestionValue(q, val, otherLabel);
        });

        rows.push([
          invTitle,
          guestDisplayName(g, { companion: companionLabel }),
          g.kind === "companion"
            ? companionLabel
            : labelText("Imienna", "Named", "Namentlich"),
          event.title,
          answer === undefined
            ? labelText("Brak odpowiedzi", "No response", "Keine Antwort")
            : answer
              ? labelText("Tak", "Yes", "Ja")
              : labelText("Nie", "No", "Nein"),
          ...questionCols,
          inv.note,
          inv.revoked
            ? labelText("Cofnięte", "Revoked", "Widerrufen")
            : labelText("Aktywne", "Active", "Aktiv"),
        ]);
      }
    }
  }
  return csvFile(rows);
}
