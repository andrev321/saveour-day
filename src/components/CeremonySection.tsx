import React from 'react';
import styled from '@emotion/styled';
import { Card, SectionTitle } from './layout';

type CeremonySectionProps = {
  description: string;
};

const Description = styled.p`
  font-size: clamp(0.96rem, 3.5vw, 1.08rem);
  line-height: 1.45;
  font-weight: 400;
  margin: 0;
  color: #444;
`;

const CeremonySection: React.FC<CeremonySectionProps> = ({ description }) => {
  return (
    <Card>
      <SectionTitle>Uroczystość</SectionTitle>
      <Description>{description}</Description>
    </Card>
  );
};

export default CeremonySection;
