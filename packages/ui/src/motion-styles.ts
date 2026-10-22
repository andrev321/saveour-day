import { css } from "styled-components";

/** Small feedback shared by the studio, invitations and portalled dialogs. */
export const subtleControls = css`
  .mantine-Button-root,
  .mantine-ActionIcon-root,
  [data-ui="invitation-action"],
  [data-ui="guest-card"] button {
    transition:
      background-color 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      opacity 160ms ease,
      translate 140ms ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .mantine-Button-root:not(:disabled):not([data-disabled]):hover,
    [data-ui="invitation-action"]:hover,
    [data-ui="guest-card"] button:not(:disabled):hover {
      translate: 0 -1px;
    }
  }
  .mantine-Button-root:not(:disabled):not([data-disabled]):active,
  [data-ui="invitation-action"]:active,
  [data-ui="guest-card"] button:not(:disabled):active {
    translate: 0 1px;
  }
  @media (prefers-reduced-motion: reduce) {
    .mantine-Button-root,
    .mantine-ActionIcon-root,
    [data-ui="invitation-action"],
    [data-ui="guest-card"] button {
      transition: none !important;
      translate: none !important;
    }
  }
`;
