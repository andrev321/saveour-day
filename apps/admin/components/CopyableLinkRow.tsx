"use client";

import { useState } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { ArrowSquareOutIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { copyToClipboard } from "../lib/clipboard";
import { usePanelI18n } from "../lib/i18n";

export function CopyableLinkRow({
  value,
  copyLabel,
  copiedMessage,
  openAction,
}: {
  value: string;
  copyLabel: string;
  copiedMessage: string;
  openAction?: { label: string; href: string };
}) {
  const { language } = usePanelI18n();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(value, copiedMessage, language);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Group
      gap="xs"
      justify="space-between"
      wrap="nowrap"
      style={{
        padding: "6px 8px 6px 12px",
        borderRadius: "var(--mantine-radius-md)",
        border: "1px solid var(--panel-border)",
        background: "var(--panel-surface)",
        minWidth: 0,
      }}
    >
      <Text
        size="xs"
        ff="monospace"
        title={value}
        style={{
          minWidth: 0,
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          userSelect: "all",
        }}
      >
        {value}
      </Text>
      <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
        <Tooltip label={copyLabel}>
          <ActionIcon
            variant="subtle"
            color={copied ? "green" : "gray"}
            aria-label={copyLabel}
            onClick={() => void handleCopy()}
          >
            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          </ActionIcon>
        </Tooltip>
        {openAction && (
          <Tooltip label={openAction.label}>
            <ActionIcon
              component="a"
              href={openAction.href}
              target="_blank"
              rel="noreferrer"
              variant="subtle"
              color="gray"
              aria-label={openAction.label}
            >
              <ArrowSquareOutIcon size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Group>
  );
}
