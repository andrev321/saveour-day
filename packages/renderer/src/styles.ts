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
  @media (min-width: 48em) and (max-width: 63.99em) {
    & {
      object-position: var(--tablet-focal, 50% 50%);
    }
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

export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32px;
  @media (max-width: 47.99em) {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }
`;
export const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  & picture {
    display: block;
    aspect-ratio: 4 / 5;
    min-width: 0;
    overflow: hidden;
    border-radius: inherit;
  }
  @media (max-width: 30em) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
export const Schedule = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  & li {
    display: grid;
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 20px;
    padding: 0 0 28px;
  }
  & li:last-child {
    padding-bottom: 0;
  }
  & .event-time {
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
`;
export const Ornament = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--accent);
  margin-bottom: 28px;
  & span {
    width: 42px;
    height: 1px;
    background: currentColor;
    opacity: 0.5;
  }
`;

export const ThemedInvitation = styled(Invitation)`
  --muted: color-mix(in srgb, var(--ink) 75%, var(--paper));
  --mantine-color-text: var(--ink);
  --mantine-color-dimmed: var(--muted);
  & ${InvitationEyebrow} {
    color: var(--accent);
  }
  & ${InvitationPhotoFallback} {
    background:
      radial-gradient(
        ellipse at 20% 80%,
        color-mix(in srgb, var(--accent) 24%, var(--paper)),
        transparent 65%
      ),
      linear-gradient(130deg, var(--surface), var(--paper));
  }
  & ${InvitationSection} {
    color: var(--ink);
    border-radius: var(--mantine-radius-default);
  }
  & ${InvitationMap} {
    border-radius: var(--mantine-radius-default);
  }
  & ${InvitationHero}[data-has-photo="false"] {
    display: block;
    min-height: 0;
  }
  & ${InvitationHero}[data-has-photo="false"] ${InvitationHeroPhoto} {
    display: none;
  }
  & ${InvitationHero}[data-has-photo="false"] ${InvitationHeroCopy} {
    max-width: 1000px;
    margin: auto;
    padding-block: 80px;
  }
  & ${InvitationHero}[data-layout="overlay"] {
    padding: 64px 24px;
  }
  &[data-theme="classic"] ${InvitationHero} {
    max-width: 1120px;
    display: flex;
    flex-direction: column-reverse;
    padding: 32px;
  }
  &[data-theme="classic"] ${InvitationHeroCopy} {
    text-align: center;
    max-width: 850px;
    margin: auto;
  }
  &[data-theme="classic"] ${InvitationProse} {
    margin-inline: auto;
  }
  &[data-theme="classic"] ${Ornament}, &[data-theme="evening"] ${Ornament} {
    justify-content: center;
  }
  &[data-theme="classic"] ${InvitationHeroPhoto} {
    min-height: 360px;
    border: 1px solid var(--accent);
    padding: 10px;
  }
  &[data-theme="classic"] ${InvitationHeroPhoto} picture {
    inset: 10px;
  }
  &[data-theme="classic"] ${InvitationSection} {
    border: 4px double color-mix(in srgb, var(--accent) 40%, var(--surface));
  }
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] {
    grid-column: 1 / -1;
    text-align: center;
  }
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] > div {
    justify-content: center;
  }
  &[data-theme="botanical"] ${InvitationHero} {
    padding: 40px;
    gap: 16px;
  }
  &[data-theme="botanical"] ${InvitationHeroPhoto} {
    border-radius: 48% 48% 12px 12px;
    overflow: hidden;
  }
  &[data-theme="botanical"] ${InvitationHero} h1 {
    font-size: clamp(3.5rem, 7vw, 7rem);
    font-weight: 400;
  }
  &[data-theme="botanical"] ${InvitationSection} {
    border: 0;
    border-radius: 40px 8px 40px 8px;
  }
  &[data-theme="botanical"] ${Schedule} li > div {
    border-left: 1px solid var(--accent);
    padding-left: 20px;
  }
  &[data-theme="botanical"] ${Gallery} picture {
    border-radius: 90px 90px 8px 8px;
  }
  &[data-theme="editorial"] ${InvitationHero} {
    padding: 40px;
    gap: 32px;
    grid-template-columns: 0.8fr 1.2fr;
  }
  &[data-theme="editorial"] ${InvitationHeroCopy} {
    padding: 20px 0;
  }
  &[data-theme="editorial"] ${InvitationHero} h1 {
    font-weight: 600;
    letter-spacing: -0.07em;
  }
  &[data-theme="editorial"] ${SectionGrid} {
    grid-template-columns: minmax(0, 1fr);
    gap: 48px;
  }
  &[data-theme="editorial"] ${InvitationSection} {
    border: 0;
    border-top: 1px solid var(--ink);
    background: transparent;
    padding: 32px 0;
  }
  &[data-theme="editorial"] ${Schedule} li {
    grid-template-columns: minmax(80px, 0.4fr) minmax(0, 1fr);
    border-bottom: 1px solid color-mix(in srgb, var(--ink) 16%, transparent);
    padding: 24px 0;
  }
  &[data-theme="editorial"] ${Schedule} .event-time {
    font-size: clamp(1.8rem, 4vw, 3rem);
    line-height: 1;
  }
  &[data-theme="evening"] ${InvitationHeroCopy} {
    text-align: center;
    border: 1px solid var(--accent);
    outline: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    outline-offset: 10px;
  }
  &[data-theme="evening"] ${InvitationHero} h1 {
    font-weight: 400;
    letter-spacing: -0.02em;
  }
  &[data-theme="evening"] ${InvitationSection} {
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
  }
  &[data-theme="evening"] ${InvitationSection}[data-kind="timeline"] {
    grid-column: 1 / -1;
  }
  &[data-theme="evening"] ${Schedule} li {
    padding: 24px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    grid-template-columns: 90px minmax(0, 1fr);
  }
  &[data-theme="evening"] ${Schedule} .event-time {
    font-size: 1.5rem;
  }
  &[data-theme="celebration"] ${InvitationHero} {
    padding: 48px;
    align-items: center;
  }
  &[data-theme="celebration"] ${InvitationHeroPhoto} {
    border: 12px solid var(--surface);
    border-bottom-width: 48px;
    transform: rotate(-3deg);
    box-shadow: 0 12px 32px #00000012;
  }
  &[data-theme="celebration"] ${InvitationHero} h1 {
    letter-spacing: -0.045em;
  }
  &[data-theme="celebration"] ${InvitationSection} {
    border: 0;
    border-radius: 36px 36px 8px 36px;
  }
  &[data-theme="celebration"] ${InvitationSection}:nth-of-type(even) {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
    border-radius: 8px 36px 36px 36px;
  }
  &[data-theme="celebration"] ${Schedule} li {
    background: var(--paper);
    border-radius: 18px;
    padding: 20px;
    margin-bottom: 12px;
  }
  &[data-theme="celebration"] ${Gallery} picture {
    border: 8px solid var(--surface);
    border-bottom-width: 28px;
  }
  &[data-decorations="full"] ${InvitationSection} {
    box-shadow: 6px 6px 0 color-mix(in srgb, var(--accent) 16%, transparent);
  }
  &[data-decorations="full"] ${Ornament} {
    gap: 24px;
  }
  &[data-decorations="none"] ${Ornament} {
    display: none;
  }
  @media (max-width: 47.99em) {
    & ${InvitationHero} {
      grid-template-columns: minmax(0, 1fr) !important;
      padding: 24px !important;
    }
    & ${InvitationHeroCopy} {
      padding: 28px 0;
    }
    & ${InvitationHero}[data-has-photo="false"] ${InvitationHeroCopy} {
      padding: 40px 8px;
    }
    & ${InvitationHero}[data-layout="overlay"] ${InvitationHeroCopy} {
      margin: 12px;
      padding: 28px 16px;
    }
    &[data-theme="classic"] ${InvitationHeroPhoto} {
      width: 100%;
      min-height: 280px;
    }
    &[data-theme="celebration"] ${InvitationHeroPhoto} {
      width: 94%;
      margin: 8px auto 24px;
    }
  }
`;
