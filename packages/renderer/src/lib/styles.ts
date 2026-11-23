"use client";
import { Box, Card, Text, Title } from "@mantine/core";
import { subtleControls } from "@invitations/ui/motion-styles";
import { keyframes, styled } from "styled-components";

export const INVITATION_DATA_UI = {
  root: "invitation",
  header: "invitation-header",
  hero: "invitation-hero",
  photoFallback: "invitation-photo-fallback",
  action: "invitation-action",
} as const;

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

const ornamentDraw = keyframes`
  from {
    stroke-dashoffset: 620;
    opacity: 0.25;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
`;

const heroPhotoSettle = keyframes`
  from {
    transform: scale(1.04);
  }
  to {
    transform: scale(1);
  }
`;

const eveningKenBurns = keyframes`
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.04);
  }
`;

const hairlineReveal = keyframes`
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
`;

export const ReadingProgress = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "reading-progress",
})`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  z-index: 40;
  pointer-events: none;
  background: var(--accent);
  transform: scaleX(var(--scroll-progress, 0));
  transform-origin: left;
  will-change: transform;
  @media print {
    display: none;
  }
`;

export const PreviewEditControl = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-edit-control",
})`
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;

  [data-ui="invitation-hero"]:hover > &,
  [data-ui="invitation-section"]:hover > &,
  &:focus-within {
    opacity: 1;
    pointer-events: auto;
  }
  & button {
    box-shadow: 0 2px 8px #00000018;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const InvitationPhotoFallback = styled(Box).attrs<{
  "data-ui"?: string;
}>({
  "data-ui": INVITATION_DATA_UI.photoFallback,
})`
  height: 100%;
  min-height: 240px;
  background: linear-gradient(135deg, var(--surface), var(--paper));
`;
export const PhotoFrame = styled.div`
  display: block;
  position: relative;
  isolation: isolate;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
  background: color-mix(
    in srgb,
    var(--ink, currentColor) 6%,
    var(--paper, transparent)
  );
