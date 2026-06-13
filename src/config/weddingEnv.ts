import type { CeremonyDetails, RoutePageConfig, TimelineItem } from '../types/wedding';

// --- Safe JSON Parsing Helper ---
function parseEnvJson<T>(envValue: string | undefined, fallback: T): T {
  try {
    if (envValue) {
      return JSON.parse(envValue) as T;
    }
  } catch (e) {
    console.error(`Failed to parse env config. Using default fallback.`, e);
  }
  return fallback;
}

// --- Parsed Configurations ---

const commonConfig = parseEnvJson(import.meta.env.VITE_CONFIG_COMMON, {
  weddingDate: 'Data wkrótce',
  venueName: 'Lokalizacja wkrótce',
  address: '',
  description: 'Szczegóły wkrótce',
  mapSrc: '',
  phone: '',
});

const timelineConfig = parseEnvJson(import.meta.env.VITE_CONFIG_TIMELINE, {
  ceremonyTime: '14:00',
  ceremonyLabel: 'Ceremonia — Parafia Imienia Jezus',
});

const slubConfig = parseEnvJson(import.meta.env.VITE_CONFIG_SLUB, {
  timelineReceptionTime: '15:00',
  timelineReceptionLabel: 'Kawa i ciasto — na terenie parafii',
  sectionTitle: 'Poczęstunek — kawa i ciasto',
  description: 'Szczegóły poczęstunku wkrótce',
  venueName: '',
  address: '',
  mapSrc: '',
});

const parkingConfig = parseEnvJson(import.meta.env.VITE_CONFIG_PARKING, {
  description: 'Szczegóły parkingu wkrótce',
  venueName: '',
  address: '',
  mapSrc: '',
  navigateUrl: '',
});

const obiadConfig = parseEnvJson(import.meta.env.VITE_CONFIG_OBIAD, {
  venueName: 'Przystań Browarna',
  address: 'Browarna 37, 61-063 Poznań',
  mapSrc: '',
  description: 'Poczęstunek wkrótce',
  timelineReceptionTime: '16:00',
  timelineReceptionLabel: 'Poczęstunek — Przystań Browarna',
});

const grillConfig = parseEnvJson(import.meta.env.VITE_CONFIG_GRILL, {
  heroDate: undefined as string | undefined,
  date: '',
  fbUrl: '',
  time: '15:00',
  desc: 'Szczegóły grilla wkrótce',
  venueName: 'Ogródki działkowe Dąbrowskiego',
  address: '',
  mapSrc: '',
  timelineLabel: 'Grill',
});

// --- Utility Functions ---

export function mapsSearchQuery(venueName: string, address: string): string {
  return [venueName, address].map((s) => s?.trim()).filter(Boolean).join(', ');
}

function ceremonyFromEnv(): CeremonyDetails {
  return {
    date: commonConfig.weddingDate,
    venueName: commonConfig.venueName?.trim() || 'Lokalizacja wkrótce',
    address: commonConfig.address?.trim() || '',
    description: commonConfig.description,
    mapSrc: commonConfig.mapSrc,
    phone: commonConfig.phone,
  };
}

function timelineCeremony(grillOption?: boolean): TimelineItem {
  const time = timelineConfig.ceremonyTime;
  return {
    time: time ? (grillOption ? `${commonConfig.weddingDate}, ${time}` : time) : '14:00',
    label: timelineConfig.ceremonyLabel,
  };
}

function timelineReception(grillOption?: boolean): TimelineItem {
  const time = slubConfig.timelineReceptionTime;
  return {
    time: time ? (grillOption ? `${commonConfig.weddingDate}, ${time}` : time) : '14:00',
    label: slubConfig.timelineReceptionLabel,
  };
}

// --- Page Loaders ---

export function getSlubPageConfig(): RoutePageConfig {
  const ceremony = timelineCeremony();
  const reception: TimelineItem = {
    time: slubConfig.timelineReceptionTime || '15:00',
    label: slubConfig.timelineReceptionLabel || 'Kawa i ciasto — na terenie parafii',
  };
  return {
    ceremony: ceremonyFromEnv(),
    timeline: [ceremony, reception],
    parking: parkingConfig,
    party: {
      sectionTitle: slubConfig.sectionTitle || 'Poczęstunek — kawa i ciasto',
      description: slubConfig.description || 'Szczegóły poczęstunku wkrótce',
      venueName: slubConfig.venueName?.trim() || 'Lokalizacja poczęstunku wkrótce',
      address: slubConfig.address?.trim() || '',
      mapSrc: slubConfig.mapSrc || '',
    },
  };
}

export function getObiadPageConfig(): RoutePageConfig {
  const ceremony = timelineCeremony();
  const reception = timelineReception();
  const dinner: TimelineItem = {
    time: obiadConfig.timelineReceptionTime || '16:00',
    label: obiadConfig.timelineReceptionLabel || 'Poczęstunek — Przystań Browarna',
  };
  return {
    ceremony: ceremonyFromEnv(),
    timeline: [ceremony, reception, dinner],
    parking: parkingConfig,
    party: {
      sectionTitle: 'Poczęstunek',
      description: obiadConfig.description || 'Szczegóły poczęstunku wkrótce',
      venueName: obiadConfig.venueName?.trim() || 'Lokalizacja poczęstunku wkrótce',
      address: obiadConfig.address?.trim() || '',
      mapSrc: obiadConfig.mapSrc || '',
    },
  };
}

export function getGrillPageConfig(): RoutePageConfig {
  const ceremony = timelineCeremony(true);
  const reception=  timelineReception(true);
  const grillTime = grillConfig.time ? `${grillConfig.date}, ${grillConfig.time}` : '15:00';
  const grillVenue = grillConfig.venueName?.trim() || 'Ogródki działkowe Dąbrowskiego';

  const grillLine: TimelineItem = {
    time: grillTime,
    label: grillConfig.timelineLabel || `Grill — ${grillVenue}`,
    url: grillConfig.fbUrl,
  };

  return {
    ceremony: ceremonyFromEnv(),
    timeline: [ceremony, reception, grillLine],
    parking: parkingConfig,
    party: {
      sectionTitle: `Grill (${grillConfig.date})`,
      description: grillConfig.desc || 'Szczegóły grilla wkrótce',
      venueName: grillVenue,
      address: grillConfig.address?.trim() || '',
      mapSrc: grillConfig.mapSrc || '',
      fbUrl: grillConfig.fbUrl,
    },
    heroDate: grillConfig.heroDate?.trim() || undefined,
  };
}