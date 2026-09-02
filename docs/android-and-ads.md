# Android APK and ads handoff

No APK is implemented here. The web product is prepared so Android work starts
at a stable boundary rather than forking game logic.

## Recommended starting point

1. Create a separate Android wrapper repository with Capacitor (fastest reuse)
   or a native Compose shell containing a hardened WebView. Build this frontend
   with `VITE_API_BASE_URL=https://api.example.com`; REST calls then use the
   absolute `/api/v1` server and multiplayer automatically uses `wss:`.
2. Bundle `dist/` in the application instead of loading a remote arbitrary web
   page. Capacitor's local HTTPS origin supports the app's root-relative assets.
   Add that exact origin to the backend CORS allowlist.
3. Keep bearer tokens in a Keystore-backed native plugin. The current web
   client uses local storage, which is acceptable for the local website but is
   not the desired release-APK credential store. Expose only get/set/delete
   token operations to JavaScript and exclude values from logs and backups.
4. Preserve the server-authoritative API. Do not add offline-ranked wins,
   client timers, solution payloads, or a native bypass around reveal/move
   endpoints. Use the checked OpenAPI contract in the backend repository.
5. Implement lifecycle tests: background/foreground during a puzzle, process
   death, rotation, keyboard, display cutouts, back navigation, no network,
   API outage, WebSocket reconnect, and deep links such as a room code.

## Existing ad seam

`AdSlot` has three stable placement names: `menu-footer`, `game-footer`, and
`result-interstitial`. The local and ordinary web build uses
`VITE_AD_PROVIDER=none`, so no provider code or empty ad space is rendered.

- `placeholder` displays named boxes for layout QA only.
- `native` dispatches a `mindlab:ad-request` DOM event with
  `{ placement }`. The wrapper may listen for this event and call its native ad
  plugin. Games never import an ad SDK.

Use banner ads only in the existing menu/footer seam initially. Add
interstitial requests only at a natural result transition, frequency-cap them,
and never cover a board, countdown, multiplayer action, consent UI, or account
control. Failure to load an ad must be invisible to gameplay.

## Consent and store requirements

The web `ConsentProvider` keeps optional analytics and ads off until selected
and exposes “Privacy choices” in every footer. It is an integration guard, not
a certified EEA consent-management platform. Before enabling ads:

- integrate Google UMP or another launch-market-appropriate certified CMP in
  the native layer and synchronize the resulting ads permission;
- configure non-personalized treatment and under-age/child-directed handling;
- complete Google Play Data safety, ads declaration, privacy-policy URL,
  content rating, target API, app signing, deletion URL, and test-account needs;
- document every SDK/provider and extend the Nginx CSP only when web ad code is
  intentionally enabled;
- obtain legal review for launch countries and do not request tracking before
  the platform consent flow permits it.

## Release gate for the future APK

Use internal testing first, then closed testing. Verify signed release builds on
small/large phones, tablets, low-memory devices and current minimum/target API
levels. Run accessibility scanning, Play pre-launch reports, dependency/SBOM
review, certificate rotation/backups, crash-symbol upload, performance and
battery checks, and an end-to-end account export/deletion test against staging.
