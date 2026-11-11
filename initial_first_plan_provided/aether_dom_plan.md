# Cross-Track Project Evaluation

**Created:** 11/7/2026 20:45:59  
**Updated:** 11/10/2026 18:21:13  
**Exported:** 11/10/2026 20:05:11  

## Agent:

> 11/10/2026 12:41:17

> **Thinking steps**
>
> **Defined venture themes**
>
> Decided the core venture themes are storytelling with co-writers, music and audio studios, autonomous creative agents, and visual art and design assistance. The venture will focus on full-scope feasibility with the goal of creating a deeply unique concept that has product-level scalability.
> **Determined product focus**
>
> Defined the product focus as a semantic scene graph engine for episodic media, drawing a parallel to the document object model in web development. This will allow for granular manipulation of media elements and closed-loop showrunner capabilities, establishing a B2B/Prosumer SaaS category.
> **Determined citation style**
>
> Analyzed the source citation rules to determine that a bullet list about a single event requires no citations for each item and adapted the citation structure accordingly.
> **Defined AETHER-DOM concept**
>
> Determined AETHER-DOM as a bi-directional semantic scene graph uniting narrative beats, vector layers, MIDI stems, and audience retention events in a `.cdom` file format to solve the "Flat-Artifact Black Box" issue in existing generative media.
> **Evaluated Narrative Engine**
>
> Determined AETHER-DOM as a neuro-symbolic engine with vector memory and structured output, comparing its multi-plane SVG canvas and object-bound audio against existing tools like LTX Studio, Wireflow, Recraft, DomoAI, and Boords to illustrate that AETHER-DOM uniquely combines narrative, visuals, and audio.
> **Evaluated table format**
>
> Determined that each row in the competitor comparison table will include its source citation at the end of the row's final cell, ensuring consistent citation of multiple distinct items with external references.

To elevate this from a weekend hackathon project into a venture-scalable, category-defining product, you have to solve the single biggest bottleneck in modern generative media: **The "Flat-Artifact Black Box" Problem.**

Right now, the generative AI ecosystem is fractured into tools that output *terminal artifacts*—flat MP4 videos, flat PNG images, mixed-down stereo MP3s, and isolated text scripts[cite: 1, 2, 3, 4]. Professional creators, indie studios, and showrunners cannot art-direct a black box. When a director says, *"Move the character's arm 15 degrees left, shift the dialect in line three to sound more paranoid, make the cello stem swell two seconds earlier, and re-frame the shot for 9:16 vertical without cropping the secondary character,"* today's AI tools force you to re-roll the generation dice from scratch or manually rebuild the scene across five disconnected apps[cite: 1, 2, 3, 4].

---

## The Product Concept: **AETHER-DOM**
**Category:** *The World's First Object-Oriented Creative DOM (Document Object Model) & Closed-Loop Showrunner Engine*

### The Core Product Thesis
In web engineering, the browser **DOM** binds structure (HTML), layered visual styling (CSS), state logic (JavaScript), and user telemetry into a single reactive tree. **AETHER-DOM** brings that exact architectural paradigm to episodic visual storytelling, motion comics, animatics, and indie animation[cite: 5, 6].

Instead of generating flat video pixels, AETHER-DOM compiles a creator's project into a **Bi-Directional Neuro-Symbolic Scene Graph (`.cdom`)** where every character psyche, controllable vector/rig layer, spatial audio stem, and audience retention metric is a live, mathematically linked node[cite: 1, 2, 3, 4, 5].

### The 4-Pillar Product Architecture

* **1. Stateful Narrative & Dialect Constraint Engine (Storytelling Layer)**
  * **How it works:** Characters and world rules are stored as schema-enforced state machines inside a **Vector Memory Tree** using **Long-Context Caching** and **Structured Outputs**. Every scene beat updates numerical psychological vectors (e.g., `paranoia: +0.4`, `loyalty: -0.2`) and enforces strict phonetic/syntactic dialect rules.
  * **Product magic:** If a writer changes a plot event in Episode 1, the engine automatically flags causal continuity paradoxes in Episode 8 and dynamically rewrites affected NPC dialogue while preserving each character's exact linguistic fingerprint.
* **2. Non-Destructive 2.5D Vector + Skeletal Diffusion Stage (Visual Art Layer)**
  * **How it works:** Scenes render on a real-time **WebGPU Shader Canvas** combining **Layered SVG path synthesis** (with editable Bezier anchor nodes for props, architectural planes, and kinetic typography) and **ControlNet + IP-Adapter character turnaround rigs** with localized **Diffusion Inpainting**.
  * **Product magic:** Zero random hallucinations. An artist can grab an anchor node to reshape a prop, scrub a slider to rotate a character's rig 45 degrees, or paint with a live semantic brush on Layer 3 without altering a single pixel on Layers 1, 2, or 4.
* **3. Coordinate-Bound Acoustic & Stem Graph (Audio Studio Layer)**
  * **How it works:** Audio is bound directly to canvas geometry and narrative state via the **Web Audio API**, **Realtime MIDI Streams**, and **Audio Spectrogram Embeddings**. Characters carry MIDI leitmotif stems (`Lyria / MusicLM`), and visual props carry **Zero-Shot Spatial Foley Emitters**.
  * **Product magic:** Dragging an SVG door slam or a character across the canvas automatically recalculates stereo panning, reverb decay, and Foley timing. Raising a scene's narrative conflict score dynamically shifts the background score into micro-tonal tension harmonies without cutting or re-generating static audio files.
* **4. Telemetry-Native Reflow & Canon-Feedback Loop (Creator Agent Layer)**
  * **How it works:** Because the engine owns the underlying Scene Graph, the **Autonomous Creator Agent** doesn't have to guess where the hook is in a flattened video. It queries ground-truth tension spikes (where narrative conflict, visual motion velocity, and musical dissonance peak simultaneously) to extract vertical reels via **Automated Video Stitching** and **Whisper ASR**.
  * **Product magic:** Instead of cropping 16:9 video into a cramped 9:16 vertical clip, the engine **dynamically reflows the SVG and character layers** so both characters stay framed in 9:16. It then runs a **Visual Attention Heatmap** simulation directly on the canvas layers to rearrange elements for maximum thumbnail CTR, while an **In-Character Community Agent** interacts with viewers and feeds audience sentiment back into the Narrative Graph for the next episode[cite: 1, 2, 3, 4, 5].

---

