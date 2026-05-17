import React from 'react';
import styled from '@emotion/styled';

type WeddingHeaderProps = {
  date: string;
};

const Header = styled.header`
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h1`
  font-family: var(--font-serif, 'Georgia', serif);
  color: var(--gold, #b08d57);
  font-size: 24px;
  font-weight: 600;
  line-height: 1.08;
  margin: 0 0 10px;
  text-wrap: wrap;
  text-shadow:
    0 0 24px rgba(255, 255, 255, 0.95),
    0 1px 2px rgba(62, 48, 28, 0.18);

  @media (min-width:320px)  { font-size: 24px }
  @media (min-width:380px)  { font-size: 28px }
  @media (min-width:420px)  { font-size: 30px }
  @media (min-width:600px)  { font-size: 34px; max-width:200px; }
  @media (min-width:801px)  { font-size: 42px;  }
`;

const HeartRow = styled.p`
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--gold, #b08d57);
  letter-spacing: 0.12em;
  opacity: 0.88;
`;

const DateText = styled.p`
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-size: 16px;
  margin: 0;
  font-weight: 600;
  color: #5a534a;
  
  @media (min-width:600px)  { font-size: 18px }
  @media (min-width:801px)  { font-size: 20px }
`;

const WeddingHeader: React.FC<WeddingHeaderProps> = ({ date }) => {
  return (
    <Header>
      <Title>Aleksandra & Andrzej</Title>
      <HeartRow aria-hidden>♥</HeartRow>
      <DateText>{date}</DateText>
    </Header>
  );
};

export default WeddingHeader;
