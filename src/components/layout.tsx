import styled from '@emotion/styled';

export const Page = styled.div`
  --content-max: 600px;
  --content-pad: 16px;
  --page-bg: #faf9f6;
  --wave-back: #efe8de;
  --gold:rgb(148, 114, 63);
  --gold-soft: rgba(176, 141, 87, 0.14);
  --text: #3f3a34;
  --text-muted: #6b645c;
  --font-serif: 'Cormorant Garamond', 'Georgia', serif;
  --font-sans: 'Inter', 'Segoe UI', system-ui, sans-serif;

  background-color: var(--page-bg);
  min-height: 100vh;
  max-width: 850px;
  min-width: 420px;
  margin: 0 auto;
  font-family: var(--font-sans);
  color: var(--text);
`;

export const HeroSection = styled.section`
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #1a1512;
`;

export const HeroImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

/** Lekki gradient tylko u góry/środka — czytelność nagłówka bez „tnącego” dołu zdjęcia */
export const HeroReadability = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(
    to bottom,
    rgba(20, 16, 12, 0.35) 0%,
    rgba(20, 16, 12, 0.08) 38%,
    rgba(20, 16, 12, 0) 58%
  );
`;

export const HeroContent = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  width: 100%;
  max-width: 568px;
  text-align: center;
  padding: 16px 20px;
  isolation: isolate;

  /* Miękka poświata: blur + scale zamiast ostrego prostokąta ::before */
  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 45%;
    transform: translate(-50%, -50%) scale(1.75);
    z-index: 0;
    width: 60%;
    height: 60%;
    max-width: 90%;
    pointer-events: none;
    border-radius: 50%;
    background: radial-gradient(
      ellipse 100% 100% at 50% 50%,
      rgba(255, 255, 255, 1) 0%,
      rgba(255, 255, 255, 0.65) 38%,
      rgba(255, 255, 255, 0.18) 62%,
      rgba(255, 255, 255, 0) 78%
    );
    filter: blur(22px);
    -webkit-filter: blur(22px);
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  @media (min-width:320px)  { bottom: -15px }
  @media (min-width:480px)  { bottom: -10px; width: 55%;}
  @media (min-width:600px)  { bottom: 50px; 
   &::before { top: 50%; } }
  @media (min-width:801px)  { bottom: 55px; width: 40%; }
`;

export const Main = styled.main`
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 28px var(--content-pad) 40px;
  text-align: center;
`;

export const Card = styled.section`
  background: #ffffff;
  padding: 24px;
  border-radius: 18px;
  margin-bottom: 20px;
  box-shadow: 0 12px 36px rgba(53, 42, 29, 0.07);
  border: 1px solid rgba(176, 141, 87, 0.12);
  text-align: left;
`;

export const Eyebrow = styled.p`
  font-family: var(--font-sans);
  font-size: 12px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--gold);
  margin: 0 0 14px;
  text-align: center;
`;

export const SectionTitle = styled.h2`
  font-family: var(--font-serif);
  color: var(--gold);
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 12px;
  letter-spacing: 0.02em;
`;

export const CardKicker = styled.h2`
  display: block;
  font-family: var(--font-sans);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--gold);
  margin: 0 0 10px;
`;
