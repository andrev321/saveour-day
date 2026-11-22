"use client";
import { createGlobalStyle, keyframes, styled } from "styled-components";
import { INVITATION_DATA_UI } from "@invitations/renderer";
import { MOTION_EASE_CSS, subtleControls } from "@invitations/ui/motion-styles";

const DEFAULT_PAPER = "#faf7f1";
const DEFAULT_INK = "#34322d";

export const SiteGlobalStyles = createGlobalStyle`body {margin: 0;
background: ${DEFAULT_PAPER};
color: ${DEFAULT_INK};
font-family: Inter, sans-serif;}
${subtleControls}
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
`;

const paperRise = keyframes`
  from {
    clip-path: inset(100% 0 0 0);
  }
  to {
    clip-path: inset(0% 0 0 0);
  }
`;

const riseReveal = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const SiteLoadingScreen = styled.main.attrs<{ "data-ui"?: string }>({
  "data-ui": "site-loading",
})`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  box-sizing: border-box;
  background: ${DEFAULT_PAPER};
  color: ${DEFAULT_INK};
`;

export const SiteStage = styled.div`
  position: relative;
  min-height: 100dvh;
`;

export const SitePaperCurtain = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: var(--guest-paper, ${DEFAULT_PAPER});
  animation: ${paperRise} 360ms ${MOTION_EASE_CSS} both;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    clip-path: none;
  }
`;

export const SiteRevealContent = styled.div`
  position: relative;
  z-index: 1;
  animation: ${riseReveal} 380ms ${MOTION_EASE_CSS} 340ms both;

  [data-ui="${INVITATION_DATA_UI.hero}"]
    :is(
      [data-ui="${INVITATION_DATA_UI.photoFallback}"],
      picture,
      [data-ui="${INVITATION_DATA_UI.action}"]
    ) {
    animation: ${riseReveal} 380ms ${MOTION_EASE_CSS} 430ms both;
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    [data-ui="${INVITATION_DATA_UI.hero}"] * {
      animation: none;
    }
  }
