# Self-review publikacji — 2026-09-22

## Poprawione problemy

- Rotacja linku mogła reaktywować cofnięte zaproszenie do wariantu usuniętego z publikacji. Funkcja SQL sprawdza teraz wariant w aktualnej konfiguracji; test potwierdza również zachowanie cofnięcia po odrzuconej rotacji.
- Historyczne odpowiedzi RSVP mogły zająć limit wyników Supabase przed aktualnymi odpowiedziami. Zapytanie filtruje wydarzenia przed pobraniem danych (maksymalnie 20 gości × 50 wydarzeń).
- Wysyłka i weryfikacja OTP współdzieliły licznik prób. Mają oddzielne liczniki przy zachowaniu globalnego limitu IP.
- Panel proponował warianty ze szkicu, które nie były jeszcze opublikowane. Pobiera teraz listę z publikacji, a przed pierwszą publikacją ze szkicu.
- Utrata sesji podczas zapisu RSVP pozostawiała stary formularz. Interfejs ponownie sprawdza dostęp i wraca do odpowiedniej bramki. Adres `/v/` bez sesji w trybie publicznym/kodowym instruuje o użyciu oryginalnego linku.
- Nieprawidłowy adres aplikacji mógł powodować błąd po utworzeniu zaproszenia. Adres jest weryfikowany przed mutacją.
- Operacje na zaproszeniach resetowały niezapisane ustawienia dostępu. Odświeżają teraz dane bez nadpisywania formularza ustawień.

## Cleanup

- Usunięto sztuczne rekordy deploymentów z API i edytora; historia korzysta bezpośrednio z wydań.
- Usunięto nieużywany helper wymagający administratora platformy.
- Ujednolicono schemat walidacji RSVP panelu i aplikacji gości.
- Uzupełniono deklaracje zależności `server-only`, przykłady konfiguracji i walidację osobnego środowiska aplikacji gości.
- Stare tabele i migrację zachowano dla historii oraz bezpiecznego przejścia istniejących realizacji.

## Weryfikacja

- TypeScript, ESLint, build produkcyjny panelu i aplikacji gości: poprawne.
- 20 testów automatycznych: poprawne; obejmują SQL/RLS, projekcję, kryptografię, renderer i rzeczywiste handlery API.
- 24 testy Playwright: poprawne. Po końcowych poprawkach powtórzono 4 testy gości/panelu, w tym nowy scenariusz utraty sesji: poprawne.
- Testy API kontrolują zewnętrzne odpowiedzi Supabase i ciasteczka; nie zastępują odbioru na rzeczywistych usługach.

## Pozostałe czynności operacyjne

W środowisku roboczym nie ma poświadczeń Supabase ani skonfigurowanego SMTP. Nie zastosowano zdalnych migracji i nie wykonano produkcyjnego wdrożenia. Pozostają: konfiguracja usług i domen, migracje, odbiór rzeczywistego OTP/Storage na stagingu oraz wyłączenie dawnych publicznych deploymentów przed włączeniem ochrony. Kolejność i scenariusze odbioru opisano w [instrukcji wdrożenia](WDROZENIE-PLATFORMY.md).
