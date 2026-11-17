"use client";
import { ActionIcon, Tabs } from "@mantine/core";
import { createGlobalStyle, styled } from "styled-components";
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
  .mantine-ActionIcon-root { min-width: 44px; min-height: 44px; }
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
    flex-shrink: 0;
    padding: 8px 20px 8px 0;
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
    color: var(--panel-accent);
    text-decoration: none;
    font-size: 13px;
    font-weight: 600;
  }
  & .brand-symbol {
    display: none !important;
  }
  [data-collapsed="true"] & .brand-lockup {
    display: none !important;
  }
  [data-collapsed="true"] & .brand-symbol {
    display: block !important;
  }
  @media (max-width: 1099px) {
    & {
      width: auto;
      padding: 0;
    }
  }
  @media (max-width: 1099px) {
    & .brand-lockup {
      display: none !important;
    }
    & .brand-symbol {
      display: block !important;
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
    padding: 16px 8px 12px;
    border-right: 1px solid var(--panel-border);
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
    padding: 10px 12px;
    color: var(--panel-muted);
    min-height: 44px;
    transition:
      background-color 160ms,
      color 160ms;
  }
  & .mantine-Tabs-tab[data-active] {
    background: var(--panel-selected);
    color: var(--panel-selected-text);
    font-weight: 600;
  }
  & .mantine-Tabs-tab:hover {
    background: var(--panel-hover);
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
  [data-collapsed="true"] & .mantine-Tabs-list {
    align-items: center;
    gap: 4px;
  }
  [data-collapsed="true"] & .mantine-Tabs-tab {
    width: 44px;
    height: 44px;
    padding: 0;
    justify-content: center;
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
    padding-top: 16px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  [data-collapsed="true"] & {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px;
  }
  [data-collapsed="true"] & .mantine-Button-root,
  [data-collapsed="true"] & .mantine-ActionIcon-root {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    flex-shrink: 0;
  }
  [data-collapsed="true"] & .mantine-Button-section {
    margin: 0;
  }
  [data-collapsed="true"] & .mantine-Button-label {
    display: none;
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
    padding-top: 0;
  }
  & h3 {
    font-size: 18px;
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
    overflow-wrap: anywhere;
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
      height: 100%;
      width: 100%;
    }
  }
  @media (max-width: 1099px) {
    & {
      padding: 16px max(16px, calc((100% - 720px) / 2));
    }
  }
  @media (max-width: 1099px) {
    [data-view="preview"] & {
      display: none;
    }
  }
  @media (max-width: 767px) {
    & {
      padding: 12px;
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
    padding: 24px;
    gap: 18px;
    background: var(--panel-preview);
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
    gap: 8px;
  }
  & .mantine-Button-root {
    min-height: 48px;
  }
`;
