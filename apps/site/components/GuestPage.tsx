"use client";
import { useEffect, useState } from "react";
import { Invitation } from "@invitations/renderer";
import type { GuestContent } from "@invitations/domain/guest";
type Reply = {
  authorized: boolean;
  mode: string;
  requiresLink?: boolean;
  config?: GuestContent;
  deadline?: string | null;
  closed?: boolean;
  invitation?: {
    label: string;
    guests: { id: string; name: string }[];
    revision: number;
    note: string;
    answers: { guest_id: string; event_id: string; attending: boolean }[];
  } | null;
};
export function GuestPage({
  kind,
  accessKey,
}: {
  kind: string;
  accessKey: string;
}) {
  const endpoint = `/api/guest/${kind}/${encodeURIComponent(accessKey)}`;
  const [data, setData] = useState<Reply | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false);
  const [links, setLinks] = useState<{ href: string; label: string }[]>([]);
  const [note, setNote] = useState(""),
    [answers, setAnswers] = useState<Record<string, string>>({});
  function accept(next: Reply) {
    setData(next);
    setNote(next.invitation?.note || "");
    setAnswers(
      Object.fromEntries(
        (next.invitation?.answers || []).map((a) => [
          `${a.guest_id}:${a.event_id}`,
          String(a.attending),
        ]),
      ),
    );
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        accept(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setMessage(e.message);
      });
    return () => controller.abort();
  }, [endpoint]);
  async function reload() {
    const r = await fetch(endpoint, { cache: "no-store" });
    const result = await r.json();
    if (!r.ok) {
      setData(null);
      throw new Error(result.error);
    }
    accept(result);
  }
  async function action(action: string, payload: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const result = await r.json();
      if (!r.ok) {
        if (action === "rsvp" && [401, 403, 404].includes(r.status)) {
          setData(null);
          setLinks([]);
          setSent(false);
          setCode("");
          setOtp("");
          await reload();
        }
        throw new Error(result.error);
      }
      if (action === "otp-send") {
        setSent(true);
        setMessage(result.message);
      } else if (result.links) setLinks(result.links);
      else {
        await reload();
        if (action === "rsvp")
          setMessage("Dziękujemy! Odpowiedzi zostały zapisane.");
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!data?.authorized)
    return (
      <main className="guest-card">
        <h1>Twoje zaproszenie</h1>
        {message && <p role="status">{message}</p>}
        {!data && !message && <p>Wczytywanie…</p>}
        {links.map((l) => (
          <a className="guest-link" key={l.href} href={l.href}>
            {l.label}
          </a>
        ))}
        {data?.requiresLink && (
          <p>Otwórz oryginalny link otrzymany od organizatora.</p>
        )}
        {data?.mode === "code" && !data.requiresLink && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action("code", { code });
            }}
          >
            <label>
              Kod dostępu
              <input
                type="password"
                autoComplete="current-password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={128}
              />
            </label>
            <button disabled={busy}>Otwórz zaproszenie</button>
          </form>
        )}
        {data?.mode === "email" && !links.length && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action(sent ? "otp-verify" : "otp-send", {
                email,
                token: sent ? otp : undefined,
              });
            }}
          >
            <label>
              Adres e-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                }}
                required
              />
            </label>
            {sent && (
              <label>
                Kod z wiadomości e-mail
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  pattern="[0-9]{6,10}"
                />
              </label>
            )}
            <button disabled={busy}>
              {sent ? "Potwierdź dostęp" : "Wyślij kod"}
            </button>
            {sent && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void action("otp-send", { email })}
              >
                Wyślij ponownie
              </button>
            )}
          </form>
        )}
        {data?.mode === "public" && (
          <p>Otwórz oryginalny link otrzymany od organizatora.</p>
        )}
      </main>
    );
  return (
    <>
      <Invitation
        config={data.config!}
        resolveMedia={(src) =>
          `/api/media/${kind}/${encodeURIComponent(accessKey)}/${src.slice("/media/".length)}`
        }
      />
      {data.invitation && (
        <section className="guest-card">
          <h2>Potwierdź obecność</h2>
          <p>{data.invitation.label}</p>
          {data.deadline && (
            <p>
              Termin odpowiedzi:{" "}
              {new Date(data.deadline).toLocaleString("pl-PL", {
                timeZone: "Europe/Warsaw",
              })}{" "}
              (Europe/Warsaw)
            </p>
          )}
          {data.closed && (
            <p>
              Termin odpowiedzi minął. W sprawie zmian skontaktuj się z
              organizatorem.
            </p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const values = data.invitation!.guests.flatMap((g) =>
                data.config!.events.flatMap((event) => {
                  const value = answers[`${g.id}:${event.id}`];
                  return value === "true" || value === "false"
                    ? [
                        {
                          guestId: g.id,
                          eventId: event.id,
                          attending: value === "true",
                        },
                      ]
                    : [];
                }),
              );
              void action("rsvp", {
                revision: data.invitation!.revision,
                note,
                answers: values,
              });
            }}
          >
            {!data.config!.events.length && (
              <p>
                Organizator nie dodał jeszcze wydarzeń wymagających
                potwierdzenia obecności.
              </p>
            )}
            {!!data.config!.events.length &&
              data.invitation.guests.map((g) => (
                <fieldset key={g.id} disabled={busy || data.closed}>
                  <legend>{g.name}</legend>
                  {data.config!.events.map((event) => (
                    <label key={event.id}>
                      {event.title}
                      <select
                        value={answers[`${g.id}:${event.id}`] || ""}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [`${g.id}:${event.id}`]: e.target.value,
                          })
                        }
                      >
                        <option value="" disabled>
                          Brak odpowiedzi
                        </option>
                        <option value="true">Będę</option>
                        <option value="false">Nie będę</option>
                      </select>
                    </label>
                  ))}
                </fieldset>
              ))}
            <label>
              Uwagi
              <textarea
                maxLength={2000}
                value={note}
                disabled={busy || data.closed}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button disabled={busy || data.closed}>Zapisz odpowiedzi</button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void reload().catch((e) => setMessage(e.message));
              }}
            >
              Odśwież odpowiedzi
            </button>
          </form>
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </>
  );
}
