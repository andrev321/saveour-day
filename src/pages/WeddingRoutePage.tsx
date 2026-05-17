import React from 'react';
import LocationSection from '../components/LocationSection';
import ReceptionSection from '../components/ReceptionSection';
import HeroWaves from '../components/HeroWaves';
import RsvpCallButton from '../components/RsvpCallButton';
import TimelineSection from '../components/TimelineSection';
import WeddingHeader from '../components/WeddingHeader';
import { HeroContent, HeroImage, HeroReadability, HeroSection, Main, Page } from '../components/layout';
import type { RoutePageConfig } from '../types/wedding';

type WeddingRoutePageProps = {
  config: RoutePageConfig;
  heroImageSrc: string;
};

const WeddingRoutePage: React.FC<WeddingRoutePageProps> = ({ config, heroImageSrc }) => {
  const { ceremony, timeline, party, heroDate } = config;

  return (
    <Page>
      <HeroSection>
        <HeroImage src={heroImageSrc} alt="" />
        <HeroReadability />
        <HeroWaves />
        <HeroContent>
          <WeddingHeader date={heroDate ?? ceremony.date} />
        </HeroContent>
      </HeroSection>
      <Main>
        <TimelineSection items={timeline} />
        <LocationSection
          venueName={ceremony.venueName}
          address={ceremony.address}
          mapSrc={ceremony.mapSrc}
        />
        {party ? (
          <ReceptionSection
            sectionTitle={party.sectionTitle}
            description={party.description}
            venueName={party.venueName}
            address={party.address}
            mapSrc={party.mapSrc}
          />
        ) : null}
        <RsvpCallButton phone={ceremony.phone} />
      </Main>
    </Page>
  );
};

export default WeddingRoutePage;
