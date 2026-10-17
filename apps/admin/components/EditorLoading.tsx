"use client";
import { Container, SimpleGrid, Stack } from "@mantine/core";
import { LoadingState, LoadingSkeleton } from "@invitations/ui/loading";
import { loadingText } from "@invitations/ui/loading-copy";
import { usePanelI18n } from "../lib/i18n";
export function EditorLoading() {
  const { language } = usePanelI18n();
  return (
    <Container size="xl" py="xl" aria-busy="true">
      <LoadingState
        label={loadingText(language, "project")}
        slowLabel={loadingText(language, "slow")}
      />
      <div aria-hidden="true">
        <LoadingSkeleton style={{ height: 54, marginBottom: 24 }} />
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Stack>
            <LoadingSkeleton style={{ height: 44, width: "70%" }} />
            {[0, 1, 2, 3].map((i) => (
              <LoadingSkeleton key={i} style={{ height: 60 }} />
            ))}
          </Stack>
          <LoadingSkeleton style={{ height: 360, borderRadius: 20 }} />
        </SimpleGrid>
      </div>
    </Container>
  );
}
