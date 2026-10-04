"use client";
import { createGlobalStyle, styled } from "styled-components";
export const SiteGlobalStyles = createGlobalStyle`body {margin: 0;
background: #faf7f1;
color: #34322d;
font-family: Inter, sans-serif;}
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

export const GuestActions = styled.nav`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: var(--guest-paper, #faf7f1);
  border-bottom: 1px solid #ddd;
  & a {
    padding: 10px 16px;
    border-radius: 24px;
    background: var(--guest-ink, #34322d);
    color: var(--guest-paper, white);
    text-decoration: none;
    font-weight: 600;
    min-height: 24px;
  }
  & a:focus-visible {
    outline: 3px solid var(--guest-accent, #6c501b);
    outline-offset: 3px;
  }
`;
export const ResponseSummary = styled.div`
  border: 2px solid var(--guest-accent, #6c501b);
  border-radius: 12px;
  padding: 16px;
  margin: 20px 0;
  & h3 {
    margin-top: 0;
  }
  & ul {
    padding-left: 20px;
  }
`;
