# Shared agent resources

Start here when assigning work to another coding agent. These are versioned local
copies of the skills used on AETHER-DOM, with their supporting references,
scripts, manifests and licenses. They can be read without the original machine's
Codex cache. They are reference archives, not automatic project-wide instructions
or an installation of MCP servers/hooks into another agent.

| Package | Local guide | Plugin skills | License |
|---|---|---:|---|
| Superpowers 7.0.1 | [Skill index](plugins/superpowers/README.md) | 15 | MIT |
| context-mode 1.0.169 | [Skill index and runtime notes](plugins/context-mode/README.md) | 8, plus 3 harness/maintenance variants | Elastic-2.0 |
| Impeccable 4.3.1 | [Existing archive](../design_specifications/vendor/impeccable/README.md) | 1 umbrella with command playbooks | Apache-2.0 |

[catalog.json](catalog.json) lists every plugin skill path/description and the
additional context-mode variants. Installed versions were archived on 13 November 2026;
this is not a claim to have downloaded the latest upstream releases. Impeccable
was already archived on 11 November and stays in its original location, unchanged.
No additional optional skill packages are needed for this handoff.

## Use a skill in another agent

1. Read root `AGENTS.md`, `current context.md`, and the requested task/spec. For
   product work include the kit's AGENTS, master plan and ordered board; for UI
   include PRODUCT.md, selected design and the relevant studio/player brief.
2. Select the relevant SKILL.md from the package index. Read its complete body,
   then only the support files it names for the current task. Keep relative
   references anchored to that archived skill's directory.
3. Follow the user's scope and repository instructions. Adapt tool names to the
   current agent's real capabilities; a subagent or MCP call cannot be assumed
   available because a Markdown file mentions it. Do not claim unrun checks.
4. Keep edits in first-party code. Update current context with decisions/evidence;
   preserve versioned reference sources unless archive maintenance was requested.

Superpowers provides planning, implementation, TDD, debugging and review workflows.
Impeccable provides UI/design playbooks and helpers. context-mode's prose is
readable here, but its `ctx_*` execution/search tools require a separately
configured working MCP runtime. Without those tools, use bounded file analysis
through available tools and state that limitation. Copying these directories
does not grant tools, permissions or an active plugin connection.

## Ready-to-use task brief

Use [examples/task-brief.md](examples/task-brief.md), replacing the task number and
objective. It points to the project authorities and exact skill entry points.
Ask for one coherent task rather than the entire later-epic board at once.

## Verify or update an archive

From the project root:

```powershell
node tools/verify-agent-resources.mjs
```

This checks recorded file sizes/SHA256 values, package licenses, skill catalogs
and the existing Impeccable manifest. It needs only Node, not pnpm or an MCP server.
Upstream `.gitignore`/`.gitattributes` files in new snapshots were retained
byte-for-byte under `_archive_metadata/` so their rules cannot hide bundled files
or rewrite line endings. The manifest records each original source path.

Snapshots omit installed `node_modules`, Git repositories and local runtime
statistics. Dependencies/skill runtimes may need separate setup. Original plugin
configuration may contain host-specific paths; keep it as provenance and use the
receiving agent's supported setup instead of applying those paths verbatim.

For an explicitly requested update, add a new version directory, retain all
required support files and license, create its hash manifest, update catalog and
guides, then run verification. Apply the same process if a newly used skill is
worth sharing. Avoid adding unrelated plugins merely because they exist.

## Environment reference

[environment/RTK.md](environment/RTK.md) mirrors the existing command-prefix rule
from the original machine; its source/hash are in provenance.json. Root AGENTS
now reaches this portable copy. If a host blocks RTK, report the blocker and prefer
available file APIs over inventing shell results. No global installation, PATH,
host security policy, agent configuration or project runtime dependency was changed
to create this library.
