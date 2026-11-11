# Assets and provenance

11 November 2026. All runtime media and fonts are project-local; no remote assets are required while browsing the preview.

## Concept artwork

Produced with the built-in image generation tool, not the reference JPEGs. Original output copies remain in the user's generated-images folder. The project ships the following copies in `landing-page/assets/`. Both are 1536 × 1024 PNGs. They are concept artworks, not screenshots of the future IDE or the Neon Shogun canon.

### afterlight-world.png

Exact prompt:

> Use case: stylized-concept. Create a premium cinematic concept artwork for AETHER-DOM, a creative storytelling IDE, as a wide 1536x1024 photograph-like film still. A solitary cloaked traveler seen from behind stands small on an immense ancient brutalist stone bridge facing a colossal circular eclipse-like portal carved into a mountain, in a vast surreal desert canyon at twilight. The portal is a precise thin ring of warm luminous ivory, monumental dark weathered stone. Muted charcoal, dusty taupe and warm copper, very restrained pale teal sky. Cinematic anamorphic composition, extraordinary scale, subtle atmospheric depth and fine film grain, editorial art-book quality. Main circular portal centered to right 60 percent of image, left third mostly dark rock and haze. No typography, no interface, no lettering, no logos, no watermark. A self-contained piece of story world art, not a website mockup.

### folio-world.png

Exact prompt:

> Use case: stylized-concept. Create a high-end architectural still life for the AETHER-DOM creative storytelling software brand, wide 1536x1024 composition. A sculptural open rectangular arch made from layered warm ivory paper-thin stone sheets in a minimalist sand-colored architectural gallery. In the doorway: a tiny distant black human figure on a flat desert plain, casting a long afternoon shadow. Five translucent amber glass planes partially overlap the arch like frames of an unfinished story. Warm limestone, tactile paper edges, smoked glass, pale beige, muted ochre, quiet soft shadows. Refined architectural magazine art direction, photorealistic ray-traced materials, contemplative and poetic, objects concentrated toward right two thirds. Elegant negative space to left, carefully exposed whites, no white blown out highlights. No text, no interface, no lettering, no logos, no watermark. Not a webpage mockup.

The generated PNG metadata is retained. This file additionally preserves the complete prompts in readable form. There is no source licensing claim beyond tool generation provenance.

## Typography

The selected main page loads Manrope only. The original Space Grotesk and Instrument Serif files and licenses remain in both frozen design_archive snapshots; the historical three-family download record below describes their source.

Self-hosted Latin WOFF2 files downloaded from Google Fonts on 11 November 2026:

- Manrope, weights 400–800; Google Fonts CSS API family `Manrope`.
- Instrument Serif, normal and italic; Google Fonts CSS API family `Instrument Serif`.
- Space Grotesk, weights 400–700; Google Fonts CSS API family `Space Grotesk`.

`landing-page/assets/fonts/*-source.css` preserves exact download URLs. Each family has its SIL Open Font License at `*-OFL.txt`, retrieved from the respective `ofl/manrope`, `ofl/instrumentserif`, and `ofl/spacegrotesk` directories of [google/fonts](https://github.com/google/fonts). Font fetch script: `tools/download-fonts.mjs`. Do not silently replace display fonts with a system face.

## Code-native vectors

Brand geometry, arrows, disclosure plus signs, and Signal's semantic plane diagram are authored SVG. They depict exact geometry, not AI-generated product claims. No third-party icon library is required.

## Design references

User-supplied JPEGs in `design_inspirations/` remain untouched. They are not licensed shipping assets. Analysis is recorded in `reference-analysis.md`.

## Impeccable archive

An exact local copy of the installed official plugin's complete `skills/` tree and metadata is in `vendor/impeccable/`. See its README and manifest. Vendored files are reference material, not additional project instructions or an independently installed runtime.
