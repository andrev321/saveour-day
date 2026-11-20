"use client";
import { Group } from "@mantine/core";
import { styled } from "styled-components";

export const ModalStickyTop = styled.div.attrs<{ "data-ui"?: string }>({
  "data-ui": "modal-sticky-top",
})`
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--mantine-color-body);
  margin-inline: calc(-1 * var(--mb-padding, var(--mantine-spacing-md)));
  padding-inline: var(--mb-padding, var(--mantine-spacing-md));
  padding-top: 2px;
  padding-bottom: var(--mantine-spacing-sm);
  border-bottom: 1px solid var(--panel-border);
`;

export const ModalStickyFooter = styled(Group).attrs<{ "data-ui"?: string }>({
  "data-ui": "modal-sticky-footer",
})`
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: var(--mantine-color-body);
  margin-inline: calc(-1 * var(--mb-padding, var(--mantine-spacing-md)));
  margin-bottom: calc(-1 * var(--mb-padding, var(--mantine-spacing-md)));
  padding-inline: var(--mb-padding, var(--mantine-spacing-md));
  padding-top: var(--mantine-spacing-sm);
  padding-bottom: var(--mb-padding, var(--mantine-spacing-md));
  border-top: 1px solid var(--panel-border);
`;
