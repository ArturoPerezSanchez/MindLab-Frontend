import { useState } from "react";
import { findCountry, flagSource } from "./countries";

/**
 * A country flag, falling back to a code chip when the artwork is not present.
 * The fallback matters because `public/flags/` is populated by
 * `scripts/fetch-flags.mjs` rather than committed, so the picker has to stay
 * usable in a fresh clone.
 */
export function Flag({ code, size = 20 }: { code: string | null | undefined; size?: number }) {
  const [failed, setFailed] = useState(false);
  const country = findCountry(code);

  if (!country) {
    return null;
  }

  if (failed) {
    // `minWidth`, not `width`: the chip has to hold a two-letter code, and a
    // hard width would clip it. This is the common path, not the rare one -
    // `public/flags/` is generated rather than committed, so every flag falls
    // back here until someone runs `scripts/fetch-flags.mjs`.
    return (
      <span className="flag flag-fallback" style={{ minWidth: size }} title={country.name}>
        {country.code}
      </span>
    );
  }

  return (
    <img
      className="flag"
      src={flagSource(country.code)}
      alt=""
      title={country.name}
      width={size}
      height={Math.round((size * 3) / 4)}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
