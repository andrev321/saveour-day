import { styled } from "styled-components";

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(145px, 100%), 1fr));
  gap: 12px;
`;
export const Tile = styled.button`
  appearance: none;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--panel-photo-border);
  border-radius: 16px;
  background: var(--panel-surface);
  text-align: left;
  color: inherit;
  font: inherit;
  cursor: pointer;
  &:hover {
    border-color: var(--panel-photo-accent);
  }
  &:focus-visible {
    outline: 3px solid var(--panel-photo-accent);
    outline-offset: 3px;
  }
  &[aria-pressed="true"] {
    border-color: var(--panel-photo-accent);
    box-shadow: 0 0 0 2px var(--panel-photo-accent);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  & img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }
`;
export const Focus = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: var(--panel-photo-background);
  cursor: pointer;
  touch-action: none;
  &:focus-visible {
    outline: 3px solid var(--panel-photo-accent);
    outline-offset: 3px;
  }
  & img {
    display: block;
    width: 100%;
    height: auto;
    user-select: none;
    pointer-events: none;
  }
`;
export const CropFrame = styled.div`
  position: absolute;
  box-sizing: border-box;
  border: 2px solid white;
  box-shadow:
    0 0 0 1px #27386c,
    0 0 0 100vmax rgb(0 0 0 / 55%);
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
  &::before,
  &::after {
    content: "";
    position: absolute;
    pointer-events: none;
  }
  &::before {
    inset: 0 33.333%;
    border-inline: 1px dashed rgb(255 255 255 / 65%);
  }
  &::after {
    inset: 33.333% 0;
    border-block: 1px dashed rgb(255 255 255 / 65%);
  }
`;
