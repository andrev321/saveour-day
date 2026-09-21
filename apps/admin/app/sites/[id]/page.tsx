"use client";
import { use, useEffect, useState } from "react";
import { Alert, Container, Loader } from "@mantine/core";
import { Editor, type EditorData } from "../../../components/Editor";
import { apiFetch } from "../../../components/Dashboard";
export default function SitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<EditorData | null>(null),
    [admin, setAdmin] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    Promise.all([
      apiFetch<EditorData>(`/api/sites/${id}`),
      apiFetch<{ admin: boolean }>("/api/sites"),
    ])
      .then(([result, user]) => {
        if (alive) {
          setData(result);
          setAdmin(user.admin);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  return error ? (
    <Container py="xl">
      <Alert color="red">{error}</Alert>
    </Container>
  ) : data ? (
    <Editor initial={data} admin={admin} />
  ) : (
    <Container py="xl">
      <Loader aria-label="Ładowanie realizacji" />
    </Container>
  );
}
