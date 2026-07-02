-- Make the "worksheets" Storage bucket PRIVATE (audit item M5).
--
-- Run this ONLY AFTER the signed-URL code is deployed and verified — it makes
-- public_url URLs stop working. Until then the bucket must stay public so the
-- stored public_url fallback keeps worksheets openable. The app already serves
-- worksheets via short-lived signed URLs (see src/lib/worksheet-url.ts), which
-- work on both public and private buckets, so flipping this is zero-downtime
-- once that code is live.

-- Flip the bucket to private.
update storage.buckets set public = false where id = 'worksheets';

-- Drop the anonymous public-read policy so files can only be reached via
-- server-generated signed URLs.
drop policy if exists "Public can read worksheets" on storage.objects;
