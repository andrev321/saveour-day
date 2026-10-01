"use client";
import { useState, type Dispatch, type SetStateAction } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { MediaAsset, SiteConfig } from "@invitations/domain";
import { CheckIcon } from "@phosphor-icons/react";
import { usePanelI18n } from "../lib/i18n";
import { mediaUi } from "../lib/media-i18n";
import * as S from "./PhotoLibrary.styles";



export function PhotoLibrary({
  config,
  library,
  urls,
  onChange,
  onDelete,
  canDelete,
}: {
  config: SiteConfig;
  library: { id: string; manifest: MediaAsset; status?: string }[];
  urls: Record<string, string>;
  onChange: Dispatch<SetStateAction<SiteConfig>>;
  onDelete: (id: string) => Promise<void>;
  canDelete: boolean;
}) {
  const { language } = usePanelI18n();
  const copy = mediaUi[language];
  const [selected, setSelected] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const photos = [
    ...config.media,
    ...library
      .filter((item) => !config.media.some((m) => m.id === item.id))
      .map((item) => item.manifest),
  ];
  const photo = photos.find((item) => item.id === selected);
  const included = config.media.some((item) => item.id === selected);
  const selectedMain = !!photo && config.hero.mediaId === photo.id;
  const selectedTablet = !!photo && config.hero.tabletMediaId === photo.id;
  const selectedMobile = !!photo && config.hero.mobileMediaId === photo.id;
  const locked = library.some(
    (item) => item.id === selected && item.status === "deleting",
  );
  const full = (!included && config.media.length >= 30) || locked || deleting;
  function update(
    patch: Partial<MediaAsset>,
    hero?: "mediaId" | "mobileMediaId" | "tabletMediaId",
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
            onClick={() => {
              setSelected(item.id);
              setDeleteError("");
              setConfirmDelete(false);
            }}
          >
            {library.some(
              (m) => m.id === item.id && m.status === "deleting",
            ) ? (
              <Text p="md" size="sm">
                {copy.deleting}
              </Text>
            ) : (
              <img
                src={urls[item.variants[0]?.src || item.src] || item.src}
                alt=""
                loading="lazy"
              />
            )}
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
                {config.hero.tabletMediaId === item.id && (
                  <Badge size="xs" variant="light">
                    {copy.tabletMain}
                  </Badge>
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
        onClose={() => {
          if (!deleting) {
            setSelected(null);
            setConfirmDelete(false);
          }
        }}
        closeOnEscape={!deleting}
        closeOnClickOutside={!deleting}
        withCloseButton={!deleting}
        title={copy.edit}
        size="xl"
        centered
      >
        {photo && (
          <Stack gap="lg">
            {full && !locked && !deleting && (
              <Alert color="orange">{copy.limit}</Alert>
            )}
            {locked && <Alert color="orange">{copy.deleting}</Alert>}
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
                variant={selectedMain ? "filled" : "light"}
                aria-pressed={selectedMain}
                leftSection={
                  selectedMain ? (
                    <CheckIcon size={18} aria-hidden="true" />
                  ) : undefined
                }
                onClick={() => update({}, "mediaId")}
              >
                {selectedMain ? copy.selectedMain : copy.useMain}
              </Button>
              <Button
                disabled={full}
                variant={selectedMobile ? "filled" : "light"}
                aria-pressed={selectedMobile}
                leftSection={
                  selectedMobile ? (
                    <CheckIcon size={18} aria-hidden="true" />
                  ) : undefined
                }
                onClick={() => update({}, "mobileMediaId")}
              >
                {selectedMobile ? copy.selectedMobile : copy.useMobile}
              </Button>
              <Button
                disabled={full}
                variant={selectedTablet ? "filled" : "light"}
                aria-pressed={selectedTablet}
                leftSection={
                  selectedTablet ? (
                    <CheckIcon size={18} aria-hidden="true" />
                  ) : undefined
                }
                onClick={() => update({}, "tabletMediaId")}
              >
                {selectedTablet ? copy.selectedTablet : copy.useTablet}
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
                        tabletMediaId:
                          current.hero.tabletMediaId === photo.id
                            ? undefined
                            : current.hero.tabletMediaId,
                        mobileMediaId:
                          current.hero.mobileMediaId === photo.id
                            ? undefined
                            : current.hero.mobileMediaId,
                      },
                      sections: current.sections.map((s) => ({
                        ...s,
                        ...(s.type === "gallery" ? {mediaIds: s.mediaIds.filter((id) => id !== photo.id), crops:Object.fromEntries(Object.entries(s.crops).filter(([id])=>id!==photo.id))} : {}),
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
            <Stack gap="xs">
              {deleteError && (
                <Alert color="red" role="alert">
                  {deleteError}
                </Alert>
              )}
              {included || !canDelete ? (
                <Text size="sm" c="dimmed">
                  {copy.saveFirst}
                </Text>
              ) : null}
              {confirmDelete ? (
                <Alert color="red" title={copy.deleteTitle}>
                  <Stack gap="sm">
                    <Text size="sm">{copy.deleteBody}</Text>
                    <Group>
                      <Button
                        variant="default"
                        disabled={deleting}
                        onClick={() => setConfirmDelete(false)}
                      >
                        {copy.cancel}
                      </Button>
                      <Button
                        color="red"
                        loading={deleting}
                        disabled={included || !canDelete}
                        onClick={async () => {
                          setDeleting(true);
                          setDeleteError("");
                          try {
                            await onDelete(photo.id);
                            setSelected(null);
                            setConfirmDelete(false);
                          } catch (error) {
                            setDeleteError(
                              error instanceof Error
                                ? error.message
                                : copy.deleteError,
                            );
                          } finally {
                            setDeleting(false);
                          }
                        }}
                      >
                        {copy.deleteConfirm}
                      </Button>
                    </Group>
                  </Stack>
                </Alert>
              ) : (
                <Button
                  color="red"
                  variant="light"
                  disabled={included || !canDelete}
                  onClick={() => setConfirmDelete(true)}
                >
                  {copy.deleteFile}
                </Button>
              )}
            </Stack>
            <Text size="sm" c="dimmed">
              {copy.changes}
            </Text>
            <Group justify="flex-end">
              <Button disabled={deleting} onClick={() => setSelected(null)}>
                {copy.done}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