## Deep Evaluation: Originality & Existing Alternatives (2026 Landscape)

While storyboard-to-video and AI design tools have matured significantly in 2026, every existing product operates in a **siloed modality** or produces **baked raster outputs**.

| Existing Platform | What It Does Well Today | Critical Blindspot / Why It Fails the Full Loop |
| :--- | :--- | :--- |
| **LTX Studio** | End-to-end script-to-storyboard-to-video pre-production with camera controls, character casting consistency, and Lyria/Foley scoring. | **Baked Raster Video:** Once a shot generates, layers are fused into flat video pixels; no editable SVG anchor nodes, no neuro-symbolic psychology trees, and no autonomous social telemetry loop. |
| **Wireflow** | Node-based canvas that wires script blocks into shot lists and character reference sheets for consistent batch storyboarding. | **Static Pre-Production Only:** Great for wiring static image references, but lacks real-time WebAudio/MIDI stem adaptation, interactive WebGPU layer manipulation, and autonomous distribution agents. |
| **Recraft (V4)** | Industry-leading infinite canvas for generating brand-consistent scalable vector graphics (SVGs) and design mockups. | **Zero Narrative, Motion, or Audio:** Purely a static graphic design tool with no concept of episodic storytelling, character rigging, adaptive soundscapes, or video packaging. |
| **DomoAI** | Fast 2-to-8 frame storyboard-to-animatic interpolation with 30+ anime/cinematic styles and lip-sync avatars. | **Style Transfer Black Box:** Focused on smoothing frame transitions rather than controllable multi-layer vector/rig editing, lore constraint checking, or adaptive stem scoring. |
| **Boords / Storyflow** | Agency-grade script breakdown, animatic timing, and client review/approval workflows. | **Workflow Wrappers:** Built for traditional agency sign-offs; they do not offer neuro-symbolic co-writing, real-time generative soundstages, or automated multi-platform growth agents. |

---

## Refined Differentiating Features (Your Defensible Technical Moat)

To make **AETHER-DOM** an uncopyable product rather than a feature that an incumbent can clone, your product strategy should center on five deep engineering differentiators:

1. **Cross-Modal Reactive Binding (The "Spreadsheet Effect" for Media)**
   * In Excel, changing cell `A1` instantly recalculates `B1` and updates chart `C1`. In AETHER-DOM, changing a character's emotional state in the script (` Narrative Node `) deterministically updates their facial rig/lighting shader (` Visual Node `), shifts their MIDI leitmotif from major to Phrygian dominant (` Audio Node `), and updates the social cutdown metadata (` Distribution Node `). No existing tool links text semantics, vector geometry, and audio DSP in a single reactive state tree.
2. **Hybrid SVG-Vector + Skeletal Diffusion Pipeline (100% Editability, 0% Drift)**
   * Pure diffusion models hallucinate details between frames; pure SVG generators look flat. By splitting the scene into **controllable SVG vector paths** (for environments, props, motion lines, and UI) and **IP-Adapter/ControlNet skeletal rigs** composited via **WebGPU shaders** (lighting, depth-of-field, atmospheric particles), artists get cinematic quality while retaining Illustrator-level node control.
3. **Aspect-Ratio Scene Reflow (Native 16:9 to 9:16 Scene Re-Composition)**
   * Traditional AI clippers (`OpusClip`, `CapCut`) take a 16:9 horizontal video and crop the sides to make a 9:16 Reel—cutting off background visuals and forcing awkward split-screens. Because AETHER-DOM renders from a live 2.5D scene graph, exporting to 9:16 **re-positions the camera and brings the character rigs closer together inside the 3D WebGPU space** while keeping the background intact.
4. **Pre-Render Saliency & Heatmap Optimization**
   * Instead of generating 20 random thumbnails and hoping one clicks, AETHER-DOM runs a lightweight **Visual Attention Heatmap model** directly over the live scene layers. It calculates a mathematically optimal composition (e.g., *“Scale Character A up 18%, shift foreground prop 40px right, increase rim-light shader contrast by 25%”*) and applies those layer transforms non-destructively before rendering.
5. **Stateful Audience-to-Canon Telemetry Bridge**
   * The **Autonomous Creator Agent** turns passive viewers into active co-writers without breaking story quality. It scrapes viewer comments, retention drop-offs, and poll votes, filters them through the **Lore-Keeper's Psychological Constraint Engine** (rejecting audience suggestions that violate established canon), and presents the human creator with 3 canon-compliant plot branches for the next episode[cite: 1, 2, 3, 4, 5].

---

## Full-Scope Feasibility & Production Tech Stack

Every single component of this product can be built today without waiting for unreleased research models:

* **Frontend & Rendering Engine:** `Next.js / TypeScript`, `PixiJS` or `Three.js (WebGPU renderer)` for the 2.5D multi-plane stage, `Paper.js` for real-time SVG Bezier anchor node manipulation, and `React Flow` for the visual Narrative/Scene Graph inspector.
* **Narrative & Neuro-Symbolic Core:** `Gemini 2.5 Pro` (utilizing **Context Caching** to hold massive multi-episode lore bibles at low latency/cost and **Structured Outputs** to guarantee strict JSON state-graph updates) + `Neo4j` or `Qdrant` for the **Vector Memory Tree**.
* **Visual Layer Synthesis:** `ControlNet + IP-Adapter` (via `Fal.ai` or `Replicate` serverless GPUs for sub-second interactive turnaround and inpainting generation) paired with an SVG vectorization/path-synthesis model (`StarVector` or `VTracer` + LLM SVG refinement) for clean anchor nodes.
* **Adaptive Audio & Foley Engine:** Native browser `Web Audio API` + `Tone.js` for real-time stem mixing, spatial 3D panner nodes bound to canvas $(X, Y, Z)$ coordinates, and `Lyria / MusicLM` + `ElevenLabs SFX / AudioGen` cached into triggerable spectrogram-indexed stems.
* **Distribution & Analytics Swarm:** `Whisper ASR` for frame-accurate phoneme alignment, a lightweight ViT saliency model (`DeepGaze` or `OpenCV` spectral residual saliency on WebGPU) for instant thumbnail heatmaps, and social Graph APIs via `LangGraph` tool-calling agents[cite: 1, 2, 3, 4, 5].

Would you like to dive deeper into the **`.cdom` JSON schema design** that links the narrative, visual, and audio nodes together, or map out how to slice this product into a high-impact **MVP demo** for investors and judges?

## User:

