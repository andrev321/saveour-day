"use client";
import { ActionButton } from "./ActionButton";
import { LoadingState, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { toast } from "@invitations/ui/toast";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  PasswordInput,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { ModalStickyFooter } from "./modal-layout.styles";

function GoogleIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
import {
  ArrowUpRightIcon,
  EnvelopeSimpleIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { browserDb } from "../lib/browser";
import { usePanelI18n } from "../lib/i18n";
import { dashboardUi } from "../lib/dashboard-i18n";
import { PanelPreferences } from "./PanelPreferences";
import { ProjectStart } from "./ProjectStart";
import { BrandLogo } from "@invitations/ui/brand";
import * as S from "./dashboard.styles";

type Site = {
  id: string;
  name: string;
  public_slug?: string;
  published_release_id?: string | null;
  created_at?: string;
  canDelete?: boolean;
};
type SitesResponse = { sites: Site[]; admin: boolean };
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal:
      !init?.method || init.method === "GET"
        ? AbortSignal.any([
            ...(init?.signal ? [init.signal] : []),
            AbortSignal.timeout(30000),
          ])
        : init.signal,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : {};
  if (!response.ok)
    throw new ApiError(
      response.status,
      (result.error || "The operation could not be completed") +
        (response.status >= 500 && response.headers.get("x-request-id")
          ? ` [${response.headers.get("x-request-id")}]`
          : ""),
    );
  return result as T;
}
export function Dashboard({
  configured,
  emailConfirmed = false,
  authError,
}: {
  configured: boolean;
  emailConfirmed?: boolean;
  authError?: string;
}) {
  const { t, language } = usePanelI18n();
  const copy = dashboardUi[language];
  const [confirmationOpen, setConfirmationOpen] = useState(emailConfirmed);
  const [sites, setSites] = useState<Site[]>([]);
  const [admin, setAdmin] = useState(false);
  const [status, setStatus] = useState<
    "loading" | "anonymous" | "ready" | "error"
  >(configured ? "loading" : "anonymous");
  const [reload, setReload] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(() => {
    if (!authError) return "";
    if (authError === "access_denied") return copy.oauthCancelled;
    if (authError === "expired") return copy.linkExpired;
    return copy.oauthError;
  });
  const [messageKind, setMessageKind] = useState<
    "error" | "success" | "warning"
  >("error");
  const pendingEmails = useRef(new Set<string>());
  const { operation, busy, start, end } = useOperation();
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<Site | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const logged = status === "ready";
  useEffect(() => {
    if (!authError) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState(window.history.state, "", url);
  }, [authError]);
  useEffect(() => {
    if (!configured) return;
    const controller = new AbortController();
    apiFetch<SitesResponse>("/api/sites", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setSites(data.sites);
          setAdmin(data.admin);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setStatus(
            error instanceof ApiError && error.status === 401
              ? "anonymous"
              : "error",
          );
      });
    return () => controller.abort();
  }, [configured, reload]);
  function dismissConfirmation() {
    setConfirmationOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("emailConfirmed");
    window.history.replaceState(window.history.state, "", url);
  }
  async function login() {
    if (!start("login")) return;
    setMessage("");
    setMessageKind("error");
    const emailKey = email.trim().toLowerCase();
    try {
      const { error } = await browserDb().auth.signInWithPassword({
        email,
        password,
      });
      if (error?.code === "email_not_confirmed") {
        pendingEmails.current.add(emailKey);
        setMessageKind("warning");
        setMessage(copy.signupPending);
        return;
      }
      if (error) throw new Error(t("invalidLogin"));
      pendingEmails.current.delete(emailKey);
      setStatus("loading");
      setReload((value) => value + 1);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      end();
    }
  }
  async function remove() {
    if (!deleting || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await apiFetch(`/api/sites/${deleting.id}`, { method: "DELETE" });
      setSites((current) => current.filter((site) => site.id !== deleting.id));
      setDeleting(null);
      toast.success(copy.removed);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : copy.deleteError);
    } finally {
      setDeleteBusy(false);
    }
  }
  const visible = sites.filter((site) =>
    site.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <S.Page>
      <S.Content size="xl">
        <Modal
          opened={confirmationOpen}
          onClose={dismissConfirmation}
          title={t("emailConfirmedTitle")}
          centered
        >
          <Stack>
            <Text>{t("emailConfirmedBody")}</Text>
            <ModalStickyFooter justify="flex-end">
              <Button onClick={dismissConfirmation}>
                {t("emailConfirmedContinue")}
              </Button>
            </ModalStickyFooter>
          </Stack>
        </Modal>
        <Modal
          opened={!!deleting}
          onClose={() => !deleteBusy && setDeleting(null)}
          title={copy.deleteTitle}
          centered
          closeOnEscape={!deleteBusy}
          closeOnClickOutside={!deleteBusy}
          withCloseButton={!deleteBusy}
        >
          <Stack>
            <Text fw={600} style={{ overflowWrap: "anywhere" }}>
              {deleting?.name}
            </Text>
            <Text>{copy.deleteBody}</Text>
            <Text size="sm" c="dimmed">
              {copy.retention}
            </Text>
            {deleteError && (
              <Alert color="red" role="alert">
                {deleteError}
              </Alert>
            )}
            <ModalStickyFooter justify="flex-end">
              <Button
                variant="default"
                disabled={deleteBusy}
                onClick={() => setDeleting(null)}
              >
                {copy.cancel}
              </Button>
              <ActionButton
                color="red"
                loading={deleteBusy}
                pendingLabel={loadingText(language, "remove")}
                onClick={() => void remove()}
              >
                {copy.confirm}
              </ActionButton>
            </ModalStickyFooter>
          </Stack>
        </Modal>
        <S.Header>
          <BrandLogo animated height={38} />
          <S.HeaderActions>
            <PanelPreferences compact />
            {logged && (
              <ActionButton
                variant="default"
                size="sm"
                loading={operation === "logout"}
                pendingLabel={loadingText(language, "logout")}
                disabled={busy}
                onClick={async () => {
                  if (!start("logout")) return;
                  setMessage("");
                  setMessageKind("error");
                  try {
                    const { error } = await browserDb().auth.signOut();
                    if (error) throw error;
                    setSites([]);
                    setStatus("anonymous");
                  } catch (error) {
                    setMessage((error as Error).message);
                  } finally {
                    end();
                  }
                }}
              >
                {t("logout")}
              </ActionButton>
            )}
          </S.HeaderActions>
        </S.Header>
        <main aria-busy={status === "loading"}>
          {!configured && (
            <Alert mt="xl" title={t("setup")}>
              {t("setupDescription")}
              <br />
              <Button component="a" href="/demo" mt="md">
                {t("demo")}
              </Button>
            </Alert>
          )}
          {message && (
            <Alert
              mt="lg"
              color={
                { error: "red", success: "green", warning: "yellow" }[
                  messageKind
                ]
              }
              role={messageKind === "success" ? "status" : "alert"}
            >
              {message}
            </Alert>
          )}
          {status === "loading" && (
            <Stack mt={36} gap="xl">
              <LoadingState
                compact
                label={copy.loading}
                slowLabel={loadingText(language, "slow")}
              />
              <div aria-hidden="true">
                <Skeleton height={40} width="65%" mb="md" />
                <Skeleton height={18} width="85%" />
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} mt={40}>
                  {[0, 1, 2].map((key) => (
                    <S.ProjectCard
                      key={key}
                      data-status="loading"
                      style={
                        { "--card-delay": `${key * 40}ms` } as CSSProperties
                      }
                    >
                      <Skeleton height={48} width={48} radius="md" />
                      <Skeleton height={22} mt="lg" />
                      <Skeleton height={14} width="55%" mt="md" />
                    </S.ProjectCard>
                  ))}
                </SimpleGrid>
              </div>
            </Stack>
          )}
          {status === "error" && (
            <Alert mt={40} color="red" role="alert" title={copy.loadError}>
              <Text size="sm" mb="md">
                {copy.loadHelp}
              </Text>
              <Button
                onClick={() => {
                  setStatus("loading");
                  setReload((value) => value + 1);
                }}
              >
                {copy.retry}
              </Button>
            </Alert>
          )}
          {configured && status === "anonymous" && (
            <S.Login>
              <Stack gap="lg">
                <Title>{copy.loginIntro}</Title>
                <Text size="lg" c="dimmed">
                  {copy.loginHelp}
                </Text>
              </Stack>
              <S.LoginCardWrap>
                <S.LoginCard radius="xl" p="xl">
                  <Stack>
                    <Title order={2}>{t("login")}</Title>
                    <ActionButton
                      variant="default"
                      fullWidth
                      size="md"
                      leftSection={<GoogleIcon />}
                      loading={operation === "google"}
                      disabled={busy}
                      pendingLabel={loadingText(language, "login")}
                      onClick={async () => {
                        if (!start("google")) return;
                        setMessage("");
                        setMessageKind("error");
                        try {
                          const { error } =
                            await browserDb().auth.signInWithOAuth({
                              provider: "google",
                              options: {
                                redirectTo: `${window.location.origin}/auth/confirm`,
                              },
                            });
                          if (error) throw error;
                        } catch (error) {
                          setMessage((error as Error).message);
                          end();
                        }
                      }}
                    >
                      {copy.continueWithGoogle}
                    </ActionButton>
                    <Divider
                      label={copy.orEmail}
                      labelPosition="center"
                      my="xs"
                    />
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void login();
                      }}
                    >
                      <Stack>
                        <TextInput
                          label={t("email")}
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.currentTarget.value)}
                        />
                        <PasswordInput
                          aria-label={t("password")}
                          label={t("password")}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.currentTarget.value)}
                        />
                        <ActionButton
                          type="submit"
                          loading={operation === "login"}
                          disabled={busy}
                          pendingLabel={loadingText(language, "login")}
                        >
                          {t("login")}
                        </ActionButton>
                        <ActionButton
                          variant="light"
                          loading={operation === "signup"}
                          pendingLabel={loadingText(language, "signup")}
                          disabled={busy || !email || password.length < 12}
                          onClick={async () => {
                            if (!start("signup")) return;
                            setMessage("");
                            setMessageKind("error");
                            const emailKey = email.trim().toLowerCase();
                            try {
                              if (pendingEmails.current.has(emailKey)) {
                                setMessageKind("warning");
                                setMessage(copy.signupPending);
                                return;
                              }
                              const { data, error } =
                                await browserDb().auth.signUp({
                                  email,
                                  password,
                                  options: {
                                    emailRedirectTo:
                                      location.origin + "/auth/confirm",
                                  },
                                });
                              if (error) throw error;
                              if (data.user?.identities?.length === 0) {
                                setMessageKind("warning");
                                setMessage(copy.signupCheckEmail);
                                return;
                              }
                              pendingEmails.current.add(emailKey);
                              setMessageKind("success");
                              setMessage(copy.signupSent);
                            } catch (error) {
                              setMessage((error as Error).message);
                            } finally {
                              end();
                            }
                          }}
                        >
                          {copy.signup}
                        </ActionButton>
                        <Text size="sm" c="dimmed">
                          {copy.passwordHelp}
                        </Text>
                        <ActionButton
                          variant="subtle"
                          loading={operation === "reset"}
                          pendingLabel={loadingText(language, "reset")}
                          disabled={busy || !email}
                          onClick={async () => {
                            if (!start("reset")) return;
                            setMessage("");
                            setMessageKind("error");
                            try {
                              const { error } =
                                await browserDb().auth.resetPasswordForEmail(
                                  email,
                                  { redirectTo: `${location.origin}/account` },
                                );
                              if (error) throw error;
                              setMessageKind("success");
                              setMessage(t("resetSent"));
                            } catch (error) {
                              setMessage((error as Error).message);
                            } finally {
                              end();
                            }
                          }}
                        >
                          {t("forgot")}
                        </ActionButton>
                      </Stack>
                    </form>
                  </Stack>
                </S.LoginCard>
              </S.LoginCardWrap>
            </S.Login>
          )}
          {logged && (
            <>
              <S.Hero>
                <Stack gap={4}>
                  {admin && (
                    <Badge variant="light" w="fit-content">
                      {t("admin")}
                    </Badge>
                  )}
                  <Title>{t("dashboard")}</Title>
                  <Text size="sm" c="dimmed">
                    {copy.intro}
                  </Text>
                </Stack>
                <S.Stats>
                  <div>
                    <strong>{sites.length}</strong>
                    <Text size="xs" c="dimmed">
                      {copy.projects}
                    </Text>
                  </div>
                  <div>
                    <strong>
                      {sites.filter((site) => site.published_release_id).length}
                    </strong>
                    <Text size="xs" c="dimmed" component="div">
                      <S.StatLabel>
                        <S.LiveDot aria-hidden="true" />
                        {copy.published}
                      </S.StatLabel>
                    </Text>
                  </div>
                </S.Stats>
              </S.Hero>
              <Group justify="space-between" align="center" mb="xl" gap="sm">
                <TextInput
                  aria-label={copy.search}
                  placeholder={copy.searchPlaceholder}
                  leftSection={<MagnifyingGlassIcon size={18} />}
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  style={{ flex: "1 1 240px", maxWidth: 360 }}
                />
                <ProjectStart
                  onCreate={async (values) => {
                    const site = await apiFetch<Site>("/api/sites", {
                      method: "POST",
                      body: JSON.stringify(values),
                    });
                    window.location.href = `/sites/${site.id}`;
                  }}
                />
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {visible.map((site, index) => (
                  <S.ProjectCard
                    key={site.id}
                    component="article"
                    data-status={site.published_release_id ? "live" : "draft"}
                    style={
                      {
                        "--card-delay": `${Math.min(index, 8) * 40}ms`,
                      } as CSSProperties
                    }
                  >
                    <Stack gap="md" h="100%">
                      <Group justify="space-between" align="flex-start">
                        <S.Monogram aria-hidden="true">
                          {site.name
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((word) => word[0])
                            .join("")
                            .toUpperCase()}
                        </S.Monogram>
                        <Badge
                          variant="light"
                          color={site.published_release_id ? "teal" : "gray"}
                        >
                          {site.published_release_id ? copy.live : copy.draft}
                        </Badge>
                      </Group>
                      <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                        gap="xs"
                      >
                        <Title order={2} size="h4">
                          <S.CardLink href={`/sites/${site.id}`}>
                            {site.name}
                          </S.CardLink>
                        </Title>
                        <S.CardOpenCue aria-hidden="true">
                          <ArrowUpRightIcon size={18} />
                        </S.CardOpenCue>
                      </Group>
                      <Group
                        justify="space-between"
                        align="center"
                        mt="auto"
                        mih={28}
                        wrap="nowrap"
                        gap="xs"
                      >
                        {site.created_at ? (
                          <Text size="xs" c="dimmed">
                            {copy.created}{" "}
                            {new Intl.DateTimeFormat(language, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(site.created_at))}
                          </Text>
                        ) : (
                          <span />
                        )}
                        {site.canDelete && (
                          <S.CardAction>
                            <Tooltip label={copy.remove}>
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                size="md"
                                aria-label={`${copy.remove} ${site.name}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleting(site);
                                  setDeleteError("");
                                }}
                              >
                                <TrashIcon size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </S.CardAction>
                        )}
                      </Group>
                    </Stack>
                  </S.ProjectCard>
                ))}
              </SimpleGrid>
              {!visible.length && (
                <S.Empty>
                  <S.EmptyBadge aria-hidden="true">
                    <EnvelopeSimpleIcon size={32} weight="duotone" />
                  </S.EmptyBadge>
                  <Title order={2} size="h3" mb="sm">
                    {sites.length ? copy.noMatches : copy.empty}
                  </Title>
                  <Text c="dimmed" maw={480} mx="auto">
                    {sites.length ? copy.noMatchesHelp : copy.emptyHelp}
                  </Text>
                  {query && (
                    <Button
                      variant="subtle"
                      mt="md"
                      onClick={() => setQuery("")}
                    >
                      {copy.clear}
                    </Button>
                  )}
                </S.Empty>
              )}
            </>
          )}
        </main>
        <Group justify="center" gap="lg" mt={48} pb="md" component="footer">
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} saveour.day
          </Text>
          <Anchor href="/privacy" size="xs" c="dimmed">
            {copy.privacyPolicy}
          </Anchor>
          <Anchor href="/terms" size="xs" c="dimmed">
            {copy.termsOfService}
          </Anchor>
        </Group>
      </S.Content>
    </S.Page>
  );
}