`;

export const GuestCard = styled.main.attrs<{ "data-ui"?: string }>({
  "data-ui": "guest-card",
})`
  & {
    box-sizing: border-box;
    max-width: 480px;
    margin: clamp(40px, 12vh, 110px) auto;
    padding: clamp(28px, 5vw, 44px);
    background: var(--guest-surface, #fffdf9);
    color: var(--guest-ink, #34322d);
    scroll-margin-top: 90px;
    border: 1px solid
      color-mix(in srgb, var(--guest-ink, #34322d) 14%, transparent);
    border-radius: 12px;
    box-shadow:
      0 20px 50px -28px rgba(40, 32, 24, 0.22),
      inset 0 1px 0 rgba(255, 255, 255, 0.7);
    overflow-wrap: break-word;
  }
  & svg[data-brand] {
    height: auto;
  }
  & h1,
  & h2 {
    font-family: "Bodoni Moda", "Playfair Display", Georgia, serif;
    font-weight: 400;
    letter-spacing: -0.025em;
    line-height: 1.2;
    margin: 18px 0 10px;
  }
  & p {
    margin: 0 0 14px;
    line-height: 1.55;
    color: color-mix(in srgb, var(--guest-ink, #34322d) 78%, transparent);
  }
  & p[role="alert"] {
    color: #8c2d23;
    background: color-mix(in srgb, #8c2d23 7%, var(--guest-paper, #faf7f1));
    border: 1px solid color-mix(in srgb, #8c2d23 20%, transparent);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 14px;
  }
  & label {
    display: block;
    margin: 16px 0;
    font-size: 14px;
    font-weight: 500;
    color: color-mix(in srgb, var(--guest-ink, #34322d) 84%, transparent);
  }
  & input,
  & textarea,
  & select {
    box-sizing: border-box;
    display: block;
    width: 100%;
    font: inherit;
    font-size: 15px;
    font-weight: 400;
    color: var(--guest-ink, #34322d);
    margin-top: 8px;
    padding: 12px 14px;
    background: var(--guest-paper, #faf7f1);
    border: 1px solid
      color-mix(in srgb, var(--guest-ink, #34322d) 24%, transparent);
    border-radius: 6px;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  & input:hover:not(:disabled),
  & textarea:hover:not(:disabled),
  & select:hover:not(:disabled) {
    border-color: color-mix(
      in srgb,
      var(--guest-ink, #34322d) 42%,
      transparent
    );
  }
  & input:focus-visible,
  & textarea:focus-visible,
  & select:focus-visible {
    border-color: var(--guest-accent, #6c501b);
    box-shadow: 0 0 0 3px
      color-mix(in srgb, var(--guest-accent, #6c501b) 16%, transparent);
  }
  & button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    margin: 10px 8px 0 0;
    padding: 12px 24px;
    min-height: 46px;
    background: var(--guest-ink, #34322d);
    color: var(--guest-paper, #faf7f1);
    border: 1px solid transparent;
    border-radius: 6px;
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: 0.01em;
    cursor: pointer;
  }
  & button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--guest-ink, #34322d) 88%, #000000);
  }
  & button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  & fieldset {
    border: 1px solid
      color-mix(in srgb, var(--guest-ink, #34322d) 14%, transparent);
    margin: 18px 0;
    border-radius: 8px;
  }
  & :focus-visible {
    outline: 3px solid var(--guest-accent, #6c501b);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    & input,
    & textarea,
    & select {
      transition: none;
    }
  }
  @media (max-width: 512px) {
    & {
      margin: 24px 16px;
    }
  }
`;

export const GuestLink = styled.a.attrs<{ "data-ui"?: string }>({
  "data-ui": "guest-link",
})`
  ${GuestCard} & {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 10px 8px 0 0;
    padding: 12px 24px;
    min-height: 46px;
    background: var(--guest-ink, #34322d);
    color: var(--guest-paper, #faf7f1);
    border: 0;
    border-radius: 6px;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
`;

export const CalendarButton = styled.button`
  display: inline-flex;
  align-items: center;
  margin-top: 10px;
  padding: 8px 14px;
  border: 0;
  background: var(--ink, var(--guest-ink, #34322d));
  color: var(--paper, var(--guest-paper, white));
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  && {
    border-radius: var(--inv-radius, 5px);
  }
  &:focus-visible {
    outline: 2px solid var(--ink, var(--guest-accent, #6c501b));
    outline-offset: 2px;
  }
`;

export const ResponseSummary = styled.div`
  border: 1px solid var(--accent, var(--guest-accent, #6c501b));
  background: var(--surface, var(--guest-surface, white));
  border-radius: var(--inv-card-radius, 8px);
  padding: 14px 16px;
  margin: 14px 0;
  font-size: 14px;
  & h3 {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 600;
  }
  & p {
    margin: 0 0 8px;
  }
  & ul {
    margin: 4px 0 10px;
    padding-left: 18px;
  }
  & li {
    margin: 2px 0;
  }
`;

export const RsvpMetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin: 0 0 10px;
  font-size: 14px;
  color: var(--muted);
`;

export const RsvpMetaName = styled.span`
  color: var(--ink);
  font-weight: 500;
`;

export const RsvpDeadline = styled.p`
  && {
    font-size: 13px;
    color: var(--muted);
    margin: 0 0 12px;
  }
`;

export const RsvpToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0 0 10px;
`;

export const RsvpPending = styled.p`
  && {
    font-size: 12.5px;
    color: var(--muted);
    margin: 0;
  }
`;

export const RsvpCompactButton = styled.button`
  && {
    min-height: 30px;
    padding: 4px 11px;
    border-radius: var(--inv-radius, 5px);
    font-size: 12.5px;
    font-weight: 500;
  }
`;

export const RsvpGuestCard = styled.fieldset`
  && {
    background: var(--surface);
    border: 1px solid var(--line);
    border-left: 3px solid var(--line);
    border-radius: var(--inv-card-radius, 8px);
    box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 22%, transparent);
    padding: 12px 16px 12px 17px;
    margin: 0 0 12px;
    min-width: 0;
    transition: border-left-color 180ms ease;
  }
  &&[data-confirmed="true"],
  &&:has([data-choice="yes"] input:checked) {
    border-left-color: var(--accent);
  }
  @media (prefers-reduced-motion: reduce) {
    && {
      transition: none;
    }
  }
  && > legend {
    float: left;
    width: 100%;
    padding: 0 0 8px;
    margin: 0 0 4px;
    border-bottom: 1px solid color-mix(in srgb, var(--line) 65%, transparent);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--ink);
  }
  && > legend + * {
    clear: both;
    border-top: 0;
    margin-top: 0;
  }
`;

export const RsvpEventList = styled.div`
  clear: both;
  display: flex;
  flex-direction: column;
`;

export const RsvpEventRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 6px 0;
  min-height: 38px;
  & + & {
    border-top: 1px solid color-mix(in srgb, var(--line) 45%, transparent);
  }
`;

export const RsvpEventTitle = styled.span`
  font-size: 14px;
  line-height: 1.35;
  color: var(--ink);
  flex: 1 1 auto;
  min-width: 0;
`;

export const RsvpChoiceGroup = styled.div`
  display: inline-flex;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
`;

export const RsvpChoicePill = styled.label`
  && {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 5px 11px;
    min-height: 30px;
    min-width: 68px;
    border: 1px solid var(--line);
    border-radius: var(--inv-pill-radius, 5px);
    font-size: 13px;
    font-weight: 400;
    line-height: 1.2;
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease,
      box-shadow 160ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    && {
      transition: none;
    }
  }
  && input[type="radio"] {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  &&:hover:not(:has(input:disabled)) {
    border-color: var(--ink);
    color: var(--ink);
  }
  &&:has(input:checked) {
    font-weight: 500;
  }
  &&[data-choice="yes"]:has(input:checked) {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
    box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 18%, transparent);
  }
  &&[data-choice="yes"]:has(input:checked)::before {
    content: "✓";
    display: inline-block;
    margin-right: 4px;
    font-size: 11px;
    line-height: 1;
  }
  &&[data-choice="no"]:has(input:checked) {
    background: color-mix(in srgb, var(--ink) 14%, var(--surface));
    border-color: var(--ink);
    color: var(--ink);
  }
  &&:has(input:focus-visible) {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  &&:has(input:disabled) {
    opacity: 0.55;
    cursor: default;
  }
  && input[type="radio"]:disabled {
    cursor: default;
  }
`;

export const RsvpSubField = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--line) 45%, transparent);
`;

export const RsvpCompanionField = styled.label`
  && {
    display: block;
    margin: 10px 0 2px;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--line) 45%, transparent);
    font-size: 13px;
    color: var(--muted);
  }
`;

export const RsvpPrivacyNote = styled.p`
  && {
    font-size: 12.5px;
    color: var(--muted);
    margin: 10px 0 8px;
    line-height: 1.45;
  }
`;

export const RsvpNotesField = styled.label`
  && {
    display: block;
    margin: 12px 0 14px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
  }
  && textarea {
    margin-top: 6px;
    min-height: 72px;
    color: var(--ink);
    font-weight: 400;
  }
`;

export const RsvpActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

export const RsvpAlert = styled.div`
  padding: 10px 14px;
  border-radius: var(--inv-card-radius, 8px);
  border: 1px solid var(--line);
  background: var(--surface);
  font-size: 13.5px;
  margin: 12px 0;
  & p {
    margin: 0 0 8px;
  }
`;

export const RsvpCheckboxLabel = styled.label`
  && {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin: 6px 0 12px;
    font-size: 14px;
    cursor: pointer;
  }
`;

export const QuestionGroup = styled.fieldset`
  && {
    border: 0;
    border-left: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 10px 0 0;
    margin: 10px 0 0;
    border-top: 1px solid color-mix(in srgb, var(--line) 45%, transparent);
  }
  && > legend {
    float: left;
    width: 100%;
    padding: 0;
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  && > legend + * {
    clear: both;
    border-top: 0;
    margin-top: 0;
  }
`;

export const QuestionHelp = styled.small`
  display: block;
  clear: both;
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 6px;
`;

export const QuestionTextLabel = styled.label`
  && {
    display: block;
    margin: 10px 0 0;
    padding-top: 10px;
    border-top: 1px solid color-mix(in srgb, var(--line) 45%, transparent);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
`;

export const QuestionNumberRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--line) 45%, transparent);
  font-size: 13px;
  font-weight: 500;
`;

export const QuestionStepper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  & button {
    min-height: 34px;
    min-width: 34px;
    padding: 4px 10px;
  }
  & input[type="number"] {
    width: 68px;
    margin: 0;
    padding: 6px 8px;
    text-align: center;
  }
`;

export const QuestionOptions = styled.div`
  clear: both;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: center;
`;

export const QuestionOptionLabel = styled.label`
  && {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin: 2px 0;
    font-size: 13.5px;
    cursor: pointer;
  }
`;

export const QuestionPillButton = styled.button`
  && {
    min-height: 32px;
    padding: 5px 13px;
    border-radius: var(--inv-pill-radius, 5px);
    font-size: 13px;
    font-weight: 400;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease,
      box-shadow 160ms ease;
  }
  @media (prefers-reduced-motion: reduce) {
    && {
      transition: none;
    }
  }
  &&[aria-checked="true"] {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
    font-weight: 500;
  }
`;
