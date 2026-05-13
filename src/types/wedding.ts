export type CeremonyDetails = {
  date: string;
  location: string;
  description: string;
  mapSrc: string;
  phone: string;
};

export type TimelineItem = {
  time: string;
  label: string;
};

export type PartyBlock = {
  sectionTitle: string;
  description: string;
  location: string;
  mapSrc: string;
};

export type RoutePageConfig = {
  ceremony: CeremonyDetails;
  timeline: TimelineItem[];
  party: PartyBlock | null;
  /** Dodatkowa linia pod datą w hero (np. data grilla) */
  heroSubtitle?: string;
};
