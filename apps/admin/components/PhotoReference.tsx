"use client";
import { createContext, useContext } from "react";
import type { MediaAsset } from "@invitations/domain";
import { Group, Text } from "@mantine/core";

import { LoadingImage } from "@invitations/ui/loading";

export const MediaUrlsContext = createContext<Record<string, string>>({});

export function photoName(photo: MediaAsset) {
  return photo.alt.trim() || photo.id;
}

export function photoSrcSet(
  photo: MediaAsset,
  urls: Record<string, string>,
): string | undefined {
  if (!photo.variants.length) return undefined;
  return photo.variants
    .map((variant) => `${urls[variant.src] || variant.src} ${variant.width}w`)
    .join(", ");
}

export function PhotoThumbnail({ photo }: { photo: MediaAsset }) {
  const urls = useContext(MediaUrlsContext);
  const source = photo.variants[0]?.src || photo.src;
  return (
    <LoadingImage
      src={urls[source] || urls[photo.src] || source}
      blurDataUrl={photo.blurDataUrl}
      alt=""
      loading="lazy"
      style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 4 }}
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
