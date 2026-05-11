import React from 'react';
import styled from '@emotion/styled';

type RsvpCallButtonProps = {
  phone: string;
};

const CtaLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background-color: #a68b5b;
  color: white;
  text-decoration: none;
  border-radius: 30px;
  font-weight: 600;
  margin-top: 12px;
  font-size: clamp(0.9rem, 3.3vw, 0.96rem);
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(122, 92, 43, 0.28);
    filter: brightness(1.03);
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const Caption = styled.p`
  margin: 0;
  font-size: 0.92rem;
  font-weight: 400;
  color: #6a675f;
`;

const RsvpCallButton: React.FC<RsvpCallButtonProps> = ({ phone }) => {
  if (!phone) {
    return null;
  }

  return (
    <>
      <Caption>Prosimy o potwierdzenie przybycia</Caption>
      <ButtonRow>
        <CtaLink href={`tel:${phone}`}>Telefon</CtaLink>
        <CtaLink href={`sms:${phone}`}>SMS</CtaLink>
      </ButtonRow>
    </>
  );
};

export default RsvpCallButton;
