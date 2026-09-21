"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Container,
  PasswordInput,
  Stack,
  Title,
} from "@mantine/core";
import { browserDb } from "../../lib/browser";
export default function Account() {
  const [password, setPassword] = useState(""),
    [message, setMessage] = useState("");
  return (
    <Container size="xs" py={80}>
      <Stack>
        <Title>Ustaw hasło</Title>
        <PasswordInput
          label="Nowe hasło (minimum 12 znaków)"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          autoComplete="new-password"
        />
        <Button
          disabled={password.length < 12}
          onClick={async () => {
            const { error } = await browserDb().auth.updateUser({ password });
            setMessage(
              error
                ? "Nie udało się zmienić hasła. Sprawdź ważność zaproszenia."
                : "Hasło zostało zapisane.",
            );
          }}
        >
          Zapisz hasło
        </Button>
        {message ? <Alert>{message}</Alert> : null}
        <Button component="a" href="/" variant="subtle">
          Przejdź do realizacji
        </Button>
      </Stack>
    </Container>
  );
}
