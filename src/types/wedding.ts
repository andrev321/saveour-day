export type VenuePlace = {
  /** Nazwa miejsca (np. świątynia, restauracja) */
  venueName: string;
  /** Adres (ulica, kod, miasto) */
  address: string;
};

export type CeremonyDetails = {
  date: string;
  description: string;
  mapSrc: string;
  phone: string;
} & VenuePlace;


export type ParkingDetails = {
  description: string;
  mapSrc: string;
} & VenuePlace;

export type TimelineItem = {
  time: string;
  label: string;
  url?: string;
};

export type PartyBlock = {
  sectionTitle: string;
  description: string;
  mapSrc: string;
  fbUrl?: string;
} & VenuePlace;

export type RoutePageConfig = {
  ceremony: CeremonyDetails;
  parking: ParkingDetails;
  timeline: TimelineItem[];
  party: PartyBlock | null;
  /** Data w hero — tylko trasa /grill, z `VITE_GRILL_HERO_DATE`; inaczej `ceremony.date`. */
  heroDate?: string;
};
