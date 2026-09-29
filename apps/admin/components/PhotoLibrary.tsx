"use client";
import {
  useState,
  type Dispatch,
  type SetStateAction,
  type PointerEvent,
} from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { MediaAsset, SiteConfig } from "@invitations/domain";
import { usePanelI18n } from "../lib/i18n";
import { mediaUi } from "../lib/media-i18n";
import * as S from "./PhotoLibrary.styles";

export function PhotoLibrary({
  config,
  library,
  urls,
  onChange,
}: {
  config: SiteConfig;
  library: { id: string; manifest: MediaAsset }[];
  urls: Record<string, string>;
  onChange: Dispatch<SetStateAction<SiteConfig>>;
}) {
  const { language } = usePanelI18n();
  const copy = mediaUi[language];
  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState("desktop");
  const photos = [
    ...config.media,
    ...library
      .filter((item) => !config.media.some((m) => m.id === item.id))
      .map((item) => item.manifest),
  ];
  const photo = photos.find((item) => item.id === selected);
  const included = config.media.some((item) => item.id === selected);
  const full = !included && config.media.length >= 30;
  const xKey = device === "mobile" ? "mobileFocalX" : "focalX";
  const yKey = device === "mobile" ? "mobileFocalY" : "focalY";
  function update(
    patch: Partial<MediaAsset>,
    hero?: "mediaId" | "mobileMediaId",
  ) {
    if (!photo || full) return;
    onChange((current) => {
      const exists = current.media.some((m) => m.id === photo.id);
      if (!exists && current.media.length >= 30) return current;
      return {
        ...current,
        media: exists
          ? current.media.map((m) =>
              m.id === photo.id ? { ...m, ...patch } : m,
            )
          : [...current.media, { ...photo, ...patch }],
        hero: hero ? { ...current.hero, [hero]: photo.id } : current.hero,
      };
    });
  }
  function position(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
    update({
      [xKey]: clamp(((event.clientX - bounds.left) / bounds.width) * 100),
      [yKey]: clamp(((event.clientY - bounds.top) / bounds.height) * 100),
    });
  }
  return (
    <Stack>
      <Title order={3}>{copy.title}</Title>
      <Text size="sm" c="dimmed">
        {copy.help}
      </Text>
      {!photos.length && <Text c="dimmed">{copy.empty}</Text>}
      <S.Grid>
        {photos.map((item, index) => (
          <S.Tile
            key={item.id}
            type="button"
            aria-label={`${copy.edit}: ${item.alt || `${copy.photo} ${index + 1}`}`}
            onClick={() => setSelected(item.id)}
          >
            <img
              src={urls[item.variants[0]?.src || item.src] || item.src}
              alt=""
              loading="lazy"
            />
            <Stack p="sm" gap={6}>
              <Text fw={600} size="sm" lineClamp={2}>
                {item.alt || `${copy.photo} ${index + 1}`}
              </Text>
              <Text size="xs" c="dimmed">
                {item.width} × {item.height} px
              </Text>
              <Group gap={4}>
                {config.hero.mediaId === item.id && (
                  <Badge size="xs">{copy.main}</Badge>
                )}
                {config.hero.mobileMediaId === item.id && (
                  <Badge size="xs" variant="light">
                    {copy.phone}
                  </Badge>
                )}
                {!config.media.some((m) => m.id === item.id) && (
                  <Badge size="xs" color="gray">
                    {copy.saved}
                  </Badge>
                )}
              </Group>
            </Stack>
          </S.Tile>
        ))}
      </S.Grid>
      <Modal
        opened={!!photo}
        onClose={() => setSelected(null)}
        title={copy.edit}
        size="xl"
        centered
      >
        {photo && (
          <Stack gap="lg">
            {full && <Alert color="orange">{copy.limit}</Alert>}
            <SegmentedControl
              value={device}
              onChange={setDevice}
              data={[
                { value: "desktop", label: copy.desktop },
                { value: "mobile", label: copy.mobile },
              ]}
            />
            <S.Editor>
              <Stack gap="sm">
                <Text fw={600}>{copy.point}</Text>
                <Text size="sm" c="dimmed" id="photo-focus-help">
                  {copy.pointHelp}
                </Text>
                <S.Focus
                  role="group"
                  tabIndex={full ? -1 : 0}
                  aria-label={copy.point}
                  aria-describedby="photo-focus-help"
                  aria-disabled={full}
                  onPointerDown={(e) => {
                    if (full) return;
                    e.currentTarget.focus();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    position(e);
                  }}
                  onPointerMove={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId))
                      position(e);
                  }}
                  onPointerUp={(e) => {
                    if (e.currentTarget.hasPointerCapture(e.pointerId))
                      e.currentTarget.releasePointerCapture(e.pointerId);
                  }}
                  onKeyDown={(e) => {
                    if (
                      ![
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                        "Home",
                      ].includes(e.key)
                    )
                      return;
                    e.preventDefault();
                    const step = e.shiftKey ? 10 : 2;
                    update({
                      [xKey]:
                        e.key === "Home"
                          ? 50
                          : Math.max(
                              0,
                              Math.min(
                                100,
                                photo[xKey] +
                                  (e.key === "ArrowRight"
                                    ? step
                                    : e.key === "ArrowLeft"
                                      ? -step
                                      : 0),
                              ),
                            ),
                      [yKey]:
                        e.key === "Home"
                          ? 50
                          : Math.max(
                              0,
                              Math.min(
                                100,
                                photo[yKey] +
                                  (e.key === "ArrowDown"
                                    ? step
                                    : e.key === "ArrowUp"
                                      ? -step
                                      : 0),
                              ),
                            ),
                    });
                  }}
                >
                  <img
                    src={urls[photo.src] || photo.src}
                    alt={photo.alt}
                    draggable={false}
                    width={photo.width}
                    height={photo.height}
                  />
                  <S.Marker
                    data-testid="photo-focus-marker"
                    aria-hidden="true"
                    style={{ left: `${photo[xKey]}%`, top: `${photo[yKey]}%` }}
                  />
                </S.Focus>
                <Button
                  variant="subtle"
                  disabled={full}
                  onClick={() => update({ [xKey]: 50, [yKey]: 50 })}
                >
                  {copy.center}
                </Button>
              </Stack>
              <Stack gap="sm">
                <Text fw={600}>{copy.crop}</Text>
                <S.Crop
                  data-testid="photo-crop"
                  src={urls[photo.src] || photo.src}
                  alt={photo.alt}
                  style={{
                    width: device === "mobile" ? "min(100%, 225px)" : "100%",
                    aspectRatio: device === "mobile" ? "3 / 4" : "4 / 3",
                    objectPosition: `${photo[xKey]}% ${photo[yKey]}%`,
                  }}
                />
                <Text size="sm" c="dimmed">
                  {copy.cropHelp}
                </Text>
              </Stack>
            </S.Editor>
            <TextInput
              label={copy.alt}
              description={copy.altHelp}
              value={photo.alt}
              disabled={full}
              maxLength={300}
              onChange={(e) => update({ alt: e.currentTarget.value })}
            />
            <Group>
              <Button
                disabled={full}
                variant="light"
                onClick={() => update({}, "mediaId")}
              >
                {copy.useMain}
              </Button>
              <Button
                disabled={full}
                variant="light"
                onClick={() => update({}, "mobileMediaId")}
              >
                {copy.useMobile}
              </Button>
              {!included && (
                <Button disabled={full} onClick={() => update({})}>
                  {copy.add}
                </Button>
              )}
            </Group>
            {included && (
              <Stack gap={4}>
                <Button
                  color="red"
                  variant="subtle"
                  onClick={() => {
                    onChange((current) => ({
                      ...current,
                      media: current.media.filter((m) => m.id !== photo.id),
                      hero: {
                        ...current.hero,
                        mediaId:
                          current.hero.mediaId === photo.id
                            ? undefined
                            : current.hero.mediaId,
                        mobileMediaId:
                          current.hero.mobileMediaId === photo.id
                            ? undefined
                            : current.hero.mobileMediaId,
                      },
                      sections: current.sections.map((s) => ({
                        ...s,
                        mediaIds: s.mediaIds.filter((id) => id !== photo.id),
                      })),
                    }));
                    setSelected(null);
                  }}
                >
                  {copy.remove}
                </Button>
                <Text size="xs" c="dimmed">
                  {copy.removeHelp}
                </Text>
              </Stack>
            )}
            <Text size="sm" c="dimmed">
              {copy.changes}
            </Text>
            <Group justify="flex-end">
              <Button onClick={() => setSelected(null)}>{copy.done}</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
