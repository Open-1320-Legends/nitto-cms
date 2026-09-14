import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { tuningApi } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/engines")({
  head: () => ({
    meta: [
      { title: "Engines — 1320 Legends Console" },
      { name: "description", content: "Stock blocks and approved engine swaps." },
      { property: "og:title", content: "Engines — 1320 Legends Console" },
      { property: "og:description", content: "Stock blocks and approved engine swaps." },
    ],
  }),
  component: EnginesPage,
});

// Real data source: /api/admin/tuning?type=cars (features/cms/tuning-catalog.mjs), which reads
// straight off the live race catalog (car-race-data.json). backend-v2 has no separate "engine
// block" table -- each car model carries its own engine spec (hp/torque/weight), so that's the
// closest real 1:1 to this page's "stock blocks" concept.
function EnginesPage() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["tuning-cars"],
    queryFn: () => tuningApi.searchCars("", 200),
    enabled: status === "authenticated",
  });

  if (query.isError) {
    return (
      <SectionError
        breadcrumb="Engines"
        kicker="Propulsion"
        title="Engines & Swaps"
        message="Could not load the tuning catalog from the backend."
      />
    );
  }
  if (query.isLoading || !query.data) {
    return <SectionLoading breadcrumb="Engines" kicker="Propulsion" title="Engines & Swaps" />;
  }

  const items = query.data.items;
  const rows: SectionRow[] = items.map((c) => ({
    id: String(c.id),
    primary: c.name.toUpperCase(),
    secondary: `MODEL: ${c.id}${c.modelYear ? ` // YEAR: ${c.modelYear}` : ""}${c.engineFamily ? ` // ${c.engineFamily}` : ""}`,
    cells: [`${c.horsepower} HP`, `${c.torque} LB-FT`],
    status: "deployed",
    owner: `${c.weight} LB`,
  }));

  const peak = items.reduce((max, c) => Math.max(max, c.horsepower), 0);
  const avgHp = items.length
    ? Math.round(items.reduce((a, c) => a + c.horsepower, 0) / items.length)
    : 0;

  const stats: SectionStat[] = [
    {
      label: "Blocks listed",
      value: String(items.length).padStart(4, "0"),
      note: "LIVE RACE CATALOG",
    },
    { label: "Average output", value: String(avgHp), unit: "HP" },
    { label: "Peak output", value: String(peak), unit: "HP", bar: 100 },
    { label: "Data source", value: "TUNING API", note: "STRUCTURED, REAL-TIME", emphasis: true },
  ];

  return (
    <SectionPage
      breadcrumb="Engines"
      kicker="Propulsion"
      title="Engines & Swaps"
      tableTitle="Block Registry (live race catalog)"
      columns={["Block", "Output", "Torque", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