> 11/10/2026 18:21:13

I want to go over this AETHER DOM idea. Develop this into a complete plan with full scope integration of all features. Deeply evaluate and elaborate on the idea along with clear details of everything needed along with the whole implementation plan. I wanna see how everything works. Draft the system architecture diagram and the tech stack, work over the differentiating features (can you think of more exclusive or meaningful features that can be integrated or added with this project), user workflow, system architecture, AI integration, scope and live demo strategy. Give everything in the chat but draft me a complete plan.md file covering everything from the chat too.

## Agent:

> 11/10/2026 18:21:13

> **Thinking steps**
>
> **Integrated features identified**
>
> Evaluated the integration of various features for AETHER-DOM, considering the user's focus on a comprehensive plan, ensuring that all aspects are addressed in a cohesive and actionable manner.
> **Compiled query document**
>
> Compiled the user's query into a document without modifications, following the instruction to use the exact provided text for generation, thus preserving the user's original phrasing for the document.
> **Outlined project integration**
>
> Developed a comprehensive integration plan for all features of the AETHER-DOM project, ensuring a complete scope bridging all five tracks of the GeNarrative Clash 2026 hackathon and addressing its intended product scalability, with thorough consideration of its capabilities.
> **Checked new feature coverage**
>
> Determined external information about recent updates to web audio, SVG, and generative AI tools would fulfill system instructions before generating the final project document.
> **Reviewed formatting requirements**
>
> Carefully reviewed and confirmed the structure, formatting rules, and citation constraints for the upcoming file generation, ensuring adherence to all specifications regarding tone, length, and subject-matter.
> **Determined file output method**
>
> Decided to create both a complete plan.md file with the entire specification and detailed chat content, to ensure the user has the comprehensive information available in multiple formats.

I will now generate the master architecture, product specification, and implementation blueprint for **AETHER-DOM** in `plan.md`, followed by a complete breakdown directly in our chat so you can review and iterate on every layer seamlessly.

---

# AETHER-DOM: The Object-Oriented Creative DOM & Closed-Loop Showrunner Engine
**Master Product Specification, System Architecture & Hackathon Execution Blueprint**

---

## 1. Executive Vision & Core Product Thesis

### 1.1 The Industry Bottleneck: The "Flat-Artifact Black Box"
Modern generative AI tools across text, image, video, and audio suffer from a fundamental architectural flaw: **they output terminal, flattened artifacts**.
* Video generators output baked `.mp4` pixel grids where a creator cannot move a prop 10 pixels left without re-rolling the entire seed.
* Image generators output flat `.png` rasters rather than editable layered vector paths with preserved Bezier anchor nodes.
* Audio generators output mixed-down `.mp3` stereo files that cannot dynamically adapt their musical stems when a writer edits the pacing of a scene.
* Social media clipping tools blindly crop $16:9$ horizontal video into cramped $9:16$ vertical frames, slicing characters in half and operating completely disconnected from the story's underlying canon.

### 1.2 The AETHER-DOM Solution
Just as the browser **DOM (Document Object Model)** revolutionized web applications by binding structure (HTML), layered styling (CSS), state logic (JavaScript), and user telemetry into a single live, reactive tree, **AETHER-DOM** introduces the **Creative Document Object Model (`.cdom`)**.

Instead of generating flat video pixels, AETHER-DOM compiles an episodic story, animatic, motion comic, or indie animation into a **Bi-Directional Neuro-Symbolic Scene Graph**. Every character psyche, dialect rule, controllable SVG vector layer, 2.5D skeletal rig, spatial audio stem, and audience retention metric is a live, mathematically linked node on a real-time **WebGPU + WebAudio stage**

---

## 2. Complete Cross-Track Integration Matrix (GeNarrative Clash 2026)

AETHER-DOM unifies all four core hackathon tracks plus the Open Innovation wildcard into a single continuous creative operating system:

| Track | Core Problem Addressed | AETHER-DOM Subsystem | Key Technical Primitives |
| :--- | :--- | :--- | :--- |
| **1. Storytelling & Co-Writers** | Lore inconsistency, flat character voices, and broken nonlinear branching across episodes. | **Neuro-Symbolic Lore-Keeper & Dialect Engine** | Gemini Long Context + Context Caching, Structured Outputs, Vector Memory Trees. |
| **2. Visual Art & Design Assist** | Uncontrollable diffusion hallucinations and lack of iterative, layered artist workflows. | **Non-Destructive 2.5D Vector + Skeletal Diffusion Stage** | Layered SVG Path Synthesis (Bezier anchor nodes), ControlNet, IP-Adapters, Diffusion Inpainting, WebGPU Shaders. |
| **3. Music & Audio Studios** | Lack of real-time adaptive soundscapes and stem control tied to emotional pacing. | **Coordinate-Bound Acoustic & Tension Stem Graph** | Web Audio API, Lyria / MusicLM Stems, Audio Spectrogram Embeddings, Realtime MIDI Streams, Zero-Shot Spatial Foley. |
| **4. Autonomous Creator Agents** | 60% of creator hours lost to thumbnail A/B testing, vertical cutdowns, and community management. | **Telemetry-Native Scene Reflow & Canon-Feedback Swarm** | Multimodal Vision LLMs, Whisper ASR, Visual Attention Heatmap Saliency Shaders, Automated Video Stitching, Agentic Tool Calling. |
| **5. Open Innovation (Wildcard)** | Siloed single-modality wrappers that fail to pioneer new human-AI creative paradigms. | **The `.cdom` Reactive Cross-Modal State Engine** | Multi-Agent Swarms over WebSockets, Client-Side WebGPU Compute Shaders, Neuro-Symbolic Graph Constraints. |

---

## 3. Deep Market Evaluation & Competitive Landscape (2026)

| Platform | Primary Strength | Critical Architectural Limitation vs. AETHER-DOM |
| :--- | :--- | :--- |
| **LTX Studio** | Script-to-storyboard video generation with camera framing and basic audio scoring. | **Baked Raster Output:** Outputs flat video clips; lacks editable SVG anchor nodes, neuro-symbolic psychology state machines, and native $9:16$ 3D scene reflow. |
| **Wireflow** | Node-based canvas for wiring script blocks into consistent static storyboard shot lists. | **Static Pre-Production Only:** No real-time WebAudio/MIDI stem adaptation, no interactive 2.5D WebGPU stage, and no autonomous social telemetry loop. |
| **Recraft V4** | Production-grade scalable vector graphics (SVG) generation on an infinite canvas. | **Zero Narrative, Rigging, or Audio:** Purely a static graphic design tool with no concept of episodic lore, character turnarounds, or adaptive soundscapes. |
| **DomoAI** | Fast frame interpolation and style transfer for anime/comic animatics. | **Style Transfer Black Box:** Destroys layer separation; artists cannot grab a vector node or dynamically alter a musical stem based on scene tension. |
| **OpusClip / CapCut** | Automated short-form vertical clipping and captioning from longform video. | **Post-Hoc Cropping:** Operates on dead pixels after export; cannot reposition 3D cameras or character rigs inside the scene to compose a true $9:16$ shot. |

