# Usuwanie realizacji

Właściciel realizacji lub administrator platformy może usunąć ją z listy projektów. Współpracownik bez tych uprawnień nie widzi przycisku, a backend odrzuca jego żądanie. Operacja wymaga potwierdzenia w panelu.

`DELETE /api/sites/:id` sprawdza sesję, Origin i dostęp do projektu. Funkcja `soft_delete_site` atomowo zapisuje `deleted_at` i `deleted_by`, usuwa wskaźnik publikacji i zwiększa wersję dostępu. Wspólny warunek RLS oraz zapytania serwera ukrywają projekt, szkice, publikacje i media. Strona zaproszenia i API gości zwracają 404. Triggery odrzucają zapisy do usuniętych projektów, również z żądań będących w toku. Dane pozostają w bazie do czyszczenia; panel nie udostępnia przywracania.

## Czyszczenie miesięczne

Zadanie Supabase Cron `purge-deleted-sites-monthly` działa pierwszego dnia miesiąca o 03:00 UTC. Wybiera tylko `deleted_at < now() - interval '1 month'`. To miesiąc kalendarzowy, nie 30 dni. Faktyczna retencja wynosi zwykle od miesiąca do niemal dwóch miesięcy, zależnie od daty usunięcia.

Dispatcher w bazie tworzy prywatne zadanie i przez pg_net uruchamia Edge Function `purge-sites`. Losowy token jest ograniczony do jednego projektu, ważny przez 6 godzin, a po rozpoczęciu nie można ponownie przejąć zadania. W tabeli przechowywany jest tylko SHA-256 tokenu; klucz service role nie jest zapisany w harmonogramie ani treści żądania.

Worker najpierw usuwa przez Storage API wszystkie obiekty z prefiksem identyfikatora projektu w `site-media`, w paczkach po 500 (także niedokończone uploady). Następnie usuwa odpowiedzi RSVP, sesje gości, zaproszenia, deploymenty, kopie szkicu, publikacje, metadane mediów, historię audytu, szkic, członkostwa i projekt. Funkcja kończąca ponownie sprawdza wiek projektu i brak plików. Nigdy nie usuwamy metadanych `storage.objects` bezpośrednio SQL-em.

Niepowodzenie zachowuje rekord projektu i oznacza zadanie jako `failed`. Następny miesięczny przebieg ponawia je; zadania przerwane lub niewysłane również kwalifikują się po wygaśnięciu tokenu. Częściowo usunięte pliki nie są odtwarzane. Dane mogą pozostać dłużej niż dwa miesiące, jeśli usługa czyszcząca nie działa.

## Wdrożenie

1. Zastosuj nowe migracje według historii środowiska (nie odtwarzaj wcześniejszych migracji na stagingu — patrz `STAGING-STATUS.md`).
2. Wdróż `supabase/functions/purge-sites/index.ts` wraz z `handler.ts`. Ustaw `verify_jwt=false`: uwierzytelnianie jest realizowane przez jednorazowy token zadania, zweryfikowany w bazie przed dostępem do plików. Publiczny lub zalogowany klient nie ma EXECUTE do funkcji czyszczących. Worker używa standardowych zmiennych Supabase `SUPABASE_URL` i `SUPABASE_SERVICE_ROLE_KEY`.
3. Jako właściciel bazy skonfiguruj publiczny URL projektu:

```sql
select private.configure_site_purge('https://PROJECT_REF.supabase.co');
```

Ponowne wywołanie aktualizuje ten sam harmonogram, bez tworzenia duplikatów. Samo skonfigurowanie nie uruchamia czyszczenia.

## Kontrola działania

```sql
select jobname, schedule, active from cron.job
where jobname = 'purge-deleted-sites-monthly';

select runid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'purge-deleted-sites-monthly')
order by start_time desc limit 10;

select site_id, status, attempts, requested_at, expires_at, last_error
from private.site_purge_jobs order by requested_at desc;
```

Sukces zadania Cron oznacza wysłanie zadań, nie potwierdza zakończenia workera. Sprawdź również logi Edge Function oraz zadania `failed` i przeterminowane `queued`/`running`. Pomyślnie zakończone zadanie znika razem z projektem. Nie loguj tokenów ani całych requestów workera.

