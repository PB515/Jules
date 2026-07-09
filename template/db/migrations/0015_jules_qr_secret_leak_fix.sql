-- 0015_jules_qr_secret_leak_fix — CRITICAL: qr_secret() (0004) was created
-- with no `revoke`/`grant` statements at all, unlike every other internal
-- helper in that file. Postgres grants EXECUTE to PUBLIC by default, so it
-- was callable by a completely anonymous, unauthenticated caller via
-- `rpc('qr_secret')` — confirmed live against production during a security
-- retrospective. With the raw secret, anyone can compute
-- qr_token_for_epoch(event_id, epoch) themselves for any event at any time
-- (event_id and epoch are both derivable/public), minting a valid "current"
-- QR code without ever being physically present — this defeats the entire
-- point of the QR rotation/anti-abuse mechanism (spec §9).
--
-- qr_secret() only needs to be callable by qr_token_for_epoch(), another
-- SECURITY DEFINER function owned the same way — that call path is
-- unaffected by revoking PUBLIC/anon/authenticated, since a SECURITY DEFINER
-- function executes as its owner regardless of the caller's own grants.

-- migrate:up

revoke all on function public.qr_secret() from public, anon, authenticated;

-- migrate:down
-- No-op: restoring the PUBLIC grant would restore the vulnerability.
