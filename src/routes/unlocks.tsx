import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cms2Api, tuningApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";

export const Route = createFileRoute("/unlocks")({
  head: () => ({
    meta: [
      { title: "Unlocks — 1320 Legends Console" },
      { name: "description", content: "Global car and part-category purchase locks." },
      { property: "og:title", content: "Unlocks — 1320 Legends Console" },
      { property: "og:description", content: "Global car and part-category purchase locks." },
    ],
  }),
  component: UnlocksPage,
});

// Real data source: GET/PUT /api/admin/cms2/unlocks (features/cms/global-unlocks.mjs), a
// genuinely NEW server-wide toggle -- not level-gating (that's baked into showroom-100.xml's `l`
// attribute and isn't editable here). This locks specific catalog cars or entire part categories
// from being purchased at all, enforced live in economy.mjs's buycar / parts.mjs's buypart +
// buyenginepart. Confirmed live: GET returns {lockedCatalogIds:[], lockedPartCategories:[]} by
// default; PUT merges -- a list omitted from the body leaves that list unchanged.
function UnlocksPage() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [carSearch, setCarSearch] = useState("");
  const [reason, setReason] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const unlocksQuery = useQuery({
    queryKey: ["cms2-unlocks"],
    queryFn: () => cms2Api.getUnlocks(),
    enabled: status === "authenticated",
  });

  const carsQuery = useQuery({
    queryKey: ["tuning-cars-search-unlocks", carSearch],
    queryFn: () => tuningApi.searchCars(carSearch, 30),
    enabled: status === "authenticated",
  });

  const categoriesQuery = useQuery({
    queryKey: ["cms2-categories"],
    queryFn: () => cms2Api.categories(),
    enabled: status === "authenticated",
  });

  if (unlocksQuery.isError || carsQuery.isError || categoriesQuery.isError) {
    return (
      <SectionError
        breadcrumb="Unlocks"
        kicker="Progression"
        title="Global Unlocks"
        message="Could not load unlock data from the backend."
      />
    );
  }
  if (unlocksQuery.isLoading || !unlocksQuery.data || !carsQuery.data || !categoriesQuery.data) {
    return <SectionLoading breadcrumb="Unlocks" kicker="Progression" title="Global Unlocks" />;
  }

  const unlocks = unlocksQuery.data.unlocks;
  const cars = carsQuery.data.items;
  const categories = categoriesQuery.data.categories;

  const requireReason = () => {
    if (!reason.trim()) {
      toast.error("A save reason is required above the lists (it's written to the audit log).");
      return false;
    }
    return true;
  };

  const toggleCarLock = async (catalogId: number) => {
    if (!requireReason()) return;
    setPendingId(`car-${catalogId}`);
    const locked = unlocks.lockedCatalogIds.includes(catalogId);
    const next = locked
      ? unlocks.lockedCatalogIds.filter((id) => id !== catalogId)
      : [...unlocks.lockedCatalogIds, catalogId];
    try {
      await cms2Api.saveUnlocks({ lockedCatalogIds: next }, reason.trim());
      await queryClient.invalidateQueries({ queryKey: ["cms2-unlocks"] });
      toast.success(locked ? "Car unlocked." : "Car locked.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setPendingId(null);
    }
  };

  const toggleCategoryLock = async (categoryId: number) => {
    if (!requireReason()) return;
    setPendingId(`cat-${categoryId}`);
    const locked = unlocks.lockedPartCategories.includes(categoryId);
    const next = locked
      ? unlocks.lockedPartCategories.filter((id) => id !== categoryId)
      : [...unlocks.lockedPartCategories, categoryId];
    try {
      await cms2Api.saveUnlocks({ lockedPartCategories: next }, reason.trim());
      await queryClient.invalidateQueries({ queryKey: ["cms2-unlocks"] });
      toast.success(locked ? "Category unlocked." : "Category locked.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setPendingId(null);
    }
  };

  const stats = [
    {
      label: "Locked cars",
      value: String(unlocks.lockedCatalogIds.length).padStart(2, "0"),
      note: "BLOCKED FROM PURCHASE",
    },
    {
      label: "Locked categories",
      value: String(unlocks.lockedPartCategories.length).padStart(2, "0"),
      note: "BLOCKED FROM PURCHASE",
    },
    { label: "Catalog cars", value: String(cars.length), note: "CURRENT SEARCH RESULT" },
    { label: "Data source", value: "LIVE", note: "CMS2 GLOBAL UNLOCKS", emphasis: true },
  ];

  return (
    <Shell breadcrumb="Unlocks">
      <PageTitle kicker="Progression" title="Global Unlocks" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      <div className="rise mb-6" style={{ animationDelay: "200ms" }}>
        <div className="rounded-xl border border-line bg-panel/40 p-4 backdrop-blur-sm">
          <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
            Reason for lock/unlock changes below (required, audit-logged)
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. exploit fix, tournament exclusivity"
            className="h-10 w-full max-w-xl rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50"
          />
        </div>
      </div>

      <Panel title="Car Locks" meta="WRITES lockedCatalogIds" delay={250}>
        <div className="border-b border-line px-6 py-4">
          <input
            value={carSearch}
            onChange={(e) => setCarSearch(e.target.value)}
            placeholder="SEARCH CATALOG CARS BY NAME OR ID"
            className="h-9 w-80 rounded border border-line bg-background px-4 font-mono text-[11px] tracking-wider text-foreground uppercase outline-none transition-all placeholder:text-dim/50 focus:border-accent/40"
          />
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {cars.length === 0 ? (
            <div className="p-6 font-mono text-[12px] text-dim">No cars matched.</div>
          ) : (
            <div className="divide-y divide-line">
              {cars.map((c) => {
                const locked = unlocks.lockedCatalogIds.includes(c.id);
                return (
                  <div key={c.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <div className="text-[13px] font-bold">{c.name}</div>
                      <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                        CATALOG ID {c.id} // {c.engineFamily || "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => void toggleCarLock(c.id)}
                      disabled={pendingId === `car-${c.id}`}
                      className={
                        locked
                          ? "h-9 rounded border border-accent/40 bg-accent/15 px-4 font-mono text-[10px] font-bold tracking-widest text-accent uppercase transition-all hover:brightness-125 disabled:opacity-50"
                          : "h-9 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                      }
                    >
                      {pendingId === `car-${c.id}`
                        ? "Saving..."
                        : locked
                          ? "Locked — unlock"
                          : "Lock"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>

      <Panel
        title="Part Category Locks"
        meta="WRITES lockedPartCategories"
        delay={300}
        className="mt-8"
      >
        <div className="divide-y divide-line">
          {categories.map((cat) => {
            const locked = unlocks.lockedPartCategories.includes(cat.id);
            return (
              <div key={cat.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="text-[13px] font-bold">{cat.name}</div>
                  <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                    CATEGORY ID {cat.id}
                  </div>
                </div>
                <button
                  onClick={() => void toggleCategoryLock(cat.id)}
                  disabled={pendingId === `cat-${cat.id}`}
                  className={
                    locked
                      ? "h-9 rounded border border-accent/40 bg-accent/15 px-4 font-mono text-[10px] font-bold tracking-widest text-accent uppercase transition-all hover:brightness-125 disabled:opacity-50"
                      : "h-9 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                  }
                >
                  {pendingId === `cat-${cat.id}`
                    ? "Saving..."
                    : locked
                      ? "Locked — unlock"
                      : "Lock"}
                </button>
              </div>
            );
          })}
        </div>
      </Panel>
    </Shell>
  );
}
