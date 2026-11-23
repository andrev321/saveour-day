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

export function PrivacyContent({
  initialLang = "pl",
}: {
  initialLang?: string;
}) {
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
                Polityka prywatności saveour.day
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Ostatnia aktualizacja: 11 listopada 2026 r.
              </Text>
            </div>

            <Card withBorder radius="lg" p="xl">
              <Stack gap="lg">
                <section>
                  <Title order={2} size="h3" mb="xs">
                    1. Informacje ogólne i Administrator Danych
                  </Title>
                  <Text size="sm" c="dimmed">
                    Niniejsza Polityka prywatności określa zasady przetwarzania
                    i ochrony danych osobowych użytkowników korzystających z
                    serwisu oraz aplikacji <strong>saveour.day</strong>{" "}
                    („Aplikacja”, „Serwis”).
                  </Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Administratorem danych osobowych jest operator serwisu
                    saveour.day. W sprawach związanych z ochroną danych
                    osobowych można kontaktować się pod adresem e-mail:{" "}
                    <Anchor href="mailto:privacy@saveour.day">
                      privacy@saveour.day
                    </Anchor>
                    .
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    2. Jakie dane gromadzimy i w jakim celu?
                  </Title>
                  <Text size="sm" c="dimmed">
                    Gromadzimy wyłącznie dane niezbędne do świadczenia usługi
                    tworzenia i publikacji cyfrowych zaproszeń oraz zarządzania
                    odpowiedziami gości (RSVP):
                  </Text>
                  <Stack gap="xs" mt="sm">
                    <Text size="sm" c="dimmed">
                      •{" "}
                      <strong>
                        Konto Organizatora (Rejestracja i logowanie):
                      </strong>{" "}
                      adres e-mail, identyfikator konta oraz hasło (w postaci
                      bezpiecznego skrótu kryptograficznego) lub tożsamość
                      dostawcy logowania (Google OAuth).
                    </Text>
                    <Text size="sm" c="dimmed">
                      • <strong>Dane realizacji (zaproszeń):</strong> treść
                      zaproszenia, daty wydarzeń, lokalizacje, przesłane pliki
                      multimedialne (zdjęcia) oraz konfiguracja wariantów.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • <strong>Zarządzanie gośćmi:</strong> imiona, nazwiska
                      lub oznaczenia zaproszonych gości, przypisane adresy
                      e-mail oraz statusy odpowiedzi RSVP i uwagi przekazane
                      przez gości.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    3. Integracja z Google OAuth i zasady ochrony danych Google
                  </Title>
                  <Text size="sm" c="dimmed">
                    Użytkownicy mogą logować się do panelu organizatora za
                    pomocą usługi <strong>Google Sign-In (OAuth 2.0)</strong>.
                  </Text>
                  <Stack gap="xs" mt="sm">
                    <Text size="sm" c="dimmed">
                      • <strong>Pobierane dane z konta Google:</strong> adres
                      e-mail, podstawowe dane profilowe (imię i nazwisko) oraz
                      unikalny identyfikator użytkownika Google.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • <strong>Cel wykorzystania:</strong> dane te są
                      wykorzystywane wyłącznie do założenia konta, bezpiecznego
                      uwierzytelnienia użytkownika w Serwisie oraz powiązania
                      utworzonych zaproszeń z danym Organizatorem.
                    </Text>
                    <Text size="sm" c="dimmed">
                      •{" "}
                      <strong>
                        Zakaz wykorzystywania komercyjnego i reklamowego:
                      </strong>{" "}
                      dane pozyskane za pośrednictwem Google OAuth nigdy nie są
                      sprzedawane, wypożyczane, wykorzystywane do profilowania,
                      reklam ani do trenowania modeli sztucznej inteligencji.
                    </Text>
                    <Text size="sm" c="dimmed" fw={500} mt="xs">
                      Klauzula zgodności z zasadami Google (Google API Services
                      User Data Policy):
                    </Text>
                    <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                      Aplikacja saveour.day korzysta z danych uzyskanych z
                      interfejsów Google API zgodnie z zasadami{" "}
                      <Anchor
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google API Services User Data Policy
                      </Anchor>
                      , w tym z wymogami ograniczonego użycia (Limited Use
                      requirements).
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    4. Odbiorcy danych i bezpieczeństwo
                  </Title>
                  <Text size="sm" c="dimmed">
                    Dane użytkowników są przechowywane w bezpiecznej
                    infrastrukturze chmurowej <strong>Supabase</strong> (serwery
                    zlokalizowane na terenie Unii Europejskiej). Stosujemy
                    szyfrowanie połączeń (TLS/HTTPS), mechanizmy izolacji danych
                    na poziomie bazy (Row Level Security) oraz restrykcyjną
                    kontrolę uprawnień.
                  </Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Dane nie są przekazywane podmiotom trzecim, z wyjątkiem
                    zaufanych dostawców infrastruktury technicznej (hosting,
                    baza danych, transakcyjna wysyłka powiadomień e-mail)
                    niezbędnych do działania Aplikacji.
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    5. Okres przechowywania i usuwanie danych
                  </Title>
                  <Text size="sm" c="dimmed">
                    Dane przechowywane są przez okres posiadania aktywnego konta
                    w Serwisie. Użytkownik ma pełne prawo do usunięcia swoich
                    projektów oraz całego konta:
                  </Text>
                  <Stack gap="xs" mt="sm">
                    <Text size="sm" c="dimmed">
                      • Usunięcie projektu w panelu powoduje natychmiastowe
                      zablokowanie dostępu do strony zaproszenia oraz oznaczenie
                      wszystkich powiązanych danych i zdjęć do trwałego
                      usunięcia.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • W celu trwałego usunięcia konta Organizatora lub
                      wycofania zgody na przetwarzanie danych wystarczy wysłać
                      wiadomość na adres{" "}
                      <Anchor href="mailto:privacy@saveour.day">
                        privacy@saveour.day
                      </Anchor>
                      . Dane zostaną bezpowrotnie usunięte w terminie do 30 dni.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    6. Prawa użytkownika (RODO / GDPR)
                  </Title>
                  <Text size="sm" c="dimmed">
                    Każdemu użytkownikowi przysługuje prawo dostępu do swoich
                    danych, ich sprostowania, żądania ich usunięcia („prawo do
                    bycia zapomnianym”), ograniczenia przetwarzania, prawo do
                    przenoszenia danych oraz prawo wniesienia skargi do organu
                    nadzorczego (Prezesa Urzędu Ochrony Danych Osobowych).
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
                saveour.day Privacy Policy
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Last updated: November 11, 2026
              </Text>
            </div>

            <Card withBorder radius="lg" p="xl">
              <Stack gap="lg">
                <section>
                  <Title order={2} size="h3" mb="xs">
                    1. Overview and Data Controller
                  </Title>
                  <Text size="sm" c="dimmed">
                    This Privacy Policy governs the collection, processing, and
                    protection of personal data for users of the{" "}
                    <strong>saveour.day</strong> web application and service
                    (&quot;Service&quot;, &quot;Application&quot;).
                  </Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    The data controller is the operator of saveour.day. For any
                    privacy inquiries or data requests, please contact us at:{" "}
                    <Anchor href="mailto:privacy@saveour.day">
                      privacy@saveour.day
                    </Anchor>
                    .
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    2. What Data We Collect and Why
                  </Title>
                  <Text size="sm" c="dimmed">
                    We collect only the minimum data required to provide digital
                    event invitation creation, hosting, and RSVP management:
                  </Text>
                  <Stack gap="xs" mt="sm">
                    <Text size="sm" c="dimmed">
                      • <strong>Organizer Account (Sign-up & Sign-in):</strong>{" "}
                      email address, account identifier, secure password hash,
                      or Google OAuth identity.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • <strong>Invitation Content:</strong> event titles,
                      dates, schedule details, venues, uploaded photos, and
                      display preferences.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • <strong>Guest & RSVP Information:</strong> guest names
                      or household labels, assigned email addresses, RSVP
                      attendance responses, and optional guest notes.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    3. Google OAuth & Google API User Data Policy Compliance
                  </Title>
                  <Text size="sm" c="dimmed">
                    Users can sign in to saveour.day using{" "}
                    <strong>Google Sign-In (OAuth 2.0)</strong>.
                  </Text>
                  <Stack gap="xs" mt="sm">
                    <Text size="sm" c="dimmed">
                      • <strong>Data received from Google:</strong> your email
                      address, basic profile name, and unique Google account ID.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • <strong>Purpose of use:</strong> this information is
                      used strictly to create and authenticate your organizer
                      account and associate your event invitations with your
                      profile.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • <strong>No Advertising or Commercial Resale:</strong>{" "}
                      data obtained via Google OAuth is never sold, leased, used
                      for personalized advertising, or used to train machine
                      learning models.
                    </Text>
                    <Text size="sm" c="dimmed" fw={500} mt="xs">
                      Google Limited Use Disclosure:
                    </Text>
                    <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                      saveour.day&apos;s use and transfer to any other app of
                      information received from Google APIs will adhere to the{" "}
                      <Anchor
                        href="https://developers.google.com/terms/api-services-user-data-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Google API Services User Data Policy
                      </Anchor>
                      , including the Limited Use requirements.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    4. Data Storage and Security
                  </Title>
                  <Text size="sm" c="dimmed">
                    User data is stored securely using <strong>Supabase</strong>{" "}
                    cloud infrastructure hosted in the European Union (EU). We
                    utilize strict Row Level Security (RLS), encrypted TLS/HTTPS
                    connections, and role-based access control.
                  </Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    We do not share personal information with third parties
                    except trusted service providers (hosting, database,
                    transactional email delivery) essential to operate the
                    Application.
                  </Text>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    5. Data Retention and Deletion
                  </Title>
                  <Text size="sm" c="dimmed">
                    Data is stored for as long as your account remains active.
                    You have full control over your content:
                  </Text>
                  <Stack gap="xs" mt="sm">
                    <Text size="sm" c="dimmed">
                      • Deleting a project in your dashboard immediately
                      disables guest links and marks data and media for
                      permanent purge.
                    </Text>
                    <Text size="sm" c="dimmed">
                      • To permanently delete your account and all associated
                      data, contact us at{" "}
                      <Anchor href="mailto:privacy@saveour.day">
                        privacy@saveour.day
                      </Anchor>
                      . All data will be permanently wiped within 30 days.
                    </Text>
                  </Stack>
                </section>

                <Divider />

                <section>
                  <Title order={2} size="h3" mb="xs">
                    6. Your Rights under GDPR
                  </Title>
                  <Text size="sm" c="dimmed">
                    Users have the right to access, rectify, port, or request
                    the erasure of their personal data, as well as the right to
                    lodge a complaint with a relevant data protection
                    supervisory authority.
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
            <Anchor href="/terms" size="xs">
              {lang === "pl" ? "Warunki korzystania" : "Terms of Service"}
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