RLS bez polityk w `private.site_purge_jobs` jest celowe: tabela jest niedostępna dla klientów. [Opis komunikatu doradcy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Testy obejmują kontrolę właściciela, izolację RLS, blokowanie zapisów i API gości, granicę miesiąca, kolejność usuwania plików i rekordów, odrzucanie nieprawidłowych tokenów oraz błędy Storage. Testy przeglądarkowe sprawdzają stany sesji, ponawianie pobrania, potwierdzenie usuwania i układ mobilny.

Źródła: [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart), [usuwanie plików Storage](https://supabase.com/docs/guides/storage/management/delete-objects), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).


## Cykl mediów po poprawkach z 30.09.2026

Zastosuj migrację `20260930165858_harden_media_lifecycle.sql` przed wdrożeniem nowych wersji panelu i aplikacji zaproszeń. Migracja rozszerza statusy o `processing`, blokuje bezpośredni odczyt i podpisywanie URL-i przez klientów Storage oraz ukrywa `original_path` przed klientami. Nie zmienia istniejących plików ani publikacji. Stare akcje `prepare-upload` i `finalize-upload` są usunięte z API.

Upload to jedno żądanie `POST /api/sites/:id/media` z surowym plikiem JPEG/PNG/WebP. Serwer ogranicza strumień do 8 MiB, rezerwuje asset pod blokadą realizacji i nadaje dziesięciominutową dzierżawę. Przechowuje wyłącznie przetworzone WebP, pod losowym prefiksem nieujawnianym klientowi. Wysyłka do Storage używa JWT zalogowanego użytkownika, a INSERT policy sprawdza aktywną realizację, tajny prefiks i niewygasły status `processing`. Nie ma polityki UPDATE, DELETE ani SELECT dla klientów. Nie używaj service role do uploadów — ominęłoby to tę kontrolę.

Finalizacja w SQL wymaga istniejącego, niewygasłego `processing` i obecności plików manifestu. `deleting` jest stanem terminalnym. Awaria przetwarzania uruchamia usuwanie całego prefiksu; awaria Storage pozostawia metadane i rezerwację usuwania do ponowienia. Przed każdym uploadem sprzątane są `error`, `deleting` i wygasłe `pending`/`processing`. Rezerwacja ponownie sprawdza status: asset, który zdążył przejść na `ready`, nie zostanie usunięty przez spóźnione sprzątanie. Limit 100 obejmuje wszystkie rekordy biblioteki, a limit pięciu uploadów jest sprawdzany pod tą samą blokadą.

Panel pobiera zdjęcia przez `GET /api/sites/:id/media/:asset/:file`, z autoryzacją realizacji i kontrolą gotowości assetu. Odpowiedzi mają `private, no-store`; po pobraniu Storage sprawdzana jest ponownie aktywność realizacji i assetu. API gości również ponownie sprawdza aktywność realizacji po pobraniu pliku. Nowy kod nie wystawia podpisanych linków do odczytu ani uploadu.

### Jednorazowe przejście ze starych podpisanych linków

Już wystawionych tokenów Storage nie można odwołać zmianą kodu lub RLS. Przed uznaniem odcięcia dostępu za natychmiastowe odczekaj od wyłączenia starego panelu co najmniej dwie godziny (stare tokeny uploadu) oraz wygaśnięcie wszystkich wcześniej wystawionych URL-i odczytu. Stary panel wystawiał URL-e godzinne, ale użytkownik z dawnym SELECT Storage mógł sam wystawić dłuższe. W takim przypadku potrzebne jest odwołanie tokenów przez Supabase lub przeniesienie plików i usunięcie ich starych ścieżek przez Storage API. Weryfikacja samej migracji nie potwierdza odwołania takich uprawnień.

### Testy

`npm test` obejmuje pozytywny INSERT Storage oraz odmowy dla obcego użytkownika, błędnego prefiksu, wygasłej dzierżawy i usuniętej realizacji; blokadę cofnięcia `deleting`; ochronę przed spóźnionym cleanup; błędy uploadu i usuwania oraz autoryzowane API zdjęć. Testy współbieżności w `media-concurrency.test.ts` wymagają pustej, odizolowanej bazy PostgreSQL wskazanej przez `TEST_DATABASE_URL` — tworzą role i schematy testowe. CI uruchamia je na osobnym PostgreSQL 17. Nigdy nie wskazuj w tej zmiennej stagingu ani produkcji.
