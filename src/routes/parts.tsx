import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { tuningApi } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/parts")({
  head: () => ({
    meta: [
      { title: "Parts — 1320 Legends Console" },
      { name: "description", content: "Global parts list, tiers and pricing." },
      { property: "og:title", content: "Parts — 1320 Legends Console" },
      { property: "og:description", content: "Global parts list, tiers and pricing." },
    ],
  }),
  component: PartsPage,
});

// Real data source: /api/admin/tuning?type=parts (features/cms/tuning-catalog.mjs). Picked this
// over the raw /api/admin/cms/files parts-full.xml (1.3MB of flat <p> elements) because the
// tuning endpoint already gives structured, typed fields (hp/tq/wt/price) per part and supports
// a bounded query -- a better fit for a list view than parsing the raw XML client-side.
function PartsPage() {
  const { status } = useAuth();
  const query = useQuery({
    queryKey: ["tuning-parts"],
    queryFn: () => tuningApi.searchParts("", 250),
    enabled: status === "authenticated",
  });

  if (query.isError) {
    return (
      <SectionError
        breadcrumb="Parts"
        kicker="Global Catalog"
        title="Parts List"
        message="Could not load the parts catalog from the backend."
      />
    );
  }
  if (query.isLoading || !query.data) {
    return <SectionLoading breadcrumb="Parts" kicker="Global Catalog" title="Parts List" />;
  }

  const items = query.data.items;
  const rows: SectionRow[] = items.map((p) => ({
    id: String(p.i),
    primary: (p.mn || p.n || `Part ${p.i}`).toUpperCase(),
    secondary: `SKU: ${p.i} // CATEGORY: ${p.pi}`,
    cells: [
      p.hp || p.tq ? `+${p.hp} HP / +${p.tq} TQ` : "—",
      p.p ? `$${p.p.toLocaleString()}` : "—",
    ],
    status: "deployed",
    owner: p.pp ? `${p.pp} PTS` : "—",
  }));

  const priced = items.filter((p) => p.p > 0);
  const avgPrice = priced.length
    ? Math.round(priced.reduce((a, p) => a + p.p, 0) / priced.length)
    : 0;
  const categories = new Set(items.map((p) => p.pi));

  const stats: SectionStat[] = [
    {
      label: "Parts listed",
      value: String(query.data.count).padStart(4, "0"),
      note: `${categories.size} CATEGORIES`,
    },
    { label: "Shown (capped)", value: String(items.length), note: "QUERY LIMIT 250" },
    {
      label: "Average price",
      value: avgPrice ? `$${avgPrice.toLocaleString()}` : "—",
      note: "IN-GAME CASH",
    },
    { label: "Data source", value: "TUNING API", note: "STRUCTURED, REAL-TIME", emphasis: true },
  ];

  return (
    <SectionPage
      breadcrumb="Parts"
      kicker="Global Catalog"
      title="Parts List"
      tableTitle="Parts Registry (live tuning catalog)"
      columns={["Part", "Gain", "Price", "Status"]}
      stats={stats}
      rows={rows}
    />
  );
}
