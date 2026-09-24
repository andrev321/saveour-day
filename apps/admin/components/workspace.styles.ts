"use client";
import { ActionIcon, Tabs } from "@mantine/core";
import { createGlobalStyle, keyframes, styled } from "styled-components";
export const AdminGlobalStyles = createGlobalStyle`body {margin: 0;
background: #f7f3ec;
color: #302f2b;}
* {box-sizing: border-box;}
`;

const workspaceEnter = keyframes`from {
    opacity: 0;
    transform: translateY(4px);
  }
to {
    opacity: 1;
    transform: translateY(0);
  }`;

export const EditorWorkspace = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "editor-workspace",
})`
  & {
    --nav-width: 208px;
    --paper-border: #e5e0d7;
    height: min(100dvh, var(--visual-height, 100dvh));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f7f3ec;
  }
  &[data-collapsed="true"] {
    --nav-width: 76px;
  }
  & :focus-visible {
    outline: 2px solid #35604c;
    outline-offset: 3px;
  }
  @media (min-width: 1100px) and (max-width: 1599px) {
    & {
      --nav-width: 168px;
    }
  }
  @media (min-width: 1100px) and (max-width: 1599px) {
    &[data-collapsed="true"] {
      --nav-width: 76px;
    }
  }
  @media (pointer: coarse) {
    & .mantine-Input-input {
      min-height: 44px;
    }
  }
  @media (pointer: coarse) {
    & .mantine-Button-root {
      min-height: 44px;
    }
  }
  @media (pointer: coarse) {
    & .mantine-ActionIcon-root {
      min-height: 44px;
    }
  }
  @media (pointer: coarse) {
    & .mantine-ActionIcon-root {
      min-width: 44px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    & * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    & *::before {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    & *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
`;

export const WorkspaceHeader = styled.header.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-header",
})`
  & {
    display: flex;
    align-items: center;
    gap: 20px;
    min-height: 60px;
    padding: 8px 20px 8px 0;
    border-bottom: 1px solid var(--paper-border);
  }
  @media (min-width: 1100px) and (max-width: 1599px) {
    & {
      gap: 12px;
      padding-right: 16px;
    }
  }
  @media (max-width: 1099px) {
    & {
      padding: 6px 12px;
      min-height: 56px;
      gap: 12px;
    }
  }
  @media (max-width: 767px) {
    & {
      padding: 6px 12px;
      gap: 10px;
    }
  }
`;

export const WorkspaceBrand = styled.a.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-brand",
})`
  & {
    width: var(--nav-width);
    flex-shrink: 0;
    padding: 0 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    color: #35604c;
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }
  [data-collapsed="true"] & span {
    display: none;
  }
  @media (max-width: 1099px) {
    & {
      width: auto;
      padding: 0;
    }
  }
  @media (max-width: 1099px) {
    & span {
      display: none;
    }
  }
  @media (max-width: 767px) {
    & {
      display: none;
    }
  }
`;

export const WorkspaceProject = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-project",
})`
  & {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    gap: 12px;
  }
  & h1 {
    font-size: 18px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  & .mantine-Badge-root {
    flex-shrink: 0;
  }
  @media (min-width: 1100px) and (max-width: 1599px) {
    & {
      flex-wrap: wrap;
      gap: 4px;
    }
  }
  @media (max-width: 1099px) {
    & {
      flex-wrap: wrap;
      gap: 4px;
    }
  }
  @media (max-width: 767px) {
    & h1 {
      font-size: 15px;
      max-width: 100%;
    }
  }
  @media (max-width: 767px) {
    & .mantine-Badge-root {
      font-size: 9px;
    }
  }
`;

export const WorkspaceActions = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-actions",
})`
  & {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  & .mantine-Select-root {
    width: 144px;
    flex-shrink: 0;
  }
  & .mantine-InputWrapper-label {
    display: none;
  }
  @media (min-width: 1100px) and (max-width: 1599px) {
    & {
      gap: 6px;
    }
  }
  @media (max-width: 767px) {
    & .mantine-Button-root {
      padding-inline: 10px;
    }
  }
  @media (max-width: 767px) {
    & .mantine-Button-section {
      display: none;
    }
  }
`;

