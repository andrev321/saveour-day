import React from 'react';
import styled from '@emotion/styled';
import { Card, SectionTitle } from './layout';

type ReceptionSectionProps = {
  description: string;
  location: string;
  mapSrc: string;
};

const Description = styled.p`
  font-size: clamp(0.96rem, 3.5vw, 1.08rem);
  line-height: 1.45;
  font-weight: 400;
  margin: 0;
  color: #444;
`;

const LocationText = styled.p`
  font-size: clamp(1rem, 3.4vw, 1.14rem);
  font-weight: 500;
  margin-top: 10px;
`;

const MapFrameWrapper = styled.div`
  border-radius: 10px;
  overflow: hidden;
  margin-top: 15px;
  border: 1px solid #ddd;
`;

const MapFrame = styled.iframe`
  border: 0;
  display: block;
  width: 100%;
  height: clamp(210px, 45vw, 300px);
`;

const ReceptionSection: React.FC<ReceptionSectionProps> = ({ description, location, mapSrc }) => {
  return (
    <Card>
      <SectionTitle>Poczęstunek</SectionTitle>
      <Description>{description}</Description>
      <LocationText>
        <strong>{location}</strong>
      </LocationText>

      {mapSrc && (
        <MapFrameWrapper>
          <MapFrame src={mapSrc} allowFullScreen loading="lazy" />
        </MapFrameWrapper>
      )}
    </Card>
  );
};

export default ReceptionSection;
