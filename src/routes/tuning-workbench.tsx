import { createFileRoute } from "@tanstack/react-router";
import { SectionPage } from "@/components/cms/SectionPage";

// NOT WIRED -- mock data left in place intentionally. "Draft build" / "dyno preview" / "publish"
// is a workflow concept with no backend counterpart: backend-v2's tuning editor
// (features/cms/tuning-catalog.mjs) edits the live catalog entry directly, there's no draft/
// staging table and no dyno-simulation endpoint. Building one would mean inventing new backend
// persistence, which is out of scope for this pass (flagging per the brief instead of building
// speculative new routes).
export const Route = createFileRoute("/tuning-workbench")({
  head: () => ({
    meta: [
      { title: "Tuning Workbench — 1320 Legends Console" },
      { name: "description", content: "Assemble builds and preview dyno output before publish." },
      { property: "og:title", content: "Tuning Workbench — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Assemble builds and preview dyno output before publish.",
      },
    ],
  }),
  component: () => (
    <SectionPage
      breadcrumb="Tuning Workbench"
      kicker="Build + Dyno"
      title="Tuning Workbench"
      tableTitle="Draft Builds"
      columns={["Build", "Base block", "Dyno preview", "Status"]}
      stats={[
        { label: "Draft builds", value: "314", note: "NOT PUBLISHED" },
        { label: "Dyno runs today", value: "48", note: "SIMULATED" },
        { label: "Peak preview", value: "1,240", unit: "HP", bar: 88 },
        { label: "Publishes queued", value: "03", note: "AWAITING SIGN-OFF", emphasis: true },
      ]}
      rows={[
        {
          id: "w1",
          primary: "IRONHORSE STAGE III",
          secondary: "REF: CR-2214 // 12 PARTS FITTED",
          cells: ["CHEVY 427", "1,240 HP"],
          status: "pending",
          owner: "M. KADE",
        },
        {
          id: "w2",
          primary: "BLACKOUT STREET TRIM",
          secondary: "REF: CR-1980 // 6 PARTS FITTED",
          cells: ["HEMI 426", "612 HP"],
          status: "deployed",
          owner: "R. VOSS",
        },
        {
          id: "w3",
          primary: "CINDER BLOWER BUILD",
          secondary: "REF: CR-2043 // 9 PARTS FITTED",
          cells: ["BOSS 429", "884 HP"],
          status: "queued",
          owner: "T. AMBROSE",
        },
      ]}
    />
  ),
});
