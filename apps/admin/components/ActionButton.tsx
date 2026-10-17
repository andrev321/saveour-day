"use client";
import { Button, type ButtonProps } from "@mantine/core";
import type { ComponentPropsWithoutRef } from "react";
import { LoadingDots } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { usePanelI18n } from "../lib/i18n";

type Props = ButtonProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof ButtonProps> & {
    pendingLabel?: string;
  };
export function ActionButton({
  loading,
  pendingLabel,
  children,
  disabled,
  leftSection,
  ...props
}: Props) {
  const { language } = usePanelI18n();
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      leftSection={loading ? <LoadingDots /> : leftSection}
    >
      <span style={{ display: "inline-grid" }}>
        <span
          style={{
            gridArea: "1/1",
            visibility: loading ? "hidden" : undefined,
          }}
          aria-hidden={loading || undefined}
        >
          {children}
        </span>
        {
          <span
            aria-hidden={!loading}
            style={{
              gridArea: "1/1",
              visibility: loading ? undefined : "hidden",
            }}
          >
            {pendingLabel || loadingText(language, "save")}
          </span>
        }
      </span>
    </Button>
  );
}
