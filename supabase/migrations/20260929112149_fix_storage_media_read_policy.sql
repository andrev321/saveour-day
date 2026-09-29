-- Qualify the outer object's name: inside the subquery, unqualified `name`
-- resolves to sites.name and prevents even the owner from reading their files.
alter policy read_own_media on storage.objects
using (
  bucket_id = 'site-media'
  and exists (
    select 1 from public.sites s
    where s.id::text = (storage.foldername(storage.objects.name))[1]
      and (select public.can_access_site(s.id))
  )
);
