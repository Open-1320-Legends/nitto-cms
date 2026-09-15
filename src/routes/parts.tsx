import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SectionPage, type SectionRow, type SectionStat } from "@/components/cms/SectionPage";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cms2Api } from "@/lib/api";
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

const PAGE_SIZE = 25;

// Category names come back from the backend HTML-entity-escaped (e.g. "Air &amp; Intake") --
// decode the handful of entities actually used in the catalog rather than pulling in a full
// HTML-entity decoding library for this one field.
function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Real data source: /api/admin/cms2/parts + /api/admin/cms2/categories (features/site/admin-cms-api.mjs,
// backed by parts.mjs's partCategories()). This is real server-side pagination, category filtering
// and search -- replaces the old flat /api/admin/tuning?type=parts endpoint, which was capped at
// 250 results with no category filter.
function PartsPage() {
  const { status } = useAuth();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const categoriesQuery = useQuery({
    queryKey: ["cms2-categories"],
    queryFn: () => cms2Api.categories(),
    enabled: status === "authenticated",
  });

  const partsQuery = useQuery({
    queryKey: ["cms2-parts", category, search, page],
    queryFn: () => cms2Api.parts({ category, query: search, page, pageSize: PAGE_SIZE }),
    enabled: status === "authenticated",
  });

  if (partsQuery.isError || categoriesQuery.isError) {
    return (
      <SectionError
        breadcrumb="Parts"
        kicker="Global Catalog"
        title="Parts List"
        message="Could not load the parts catalog from the backend."
      />
    );
  }
  if (partsQuery.isLoading || !partsQuery.data || !categoriesQuery.data) {
    return <SectionLoading breadcrumb="Parts" kicker="Global Catalog" title="Parts List" />;
  }

  const { items, total } = partsQuery.data;
  const categories = categoriesQuery.data.categories;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const rows: SectionRow[] = items.map((p) => ({
    id: String(p.pid),
    primary: (p.model || p.name || `Part ${p.pid}`).toUpperCase(),
    secondary: `SKU: ${p.pid} // CATEGORY: ${p.category} // ${decodeEntities(p.brand)}`,
    cells: [
      p.hp || p.tq ? `+${p.hp} HP / +${p.tq} TQ` : "—",
      p.priceCash ? `$${p.priceCash.toLocaleString()}` : "—",
    ],
    status: "deployed",
    owner: p.pricePoints ? `${p.pricePoints} PTS` : "—",
  }));

  const priced = items.filter((p) => p.priceCash > 0);
  const avgPrice = priced.length
    ? Math.round(priced.reduce((a, p) => a + p.priceCash, 0) / priced.length)
    : 0;

  const stats: SectionStat[] = [
    {
      label: "Showing",
      value: `${items.length}`,
      note: `OF ${total.toLocaleString()} TOTAL`,
    },
    { label: "Categories", value: String(categories.length), note: "REAL CATALOG TREE" },
    {
      label: "Average price (page)",
      value: avgPrice ? `$${avgPrice.toLocaleString()}` : "—",
      note: "IN-GAME CASH",
    },
    { label: "Data source", value: "CMS2 API", note: "PAGINATED, REAL-TIME", emphasis: true },
  ];

  const filters = (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel/40 p-4 backdrop-blur-sm">
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="SEARCH PARTS"
        className="h-9 w-64 rounded border border-line bg-background px-4 font-mono text-[11px] tracking-wider text-foreground uppercase outline-none transition-all placeholder:text-dim/50 focus:border-accent/40"
      />
      <div className="h-6 w-px bg-line" />
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setCategory("");
            setPage(1);
          }}
          className={
            category === ""
              ? "rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent uppercase"
              : "rounded-full border border-line px-3 py-1.5 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
          }
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(String(c.id));
              setPage(1);
            }}
            className={
              category === String(c.id)
                ? "rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent uppercase"
                : "rounded-full border border-line px-3 py-1.5 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
            }
          >
            {decodeEntities(c.name)}
          </button>
        ))}
      </div>
    </div>
  );

  const footer = (
    <>
      <span className="font-mono text-[11px] tracking-widest text-dim">
        PAGE {page} OF {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded border border-line px-4 py-2 font-mono text-[11px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          Prev
        </button>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="rounded border border-line px-4 py-2 font-mono text-[11px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </>
  );

  return (
    <SectionPage
      breadcrumb="Parts"
      kicker="Global Catalog"
      title="Parts List"
      tableTitle="Parts Registry (live CMS2 catalog)"
      columns={["Part", "Gain", "Price", "Status"]}
      stats={stats}
      rows={rows}
      filters={filters}
      panelMeta={`${total.toLocaleString()} TOTAL RECORDS`}
      footer={footer}
    />
  );
}
