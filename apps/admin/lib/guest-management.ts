import {
  csvFile,
  type GuestDetails,
  type PlusOneGuest,
  type QuestionSettings,
} from "@invitations/domain/operations";

type Guest = { id: string; name: string };
export type InvitationRow = {
  id: string;
  label: string;
  variant_id: string;
  emails: string[];
  guests: Guest[];
  revoked: boolean;
  version: number;
  rsvp_revision: number;
  note: string;
  archived_guests?: Guest[];
  guest_details?: GuestDetails;
  allow_plus_one: boolean;
  plus_one: PlusOneGuest;
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
    rsvp_questions?: QuestionSettings;
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
};

export function formatRsvpCsv(
  data: Management | null,
  events: InvitationRow["events"],
  answerMap: ReadonlyMap<string, boolean>,
  labelText: (pl: string, en: string, de: string) => string,
) {
  const rows: unknown[][] = [
    [
      "Rodzina",
      "Gość",
      "+1",
      "Wydarzenie",
      "Odpowiedź",
      "Dieta",
      "Nocleg",
      "Transport",
      labelText("Uwagi", "Notes", "Anmerkungen"),
      "Status osoby",
    ],
  ];
  for (const i of data?.invitations || []) {
    const allGuests = [
      ...i.guests,
      ...(i.plus_one ? [i.plus_one] : []),
      ...(i.archived_guests || []),
    ];
    for (const g of allGuests) {
      const isPlusOne = i.plus_one?.id === g.id;
      const archived =
        !isPlusOne && !i.guests.some((current) => current.id === g.id);
      const detail = i.guest_details?.[g.id] || {};
      const relevant = archived
        ? (data?.answers || [])
            .filter((a) => a.invitation_id === i.id && a.guest_id === g.id)
            .map((a) => ({
              id: a.event_id,
              title:
                events.find((e) => e.id === a.event_id)?.title || a.event_id,
            }))
        : i.events;
      for (const event of relevant.length
        ? relevant
        : [{ id: "", title: "" }]) {
        const answer = answerMap.get(`${i.id}:${g.id}:${event.id}`);
        rows.push([
          i.label,
          g.name,
          isPlusOne
            ? labelText("Osoba towarzysząca", "Plus-one", "Begleitperson")
            : "",
          event.title,
          answer === undefined
            ? labelText("Brak odpowiedzi", "No response", "Keine Antwort")
            : answer
              ? labelText("Tak", "Yes", "Ja")
              : labelText("Nie", "No", "Nein"),
          detail.diet,
          detail.lodging === undefined
            ? ""
            : detail.lodging
              ? labelText("Tak", "Yes", "Ja")
              : labelText("Nie", "No", "Nein"),
          detail.transport === undefined
            ? ""
            : detail.transport
              ? labelText("Tak", "Yes", "Ja")
              : labelText("Nie", "No", "Nein"),
          i.note,
          archived
            ? "Archiwalna"
            : i.revoked
              ? "Cofnięte zaproszenie"
              : "Aktywna",
        ]);
      }
    }
  }
  return csvFile(rows);
}