---

## 4. Ten Defining Product Differentiators (5 Core + 5 Exclusive New Innovations)

### Core Architectural Differentiators
1. **Cross-Modal Reactive Binding (The "Spreadsheet Effect" for Media):**
   Changing a character's emotional state in the script (`Narrative Node`) deterministically updates their facial rig and rim-light shader (`Visual Node`), shifts their MIDI leitmotif from major to Phrygian dominant (`Audio Node`), and recalculates the viral hook score (`Distribution Node`).
2. **Hybrid SVG-Vector + Skeletal Diffusion Pipeline (100% Editability, 0% Drift):**
   Environments, props, effects, and kinetic typography are synthesized as **layered SVG vector paths with preserved Bezier anchor nodes**, while characters use **ControlNet + IP-Adapter multi-angle turnaround rigs** composited on a 2.5D WebGPU parallax stage.
3. **Native 2.5D Aspect-Ratio Scene Reflow ($16:9 \leftrightarrow 9:16 \leftrightarrow 1:1$):**
   Instead of cropping horizontal video sides for vertical reels, AETHER-DOM dynamically recalculates camera focal length and pulls character rigs closer along the $X$-axis inside the 2.5D WebGPU stage while keeping background SVG layers intact.
4. **Pre-Render Saliency & Visual Attention Heatmap Optimizer:**
   Runs a client-side WebGPU compute shader saliency model over the live scene layers to predict human eye-tracking heatmaps. Automatically suggests or applies non-destructive layer transforms (scale, contrast, rule-of-thirds alignment) for maximum thumbnail CTR before rendering a single pixel.
5. **Stateful Audience-to-Canon Telemetry Bridge:**
   An in-character community agent interacts with audience comments, aggregates poll votes and retention drop-offs, filters community suggestions through the **Lore-Keeper Psychological Constraint Engine**, and synthesizes canon-compliant Episode $N+1$ branches.

### 5 Exclusive New Differentiators (High-Impact Innovations)
6. **"Git for Storytelling" (Multiverse Branch Diffing & Merge Conflict Resolver):**
   Creators can fork a story timeline (`git checkout -b dark-ending`), visually diff two narrative branches side-by-side (comparing psychological vector drift, SVG layer deltas, and audio stem shifts), and merge branches using an AI Canon Resolver that automatically patches continuity conflicts.
7. **Bi-Directional Acoustic-Visual Physics (Spectrogram-Driven Shader & Bezier Modulation):**
   Audio isn't just passive output—real-time **Audio Spectrogram Embeddings** from character voices and Foley stems drive WebGPU vertex shaders and SVG anchor nodes. A thunderclap or bass drop physically ripples background puddle SVG nodes; a character's terrified vocal tremor dynamically jitters their speech-bubble Bezier paths and camera shake.
8. **The Showrunner's Compiler (Real-Time Semantic Continuity Linter):**
   Works like an IDE linter (`ESLint` for animation/storytelling). Runs continuously in the background to underline cross-modal bugs in red: *"Continuity Error in Scene 4: Kael's left arm was injured in Episode 1 (Node #14), but his 2.5D rig is holding a heavy rifle with his left hand."*
9. **Zero-Latency Phoneme-to-Viseme Vector Morphing:**
   Instead of slow, uncanny raster lip-sync generation, **Whisper ASR** extracts frame-accurate phoneme timestamps and drives parametric SVG mouth/jaw Bezier anchor nodes blended with the character's psychological state vector (e.g., speaking the phoneme `/ah/` through clenched teeth when `anger > 0.7`).
10. **Exportable Interactive `.cdom` Web Player ("Playable Transmedia Episodes"):**
    In addition to exporting `.mp4` and `.svg` packages, creators can publish a lightweight interactive WebGPU/WebAudio embed where viewers can tilt their phone/mouse for 2.5D parallax, click props to inspect canon lore cards, and vote on branching plot choices directly inside the video player.

---

## 5. System Architecture & The `.cdom` Data Model

### 5.1 High-Level System Architecture Diagram

`​`​`
+========================================================================================+
|                        AETHER-DOM CLIENT WORKSPACE (Next.js 15)                        |
|                                                                                        |
|  +-------------------------+  +--------------------------+  +-----------------------+  |
|  |   IDE & LORE GRAPH UI   |  |  2.5D WebGPU + SVG STAGE |  |  WEBAUDIO & STEM DAW  |  |
|  | - React Flow Multiverse |  | - Three.js/Pixi WebGPU   |  | - Tone.js / WebAudio  |  |
|  | - Dialect Script Editor |  | - Paper.js Bezier Nodes  |  | - 3D Spatial Panners  |  |
|  | - Continuity Linter     |  | - WGSL Saliency Shaders  |  | - Realtime MIDI Bus   |  |
|  +------------+------------+  +-------------+------------+  +-----------+-----------+  |
|               |                             |                           |              |
|               +-----------------------------+---------------------------+              |
|                                             |                                          |
|                                             v                                          |
|              +--------------------------------------------------------------+          |
|              |     REACTIVE .CDOM STATE ENGINE (Yjs CRDT + Zustand Bus)     |          |
|              |   Bi-Directional Cross-Modal Dependency Graph & Diff Engine  |          |
|              +------------------------------+-------------------------------+          |
+=============================================|==========================================+
                                              | WebSockets / gRPC / WebRTC Streams
+=============================================|==========================================+
|                     MULTI-AGENT NEURO-SYMBOLIC ORCHESTRATOR (FastAPI)                  |
|                                             |                                          |
|     +-------------------+-------------------+-------------------+------------------+   |
|     |                   |                                       |                  |   |
|     v                   v                                       v                  v   |
| +-------+       +---------------+                       +---------------+      +-------+
| |AGENT 1|       |    AGENT 2    |                       |    AGENT 3    |      |AGENT 4|
| |LORE & |       | VISUAL LAYER  |                       | ACOUSTIC &    |      |CREATOR|
| |DIALECT|       | & RIG SYNTH   |                       | FOLEY SYNTH   |      |GROWTH |
| +---+---+       +-------+-------+                       +-------+-------+      +---+---+
|     |                   |                                       |                  |   |
|     v                   v                                       v                  v   |
| [Gemini 2.5 Pro]  [ControlNet + IP-Adapter]            [Lyria / MusicLM]    [Whisper ASR]
| [Context Cache]   [StarVector / VTracer SVG]           [ElevenLabs Foley]   [VLM Heatmap]
| [Structured JSON] [Diffusion Inpainting API]           [CLAP Embeddings]    [Social Bot ]
|     |                   |                                       |                  |   |
|     +-------------------+-------------------+-------------------+------------------+   |
|                                             |                                          |
|                                             v                                          |
|              +--------------------------------------------------------------+          |
|              |      PERSISTENCE & VECTOR MEMORY LAYER (Qdrant + Neo4j)      |          |
|              |  Lore Canon Graph | Character Turnaround Vault | Stem Cache  |          |
|              +--------------------------------------------------------------+          |
+========================================================================================+
`​`​`

