# pokemon-frienda-qr

Research tools for analyzing and documenting Pokémon Frienda code symbols from photos.

## Scope

This repo is for:
- identifying the symbol type used on Frienda picks
- extracting/cleaning code regions from photos
- attempting standards-based decoding when possible
- comparing captures across cards/releases
- documenting findings and open questions

This repo is **not** for bypassing arcade protections, spoofing physical cards, or generating replacement symbols for use against live machines.

## Initial observations

From early public research and sample images:
- the mark does **not** look like a normal full QR code
- it may be a partial/customized QR-like symbol or another 2D symbology with a QR-style finder motif
- some public Japanese reports claim parts of the payload include `POKEMON11`
- normal phone scanners generally do not decode these directly

## Repo plan

- `samples/` - test images and crops
- `notes/` - reverse-engineering notes
- `tools/` - local utilities for crop, threshold, grid estimation, and decode attempts
- `findings/` - structured outputs per sample/card

## Next steps

1. Collect 10-20 sharp photos of different picks
2. Build a crop + threshold pipeline
3. Detect structural landmarks (finder square, module size, orientation)
4. Test common symbologies and partial/custom variants
5. Compare multiple cards to separate fixed framing from variable payload bits
