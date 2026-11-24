"use client";
import { ActionIcon, Tabs } from "@mantine/core";
import { createGlobalStyle, css, styled } from "styled-components";
import { subtleControls } from "@invitations/ui/motion-styles";
export const AdminGlobalStyles = createGlobalStyle`body {margin: 0;
background: var(--panel-shell);
color: var(--panel-text);}
* {box-sizing: border-box;}
${subtleControls}
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
/* Portalled dialogs need the same mobile affordances as the editor. */
@media (pointer: coarse) {
  .mantine-Input-input { min-height: 44px; font-size: 16px; }
  .mantine-Button-root { min-height: 44px; }
  .mantine-ActionIcon-root:not([data-notice-trigger]) { min-width: 44px; min-height: 44px; }
}
[data-notice-trigger] {
  position: relative;
  width: 24px;
  height: 24px;
  min-width: 24px;
  min-height: 24px;
  padding: 0;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
[data-notice-trigger]::after {
  content: "";
  position: absolute;
  inset: -10px;
}
[data-notice-trigger] svg {
  transform: translateY(-0.5px);
}
@media (max-width: 767px) {
  .mantine-Modal-body .mantine-Button-root {
    height: auto;
    padding-block: 10px;
    max-width: 100%;
  }
  .mantine-Modal-body .mantine-Button-label { white-space: normal; }
  .mantine-Modal-body .mantine-InputWrapper-root { min-width: 0; }
}
.mantine-Switch-root:not([data-disabled]) .mantine-Switch-track,
.mantine-Switch-root:not([data-disabled]) .mantine-Switch-thumb,
.mantine-Switch-root:not([data-disabled]) .mantine-Switch-label {
  cursor: pointer;
}
`;

export const EditorWorkspace = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "editor-workspace",
})`
  & {
    --nav-width: 208px;
    height: min(100dvh, var(--visual-height, 100dvh));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--panel-shell);
  }
  &[data-collapsed="true"] {
    --nav-width: 76px;
  }
  & :focus-visible {
    outline: 2px solid var(--panel-accent);
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
    flex-shrink: 0;
    padding: 8px 20px 8px 16px;
    border-bottom: 1px solid var(--panel-border);
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

export const WorkspaceCollapseToggle = styled(ActionIcon).attrs<{
  "data-ui"?: string;
}>({
  "data-ui": "workspace-collapse-toggle",
})`
  & {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    border-radius: 10px;
    color: var(--panel-muted);
    flex-shrink: 0;
  }
  &:hover {
    background: var(--panel-hover);
    color: var(--panel-muted);
  }
  @media (max-width: 1099px) {
    & {
      display: none;
    }
  }