export const DesktopProjectActions = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "desktop-project-actions",
})`
  & {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  @media (max-width: 1099px) {
    & {
      display: none;
    }
  }
`;

export const MobileProjectActions = styled(ActionIcon).attrs<{
  "data-ui"?: string;
}>({ "data-ui": "mobile-project-actions" })`
  & {
    display: none;
  }
  @media (max-width: 1099px) {
    & {
      display: inline-flex;
    }
  }
`;

export const ProjectActionsMenu = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "project-actions-menu",
})`
  & {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }
`;

export const WorkspaceBody = styled(Tabs).attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-body",
})`
  & {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns:
      var(--nav-width) clamp(380px, var(--form-width), 460px)
      8px minmax(0, 1fr);
  }
  @media (min-width: 1600px) {
    & {
      grid-template-columns:
        var(--nav-width) clamp(440px, var(--form-width), 560px)
        8px minmax(0, 1fr);
    }
  }
  @media (max-width: 1099px) {
    & {
      display: block;
      position: relative;
    }
  }
`;

export const WorkspaceNav = styled.aside.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-nav",
})`
  & {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 24px 12px 16px;
    border-right: 1px solid var(--paper-border);
  }
  & .mantine-Tabs-list {
    gap: 8px;
    flex-wrap: nowrap;
    overflow: auto;
  }
  & .mantine-Tabs-list::before {
    display: none;
  }
  & .mantine-Tabs-tab {
    justify-content: flex-start;
    flex-shrink: 0;
    border: 0;
    border-radius: 10px;
    padding: 14px 16px;
    color: #575951;
    min-height: 48px;
    transition:
      background-color 160ms,
      color 160ms;
  }
  & .mantine-Tabs-tab[data-active] {
    background: #e2ebdf;
    color: #2c5442;
    font-weight: 600;
  }
  & .mantine-Tabs-tab:hover {
    background: #ebece3;
  }
  & .mantine-Tabs-tabSection {
    margin-inline-end: 12px;
  }
  & .mantine-Tabs-tabLabel {
    white-space: normal;
    text-align: left;
    line-height: 1.4;
  }
  [data-collapsed="true"] & .mantine-Tabs-tabLabel {
    display: none;
  }
  [data-collapsed="true"] & .mantine-Tabs-tab {
    padding: 14px;
  }
  [data-collapsed="true"] & .mantine-Tabs-tabSection {
    margin: 0;
  }
  @media (max-width: 1099px) {
    & {
      display: none;
    }
  }
`;

export const WorkspaceNavFooter = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-nav-footer",
})`
  & {
    margin-top: auto;
    padding-top: 24px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
`;

