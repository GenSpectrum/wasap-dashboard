# Primer schemes

Vendored primer schemes, one directory per organism and scheme
(`<organism>/<scheme>_<version>/primer.bed`). An organism picks one in its
`amplicons` config (see `src/amplicons/`), and the browser fetches and parses
the BED file at runtime, only on pages that need it.

Every `primer.bed` is an unmodified copy of its upstream file, so it can be
checked against the upstream md5.

| Directory            | Upstream                                                                                                                  | md5                                | License   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | --------- |
| `covid/ARTIC_v5.3.2` | [quick-lab/primerschemes](https://github.com/quick-lab/primerschemes) `artic-sars-cov-2/400/v5.3.2` @ `8972878b4da79d0a9` | `46a3aeddc452678bd0cd33efc1c9558f` | CC-BY-4.0 |

## Coordinates

The positions in a BED file refer to the scheme's reference genome. They can
only be used as they are when that is the reference the SILO instance aligns
to:

- covid: the scheme's `MN908947.3` is identical to the SILO reference.
- rsv-a / rsv-b: the upstream `rsva-rsvb` scheme is on `NC_038235.1` /
  `NC_001781.1`, which are _not_ the references of our SILO instances. Its
  coordinates would have to be translated (e.g. by aligning the primer
  sequences to the SILO references) before it could be vendored here.
