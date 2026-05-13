import React from 'react';
import styled from '@emotion/styled';

const Stack = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 72px;
  pointer-events: none;
  z-index: 2;
  line-height: 0;
`;

const WaveSvg = styled.svg<{ $layer: 'back' | 'front' }>`
  position: absolute;
  left: 0;
  width: 100%;
  display: block;
  ${(p) =>
    p.$layer === 'back'
      ? `
    bottom: 6px;
    height: 78%;
    opacity: 1;
    z-index: 1;
  `
      : `
    bottom: 0;
    height: 100%;
    z-index: 2;
  `}
`;

/** Dwie proste nałożone fale — wypełnienie dopasowane do tła strony */
const HeroWaves: React.FC = () => {
  return (
    <Stack aria-hidden>
      <WaveSvg
        $layer="back"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="var(--wave-back, #efe8de)"
          d="M0,55 C180,18 320,92 520,48 C720,4 880,78 1050,42 C1120,28 1160,32 1200,38 L1200,100 L0,100 Z"
        />
      </WaveSvg>
      <WaveSvg
        $layer="front"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="var(--page-bg, #faf9f6)"
          d="M0,62 C200,22 380,96 600,52 C820,8 960,72 1200,46 L1200,100 L0,100 Z"
        />
      </WaveSvg>
    </Stack>
  );
};

export default HeroWaves;
