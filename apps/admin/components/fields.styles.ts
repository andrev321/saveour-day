"use client";
import { ActionIcon, Group, Text, ThemeIcon } from "@mantine/core";
import { styled } from "styled-components";
export const ReferenceRow = styled(Group).attrs<{ "data-ui"?: string }>({
  "data-ui": "reference-row",
})`
  & {
    min-height: 2.25rem;
    padding: 0.25rem 0.375rem;
    border: 1px solid var(--panel-field-border);
    border-radius: 0.5rem;
    background: var(--panel-surface);
  }
  &[data-visible="false"] {
    opacity: 0.55;
    background: var(--panel-field-hover);
  }
`;

export const ReferenceDragHandle = styled(ActionIcon).attrs<{
  "data-ui"?: string;
}>({ "data-ui": "reference-drag-handle" })`
  & {
    cursor: grab;
    touch-action: none;
  }
  &:active {
    cursor: grabbing;
  }
`;

export const ReferenceName = styled(Text).attrs<{ "data-ui"?: string }>({
  "data-ui": "reference-name",
})`
  & {
    flex: 1;
    min-width: 0;
  }
`;

export const ReferenceDragGhost = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "reference-drag-ghost",
})`
  & {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 12rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--panel-field-accent);
    border-radius: 0.5rem;
    background: var(--panel-surface);
    box-shadow: 0 12px 30px rgb(0 0 0 / 15%);
  }
`;

export const SectionTypeIcon = styled.span.attrs<{ "data-ui"?: string }>({
  "data-ui": "section-type-icon",
})`
  & {
    display: inline-grid;
    width: 1.25rem;
    place-items: center;
    color: var(--panel-field-muted);
    font-size: 0.9rem;
    line-height: 1;
  }
`;

export const SectionTypeOption = styled.span.attrs<{ "data-ui"?: string }>({
  "data-ui": "section-type-option",
})`
  & {
    display: grid;
    grid-template-columns: 1.25rem 1fr;
    align-items: center;
    column-gap: 0.5rem;
  }
`;

export const SectionControlRow = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "section-control-row",
})`
  & {
    display: flex;
    align-items: center;
    padding-right: 12px;
  }
  & .mantine-Accordion-control {
    flex: 1;
    min-width: 0;
  }
`;

export const SectionCardIcon = styled(ThemeIcon).attrs<{ "data-ui"?: string }>({
  "data-ui": "section-card-icon",
})`
  & {
    display: grid;
    flex: 0 0 2.25rem;
    place-items: center;
    line-height: 1;
  }
`;

export const SectionCardSummary = styled(Group).attrs<{ "data-ui"?: string }>({
  "data-ui": "section-card-summary",
})`
  & {
    flex: 1;
    min-width: 0;
    align-items: center;
  }
`;

export const SectionDragHandle = styled(Text).attrs<{ "data-ui"?: string }>({
  "data-ui": "section-drag-handle",
})`
  & {
    display: grid;
    flex: 0 0 1.5rem;
    width: 1.5rem;
    height: 1.5rem;
    place-items: center;
    cursor: grab;
    touch-action: none;
  }
  &:active {
    cursor: grabbing;
  }
  ${SectionControlRow} & {
    border-radius: 6px;
  }
  @media (pointer: coarse) {
    & {
      width: 44px;
      height: 44px;
      flex-basis: 44px;
    }
  }
`;

export const SectionDragGhost = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "section-drag-ghost",
})`
  & {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 15rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--panel-field-accent);
    border-radius: 0.5rem;
    background: var(--panel-surface);
    box-shadow: 0 12px 30px rgb(0 0 0 / 15%);
  }
`;
