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
      opacity 140ms ease,
      box-shadow 180ms ease;
  }
  /* Override Mantine's default physical press as well as our previous lift. */
  .mantine-Button-root.mantine-active:active,
  .mantine-ActionIcon-root.mantine-active:active {
    transform: none;
  }
  .mantine-Button-root:not(:disabled):not([data-disabled]):active,
  .mantine-ActionIcon-root:not(:disabled):not([data-disabled]):active,
  [data-ui="invitation-action"]:active,
  [data-ui="guest-card"] button:not(:disabled):active {
    opacity: 0.88;
  }
  .content-disclosure-chevron {
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .mantine-Button-root,
    .mantine-ActionIcon-root,
    [data-ui="invitation-action"],
    [data-ui="guest-card"] button,
    .content-disclosure-chevron {
      transition: none !important;
    }
  }
`;
