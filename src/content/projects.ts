// Project copy is drawn from each project's own README / package metadata — no invented claims.
export type ProjectSlug = "cicada" | "timbre" | "electroplate" | "axio" | "talenta";

export type Project = {
  slug: ProjectSlug;
  index: string;
  name: string;
  kicker: string;
  tagline: string;
  /** one bold line for the feature block */
  headline: string;
  summary: string;
  paragraphs: string[];
  highlights: { title: string; body: string }[];
  steps: { label: string; note: string }[];
  stack: string[];
  accent: string;
  accent2: string;
  /** tile = transparent mark sitting on a dark tile; native = icon already has its own squircle */
  iconStyle: "tile" | "native";
  /** where to centre the crop when the 16:9 art is shown at other aspect ratios */
  focal: string;
  /** public GitHub repo whose latest release carries the installers (never a private repo) */
  releases?: { owner: string; repo: string };
  /** static version for projects with no public release feed */
  fallbackVersion?: string;
  status: string;
  sourceNote: string;
  website?: { label: string; href: string };
  notice?: string;
};

export const projects: Project[] = [
  {
    slug: "cicada",
    index: "01",
    name: "Cicada",
    kicker: "Agentic Python IDE",
    tagline: "An AI-native development studio.",
    headline: "Plain English in. Running Python out.",
    summary: "Describe a program in plain English and watch it become runnable, executed Python, reasoned through entirely by a local model.",
    paragraphs: [
      "Cicada is an Electron desktop IDE that turns plain-text requests into Python that has been checked and actually run. Every stage of reasoning happens on your machine through a local GGUF model — Qwen2.5-Coder 3B Instruct served by llama.cpp — so there are no API keys, no cloud and no data leaving the computer.",
      "Instead of one prompt-to-code shot, a request moves through a six-stage agentic pipeline with a problem-aware repair loop. What comes back is code that has been reviewed, compile-checked and executed, with plots and output rendered straight into the interface.",
      "It is aimed at beginners, researchers, data scientists and system designers who want to prototype and test small ML and deep-learning models without wiring up a toolchain or sending their data to a third party.",
    ],
    highlights: [
      { title: "Six-stage pipeline", body: "Evaluate, design, generate, fix, run, review, with a repair loop that reacts to the actual failure." },
      { title: "100% local inference", body: "Qwen2.5-Coder 3B on llama.cpp. Nothing is sent to a server." },
      { title: "Runs what it writes", body: "Code is compile-checked and executed; plots and output come back into the editor." },
      { title: "A real editor", body: "Built on Monaco, the editor inside VS Code, with a swipeable first-run tour." },
    ],
    steps: [
      { label: "Evaluate", note: "Understand the request" },
      { label: "Design", note: "Plan the program" },
      { label: "Generate", note: "Write the code" },
      { label: "Fix", note: "Repair what breaks" },
      { label: "Run", note: "Execute it for real" },
      { label: "Review", note: "Check the result" },
    ],
    stack: ["Electron", "Python", "llama.cpp", "GGUF", "Monaco"],
    accent: "#38a8ff",
    accent2: "#ff4d3d",
    iconStyle: "native",
    focal: "50% 50%",
    releases: { owner: "godsonj64", repo: "Cicada" },
    status: "Alpha",
    sourceNote: "Open source · MIT",
    website: { label: "cicada.ai.studio", href: "https://cicada.ai.studio/" },
  },
  {
    slug: "timbre",
    index: "02",
    name: "Timbre",
    kicker: "Voice studio & video sound editor",
    tagline: "Voice, sound, and storytelling.",
    headline: "From script to finished video, without leaving your desk.",
    summary: "A desktop video editor with a studio mixing console and a state-of-the-art local text-to-speech engine built in.",
    paragraphs: [
      "Drop footage on the timeline, type your script, and Timbre generates the narration, mixes it under your music bed and exports on the GPU — entirely on your own machine. No Python environment, no CUDA toolkit, no API key, nothing leaving the computer.",
      "It is an Electron front end over audio.cpp, a pure C++ ggml inference engine for audio models. Timbre fetches the right prebuilt engine for your hardware, downloads GGUF model packages, and runs an OpenAI-compatible speech server as a managed child process.",
      "The mixer is built like a console: a channel strip per track, a master bus with a limiter and loudness target, and narration that auto-ducks the music bed with a soft knee, fast attack and hold, so a duck sounds like a duck instead of breathing once per word.",
    ],
    highlights: [
      { title: "Multi-track timeline", body: "Canvas-drawn, with filmstrips, waveforms, snapping, razor and full undo/redo." },
      { title: "Studio mixer", body: "Gate, three-band EQ, compressor, pan, fader and peak meter per track; limiter on the master." },
      { title: "Auto-ducking", body: "Narration ducks the music bed with a shaped curve shared by the live preview and the export." },
      { title: "Real loudness metering", body: "ITU-R BS.1770-4 LUFS, loudness range and a 4× oversampled true-peak reading." },
    ],
    steps: [
      { label: "Timeline", note: "Drop footage in" },
      { label: "Script", note: "Type the narration" },
      { label: "Narrate", note: "Local TTS on your GPU" },
      { label: "Mix", note: "Duck, EQ, master" },
      { label: "Export", note: "Render on the GPU" },
    ],
    stack: ["Electron", "audio.cpp (ggml)", "GGUF", "FFmpeg", "Web Audio"],
    accent: "#ff3371",
    accent2: "#ffae03",
    iconStyle: "native",
    focal: "50% 50%",
    releases: { owner: "godsonj64", repo: "timbre-site" },
    status: "Released",
    sourceNote: "Binaries public · source private",
  },
  {
    slug: "electroplate",
    index: "03",
    name: "ElectroPlate",
    kicker: "No-code app generator",
    tagline: "Describe an app. Run it in minutes.",
    headline: "Turn a sentence into a desktop app.",
    summary: "Turn a sentence into a desktop app. ElectroPlate designs it, writes the code, installs the dependencies and launches it.",
    paragraphs: [
      "ElectroPlate is an AI-driven Electron app generator. Describe what you want in plain English; it designs the app, writes the code, installs the dependencies and launches it for you. Everything runs locally, with your data on your disk.",
      "It works with the AI provider you already pay for — DeepSeek, OpenAI, Anthropic or Google Gemini — switchable from a dropdown, with keys stored per provider so you can flip back and forth.",
      "Easy mode is one prompt box and one button for non-technical creatives. Pro mode is the full studio: live generator and reviewer streams, a file tree, a synced editor, npm install, build and test, and a GitHub publish flow. When it is right, one click ships any generated app as a real installer.",
    ],
    highlights: [
      { title: "One prompt, one app", body: "Type what you want, click Build. A minute later it is running." },
      { title: "Bring your own model", body: "DeepSeek, OpenAI, Anthropic and Gemini, switchable at any time." },
      { title: "Easy and Pro modes", body: "Same engine: a single button for creatives, a full studio for developers." },
      { title: "Ship to installer", body: "One click turns a generated app into a distributable installer for your OS." },
    ],
    steps: [
      { label: "Designing", note: "Plan the app" },
      { label: "Polishing", note: "Review the code" },
      { label: "Installing", note: "Fetch dependencies" },
      { label: "Launching", note: "Open the app" },
      { label: "Ready", note: "Keep tweaking in English" },
    ],
    stack: ["Electron", "Node.js", "DeepSeek · OpenAI · Anthropic · Gemini", "electron-builder"],
    accent: "#ff7a2f",
    accent2: "#ffb02e",
    iconStyle: "tile",
    focal: "50% 50%",
    releases: { owner: "godsonj64", repo: "electroplate-releases" },
    status: "Released",
    sourceNote: "Installers public · source private",
  },
  {
    slug: "axio",
    index: "04",
    name: "AXIO Medical",
    kicker: "Imaging informatics workstation",
    tagline: "Imaging Informatics Workstation",
    headline: "Routine scans in. Verifiable measurements out.",
    summary: "Turns routine scans into structured, verifiable measurements — segmentation, radiomics, biomarkers and lung-cancer risk — without images leaving the machine.",
    paragraphs: [
      "AXIO Medical is an imaging-informatics workstation for research and education. It installs three packages as one desktop app: the AXIO Workstation for viewing, measurement, series-integrity checks and linked MPR and 3D; AXIO Engines, the on-device AI runtime (TotalSegmentator, PyRadiomics, opportunistic biomarkers and Sybil); and AXIO Connect, a read-only DICOMweb link to a PACS.",
      "A deterministic series-integrity workstation validates instance identity, matrix consistency, pixel spacing, direction cosines and slice positions, and blocks quantitative MPR and 3D when the source geometry or calibration is incomplete or inconsistent.",
      "Volume rendering handles anisotropic voxel spacing correctly and offers DVR, MIP, isosurface and a cinematic mode with volumetric shadows, ambient occlusion and subsurface scattering computed from Hounsfield units.",
    ],
    highlights: [
      { title: "Verifiable measurements", body: "Integrity checks gate quantitative results and export structured JSON evidence." },
      { title: "On-device AI", body: "TotalSegmentator, PyRadiomics, opportunistic biomarkers and Sybil run locally." },
      { title: "Linked MPR and 3D", body: "Axial, coronal and sagittal with synchronized crosshairs; slab, MIP and cinematic rendering." },
      { title: "Read-only PACS link", body: "QIDO-RS search and WADO-RS retrieval over TLS, with session-only credentials." },
    ],
    steps: [
      { label: "Load", note: "DICOM, NIfTI, meshes" },
      { label: "Verify", note: "Series integrity" },
      { label: "Reconstruct", note: "MPR and 3D" },
      { label: "Segment", note: "On-device AI" },
      { label: "Measure", note: "ROIs and radiomics" },
    ],
    stack: ["Electron", "Python", "PyTorch", "TotalSegmentator", "PyRadiomics", "DICOMweb"],
    accent: "#2f8bff",
    accent2: "#31d0ff",
    iconStyle: "native",
    focal: "50% 50%",
    releases: { owner: "godsonj64", repo: "axiomedical3-releases" },
    status: "Released",
    sourceNote: "Installers public · source private · © Axiomatic Research",
    notice: "Not a medical device. Do not use for diagnosis or patient-care decisions.",
  },
  {
    slug: "talenta",
    index: "05",
    name: "Talenta",
    kicker: "Local-first job-search agent",
    tagline: "Aim high.",
    headline: "Score every job against your resume, on your own machine.",
    summary: "Searches and scores jobs against your resume with a local model, rewrites your resume per role, and helps you apply — fully on-device.",
    paragraphs: [
      "Talenta is a local-first Electron desktop agent. It searches Indeed in a real Chromium session, parses and stores postings in SQLite, then scores each one against your resume across four axes — skills, experience, culture and trajectory — using a local LLM served by llama.cpp.",
      "For the roles worth chasing it recommends truthful resume additions, rewrites your resume per job as an ATS-safe DOCX grounded in your real experience under a strict anti-AI-slop voice contract, and can apply by direct email or through Apply-with-Indeed.",
      "No cloud LLM and no resume data leaving the box: the only network calls are Indeed, the mail servers you configure and your own llama-server on 127.0.0.1.",
    ],
    highlights: [
      { title: "Four-axis scoring", body: "Skills, experience, culture, trajectory, each with plain-spoken reasoning and honest gaps." },
      { title: "Per-job resume rewrite", body: "ATS-safe DOCX built from your real experience, not invented claims." },
      { title: "Truthful by contract", body: "Hard rules on the rewrite: no fabrication and no AI-slop voice." },
      { title: "Private by design", body: "Resume, jobs and scores stay in a local SQLite file." },
    ],
    steps: [
      { label: "Search", note: "Indeed, in real Chromium" },
      { label: "Parse", note: "Structured SQLite schema" },
      { label: "Score", note: "Local LLM, four axes" },
      { label: "Recommend", note: "Truthful additions" },
      { label: "Rewrite", note: "Per-job DOCX" },
      { label: "Apply", note: "Email or Apply-with-Indeed" },
    ],
    stack: ["Electron", "Playwright", "SQLite", "llama.cpp", "DOCX"],
    accent: "#ff3d8b",
    accent2: "#5b6cff",
    iconStyle: "tile",
    focal: "50% 50%",
    fallbackVersion: "0.3.6",
    status: "In development",
    sourceNote: "Not publicly released yet",
  },
];

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug);
