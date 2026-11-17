"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActionIcon,
  Popover,
  Stack,
  Text,
  type FloatingPosition,
  type MantineColor,
} from "@mantine/core";
import { WarningIcon } from "@phosphor-icons/react";

export function NoticePopover({
  label,
  title,
  color = "blue",
  position = "bottom-start",
  children,
}: {
  label: string;
  title?: string;
  color?: MantineColor;
  position?: FloatingPosition;
  children: ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openHover = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setHovered(true);
  };

  const closeHover = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(false), 140);
  };

  const opened = pinned || hovered;

  return (
    <Popover
      opened={opened}
      onChange={(next) => {
        if (!next) {
          setPinned(false);
          setHovered(false);
        }
      }}
      width={300}
      withArrow
      shadow="md"
      position={position}
    >
      <Popover.Target>
        <ActionIcon
          variant="light"
          color={color}
          size="sm"
          radius="xl"
          aria-label={label}
          aria-expanded={opened}
          onMouseEnter={openHover}
          onMouseLeave={closeHover}
          onClick={() => setPinned((p) => !p)}
        >
          <WarningIcon size={15} />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown onMouseEnter={openHover} onMouseLeave={closeHover}>
        <Stack gap="xs">
          {title && (
            <Text size="xs" fw={600}>
              {title}
            </Text>
          )}
          {typeof children === "string" ? (
            <Text size="xs">{children}</Text>
          ) : (
            children
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
