import type { CeremonyDetails, PartyBlock, RoutePageConfig, TimelineItem } from '../types/wedding';

function ceremonyFromEnv(): CeremonyDetails {
  return {
    date: import.meta.env.VITE_WEDDING_DATE || 'Data wkrótce',
    location: import.meta.env.VITE_WEDDING_LOC || 'Lokalizacja wkrótce',
    description: import.meta.env.VITE_WEDDING_DESC || 'Szczegóły wkrótce',
    mapSrc: import.meta.env.VITE_MAP_SRC || '',
    phone: import.meta.env.VITE_WEDDING_TEL || '',
  };
}

function slubParty(): PartyBlock {
  return {
    sectionTitle: 'Poczęstunek — kawa i ciasto',
    description: import.meta.env.VITE_SLUB_RECEPTION_DESC || 'Szczegóły poczęstunku wkrótce',
    location: import.meta.env.VITE_SLUB_RECEPTION_LOC || 'Lokalizacja poczęstunku wkrótce',
    mapSrc: import.meta.env.VITE_SLUB_RECEPTION_MAP_SRC || '',
  };
}

function obiadParty(): PartyBlock {
  return {
    sectionTitle: 'Poczęstunek',
    description: import.meta.env.VITE_RECEPTION_DESC || 'Szczegóły poczęstunku wkrótce',
    location: import.meta.env.VITE_RECEPTION_LOC || 'Lokalizacja poczęstunku wkrótce',
    mapSrc: import.meta.env.VITE_RECEPTION_MAP_SRC || '',
  };
}

function grillParty(): PartyBlock {
  return {
    sectionTitle: 'Grill (następnego dnia)',
    description: import.meta.env.VITE_GRILL_DESC || 'Szczegóły grilla wkrótce',
    location: import.meta.env.VITE_GRILL_LOC || 'Lokalizacja grilla wkrótce',
    mapSrc: import.meta.env.VITE_GRILL_MAP_SRC || '',
  };
}

function timelineCeremony(): TimelineItem {
  return {
    time: import.meta.env.VITE_TIMELINE_CEREMONY_TIME || '14:00',
    label:
      import.meta.env.VITE_TIMELINE_CEREMONY_LABEL ||
      'Ceremonia — Parafia Imienia Jezus',
  };
}

export function getSlubPageConfig(): RoutePageConfig {
  const ceremony = timelineCeremony();
  const reception: TimelineItem = {
    time: import.meta.env.VITE_TIMELINE_SLUB_RECEPTION_TIME || '16:00',
    label:
      import.meta.env.VITE_TIMELINE_SLUB_RECEPTION_LABEL ||
      'Kawa i ciasto — szczegóły w sekcji poniżej',
  };
  return {
    ceremony: ceremonyFromEnv(),
    timeline: [ceremony, reception],
    party: slubParty(),
  };
}

export function getObiadPageConfig(): RoutePageConfig {
  const ceremony = timelineCeremony();
  const reception: TimelineItem = {
    time: import.meta.env.VITE_TIMELINE_OBIAD_RECEPTION_TIME || '16:00',
    label:
      import.meta.env.VITE_TIMELINE_OBIAD_RECEPTION_LABEL ||
      'Poczęstunek — Przystań Browarna',
  };
  return {
    ceremony: ceremonyFromEnv(),
    timeline: [ceremony, reception],
    party: obiadParty(),
  };
}

export function getGrillPageConfig(): RoutePageConfig {
  const ceremony = timelineCeremony();
  const grillTime = import.meta.env.VITE_GRILL_TIME || '15:00';
  const grillDate = import.meta.env.VITE_GRILL_DATE || 'Data wkrótce';
  const grillLoc = import.meta.env.VITE_GRILL_LOC || 'Ogródki działkowe Dąbrowskiego';
  const grillLine: TimelineItem = {
    time: `${grillTime} (następnego dnia)`,
    label:
      import.meta.env.VITE_TIMELINE_GRILL_LABEL ||
      `Grill — ${grillLoc}`,
  };
  return {
    ceremony: ceremonyFromEnv(),
    timeline: [ceremony, grillLine],
    party: grillParty(),
    heroSubtitle: grillDate ? `Grill: ${grillDate}, godz. ${grillTime}` : undefined,
  };
}
