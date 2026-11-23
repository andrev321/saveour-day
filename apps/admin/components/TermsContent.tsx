"use client";

import { useState } from "react";
import {
  Anchor,
  Button,
  Card,
  Container,
  Divider,
  Group,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { BrandLogo } from "@invitations/ui/brand";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { usePanelI18n } from "../lib/i18n";

export function TermsContent({ initialLang = "pl" }: { initialLang?: string }) {
  const { language, setLanguage } = usePanelI18n();
  const [overrideLang, setOverrideLang] = useState<"pl" | "en" | null>(
    initialLang === "en" ? "en" : null,
  );
  const lang = overrideLang ?? (language === "en" ? "en" : "pl");

  const handleLangChange = (next: string) => {
    if (next === "pl" || next === "en") {
      setOverrideLang(next);
      setLanguage(next);
    }
  };

  return (
    <Container size="md" py={60}>
      <Stack gap="xl">
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <BrandLogo height={40} />
          <Group gap="md">
            <SegmentedControl
              size="xs"
              value={lang}
              onChange={handleLangChange}
              data={[
                { label: "Polski (PL)", value: "pl" },
                { label: "English (EN)", value: "en" },
              ]}
            />
            <Button
              component="a"
              href="/"
              variant="subtle"
              leftSection={<ArrowLeftIcon size={18} />}
            >
              {lang === "pl" ? "Wróć do serwisu" : "Back to app"}
            </Button>
          </Group>
        </Group>

        <Divider />

        {lang === "pl" ? (
          <>
            <div>
              <Text
                size="xs"
                fw={700}
                c="brand"
                style={{ letterSpacing: ".15em" }}
              >
                DOKUMENT PRAWNY
              </Text>
              <Title order={1} mt="xs">
                Warunki korzystania z serwisu saveour.day
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Ostatnia aktualizacja: 11 listopada 2026 r.
              </Text>
            </div>

            <Card withBorder radius="lg" p="xl">
              <Stack gap="lg">
                <section>
                  <Title order={2} size="h3" mb="xs">
                    1. Postanowienia ogólne
                  </Title>
                  <Text size="sm" c="dimmed">
                    Niniejszy regulamin określa zasady korzystania z platformy
                    internetowej <strong>saveour.day</strong> („Serwis”),
                    służącej do tworzenia, edycji i publikowania cyfrowych
                    zaproszeń okolicznościowych oraz zarządzania potwierdzeniami
                    obecności gości (RSVP).
                  </Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Korzystanie z Serwisu oznacza akceptację niniejszych
                    warunków.
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    2. Rejestracja i konto użytkownika
                  </Title>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      • Utworzenie konta Organizatora wymaga podania adresu
                      e-mail i hasła lub skorzystania z uwierzytelnienia przez
                      konto Google (OAuth 2.0).
                    </Text>
                    <Text size="sm" c="dimmed">
                      • Użytkownik zobowiązany jest do zachowania poufności
                      swoich danych dostępowych.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • Jeden użytkownik może zarządzać wieloma realizacjami w
                      ramach dostępnych limitów platformy.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    3. Zasady korzystania i odpowiedzialność za treści
                  </Title>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      • Organizator ponosi wyłączną odpowiedzialność za
                      materiały, teksty, zdjęcia i dane gości zamieszczane w
                      tworzonych zaproszeniach.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • Zabronione jest publikowanie treści niezgodnych z
                      prawem, nawołujących do nienawiści, naruszających prawa
                      osób trzecich lub prawa autorskie.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • Serwis zastrzega sobie prawo do zablokowania lub
                      usunięcia zaproszeń naruszających niniejszy regulamin.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    4. Prawa autorskie i własność intelektualna
                  </Title>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      • Użytkownik zachowuje pełne prawa autorskie do wszelkich
                      własnych treści, fotografii i danych przesłanych do
                      Serwisu.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • Szablony, kod źródłowy, szata graficzna, znaki towarowe
                      i rozwiązania technologiczne platformy saveour.day
                      stanowią własność operatora serwisu i podlegają ochronie
                      prawnej.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    5. Dostępność usługi i ograniczenie odpowiedzialności
                  </Title>
                  <Text size="sm" c="dimmed">
                    Dokładamy starań, aby Serwis działał w sposób ciągły i
                    bezawaryjny. Nie ponosimy jednak odpowiedzialności za
                    przerwy techniczne wynikające z siły wyższej, prac
                    konserwacyjnych lub awarii niezależnych dostawców
                    infrastruktury.
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    6. Rozwiązanie umowy i usunięcie konta
                  </Title>
                  <Text size="sm" c="dimmed">
                    Użytkownik może w dowolnym momencie zrezygnować z
                    korzystania z Serwisu, usuwając swoje projekty lub
                    zgłaszając dyspozycję usunięcia konta pod adresem{" "}
                    <Anchor href="mailto:contact@saveour.day">
                      contact@saveour.day
                    </Anchor>
                    .
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    7. Kontakt
                  </Title>
                  <Text size="sm" c="dimmed">
                    Wszelkie zapytania, uwagi oraz reklamacje dotyczące
                    działania Serwisu można kierować drogą elektroniczną na
                    adres:{" "}
                    <Anchor href="mailto:contact@saveour.day">
                      contact@saveour.day
                    </Anchor>
                    .
                  </Text>
                </section>
              </Stack>
            </Card>
          </>
        ) : (
          <>
            <div>
              <Text
                size="xs"
                fw={700}
                c="brand"
                style={{ letterSpacing: ".15em" }}
              >
                LEGAL DOCUMENT
              </Text>
              <Title order={1} mt="xs">
                saveour.day Terms of Service
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Last updated: November 11, 2026
              </Text>
            </div>

            <Card withBorder radius="lg" p="xl">
              <Stack gap="lg">
                <section>
                  <Title order={2} size="h3" mb="xs">
                    1. General Provisions
                  </Title>
                  <Text size="sm" c="dimmed">
                    These Terms of Service govern the use of the{" "}
                    <strong>saveour.day</strong> online platform
                    (&quot;Service&quot;, &quot;Application&quot;) for creating,
                    publishing, and managing digital event invitations and RSVP
                    responses.
                  </Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    By using or creating an account in the Service, you agree to
                    these Terms.
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    2. Account Registration and Security
                  </Title>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      • Creating an Organizer account requires an email address
                      and password or authentication via Google OAuth (Google
                      Sign-In).
                    </Text>
                    <Text size="sm" c="dimmed">
                      • You are responsible for safeguarding your credentials
                      and all activities that occur under your account.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • Organizers can manage multiple event projects within the
                      provided platform limits.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    3. Acceptable Use and Content Responsibility
                  </Title>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      • You retain sole responsibility for all text, images,
                      media, and guest details uploaded to your invitations.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • You agree not to upload unlawful, offensive, defamatory,
                      or infringing content.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • We reserve the right to suspend or remove any content or
                      account that violates these terms.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    4. Intellectual Property
                  </Title>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      • You retain all ownership rights and copyright to your
                      uploaded images and content.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • The saveour.day platform, software, templates, design
                      assets, and trademarks remain the intellectual property of
                      saveour.day.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    5. Service Availability & Limitations
                  </Title>
                  <Text size="sm" c="dimmed">
                    The Service is provided on an &quot;as is&quot; and &quot;as
                    available&quot; basis. While we strive for maximum uptime
                    and reliability, we do not warrant that operation will be
                    entirely error-free or uninterrupted.
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    6. Account Termination
                  </Title>
                  <Text size="sm" c="dimmed">
                    You may terminate your account at any time by deleting your
                    projects or contacting us at{" "}
                    <Anchor href="mailto:contact@saveour.day">
                      contact@saveour.day
                    </Anchor>
                    .
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    7. Contact
                  </Title>
                  <Text size="sm" c="dimmed">
                    For inquiries, feedback, or complaints regarding the
                    Service, please email:{" "}
                    <Anchor href="mailto:contact@saveour.day">
                      contact@saveour.day
                    </Anchor>
                    .
                  </Text>
                </section>
              </Stack>
            </Card>
          </>
        )}

        <Group justify="space-between" align="center" mt="md">
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} saveour.day. All rights reserved.
          </Text>
          <Group gap="md">
            <Anchor href="/privacy" size="xs">
              {lang === "pl" ? "Polityka prywatności" : "Privacy Policy"}
            </Anchor>
            <Anchor href="/" size="xs">
              {lang === "pl" ? "Strona główna" : "Home"}
            </Anchor>
          </Group>
        </Group>
      </Stack>
    </Container>
  );
}
