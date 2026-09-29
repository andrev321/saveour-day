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
  border: 1px solid #dbe2ef;
  border-radius: 16px;
  background: white;
  text-align: left;
  color: inherit;
  font: inherit;
  cursor: pointer;
  &:hover {
    border-color: #52679d;
  }
  &:focus-visible {
    outline: 3px solid #52679d;
    outline-offset: 3px;
  }
  & img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
  }
`;
export const Editor = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 24px;
  @media (max-width: 40em) {
    grid-template-columns: minmax(0, 1fr);
  }
`;
export const Focus = styled.div`
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: #edf1f8;
  cursor: crosshair;
  touch-action: none;
  &:focus-visible {
    outline: 3px solid #52679d;
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
export const Marker = styled.span`
  position: absolute;
  width: 26px;
  height: 26px;
  border: 3px solid white;
  border-radius: 50%;
  background: #3b519e99;
  box-shadow: 0 0 0 2px #27386c;
  transform: translate(-50%, -50%);
  pointer-events: none;
`;
export const Crop = styled.img`
  display: block;
  width: 100%;
  max-height: 300px;
  border-radius: 12px;
  object-fit: cover;
  background: #edf1f8;
`;
