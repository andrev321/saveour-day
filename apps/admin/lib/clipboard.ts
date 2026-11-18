"use client";

import { toast } from "@invitations/ui/toast";

export function copyErrorText(language: "pl" | "en" | "de") {
  if (language === "pl") {
    return "Nie udało się skopiować automatycznie. Skopiuj ręcznie.";
  }
  if (language === "en") {
    return "Could not copy automatically. Please copy manually.";
  }
  return "Automatisches Kopieren fehlgeschlagen. Bitte manuell kopieren.";
}

export async function copyToClipboard(
  text: string,
  successMessage: string,
  language: "pl" | "en" | "de",
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
    return true;
  } catch {
    toast.error(copyErrorText(language));
    return false;
  }
}