`;
export const PhotoPicture = styled.picture`
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
`;
export const PhotoPlaceholder = styled.span`
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image: var(--blur, none);
  background-size: cover;
  background-position: var(--focal, 50% 50%);
  filter: blur(18px);
  transform: scale(1.08);
  opacity: 1;
  transition: opacity 280ms ease-out;
  &[data-loaded="true"] {
    opacity: 0;
  }
  @media (min-width: 48em) and (max-width: 63.99em) {
    background-image: var(--tablet-blur, var(--blur, none));
    background-position: var(--tablet-focal, 50% 50%);
  }
  @media (max-width: 47.99em) {
    background-image: var(--mobile-blur, var(--blur, none));
    background-position: var(--mobile-focal, 50% 50%);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
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
    position: relative;
    z-index: 1;
    object-position: var(--focal, 50% 50%);
    border-radius: inherit;
    opacity: 1;
    transition: opacity 280ms ease-out;
  }
  &[data-has-blur="true"] {
    opacity: 0;
  }
  &[data-has-blur="true"][data-loaded="true"] {
    opacity: 1;
  }
  @media (min-width: 48em) and (max-width: 63.99em) {
    & {
      object-position: var(--tablet-focal, 50% 50%);
    }
  }

  @media (max-width: 47.99em) {
    object-position: var(--mobile-focal, 50% 50%);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
export const InvitationProse = styled(Text).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-prose",
})`
  white-space: pre-line;
  line-height: 1.8;
  max-width: 65ch;
  text-wrap: pretty;
`;
export const InvitationMap = styled.iframe.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-map",
})`
  border: 0;
  width: 100%;
  height: 280px;
  border-radius: var(--inv-card-radius, 0px);
`;
export const Invitation = styled(Box).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation",
})`
  ${subtleControls}
  --gutter: clamp(24px, 5.55vw, 80px);
  --line: color-mix(in srgb, var(--ink) 22%, var(--paper));
  --muted: color-mix(in srgb, var(--ink) 80%, var(--paper));
  --mantine-color-text: var(--ink);
  --mantine-color-dimmed: var(--muted);
  background-color: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  overflow-x: clip;
  overflow-wrap: anywhere;
  & *,
  & *::before,
  & *::after {
    box-sizing: border-box;
  }
  & h1,
  & h2,
  & h3 {
    text-wrap: balance;
  }
  & a:focus-visible,
  & button:focus-visible {
    outline: 3px solid currentColor;
    outline-offset: 5px;
  }
  & .mantine-Button-root {
    max-width: 100%;
    white-space: normal;
    height: auto;
    min-height: 46px;
    padding-block: 12px;
  }
  & .mantine-Button-label {
    white-space: normal;
  }
  & .mantine-Button-root[data-variant="light"] {
    color: var(--ink);
    background: color-mix(in srgb, var(--ink) 9%, transparent);
    border: 1px solid color-mix(in srgb, var(--ink) 24%, transparent);
  }
  & .mantine-Button-root[data-variant="light"]:hover {
    border-color: var(--ink);
    background: color-mix(in srgb, var(--ink) 14%, transparent);
  }
  & .mantine-Button-root[data-variant="subtle"] {
    color: var(--ink);
    background: transparent;
    border: 1px solid transparent;
    text-decoration: underline;
    text-underline-offset: 4px;
    text-decoration-color: var(--line);
  }
  & .mantine-Button-root[data-variant="subtle"]:hover {
    background: color-mix(in srgb, var(--ink) 7%, transparent);
    text-decoration-color: var(--ink);
  }
  & .mantine-Anchor-root {
    color: var(--ink);
    text-underline-offset: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    & *,
    & *::before,
    & *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
`;
export const InvitationHeader = styled.header.attrs<{ "data-ui"?: string }>({
  "data-ui": INVITATION_DATA_UI.header,
})`
  position: sticky;
  top: 0;
  z-index: 30;
  width: 100%;
  max-width: 100%;
  margin: auto;
  padding-block: 24px;
  padding-inline: max(var(--gutter), calc((100% - 1440px) / 2 + var(--gutter)));
  min-height: 86px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  border-bottom: 1px solid var(--line);
  background-color: transparent;
  transition:
    background-color 240ms ease,
    box-shadow 240ms ease,
    backdrop-filter 240ms ease;
  &[data-scrolled="true"] {
    background-color: color-mix(in srgb, var(--paper) 84%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px color-mix(in srgb, var(--ink) 6%, transparent);
  }
  > span {
    font-size: 13px;
    max-width: 45%;
    min-width: 0;
    font-weight: 600;
  }
  nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px 24px;
    min-width: 0;
  }
  nav > a {
    color: inherit;
    font-size: 12px;
    text-decoration: none;
    padding-block: 8px;
    background: linear-gradient(currentColor, currentColor) no-repeat left
      calc(100% - 4px);
    background-size: 0 1px;
    transition: background-size 200ms ease;
  }
  nav > a[data-active="true"] {
    background-size: 100% 1px;
  }
  nav > button[data-calendar] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 6px;
    border: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
    border-radius: var(--inv-radius, 4px);
    background: none;
    color: inherit;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      background-color 160ms ease;
  }
  @media (hover: hover) and (pointer: fine) {
    nav > a:hover {
      background-size: 100% 1px;
    }
    nav > button[data-calendar]:hover {
      border-color: color-mix(in srgb, var(--ink) 36%, transparent);
      background: color-mix(in srgb, var(--ink) 6%, transparent);
    }
  }
  @media (max-width: 47.99em) {
    padding-block: 14px;
    min-height: 70px;
    gap: 16px;
    > span {
      font-size: 11px;
      max-width: 42%;
    }
    nav {
      gap: 8px 12px;
    }
    nav > a {
      font-size: 11px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
    nav > a:not(:last-of-type) {
      display: none;
    }
  }
`;
export const InvitationHero = styled.section.attrs<{ "data-ui"?: string }>({
  "data-ui": INVITATION_DATA_UI.hero,
})`
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
  max-width: 1440px;
  margin: auto;
  padding: 56px var(--gutter) 68px;
  gap: clamp(32px, 5vw, 80px);
  min-height: 740px;
  align-items: center;
  isolation: isolate;
  & h1 {
    font-size: clamp(3.3rem, 7.2vw, 7.7rem);
    line-height: 1.03;
    letter-spacing: -0.045em;
    font-weight: 400;
    margin: 26px 0;
    max-width: 100%;
  }
  & h1[data-long="true"] {
    font-size: clamp(2.4rem, 4.7vw, 5rem);
    line-height: 1.12;
  }
  & h1 .title-ampersand {
    color: var(--accent);
    font-style: italic;
    font-weight: 400;
    padding-inline: 0.08em;
  }
  &[data-has-photo="false"] {
    display: block;
    min-height: 620px;
  }
  &[data-layout="overlay"][data-has-photo="true"] {
    display: flex;
    align-items: flex-end;
    max-width: 1680px;
    padding-inline: max(
      var(--gutter),
      calc((min(100%, 1680px) - 1440px) / 2 + var(--gutter))
    );
    min-height: 760px;
    background: #141b21;
    color: #fffaf2;
    --hero-ink: #fffaf2;
  }
  &[data-layout="overlay"][data-has-photo="true"]::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: linear-gradient(90deg, #091116e6, #091116bd 55%, #09111655);
  }
  @media (min-width: 48em) and (max-width: 63.99em) {
    &[data-layout="split"] {
      grid-template-columns: minmax(0, 1fr);
      min-height: 0;
      gap: 32px;
      padding-block: 42px;
    }
  }
  @media (max-width: 47.99em) {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
    padding-block: 38px;
    gap: 32px;
    & h1 {
      font-size: clamp(2.8rem, 13vw, 4.8rem);
      letter-spacing: -0.04em;
      margin: 25px 0;
    }
    & h1[data-long="true"] {
      font-size: clamp(2.1rem, 9vw, 3.4rem);
    }
    &[data-has-photo="false"] {
      min-height: 500px;
    }
    &[data-layout="overlay"][data-has-photo="true"] {
      min-height: 690px;
    }
    &[data-layout="overlay"][data-has-photo="true"]::after {
      background: linear-gradient(
        180deg,
        rgba(9, 17, 22, 0.2) 0%,
        rgba(9, 17, 22, 0.48) 44%,
        rgba(9, 17, 22, 0.92) 100%
      );
    }
  }
`;
export const InvitationHeroPhoto = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-hero-photo",
})`
  min-width: 0;
  position: relative;
  height: 100%;
  min-height: 560px;
  overflow: hidden;
  & ${PhotoFrame} {
    position: absolute;
    inset: 0;
  }
  ${InvitationHero}[data-has-photo="false"] & {
    display: none;
  }
  ${InvitationHero}[data-layout="overlay"] & {
    position: absolute;
    inset: 0;
    z-index: -2;
    min-height: 0;
  }
  @media (min-width: 48em) and (max-width: 63.99em) {
    ${InvitationHero}[data-layout="split"] & {
      min-height: 360px;
      height: 420px;
    }
  }
  @media (max-width: 47.99em) {
    min-height: 330px;
    height: 380px;
    ${InvitationHero}[data-layout="overlay"] & {
      height: 100%;
    }
  }
`;
export const InvitationHeroCopy = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-hero-copy",
})`
  position: relative;
  z-index: 1;
  min-width: 0;
  padding-block: 20px;
  ${InvitationHero}[data-has-photo="false"] & {
    max-width: 1000px;
    margin: auto;
    padding-block: 48px;
  }
  ${InvitationHero}[data-layout="overlay"][data-has-photo="true"] & {
    width: 100%;
    max-width: 1000px;
    margin: 0;
  }
  ${InvitationHero}[data-layout="overlay"][data-has-photo="true"] & h1 .title-ampersand {
    color: inherit;
  }
  @media (max-width: 47.99em) {
    padding-block: 0;
    ${InvitationHero}[data-has-photo="false"] & {
      padding-block: 25px;
    }
  }
`;
export const InvitationEyebrow = styled(Text).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-eyebrow",
})`
  text-transform: uppercase;
  letter-spacing: 0.17em;
  font-size: 0.7rem;
  line-height: 1.8;
  font-weight: 600;
  color: var(--hero-ink, var(--accent));
`;
export const InvitationTagline = styled(Title).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-tagline",
})`
  font-size: clamp(1.55rem, 2.3vw, 2.5rem);
  font-weight: 400;
  line-height: 1.3;
  margin-bottom: 20px;
`;
export const HeroDate = styled(Text).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-date",
})`
  margin-top: 30px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.075em;
`;
export const HeroAction = styled.a.attrs<{ "data-ui"?: string }>({
  "data-ui": INVITATION_DATA_UI.action,
})`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
  max-width: 100%;
  margin-top: 30px;
  padding: 14px 24px;
  min-height: 48px;
  border: 1px solid var(--ink);
  border-radius: var(--inv-pill-radius, 0px);
  background: var(--ink);
  color: var(--paper);
  text-decoration: none;
  font-size: 0.8rem;
  font-family: var(--mantine-font-family);
  text-align: left;
  ${InvitationHero}[data-layout="overlay"][data-has-photo="true"] & {
    background: #10171a65;
    color: #fffaf2;
    border-color: #fffaf2;
  }
  &:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
`;
export const DateBand = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-date-band",
})`
  padding-block: 26px;
  padding-inline: max(var(--gutter), calc((100% - 1440px) / 2 + var(--gutter)));
  background: var(--accent);
  color: var(--on-accent);
  font-size: clamp(1.8rem, 4.6vw, 4.6rem);
  font-weight: 400;
  letter-spacing: -0.04em;
  line-height: 1.2;
  white-space: pre-line;
`;
export const InvitationMain = styled.main`
  max-width: 1440px;
  margin: auto;
  padding: 76px var(--gutter);
  @media (max-width: 47.99em) {
    padding-block: 44px;
  }
`;
export const InvitationSection = styled(Card).attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-section",
})`
  position: relative;
  min-width: 0;
  background: transparent;
  color: var(--ink);
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 0;
  padding: 34px 0 16px;
  box-shadow: none;
  scroll-margin-top: 96px;
  overflow: visible;
  &[data-kind="contact"],
  &[data-kind="timeline"],
  &[data-kind="text"],
  &[data-kind="gallery"],
  &[data-span="full"] {
    grid-column: 1 / -1;
  }
  & h2 {
    font-size: clamp(1.8rem, 2.8vw, 2.9rem);
    font-weight: 400;
    line-height: 1.15;
  }
  & h3 {
    font-weight: 400;
    font-size: clamp(1.4rem, 2vw, 2rem);
    line-height: 1.25;
  }
  &[data-kind="text"] {
    padding-block: 46px;
  }
  &[data-kind="contact"] {
    padding: 44px;
    background: linear-gradient(
      160deg,
      var(--surface),
      color-mix(in srgb, var(--surface) 74%, var(--paper))
    );
    border: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);
    border-radius: var(--inv-card-radius, 0px);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 24%, transparent),
      0 12px 32px -24px color-mix(in srgb, var(--ink) 18%, transparent);
  }
  @media (max-width: 47.99em) {
    padding-top: 28px;
    scroll-margin-top: 84px;
    &[data-kind="contact"] {
      padding: 28px 24px;
    }
  }
`;
export const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 54px 64px;
  @media (max-width: 47.99em) {
    grid-template-columns: minmax(0, 1fr);
    gap: 35px;
  }