### 5.2 Core `.cdom` JSON Schema Specification

Every scene in AETHER-DOM is governed by a strict, deterministic JSON schema enforced via Gemini Structured Outputs:

`​`​`json
{
  "$schema": "https://aether-dom.io/schemas/v1/cdom.json",
  "project_id": "ep01_neon_shogun",
  "branch_id": "main_canon_v2",
  "global_tension_score": 0.78,
  "narrative_state": {
    "scene_id": "sc_04_rooftop_standoff",
    "active_characters": [
      {
        "character_id": "char_kael",
        "psychology_vector": {
          "paranoia": 0.85,
          "loyalty": 0.30,
          "exhaustion": 0.65,
          "aggression": 0.72
        },
        "physical_constraints": ["injured_left_arm", "missing_katana_sheath"],
        "dialect_profile": {
          "sociolect": "Low-Sector Cyber-Cant",
          "syntax_rules": ["drops_subject_pronouns", "uses_industrial_metaphors"],
          "forbidden_vocabulary": ["formal_honorifics"]
        },
        "dialogue_line": {
          "raw_intent": "Tell Vance I know he betrayed the syndicate.",
          "rendered_dialect_text": "Circuit's blown, Vance. Sold the grid to the suits, didn't ya?",
          "phoneme_timeline": [
            {"phoneme": "S", "start_ms": 0, "end_ms": 90, "viseme_id": "vis_sibilant"},
            {"phoneme": "ER", "start_ms": 90, "end_ms": 210, "viseme_id": "vis_mid_vowel"}
          ]
        }
      }
    ],
    "continuity_lint_warnings": []
  },
  "visual_stage": {
    "camera": {
      "aspect_ratio": "16:9",
      "fov_deg": 45,
      "position_3d": {"x": 0.0, "y": 1.2, "z": 5.0},
      "reflow_overrides": {
        "9:16": {"fov_deg": 32, "character_x_compression": 0.45}
      }
    },
    "layers": [
      {
        "layer_id": "bg_neon_skyline",
        "type": "SVG_VECTOR_PLANE",
        "z_depth": -10.0,
        "svg_path_data": "M12.5 40.2 C 25.0 10.0, 45.0 10.0, 60.0 40.2 Z",
        "editable_anchor_nodes": 142,
        "wgsl_shader": "rain_refraction_v2.wgsl",
        "audio_reactive_binding": {
          "source_stem": "stem_sub_bass",
          "target_uniform": "u_neon_flicker_intensity"
        }
      },
      {
        "layer_id": "rig_char_kael",
        "type": "CONTROLNET_SKELETAL_RIG",
        "z_depth": -2.0,
        "position_3d": {"x": -1.4, "y": 0.0, "z": -2.0},
        "pose_turnaround_angle_deg": 35,
        "ip_adapter_vault_ref": "vault://char_kael_turnaround_sheet_v1",
        "active_viseme_svg_overlay": "vis_sibilant"
      }
    ],
    "saliency_heatmap": {
      "predicted_ctr_score": 88.4,
      "primary_fixation_point": {"x": 0.38, "y": 0.42},
      "recommended_transforms": [
        {"layer_id": "rig_char_kael", "action": "scale_multiplier", "value": 1.15}
      ]
    }
  },
  "acoustic_stage": {
    "bpm": 128,
    "scale_mode": "D_PHRYGIAN_DOMINANT",
    "stems": [
      {
        "stem_id": "stem_tension_strings",
        "model_source": "Lyria-v2",
        "gain_db": -2.5,
        "tension_curve_binding": "exponential_above_0.6"
      }
    ],
    "spatial_foley_emitters": [
      {
        "emitter_id": "sfx_sparking_neon_sign",
        "prompt_cue": "high-voltage electrical arc buzzing in heavy rain",
        "bound_layer_id": "bg_neon_skyline",
        "panner_3d": {"x": 2.1, "y": 3.0, "z": -8.0}
      }
    ]
  }
}
`​`​`

---

## 6. Deep AI Integration & Mathematical Formulations

### 6.1 Multi-Modal Scene Tension Function $T(t)$
At every frame $t$, AETHER-DOM computes a unified **Scene Tension Score** $T(t) \in [0.0, 1.0]$ that drives both the **WebAudio Stem Mixer** and the **Autonomous Reel Extractor**:

$$T(t) = \sigma\left( w_1 \cdot \|\Delta \vec{P}_t\|_2 + w_2 \cdot C_{\text{narrative}}(t) + w_3 \cdot V_{\text{motion}}(t) + w_4 \cdot E_{\text{spectral}}(t) \right)$$

Where:
* $\|\Delta \vec{P}_t\|_2$ is the Euclidean norm of the psychological vector shift across active characters in the scene.
* $C_{\text{narrative}}(t)$ is the semantic conflict intensity extracted by the Lore-Keeper LLM ($[0, 1]$).
* $V_{\text{motion}}(t)$ is the normalized angular and translational velocity of 2.5D skeletal rigs and camera motion on the WebGPU stage.
* $E_{\text{spectral}}(t)$ is the high-frequency spectral flux from the audio spectrogram.
* $\sigma(\cdot)$ is a clamping sigmoid transfer function with weights $\sum_{i=1}^4 w_i = 1$.

