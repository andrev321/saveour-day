import React from 'react';
import styled from '@emotion/styled';

type WeddingHeaderProps = {
  date: string;
};

const Header = styled.header`
  padding: 0;
`;

const Title = styled.h1`
  color: #a68b5b;
  font-size: clamp(2rem, 8vw, 2.8rem);
  font-weight: 600;
  line-height: 1.1;
  margin: 0 0 8px;
  text-shadow: 0 2px 14px rgba(249, 246, 242, 0.25);
`;

const DateText = styled.p`
  font-size: clamp(1.55rem, 5.2vw, 1.85rem);
  margin: 0;
  font-weight: 600;
  color: #555;
  text-shadow: 0 2px 14px rgba(249, 246, 242, 0.25);
`;

const WeddingHeader: React.FC<WeddingHeaderProps> = ({ date }) => {
  return (
    <Header>
      <Title>Aleksandra & Andrzej</Title>
      <DateText>{date}</DateText>
    </Header>
  );
};

export default WeddingHeader;
