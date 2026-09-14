import { createFileRoute } from "@tanstack/react-router";
import { SectionPage } from "@/components/cms/SectionPage";

// NOT WIRED -- mock data left in place intentionally. There's no backend concept of a "target ET
// vs recorded pass" comparison or a per-build tune map anywhere in this backend (checked
// features/parts.mjs, features/garage/catalog-car.mjs, features/cms/tuning-catalog.mjs, and the
// KOTH/race-result modules). The closest real data is /api/admin/tuning?type=cars (real hp/
// torque/weight per car, used on the Engines page), but it has no target-vs-recorded ET pair or
// "map" entity to build this table's actual rows from without inventing plausible-looking numbers.
export const Route = createFileRoute("/tune-lab")({
  head: () => ({
    meta: [
      { title: "Tune Lab — 1320 Legends Console" },
      { name: "description", content: "Compare target ET and MPH against recorded passes." },
      { property: "og:title", content: "Tune Lab — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Compare target ET and MPH against recorded passes.",
      },
    ],
  }),
  component: () => (
    <SectionPage
      breadcrumb="Tune Lab"
      kicker="Target Compare"
      title="Tune Lab"
      tableTitle="ET / MPH Targets"
      columns={["Build", "Target ET", "Recorded", "Status"]}
      stats={[
        { label: "Open maps", value: "38", note: "IN PROGRESS" },
        { label: "Within target", value: "71", unit: "%", bar: 71 },
        { label: "Worst delta", value: "0.41", unit: "SEC" },
        { label: "Maps queued", value: "02", note: "AWAITING SIGN-OFF", emphasis: true },
      ]}
      rows={[
        {
          id: "t1",
          primary: "IRONHORSE · BOOST V3.2",
          secondary: "REF: CR-2214 // TARGET MPH 248",
          cells: ["5.922s", "5.941s"],
          status: "queued",
          owner: "M. KADE",
        },
        {
          id: "t2",
          primary: "BLACKOUT · PUMP MAP",
          secondary: "REF: CR-1980 // TARGET MPH 171",
          cells: ["8.100s", "8.114s"],
          status: "deployed",
          owner: "R. VOSS",
        },
        {
          id: "t3",
          primary: "CINDER · FUEL TRIM",
          secondary: "REF: CR-2043 // TARGET MPH 189",
          cells: ["7.400s", "7.442s"],
          status: "pending",
          owner: "T. AMBROSE",
        },
      ]}
    />
  ),
});