When $T(t) > 0.70$:
1. The **Web Audio API** automatically cross-fades ambient pads down by $-6\text{ dB}$ and introduces micro-tonal percussion and Phrygian string stems via **Realtime MIDI**.
2. The **WebGPU Camera Shader** introduces subtle chromatic aberration and tighter focal length.
3. The **Autonomous Creator Agent** flags the window $[t - 7.5\text{s}, t + 7.5\text{s}]$ as a high-retention candidate for a $9:16$ vertical cutdown.

### 6.2 Neuro-Symbolic Psychological State Update
Whenever a creator writes or selects a branching plot beat $u_k$, a character's psychological state vector $\vec{P}_k \in [-1, 1]^d$ updates deterministically before dialogue is generated:

$$\vec{P}_{k+1} = \text{clip}\left( \mathbf{A} \vec{P}_k + \mathbf{B} \vec{u}_k, -1.0, 1.0 \right)$$

If a proposed dialogue line or user edit has a cosine similarity $\cos(\theta) < \tau_{\text{threshold}}$ against the character's current $\vec{P}_{k+1}$ and historical **Vector Memory Tree**, the **Showrunner's Compiler** triggers a Continuity Warning and offers a one-click dialect-accurate rewrite.

### 6.3 Spatial Acoustic Projection ($2.5\text{D} \rightarrow \text{WebAudio PannerNode}$)
Every SVG prop or character rig at stage position $(X_i, Y_i, Z_i)$ relative to the active camera $(X_c, Y_c, Z_c)$ automatically drives a browser-native HRTF `PannerNode`:

$$\text{Gain}_i = \frac{G_0}{1 + \beta \sqrt{(X_i - X_c)^2 + (Y_i - Y_c)^2 + (Z_i - Z_c)^2}}$$

When the creator switches from $16:9$ horizontal mode to $9:16$ vertical reflow mode, character $X_i$ coordinates compress by factor $\alpha_{\text{reflow}}$, and the stereo field automatically narrows to match mobile phone speaker acoustics.

### 6.4 Client-Side WebGPU Saliency & Visual Attention Heatmap
Using a WGSL compute shader implementation of center-surround spectral residual saliency combined with VLM face/text priority weights, AETHER-DOM computes pixel attention probability $S(x,y)$:

$$S(x,y) = \mathcal{G}(\sigma) * \left| \mathcal{F}^{-1} \left\{ \exp\left( \mathcal{R}(f) + i \mathcal{P}(f) \right) \right\} \right|^2 + \lambda_{\text{face}} M_{\text{rig}}(x,y) + \lambda_{\text{text}} M_{\text{svg\_type}}(x,y)$$

This runs at $60\text{ FPS}$ directly in the browser via WebGPU without waiting for cloud GPU roundtrips.

---

## 7. Complete Production Tech Stack

| Layer | Technology / API | Purpose in AETHER-DOM |
| :--- | :--- | :--- |
| **Frontend Framework** | `Next.js 15 (App Router)`, `TypeScript`, `Tailwind CSS` | Core studio shell, multi-panel timeline, and responsive dockable IDE. |
| **2.5D Render & Compute** | `WebGPU API (WGSL Shaders)`, `Three.js (WebGPURenderer)`, `PixiJS v8` | Real-time 2.5D multi-plane parallax rendering, atmospheric shaders, and $60\text{ FPS}$ client-side saliency heatmaps. |
| **Vector & Bezier Engine** | `Paper.js`, `SVGO`, `StarVector` / `VTracer` | Interactive SVG layer synthesis and real-time Bezier anchor node editing. |
| **Node Graph & State Sync** | `React Flow`, `Yjs (CRDT)`, `Zustand` | Multiverse story branch visualization, Git-style visual diffing, and reactive `.cdom` state propagation. |
| **Narrative & Lore Brain** | `Gemini 2.5 Pro API` (with **Context Caching** & **Structured Outputs**) | Holds full multi-episode lore bible in cache; outputs strict `.cdom` JSON mutations and dialect-constrained screenplays. |
| **Memory & Graph DB** | `Qdrant` (Vector Tree) + `Neo4j` (Symbolic Canon Graph) | Stores character episodic memories, causal event links, and physical status flags. |
| **Visual Rig & Inpainting** | `ControlNet (OpenPose/Depth)`, `IP-Adapter-FaceID`, `Flux.1 / SDXL Inpaint` (via `Fal.ai` WebSockets) | Sub-second consistent multi-angle character turnarounds and localized layer inpainting. |
| **Audio & Foley Studio** | `Web Audio API`, `Tone.js`, `WebMIDI API`, `Lyria / MusicLM`, `ElevenLabs SFX` | Tension-driven dynamic stem mixing, HRTF 3D spatial Foley panning, and spectrogram extraction. |
| **Creator & Growth Swarm** | `Whisper ASR (WebGPU / Transformers.js)`, `FFmpeg.wasm`, `LangGraph` | Frame-accurate phoneme extraction, automated $9:16$ reflow stitching, and autonomous in-character community agent. |

---

## 8. End-to-End User Workflow (How a Creator Uses AETHER-DOM)

1. **Step 1: Lore Bible & Character Seeding (2 Minutes)**
   * The creator uploads a rough world bible or types a 3-sentence premise.
   * **Agent 1 (Lore-Keeper)** initializes the **Neo4j + Qdrant Vector Memory Tree**, caches the lore context via **Gemini Context Caching**, and generates 3 character cards with psychological sliders, dialect rules, and multi-angle **ControlNet/IP-Adapter turnaround sheets**.
2. **Step 2: Branching Script & Semantic Sketching (5 Minutes)**
   * In the **React Flow Multiverse View**, the creator adds Scene 4 and sketches a rough composition on the canvas using the **Live Semantic Brush**.
   * **Agent 2 (Visual Assist)** splits the sketch into clean, **layered SVG vector paths** (neon buildings, rain, foreground railing with editable Bezier anchor nodes) and drops the rigged characters onto the 2.5D WebGPU stage.
3. **Step 3: Live Continuity Linting & Dialect Co-Writing**
   * The creator types a rough line: *"Kael draws his blade with his left hand and politely asks Vance to surrender."*
   * **The Showrunner's Compiler** immediately highlights two errors in red:
     1. *Physical Continuity Error:* Kael's left arm was injured in Episode 1.
     2. *Dialect Violation:* Kael uses Low-Sector Cyber-Cant and never uses polite honorifics.
   * With one click, the creator accepts the fix: Kael's 2.5D rig switches the blade to his right hand, and the line adapts to his authentic grit dialect while **Whisper/Phoneme-to-Viseme** morphs his SVG jaw nodes.
