"use client";
import { createGlobalStyle, styled } from "styled-components";
import { subtleControls } from "@invitations/ui/motion-styles";
export const SiteGlobalStyles = createGlobalStyle`body {margin: 0;
background: #faf7f1;
color: #34322d;
font-family: Inter, sans-serif;}
${subtleControls}
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
`;

export const GuestCard = styled.main.attrs<{ "data-ui"?: string }>({
  "data-ui": "guest-card",
})`
  & {
    max-width: 680px;
    margin: 40px auto;
    padding: 28px;
    background: var(--guest-surface, white);
    color: var(--guest-ink, #34322d);
    scroll-margin-top: 90px;
    border: 1px solid #e5dfd3;
    border-radius: 18px;
  }
  & h1 {
    font-family: "Playfair Display", Georgia, serif;
  }
  & h2 {
    font-family: "Playfair Display", Georgia, serif;
  }
  & label {
    display: block;
    margin: 14px 0;
  }
  & input {
    box-sizing: border-box;
    display: block;
    width: 100%;
    font: inherit;
    margin-top: 6px;
    padding: 12px;
    border: 1px solid #aaa;
    border-radius: 8px;
  }
  & textarea {
    box-sizing: border-box;
    display: block;
    width: 100%;
    font: inherit;
    margin-top: 6px;
    padding: 12px;
    border: 1px solid #aaa;
    border-radius: 8px;
  }
  & select {
    box-sizing: border-box;
    display: block;
    width: 100%;
    font: inherit;
    margin-top: 6px;
    padding: 12px;
    border: 1px solid #aaa;
    border-radius: 8px;
  }
  & button {
    display: inline-block;
    margin: 8px 8px 8px 0;
    padding: 12px 20px;
    background: var(--guest-ink, #34322d);
    color: var(--guest-paper, white);
    border: 0;
    border-radius: 24px;
    font: inherit;
    cursor: pointer;
  }
  & button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  & fieldset {
    border: 1px solid #ddd;
    margin: 18px 0;
    border-radius: 10px;
  }
  & :focus-visible {
    outline: 3px solid var(--guest-accent, #6c501b);
    outline-offset: 3px;
  }
  @media (max-width: 720px) {
    & {
      margin: 16px;
      padding: 20px;
    }
  }
`;

export const GuestLink = styled.a.attrs<{ "data-ui"?: string }>({
  "data-ui": "guest-link",
})`
  ${GuestCard} & {
    display: inline-block;
    margin: 8px 8px 8px 0;
    padding: 12px 20px;
    background: var(--guest-ink, #34322d);
    color: var(--guest-paper, white);
    border: 0;
    border-radius: 24px;
    font: inherit;
    cursor: pointer;
  }
`;

export const CalendarButton = styled.button`
  display: inline-flex;
  align-items: center;
  margin-top: 10px;
  padding: 8px 14px;
  border: 0;
  border-radius: 5px;
  background: var(--ink, var(--guest-ink, #34322d));
  color: var(--paper, var(--guest-paper, white));
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  &:focus-visible {
    outline: 2px solid var(--ink, var(--guest-accent, #6c501b));
    outline-offset: 2px;
  }
`;

export const ResponseSummary = styled.div`
  border: 1px solid var(--accent, var(--guest-accent, #6c501b));
  background: var(--surface, var(--guest-surface, white));
  border-radius: 8px;
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
    font-size: 12.5px;
    font-weight: 500;
  }
`;

export const RsvpGuestCard = styled.fieldset`
  && {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 12px 16px 12px;
    margin: 0 0 12px;
    min-width: 0;
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
    border-radius: 5px;
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
      color 140ms ease;
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
    opacity: 0.4;
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
  border-radius: 6px;
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
    border-radius: 0;
    background: transparent;
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
    font-size: 13px;
    font-weight: 400;
  }
  &&[aria-checked="true"] {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--paper);
    font-weight: 500;
  }
`;
