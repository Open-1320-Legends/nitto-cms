/** Human descriptions for the raw XML attribute keys exposed by the per-field showroom
 *  (cars.tsx) and wheels (parts.tsx) catalog editors -- both operate on the games's legacy
 *  single/double-letter attribute schema (showroom-100.xml, wheels-500.xml), so a bare field
 *  label like "lid" or "let" means nothing without context. Meanings confirmed against the
 *  backend where the field is actually read/enforced (catalog.mjs, parts.mjs, catalog-car.mjs);
 *  where nothing server-side interprets a field, it's described by naming-convention best guess
 *  and flagged as such -- don't present those as more certain than they are. */
export const CATALOG_FIELD_GLOSSARY: Record<string, string> = {
  // ---- identity ----
  i: "Catalog/part ID (primary key).",
  id: "Catalog ID (same value as i on showroom cars).",
  ai: "Internal account-instance index. Always 0 on a catalog (non-owned) record.",
  ci: "Category ID. On wheels/parts this is the purchasable category (matches Parts page's category filter); on cars, the class grouping used by car-categories.xml.",
  pi: "Category ID (parts.mjs's canonical field -- ci is a fallback alias for the same value).",
  pcid: "Category ID used for part-compat.json fitment lookups.",
  categoryID: "Category ID (alias of pi/ci in the per-engine attached-parts view).",
  sel: "1 if this is the car's currently-selected showroom variant, else 0.",
  n: "Display name.",
  c: "Display name, duplicate of n (legacy field, both are read by different client screens).",
  b: "Brand slug (lowercase, used for logo/asset lookups).",
  bn: "Brand display name.",
  mn: "Model display name.",
  pn: "Part number / SKU text, when the catalog entry has one.",

  // ---- pricing ----
  p: "Cash price (in-game dollars).",
  pr: '"Regular" cash price shown before any discount -- display only, not what\'s charged.',
  pp: "Points price.",
  cp: "Current cash price (display copy of p; some screens read this instead).",

  // ---- location / level gating ----
  l: "Level gate: minimum account level required, OR (on showroom cars) the dealership location's level tier. 100 = no gate / starter location.",
  lid: "Dealership location ID. Matches catalog.mjs's LOCATIONS_XML: 100=Toreno, 200=Newburge, 300=Creek Side, 400=Vista Heights, 500=Diamond Point.",
  cid: "Dealership location ID, duplicate of lid.",

  // ---- lock/unlock (the REAL enforced flag) ----
  lk: "Purchase lock. 1 = blocked from purchase server-side (parts.mjs's buypart hard-rejects it), 0 = purchasable. This is the real lock -- use the Lock/Unlock button rather than hand-editing this.",

  // ---- limited-edition system (naming convention -- not interpreted server-side, exposed as-is) ----
  led: "Limited-edition description text. (Not read by any backend logic -- client-display only, best guess from naming.)",
  le: "Limited-edition flag (0/1). (Not read by any backend logic -- best guess from naming.)",
  lea: "Limited-edition availability count. (Not read by any backend logic -- best guess from naming.)",
  les: "Limited-edition stock remaining. (Not read by any backend logic -- best guess from naming.)",
  lec: "Limited-edition cost override. (Not read by any backend logic -- best guess from naming.)",
  let: "Limited-edition type/tier code. (Not read by any backend logic -- best guess from naming.)",

  // ---- performance ----
  hp: "Horsepower (cars: total car hp; parts: hp gain/delta this part adds).",
  tq: "Torque (cars: total car torque; parts: torque gain/delta this part adds).",
  wt: "Weight (cars: curb weight in lbs; parts: weight delta this part adds, can be negative).",
  sw: "Stock weight (lbs), shown in the roster's spec line.",
  st: "0-60 or similar stock time stat shown in the roster's spec line.",
  et: 'Engine/output text shown in the roster (e.g. "245 hp / 355 tq").',
  tt: 'Transmission text shown in the roster (e.g. "4-Speed Automatic").',
  eo: "Engine option text (the factory engine description).",
  dt: "Drivetrain: FWD / RWD / AWD.",
  y: "Model year.",
  np: "Number of paint-color options this car has (matches the nested <p cd='..'/> children).",
  ct: "Vehicle class/body style tag (Coupe, Sedan, etc).",

  // ---- wheels/tires specific ----
  di: "Design ID (which wheel-design family this fits).",
  pdi: "Parent design ID.",
  g: "Grade tier (S/A/B/C -- affects sort order and how it's badged in-game).",
  ps: "Wheel size in inches (e.g. 15, 16, 17).",
  ar: "Aspect ratio (tire sidewall profile), where applicable.",
  loc: "Wheel design collection/location grouping shown in the shop UI.",

  // ---- misc car flags (naming-convention best guess) ----
  ae: "Availability/enabled flag. (Best guess from naming -- not confirmed against backend logic.)",
  cc: "Default color hex (cars) or a color-code flag (0/other on parts).",
  ii: "Internal image/icon index.",
  wid: "Wheel-image/asset ID used for the roster thumbnail.",
  ws: "Wheel size shown on this car by default.",
  rh: "Ride-height flag/value. (Best guess from naming.)",
  ts: "Number of tire-size options. (Best guess from naming.)",
  mo: "Modified/OEM flag (0 = stock). (Best guess from naming.)",
  cbl: "Cost-to-buy-lower or similar threshold value. (Best guess from naming.)",
  cb: "Cost-to-buy flag/value. (Best guess from naming.)",
  po: "Points-owed or paint-option flag. (Best guess from naming.)",
  poc: "Paint-option count. (Best guess from naming.)",
  t: 'Node type tag (e.g. "c" for a car-fitting part, "e" for an engine part).',
  pt: "Purchase type tag, mirrors t.",
  compat: "Raw fitment/compatibility data for this attached part.",
};

/** Look up a field's description; falls back to a generic note for anything not in the glossary
 *  (new/unknown attributes still get a hover instead of nothing). */
export function catalogFieldTitle(key: string): string {
  return (
    CATALOG_FIELD_GLOSSARY[key] ?? `Raw XML attribute "${key}" -- no description available yet.`
  );
}