4. **Step 4: Real-Time Tension Scoring & Spatial Foley**
   * As the creator drags the **Tension Curve** slider from $0.3$ to $0.85$ at the climax beat, **Agent 3 (Audio Studio)** shifts the **WebAudio** stems from a sparse ambient synth into a driving Phrygian string arrangement via **Realtime MIDI**.
   * The creator drags a "Sparking Neon Sign" SVG prop from the left side of the canvas to the right—the zero-shot Foley buzz automatically pans across the 3D HRTF audio field and its spectrogram ripples the puddle shader below.
5. **Step 5: Autonomous Growth & Audience-to-Canon Loop**
   * Clicking **"Publish & Distribute"** triggers **Agent 4 (Creator Agent)**.
   * It locates the peak tension window ($T(t) = 0.88$), **reflows the 2.5D scene into $9:16$ vertical** (moving Kael and Vance closer together rather than cropping them), runs the **WebGPU Visual Attention Heatmap** to optimize the thumbnail layers (boosting predicted CTR from $54\%$ to $89\%$), and deploys the **In-Character Community Bot** to Discord/YouTube to poll fans on which branch becomes Episode 2 canon.

---

## 9. Execution Plan for GeNarrative Clash 2026 (The 50/50 Rule) & Product Roadmap

### Part 1: 
* **Deliverable Focus:** Core `.cdom` Engine + Narrative & Visual Layers.
* **Day 1–2 (Nov 10–11):** Scaffold Next.js 15 studio layout, define the `.cdom` TypeScript/JSON schema, and wire **Gemini 2.5 Pro Structured Outputs + Context Caching** for the Lore-Keeper Graph and Dialect Co-Writer.
* **Day 3–4 (Nov 12–13):** Build the **2.5D WebGPU + Paper.js SVG Stage**. Integrate `VTracer`/`StarVector` SVG path synthesis and `Fal.ai` ControlNet turnaround rigs so layers can be dragged in 3D parallax and edited via Bezier anchor nodes.
* **Day 5–6 (Nov 14–15):** Implement the **Showrunner's Compiler (Continuity Linter)** and **Git-style Branch Diff View** in React Flow. Record the crisp 50% MVP submission demo.

### Part 2: 
* **Deliverable Focus:** Real-Time Acoustic Stage + Autonomous Creator Agent Loop.
* **Hour 1–2:** Wire the **Scene Tension Curve $T(t)$** to the **Web Audio API / Tone.js** multi-stem mixer and spatial 3D HRTF `PannerNode` bound directly to SVG $(X,Y,Z)$ coordinates.
* **Hour 2–3.5:** Implement **Audio-Reactive WGSL Shaders** (spectrograms driving visual rain/neon shaders) and **Phoneme-to-Viseme SVG mouth morphing**.
* **Hour 3.5–5:** Activate the **Autonomous Creator Agent**: WebGPU Saliency Heatmap overlay for one-click thumbnail optimization, native $16:9 \rightarrow 9:16$ 2.5D scene reflow, and the live **In-Character Community Poll Agent**.
* **Hour 5–6:** End-to-end polish, stress-testing the live judge interaction, and pitch rehearsal.

### Part 3: Post Venture Product Roadmap 
* **Milestone 1 :** Multi-user collaborative `.cdom` editing via Yjs WebRTC + plugins for Blender, Toon Boom Harmony, and Adobe After Effects.
* **Milestone 2 :** Marketplace for creator-owned Character Rigs, Dialect LoRAs, and Adaptive Stem Packs with automated royalty splits.
* **Milestone 3 :** Embeddable `.cdom` Interactive Streaming SDK for webtoons, indie animation studios, and interactive streaming series.

---

## 10. Winning 5-Minute Live Demo Strategy (Judge Choreography)

To guarantee first place in front of the judges, do **not** show slides for 4 minutes. Run a visceral, high-stakes live studio demonstration:

* **0:00 – 0:45 | The Hook ("Death to the Flat MP4"):**
  Show a standard AI video clip where a character's hand is mangled and the aspect ratio crop cuts off half their face. Then switch to **AETHER-DOM**: grab a building's SVG Bezier node, orbit the 2.5D WebGPU camera, and show the live `.cdom` scene graph ticking at $60\text{ FPS}$.
