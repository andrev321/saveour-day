import type { Metadata } from "next";
import Link from "next/link";
import {
  Anchor,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { BrandLogo } from "@invitations/ui/brand";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Polityka prywatności — saveour.day",
  description:
    "Polityka prywatności serwisu saveour.day oraz zasady przetwarzania danych użytkowników Google OAuth.",
};

export default function PrivacyPage() {
  return (
    <Container size="md" py={60}>
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <BrandLogo height={40} />
          <Button
            component={Link}
            href="/"
            variant="subtle"
            leftSection={<ArrowLeftIcon size={18} />}
          >
            Wróć do serwisu
          </Button>
        </Group>

        <Divider />

        <div>
          <Text size="xs" fw={700} c="brand" style={{ letterSpacing: ".15em" }}>
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
                Niniejsza Polityka prywatności określa zasady przetwarzania i
                ochrony danych osobowych użytkowników korzystających z serwisu
                oraz aplikacji <strong>saveour.day</strong> („Aplikacja”,
                „Serwis”).
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Administratorem danych osobowych jest operator serwisu
                saveour.day. W sprawach związanych z ochroną danych osobowych
                można kontaktować się pod adresem e-mail:{" "}
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
                  • <strong>Konto Organizatora (Rejestracja i logowanie):</strong>{" "}
                  adres e-mail, identyfikator konta oraz hasło (w postaci
                  bezpiecznego skrótu kryptograficznego) lub tożsamość dostawcy
                  logowania (Google OAuth).
                </Text>
                <Text size="sm" c="dimmed">
                  • <strong>Dane realizacji (zaproszeń):</strong> treść
                  zaproszenia, daty wydarzeń, lokalizacje, przesłane pliki
                  multimedialne (zdjęcia) oraz konfiguracja wariantów.
                </Text>
                <Text size="sm" c="dimmed">
                  • <strong>Zarządzanie gośćmi:</strong> imiona, nazwiska lub
                  oznaczenia zaproszonych gości, przypisane adresy e-mail oraz
                  statusy odpowiedzi RSVP i uwagi przekazane przez gości.
                </Text>
              </Stack>
            </section>

            <Divider />

            <section>
              <Title order={2} size="h3" mb="xs">
                3. Integracja z Google OAuth i zasady ochrony danych Google
              </Title>
              <Text size="sm" c="dimmed">
                Użytkownicy mogą logować się do panelu organizatora za pomocą
                usługi <strong>Google Sign-In (OAuth 2.0)</strong>.
              </Text>
              <Stack gap="xs" mt="sm">
                <Text size="sm" c="dimmed">
                  • <strong>Pobierane dane z konta Google:</strong> adres e-mail,
                  podstawowe dane profilowe (imię i nazwisko) oraz unikalny
                  identyfikator użytkownika Google.
                </Text>
                <Text size="sm" c="dimmed">
                  • <strong>Cel wykorzystania:</strong> dane te są wykorzystywane
                  wyłącznie do założenia konta, bezpiecznego uwierzytelnienia
                  użytkownika w Serwisie oraz powiązania utworzonych zaproszeń z
                  danym Organizatorem.
                </Text>
                <Text size="sm" c="dimmed">
                  • <strong>Zakaz wykorzystywania komercyjnego i reklamowego:</strong>{" "}
                  dane pozyskane za pośrednictwem Google OAuth nigdy nie są
                  sprzedawane, wypożyczane, wykorzystywane do profilowania,
                  reklam ani do trenowania modeli sztucznej inteligencji.
                </Text>
                <Text size="sm" c="dimmed" fw={500} mt="xs">
                  Klauzula zgodności z zasadami Google (Google API Services User Data Policy):
                </Text>
                <Text size="sm" c="dimmed" style={{ fontStyle: "italic" }}>
                  Aplikacja saveour.day korzysta z danych uzyskanych z interfejsów
                  Google API zgodnie z zasadami{" "}
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
                Dane użytkowników są przechowywane w bezpiecznej infrastrukturze
                chmurowej <strong>Supabase</strong> (serwery zlokalizowane na
                terenie Unii Europejskiej). Stosujemy szyfrowanie połączeń (TLS/HTTPS),
                mechanizmy izolacji danych na poziomie bazy (Row Level Security)
                oraz restrykcyjną kontrolę uprawnień.
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Dane nie są przekazywane podmiotom trzecim, z wyjątkiem zaufanych
                dostawców infrastruktury technicznej (hosting, baza danych,
                transakcyjna wysyłka powiadomień e-mail) niezbędnych do działania
                Aplikacji.
              </Text>
            </section>

            <Divider />

            <section>
              <Title order={2} size="h3" mb="xs">
                5. Okres przechowywania i usuwanie danych
              </Title>
              <Text size="sm" c="dimmed">
                Dane przechowywane są przez okres posiadania aktywnego konta w
                Serwisie. Użytkownik ma pełne prawo do usunięcia swoich projektów
                oraz całego konta:
              </Text>
              <Stack gap="xs" mt="sm">
                <Text size="sm" c="dimmed">
                  • Usunięcie projektu w panelu powoduje natychmiastowe
                  zablokowanie dostępu do strony zaproszenia oraz oznaczenie
                  wszystkich powiązanych danych i zdjęć do trwałego usunięcia.
                </Text>
                <Text size="sm" c="dimmed">
                  • W celu trwałego usunięcia konta Organizatora lub wycofania
                  zgody na przetwarzanie danych wystarczy wysłać wiadomość na
                  adres{" "}
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
                Każdemu użytkownikowi przysługuje prawo dostępu do swoich danych,
                ich sprostowania, żądania ich usunięcia („prawo do bycia
                zapomnianym”), ograniczenia przetwarzania, prawo do przenoszenia
                danych oraz prawo wniesienia skargi do organu nadzorczego (Prezesa
                Urzędu Ochrony Danych Osobowych).
              </Text>
            </section>
          </Stack>
        </Card>

        <Group justify="space-between" align="center" mt="md">
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} saveour.day. Wszelkie prawa zastrzeżone.
          </Text>
          <Group gap="md">
            <Anchor component={Link} href="/terms" size="xs">
              Warunki korzystania z aplikacji
            </Anchor>
            <Anchor component={Link} href="/" size="xs">
              Strona główna
            </Anchor>
          </Group>
        </Group>
      </Stack>
    </Container>
  );
}