`;

export const WorkspaceBrand = styled.a.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-brand",
})`
  & {
    width: auto;
    flex-shrink: 0;
    padding: 0;
    position: relative;
    display: inline-flex;
    align-items: center;
    color: var(--panel-accent);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }
  & .brand-lockup {
    opacity: 1;
    transition: opacity 220ms ease;
  }
  & .brand-symbol {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 220ms ease;
  }
  [data-collapsed="true"] & .brand-lockup {
    opacity: 0;
  }
  [data-collapsed="true"] & .brand-symbol {
    opacity: 1;
  }
  @media (max-width: 1599px) {
    & .brand-lockup {
      display: none;
    }
    & .brand-symbol {
      position: static;
      transform: none;
      opacity: 1;
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
    max-width: 100%;
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
    flex-shrink: 0;
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
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
  & .mantine-Button-root {
    width: 100%;
    max-width: 100%;
    height: auto;
    min-height: 44px;
    padding-block: 8px;
  }
  & .mantine-Button-label {
    white-space: normal;
    line-height: 1.3;
    overflow: visible;
  }
  & [data-ui="panel-preferences"] {
    width: 100%;
    min-width: 0;
  }
  & [data-ui="panel-preferences"] .mantine-Select-root {
    flex: 1 1 0;
    min-width: 0;
  }
  & [data-ui="panel-preferences"] .mantine-ActionIcon-root {
    flex-shrink: 0;
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
    transition: grid-template-columns 360ms cubic-bezier(0.34, 1.32, 0.64, 1);
  }
  [data-resizing="true"] & {
    transition: none;
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
      display: flex;
      position: relative;
      overflow: hidden;
      transition: none;
    }
  }
`;

function collapsibleNavItemStyles({
  itemSelector,
  sectionSelector,
  labelSelector,
  paddingX,
}: {
  itemSelector: string;
  sectionSelector: string;
  labelSelector: string;
  paddingX: string;
}) {
  return css`
    & ${itemSelector} {
      border: 0;
      border-radius: 10px;
      padding: 0 ${paddingX};
      color: var(--panel-muted);
      min-height: 44px;
      height: 44px;
      width: 100%;
      min-width: 0;
      overflow: hidden;
      transition:
        background-color 160ms,
        color 160ms;
    }
    & ${itemSelector}[data-active] {
      background: var(--panel-selected);
      color: var(--panel-selected-text);
      font-weight: 600;
    }
    & ${sectionSelector} {
      margin-inline-end: 12px;
      flex-shrink: 0;
      transition: margin-inline-end 280ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    & ${labelSelector} {
      white-space: nowrap;
      text-align: left;
      line-height: 1.4;
      max-width: 160px;
      opacity: 1;
      transform: translateX(0);
      overflow: hidden;
      transition:
        opacity 200ms ease,
        transform 240ms cubic-bezier(0.22, 1, 0.36, 1),
        max-width 280ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    [data-collapsed="true"] & ${sectionSelector} {
      margin-inline-end: 0;
    }
    [data-collapsed="true"] & ${labelSelector} {
      opacity: 0;
      transform: translateX(-6px);
      max-width: 0;
      pointer-events: none;
    }
  `;
}

export const WorkspaceNav = styled.aside.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-nav",
})`
  & {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    padding: 16px 15px 12px 16px;
    border-right: 1px solid var(--panel-border);
  }
  & .mantine-Tabs-list {
    gap: 8px;
    flex-wrap: nowrap;
    overflow-x: hidden;
    overflow-y: auto;
  }
  & .mantine-Tabs-list::before {
    display: none;
  }
  ${collapsibleNavItemStyles({
    itemSelector: ".mantine-Tabs-tab",
    sectionSelector: ".mantine-Tabs-tabSection",
    labelSelector: ".mantine-Tabs-tabLabel",
    paddingX: "10.5px",
  })}
  & .mantine-Tabs-tab {
    justify-content: flex-start;
    flex-shrink: 0;
  }
  & .mantine-Tabs-tab:hover {
    background: var(--panel-hover);
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
    padding-top: 16px;
    border-top: 1px solid var(--panel-separator);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  ${collapsibleNavItemStyles({
    itemSelector: ".mantine-Button-root",
    sectionSelector: ".mantine-Button-section",
    labelSelector: ".mantine-Button-label",
    paddingX: "11px",
  })}
  & .mantine-Button-root {
    font-weight: 400;
  }
  & .mantine-Button-root:hover:not([data-active]) {
    background: var(--panel-hover);
    color: var(--panel-muted);
  }
`;

export const WorkspaceForm = styled.main.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-form",
})`
  & {
    overflow: auto;
    min-width: 0;
    padding: 16px;
    background: var(--panel-surface);
    scrollbar-gutter: stable;
  }
  & .mantine-Tabs-panel {
    padding-top: 16px;
  }
  & h2 {
    font-size: 18px;
    line-height: 1.3;
    margin-top: 4px;
  }
  & h3 {
    font-size: 16px;
    line-height: 1.35;
    margin-top: 4px;
  }
  & .mantine-Input-input {
    border-color: var(--panel-input-border);
    background: var(--panel-surface);
  }
  & .mantine-Input-input:focus {
    border-color: var(--panel-accent);
  }
  & .mantine-InputWrapper-label {
    margin-bottom: 4px;
    color: var(--panel-label);
  }
  & .mantine-Accordion-item {
    border-color: var(--panel-border);
    background: var(--panel-surface);
  }
  & .mantine-Card-root {
    border-color: var(--panel-border);
    background: var(--panel-surface);
  }
  & .mantine-Text-root,
  & .mantine-Title-root,
  & .mantine-InputWrapper-label,
  & .mantine-Checkbox-label {
    overflow-wrap: break-word;
  }
  & .mantine-Button-root {
    max-width: 100%;
    height: auto;
    min-height: 36px;
    padding-block: 6px;
  }
  & .mantine-Button-label {
    white-space: normal;
    line-height: 1.3;
    overflow: visible;
  }
  @media (pointer: coarse) {
    & .mantine-Button-root {
      min-height: 44px;
    }
  }
  @media (max-width: 1099px) {
    & {
      flex: 0 0 100%;
      height: 100%;
      width: 100%;
      padding: 16px max(16px, calc((100% - 720px) / 2));
      transform: translateX(0);
      transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    [data-view="preview"] & {
      transform: translateX(-100%);
    }
  }
  @media (max-width: 767px) {
    & {
      padding: 12px;
    }
    & h2 {
      font-size: 16px;
    }
    & h3 {
      font-size: 15px;
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
`;

export const WorkspaceNotices = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-notices",
})`
  & {
    display: grid;
    gap: 8px;
  }
  &:not(:empty) {
    margin-bottom: 12px;
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
    border-inline: 1px solid var(--panel-border);
    background: var(--panel-resizer);
    position: relative;
  }
  &::after {
    content: "";
    position: absolute;
    top: 45%;
    left: 2px;
    width: 2px;
    height: 48px;
    background: var(--panel-handle);
    border-radius: 4px;
  }
  &:hover {
    background: var(--panel-resizer-hover);
    outline: 2px solid var(--panel-accent);
    outline-offset: -2px;
  }
  &:focus-visible {
    background: var(--panel-resizer-hover);
    outline: 2px solid var(--panel-accent);
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
    padding: 12px;
    gap: 10px;
    container-type: inline-size;
    background: var(--panel-preview);
  }
  & h2 {
    font-size: 18px;
  }
  @media (max-width: 1099px) {
    & {
      flex: 0 0 100%;
      height: 100%;
      width: 100%;
      transform: translateX(0);
      transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    [data-view="preview"] & {
      transform: translateX(-100%);
    }
  }
  @media (max-width: 767px) {
    & {
      padding: 8px;
      gap: 8px;
    }
    & h2 {
      font-size: 16px;
    }
  }
`;

export const WorkspaceMobileNav = styled.nav.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-mobile-nav",
})`
  & {
    display: none;
    flex-shrink: 0;
  }
  @media (max-width: 1099px) {
    & {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 8px 12px max(8px, env(safe-area-inset-bottom));
      border-top: 1px solid var(--panel-border);
      background: var(--panel-surface);
    }
  }
  @media (max-width: 1099px) {
    & .mantine-Button-root {
      min-height: 44px;
      transition:
        background-color 180ms cubic-bezier(0.22, 1, 0.36, 1),
        color 180ms cubic-bezier(0.22, 1, 0.36, 1);
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
      min-width: 0;
      padding-inline: 8px;
    }
    & .mantine-Button-label {
      white-space: normal;
    }
    & .mantine-Button-section {
      margin-inline-end: 6px;
    }
  }
  @media (max-width: 359px) {
    & .mantine-Button-root {
      padding-inline: 4px;
      font-size: 12px;
    }
    & .mantine-Button-section {
      margin-inline-end: 4px;
    }
  }
`;

export const WorkspaceDrawerNav = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-drawer-nav",
})`
  & {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 100%;
    gap: 8px;
  }
  & .mantine-Button-root {
    min-height: 48px;
    width: 100%;
    justify-content: flex-start;
  }
  & .mantine-Button-inner {
    justify-content: flex-start;
    width: 100%;
  }
  & .mantine-Button-label {
    text-align: left;
  }
`;

export const WorkspaceDrawerFooter = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "workspace-drawer-footer",
})`
  & {
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid var(--panel-border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
`;
