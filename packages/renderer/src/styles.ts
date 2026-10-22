"use client";
import { Box, Card, Text, Title } from "@mantine/core";
import { subtleControls } from "@invitations/ui/motion-styles";
import { styled } from "styled-components";

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
  "data-ui": "invitation-photo-fallback",
})`
  height: 100%;
  min-height: 240px;
  background: linear-gradient(135deg, var(--surface), var(--paper));
`;
export const PhotoFrame = styled.picture`
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  overflow: hidden;
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
  }
  @media (min-width: 48em) and (max-width: 63.99em) {
    & {
      object-position: var(--tablet-focal, 50% 50%);
    }
  }

  @media (max-width: 47.99em) {
    object-position: var(--mobile-focal, 50% 50%);
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
  border-radius: 2px;
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
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
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
  & .mantine-Button-root[data-variant="light"],
  & .mantine-Button-root[data-variant="subtle"] {
    color: var(--ink);
    background: color-mix(in srgb, var(--ink) 7%, var(--paper));
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
  "data-ui": "invitation-header",
})`
  max-width: 1440px;
  margin: auto;
  padding: 24px var(--gutter);
  min-height: 86px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  border-bottom: 1px solid var(--line);
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
  a {
    color: inherit;
    font-size: 12px;
    text-decoration: none;
    padding-block: 8px;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 5px;
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
      gap: 8px 16px;
    }
    nav a {
      font-size: 11px;
    }
    nav a:not(:last-child) {
      display: none;
    }
  }
`;
export const InvitationHero = styled.section.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-hero",
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
  }
  &[data-has-photo="false"] {
    display: block;
    min-height: 620px;
  }
  &[data-layout="overlay"][data-has-photo="true"] {
    display: flex;
    align-items: flex-end;
    max-width: none;
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
      background: linear-gradient(0deg, #091116e8, #091116b8);
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
  & picture {
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
  "data-ui": "invitation-action",
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
  padding: 26px var(--gutter);
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
  scroll-margin-top: 28px;
  overflow: visible;
  &[data-kind="contact"],
  &[data-kind="timeline"],
  &[data-kind="text"],
  &[data-kind="gallery"] {
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
    background: var(--surface);
    border-top: 0;
  }
  @media (max-width: 47.99em) {
    padding-top: 28px;
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
export const Gallery = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  & picture {
    display: block;
    aspect-ratio: 4 / 5;
    min-width: 0;
    overflow: hidden;
  }
  @media (max-width: 30em) {
    grid-template-columns: minmax(0, 1fr);
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
    min-width: 0;
    padding-top: 24px;
    border-top: 1px solid var(--line);
  }
  & .event-time {
    color: var(--accent);
    font: 400 clamp(2rem, 3vw, 2.7rem)/1.2 var(--mantine-font-family-headings);
    margin-bottom: 18px;
    display: block;
    font-variant-numeric: tabular-nums;
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
export const InvitationResponse = styled.section.attrs<{ "data-ui"?: string }>({
  "data-ui": "invitation-response",
})`
  max-width: 950px;
  margin: 0 auto;
  padding: 48px var(--gutter) 76px;
  scroll-margin-top: 24px;
  & h2 {
    font: 400 clamp(2rem, 4vw, 3rem)/1.15 var(--mantine-font-family-headings);
  }
  & label {
    display: block;
    margin: 16px 0;
    font-size: 15px;
  }
  & p {
    line-height: 1.7;
  }
  & input,
  & select,
  & textarea {
    display: block;
    width: 100%;
    padding: 12px;
    margin-top: 8px;
    border: 1px solid var(--line);
    border-radius: 2px;
    color: var(--ink);
    background: var(--surface);
    font: inherit;
  }
  & textarea {
    min-height: 100px;
  }
  & fieldset {
    border: 1px solid var(--line);
    margin: 24px 0;
    padding: 20px;
    min-width: 0;
  }
  & legend {
    padding-inline: 8px;
  }
  & button {
    min-height: 46px;
    padding: 12px 20px;
    font: inherit;
    font-size: 14px;
    background: var(--ink);
    color: var(--paper);
    border: 1px solid var(--ink);
    margin: 0 12px 12px 0;
    cursor: pointer;
  }
  & button[type="button"] {
    color: var(--ink);
    background: transparent;
  }
  & button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  & :is(input, select, textarea):focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
`;

/** Layout identity is independent of colors and never injects event-specific copy. */
export const ThemedInvitation = styled(Invitation)`
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
  &[data-theme="classic"] ${InvitationProse} {
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
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] {
    text-align: center;
  }
  &[data-theme="classic"] ${InvitationSection}[data-kind="text"] ${SectionHeading} {
    justify-content: center;
  }

  &[data-theme="botanical"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
    border-radius: 0 140px 0 0;
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
    background: var(--surface);
    border: 0;
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
    background: transparent;
    color: var(--ink);
    padding-inline: 0;
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
  &[data-theme="evening"] ${InvitationMain} {
    padding-top: 80px;
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
    background: var(--surface);
    min-height: 730px;
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
    background: var(--surface);
    border: 0;
  }
  &[data-theme="celebration"] ${InvitationSection} h2 {
    font-size: clamp(1.8rem, 2.5vw, 2.5rem);
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
  &[data-decorations="full"] ${InvitationSection} {
    border-top: 2px solid var(--accent);
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
      padding: 38px 24px;
    }
    &[data-theme="celebration"] ${InvitationHero}[data-layout="split"] ${InvitationHeroPhoto} {
      min-height: 360px;
      height: 420px;
    }
  }
`;
