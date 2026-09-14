# TODO

- Stop fetching the reference genome from LAPIS in `GsApp` (`src/components/genspectrum/gs-app.tsx`).
  We only ever need each segment's/gene's name and length (see
  `parseAndValidateMutation.ts`), never the base-pair content, so there's no need to fetch
  the full sequences at all. Require the user to supply segment and gene names and lengths
  directly in `config.json` instead, and build the `ReferenceGenome` context value from that
  config rather than from a LAPIS call.
