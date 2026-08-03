## Task 4 — API POST /api/os/[id]/open-route

### Implemented
- Added authenticated `POST /api/os/[id]/open-route`.
- Loads the work order, customer, current team, and current technician.
- Returns a Maps directions/search URL even when SMS is inapplicable or fails.
- Sends the stage-specific n8n payload only for commercial/installation stages with a customer phone.
- Supports optional origin GPS, Google Routes ETA, New York localized arrival time/ISO offset, and miles.
- Deduplicates `client_eta_sms` notifications for 20 minutes and records successful queues in `agenda_eventos`.

### Verification
- `ESLINT_USE_FLAT_CONFIG=false npx eslint src/app/api/os/[id]/open-route/route.ts` passed.
- `npx tsc --noEmit` still fails only in the pre-existing `src/lib/ordens-servico/google-routes.ts` nullable `distanciaMetros` checks (lines 52 and 59); the route has no TypeScript errors.

### Scope
- Only `src/app/api/os/[id]/open-route/route.ts` is staged/committed for this task.

### Review fixes
- Claims are now inserted into `agenda_eventos` before dispatching to n8n. A second, ordered lookup elects a single claim owner; concurrent callers that do not own the earliest claim skip the webhook.
- A failed webhook releases only its own claim, so a later retry can send the notification.
- The n8n request uses an 8-second `AbortSignal` timeout and returns a controlled failure when it expires.
- `computeDrivingEta` now narrows `distanceMeters` before using it in the typed ETA result.

### Verification (review fixes)
- `$env:ESLINT_USE_FLAT_CONFIG="false"; npx eslint src/app/api/os/[id]/open-route/route.ts src/lib/ordens-servico/os-open-route-webhook.ts src/lib/ordens-servico/google-routes.ts` passed (with existing ESLint legacy-config warning).
- `npx tsc --noEmit` passed.
- `git diff --check` passed.

