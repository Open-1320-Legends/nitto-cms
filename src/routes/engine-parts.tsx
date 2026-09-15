import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cms2Api, type Cms2EngineRow } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

// Category/brand labels from the backend come HTML-entity-escaped (e.g. "Suspension &amp;
// Safety") -- decode the handful of entities actually used in the catalog.
function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export const Route = createFileRoute("/engine-parts")({
  head: () => ({
    meta: [
      { title: "Engine Parts — 1320 Legends Console" },
      { name: "description", content: "Per-car / per-engine-family parts fitment." },
      { property: "og:title", content: "Engine Parts — 1320 Legends Console" },
      { property: "og:description", content: "Per-car / per-engine-family parts fitment." },
    ],
  }),
  component: EnginePartsPage,
});

// Real data source: /api/admin/cms2/engines + /api/admin/cms2/engines/:id/parts
// (features/site/admin-cms-api.mjs, backed by parts.mjs's enginePartsForCatalogId()). This is a
// genuine master-detail view: pick a car/engine, see the real parts attached to it. "Engine
// family" here is the real `drivetrain` field the backend already aliases as engineFamily
// (FWD/RWD/AWD as observed live -- built from the actual distinct values, not guessed).
function EnginePartsPage() {
  const { status } = useAuth();
  const [familyFilter, setFamilyFilter] = useState<string>("");
  const [engineQuery, setEngineQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const enginesQuery = useQuery({
    queryKey: ["cms2-engines", engineQuery],
    queryFn: () => cms2Api.engines({ query: engineQuery }),
    enabled: status === "authenticated",
  });

  const engines = useMemo(() => enginesQuery.data?.items ?? [], [enginesQuery.data]);

  const families = useMemo(() => {
    const set = new Set<string>();
    for (const e of engines) if (e.drivetrain) set.add(e.drivetrain);
    return Array.from(set).sort();
  }, [engines]);

  const filteredEngines = useMemo(
    () => (familyFilter ? engines.filter((e) => e.drivetrain === familyFilter) : engines),
    [engines, familyFilter],
  );

  const selected: Cms2EngineRow | undefined = filteredEngines.find((e) => e.id === selectedId);
  const effectiveSelectedId = selected ? selected.id : (filteredEngines[0]?.id ?? null);
  const activeEngine = filteredEngines.find((e) => e.id === effectiveSelectedId);

  const partsQuery = useQuery({
    queryKey: ["cms2-engine-parts", effectiveSelectedId],
    queryFn: () => cms2Api.engineParts(effectiveSelectedId as number),
    enabled: status === "authenticated" && effectiveSelectedId != null,
  });

  if (enginesQuery.isError) {
    return (
      <SectionError
        breadcrumb="Engine Parts"
        kicker="Per-Car Fitment"
        title="Engine Parts"
        message="Could not load the engine/car catalog from the backend."
      />
    );
  }
  if (enginesQuery.isLoading || !enginesQuery.data) {
    return (
      <SectionLoading breadcrumb="Engine Parts" kicker="Per-Car Fitment" title="Engine Parts" />
    );
  }

  const attachedParts = partsQuery.data?.parts ?? [];

  const stats = [
    { label: "Cars / engines", value: String(engines.length), note: "TOTAL IN CATALOG" },
    {
      label: "In family",
      value: familyFilter ? String(filteredEngines.length) : String(engines.length),
      note: familyFilter || "ALL FAMILIES",
    },
    {
      label: "Attached parts",
      value: partsQuery.isLoading ? "—" : String(attachedParts.length),
      note: activeEngine ? activeEngine.name.toUpperCase() : "NO CAR SELECTED",
    },
    { label: "Data source", value: "CMS2 API", note: "PER-CAR FITMENT", emphasis: true },
  ];

  return (
    <Shell breadcrumb="Engine Parts">
      <PageTitle kicker="Per-Car / Per-Family Fitment" title="Engine Parts" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel/40 p-4 backdrop-blur-sm">
        <input
          value={engineQuery}
          onChange={(e) => setEngineQuery(e.target.value)}
          placeholder="SEARCH CARS"
          className="h-9 w-64 rounded border border-line bg-background px-4 font-mono text-[11px] tracking-wider text-foreground uppercase outline-none transition-all placeholder:text-dim/50 focus:border-accent/40"
        />
        <div className="h-6 w-px bg-line" />
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFamilyFilter("")}
            className={
              familyFilter === ""
                ? "rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent uppercase"
                : "rounded-full border border-line px-3 py-1.5 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
            }
          >
            All Families
          </button>
          {families.map((f) => (
            <button
              key={f}
              onClick={() => setFamilyFilter(f)}
              className={
                familyFilter === f
                  ? "rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent uppercase"
                  : "rounded-full border border-line px-3 py-1.5 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-6">
        <Panel title="Cars / Engines" meta={`${filteredEngines.length} LISTED`} delay={200}>
          <div className="max-h-[560px] divide-y divide-line overflow-y-auto">
            {filteredEngines.length === 0 ? (
              <div className="px-6 py-8 text-center font-mono text-[11px] text-dim uppercase">
                No cars match this filter
              </div>
            ) : (
              filteredEngines.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={
                    e.id === effectiveSelectedId
                      ? "block w-full px-6 py-4 text-left bg-accent/10 ring-1 ring-inset ring-accent/20"
                      : "block w-full px-6 py-4 text-left transition-colors hover:bg-raise"
                  }
                >
                  <div
                    className={
                      e.id === effectiveSelectedId
                        ? "text-[13px] font-bold text-accent"
                        : "text-[13px] font-bold"
                    }
                  >
                    {e.name.toUpperCase()}
                  </div>
                  <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                    {e.drivetrain} // {e.hp} HP // {e.torque} TQ // {e.weight} LB
                  </div>
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel
          title={activeEngine ? `Attached Parts — ${activeEngine.name}` : "Attached Parts"}
          meta={partsQuery.isLoading ? "LOADING..." : `${attachedParts.length} ACTIVE RECORDS`}
          delay={250}
        >
          {!activeEngine ? (
            <div className="px-6 py-16 text-center font-mono text-[11px] text-dim uppercase">
              Select a car to view its fitted parts
            </div>
          ) : partsQuery.isLoading ? (
            <div className="px-6 py-16 text-center font-mono text-[11px] text-dim uppercase">
              Loading fitment...
            </div>
          ) : partsQuery.isError ? (
            <div className="px-6 py-16 text-center font-mono text-[11px] text-accent uppercase">
              Could not load parts for this car.
            </div>
          ) : attachedParts.length === 0 ? (
            <div className="px-6 py-16 text-center font-mono text-[11px] text-dim uppercase">
              No parts are attached to this car yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-raise/10 text-left font-mono text-[10px] tracking-[0.2em] text-dim/70 uppercase">
                    <th className="px-6 py-4 font-bold">Part</th>
                    <th className="px-4 py-4 font-bold">Gain</th>
                    <th className="px-4 py-4 font-bold">Weight</th>
                    <th className="px-4 py-4 font-bold">Grade</th>
                    <th className="px-6 py-4 text-right font-bold">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {attachedParts.map((p) => (
                    <tr key={p.pid} className="group transition-all hover:bg-raise">
                      <td className="px-6 py-5">
                        <div className="text-[14px] font-bold transition-colors group-hover:text-accent">
                          {(p.mn || p.n || `Part ${p.pid}`).toUpperCase()}
                        </div>
                        <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                          SKU: {p.pid} // {decodeEntities(p.bn || p.b)}
                        </div>
                      </td>
                      <td className="px-4 py-5 font-mono text-[11px] text-mute">
                        +{p.hp} HP / +{p.tq} TQ
                      </td>
                      <td className="px-4 py-5 font-mono text-[11px] text-mute">
                        {Number(p.wt) > 0 ? `+${p.wt}` : p.wt} LB
                      </td>
                      <td className="px-4 py-5 font-mono text-[11px] text-mute">{p.g}</td>
                      <td className="px-6 py-5 text-right font-mono text-mute">
                        ${Number(p.p).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
