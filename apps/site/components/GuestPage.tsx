"use client";
import { useViewMotion } from "@invitations/ui/motion";
import { LoadingState, BusyLabel, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import * as S from "./styles";
import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Invitation } from "@invitations/renderer";
import type { GuestContent } from "@invitations/domain/guest";
import {
  guestDisplayName,
  invitationDisplayName,
  type InvitationGuest,
} from "@invitations/domain/invitation";
import {
  formatQuestionValue,
  type QuestionValue,
  type RsvpQuestion,
} from "@invitations/domain/rsvp-questions";
import type { InvitationLocale } from "@invitations/domain";
import { BrandLogo } from "@invitations/ui/brand";
import { guestCopy, guestError } from "../lib/guest-copy";
import { RsvpForm } from "./RsvpForm";

const SELF_REG_NAMED_ID = "00000000-0000-4000-8000-000000000001";
const SELF_REG_COMP_ID = "00000000-0000-4000-8000-000000000002";

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
  questions?: RsvpQuestion[];
  invitation?: {
    groupName: string | null;
    guests: InvitationGuest[];
    revision: number;
    note: string;
    answers: { guest_id: string; event_id: string; attending: boolean }[];
    questionAnswers: {
      questionId: string;
      guestId: string | null;
      value: QuestionValue;
    }[];
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
  const [data, setData] = useState<Reply | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const viewMotion = useViewMotion(
    `${Boolean(data)}:${data?.authorized}:${success}`,
  );
  const { operation, busy, start, end } = useOperation();
  const [code, setCode] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupDisambiguator, setLookupDisambiguator] = useState("");
  const [lookupUnlockCode, setLookupUnlockCode] = useState("");
  const [lookupState, setLookupState] = useState<
    "idle" | "not_found" | "ambiguous" | "locked"
  >("idle");
  const [selfRegOpen, setSelfRegOpen] = useState(false);
  const [selfRegName, setSelfRegName] = useState("");
  const [selfRegWithCompanion, setSelfRegWithCompanion] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [refreshConfirm, setRefreshConfirm] = useState(false);
  const browserLocale = useSyncExternalStore<InvitationLocale>(
    () => () => {},
    () => {
      const language = navigator.language.toLowerCase();
      return language.startsWith("de")
        ? "de-DE"
        : language.startsWith("en")
          ? "en-GB"
          : "pl-PL";
    },
    () => "pl-PL",
  );

  const locale = data?.config?.locale || data?.locale || browserLocale;
  const language = locale.slice(0, 2);
  const copy = guestCopy[locale];

  function accept(next: Reply) {
    setData(next);
    setDirty(false);
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

  async function action(actionName: string, payload: unknown) {
    if (!start(actionName)) return;
    setError("");
    setSuccess(false);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, payload }),
      });
      const result = await r.json();
      if (!r.ok) {
        if (actionName === "rsvp" && [401, 403, 404].includes(r.status)) {
          setData(null);
          setCode("");
          await reload();
        }
        throw new Error(result.error);
      }
      if (actionName === "lookup") {
        if (result.status === "matched") {
          setLookupState("idle");
          setLookupDisambiguator("");
          setLookupUnlockCode("");
          setSelfRegOpen(false);
          await reload();
        } else {
          setLookupState(result.status);
        }
      } else if (actionName === "lookup-reset") {
        setLookupState("idle");
        setLookupQuery("");
        setLookupDisambiguator("");
        setLookupUnlockCode("");
        await reload();
      } else {
        await reload();
        if (actionName === "rsvp" || actionName === "self-register") {
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

  const questions = data.questions || [];
  const theme = data.config?.design;
  const styles = {
    "--guest-paper": theme?.paper,
    "--guest-surface": theme?.surface,
    "--guest-ink": theme?.ink,
    "--guest-accent": theme?.accent,
  } as CSSProperties;

  const rsvpEnabled = data.rsvpEnabled !== false;
  const showRsvpAction =
    rsvpEnabled && (Boolean(data.invitation) || kind === "s");

  const savedAnswers = Object.fromEntries(
    (data.invitation?.answers || []).map((a) => [
      `${a.guest_id}:${a.event_id}`,
      String(a.attending),
    ]),
  );

  const initialCompanionNames = Object.fromEntries(
    (data.invitation?.guests || [])
      .filter((g) => g.kind === "companion" && g.name)
      .map((g) => [g.id, g.name!]),
  );

  const initialQuestionAnswers = Object.fromEntries(
    (data.invitation?.questionAnswers || []).map((qa) => [
      `${qa.questionId}:${qa.guestId ?? ""}`,
      qa.value,
    ]),
  );

  const selfRegGuests: InvitationGuest[] = [
    {
      id: SELF_REG_NAMED_ID,
      kind: "named",
      name: selfRegName.trim() || copy.selfRegisterName,
    },
    ...(selfRegWithCompanion
      ? [{ id: SELF_REG_COMP_ID, kind: "companion" as const, name: null }]
      : []),
  ];

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
              <div>
                <label>
                  {copy.selfRegisterName}
                  <input
                    value={selfRegName}
                    onChange={(e) => setSelfRegName(e.target.value)}
                    required
                    maxLength={200}
                  />
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={selfRegWithCompanion}
                    onChange={(e) => setSelfRegWithCompanion(e.target.checked)}
                  />{" "}
                  {copy.withCompanionCheckbox}
                </label>
                <RsvpForm
                  key={`self-${selfRegWithCompanion}`}
                  guests={selfRegGuests}
                  events={data.config?.events || []}
                  questions={questions}
                  variantId={data.config?.defaultVariant || ""}
                  initialAnswers={{}}
                  initialNote=""
                  busy={busy}
                  saving={operation === "self-register"}
                  closed={Boolean(data.closed)}
                  language={language}
                  copy={copy}
                  submitLabel={copy.selfRegisterSubmit}
                  onSubmit={(payload) => {
                    if (!selfRegName.trim()) {
                      setError("Nieprawidłowe dane");
                      return;
                    }
                    void action("self-register", {
                      name: selfRegName.trim(),
                      withCompanion: selfRegWithCompanion,
                      companionName: selfRegWithCompanion
                        ? (payload.companionNames[SELF_REG_COMP_ID] ?? null)
                        : null,
                      rsvp: {
                        revision: 0,
                        note: payload.note,
                        answers: payload.answers,
                        questionAnswers: payload.questionAnswers,
                      },
                    });
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelfRegOpen(false)}
                >
                  {copy.cancel}
                </button>
              </div>
            )}
            {error && <p role="alert">{guestError(error, copy)}</p>}
          </div>
        )}

        {rsvpEnabled && data.invitation && (
          <div id="rsvp">
            <h2>{copy.rsvp}</h2>
            <p>
              {invitationDisplayName(
                {
                  groupName: data.invitation.groupName,
                  guests: data.invitation.guests,
                },
                { companion: copy.companion, and: copy.and },
              )}{" "}
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
                {data.invitation.guests.map((g) => (
                  <div key={g.id}>
                    <strong>
                      {guestDisplayName(g, { companion: copy.companion })}
                    </strong>
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
                    {questions
                      .filter((q) => q.scope === "guest")
                      .map((q) => {
                        const qa = data.invitation!.questionAnswers.find(
                          (a) => a.questionId === q.id && a.guestId === g.id,
                        );
                        if (!qa) return null;
                        return (
                          <p key={q.id}>
                            {q.label}:{" "}
                            {formatQuestionValue(q, qa.value, copy.otherOption)}
                          </p>
                        );
                      })}
                  </div>
                ))}
                {questions
                  .filter((q) => q.scope === "invitation")
                  .map((q) => {
                    const qa = data.invitation!.questionAnswers.find(
                      (a) => a.questionId === q.id && a.guestId === null,
                    );
                    if (!qa) return null;
                    return (
                      <p key={q.id}>
                        {q.label}:{" "}
                        {formatQuestionValue(q, qa.value, copy.otherOption)}
                      </p>
                    );
                  })}
                {data.invitation.note && (
                  <p>
                    {copy.notes}: {data.invitation.note}
                  </p>
                )}
              </S.ResponseSummary>
            )}

            <RsvpForm
              key={`${data.invitation.revision}-${data.invitation.guests.map((g) => g.id).join(",")}`}
              guests={data.invitation.guests}
              events={data.config?.events || []}
              questions={questions}
              variantId={data.config?.defaultVariant || ""}
              initialAnswers={savedAnswers}
              initialCompanionNames={initialCompanionNames}
              initialQuestionAnswers={initialQuestionAnswers}
              initialNote={data.invitation.note}
              busy={busy}
              saving={operation === "rsvp"}
              closed={Boolean(data.closed)}
              dirty={dirty}
              language={language}
              copy={copy}
              onDirtyChange={() => {
                setDirty(true);
                setSuccess(false);
              }}
              onRefresh={() => {
                if (dirty) setRefreshConfirm(true);
                else void refresh();
              }}
              onSubmit={(payload) => {
                void action("rsvp", {
                  revision: data.invitation!.revision,
                  note: payload.note,
                  answers: payload.answers,
                  companionNames: payload.companionNames,
                  questionAnswers: payload.questionAnswers,
                });
              }}
            />

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
            {error && <p role="alert">{guestError(error, copy)}</p>}
          </div>
        )}
      </Invitation>
    </div>
  );
}
