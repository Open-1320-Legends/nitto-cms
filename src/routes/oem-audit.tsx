import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { useCmsFileBySeedKey } from "@/lib/useCmsFile";

export const Route = createFileRoute("/oem-audit")({
  head: () => ({
    meta: [
      { title: "OEM Audit — 1320 Legends Console" },
      { name: "description", content: "Factory baseline verification for every chassis." },
      { property: "og:title", content: "OEM Audit — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Factory baseline verification for every chassis.",
      },
    ],
  }),
  component: OemAuditPage,
});

type OemPart = { i: number; pi: number; di: number; n: string; t: string; g: string };

// Real data source: /api/admin/cms/files (category "engines", seedKey "oem-baseline.json") -- a
// literal "OEM baseline" file: the set of parts installed by default on every stock car
// (isOem && installedByDefault in the original performance-parts data). This is the actual OEM
// audit dataset, not a fabricated stand-in.
function OemAuditPage() {
  const file = useCmsFileBySeedKey("engines", "oem-baseline.json");

  const { rows, stats } = useMemo(() => {
    let parts: OemPart[] = [];
    if (file.data?.content) {
      try {
        parts = JSON.parse(file.data.content).parts || [];
      } catch {
        parts = [];
      }
    }

    const rows: SectionRow[] = parts.map((p) => ({
      id: String(p.i),
      primary: (p.n || `Part ${p.i}`).toUpperCase(),
      secondary: `CATEGORY: ${p.pi} // DEFAULT INDEX: ${p.di}`,
      cells: [p.t === "e" ? "ENGINE" : p.t?.toUpperCase() || "—", p.g ? `GRADE ${p.g}` : "—"],
      status: "deployed",
      owner: "OEM STOCK",
    }));

    const grades = new Set(parts.map((p) => p.g).filter(Boolean));

    const stats: SectionStat[] = [
      {
        label: "Baseline parts",
        value: String(parts.length).padStart(4, "0"),
        note: "OEM-BASELINE.JSON",
      },
      { label: "Grade tiers", value: String(grades.size), note: "DISTINCT GRADE CODES" },
      {
        label: "Last synced",
        value: file.data?.updatedAt ? new Date(file.data.updatedAt).toLocaleDateString() : "—",
        note: "CATALOG FILE UPDATED_AT",
      },
      { label: "Data source", value: "LIVE", note: "CMS CATALOG FILE", emphasis: true },
    ];

    return { rows, stats };
  }, [file.data]);

  if (file.isError) {
    return (
      <SectionError
        breadcrumb="OEM Audit"
        kicker="Stock Baseline"
        title="Chassis Audit"
        message="Could not load the OEM baseline data from the backend."
      />
    );
  }
  if (file.isLoading) {
    return <SectionLoading breadcrumb="OEM Audit" kicker="Stock Baseline" title="Chassis Audit" />;
  }

  return (
    <SectionPage
      breadcrumb="OEM Audit"
      kicker="Stock Baseline"
      title="Chassis Audit"
      tableTitle="OEM Baseline Parts (oem-baseline.json)"
      columns={["Part", "Type", "Grade", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
