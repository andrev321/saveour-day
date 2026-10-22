"use client";
import { useViewMotion } from "@invitations/ui/motion";
import { LoadingState, BusyLabel, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import * as S from "./styles";
import { useEffect, useState, type CSSProperties } from "react";
import { Invitation } from "@invitations/renderer";
import type { GuestContent } from "@invitations/domain/guest";
import {
  defaultQuestions,
  type GuestDetails,
  type QuestionSettings,
} from "@invitations/domain/operations";
import type { InvitationLocale } from "@invitations/domain";
import { BrandLogo } from "@invitations/ui/brand";
import { guestCopy, guestError } from "../lib/guest-copy";
type Reply = {
  authorized: boolean;
  mode: string;
  locale?: InvitationLocale;
  requiresLink?: boolean;
  config?: GuestContent;
  deadline?: string | null;
  closed?: boolean;
  questions?: QuestionSettings;
  invitation?: {
    label: string;
    guests: { id: string; name: string }[];
    revision: number;
    note: string;
    details?: GuestDetails;
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
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  const viewMotion = useViewMotion(
    `${Boolean(data)}:${data?.authorized}:${success}`,
  );
  const { operation, busy, start, end } = useOperation();
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [otp, setOtp] = useState(""),
    [sent, setSent] = useState(false),
    [cooldown, setCooldown] = useState(0);
  const [links, setLinks] = useState<{ href: string; label: string }[]>([]);
  const [note, setNote] = useState(""),
    [answers, setAnswers] = useState<Record<string, string>>({}),
    [details, setDetails] = useState<GuestDetails>({}),
    [refreshConfirm, setRefreshConfirm] = useState(false);
  const [browserLocale, setBrowserLocale] = useState<InvitationLocale>("pl-PL");
  useEffect(() => {
    const language = navigator.language.toLowerCase();
    setBrowserLocale(
      language.startsWith("de")
        ? "de-DE"
        : language.startsWith("en")
          ? "en-GB"
          : "pl-PL",
    );
  }, []);
  const locale = data?.config?.locale || data?.locale || browserLocale;
  const language = locale.slice(0, 2);
  const copy = guestCopy[locale];
  function accept(next: Reply) {
    setData(next);
    setNote(next.invitation?.note || "");
    setDetails(next.invitation?.details || {});
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
    fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        accept(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [endpoint]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(
      () => setCooldown((old) => Math.max(0, old - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  async function reload() {
    const r = await fetch(endpoint, { cache: "no-store" });
    const result = await r.json();
    if (!r.ok) {
      if ([401, 403, 404].includes(r.status)) setData(null);
      throw new Error(result.error);
    }
    accept(result);
    setError("");
    setRefreshConfirm(false);
  }
  async function action(action: string, payload: unknown) {
    if (!start(action)) return;
    setError("");
    setSuccess(false);
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
        setCooldown(60);
      } else if (result.links) setLinks(result.links);
      else {
        await reload();
        if (action === "rsvp") setSuccess(true);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      end();
    }
  }
  async function refresh() {
    if (!start("refresh")) return;
    try {
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      end();
    }
  }
  const savedAnswers = Object.fromEntries(
    (data?.invitation?.answers || []).map((a) => [
      `${a.guest_id}:${a.event_id}`,
      String(a.attending),
    ]),
  );
  const dirty =
    note !== (data?.invitation?.note || "") ||
    JSON.stringify(answers) !== JSON.stringify(savedAnswers) ||
    JSON.stringify(details) !== JSON.stringify(data?.invitation?.details || {});
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  if (!data?.authorized)
    return (
      <S.GuestCard ref={viewMotion} lang={locale.slice(0, 2)}>
        <BrandLogo animated height={52} />
        <h1>{copy.invitation}</h1>
        {error && <p role="alert">{guestError(error, copy)}</p>}
        {!data && !error && (
          <LoadingState
            label={copy.loading}
            slowLabel={loadingText(language, "slow")}
          />
        )}
        {!data && error && (
          <button
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => void refresh()}
          >
            <BusyLabel
              busy={operation === "refresh"}
              label={loadingText(language, "refresh")}
            >
              {copy.retry}
            </BusyLabel>
          </button>
        )}
        {links.map((l) => (
          <S.GuestLink key={l.href} href={l.href}>
            {l.label}
          </S.GuestLink>
        ))}
        {data?.requiresLink && <p>{copy.original}</p>}
        {data?.mode === "code" && !data.requiresLink && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void action("code", { code });
            }}
          >
            <label>
              {copy.code}
              <input
                type="password"
                autoComplete="current-password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={128}
              />
            </label>
            <button disabled={busy} aria-busy={busy || undefined}>
              <BusyLabel
                busy={operation === "code"}
                label={loadingText(language, "verify")}
              >
                {copy.open}
              </BusyLabel>
            </button>
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
              {copy.email}
              <input
                type="email"
                autoComplete="email"
                value={email}
                disabled={busy}
                aria-busy={busy || undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                  setOtp("");
                }}
                required
              />
            </label>
            {sent && (
              <>
                <p role="status">{copy.sent}</p>
                <label>
                  {copy.otp}
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    pattern="[0-9]{6,10}"
                    maxLength={10}
                  />
                </label>
              </>
            )}
            <button disabled={busy || (!sent && cooldown > 0)}>
              <BusyLabel
                busy={operation === "otp-send" || operation === "otp-verify"}
                label={loadingText(
                  language,
                  operation === "otp-verify" ? "verify" : "send",
                )}
              >
                {sent ? copy.verify : copy.send}
              </BusyLabel>
            </button>
            {sent && (
              <>
                <button
                  type="button"
                  disabled={busy || cooldown > 0}
                  onClick={() => void action("otp-send", { email })}
                >
                  <BusyLabel
                    busy={operation === "otp-send"}
                    label={loadingText(language, "send")}
                  >
                    {copy.resend}
                  </BusyLabel>
                  {cooldown ? ` (${cooldown}s)` : ""}
                </button>
                <p>{copy.resendHelp}</p>
              </>
            )}
          </form>
        )}
        {data?.mode === "public" && <p>{copy.original}</p>}
      </S.GuestCard>
    );
  const questions = data.questions || defaultQuestions;
  const theme = data.config?.design;
  const styles = {
    "--guest-paper": theme?.paper,
    "--guest-surface": theme?.surface,
    "--guest-ink": theme?.ink,
    "--guest-accent": theme?.accent,
  } as CSSProperties;
  const missing =
    data.invitation?.guests.reduce(
      (sum, g) =>
        sum +
        (data.config?.events.filter((e) => !answers[`${g.id}:${e.id}`])
          .length || 0),
      0,
    ) || 0;
  function detailValue(id: string, key: "lodging" | "transport") {
    const value = details[id]?.[key];
    return value === undefined ? "" : String(value);
  }
  const selectedDetails = Object.fromEntries(
    data.invitation?.guests.map((g) => [
      g.id,
      Object.fromEntries(
        Object.entries(details[g.id] || {}).filter(
          ([key]) => questions[key as keyof QuestionSettings],
        ),
      ),
    ]) || [],
  );
  return (
    <div ref={viewMotion} lang={locale.slice(0, 2)} style={styles}>
      {(data.invitation || data.config?.events.some((e) => e.date)) && (
        <S.GuestActions aria-label={copy.invitation}>
          {data.invitation && <a href="#rsvp">{copy.rsvp}</a>}
          {data.config?.events.some((e) => e.date) && (
            <a href={`${endpoint}/calendar`} download="zaproszenie.ics">
              {copy.calendar}
            </a>
          )}
        </S.GuestActions>
      )}
      <Invitation
        config={data.config!}
        resolveMedia={(src) =>
          `/api/media/${kind}/${encodeURIComponent(accessKey)}/${src.slice("/media/".length)}`
        }
      >
        {data.invitation && (
          <div id="rsvp">
            <h2>{copy.rsvp}</h2>
            <p>{data.invitation.label}</p>
            {data.deadline && (
              <p>
                {copy.deadline}:{" "}
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: "long",
                  timeStyle: "short",
                  timeZone: "Europe/Warsaw",
                }).format(new Date(data.deadline))}{" "}
                ({copy.timezone})
              </p>
            )}
            {data.closed && <p role="status">{copy.closed}</p>}
            {success && (
              <S.ResponseSummary role="status">
                <h3>{copy.saved}</h3>
                <p>{copy.summary}</p>
                {data.invitation.guests.map((g) => (
                  <div key={g.id}>
                    <strong>{g.name}</strong>
                    <ul>
                      {data.config!.events.map((e) => {
                        const value = savedAnswers[`${g.id}:${e.id}`];
                        return (
                          <li key={e.id}>
                            {e.title}:{" "}
                            {value === "true"
                              ? copy.yes
                              : value === "false"
                                ? copy.no
                                : copy.missing}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {data.invitation.note && (
                  <p>
                    {copy.notes}: {data.invitation.note}
                  </p>
                )}
              </S.ResponseSummary>
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
                  ...(Object.values(questions).some(Boolean)
                    ? { details: selectedDetails }
                    : {}),
                });
              }}
            >
              {!data.config!.events.length && <p>{copy.noEvents}</p>}
              {!!data.config!.events.length && (
                <p>
                  {copy.pending}: {missing}
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
                          onChange={(e) => {
                            const value = e.target.value;
                            setAnswers((old) => ({
                              ...old,
                              [`${g.id}:${event.id}`]: value,
                            }));
                            setSuccess(false);
                          }}
                        >
                          <option value="" disabled>
                            {copy.missing}
                          </option>
                          <option value="true">{copy.yes}</option>
                          <option value="false">{copy.no}</option>
                        </select>
                      </label>
                    ))}
                    {questions.diet && (
                      <label>
                        {copy.diet}
                        <input
                          maxLength={300}
                          value={details[g.id]?.diet || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setDetails((old) => ({
                              ...old,
                              [g.id]: { ...old[g.id], diet: value },
                            }));
                          }}
                        />
                      </label>
                    )}
                    {(["lodging", "transport"] as const)
                      .filter((key) => questions[key])
                      .map((key) => (
                        <label key={key}>
                          {copy[key]}
                          <select
                            value={detailValue(g.id, key)}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDetails((old) => ({
                                ...old,
                                [g.id]: {
                                  ...old[g.id],
                                  [key]: value === "true",
                                },
                              }));
                            }}
                          >
                            <option value="" disabled>
                              {copy.choose}
                            </option>
                            <option value="true">{copy.yesShort}</option>
                            <option value="false">{copy.noShort}</option>
                          </select>
                        </label>
                      ))}
                  </fieldset>
                ))}
              {Object.values(questions).some(Boolean) && (
                <p>{copy.privateInfo}</p>
              )}
              <label>
                {copy.notes}
                <textarea
                  maxLength={2000}
                  value={note}
                  disabled={busy || data.closed}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setSuccess(false);
                  }}
                />
              </label>
              <button
                disabled={busy || data.closed || !data.config!.events.length}
              >
                <BusyLabel
                  busy={operation === "rsvp"}
                  label={loadingText(language, "save")}
                >
                  {copy.save}
                </BusyLabel>
              </button>
              <button
                type="button"
                disabled={busy}
                aria-busy={busy || undefined}
                onClick={() =>
                  dirty ? setRefreshConfirm(true) : void refresh()
                }
              >
                <BusyLabel
                  busy={operation === "refresh"}
                  label={loadingText(language, "refresh")}
                >
                  {copy.refresh}
                </BusyLabel>
              </button>
              {refreshConfirm && (
                <div role="alert">
                  <p>{copy.refreshWarning}</p>
                  <button
                    type="button"
                    disabled={busy}
                    aria-busy={busy || undefined}
                    onClick={() => void refresh()}
                  >
                    <BusyLabel
                      busy={operation === "refresh"}
                      label={loadingText(language, "refresh")}
                    >
                      {copy.discard}
                    </BusyLabel>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefreshConfirm(false)}
                  >
                    {copy.cancel}
                  </button>
                </div>
              )}
            </form>
            {error && <p role="alert">{guestError(error, copy)}</p>}
          </div>
        )}
      </Invitation>
    </div>
  );
}
