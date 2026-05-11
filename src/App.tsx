import React from 'react'
import CeremonySection from './components/CeremonySection';
import LocationSection from './components/LocationSection';
import ReceptionSection from './components/ReceptionSection';
import RsvpCallButton from './components/RsvpCallButton';
import TimelineSection from './components/TimelineSection';
import WeddingHeader from './components/WeddingHeader';
import { HeroContent, HeroFade, HeroImage, HeroSection, Main, Page } from './components/layout';
import weddingBg from './assets/wedding-bg.png';
import type { WeddingDetails } from './types/wedding';

const App: React.FC = () => {
  // Pobieranie danych z procesu budowania (zmiennych środowiskowych)
  const wedding: WeddingDetails = {
    date: import.meta.env.VITE_WEDDING_DATE || "Data wkrótce",
    location: import.meta.env.VITE_WEDDING_LOC || "Lokalizacja wkrótce",
    description: import.meta.env.VITE_WEDDING_DESC || "Szczegóły wkrótce",
    receptionDescription: import.meta.env.VITE_RECEPTION_DESC || "Szczegóły poczęstunku wkrótce",
    receptionLocation: import.meta.env.VITE_RECEPTION_LOC || "Lokalizacja poczęstunku wkrótce",
    receptionMapSrc: import.meta.env.VITE_RECEPTION_MAP_SRC || "",
    phone: import.meta.env.VITE_WEDDING_TEL || "",
    mapSrc: import.meta.env.VITE_MAP_SRC || ""
  };

  return (
    <Page>
      <HeroSection>
        <HeroImage src={weddingBg} alt="" />
        <HeroFade />
        <HeroContent>
          <WeddingHeader date={wedding.date} />
        </HeroContent>
      </HeroSection>
      <Main>
        <TimelineSection />
        <CeremonySection description={wedding.description} />
        <LocationSection location={wedding.location} mapSrc={wedding.mapSrc} />
        <ReceptionSection
          description={wedding.receptionDescription}
          location={wedding.receptionLocation}
          mapSrc={wedding.receptionMapSrc}
        />
        <RsvpCallButton phone={wedding.phone} />
      </Main>
    </Page>
  );
};

export default App;
