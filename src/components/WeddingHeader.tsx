import React from 'react';
import styled from '@emotion/styled';

type WeddingHeaderProps = {
  date: string;
  subtitle?: string;
};

const Header = styled.header`
  padding: 0;
`;

const Title = styled.h1`
  font-family: var(--font-serif, 'Georgia', serif);
  color: var(--gold, #b08d57);
  font-size: 36px;
  font-weight: 600;
  line-height: 1.08;
  margin: 0 0 10px;
  text-shadow:
    0 0 24px rgba(255, 255, 255, 0.95),
    0 1px 2px rgba(62, 48, 28, 0.18);
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
  font-size: 22px;
  margin: 0;
  font-weight: 600;
  color: #5a534a;
`;

const SubtitleText = styled.p`
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-size: 15px;
  margin: 10px 0 0;
  font-weight: 500;
  color: #6b645c;
  line-height: 1.4;
`;

const WeddingHeader: React.FC<WeddingHeaderProps> = ({ date, subtitle }) => {
  return (
    <Header>
      <Title>Aleksandra 
        <br />& Andrzej</Title>
      <HeartRow aria-hidden>♥</HeartRow>
      <DateText>{date}</DateText>
      {subtitle ? <SubtitleText>{subtitle}</SubtitleText> : null}
    </Header>
  );
};

export default WeddingHeader;
