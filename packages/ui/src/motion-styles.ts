import { css } from "styled-components";

export const MOTION_EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";

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
    transition: transform 220ms ${MOTION_EASE_CSS};
  }
  [data-ui="invitation-action"] > span[aria-hidden="true"],
  [data-ui="invitation-header"] nav > a > span[aria-hidden="true"] {
    display: inline-block;
    transition: transform 220ms ${MOTION_EASE_CSS};
  }
  @media (hover: hover) and (pointer: fine) {
    [data-ui="invitation-action"]:hover > span[aria-hidden="true"],
    [data-ui="invitation-header"] nav > a:hover > span[aria-hidden="true"] {
      transform: translate(2.5px, -2.5px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .mantine-Button-root,
    .mantine-ActionIcon-root,
    [data-ui="invitation-action"],
    [data-ui="guest-card"] button,
    .content-disclosure-chevron,
    [data-ui="invitation-action"] > span[aria-hidden="true"],
    [data-ui="invitation-header"] nav > a > span[aria-hidden="true"] {
      transition: none !important;
    }
    [data-ui="invitation-action"]:hover > span[aria-hidden="true"],
    [data-ui="invitation-header"] nav > a:hover > span[aria-hidden="true"] {
      transform: none !important;
    }
  }
`;
