import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { useCmsFileBySeedKey } from "@/lib/useCmsFile";
import { parseXmlElements } from "@/lib/parseXmlElements";

export const Route = createFileRoute("/unlocks")({
  head: () => ({
    meta: [
      { title: "Unlocks — 1320 Legends Console" },
      { name: "description", content: "Global car and part unlock gating by level." },
      { property: "og:title", content: "Unlocks — 1320 Legends Console" },
      { property: "og:description", content: "Global car and part unlock gating by level." },
    ],
  }),
  component: UnlocksPage,
});

// Real data source: /api/admin/cms/files (category "cars", seedKey "showroom-100.xml"). Each
// <c> element's l/lid attributes are the real level gate the client enforces before a car can be
// purchased -- this page shows only the cars that are actually gated (level > 1), which is the
// real "unlock" set. Parts have no comparable level-gate field in this backend's catalog data
// (parts-full.xml's <p> has no level attribute), so this page covers cars only.
function UnlocksPage() {
  const file = useCmsFileBySeedKey("cars", "showroom-100.xml");
  const cars = useMemo(
    () => parseXmlElements(file.data?.content, "c").filter((c) => c.n),
    [file.data],
  );

  const { rows, stats } = useMemo(() => {
    const gated = cars
      .filter((c) => Number(c.l || 100) > 1)
      .sort((a, b) => Number(a.l) - Number(b.l));

    const rows: SectionRow[] = gated.map((c) => ({
      id: c.id || c.i || c.n,
      primary: (c.n || "").toUpperCase(),
      secondary: `SERIAL: ${c.id || c.i}`,
      cells: ["CAR", `LEVEL ${c.l}`],
      status: "deployed",
      owner: c.p ? `$${Number(c.p).toLocaleString()}` : "—",
    }));

    const maxLevel = gated.length ? Math.max(...gated.map((c) => Number(c.l))) : 0;
    const lockedPct = cars.length ? Math.round((gated.length / cars.length) * 100) : 0;

    const stats: SectionStat[] = [
      {
        label: "Gated cars",
        value: String(gated.length).padStart(3, "0"),
        note: "SHOWROOM-100.XML",
      },
      { label: "Level ceiling", value: String(maxLevel), note: "HIGHEST REQUIREMENT" },
      { label: "Locked at start", value: String(lockedPct), unit: "%", bar: lockedPct },
      { label: "Data source", value: "LIVE", note: "CMS CATALOG FILE", emphasis: true },
    ];

    return { rows, stats };
  }, [cars]);

  if (file.isError) {
    return (
      <SectionError
        breadcrumb="Unlocks"
        kicker="Progression"
        title="Global Unlocks"
        message="Could not load the car catalog from the backend."
      />
    );
  }
  if (file.isLoading) {
    return <SectionLoading breadcrumb="Unlocks" kicker="Progression" title="Global Unlocks" />;
  }

  return (
    <SectionPage
      breadcrumb="Unlocks"
      kicker="Progression"
      title="Global Unlocks"
      tableTitle="Level-Gated Cars (showroom-100.xml)"
      columns={["Item", "Type", "Requirement", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
