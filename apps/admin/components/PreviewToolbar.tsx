"use client";
import { ActionIcon, Tooltip } from "@mantine/core";
import { ArrowsOutIcon, CornersOutIcon, XIcon } from "@phosphor-icons/react";
import { usePanelI18n } from "../lib/i18n";
import { workspaceUi } from "../lib/workspace-i18n";
import * as S from "./preview.styles";
import { DeviceSelector, deviceWidths } from "./DeviceSelector";

export function PreviewToolbar({
  width,
  onWidth,
  fit,
  onFit,
  variant,
  onVariant,
  variants,
  expanded,
  onExpand,
}: {
  width: string;
  onWidth: (width: string) => void;
  fit: boolean;
  onFit: (fit: boolean) => void;
  variant: string;
  onVariant: (variant: string) => void;
  variants: { id: string; label: string }[];
  expanded: boolean;
  onExpand: () => void;
}) {
  const { language, t } = usePanelI18n();
  const ui = workspaceUi[language];
  return (
    <S.PreviewToolbar>
      <S.PreviewToolbarLabel>{ui.preview}</S.PreviewToolbarLabel>
      <DeviceSelector
        device={
          Number(width) < 768
            ? "mobile"
            : Number(width) < 1024
              ? "tablet"
              : "desktop"
        }
        onChange={(device) => onWidth(deviceWidths[device])}
      />
      <S.PreviewVariant
        aria-label={t("preview")}
        size="xs"
        data={variants.map((v) => ({ value: v.id, label: v.label }))}
        value={variant}
        allowDeselect={false}
        onChange={(v) => {
          if (typeof v === "string") onVariant(v);
        }}
      />
      <Tooltip label={`${ui.zoom}: ${fit ? ui.fit : ui.actual}`}>
        <S.PreviewFit
          aria-label={ui.fit}
          aria-pressed={fit}
          variant={fit ? "light" : "subtle"}
          onClick={() => onFit(!fit)}
        >
          <CornersOutIcon size={19} />
          <span>{fit ? ui.fit : ui.actual}</span>
        </S.PreviewFit>
      </Tooltip>
      <Tooltip label={t(expanded ? "closePreview" : "openPreview")}>
        <ActionIcon
          aria-label={t(expanded ? "closePreview" : "openPreview")}
          variant="subtle"
          onClick={onExpand}
        >
          {expanded ? <XIcon size={19} /> : <ArrowsOutIcon size={19} />}
        </ActionIcon>
      </Tooltip>
    </S.PreviewToolbar>
  );
}
