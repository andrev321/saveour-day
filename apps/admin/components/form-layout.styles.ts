"use client";
import { Group } from "@mantine/core";
import { styled } from "styled-components";

// Respond to the available panel width, including the narrow desktop editor.
export const FilterGrid = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "guest-filters",
})`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  align-items: end;
  gap: 12px;
  & > * {
    min-width: 0;
  }
`;

export const FormRow = styled(Group)`
  align-items: end;
  & > .mantine-InputWrapper-root {
    flex: 1 1 200px;
    min-width: 0;
    max-width: 100%;
  }
`;

export const QrPreview = styled.div`
  position: relative;
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1;
  border-radius: var(--mantine-radius-md);
  overflow: hidden;
  & canvas {
    display: block;
    width: 100%;
    height: auto;
  }
  & [data-qr-copy] {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    opacity: 0;
    transition: opacity 150ms ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.14);
  }
  &:hover [data-qr-copy],
  &:focus-within [data-qr-copy] {
    opacity: 1;
  }
  @media (hover: none) {
    & [data-qr-copy] {
      opacity: 1;
    }
  }
`;
