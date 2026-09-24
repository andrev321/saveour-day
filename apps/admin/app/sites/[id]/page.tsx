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
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    apiFetch<EditorData>(`/api/sites/${id}`)
      .then((result) => {
        if (alive) {
          setData(result);
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
    <Editor initial={data} />
  ) : (
    <Container py="xl">
      <Loader aria-label="Ładowanie realizacji" />
    </Container>
  );
}
