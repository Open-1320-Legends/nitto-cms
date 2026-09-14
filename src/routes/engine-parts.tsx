import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { tuningApi } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/engine-parts")({
  head: () => ({
    meta: [
      { title: "Engine Parts — 1320 Legends Console" },
      { name: "description", content: "Per-engine parts catalog and fitment." },
      { property: "og:title", content: "Engine Parts — 1320 Legends Console" },
      { property: "og:description", content: "Per-engine parts catalog and fitment." },
    ],
  }),
  component: EnginePartsPage,
});

// Real data source: same /api/admin/tuning?type=parts endpoint as /parts, filtered client-side to
// entries that carry a real horsepower or torque gain -- the tuning catalog doesn't expose a
// separate "fits block" fitment table (see part-compat.json, which maps parts to legacy car ids,
// not to engine blocks), so "fitment matrix" in the mock has no real backend counterpart. What IS
// real: the actual hp/tq gain per part, shown here instead of invented block names.
function EnginePartsPage() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["tuning-parts-engine"],
    queryFn: () => tuningApi.searchParts("", 250),
    enabled: status === "authenticated",
  });

  if (query.isError) {
    return (
      <SectionError
        breadcrumb="Engine Parts"
        kicker="Per-Engine Fitment"
        title="Engine Parts"
        message="Could not load the parts catalog from the backend."
      />
    );
  }
  if (query.isLoading || !query.data) {
    return (
      <SectionLoading breadcrumb="Engine Parts" kicker="Per-Engine Fitment" title="Engine Parts" />
    );
  }

  const gainParts = query.data.items.filter((p) => p.hp > 0 || p.tq > 0);
  const rows: SectionRow[] = gainParts.map((p) => ({
    id: String(p.i),
    primary: (p.mn || p.n || `Part ${p.i}`).toUpperCase(),
    secondary: `SKU: ${p.i} // CATEGORY: ${p.pi}`,
    cells: [`+${p.hp} HP`, `+${p.tq} TQ`],
    status: "deployed",
    owner: p.wt ? `${p.wt > 0 ? "+" : ""}${p.wt} LB` : "—",
  }));

  const totalHp = gainParts.reduce((a, p) => a + p.hp, 0);
  const avgHp = gainParts.length ? Math.round(totalHp / gainParts.length) : 0;

  const stats: SectionStat[] = [
    {
      label: "Power-adding parts",
      value: String(gainParts.length).padStart(4, "0"),
      note: "HP OR TQ > 0",
    },
    { label: "Of parts queried", value: String(query.data.items.length), note: "QUERY LIMIT 250" },
    { label: "Average gain", value: String(avgHp), unit: "HP" },
    { label: "Data source", value: "TUNING API", note: "NO FITMENT TABLE EXISTS", emphasis: true },
  ];

  return (
    <SectionPage
      breadcrumb="Engine Parts"
      kicker="Per-Engine Fitment"
      title="Engine Parts"
      tableTitle="Power-Adding Parts (live tuning catalog)"
      columns={["Part", "HP gain", "Torque gain", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
