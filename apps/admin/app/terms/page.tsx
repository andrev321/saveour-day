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
  title: "Warunki korzystania — saveour.day",
  description:
    "Warunki korzystania z platformy saveour.day — tworzenie zaproszeń okolicznościowych i obsługa RSVP.",
};

export default function TermsPage() {
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
                Niniejszy regulamin określa zasady korzystania z platformy internetowej{" "}
                <strong>saveour.day</strong> („Serwis”), służącej do tworzenia,
                edycji i publikowania cyfrowych zaproszeń okolicznościowych oraz
                zarządzania potwierdzeniami obecności gości (RSVP).
              </Text>
              <Text size="sm" c="dimmed" mt="xs">
                Korzystanie z Serwisu oznacza akceptację niniejszych warunków.
              </Text>
            </section>

            <Divider />

            <section>
              <Title order={2} size="h3" mb="xs">
                2. Rejestracja i konto użytkownika
              </Title>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  • Utworzenie konta Organizatora wymaga podania adresu e-mail i hasła
                  lub skorzystania z uwierzytelnienia przez konto Google (OAuth 2.0).
                </Text>
                <Text size="sm" c="dimmed">
                  • Użytkownik zobowiązany jest do zachowania poufności swoich danych
                  dostępowych.
                </Text>
                <Text size="sm" c="dimmed">
                  • Jeden użytkownik może zarządzać wieloma realizacjami w ramach
                  dostępnych limitów platformy.
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
                  • Organizator ponosi wyłączną odpowiedzialność za materiały, teksty,
                  zdjęcia i dane gości zamieszczane w tworzonych zaproszeniach.
                </Text>
                <Text size="sm" c="dimmed">
                  • Zabronione jest publikowanie treści niezgodnych z prawem,
                  nawołujących do nienawiści, naruszających prawa osób trzecich lub
                  prawa autorskie.
                </Text>
                <Text size="sm" c="dimmed">
                  • Serwis zastrzega sobie prawo do zablokowania lub usunięcia
                  zaproszeń naruszających niniejszy regulamin.
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
                  • Użytkownik zachowuje pełne prawa autorskie do wszelkich własnych
                  treści, fotografii i danych przesłanych do Serwisu.
                </Text>
                <Text size="sm" c="dimmed">
                  • Szablony, kod źródłowy, szata graficzna, znaki towarowe i
                  rozwiązania technologiczne platformy saveour.day stanowią
                  własność operatora serwisu i podlegają ochronie prawnej.
                </Text>
              </Stack>
            </section>

            <Divider />

            <section>
              <Title order={2} size="h3" mb="xs">
                5. Dostępność usługi i ograniczenie odpowiedzialności
              </Title>
              <Text size="sm" c="dimmed">
                Dokładamy starań, aby Serwis działał w sposób ciągły i bezawaryjny.
                Nie ponosimy jednak odpowiedzialności za przerwy techniczne
                wynikające z siły wyższej, prac konserwacyjnych lub awarii
                niezależnych dostawców infrastruktury.
              </Text>
            </section>

            <Divider />

            <section>
              <Title order={2} size="h3" mb="xs">
                6. Rozwiązanie umowy i usunięcie konta
              </Title>
              <Text size="sm" c="dimmed">
                Użytkownik może w dowolnym momencie zrezygnować z korzystania z
                Serwisu, usuwając swoje projekty lub zgłaszając dyspozycję usunięcia
                konta pod adresem{" "}
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
                Wszelkie zapytania, uwagi oraz reklamacje dotyczące działania Serwisu
                można kierować drogą elektroniczną na adres:{" "}
                <Anchor href="mailto:contact@saveour.day">
                  contact@saveour.day
                </Anchor>
                .
              </Text>
            </section>
          </Stack>
        </Card>

        <Group justify="space-between" align="center" mt="md">
          <Text size="xs" c="dimmed">
            © {new Date().getFullYear()} saveour.day. Wszelkie prawa zastrzeżone.
          </Text>
          <Group gap="md">
            <Anchor component={Link} href="/privacy" size="xs">
              Polityka prywatności
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
