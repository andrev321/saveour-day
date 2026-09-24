"use client";
import { Box, Card, Text, Title } from "@mantine/core";
import { styled } from "styled-components";

export const InvitationPhotoFallback = styled(Box).attrs<{
  "data-ui"?: string;
}>({ "data-ui": "invitation-photo-fallback" })`
  & {
    height: 100%;
    min-height: 240px;
    background:
      radial-gradient(ellipse at 20% 80%, #d9c5a7, transparent 60%),
      linear-gradient(130deg, #e4e8da, #ede4d7 60%, #b9c6ae);
  }
`;

export const InvitationPhoto = styled.img.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-photo",
})`
  & {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: var(--focal, 50% 50%);
    border-radius: inherit;
  }
  @media (max-width: 47.99em) {
    & {
      object-position: var(--mobile-focal, 50% 50%);
    }
  }
`;

export const InvitationProse = styled(Text).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-prose",
})`
  & {
    white-space: pre-line;
    line-height: 1.8;
    max-width: 65ch;
  }
`;

export const InvitationMap = styled.iframe.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-map",
})`
  & {
    border: 0;
    width: 100%;
    height: 240px;
    border-radius: 16px;
  }
`;

export const Invitation = styled(Box).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation",
})`
  & {
    --paper: #faf7f1;
    --surface: #fffdfb;
    --ink: #34322d;
    --accent: #6c501b;
    background: var(--paper);
    color: var(--ink);
    min-height: 100vh;
    overflow-wrap: anywhere;
  }
  @media (prefers-reduced-motion: reduce) {
    & * {
      animation: none !important;
      transition: none !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    & *::before {
      animation: none !important;
      transition: none !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    & *::after {
      animation: none !important;
      transition: none !important;
    }
  }
`;

export const InvitationHero = styled.section.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-hero",
})`
  & {
    position: relative;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    max-width: 1440px;
    margin: auto;
    min-height: 620px;
  }
  & h1 {
    font-size: clamp(3rem, 5.8vw, 6.6rem);
    line-height: 0.98;
    letter-spacing: -0.035em;
    font-weight: 500;
    margin: 24px 0;
  }
  &[data-layout="overlay"] {
    display: block;
  }
  @media (max-width: 47.99em) {
    & {
      grid-template-columns: 1fr;
      min-height: 0;
    }
  }
  @media (max-width: 47.99em) {
    & h1 {
      font-size: clamp(2.8rem, 12vw, 5rem);
    }
  }
`;

export const InvitationHeroPhoto = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-hero-photo",
})`
  & {
    min-width: 0;
    position: relative;
    min-height: 440px;
  }
  & picture {
    position: absolute;
    inset: 0;
  }
  ${InvitationHero}[data-layout="overlay"] & {
    position: absolute;
    inset: 0;
  }
  @media (max-width: 47.99em) {
    & {
      min-height: 320px;
    }
  }
  @media (max-width: 47.99em) {
    ${InvitationHero}[data-layout="overlay"] & {
      position: absolute;
    }
  }
`;

export const InvitationHeroCopy = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-hero-copy",
})`
  & {
    padding: clamp(24px, 5vw, 80px);
    align-self: center;
    min-width: 0;
  }
  ${InvitationHero}[data-layout="overlay"] & {
    position: relative;
    max-width: 760px;
    margin: auto;
    text-align: center;
    background: color-mix(in srgb, var(--paper) 92%, transparent);
  }
  @media (max-width: 47.99em) {
    ${InvitationHero}[data-layout="overlay"] & {
      margin: 24px;
      padding: 24px;
    }
  }
`;

export const InvitationEyebrow = styled(Text).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-eyebrow",
})`
  & {
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--mantine-color-accent-8);
  }
`;

export const InvitationTagline = styled(Title).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-tagline",
})`
  & {
    font-size: clamp(1.5rem, 2.3vw, 2.4rem);
    margin-bottom: 20px;
  }
`;

export const InvitationSection = styled(Card).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-section",
})`
  & {
    min-width: 0;
    background: var(--surface);
    border-color: color-mix(in srgb, var(--ink) 16%, var(--surface));
  }
  &[data-kind="contact"] {
    grid-column: 1 / -1;
  }
`;
