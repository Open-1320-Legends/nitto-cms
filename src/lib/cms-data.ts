export type NavItem = {
  label: string;
  to: string;
  code: string;
  badge?: number;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Telemetry",
    items: [
      { label: "Dashboard", to: "/", code: "DR-01" },
      { label: "Cars", to: "/cars", code: "DR-02" },
      { label: "Dealership", to: "/dealership", code: "DR-03" },
    ],
  },
  {
    title: "Catalog",
    items: [
      { label: "OEM Audit", to: "/oem-audit", code: "CP-04" },
      { label: "Engines", to: "/engines", code: "CP-05" },
      { label: "OEM Paints", to: "/paints", code: "CP-06" },
      { label: "Parts", to: "/parts", code: "CP-07" },
      { label: "Engine Parts", to: "/engine-parts", code: "CP-08" },
    ],
  },
  {
    title: "Tuning",
    items: [
      { label: "Tune Lab", to: "/tune-lab", code: "TN-09" },
      { label: "Tuning Workbench", to: "/tuning-workbench", code: "TN-10" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Unlocks", to: "/unlocks", code: "OP-11" },
      { label: "Challenges", to: "/challenges", code: "OP-12" },
      { label: "Approval Queue", to: "/approvals", code: "OP-13" },
    ],
  },
];

export type CarStatus = "pending" | "deployed" | "queued";

export type Car = {
  serial: string;
  name: string;
  block: string;
  klass: string;
  et: string;
  status: CarStatus;
  engineer: string;
  price: string;
  paint: string;
  notes: string;
};

export const CARS: Car[] = [
  {
    serial: "CR-2214",
    name: "1970 Dragster 'Ironhorse'",
    block: "Chevy 427",
    klass: "Drag",
    et: "5.922s",
    status: "pending",
    engineer: "M. Kade",
    price: "$142,000",
    paint: "Tor Red",
    notes:
      "Stage II supercharger optimization required. Fuel ratio offset detected in cylinder 4. Awaiting owner validation.",
  },
  {
    serial: "CR-1980",
    name: "1969 Coupe 'Blackout'",
    block: "Hemi 426",
    klass: "Street",
    et: "8.114s",
    status: "deployed",
    engineer: "R. Voss",
    price: "$96,500",
    paint: "Laydown Black",
    notes: "Baseline OEM tune. No open calibration tickets.",
  },
  {
    serial: "CR-2043",
    name: "1972 Roadster 'Cinder'",
    block: "Boss 429",
    klass: "Tuned",
    et: "7.442s",
    status: "queued",
    engineer: "T. Ambrose",
    price: "$118,900",
    paint: "Candy Crimson",
    notes: "Converter stall raised to 4800. Queued for owner sign-off.",
  },
  {
    serial: "CR-1771",
    name: "1967 Fastback 'Dustline'",
    block: "Ford 428",
    klass: "Street",
    et: "8.860s",
    status: "deployed",
    engineer: "L. Okafor",
    price: "$88,000",
    paint: "Raven Blue",
    notes: "Suspension geometry verified against OEM audit sheet.",
  },
  {
    serial: "CR-2310",
    name: "1974 Sedan 'Vapor'",
    block: "LX 5.0",
    klass: "Tuned",
    et: "9.031s",
    status: "deployed",
    engineer: "S. Maren",
    price: "$61,250",
    paint: "Silver Mist",
    notes: "Entry-tier tuner shell. Cheapest route into the 9s bracket.",
  },
];

export type Approval = {
  id: string;
  surface: string;
  summary: string;
  author: string;
  age: string;
};

export const APPROVALS: Approval[] = [
  {
    id: "AP-0441",
    surface: "Engines",
    summary: "Swap: Whipple turbo kit → 1969 Coupe 'Blackout'",
    author: "Dana Torres",
    age: "12m ago",
  },
  {
    id: "AP-0440",
    surface: "OEM Paints",
    summary: "New factory color: Crimson Ghost #C1121F",
    author: "Ivo Reyes",
    age: "1h 06m ago",
  },
  {
    id: "AP-0438",
    surface: "Cars",
    summary: "Target ET lowered to 5.922s on CR-2214",
    author: "M. Kade",
    age: "2h 14m ago",
  },
];
