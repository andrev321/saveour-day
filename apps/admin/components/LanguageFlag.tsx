import type { PanelLanguage } from "../lib/i18n";

export function LanguageFlag({ language }: { language: PanelLanguage }) {
  return (
    <svg
      width="24"
      height="16"
      viewBox="0 0 60 40"
      aria-hidden="true"
      focusable="false"
    >
      {language === "pl" ? (
        <>
          <path fill="#fff" d="M0 0h60v40H0z" />
          <path fill="#dc143c" d="M0 20h60v20H0z" />
        </>
      ) : language === "de" ? (
        <>
          <path fill="#111" d="M0 0h60v40H0z" />
          <path fill="#d00" d="M0 13.333h60v26.667H0z" />
          <path fill="#ffce00" d="M0 26.667h60V40H0z" />
        </>
      ) : (
        <>
          <path fill="#012169" d="M0 0h60v40H0z" />
          <path stroke="#fff" strokeWidth="8" d="m0 0 60 40M60 0 0 40" />
          <path stroke="#c8102e" strokeWidth="3" d="m0 0 60 40M60 0 0 40" />
          <path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" />
          <path stroke="#c8102e" strokeWidth="7" d="M30 0v40M0 20h60" />
        </>
      )}
      <path fill="none" stroke="#000" strokeOpacity=".15" d="M.5.5h59v39H.5z" />
    </svg>
  );
}
