# TODO

- Move `src/dataLayer/hooks/lineageOptions.ts` into `src/externalData`. It fetches from clinical
  LAPIS (`useLapisClient`), not RhyDB/RhyDB like the rest of `src/dataLayer/hooks`, so it belongs
  with the other external-API code (`src/externalData/lapis`, `lapisApi`, `covSpectrum`,
  `genSpectrum`) rather than the RhyDB data-hook layer.