`;
export const SectionHeading = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 28px;
  &[data-has-icon="true"] {
    align-items: center;
  }
  > h2 {
    flex: 1 1 160px;
    min-width: 0;
  }
  > button {
    flex: 0 1 auto;
  }
  > span {
    font: 11px var(--mantine-font-family);
    letter-spacing: 1px;
    color: var(--muted);
    flex-shrink: 0;
  }
`;
export const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 28px 36px;
`;
export const GalleryButton = styled.button.attrs<{ "data-ui"?: string }>({
  "data-ui": "gallery-item",
})`
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: zoom-in;
  text-align: left;
  min-width: 0;
  border-radius: inherit;
  overflow: hidden;
`;
export const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  & > * {
    min-width: 0;
    border-radius: var(--inv-card-radius, 0px);
    overflow: hidden;
  }
  & ${PhotoFrame} {
    display: block;
    aspect-ratio: 4 / 5;
    min-width: 0;
    overflow: hidden;
  }
  &[data-count="1"] {
    grid-template-columns: minmax(0, 1fr);
  }
  &[data-count="1"] ${PhotoFrame} {
    aspect-ratio: 16 / 10;
  }
  @media (min-width: 48em) {
    &[data-count="3"] {
      grid-template-columns: 1.25fr 1fr;
      grid-template-rows: repeat(2, minmax(220px, 1fr));
    }
    &[data-count="3"] > :first-child {
      grid-row: span 2;
    }
    &[data-count="3"] > :first-child ${PhotoFrame} {
      aspect-ratio: auto;
      height: 100%;
      min-height: 464px;
    }
    &[data-count="3"] > :not(:first-child) ${PhotoFrame} {
      aspect-ratio: 4 / 3;
      height: 100%;
    }
  }
  &[data-odd-many="true"] > :last-child {
    grid-column: 1 / -1;
  }
  &[data-odd-many="true"] > :last-child ${PhotoFrame} {
    aspect-ratio: 16 / 9;
  }
  & ${InvitationPhoto} {
    transition:
      opacity 280ms ease-out,
      transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (hover: hover) and (pointer: fine) {
    &
      ${PhotoFrame}:hover
      ${InvitationPhoto},
      &
      button:hover
      ${InvitationPhoto},
      &
      button:focus-visible
      ${InvitationPhoto} {
      transform: scale(1.035);
    }
  }
  @media (max-width: 30em) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
export const Lightbox = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "gallery-lightbox",
})`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: clamp(16px, 4vw, 40px);
  background: rgba(10, 14, 18, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #fffaf2;
  & .lightbox-stage {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    max-width: min(1200px, 100%);
    max-height: 100%;
  }
  & .lightbox-figure {
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    max-width: 100%;
  }
  & img {
    display: block;
    max-width: min(90vw, 1120px);
    max-height: 78vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: var(--inv-card-radius, 2px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  }
  & .lightbox-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    font-size: 13px;
    letter-spacing: 0.04em;
    color: rgba(255, 250, 242, 0.86);
    text-align: center;
  }
  & .lightbox-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  & button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
    border: 1px solid rgba(255, 250, 242, 0.28);
    border-radius: var(--inv-pill-radius, 4px);
    background: rgba(16, 22, 27, 0.65);
    color: #fffaf2;
    font: inherit;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      border-color 160ms ease;
  }
  & button:hover {
    background: rgba(255, 250, 242, 0.16);
    border-color: rgba(255, 250, 242, 0.72);
  }
  & .lightbox-close {
    position: fixed;
    top: 16px;
    right: 16px;
  }
