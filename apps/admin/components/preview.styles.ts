"use client";
import { ActionIcon, Modal, Select } from "@mantine/core";
import { styled } from "styled-components";
export const PreviewDialog = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-dialog",
})`
  & {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
    background: var(--panel-preview);
    width: 100%;
  }
`;

export const PreviewDialogHeader = styled(Modal.Header).attrs<{
  "data-ui"?: string;
}>({ "data-ui": "preview-dialog-header" })`
  & {
    min-height: 52px;
    padding: 8px 16px;
    background: var(--panel-shell);
    border-bottom: 1px solid var(--panel-border);
  }
  @media (max-width: 767px) {
    & {
      padding: 6px 8px;
    }
  }
`;

export const PreviewDialogTitle = styled(Modal.Title).attrs<{
  "data-ui"?: string;
}>({ "data-ui": "preview-dialog-title" })`
  & {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`;

export const PreviewDialogBody = styled(Modal.Body).attrs<{
  "data-ui"?: string;
}>({ "data-ui": "preview-dialog-body" })`
  & {
    flex: 1;
    min-height: 0;
    padding: 12px;
    display: flex;
    flex-direction: column;
  }
`;

export const PreviewCanvas = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-canvas",
})`
  & {
    flex: 1;
    min-width: 0;
    min-height: 0;
    overflow: auto;
    border-radius: 16px;
    background: var(--panel-canvas);
  }
`;

export const PreviewSurface = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-surface",
})`
  & {
    margin: 16px auto;
    position: relative;
  }
`;

export const PreviewDevice = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-device",
})`
  & {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: top left;
    background: #f8fafd;
    box-shadow: 0 14px 36px #242b5930;
  }
  &[data-device="phone"] {
    border-radius: 48px;
    background: #262a29;
    box-shadow:
      0 0 0 2px #8b908c,
      0 0 0 4px #d2d3ce,
      0 18px 40px #242b5938;
  }
  &[data-device="tablet"] {
    border-radius: 30px;
    background: #262a29;
    box-shadow:
      0 0 0 2px #90948f,
      0 18px 40px #242b5938;
  }
  &[data-device="desktop"] {
    border-radius: 10px;
    overflow: hidden;
  }
  & iframe {
    display: block;
    border: 0;
    background: #ffffff;
  }
`;

export const PreviewDeviceScreen = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-device-screen",
})`
  & {
    overflow: hidden;
    isolation: isolate;
    background: #ffffff;
  }
  [data-device="phone"] & {
    border-radius: 38px;
  }
  [data-device="tablet"] & {
    border-radius: 16px;
  }
`;

export const PreviewDeviceStatus = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-device-status",
})`
  ${PreviewDeviceScreen} & {
    border-radius: 0;
  }
  & {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 22px;
    font:
      600 12px Inter,
      sans-serif;
    color: #242b59;
    background: #ffffff;
  }
  [data-device="phone"] & {
    border-radius: 38px 38px 0 0;
  }
  [data-device="tablet"] & {
    border-radius: 16px 16px 0 0;
  }
`;

export const PreviewCamera = styled.i.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-camera",
})`
  & {
    position: absolute;
    width: 82px;
    height: 20px;
    background: #202322;
    border-radius: 20px;
    left: 50%;
    top: 5px;
    transform: translateX(-50%);
  }
`;

export const PreviewStatusIcons = styled.span.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-status-icons",
})`
  & {
    font-size: 10px;
    letter-spacing: 1px;
  }
`;

export const PreviewTabletCamera = styled.i.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-tablet-camera",
})``;

export const PreviewDeviceBottom = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-device-bottom",
})`
  ${PreviewDeviceScreen} & {
    border-radius: 0;
  }
  & {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #ffffff;
    border-radius: 0 0 38px 38px;
  }
  & i {
    width: 110px;
    height: 4px;
    background: #262a29;
    border-radius: 4px;
  }
  [data-device="tablet"] & {
    border-radius: 0 0 16px 16px;
  }
`;

export const PreviewToolbar = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-toolbar",
})`
  & {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 8px;
    min-width: 0;
    width: 100%;
    min-height: 36px;
    flex-shrink: 0;
  }
  & .mantine-ActionIcon-root {
    flex-shrink: 0;
    min-width: 30px;
    min-height: 30px;
    width: 30px;
    height: 30px;
  }
  @container (max-width: 540px) {
    & {
      gap: 4px;
    }
  }
  @media (max-width: 767px) {
    & {
      gap: 3px;
    }
  }
  @media (pointer: coarse) {
    & .mantine-ActionIcon-root {
      min-width: 30px;
      width: 30px;
      min-height: 44px;
      height: 44px;
    }
  }
`;

export const PreviewToolbarLabel = styled.span.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-toolbar-label",
})`
  & {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  @media (max-width: 767px) {
    & {
      font-size: 11px;
    }
  }
`;

export const PreviewDeviceButtons = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-device-buttons",
})`
  & {
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    padding: 2px;
    border-radius: 9px;
    background: var(--panel-toolbar);
  }
`;

export const PreviewVariant = styled(Select).attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-variant",
})`
  ${PreviewToolbar} & {
    flex: 1;
    min-width: 52px;
    max-width: 220px;
    margin-left: auto;
  }
  ${PreviewToolbar} & input {
    min-height: 32px;
    height: 32px;
    padding-left: 8px;
    font-size: 12px;
  }
  @media (max-width: 767px) {
    ${PreviewToolbar} & {
      min-width: 40px;
    }
  }
  @media (pointer: coarse) {
    ${PreviewToolbar} & input {
      min-height: 44px;
    }
  }
`;

export const PreviewFit = styled(ActionIcon).attrs<{ "data-ui"?: string }>({
  "data-ui": "preview-fit",
})`
  ${PreviewToolbar} & {
    margin-left: auto;
    width: auto;
    padding: 0 6px;
    gap: 4px;
    font-size: 11px;
  }
  @container (max-width: 540px) {
    & [data-ui="preview-fit-label"] {
      display: none;
    }
  }
  @media (max-width: 767px) {
    & [data-ui="preview-fit-label"] {
      display: none;
    }
  }
`;
