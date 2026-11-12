# Editable stage fixtures

The four SVGs in this directory were authored specifically for AETHER-DOM’s local development fixture on 12 November 2026. They use static editable shapes, stable source-element IDs and no external resources. They are project-original source assets; the project owner may edit and redistribute them with this project.

The sign uses fictional geometric marks, not a claim about a written language. Character sprites are fixed drawings; authored pose metadata is continuity canon, not an automatic skeletal rig. One hundred viewBox units equal one stage world unit.

Existing fixture asset IDs/URIs are unchanged. The sample document remains byte-identical to the supplied kit.

## Original audio fixtures — Task05

ambient.wav, tension.wav and buzz.wav are original deterministic synthesis authored for this project on12 November2026. They contain no source recordings or third-party samples. Like the visual fixtures, they are project-original assets that the project owner may edit and redistribute with this project. They are demonstration sounds, not generated-provider stems or a finished soundtrack.

Each is an8-second,22050Hz, mono PCM16 loop with quiet edges: ambient is a low harmonic pad; tension is a bass/arpeggio/percussion layer; buzz is an electrical hum/Foley layer bound to the sign prop. Runtime mixing uses the saved track gains and supported bindings. Keep headphone volume comfortable.

Reproduce with `.venv-task04/Scripts/python.exe tools/generate-audio-fixtures.py` (or your installed Python). Append `--check` to verify bytes without writing. The generator uses only Python's standard library. Audio is checked in so the installed demo needs no generation service or network request.