`;
export const Schedule = styled.ol`
  list-style: none;
  padding: 0;
  margin: 38px 0 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
  gap: 32px;
  & li {
    position: relative;
    min-width: 0;
    padding-top: 24px;
    border-top: 1px dashed color-mix(in srgb, var(--accent) 36%, var(--line));
  }
  & li::before {
    content: "";
    position: absolute;
    top: -5px;
    left: 0;
    width: 9px;
    height: 9px;
    background: var(--accent);
    border: 2px solid var(--paper);
  }
  & .event-time {
    color: var(--accent);
    font: 400 clamp(2rem, 3vw, 2.7rem)/1.2 var(--mantine-font-family-headings);
    margin-bottom: 18px;
    display: block;
    font-variant-numeric: lining-nums tabular-nums;
  }
  & h3 {
    margin-bottom: 8px;
  }
  @media (max-width: 47.99em) {
    gap: 24px;
    & li {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 18px;
      align-items: baseline;
    }
    & .event-time {
      font-size: 1.8rem;
      margin: 0;
      white-space: nowrap;
    }
  }
`;
export const Ornament = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  color: var(--hero-ink, var(--accent));
  margin-bottom: 28px;
  & span {
    width: 32px;
    height: 1px;
    background: currentColor;
    opacity: 0.55;
  }
`;
export const InvitationFooter = styled.footer`
  max-width: 1440px;
  margin: auto;
  padding: 28px var(--gutter) 40px;
  text-align: center;
  font-size: 14px;
  border-top: 1px solid var(--line);
`;
export const InvitationFooterPromo = styled.a.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-footer-promo",
})`
  display: inline-block;
  margin-top: 12px;
  padding-block: 6px;
  font-size: 12px;
  letter-spacing: 0.02em;
  color: var(--muted);
  text-decoration: none;
  transition: color 160ms ease;

  &:first-child {
    margin-top: 0;
  }

  &:hover,
  &:focus-visible {
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
export const InvitationResponse = styled.section.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-response",
})`
  max-width: 720px;
  margin: 0 auto;
  padding: 36px var(--gutter) 56px;
  border-top: 1px solid var(--line);
  scroll-margin-top: 96px;
  & h2 {
    font: 400 clamp(1.65rem, 3vw, 2.35rem)/1.15
      var(--mantine-font-family-headings);
    margin: 0 0 12px;
  }
  & :where(label) {
    display: block;
    margin: 12px 0;
    font-size: 14px;
  }
  & :where(p) {
    line-height: 1.55;
    margin: 0 0 10px;
  }
  & :where(p[role="alert"], p[role="status"]) {
    padding: 10px 14px;
    margin: 12px 0;
    border-radius: var(--inv-card-radius, 6px);
    background: var(--surface);
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    font-size: 13.5px;
  }
  & :where(input:not([type="radio"]):not([type="checkbox"]), select, textarea) {
    display: block;
    width: 100%;
    padding: 9px 12px;
    margin-top: 6px;
    border: 1px solid var(--line);
    border-radius: var(--inv-radius, 4px);
    color: var(--ink);
    background: var(--surface);
    font: inherit;
    font-size: 14px;
  }
  & :where(input[type="radio"], input[type="checkbox"]) {
    width: auto;
    display: inline-block;
    margin: 0;
    padding: 0;
    accent-color: var(--accent);
  }
  & :where(textarea) {
    min-height: 76px;
    resize: vertical;
  }
  & :where(fieldset) {
    border: 1px solid var(--line);
    border-radius: var(--inv-card-radius, 6px);
    margin: 14px 0;
    padding: 14px 16px;
    min-width: 0;
    background: var(--surface);
  }
  & :where(legend) {
    padding-inline: 6px;
    font-weight: 600;
    font-size: 14px;
  }
  & :where(button) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 38px;
    padding: 8px 16px;
    font: inherit;
    font-size: 13.5px;
    font-weight: 500;
    background: var(--ink);
    color: var(--paper);
    border: 1px solid var(--ink);
    border-radius: var(--inv-pill-radius, 4px);
    margin: 0;
    cursor: pointer;
    transition:
      opacity 140ms ease,
      background-color 140ms ease,
      border-color 140ms ease;
  }
  & :where(button[type="button"]) {
    color: var(--ink);
    background: transparent;
    border-color: var(--line);
  }
  & :where(button[type="button"]:hover:not(:disabled)) {
    border-color: var(--ink);
    background: color-mix(in srgb, var(--ink) 6%, transparent);
  }
  & :where(button:not([type="button"]):hover:not(:disabled)) {
    opacity: 0.9;
  }
  & :where(button:disabled) {
    opacity: 0.45;
    cursor: default;
  }
  & :is(input, select, textarea):focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  @media (max-width: 47.99em) {
    padding-block: 28px 44px;
    scroll-margin-top: 84px;
  }
