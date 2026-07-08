# Module — Adapter Boundary (Tier-2 #11)

*Every external service hides behind an interface the app owns. Call sites depend on the interface; the provider lives in one swappable file. Validated on Bugadi — two payment pivots made trivial.*

## The rule

For any external service (payments, shipping, email, SMS, storage, analytics):

1. Define an **interface** the app needs — `lib/integrations/<service>/index.ts`.
2. Implement one **adapter per provider** — `lib/integrations/<service>/<provider>.ts`.
3. A **factory** picks the adapter from env (`PAYMENTS_PROVIDER`, `SHIPPING_PROVIDER`, …).
4. Call sites import the factory + interface — **never** a provider SDK directly.

Switching providers = a new adapter file + an env change. No call site moves.

## Shipped boundaries

| Service | Boundary | Stub adapter |
|---|---|---|
| Payments | `lib/integrations/payments/index.ts` | `razorpay.ts` (signature verify is real; `createOrder` needs the SDK) |
| Shipping | `lib/integrations/shipping/index.ts` | `shiprocket.ts` (rates/label/track stubs) |

Both adapters `import 'server-only'` — provider secrets never reach the browser.

## Discipline

- **Keep all provider HTTP/SDK calls inside the adapter.** If a provider type leaks into a component, the boundary is broken.
- **Adapters are server-only.** Secrets (`*_KEY_SECRET`) stay server-side (Safety Rail 2; `env-validate` enforces no secret-shaped `NEXT_PUBLIC_`).
- **Payment webhooks must be idempotent** — dedupe by payment id with `lib/logic/idempotency.ts` before crediting an order (Bugadi must-hold).
- **Tax is not a payment concern** — GST lives in `lib/logic/tax.ts`, computed before you create the order.
