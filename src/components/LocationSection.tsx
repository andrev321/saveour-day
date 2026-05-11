import React from 'react';
import styled from '@emotion/styled';
import { Card, SectionTitle } from './layout';

type LocationSectionProps = {
  location: string;
  mapSrc: string;
};

const LocationText = styled.p`
  font-size: clamp(1rem, 3.4vw, 1.14rem);
  font-weight: 500;
  margin: 0;
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

const LocationSection: React.FC<LocationSectionProps> = ({ location, mapSrc }) => {
  return (
    <Card>
      <SectionTitle>Lokalizacja</SectionTitle>
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

export default LocationSection;
