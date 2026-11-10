import { Select, Stack } from "@mantine/core";
import { useContext } from "react";
import type { DeviceCrops, SiteConfig } from "@invitations/domain";
import { usePanelI18n } from "../lib/i18n";
import { DeviceSelector, type PhotoDevice } from "./DeviceSelector";
import { PhotoCropEditor } from "./PhotoCropEditor";
import {
  MediaUrlsContext,
  PhotoReference,
  PhotoThumbnail,
  photoName,
} from "./PhotoReference";

const photoLabel = {
  pl: "Zdjęcie dla wybranego urządzenia",
  en: "Photo for selected device",
  de: "Foto für ausgewähltes Gerät",
};

export function ContentPhotoField({
  config,
  id,
  crops,
  onId,
  onCrops,
  device,
  onDevice,
}: {
  config: SiteConfig;
  id?: string;
  crops: DeviceCrops;
  onId: (id: string | null) => void;
  onCrops: (c: DeviceCrops) => void;
  device: PhotoDevice;
  onDevice: (d: PhotoDevice) => void;
}) {
  const { language } = usePanelI18n();
  const urls = useContext(MediaUrlsContext);
  const photo = config.media.find((p) => p.id === id);
  return (
    <Stack>
      {!photo && <DeviceSelector device={device} onChange={onDevice} />}
      <Select
        label={photoLabel[language]}
        searchable
        allowDeselect={false}
        clearable
        value={id || null}
        data={config.media.map((p) => ({ value: p.id, label: photoName(p) }))}
        leftSection={photo ? <PhotoThumbnail photo={photo} /> : undefined}
        leftSectionWidth={48}
        styles={{ input: { minHeight: 48 } }}
        renderOption={({ option }) => (
          <PhotoReference
            photo={config.media.find((p) => p.id === option.value)!}
          />
        )}
        onChange={onId}
      />
      {photo && (
        <PhotoCropEditor
          photo={photo}
          crops={crops}
          urls={urls}
          device={device}
          onDevice={onDevice}
          disabled={false}
          onChange={onCrops}
        />
      )}
    </Stack>
  );
}
