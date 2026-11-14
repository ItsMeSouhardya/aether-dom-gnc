# Cross-agent task brief

Implement **Task <NN> — <title>** in AETHER-DOM.

Objective: <the requested behavior and any user constraints>.

Before editing, read:

- Root `AGENTS.md` and `current context.md`.
- `aether_dom_codex_kit/AGENTS.md`,
  `aether_dom_codex_kit/AETHER_DOM_MASTER_PLAN.md`, and
  `aether_dom_codex_kit/CODEX_TASKS.md`,
  including the later-epic execution rules when applicable.
- `agent_resources/README.md` and the relevant entries in its catalog.
- `agent_resources/plugins/superpowers/7.0.1/skills/using-superpowers/SKILL.md`,
  followed by the planning/debugging/implementation/review skill relevant to this
  task; use supporting files from the same archived version.
- For UI: PRODUCT.md, `design_specifications/design.md`, relevant `docs/design/`
  brief and `design_specifications/vendor/impeccable/skills/impeccable/SKILL.md`.
- For large output: `agent_resources/plugins/context-mode/1.0.169/skills/context-mode/SKILL.md`.
  Use its tools only if the current environment actually supplies a working runtime.

Implement this task through the existing canonical command/revision architecture.
Use isolated DB/media roots for mutation tests; preserve the regular user project,
original kit/fixtures, selected landing and frozen archives. Keep AI output as
reviewable proposals and do not add scope from later tasks.

Report changed behavior, actual verification results, limitations, current branch
and integration state. Update current context before handoff. Preserve the user's
commit/push preferences; do not claim that reading a skill installed its tools.
