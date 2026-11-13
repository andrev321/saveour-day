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
  rsvpEnabled?: boolean;
  allowSelfRegistration?: boolean;
  canResetLookup?: boolean;
  locale?: InvitationLocale;
  requiresLink?: boolean;
  config?: GuestContent;
  deadline?: string | null;
  closed?: boolean;
  questions?: QuestionSettings;
  invitation?: {
    label: string;
    guests: { id: string; name: string }[];
    allowPlusOne?: boolean;
    plusOne?: { id: string; name: string } | null;
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
  const [code, setCode] = useState("");
  const [lookupQuery, setLookupQuery] = useState(""),
    [lookupDisambiguator, setLookupDisambiguator] = useState(""),
    [lookupUnlockCode, setLookupUnlockCode] = useState(""),
    [lookupState, setLookupState] = useState<
      "idle" | "not_found" | "ambiguous" | "locked"
    >("idle");
  const [selfRegOpen, setSelfRegOpen] = useState(false),
    [selfRegName, setSelfRegName] = useState(""),
    [selfRegAnswers, setSelfRegAnswers] = useState<Record<string, string>>({}),
    [selfRegNote, setSelfRegNote] = useState("");
  const [note, setNote] = useState(""),
    [plusOne, setPlusOne] = useState<{ id: string; name: string } | null>(null),
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
    setPlusOne(next.invitation?.plusOne ?? null);
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
          setCode("");
          await reload();
        }
        throw new Error(result.error);
      }
      if (action === "lookup") {
        if (result.status === "matched") {
          setLookupState("idle");
          setLookupDisambiguator("");
          setLookupUnlockCode("");
          setSelfRegOpen(false);
          await reload();
        } else {
          setLookupState(result.status);
        }
      } else if (action === "lookup-reset") {
        setLookupState("idle");
        setLookupQuery("");
        setLookupDisambiguator("");
        setLookupUnlockCode("");
        await reload();
      } else {
        await reload();
        if (action === "rsvp" || action === "self-register") {
          setSelfRegOpen(false);
          setSuccess(true);
        }
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
    JSON.stringify(plusOne) !==
      JSON.stringify(data?.invitation?.plusOne ?? null) ||
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
  const formGuests = [
    ...(data.invitation?.guests || []),
    ...(plusOne ? [plusOne] : []),
  ];
  const missing =
    formGuests.reduce(
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
    formGuests.map((g) => [
      g.id,
      Object.fromEntries(
        Object.entries(details[g.id] || {}).filter(
          ([key]) => questions[key as keyof QuestionSettings],
        ),
      ),
    ]),
  );
  function removePlusOne() {
    if (!plusOne) return;
    const removedId = plusOne.id;
    setPlusOne(null);
    setAnswers((old) =>
      Object.fromEntries(
        Object.entries(old).filter(([key]) => !key.startsWith(`${removedId}:`)),
      ),
    );
    setDetails((old) => {
      const next = { ...old };
      delete next[removedId];
      return next;
    });
    setSuccess(false);
  }
  function renderGuestDetails(guestId: string) {
    return (
      <>
        {questions.diet && (
          <label>
            {copy.diet}
            <input
              maxLength={300}
              value={details[guestId]?.diet || ""}
              onChange={(e) => {
                const value = e.target.value;
                setDetails((old) => ({
                  ...old,
                  [guestId]: { ...old[guestId], diet: value },
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
                value={detailValue(guestId, key)}
                onChange={(e) => {
                  const value = e.target.value;
                  setDetails((old) => ({
                    ...old,
                    [guestId]: {
                      ...old[guestId],
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
      </>
    );
  }
  const rsvpEnabled = data.rsvpEnabled !== false;
  const showRsvpAction =
    rsvpEnabled && (Boolean(data.invitation) || kind === "s");
  return (
    <div ref={viewMotion} lang={locale.slice(0, 2)} style={styles}>
      {(showRsvpAction || data.config?.events.some((e) => e.date)) && (
        <S.GuestActions aria-label={copy.invitation}>
          {showRsvpAction && <a href="#rsvp">{copy.rsvp}</a>}
          {data.config?.events.some((e) => e.date) && (
            <a href={`${endpoint}/calendar`} download="invitation.ics">
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
        {rsvpEnabled && !data.invitation && kind === "s" && (
          <div id="rsvp">
            <h2>{copy.findInvitation}</h2>
            {!selfRegOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const nextQuery =
                    lookupState === "locked" && lookupUnlockCode.trim()
                      ? lookupUnlockCode
                      : lookupQuery;
                  void action("lookup", {
                    query: nextQuery,
                    disambiguator:
                      lookupState === "ambiguous" && lookupDisambiguator.trim()
                        ? lookupDisambiguator
                        : undefined,
                  });
                }}
              >
                <label>
                  {copy.lookupLabel}
                  <input
                    value={lookupQuery}
                    onChange={(e) => {
                      setLookupQuery(e.target.value);
                      setLookupState("idle");
                      setLookupDisambiguator("");
                    }}
                    required
                    maxLength={200}
                  />
                </label>

                {lookupState === "ambiguous" && (
                  <>
                    <p role="status">{copy.lookupAmbiguous}</p>
                    <label>
                      {copy.lookupDisambiguator}
                      <input
                        value={lookupDisambiguator}
                        onChange={(e) => setLookupDisambiguator(e.target.value)}
                        required
                        maxLength={200}
                      />
                    </label>
                  </>
                )}

                {lookupState === "locked" && (
                  <>
                    <p role="status">{copy.lookupLocked}</p>
                    <label>
                      {copy.lookupUnlockCode}
                      <input
                        value={lookupUnlockCode}
                        onChange={(e) => setLookupUnlockCode(e.target.value)}
                        required
                        maxLength={24}
                      />
                    </label>
                  </>
                )}

                {lookupState === "not_found" && (
                  <p role="status">{copy.lookupNotFound}</p>
                )}

                <button disabled={busy} aria-busy={busy || undefined}>
                  <BusyLabel
                    busy={operation === "lookup"}
                    label={loadingText(language, "verify")}
                  >
                    {lookupState === "locked"
                      ? copy.lookupUnlockAction
                      : lookupState === "ambiguous"
                        ? copy.lookupConfirm
                        : copy.lookupAction}
                  </BusyLabel>
                </button>
              </form>
            )}

            {data.allowSelfRegistration && !selfRegOpen && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSelfRegOpen(true);
                  setSelfRegName(lookupQuery);
                }}
              >
                {copy.selfRegisterOpen}
              </button>
            )}

            {data.allowSelfRegistration && selfRegOpen && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fakeGuestId = "00000000-0000-4000-8000-000000000000";
                  void action("self-register", {
                    name: selfRegName,
                    rsvp: {
                      revision: 0,
                      note: selfRegNote,
                      answers: (data.config?.events || [])
                        .filter((ev) => selfRegAnswers[ev.id] !== undefined)
                        .map((ev) => ({
                          guestId: fakeGuestId,
                          eventId: ev.id,
                          attending: selfRegAnswers[ev.id] === "true",
                        })),
                    },
                  });
                }}
              >
                <label>
                  {copy.selfRegisterName}
                  <input
                    value={selfRegName}
                    onChange={(e) => setSelfRegName(e.target.value)}
                    required
                    maxLength={200}
                  />
                </label>
                {data.config?.events.map((ev) => (
                  <fieldset key={ev.id}>
                    <legend>{ev.title}</legend>
                    <label>
                      <input
                        type="radio"
                        name={`self-${ev.id}`}
                        checked={selfRegAnswers[ev.id] === "true"}
                        onChange={() =>
                          setSelfRegAnswers((old) => ({
                            ...old,
                            [ev.id]: "true",
                          }))
                        }
                      />{" "}
                      {copy.yes}
                    </label>
                    <label>
                      <input
                        type="radio"
                        name={`self-${ev.id}`}
                        checked={selfRegAnswers[ev.id] === "false"}
                        onChange={() =>
                          setSelfRegAnswers((old) => ({
                            ...old,
                            [ev.id]: "false",
                          }))
                        }
                      />{" "}
                      {copy.no}
                    </label>
                  </fieldset>
                ))}
                <label>
                  {copy.notes}
                  <textarea
                    maxLength={2000}
                    value={selfRegNote}
                    onChange={(e) => setSelfRegNote(e.target.value)}
                  />
                </label>
                <button disabled={busy} aria-busy={busy || undefined}>
                  <BusyLabel
                    busy={operation === "self-register"}
                    label={loadingText(language, "save")}
                  >
                    {copy.selfRegisterSubmit}
                  </BusyLabel>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelfRegOpen(false)}
                >
                  {copy.cancel}
                </button>
              </form>
            )}
            {error && <p role="alert">{guestError(error, copy)}</p>}
          </div>
        )}
        {rsvpEnabled && data.invitation && (
          <div id="rsvp">
            <h2>{copy.rsvp}</h2>
            <p>
              {data.invitation.label}{" "}
              {data.canResetLookup && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action("lookup-reset", {})}
                >
                  {copy.lookupChange}
                </button>
              )}
            </p>
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
              <S.ResponseSummary role="status" data-testid="saved-summary">
                <h3>{copy.saved}</h3>
                <p>{copy.summary}</p>
                {[
                  ...data.invitation.guests,
                  ...(data.invitation.plusOne ? [data.invitation.plusOne] : []),
                ].map((g) => (
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
                const values = formGuests.flatMap((g) =>
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
                  plusOne: plusOne
                    ? { id: plusOne.id, name: plusOne.name.trim() }
                    : null,
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
                    {renderGuestDetails(g.id)}
                  </fieldset>
                ))}
              {!!data.config!.events.length &&
                data.invitation.allowPlusOne &&
                (plusOne ? (
                  <fieldset key={plusOne.id} disabled={busy || data.closed}>
                    <legend>{plusOne.name.trim() || copy.plusOne}</legend>
                    <label>
                      {copy.plusOneName}
                      <input
                        type="text"
                        required
                        maxLength={200}
                        value={plusOne.name}
                        onChange={(e) => {
                          const name = e.target.value;
                          setPlusOne((old) => (old ? { ...old, name } : null));
                          setSuccess(false);
                        }}
                      />
                    </label>
                    {data.config!.events.map((event) => (
                      <label key={event.id}>
                        {event.title}
                        <select
                          value={answers[`${plusOne.id}:${event.id}`] || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            setAnswers((old) => ({
                              ...old,
                              [`${plusOne.id}:${event.id}`]: value,
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
                    {renderGuestDetails(plusOne.id)}
                    <button
                      type="button"
                      disabled={busy || data.closed}
                      onClick={removePlusOne}
                    >
                      {copy.removePlusOne}
                    </button>
                  </fieldset>
                ) : (
                  <button
                    type="button"
                    disabled={busy || data.closed}
                    onClick={() => {
                      setPlusOne({ id: crypto.randomUUID(), name: "" });
                      setSuccess(false);
                    }}
                  >
                    {copy.addPlusOne}
                  </button>
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