`;

/** Layout identity is independent of colors and never injects event-specific copy. */
export const ThemedInvitation = styled(Invitation)`
  &::after {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
    background-image: ${GRAIN_SVG};
    background-repeat: repeat;
    opacity: 0.035;
    mix-blend-mode: multiply;
  }
  &[data-color-scheme="dark"]::after {
    opacity: 0.045;
    mix-blend-mode: screen;
  }
  &[data-theme="editorial"]::after {
    opacity: 0.014;
  }
  @media print {
    &::after {
      display: none;
    }
  }

  &[data-theme="classic"],
  &[data-theme="editorial"] {
    --inv-radius: 0px;
    --inv-card-radius: 0px;
    --inv-pill-radius: 0px;
  }
  &[data-theme="botanical"],
  &[data-theme="evening"] {
    --inv-radius: 2px;
    --inv-card-radius: 4px;
    --inv-pill-radius: 3px;
  }
  &[data-theme="celebration"] {
    --inv-radius: 8px;
    --inv-card-radius: 12px;
    --inv-pill-radius: 999px;
  }

  &[data-theme="classic"] {
    background-image: radial-gradient(
      ellipse 75% 420px at 50% 0%,
      color-mix(in srgb, var(--accent) 9%, transparent),
      transparent 72%
    );
    background-repeat: no-repeat;
  }
  &[data-theme="botanical"] {
    background-image:
      radial-gradient(
        ellipse 56% 520px at 92% 4%,
        color-mix(in srgb, var(--accent) 11%, transparent),
        transparent 68%
      ),
      radial-gradient(
        ellipse 60% 480px at 8% 85%,
        color-mix(in srgb, var(--surface) 75%, transparent),
        transparent 70%
      );
    background-repeat: no-repeat;
  }
  &[data-theme="editorial"] {
    background-image: repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent calc(25% - 1px),
      color-mix(in srgb, var(--ink) 4%, transparent) calc(25% - 1px),
      color-mix(in srgb, var(--ink) 4%, transparent) 25%
    );
    background-size: min(100%, 1440px) 100%;
    background-position: center top;
    background-repeat: no-repeat;
  }
  &[data-theme="evening"][data-color-scheme="dark"] {
    background-image:
      radial-gradient(
        ellipse 65% 480px at 50% 0%,
        color-mix(in srgb, var(--accent) 12%, transparent),
        transparent 70%
      ),
      radial-gradient(
        ellipse 50% 420px at 85% 60%,
        color-mix(in srgb, var(--accent) 6%, transparent),
        transparent 72%
      );
    background-repeat: no-repeat;
  }
  &[data-theme="evening"][data-color-scheme="light"] {
    background-image: radial-gradient(
      ellipse 65% 440px at 50% 0%,
      color-mix(in srgb, var(--accent) 7%, transparent),
      transparent 70%
    );
    background-repeat: no-repeat;
  }
  &[data-theme="celebration"] {
    background-image:
      radial-gradient(
        ellipse 58% 460px at 88% 8%,
        color-mix(in srgb, var(--accent) 11%, transparent),
        transparent 68%
      ),
      radial-gradient(
        ellipse 62% 520px at 12% 72%,
        color-mix(in srgb, var(--surface) 82%, transparent),
        transparent 72%
      );
    background-repeat: no-repeat;
  }

  &[data-theme="classic"] ${InvitationHero}[data-layout="split"] {
    display: flex;
    flex-direction: column;
    gap: 36px;
  }
  &[data-theme="classic"] ${InvitationHeroCopy} {
    width: 100%;
    text-align: center;
    max-width: 1120px;
    margin: auto;
    padding-block: 36px;
  }
  &[data-theme="classic"] ${InvitationHero} h1 {
    font-size: clamp(3.5rem, 8.6vw, 8.8rem);
  }
  &[data-theme="classic"] ${InvitationHero} h1[data-long="true"] {
    font-size: clamp(2.4rem, 5.3vw, 5.4rem);
  }
  &[data-theme="classic"] ${InvitationHeroCopy} ${InvitationProse},
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] ${InvitationProse} {
    margin-inline: auto;
  }
  &[data-theme="classic"] ${Ornament} {
    justify-content: center;
  }
  &[data-theme="classic"] ${Ornament} svg {
    border: 1px solid var(--line);
    border-radius: 50%;
    padding: 15px;
    width: 68px;
    height: 68px;
  }
  &[data-theme="classic"] ${Ornament} span {
    display: none;
  }
  &[data-theme="classic"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
    width: 100%;
    max-width: 1040px;
    min-height: 360px;
  }
  &[data-theme="classic"]:not([data-decorations="none"])
    ${InvitationHero}[data-layout="split"]
    ${InvitationHeroPhoto} {
    outline: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
    outline-offset: 10px;
  }
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] {
    text-align: center;
  }
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] ${SectionHeading} {
    justify-content: center;
  }
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] ${SectionHeading} > h2 {
    flex: 0 1 auto;
  }
  &[data-theme="classic"] ${Schedule} li::before {
    transform: rotate(45deg);
  }

  &[data-theme="botanical"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
    border-radius: 0 140px 0 0;
  }
  &[data-theme="botanical"]:not([data-decorations="none"])
    ${InvitationHero}[data-layout="split"]
    ${InvitationHeroPhoto} {
    box-shadow:
      12px 12px 0 -1px var(--paper),
      12px 12px 0 0 color-mix(in srgb, var(--accent) 38%, transparent);
  }
  &[data-theme="botanical"] ${InvitationHero} h1 {
    font-size: clamp(3.6rem, 8.2vw, 8rem);
    font-weight: 400;
  }
  &[data-theme="botanical"] ${InvitationHero} h1[data-long="true"] {
    font-size: clamp(2.5rem, 5.5vw, 5rem);
  }
  &[data-theme="botanical"] ${Ornament} {
    justify-content: flex-end;
  }
  &[data-theme="botanical"] ${Ornament} span {
    display: none;
  }
  &[data-theme="botanical"] ${Ornament} svg {
    width: 86px;
    height: 76px;
  }
  &[data-theme="botanical"] ${InvitationSection}[data-kind="timeline"] {
    padding: 40px;
    background: linear-gradient(
      160deg,
      var(--surface),
      color-mix(in srgb, var(--surface) 74%, var(--paper))
    );
    border: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);
    border-radius: var(--inv-card-radius, 4px);
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 24%, transparent),
      0 12px 32px -24px color-mix(in srgb, var(--ink) 18%, transparent);
  }
  &[data-theme="botanical"] ${Schedule} li::before {
    border-radius: 50%;
    border-color: var(--surface);
  }

  &[data-theme="editorial"] ${InvitationHero} {
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    min-height: 610px;
  }
  &[data-theme="editorial"] ${InvitationHero} h1 {
    font-weight: 600;
    letter-spacing: -0.065em;
    font-size: clamp(3.2rem, 7vw, 7rem);
  }
  &[data-theme="editorial"] ${InvitationHero} h1[data-long="true"] {
    font-size: clamp(2.4rem, 4.9vw, 5.1rem);
  }
  &[data-theme="editorial"] ${InvitationHeroPhoto} {
    min-height: 450px;
  }
  &[data-theme="editorial"] ${InvitationHero}[data-layout="split"] ${HeroAction} {
    border: 0;
    border-bottom: 1px solid var(--ink);
    border-radius: 0;
    background: transparent;
    color: var(--ink);
    padding-inline: 0;
  }
  &[data-theme="editorial"] ${SectionHeading} > span {
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: var(--accent);
    font-weight: 600;
  }
  &[data-theme="editorial"] ${InvitationSection} h2 {
    font-weight: 600;
    letter-spacing: -0.04em;
    font-size: clamp(1.8rem, 2.6vw, 2.5rem);
  }
  &[data-theme="editorial"] ${InvitationSection} h3 {
    font-family: var(--mantine-font-family);
    font-size: 1.4rem;
    font-weight: 600;
  }
  &[data-theme="editorial"] ${HeroDate} {
    display: none;
  }
  &[data-theme="editorial"] ${Schedule} li::before {
    border-radius: 0;
    border: 0;
    top: -4.5px;
  }

  &[data-theme="evening"] ${InvitationHero} h1 {
    font-weight: 400;
    letter-spacing: -0.035em;
  }
  &[data-theme="evening"] ${InvitationHero}[data-has-photo="false"] {
    background: var(--surface);
  }
  &[data-theme="evening"] ${InvitationHeroCopy} {
    text-align: left;
  }
  &[data-theme="evening"] ${InvitationHero}[data-layout="overlay"][data-has-photo="true"] ${InvitationHeroCopy} {
    max-width: 1120px;
    padding-top: 180px;
  }
  &[data-theme="evening"]
    ${InvitationHero}[data-layout="overlay"][data-has-photo="true"]
    ${HeroAction} {
    border-color: var(--accent);
    background: rgba(16, 23, 26, 0.48);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent),
      0 10px 28px color-mix(in srgb, var(--accent) 18%, transparent);
  }
  &[data-theme="evening"][data-color-scheme="dark"]
    ${InvitationHero}[data-layout="overlay"][data-has-photo="true"]::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 110px;
    z-index: 0;
    pointer-events: none;
    background: linear-gradient(180deg, transparent, var(--paper));
  }
  &[data-theme="evening"] ${InvitationMain} {
    padding-top: 80px;
  }
  &[data-theme="evening"] ${Schedule} li::before {
    border-radius: 50%;
    border: 0;
    top: -4.5px;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 24%, transparent);
  }

  &[data-theme="celebration"] ${InvitationHero}[data-layout="split"][data-has-photo="true"] {
    gap: 0;
    padding: 0;
  }
  &[data-theme="celebration"] ${InvitationHero}[data-layout="split"][data-has-photo="true"] ${InvitationHeroCopy} {
    padding: 64px var(--gutter);
  }
  &[data-theme="celebration"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
    border: clamp(24px, 4vw, 56px) solid var(--surface);
    background: linear-gradient(
      145deg,
      var(--surface),
      color-mix(in srgb, var(--accent) 14%, var(--surface))
    );
    border-radius: 14px;
    min-height: 730px;
  }
  &[data-theme="celebration"]
    ${InvitationHero}[data-layout="split"]
    ${InvitationHeroPhoto}
    ${PhotoFrame} {
    border-radius: 14px;
  }
  &[data-theme="celebration"] ${InvitationHero} h1 {
    line-height: 1.06;
    letter-spacing: -0.045em;
  }
  &[data-theme="celebration"] ${Ornament} span {
    display: none;
  }
  &[data-theme="celebration"] ${Ornament} svg {
    width: 30px;
    height: 30px;
  }
  &[data-theme="celebration"] ${InvitationSection}[data-kind="timeline"] {
    padding: 40px;
    background: linear-gradient(
      160deg,
      var(--surface),
      color-mix(in srgb, var(--surface) 74%, var(--paper))
    );
    border: 1px solid color-mix(in srgb, var(--ink) 9%, transparent);
    border-radius: 14px;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, #ffffff 24%, transparent),
      0 12px 32px -24px color-mix(in srgb, var(--ink) 18%, transparent);
  }
  &[data-theme="celebration"] ${InvitationSection}[data-kind="contact"],
  &[data-theme="celebration"] ${Gallery} > * {
    border-radius: 14px;
  }
  &[data-theme="celebration"] ${InvitationSection} h2 {
    font-size: clamp(1.8rem, 2.5vw, 2.5rem);
  }
  &[data-theme="celebration"] ${Schedule} li::before {
    border-radius: 50%;
    border-color: var(--surface);
  }
  &[data-theme="celebration"] ${Schedule} .event-time {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 13%, var(--paper));
    font-size: clamp(1.35rem, 2.2vw, 1.8rem);
    line-height: 1.3;
  }

  &[data-decorations="none"] ${Ornament} {
    display: none;
  }
  &[data-decorations="full"] ${InvitationHeroCopy}::before {
    content: "";
    display: block;
    width: 64px;
    height: 1px;
    background: var(--hero-ink, var(--accent));
    margin-bottom: 26px;
  }
  &[data-theme="classic"][data-decorations="full"]
    ${InvitationHeroCopy}::before {
    margin-inline: auto;
  }
  &[data-decorations="full"]:not([data-theme="botanical"]):not(
      [data-theme="celebration"]
    )
    ${InvitationSection}:not([data-kind="contact"]),
  &[data-decorations="full"][data-theme="botanical"]
    ${InvitationSection}:not([data-kind="contact"]):not([data-kind="timeline"]),
  &[data-decorations="full"][data-theme="celebration"]
    ${InvitationSection}:not([data-kind="contact"]):not(
      [data-kind="timeline"]
    ) {
    border-top: 2px solid var(--accent);
  }

  @media (prefers-reduced-motion: no-preference) {
    &[data-motion-ready="true"] ${Ornament} svg path {
      stroke-dasharray: 620;
      animation: ${ornamentDraw} 1.15s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    &[data-motion-ready="true"]
      ${InvitationHero}[data-layout="split"]
      ${InvitationHeroPhoto}
      ${InvitationPhoto} {
      animation: ${heroPhotoSettle} 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    &[data-motion-ready="true"][data-theme="evening"][data-color-scheme="dark"]
      ${InvitationHero}[data-layout="overlay"][data-has-photo="true"]
      ${InvitationHeroPhoto}
      ${InvitationPhoto} {
      animation: ${eveningKenBurns} 20s ease-in-out infinite alternate;
      will-change: transform;
    }
    &[data-motion-ready="true"]
      ${InvitationSection}:not([data-kind="contact"])::before {
      content: "";
      position: absolute;
      top: -1px;
      left: 0;
      right: 0;
      height: 1px;
      background: var(--line);
      transform: scaleX(1);
      transform-origin: left;
      pointer-events: none;
    }
    &[data-motion-ready="true"]
      ${InvitationSection}:not([data-kind="contact"]) {
      border-top-color: transparent;
    }
    &[data-motion-ready="true"]
      ${InvitationSection}:not([data-kind="contact"])[data-in-view="true"]::before {
      animation: ${hairlineReveal} 680ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    &[data-motion-ready="true"][data-decorations="full"]
      ${InvitationSection}:not([data-kind="contact"])::before {
      top: -2px;
      height: 2px;
      background: var(--accent);
    }
    &[data-motion-ready="true"][data-theme="botanical"]
      ${InvitationSection}[data-kind="timeline"]::before,
    &[data-motion-ready="true"][data-theme="celebration"]
      ${InvitationSection}[data-kind="timeline"]::before {
      display: none;
    }
    &[data-motion-ready="true"][data-theme="botanical"]
      ${InvitationSection}[data-kind="timeline"],
    &[data-motion-ready="true"][data-theme="celebration"]
      ${InvitationSection}[data-kind="timeline"] {
      border-top-color: color-mix(in srgb, var(--ink) 9%, transparent);
    }
  }

  @media (min-width: 1681px) {
    &[data-color-scheme="dark"]
      ${InvitationHero}[data-layout="overlay"][data-has-photo="true"] {
      background: transparent;
    }
    &[data-color-scheme="dark"]
      ${InvitationHero}[data-layout="overlay"][data-has-photo="true"]::after,
    &[data-color-scheme="dark"]
      ${InvitationHero}[data-layout="overlay"][data-has-photo="true"]
      ${InvitationHeroPhoto} {
      -webkit-mask-image: linear-gradient(
        90deg,
        transparent 0%,
        #000 140px,
        #000 calc(100% - 140px),
        transparent 100%
      );
      mask-image: linear-gradient(
        90deg,
        transparent 0%,
        #000 140px,
        #000 calc(100% - 140px),
        transparent 100%
      );
    }
    &[data-color-scheme="light"]
      ${InvitationHero}[data-layout="overlay"][data-has-photo="true"] {
      background: transparent;
      box-shadow: 0 24px 60px -32px rgba(20, 27, 33, 0.35);
    }
    &[data-color-scheme="light"]
      ${InvitationHero}[data-layout="overlay"][data-has-photo="true"]
      ${InvitationHeroPhoto} {
      -webkit-mask-image: none;
      mask-image: none;
    }
  }

  @media (min-width: 48em) and (max-width: 63.99em) {
    &[data-theme="editorial"] ${InvitationHero}[data-layout="split"] {
      grid-template-columns: minmax(0, 1fr);
      min-height: 0;
    }
    &[data-theme="editorial"]
      ${InvitationHero}[data-layout="split"]
      ${InvitationHeroPhoto} {
      min-height: 360px;
      height: 420px;
    }
    &[data-theme="celebration"]
      ${InvitationHero}[data-layout="split"][data-has-photo="true"] {
      grid-template-columns: minmax(0, 1fr);
      min-height: 0;
      gap: 0;
      padding: 0;
    }
    &[data-theme="celebration"]
      ${InvitationHero}[data-layout="split"][data-has-photo="true"]
      ${InvitationHeroCopy} {
      padding: 40px var(--gutter);
    }
    &[data-theme="celebration"]
      ${InvitationHero}[data-layout="split"]
      ${InvitationHeroPhoto} {
      min-height: 380px;
      height: 440px;
    }
  }

  @media (max-width: 47.99em) {
    && ${InvitationHero} {
      grid-template-columns: minmax(0, 1fr);
    }
    && ${InvitationHero} h1 {
      font-size: clamp(2.8rem, 13vw, 4.7rem);
    }
    && ${InvitationHero} h1[data-long="true"] {
      font-size: clamp(2.1rem, 9vw, 3.4rem);
    }
    &[data-theme="classic"] ${InvitationHeroCopy} {
      padding-block: 16px;
    }
    &[data-theme="classic"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
      min-height: 280px;
      height: 320px;
    }
    &[data-theme="botanical"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
      border-radius: 0 90px 0 0;
    }
    &[data-theme="botanical"] ${Ornament} {
      position: absolute;
      right: 0;
      top: -10px;
      opacity: 0.55;
      pointer-events: none;
    }
    &[data-theme="botanical"] ${Ornament} svg {
      width: 54px;
      height: 48px;
    }
    &[data-theme="botanical"] ${InvitationEyebrow} {
      padding-right: 60px;
    }
    &[data-theme="botanical"] ${InvitationSection}[data-kind="timeline"],
    &[data-theme="celebration"] ${InvitationSection}[data-kind="timeline"] {
      padding: 28px 24px;
    }
    &[data-theme="editorial"] ${InvitationHeroPhoto} {
      min-height: 310px;
      height: 340px;
    }
    &[data-theme="evening"] ${InvitationHero}[data-layout="overlay"][data-has-photo="true"] ${InvitationHeroCopy} {
      padding-top: 150px;
    }
    &[data-theme="evening"] ${InvitationMain} {
      padding-top: 44px;
    }
    &[data-theme="celebration"] ${InvitationHero}[data-layout="split"][data-has-photo="true"] ${InvitationHeroCopy} {
      padding: 38px var(--gutter);
    }
    &[data-theme="celebration"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
      min-height: 360px;
      height: 420px;
    }
    &[data-theme="celebration"] ${Schedule} .event-time {
      margin: 0;
      font-size: 1.25rem;
      padding: 3px 12px;
    }
  }
`;
