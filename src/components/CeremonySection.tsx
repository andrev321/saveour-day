import React from 'react';
import styled from '@emotion/styled';
import { Card, CardKicker } from './layout';

type CeremonySectionProps = {
  description: string;
};

const Description = styled.p`
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-size: 16px;
  line-height: 1.55;
  font-weight: 400;
  margin: 0;
  color: var(--text-muted, #6b645c);
`;

const CeremonySection: React.FC<CeremonySectionProps> = ({ description }) => {
  return (
    <Card>
      <CardKicker>Uroczystość</CardKicker>
      <Description>{description}</Description>
    </Card>
  );
};

export default CeremonySection;
