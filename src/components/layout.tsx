import styled from '@emotion/styled';

export const Page = styled.div`
  --content-max: 600px;
  --content-pad: clamp(12px, 4vw, 20px);
  background-color: #f9f6f2;
  min-height: 100vh;
  font-family: 'Inter', 'Segoe UI', Roboto, sans-serif;
`;

export const HeroSection = styled.section`
  position: relative;
  width: 100%;
  overflow: hidden;
`;

export const HeroImage = styled.img`
  width: 100%;
  height: auto;
  display: block;
`;

export const HeroFade = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(249, 246, 242, 0) 42%,
    rgba(249, 246, 242, 0.55) 70%,
    #f9f6f2 100%
  );
`;

export const HeroContent = styled.div`
  position: absolute;
  left: 50%;
  bottom: clamp(12px, 4vw, 32px);
  transform: translateX(-50%);
  width: min(
    calc(var(--content-max) - (2 * var(--content-pad))),
    calc(100% - (2 * var(--content-pad)))
  );
  text-align: center;
  padding: clamp(12px, 2.5vw, 18px) clamp(12px, 3.5vw, 24px);
  border-radius: 20px;
  background: rgba(249, 246, 242, 0.36);
  backdrop-filter: blur(6px);
`;

export const Main = styled.main`
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 20px var(--content-pad) 20px;
  text-align: center;
`;

export const Card = styled.section`
  background: rgba(255, 255, 255, 0.92);
  padding: clamp(18px, 4.5vw, 25px);
  border-radius: clamp(14px, 3vw, 20px);
  margin-bottom: clamp(14px, 3.5vw, 20px);
  box-shadow: 0 10px 24px rgba(53, 42, 29, 0.08);
`;

export const SectionTitle = styled.h2`
  color: #a68b5b;
  font-size: clamp(1.55rem, 4.5vw, 1.75rem);
  font-weight: 600;
  margin: 0 0 10px;
`;
