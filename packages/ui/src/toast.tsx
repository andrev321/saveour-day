"use client";

import { Notifications, notifications } from "@mantine/notifications";
import {
  CheckCircleIcon,
  InfoIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

/**
 * Renders the global toast notification viewport.
 * Mount once inside MantineProvider (e.g. PanelTheme).
 */
export function ToastViewport() {
  return <Notifications position="bottom-right" zIndex={1000} limit={4} />;
}

type ToastOptions = {
  title?: string;
  autoClose?: number | false;
};

function show(
  color: string,
  icon: React.ReactNode,
  message: string,
  options?: ToastOptions,
) {
  notifications.show({
    color,
    icon,
    title: options?.title,
    message,
    autoClose: options?.autoClose ?? 4000,
    withBorder: true,
  });
}

export const toast = {
  success(message: string, options?: ToastOptions) {
    show("teal", <CheckCircleIcon size={18} weight="fill" />, message, options);
  },
  error(message: string, options?: ToastOptions) {
    show("red", <XCircleIcon size={18} weight="fill" />, message, {
      autoClose: 6000,
      ...options,
    });
  },
  warning(message: string, options?: ToastOptions) {
    show("orange", <WarningCircleIcon size={18} weight="fill" />, message, {
      autoClose: 5000,
      ...options,
    });
  },
  info(message: string, options?: ToastOptions) {
    show("blue", <InfoIcon size={18} weight="fill" />, message, options);
  },
};
