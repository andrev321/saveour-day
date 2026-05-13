import React from 'react';
import CeremonySection from '../components/CeremonySection';
import LocationSection from '../components/LocationSection';
import ReceptionSection from '../components/ReceptionSection';
import HeroWaves from '../components/HeroWaves';
import RouteNav from '../components/RouteNav';
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
  const { ceremony, timeline, party, heroSubtitle } = config;

  return (
    <Page>
      <HeroSection>
        <HeroImage src={heroImageSrc} alt="" />
        <HeroReadability />
        <HeroWaves />
        <HeroContent>
          <WeddingHeader date={ceremony.date} subtitle={heroSubtitle} />
        </HeroContent>
      </HeroSection>
      <Main>
        <RouteNav />
        <TimelineSection items={timeline} />
        <CeremonySection description={ceremony.description} />
        <LocationSection location={ceremony.location} mapSrc={ceremony.mapSrc} />
        {party ? (
          <ReceptionSection
            sectionTitle={party.sectionTitle}
            description={party.description}
            location={party.location}
            mapSrc={party.mapSrc}
          />
        ) : null}
        <RsvpCallButton phone={ceremony.phone} />
      </Main>
    </Page>
  );
};

export default WeddingRoutePage;
