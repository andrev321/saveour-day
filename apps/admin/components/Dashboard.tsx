"use client";
import { ActionButton } from "./ActionButton";
import { LoadingState, useOperation } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
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
  ArrowRightIcon,
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
  const [notice, setNotice] = useState("");
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
      setNotice(copy.removed);
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
            <Button onClick={dismissConfirmation}>
              {t("emailConfirmedContinue")}
            </Button>
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
            <Group justify="flex-end">
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
            </Group>
          </Stack>
        </Modal>
        <S.Header>
          <BrandLogo animated height={44} />
          <Group gap="sm">
            <PanelPreferences />
            {logged && (
              <ActionButton
                variant="subtle"
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
          </Group>
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
                    <S.ProjectCard key={key}>
                      <Skeleton height={64} width={56} radius="lg" />
                      <Skeleton height={24} mt="xl" />
                      <Skeleton height={16} width="60%" mt="md" />
                      <Skeleton height={40} mt="xl" />
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
                <Text
                  size="xs"
                  fw={700}
                  c="brand"
                  style={{ letterSpacing: ".15em" }}
                >
                  {copy.eyebrow}
                </Text>
                <Title>{copy.loginIntro}</Title>
                <Text size="lg" c="dimmed">
                  {copy.loginHelp}
                </Text>
              </Stack>
              <Card withBorder radius="xl" p="xl">
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
              </Card>
            </S.Login>
          )}
          {logged && (
            <>
              <S.Hero>
                <Stack gap="md">
                  <Group>
                    <Text
                      size="xs"
                      fw={700}
                      c="brand"
                      style={{ letterSpacing: ".15em" }}
                    >
                      {copy.eyebrow}
                    </Text>
                    {admin && <Badge variant="light">{t("admin")}</Badge>}
                  </Group>
                  <Title>{t("dashboard")}</Title>
                  <Text size="lg" fw={500}>
                    {copy.intro}
                  </Text>
                  <Text c="dimmed" maw={580}>
                    {copy.description}
                  </Text>
                </Stack>
                <S.Stats>
                  <div>
                    <strong>{sites.length}</strong>
                    <Text size="sm">{copy.projects}</Text>
                  </div>
                  <div>
                    <strong>
                      {sites.filter((site) => site.published_release_id).length}
                    </strong>
                    <Text size="sm">{copy.published}</Text>
                  </div>
                </S.Stats>
              </S.Hero>
              <Group justify="space-between" mb="xl" gap="md">
                <TextInput
                  aria-label={copy.search}
                  placeholder={copy.searchPlaceholder}
                  leftSection={<MagnifyingGlassIcon size={18} />}
                  value={query}
                  onChange={(e) => setQuery(e.currentTarget.value)}
                  style={{ flex: "1 1 240px", maxWidth: 400 }}
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
              {notice && (
                <Alert
                  mb="lg"
                  color="teal"
                  role="status"
                  withCloseButton
                  onClose={() => setNotice("")}
                >
                  {notice}
                </Alert>
              )}
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                {visible.map((site) => (
                  <S.ProjectCard key={site.id} component="article">
                    <Stack gap="lg" h="100%">
                      <Group justify="space-between">
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
                      <div>
                        <Title order={2} size="h3" mb="xs">
                          {site.name}
                        </Title>
                        {site.created_at && (
                          <Text size="xs" c="dimmed">
                            {copy.created}{" "}
                            {new Intl.DateTimeFormat(language, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(site.created_at))}
                          </Text>
                        )}
                      </div>
                      <Group justify="space-between" mt="auto" wrap="nowrap">
                        <Button
                          component="a"
                          href={`/sites/${site.id}`}
                          variant="light"
                          rightSection={<ArrowRightIcon size={17} />}
                        >
                          {t("edit")}
                        </Button>
                        {site.canDelete && (
                          <Tooltip label={copy.remove}>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              size="lg"
                              aria-label={`${copy.remove} ${site.name}`}
                              onClick={() => {
                                setDeleting(site);
                                setDeleteError("");
                              }}
                            >
                              <TrashIcon size={20} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Stack>
                  </S.ProjectCard>
                ))}
              </SimpleGrid>
              {!visible.length && (
                <S.Empty>
                  <EnvelopeSimpleIcon size={48} weight="duotone" />
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
