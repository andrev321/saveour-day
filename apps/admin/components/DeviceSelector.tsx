"use client";
import { ActionIcon, Tooltip } from "@mantine/core";
import {
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
} from "@phosphor-icons/react";
import { usePanelI18n } from "../lib/i18n";
import { workspaceUi } from "../lib/workspace-i18n";
import * as S from "./preview.styles";

export type PhotoDevice = "mobile" | "tablet" | "desktop";
export const deviceWidths = { mobile: "390", tablet: "768", desktop: "1440" };

export function DeviceSelector({
  device,
  onChange,
}: {
  device: PhotoDevice;
  onChange: (device: PhotoDevice) => void;
}) {
  const { language, t } = usePanelI18n();
  const ui = workspaceUi[language];
  return (
    <S.PreviewDeviceButtons role="group" aria-label={t("screenWidth")}>
      {(
        [
          { value: "mobile", label: ui.phone, icon: DeviceMobileIcon },
          { value: "tablet", label: ui.tablet, icon: DeviceTabletIcon },
          { value: "desktop", label: ui.desktop, icon: DesktopIcon },
        ] as const
      ).map(({ value, label, icon: Icon }) => (
        <Tooltip label={label} key={value}>
          <ActionIcon
            aria-label={label}
            aria-pressed={device === value}
            variant={device === value ? "filled" : "subtle"}
            onClick={() => onChange(value)}
          >
            <Icon size={19} weight="duotone" />
          </ActionIcon>
        </Tooltip>
      ))}
    </S.PreviewDeviceButtons>
  );
}
