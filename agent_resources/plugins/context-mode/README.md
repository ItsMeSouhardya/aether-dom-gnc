# context-mode skill index

Version **1.0.169**, archived from the installed plugin on 13 November 2026.
[Upstream repository](https://github.com/mksglu/context-mode) ·
[Elastic License 2.0](1.0.169/LICENSE) · [Original README](1.0.169/README.md) ·
[SHA256 manifest](1.0.169/archive-manifest.json)

All 8 plugin skills, 3 additional harness/maintenance variants and their supporting
source, bundles, hooks, tests and documentation are preserved (590 source files).
Installed dependencies, Git internals and root runtime statistics are excluded.
Original Git ignore/attribute files are stored under `_archive_metadata/`, with
their original paths recorded in the manifest.

| When | Plugin skill entry point |
|---|---|
| Route large analysis through context-mode | [context-mode](1.0.169/skills/context-mode/SKILL.md) |
| Diagnose the installed runtime | [ctx-doctor](1.0.169/skills/ctx-doctor/SKILL.md) |
| Index project files | [ctx-index](1.0.169/skills/ctx-index/SKILL.md) |
| Search indexed content | [ctx-search](1.0.169/skills/ctx-search/SKILL.md) |
| Inspect session savings | [ctx-stats](1.0.169/skills/ctx-stats/SKILL.md) |
| Open the hosted analytics dashboard | [ctx-insight](1.0.169/skills/ctx-insight/SKILL.md) |
| Intentionally erase indexed knowledge | [ctx-purge](1.0.169/skills/ctx-purge/SKILL.md) |
| Intentionally update an installed plugin | [ctx-upgrade](1.0.169/skills/ctx-upgrade/SKILL.md) |

Additional upstream variants are retained for completeness. Choose the variant
for the actual host; the maintainer workflow concerns context-mode itself.

| Host or purpose | Entry point |
|---|---|
| Antigravity CLI | [context-mode](1.0.169/configs/antigravity-cli/skills/context-mode/SKILL.md) |
| Copilot CLI | [context-mode](1.0.169/configs/copilot-cli/skills/context-mode/SKILL.md) |
| Upstream plugin maintenance | [context-mode-ops](1.0.169/.claude/skills/context-mode-ops/SKILL.md) |

## Runtime setup is separate

Read the selected skill completely, then confirm that the current agent exposes
working `ctx_*` MCP tools. Markdown copies alone supply no execution/search tools.
If the tools are unavailable, use bounded analysis through available tools and
report that limitation.

For installation on another host, consult the upstream README and that host's
supported plugin/MCP configuration. The snapshot includes host-specific paths
from this installation as provenance. Configure paths for the receiving machine;
the archived configuration is not portable as-is. Running `start.mjs`, upgrade
commands or hooks can install dependencies or modify agent configuration, so keep
runtime setup within the user's requested scope. This archive operation has not
performed those actions.

Preserve the Elastic License 2.0 terms when sharing or adapting this package.
For project authorities and task handoff, return to the
[shared resource guide](../../README.md).
