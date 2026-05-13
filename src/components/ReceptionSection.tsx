import React from 'react';
import styled from '@emotion/styled';
import { mapsSearchQuery } from '../config/weddingEnv';
import { Card, CardKicker } from './layout';

type ReceptionSectionProps = {
  sectionTitle?: string;
  description: string;
  venueName: string;
  address: string;
  mapSrc: string;
};

const SectionHeading = styled.h3`
  font-family: var(--font-serif, 'Georgia', serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--text, #3f3a34);
  margin: 0 0 12px;
  line-height: 1.25;
`;

const Description = styled.p`
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-size: 16px;
  line-height: 1.55;
  font-weight: 400;
  margin: 0 0 16px;
  color: var(--text-muted, #6b645c);
`;

const Grid = styled.div`
  display: grid;
  gap: 16px;
  align-items: start;

  @media (min-width: 480px) {
    grid-template-columns: 1fr 160px;
    gap: 18px;
  }
`;

const Copy = styled.div`
  min-width: 0;
`;

const VenueTitle = styled.h4`
  font-family: var(--font-serif, 'Georgia', serif);
  font-size: 20px;
  font-weight: 600;
  color: var(--text, #3f3a34);
  margin: 0 0 8px;
  line-height: 1.25;
`;

const Address = styled.p`
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-size: 14px;
  color: var(--text-muted, #6b645c);
  margin: 0 0 12px;
  line-height: 1.45;
`;

const ThumbWrap = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(176, 141, 87, 0.2);
  width: 100%;
  height: 120px;
  background: var(--gold-soft, rgba(176, 141, 87, 0.12));
`;

const MapThumb = styled.iframe`
  border: 0;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 120px;
  pointer-events: none;
`;

const NavButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1.5px solid var(--gold, #b08d57);
  color: var(--gold, #b08d57);
  font-family: var(--font-sans, 'Inter', sans-serif);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
  transition: background 160ms ease, color 160ms ease;

  &:hover {
    background: rgba(176, 141, 87, 0.1);
  }
`;

const mapSearchUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const ReceptionSection: React.FC<ReceptionSectionProps> = ({
  sectionTitle = 'Poczęstunek',
  description,
  venueName,
  address,
  mapSrc,
}) => {
  if (!sectionTitle || !description || !venueName || !address || !mapSrc) return null;
  const v = venueName.trim();
  const a = address.trim();
  const placeTitle = v || a || 'Lokalizacja wkrótce';
  const addressLine = v && a ? a : '';
  const mapsHref = mapSearchUrl(mapsSearchQuery(venueName, address));

  return (
    <Card>
      <CardKicker>{sectionTitle}</CardKicker>
      <Grid>
        <Copy>
          <VenueTitle>{placeTitle}</VenueTitle>
          {addressLine ? <Address>{addressLine}</Address> : null}
          <NavButton href={mapsHref} target="_blank" rel="noopener noreferrer">
            Nawiguj
          </NavButton>
        </Copy>
        {mapSrc ? (
          <ThumbWrap>
            <MapThumb src={mapSrc} title="Podgląd mapy — poczęstunek" loading="lazy" />
          </ThumbWrap>
        ) : null}
      </Grid>
    </Card>
  );
};

export default ReceptionSection;
