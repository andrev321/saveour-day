"use client";
import { ActionIcon, Select, Tooltip } from "@mantine/core";
import {
  DeviceMobileIcon,
  DeviceTabletIcon,
  DesktopIcon,
  ArrowsOutIcon,
  XIcon,
  CornersOutIcon,
} from "@phosphor-icons/react";
import { usePanelI18n } from "../lib/i18n";
import { workspaceUi } from "../lib/workspace-i18n";

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
    <div className="preview-toolbar">
      <span className="preview-toolbar-label">{ui.preview}</span>
      <div
        className="preview-device-buttons"
        role="group"
        aria-label={t("screenWidth")}
      >
        {[
          { value: "390", label: ui.phone, icon: DeviceMobileIcon },
          { value: "768", label: ui.tablet, icon: DeviceTabletIcon },
          { value: "1440", label: ui.desktop, icon: DesktopIcon },
        ].map(({ value, label, icon: Icon }) => (
          <Tooltip label={label} key={value}>
            <ActionIcon
              aria-label={label}
              aria-pressed={
                width === value || (value === "390" && width === "320")
              }
              variant={
                width === value || (value === "390" && width === "320")
                  ? "filled"
                  : "subtle"
              }
              onClick={() => onWidth(value)}
            >
              <Icon size={19} weight="duotone" />
            </ActionIcon>
          </Tooltip>
        ))}
      </div>
      <Select
        className="preview-variant"
        aria-label={t("preview")}
        size="xs"
        data={variants.map((v) => ({ value: v.id, label: v.label }))}
        value={variant}
        allowDeselect={false}
        onChange={(v) => {
          if (v) onVariant(v);
        }}
      />
      <Tooltip label={`${ui.zoom}: ${fit ? ui.fit : ui.actual}`}>
        <ActionIcon
          className="preview-fit"
          aria-label={ui.fit}
          aria-pressed={fit}
          variant={fit ? "light" : "subtle"}
          onClick={() => onFit(!fit)}
        >
          <CornersOutIcon size={19} />
          <span>{fit ? ui.fit : ui.actual}</span>
        </ActionIcon>
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
    </div>
  );
}
