# Studio surface — Task 01

Mode: **Operate**. This extends the selected Afterlight identity into the product; the landing design remains independent.

The creator opens Neon Shogun, chooses a scene/shot in the project explorer, selects a layer from the node navigator or stage, and reads its original transform and references in the inspector. Selection is temporary UI state; the fixture remains canon and revision stays unchanged.

Use Manrope at fixed rem sizes, charcoal ground #141513, panel #1c1f19, foreground #f1f0e9, muted #b6b9ae, divider #373b32 and sage #d7dfc7 for selection/focus. Apply fine dividers and quiet 4px controls. No marketing hero, atmospheric imagery, ornamental motion or fabricated success counters. Authored SVG is for icons and exact interface geometry.

Desktop composition: compact project/branch header; left project explorer and shot layer navigator; dominant center 16:9 blockout; right inspector; center-bottom timeline placeholder; full-width diagnostics disclosure and status footer. At tablet widths the inspector moves below the stage; on mobile panels stack in source order with the navigator before the stage and inspector. Controls remain keyboard reachable, at least 44px on touch layouts, and text/identifiers wrap.

The stage displays labeled layout rectangles, grounded in authored x/y/scale/rotation and sorted by z. It is explicitly a blockout: source SVG/audio files are not supplied yet. The background grid is a stage measurement aid, not decoration. Names, layer kinds, depth and selection identify the planes; selection has a visible border and text, not color alone. The navigator remains the accessible route to fully obscured/off-frame layers.

The inspector uses semantic read-only outputs (X/Y/Z/scale/rotation), source IDs, asset URI, pose and character context. Do not show editable transform inputs, save/export/play buttons, or a successful linter count. Timeline tracks show the selected shot's authored duration only; diagnostics says continuity checks are not implemented and can disclose the existing fixture note as a document note.

Empty scenes/projects, unselected layer, unavailable references, API failure and initial loading all have explicit guidance. Reload restores the seed and initial UI selection. The Task 00 overview remains at `/document`. No localStorage persistence or document mutations.
