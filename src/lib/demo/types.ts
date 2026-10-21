export type DemoProjectKind = "real" | "sample";

export type DemoProject = {
  id: string;
  kind: DemoProjectKind;
  /** Street address only — never owner/GC/architect names */
  address: string;
  cityId: string;
  latitude: number;
  longitude: number;
  projectType: string;
  phase: string;
  phaseLabel: string;
  score: number;
  scoreReasons: string[];
  valueLow: number;
  valueHigh: number;
  /** Always masked for public demo */
  contactMasked: string;
  label: string;
};

export type DemoEventType =
  | "demo_started"
  | "step_completed"
  | "demo_finished"
  | "cta_clicked"
  | "lead_submitted";

export const DEMO_STEPS = [
  {
    id: "map",
    title: "Map",
    prompt: "Tap a project.",
    blurb: "Example projects colored by Buy Score. Filter and explore.",
    script:
      "Here’s the map for your city — past buying-window examples, colored by Buy Score.",
  },
  {
    id: "card",
    title: "Project card",
    prompt: "Tap Start job.",
    blurb: "Buy Score, reasons, phase, value range, and a masked contact.",
    script:
      "Open a card: score, why-now reasons, phase, value — contacts stay masked.",
  },
  {
    id: "measure",
    title: "Measure",
    prompt: "Tap two points on the photo.",
    blurb: "Measure a sign from a site photo using a known reference.",
    script:
      "Tap two points to measure. LiDAR on iPhone is coming soon — not live here.",
  },
  {
    id: "quote",
    title: "Quote",
    prompt: "Preview the quote PDF.",
    blurb: "Line items from the measurement, with markup and tax.",
    script:
      "Measurement becomes line items — markup, tax, and a branded PDF preview.",
  },
  {
    id: "paid",
    title: "Get paid",
    prompt: "Pick a deposit and tap Pay now.",
    blurb: "Sample invoice with deposit options. No real payment.",
    script:
      "Offer 50% or 100% deposit. Pay now is a mock screen — labeled Demo.",
  },
] as const;

export type DemoStepId = (typeof DEMO_STEPS)[number]["id"];
