# Presentation workspace runbook

The prepared local workspace is `task12-presentation-final`. It is separate from the regular project database and contains an original fixture-derived scene, recorded evidence and saved hotspots. The retained public-distribution fallback is in `assets/presentation/task-12/`; keep its six files together and do not overwrite or reserialize them. Open its JSON using **Open local player JSON** in `/player`. Hotspots remain interactive in JSON; WebM is a noninteractive recording. Attribution accompanies both videos. Commercial permission is not asserted.

## Start and work

Install the repository dependencies and configure the API Python environment as described in the root README. With Node 22, build and prepare a new workspace once:

```powershell
$env:AETHER_PYTHON = (Resolve-Path '.venv-task04/Scripts/python.exe').Path
node tools/presentation.mjs build
node tools/presentation.mjs setup --workspace my-presentation
node tools/presentation.mjs start --workspace my-presentation --web-port 3300 --api-port 8300
```

For the prepared workspace substitute `task12-presentation-final` for `my-presentation` and omit setup. Start requires a current build but does not need pnpm on PATH and does not start a worker. Open `http://127.0.0.1:3300/welcome`; the studio link leads to saved local editing. Select Kael, edit and save a transform, reload or undo. In Jobs, queue a deterministic mock, then in a separate terminal explicitly run:

```powershell
node tools/presentation.mjs worker --workspace my-presentation --once
```

Use `task12-presentation-final` here too if you started the prepared workspace. The worker processes eligible jobs across the entire named disposable workspace, not only the visible branch. Refresh Jobs, inspect and review the result, then explicitly approve it to change saved canon. There are no real providers or cloud calls. Setup's `--with-reviewed-job` is optional and only creates a reviewed mock when explicitly supplied. Use the inspector to review and save hotspot positions for both aspects; in Player select a marker for saved details and evidence. Public-distribution export is subject to recorded asset evidence and is not a legal clearance. The player can reopen its portable JSON without the API. WebM export requires supported browser recording/GPU/audio capabilities; unsupported systems should use the retained fallback rather than assuming recording succeeded.

## Backup and recovery

The root URL opens `/welcome`. **Log in** / **Open studio** leads through `/login`
to `/studio`; first use creates one local account, and **Log out** returns home.
Sessions last12hours and logout revokes the current session. Password hashes and
session hashes are stored separately in `local-auth.sqlite3` beside the workspace
database (or explicit `AETHER_AUTH_PATH`). Do not publish or checkpoint this file.
Creative backups below exclude account credentials: a restored workspace can
create its own account. CLI capture still reads the identified trusted loopback
API directly and does not create an account or browser session.

Stop the presentation runtime and all other writers before backup. The ownership gate covers cooperating processes; it cannot detect every manually started writer. Use a new label and a new destination workspace:

```powershell
node tools/presentation.mjs backup --workspace task12-presentation-final --label my-backup
node tools/presentation.mjs restore --backup my-backup --workspace my-restored-workspace
node tools/presentation.mjs verify --workspace my-restored-workspace
```

The verified handoff backup is `data/presentation/backups/task12-final-data`; its fresh restore is `task12-final-restored`. Both report logical SHA256 `516748550c8aedd142e4353b33237855aa0f0c45df123281ca8d62cc9ddaea8a`. The hash covers logical database tables including history, undo/redo and jobs; referenced media is independently hashed. Backup/restore assumes a trusted, quiescent local filesystem; visible redirects and tampered metadata are rejected, but it does not guarantee resistance to hostile concurrent OS namespace replacement.

## Source checkpoint

Source checkpoints are separate from database/media backups. Before later cumulative uncommitted work, create and verify a checkpoint with a nonsecret checks report, then preview it into a fresh directory:

```powershell
node tools/checkpoint.mjs create --label my-source-checkpoint --checks README.md
node tools/checkpoint.mjs verify --checkpoint data/checkpoints/my-source-checkpoint
node tools/checkpoint.mjs preview --checkpoint data/checkpoints/my-source-checkpoint --destination data/checkpoint-previews/my-source-checkpoint
```

Check the actual paths emitted by create; never overwrite an existing destination. A preview is a source tree, not a Git checkout, and excludes secrets, dependencies and runtime data. Configure those independently. After the user commits Task12, create another checkpoint to record the actual committed base SHA. Later branches carrying uncommitted changes do not independently preserve those changes; checkpoint them before switching or continuing. The user owns commit and push.

The verified Task12 source checkpoint is `data/checkpoints/task12-handoff`; its
fresh preview contains 1,369 files. Completion metadata is captured last under
`task12-handoff-complete`. Use the final snapshot's verify and preview commands:

```powershell
node tools/checkpoint.mjs verify --checkpoint data/checkpoints/task12-handoff-complete
node tools/checkpoint.mjs preview --checkpoint data/checkpoints/task12-handoff-complete --destination data/checkpoint-previews/my-task12-recovery
```

After committing Task12, create a new uniquely labelled checkpoint, for example
`task12-user-committed`, using the verification report above. Its manifest records
the real committed HEAD; the current handoff correctly records the earlier Task11
base plus all uncommitted Task12 source contents.