* **0:45 – 1:45 | Track 1 & 2 Collision (The Showrunner's Compiler & Vector Stage):**
  Intentionally introduce a canon paradox in the script (*giving injured Kael a heavy weapon in his left hand*). Watch the **Continuity Linter** flag the error across the graph, click **"Auto-Reconcile"**, and show the 2.5D rig swap hands while the dialogue automatically rewrites into his exact dialect.
* **1:45 – 2:45 | Track 3 Collision (Spatial Foley & Bi-Directional Audio Physics):**
  Scrub the **Tension Curve** slider up—let the judges *hear* the WebAudio stems shift into dissonant strings in real time. Drag a sparking neon sign across the screen so the judges hear the Foley pan across the auditorium speakers while watching the audio spectrogram physically ripple the SVG puddle nodes on canvas.
* **2:45 – 4:00 | Track 4 & 5 Collision (9:16 3D Reflow, Heatmap & Live Audience Canon):**
  Toggle the **WebGPU Attention Heatmap** shader—show how the agent repositions layers to jump predicted thumbnail CTR from $52\%$ to $91\%$. Click **"9:16 Vertical Reflow"** and watch the 2.5D characters dynamically step closer together instead of getting cropped.
* **4:00 – 5:00 | The Mic-Drop Moment (Judges Become Canon):**
  Have the judges scan a QR code on screen to reply to the **In-Character NPC Community Agent**. Within 5 seconds, the agent filters their responses through the Lore-Keeper Constraint Engine and generates Episode 2's opening branch live on the projector.
`​`​`eof

---

### Deep-Dive Walkthrough of the AETHER-DOM Master Plan

In addition to the `plan.md` document generated in your editor, here is the complete architectural and strategic breakdown directly in chat so you can examine how every mechanism operates and intertwines.

---

### 1. Why AETHER-DOM Wins Both the Hackathon & the Venture Market

Every existing generative tool in 2026—from video generators (`LTX Studio`, `Runway`, `Sora`) to vector tools (`Recraft V4`) and clipping suites (`OpusClip`)—treats media creation as a **one-way pipeline that ends in a dead, flattened file**. Once pixels and audio are baked together, semantic meaning is lost.

**AETHER-DOM** treats an episode or animatic like a modern web application:
* **Narrative & Psychology** = The State Logic (`JavaScript`)
* **2.5D Rigs & Layered SVGs** = The Visual Hierarchy (`HTML/CSS + WebGPU`)
* **Adaptive Stems & Spatial Foley** = The Reactive Event Bus (`WebAudio + MIDI`)
* **Creator Analytics & Social Cutdowns** = Telemetry & Responsive Reflow (`Media Queries`)

Because all four layers live inside a single **`.cdom` (Creative Document Object Model)** state tree, a change in any track instantaneously propagates across the other three.

---

### 2. Five Exclusive New Differentiators Added to Your Arsenal

Beyond the core cross-modal binding, we have engineered five additional high-moat features that no existing tool on the market possesses:

1. **"Git for Storytelling" (Multiverse Branch Diffing & Merge Conflict Resolver)**
   * Creators can fork a storyline (`git checkout -b betrayal-arc`), experiment with wild plot twists, and open a **Visual Branch Diff View**.
   * The Diff Engine highlights exact deltas across all four modalities: how much Character A's `paranoia` vector drifted ($+0.45$), which SVG background layers changed, how the musical key shifted, and which future scenes now have canon merge conflicts.
2. **Bi-Directional Acoustic-Visual Physics (Spectrograms Driving Geometry)**
   * Instead of audio merely reacting to visuals, visuals also react to audio at $60\text{ FPS}$.
   * Real-time **Audio Spectrogram Embeddings** from character dialogue and Foley stems are piped into **WebGPU WGSL vertex shaders** and **SVG Bezier anchor nodes**. When a character screams in terror, the high-frequency vocal energy dynamically jitters the anchor nodes of their comic speech bubble and ripples the water reflections on the floor layer.
3. **The Showrunner's Compiler (Real-Time Cross-Modal Continuity Linter)**
   * Functions like `TypeScript` or `ESLint` for creative direction. As the creator writes or moves layers, a background neuro-symbolic agent validates the scene against the **Neo4j + Qdrant Lore Tree**.
   * If a character whose leg was injured in Episode 1 is placed in a sprinting pose in Episode 4, or if a character speaks using vocabulary outside their sociolect profile, the compiler underlines the node in red and offers a one-click cross-modal fix.
4. **Zero-Latency Phoneme-to-Viseme Vector Morphing**
   * Diffusion lip-syncing is slow and prone to uncanny valley artifacts. AETHER-DOM uses browser-native **Whisper ASR (via WebGPU Transformers.js)** to extract millisecond-accurate phoneme timestamps and morphs **parametric SVG mouth/jaw Bezier nodes** blended with the character's current emotional vector (e.g., an `/o/` phoneme rendered as a snarl when `aggression > 0.75`).
5. **Interactive `.cdom` Web Player ("Playable Transmedia Episodes")**
   * Alongside standard `.mp4` exports, creators can export a lightweight `.cdom` web bundle. Viewers watching on mobile or desktop experience live 2.5D gyroscope/mouse parallax, can tap on background props to read canon lore dossiers, and vote on canon story branches directly inside the frame.

---

### 3. Under the Hood: How the Math & AI Pipelines Connect

#### A. The Unified Tension Equation $T(t)$
To eliminate manual keyframing of music and manual hunting for viral TikTok/Reels hooks, the engine continuously evaluates a normalized **Scene Tension Score** $T(t) \in [0.0, 1.0]$:

$$T(t) = \sigma\left( w_1 \cdot \|\Delta \vec{P}_t\|_2 + w_2 \cdot C_{\text{narrative}}(t) + w_3 \cdot V_{\text{motion}}(t) + w_4 \cdot E_{\text{spectral}}(t) \right)$$

* When $T(t)$ crosses $0.70$, the **Web Audio API** automatically transitions musical stems into high-tension harmonic arrangements via **Realtime MIDI**, while the **Autonomous Creator Agent** tags the surrounding 15-second window as the primary vertical reel cutdown.

#### B. Native $16:9 \rightarrow 9:16$ 2.5D Scene Reflow
When exporting a vertical reel, traditional tools crop the left and right $30\%$ of a $16:9$ frame, cutting off characters in a two-shot. Because AETHER-DOM stores characters and props on a 2.5D stage with $(X, Y, Z)$ coordinates:

$$X_{\text{vertical}} = X_{\text{horizontal}} \cdot \alpha_{\text{compression}}, \quad Z_{\text{camera\_vertical}} = Z_{\text{camera\_horizontal}} \cdot \gamma_{\text{fov}}$$

The characters physically step closer together inside the 3D space, their spatial audio `PannerNode` coordinates narrow to match mobile stereo speakers, and the background SVG skyline remains completely uncropped.

#### C. $60\text{ FPS}$ WebGPU Saliency Heatmap for Thumbnail CTR
Instead of guessing which thumbnail works, a client-side **WGSL Compute Shader** calculates visual saliency $S(x,y)$ across the active canvas layers in real time, combining spectral contrast with face-rig and typography masks. Users can toggle the **Attention Heatmap Overlay** at any time and click **"Auto-Optimize Composition"** to let the agent scale and position layers along high-CTR focal points non-destructively.

---

### 4. Tactical Execution Plan 

* 
  Build the **Next.js 15 Studio Shell**, the **`.cdom` JSON State Bus**, the **Gemini 2.5 Pro Lore-Keeper & Dialect Co-Writer** (using Context Caching + Structured Outputs), and the **2.5D WebGPU + Paper.js SVG Stage** with the **Continuity Linter**. This gives you an unmistakable visual and narrative core for your 50% video submission.
* 
  Wire the **Tension Curve $T(t)$** to the **WebAudio multi-stem mixer + 3D spatial Foley panners**, activate the **Audio-Reactive WGSL Shaders**, and turn on the **Autonomous Creator Agent** ($9:16$ 2.5D Reflow, WebGPU Saliency Heatmap overlay, and the QR-code live audience canon bot).

Everything is saved and structured in `plan.md` on your right. Would you like me to generate the starter codebase scaffolding next, or dive deeper into the exact system prompts and JSON schemas for the four agents?