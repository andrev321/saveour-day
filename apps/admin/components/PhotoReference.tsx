"use client";
import { createContext, useContext } from "react";
import type { MediaAsset } from "@invitations/domain";
import { Image, Group, Text } from "@mantine/core";

export const MediaUrlsContext = createContext<Record<string, string>>({});

export function photoName(photo: MediaAsset) {
  return photo.alt.trim() || photo.id;
}

export function PhotoThumbnail({ photo }: { photo: MediaAsset }) {
  const urls = useContext(MediaUrlsContext);
  const source = photo.variants[0]?.src || photo.src;
  return (
    <Image
      src={urls[source] || urls[photo.src] || source}
      alt=""
      w={36}
      h={36}
      radius="sm"
      fit="cover"
      loading="lazy"
      style={{ flexShrink: 0 }}
      data-ui="photo-reference-thumbnail"
    />
  );
}

export function PhotoReference({ photo }: { photo: MediaAsset }) {
  const name = photoName(photo);
  return (
    <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
      <PhotoThumbnail photo={photo} />
      <Text size="sm" style={{ overflowWrap: "anywhere", minWidth: 0 }}>
        {name}
      </Text>
    </Group>
  );
}
