/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEDDING_DATE: string;
  /** @deprecated Użyj VITE_WEDDING_VENUE_NAME — zostawione jako zapas w kodzie */
  readonly VITE_WEDDING_LOC: string;
  readonly VITE_WEDDING_VENUE_NAME: string;
  readonly VITE_WEDDING_ADDRESS: string;
  readonly VITE_WEDDING_DESC: string;
  readonly VITE_MAP_SRC: string;
  readonly VITE_WEDDING_TEL: string;
  readonly VITE_RECEPTION_DESC: string;
  /** @deprecated Użyj VITE_RECEPTION_VENUE_NAME */
  readonly VITE_RECEPTION_LOC: string;
  readonly VITE_RECEPTION_VENUE_NAME: string;
  readonly VITE_RECEPTION_ADDRESS: string;
  readonly VITE_RECEPTION_MAP_SRC: string;
  readonly VITE_SLUB_RECEPTION_DESC: string;
  /** @deprecated Użyj VITE_SLUB_RECEPTION_VENUE_NAME */
  readonly VITE_SLUB_RECEPTION_LOC: string;
  readonly VITE_SLUB_RECEPTION_VENUE_NAME: string;
  readonly VITE_SLUB_RECEPTION_ADDRESS: string;
  readonly VITE_SLUB_RECEPTION_MAP_SRC: string;
  readonly VITE_TIMELINE_CEREMONY_TIME: string;
  readonly VITE_TIMELINE_CEREMONY_LABEL: string;
  readonly VITE_TIMELINE_SLUB_RECEPTION_TIME: string;
  readonly VITE_TIMELINE_SLUB_RECEPTION_LABEL: string;
  readonly VITE_TIMELINE_OBIAD_RECEPTION_TIME: string;
  readonly VITE_TIMELINE_OBIAD_RECEPTION_LABEL: string;
  readonly VITE_GRILL_HERO_DATE: string;
  readonly VITE_GRILL_DATE: string;
  readonly VITE_GRILL_TIME: string;
  readonly VITE_GRILL_DESC: string;
  /** @deprecated Użyj VITE_GRILL_VENUE_NAME */
  readonly VITE_GRILL_LOC: string;
  readonly VITE_GRILL_VENUE_NAME: string;
  readonly VITE_GRILL_ADDRESS: string;
  readonly VITE_GRILL_MAP_SRC: string;
  readonly VITE_TIMELINE_GRILL_LABEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
