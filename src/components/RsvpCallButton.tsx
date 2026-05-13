import React from 'react';
import styled from '@emotion/styled';

type RsvpCallButtonProps = {
  phone: string;
};

const Wrap = styled.section`
  text-align: center;
  padding: 12px 0 8px;
`;

const Flair = styled.p`
  margin: 0 0 10px;
  font-family: var(--font-serif, 'Georgia', serif);
  font-size: 18px;
  font-style: italic;
  color: var(--text-muted, #6b645c);
`;

const Eyebrow = styled.p`
  margin: 0 0 14px;
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-size: 12px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  font-weight: 600;
  color: var(--gold, #b08d57);
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  padding: 14px 22px;
  background: var(--gold, #b08d57);
  color: #fff;
  text-decoration: none;
  border-radius: 999px;
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.04em;
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(122, 92, 43, 0.28);
    filter: brightness(1.03);
  }
`;

const OutlineLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  padding: 14px 22px;
  background: #fff;
  color: var(--gold, #b08d57);
  border: 1.5px solid var(--gold, #b08d57);
  text-decoration: none;
  border-radius: 999px;
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-weight: 600;
  font-size: 15px;
  letter-spacing: 0.04em;
  transition: background 160ms ease;

  &:hover {
    background: rgba(176, 141, 87, 0.08);
  }
`;

const RsvpCallButton: React.FC<RsvpCallButtonProps> = ({ phone }) => {
  if (!phone) {
    return null;
  }

  return (
    <Wrap>
      <Flair>Nie możemy się doczekać…</Flair>
      <Eyebrow>Potwierdź obecność</Eyebrow>
      <ButtonRow>
        <PrimaryLink href={`tel:${phone}`}>Zadzwoń</PrimaryLink>
        <OutlineLink href={`sms:${phone}`}>SMS</OutlineLink>
      </ButtonRow>
    </Wrap>
  );
};

export default RsvpCallButton;