export const WorkspaceForm = styled.main.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-form",
})`
  & {
    overflow: auto;
    min-width: 0;
    padding: 24px;
    background: #fffefa;
    scrollbar-gutter: stable;
  }
  & .mantine-Tabs-panel {
    padding-top: 0;
  }
  & .mantine-Tabs-panel:not([hidden]) {
    animation: ${workspaceEnter} 180ms ease-out;
  }
  & h3 {
    font-size: 18px;
    margin-top: 12px;
  }
  & .mantine-Input-input {
    border-color: #dcded4;
    background: #fffefa;
  }
  & .mantine-Input-input:focus {
    border-color: #35604c;
  }
  & .mantine-InputWrapper-label {
    margin-bottom: 6px;
    color: #393d35;
  }
  & .mantine-Accordion-item {
    border-color: #e5e0d7;
    background: #fffefa;
  }
  & .mantine-Card-root {
    border-color: #e5e0d7;
    background: #fffefa;
  }
  ${EditorWorkspace}[data-density="compact"] & {
    padding: 16px;
  }
  ${EditorWorkspace}[data-density="compact"] & .mantine-Stack-root {
    gap: 10px;
  }
  ${EditorWorkspace}[data-density="compact"] & .mantine-Input-input {
    min-height: 32px;
  }
  @media (max-width: 1099px) {
    & {
      height: 100%;
      width: 100%;
    }
  }
  @media (max-width: 1099px) {
    & {
      padding: 24px max(20px, calc((100% - 720px) / 2));
    }
  }
  @media (max-width: 1099px) {
    [data-view="preview"] & {
      display: none;
    }
  }
  @media (max-width: 767px) {
    & {
      padding: 16px;
    }
  }
  @media (max-width: 767px) {
    & .mantine-SimpleGrid-root {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  @media (max-width: 767px) {
    & .mantine-Group-root {
      max-width: 100%;
    }
  }
  @media (max-width: 767px) {
    & .mantine-Group-root > * {
      min-width: 0;
      max-width: 100%;
    }
  }
  @media (pointer: coarse) {
    ${EditorWorkspace}[data-density="compact"]
    &
    .mantine-Input-input {
      min-height: 44px;
    }
  }
`;

export const WorkspaceNotices = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-notices",
})`
  & {
    display: grid;
    gap: 8px;
  }
  &:not(:empty) {
    margin-bottom: 20px;
  }
  & .mantine-Alert-root {
    padding: 12px;
    font-size: 12px;
  }
`;

export const WorkspaceResizer = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-resizer",
})`
  & {
    cursor: col-resize;
    touch-action: none;
    border-inline: 1px solid #e5e0d7;
    background: #f0ece4;
    position: relative;
  }
  &::after {
    content: "";
    position: absolute;
    top: 45%;
    left: 2px;
    width: 2px;
    height: 48px;
    background: #b6beb0;
    border-radius: 4px;
  }
  &:hover {
    background: #c5d7c2;
    outline: 2px solid #35604c;
    outline-offset: -2px;
  }
  &:focus-visible {
    background: #c5d7c2;
    outline: 2px solid #35604c;
    outline-offset: -2px;
  }
  @media (max-width: 1099px) {
    & {
      display: none;
    }
  }
`;

export const WorkspacePreview = styled.section.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-preview",
})`
  & {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    padding: 24px;
    gap: 18px;
    background: #f4f1ea;
  }
  & h2 {
    font-size: 18px;
  }
  @media (min-width: 1100px) and (max-width: 1599px) {
    & {
      padding: 18px;
    }
  }
  @media (max-width: 1099px) {
    & {
      height: 100%;
      width: 100%;
    }
  }
  @media (max-width: 1099px) {
    [data-view="edit"] & {
      display: none;
    }
  }
  @media (max-width: 767px) {
    & {
      padding: 14px;
      gap: 12px;
    }
  }
  @media (max-width: 767px) {
    & h2 {
      font-size: 16px;
    }
  }
  & {
    padding: 12px;
    gap: 10px;
    container-type: inline-size;
  }
  @media (max-width: 767px) {
    & {
      padding: 8px;
      gap: 8px;
    }
  }
`;

export const WorkspaceMobileNav = styled.nav.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-mobile-nav",
})`
  & {
    display: none;
  }
  @media (max-width: 1099px) {
    & {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 8px 12px max(8px, env(safe-area-inset-bottom));
      border-top: 1px solid #e5e0d7;
      background: #fffefa;
    }
  }
  @media (max-width: 1099px) {
    & .mantine-Button-root {
      min-height: 44px;
    }
  }
  @media (max-width: 767px) {
    & {
      gap: 4px;
    }
  }
  @media (max-width: 767px) {
    & .mantine-Button-root {
      flex: 1;
      padding-inline: 8px;
    }
  }
`;

export const WorkspaceDrawerNav = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-drawer-nav",
})`
  & {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  & .mantine-Button-root {
    min-height: 48px;
  }
`;
