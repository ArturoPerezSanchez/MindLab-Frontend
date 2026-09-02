export function PrivacyView() {
  return (
    <main className="legal-shell" aria-labelledby="privacy-title">
      <article className="legal-card">
        <p className="legal-kicker">Last updated 2 September 2026</p>
        <h1 id="privacy-title">Privacy</h1>
        <p>
          MindLab is a logic-game service. This notice describes the data used by the local-ready
          application and the controls already available to players.
        </p>
        <h2>Data MindLab uses</h2>
        <p>
          Guest play stores a random guest identifier, appearance, accessibility settings and privacy
          choices in this browser. Accounts store an email address, a one-way password hash, profile
          fields, revocable sessions, verified game results and multiplayer ratings on the server.
          Multiplayer also processes room messages and server-validated board progress.
        </p>
        <h2>Why it is used</h2>
        <p>
          Necessary data provides authentication, puzzle delivery, anti-cheat validation, leaderboards,
          room reconnection and abuse prevention. Security logs may include request identifiers, routes,
          response status and network address data for a limited operational period.
        </p>
        <h2>Optional analytics and ads</h2>
        <p>
          They are disabled in the local build. MindLab does not load an optional provider before you
          allow its category. A production operator must name every provider, retention period and legal
          basis here before enabling it, and must use a certified consent flow where required.
        </p>
        <h2>Your controls</h2>
        <p>
          Signed-in players can download a JSON copy of account and game data or permanently delete the
          account from the Account screen. You can change optional consent at any time with “Privacy
          choices” in the footer. Browser data can also be cleared with browser or operating-system tools.
        </p>
        <h2>Before a public launch</h2>
        <p>
          The deploying operator must add its legal name, contact address, jurisdiction-specific
          retention schedule, processors and children/age policy. The production checklist treats this
          as a release blocker rather than silently inventing operator details.
        </p>
      </article>
    </main>
  );
}

export function TermsView() {
  return (
    <main className="legal-shell" aria-labelledby="terms-title">
      <article className="legal-card">
        <p className="legal-kicker">Last updated 2 September 2026</p>
        <h1 id="terms-title">Terms of use</h1>
        <p>
          MindLab is provided for personal puzzle play and local evaluation. Public commercial terms
          must be completed by the deploying operator before a production launch.
        </p>
        <h2>Fair play</h2>
        <p>
          Do not automate answers, probe hidden solutions, tamper with clients, impersonate another
          player, disrupt rooms or bypass security controls. The server validates results and may mark
          assisted or implausible runs ineligible for records, rate-limit requests, revoke sessions, or
          refuse abusive connections.
        </p>
        <h2>Accounts and content</h2>
        <p>
          Keep credentials secure and provide only profile content you are entitled to share. Public
          profile fields and rankings are visible to other players. Account deletion is permanent.
        </p>
        <h2>Availability</h2>
        <p>
          Local and preview builds may change and are supplied without a service-level commitment.
          Puzzle progress can be interrupted by device, browser, network or server failures. Do not use
          MindLab where a game result has legal, financial or safety consequences.
        </p>
        <h2>Production operator</h2>
        <p>
          Before public release, replace this section with the operator identity, governing law,
          warranty and liability language reviewed for the launch markets, storefront rules and ad
          providers. Until then this page is an honest local-use baseline, not finished legal advice.
        </p>
      </article>
    </main>
  );
}
