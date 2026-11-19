"use client";
import { keyframes, styled } from "styled-components";
import { Card, Container } from "@mantine/core";

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const Page = styled.div`
  position: relative;
  min-height: 100vh;
  overflow-x: clip;
  background-color: var(--panel-page);
  background-image:
    radial-gradient(
      ellipse 70% 420px at 16% -80px,
      var(--panel-glow-primary),
      transparent 70%
    ),
    radial-gradient(
      ellipse 60% 380px at 86% -60px,
      var(--panel-glow-secondary),
      transparent 72%
    );
  color: var(--panel-text);
  &::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--panel-top-bar);
    z-index: 50;
    pointer-events: none;
  }
  &::after {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 420px;
    background-image: radial-gradient(
      var(--panel-dot-grid) 1px,
      transparent 1px
    );
    background-size: 24px 24px;
    mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 100%);
    pointer-events: none;
    z-index: 0;
  }
`;
export const Content = styled(Container)`
  position: relative;
  z-index: 1;
  padding-block: 22px 40px;
  @media (max-width: 40em) {
    padding-block: 18px 28px;
  }
`;
export const Header = styled.header`
  position: relative;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--panel-separator);
  @media (max-width: 40em) {
    flex-wrap: wrap;
    gap: 12px;
  }
`;
export const Hero = styled.section`
  margin-block: 28px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  animation: ${fadeUp} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
  & h1 {
    font-size: clamp(1.75rem, 3vw, 2.25rem);
    letter-spacing: -0.03em;
    line-height: 1.15;
  }
  @media (max-width: 48em) {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
export const Stats = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
  padding: 12px 20px;
  background: var(--panel-surface);
  border: 1px solid var(--panel-card-border);
  box-shadow: var(--panel-card-shadow);
  border-radius: 16px;
  max-width: 100%;
  & > div + div {
    padding-left: 20px;
    border-left: 1px solid var(--panel-separator);
  }
  @media (max-width: 40em) {
    width: 100%;
    gap: 16px;
    padding: 12px 16px;
    & > div {
      flex: 1;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    & > div + div {
      padding-left: 16px;
    }
  }
  & strong {
    display: block;
    font-size: 24px;
    line-height: 1.2;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
`;
export const StatLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;
export const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--panel-status-live);
  flex-shrink: 0;
`;
export const CardOpenCue = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--panel-accent);
  opacity: 0;
  transform: translate(-3px, 3px);
  transition:
    opacity 0.18s,
    transform 0.18s;
  flex-shrink: 0;
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
  }
`;
export const ProjectCard = styled(Card)`
  position: relative;
  overflow: hidden;
  border: 1px solid var(--panel-card-border);
  border-radius: 18px;
  background: var(--panel-surface);
  box-shadow: var(--panel-card-shadow);
  padding: 20px;
  min-width: 0;
  cursor: pointer;
  animation: ${fadeUp} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--card-delay, 0ms);
  transition:
    box-shadow 0.18s,
    border-color 0.18s,
    transform 0.18s;
  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: var(--panel-status-draft);
    opacity: 0.45;
    transition: opacity 0.18s;
  }
  &[data-status="live"]::before {
    background: linear-gradient(90deg, var(--panel-status-live), #63e6be);
    opacity: 0.9;
  }
  &[data-status="loading"]::before {
    background: var(--panel-top-bar);
    opacity: 0.45;
  }
  &:hover {
    border-color: var(--panel-border-hover);
    box-shadow: var(--panel-card-shadow-hover);
    transform: translateY(-2px);
    &::before {
      opacity: 1;
    }
    ${CardOpenCue} {
      opacity: 0.85;
      transform: translate(0, 0);
    }
  }
  &:has(a:focus-visible) {
    outline: 2px solid var(--panel-accent);
    outline-offset: 2px;
    ${CardOpenCue} {
      opacity: 0.85;
      transform: translate(0, 0);
    }
  }
  & h2 {
    overflow-wrap: anywhere;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;
export const CardLink = styled.a`
  color: inherit;
  text-decoration: none;
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: inherit;
  }
  &:focus-visible {
    outline: none;
  }
`;
export const CardAction = styled.div`
  position: relative;
  z-index: 2;
  flex-shrink: 0;
`;
export const Monogram = styled.div`
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  border: 1px solid var(--panel-card-border);
  background: linear-gradient(145deg, var(--panel-subtle), var(--panel-hover));
  color: var(--panel-accent);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.04em;
`;
export const Empty = styled.section`
  position: relative;
  padding: 44px 20px;
  background: var(--panel-surface);
  border: 1px dashed var(--panel-empty-border);
  border-radius: 24px;
  box-shadow: var(--panel-card-shadow);
  text-align: center;
  animation: ${fadeUp} 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
export const EmptyBadge = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  margin: 0 auto 18px;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(145deg, var(--panel-subtle), var(--panel-hover));
  border: 1px solid var(--panel-card-border);
  color: var(--panel-accent);
  &::before {
    content: "";
    position: absolute;
    inset: -5px;
    border-radius: 20px;
    background: var(--panel-motif-card-front);
    transform: rotate(-7deg);
    z-index: -1;
  }
`;
export const Login = styled.section`
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 48px;
  padding-block: 44px;
  animation: ${fadeUp} 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
  & h1 {
    font-size: clamp(2.2rem, 3.8vw, 3.2rem);
    letter-spacing: -0.04em;
    line-height: 1.1;
  }
  @media (max-width: 48em) {
    grid-template-columns: 1fr;
    gap: 24px;
    padding-block: 24px;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
export const LoginCardWrap = styled.div`
  position: relative;
  &::before,
  &::after {
    content: "";
    position: absolute;
    inset: -8px;
    border-radius: 24px;
    pointer-events: none;
    z-index: 0;
  }
  &::before {
    background: var(--panel-motif-card);
    transform: rotate(-2.5deg);
  }
  &::after {
    background: var(--panel-motif-card-front);
    transform: rotate(2deg);
  }
  @media (max-width: 48em) {
    &::before,
    &::after {
      inset: -4px;
    }
  }
`;
export const LoginCard = styled(Card)`
  position: relative;
  z-index: 1;
  overflow: hidden;
  border: 1px solid var(--panel-card-border);
  background: var(--panel-surface);
  box-shadow: var(--panel-card-shadow);
  &::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: var(--panel-top-bar);
  }
`;
