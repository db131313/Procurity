import type { LineItemCategory } from "./types";

export type CatalogMaterial = {
  key: string;
  label: string;
  category: LineItemCategory;
  unit: string;
  defaultUnitCost: number;
  description: string;
};

/** Seed materials catalog — editable per line item after add. */
export const MATERIALS_CATALOG: CatalogMaterial[] = [
  {
    key: "acrylic_sheet",
    label: "Acrylic sheet (1/4\")",
    category: "material",
    unit: "sq ft",
    defaultUnitCost: 12.5,
    description: "Cast acrylic for faces / backs",
  },
  {
    key: "aluminum_composite",
    label: "Aluminum composite (ACM)",
    category: "material",
    unit: "sq ft",
    defaultUnitCost: 9.75,
    description: "3mm ACM panels",
  },
  {
    key: "aluminum_extrusion",
    label: "Aluminum extrusion",
    category: "material",
    unit: "lin ft",
    defaultUnitCost: 8.4,
    description: "Channel letter returns / frames",
  },
  {
    key: "led_module",
    label: "LED module (white)",
    category: "material",
    unit: "each",
    defaultUnitCost: 3.25,
    description: "12V LED modules",
  },
  {
    key: "led_power_supply",
    label: "LED power supply",
    category: "material",
    unit: "each",
    defaultUnitCost: 48,
    description: "60–100W outdoor rated",
  },
  {
    key: "vinyl_cast",
    label: "Cast vinyl",
    category: "material",
    unit: "sq ft",
    defaultUnitCost: 4.5,
    description: "Premium cast vinyl film",
  },
  {
    key: "vinyl_laminate",
    label: "Vinyl laminate",
    category: "material",
    unit: "sq ft",
    defaultUnitCost: 2.1,
    description: "UV overlaminate",
  },
  {
    key: "channel_letter_fab",
    label: "Channel letter fabrication",
    category: "labor",
    unit: "letter",
    defaultUnitCost: 95,
    description: "Cut, weld, face, paint",
  },
  {
    key: "install_crew",
    label: "Install crew",
    category: "install",
    unit: "hour",
    defaultUnitCost: 125,
    description: "2-person install labor",
  },
  {
    key: "boom_lift",
    label: "Boom / lift rental",
    category: "install",
    unit: "day",
    defaultUnitCost: 450,
    description: "Equipment for elevated installs",
  },
  {
    key: "electrical_hookup",
    label: "Electrical hookup",
    category: "install",
    unit: "each",
    defaultUnitCost: 350,
    description: "Final connection / disconnect",
  },
  {
    key: "sign_permit",
    label: "Sign permit filing",
    category: "permit",
    unit: "each",
    defaultUnitCost: 275,
    description: "Municipal sign permit fees + filing",
  },
];

export const SIGN_TYPES = [
  "Channel letters",
  "Monument / pylon",
  "Cabinet / box sign",
  "Vinyl / window graphics",
  "Wayfinding / ADA",
  "Blade / projecting",
  "Digital / LED display",
  "Vehicle wrap",
  "Other",
] as const;
