import type { CeremonyDetails, PartyBlock, RoutePageConfig, TimelineItem } from '../types/wedding';

/** Zapytanie do map: nazwa + adres (stare `*_LOC` trafiają do nazwy, jeśli brak nowych kluczy). */
export function mapsSearchQuery(venueName: string, address: string): string {
  return [venueName, address].map((s) => s.trim()).filter(Boolean).join(', ');
}

function ceremonyFromEnv(): CeremonyDetails {
  const venueName =
    import.meta.env.VITE_WEDDING_VENUE_NAME?.trim() ||
    import.meta.env.VITE_WEDDING_LOC?.trim() ||
    'Lokalizacja wkrótce';
  const address = import.meta.env.VITE_WEDDING_ADDRESS?.trim() || '';
  return {
    date: import.meta.env.VITE_WEDDING_DATE || 'Data wkrótce',
    venueName,
    address,
    description: import.meta.env.VITE_WEDDING_DESC || 'Szczegóły wkrótce',
    mapSrc: import.meta.env.VITE_MAP_SRC || '',
    phone: import.meta.env.VITE_WEDDING_TEL || '',
  };
}

function slubParty(): PartyBlock {
  const venueName =
    import.meta.env.VITE_SLUB_RECEPTION_VENUE_NAME?.trim() ||
    import.meta.env.VITE_SLUB_RECEPTION_LOC?.trim() ||
    'Lokalizacja poczęstunku wkrótce';
  const address = import.meta.env.VITE_SLUB_RECEPTION_ADDRESS?.trim() || '';
  return {
    sectionTitle: 'Poczęstunek — kawa i ciasto',
    description: import.meta.env.VITE_SLUB_RECEPTION_DESC || 'Szczegóły poczęstunku wkrótce',
    venueName,
    address,
    mapSrc: import.meta.env.VITE_SLUB_RECEPTION_MAP_SRC || '',
  };
}

function obiadParty(): PartyBlock {
  const venueName =
    import.meta.env.VITE_RECEPTION_VENUE_NAME?.trim() ||
    import.meta.env.VITE_RECEPTION_LOC?.trim() ||
    'Lokalizacja poczęstunku wkrótce';
  const address = import.meta.env.VITE_RECEPTION_ADDRESS?.trim() || '';
  return {
    sectionTitle: 'Poczęstunek',
    description: import.meta.env.VITE_RECEPTION_DESC || 'Szczegóły poczęstunku wkrótce',
    venueName,
    address,
    mapSrc: import.meta.env.VITE_RECEPTION_MAP_SRC || '',
  };
}

function grillParty(): PartyBlock {
  const venueName =
    import.meta.env.VITE_GRILL_VENUE_NAME?.trim() ||
    import.meta.env.VITE_GRILL_LOC?.trim() ||
    'Lokalizacja grilla wkrótce';
  const address = import.meta.env.VITE_GRILL_ADDRESS?.trim() || '';
  return {
    sectionTitle: 'Grill (następnego dnia)',
    description: import.meta.env.VITE_GRILL_DESC || 'Szczegóły grilla wkrótce',
    venueName,
    address,
    mapSrc: import.meta.env.VITE_GRILL_MAP_SRC || '',
  };
}

function timelineCeremony(grillOption?: boolean): TimelineItem {
  return {
    time: import.meta.env.VITE_TIMELINE_CEREMONY_TIME  ? (grillOption? `${import.meta.env.VITE_WEDDING_DATE}, ${import.meta.env.VITE_TIMELINE_CEREMONY_TIME}`: import.meta.env.VITE_TIMELINE_CEREMONY_TIME) :'14:00',
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
  const ceremony = timelineCeremony(true);
  const grillTime = import.meta.env.VITE_GRILL_TIME? `${import.meta.env.VITE_GRILL_DATE}, ${import.meta.env.VITE_GRILL_TIME}` : '15:00';
  const grillVenue =
    import.meta.env.VITE_GRILL_VENUE_NAME?.trim() ||
    import.meta.env.VITE_GRILL_LOC?.trim() ||
    'Ogródki działkowe Dąbrowskiego';
  const grillLine: TimelineItem = {
    time: grillTime,
    label:
      import.meta.env.VITE_TIMELINE_GRILL_LABEL ||
      `Grill — ${grillVenue}`,
  };
  const heroDate = import.meta.env.VITE_GRILL_HERO_DATE?.trim() || undefined;
  return {
    ceremony: ceremonyFromEnv(),
    timeline: [ceremony, grillLine],
    party: grillParty(),
    heroDate,
  };
}
