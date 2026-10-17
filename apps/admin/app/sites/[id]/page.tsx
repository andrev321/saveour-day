"use client";
import { use, useEffect, useState } from "react";
import { Alert, Button, Container, Group } from "@mantine/core";
import { Editor, type EditorData } from "../../../components/Editor";
import { EditorLoading } from "../../../components/EditorLoading";
import { apiFetch } from "../../../components/Dashboard";
import { usePanelI18n } from "../../../lib/i18n";
import { loadingText } from "@invitations/ui/loading-copy";
export default function SitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <SiteContent key={id} id={id} />;
}
function SiteContent({ id }: { id: string }) {
  const { language } = usePanelI18n();
  const [data, setData] = useState<EditorData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch<EditorData>(`/api/sites/${id}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, attempt]);
  if (error)
    return (
      <Container py="xl">
        <Alert color="red" role="alert">
          {error}
        </Alert>
        <Group mt="md">
          <Button
            onClick={() => {
              setError("");
              setAttempt((n) => n + 1);
            }}
          >
            {loadingText(language, "retry")}
          </Button>
          <Button component="a" href="/" variant="light">
            {loadingText(language, "backToProjects")}
          </Button>
        </Group>
      </Container>
    );
  return data ? <Editor initial={data} /> : <EditorLoading />;
}
