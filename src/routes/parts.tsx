import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat, StatusPill } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cms2Api, ApiError, type Cms2PartRow } from "@/lib/api";
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

// ---- Full field editor for one part row (not just price) ----
// PUT /api/admin/cms2/parts/:pid { part: {...}, reason } (updatePartsCatalogEntry in parts.mjs,
// confirmed live) -- writes straight into parts-full.xml, the same file the live shop reads.
// Covers every field PART_FIELD_TO_ATTR actually accepts: name/model/brand/grade plus the
// hp/torque/weight DELTAS this part adds (not the car's totals), and price. `locked` is handled
// separately by PartLockToggle below, not duplicated here.
function PartFieldEditor({ part, onDone }: { part: Cms2PartRow; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(part.name);
  const [model, setModel] = useState(part.model);
  const [brand, setBrand] = useState(part.brand);
  const [grade, setGrade] = useState(part.grade);
  const [hp, setHp] = useState(String(part.hp));
  const [tq, setTq] = useState(String(part.tq));
  const [wt, setWt] = useState(String(part.wt));
  const [priceCash, setPriceCash] = useState(String(part.priceCash));
  const [pricePoints, setPricePoints] = useState(String(part.pricePoints));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!reason.trim()) {
      toast.error("A save reason is required (it's written to the audit log).");
      return;
    }
    setSaving(true);
    try {
      await cms2Api.savePart(
        part.pid,
        {
          name,
          model,
          brand,
          grade,
          horsepowerDelta: Number(hp) || 0,
          torqueDelta: Number(tq) || 0,
          weightDelta: Number(wt) || 0,
          priceCash: Number(priceCash) || 0,
          pricePoints: Number(pricePoints) || 0,
        },
        reason.trim(),
      );
      await queryClient.invalidateQueries({ queryKey: ["cms2-parts"] });
      toast.success(`Saved ${name || `part ${part.pid}`}.`);
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-raise/10">
      <td colSpan={5} className="px-6 py-5">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-3 text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Model
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-3 text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Brand
            </label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-3 text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Grade
            </label>
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="S / A / B / C"
              className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              HP gain
            </label>
            <input
              type="number"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Torque gain
            </label>
            <input
              type="number"
              value={tq}
              onChange={(e) => setTq(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Weight delta
            </label>
            <input
              type="number"
              value={wt}
              onChange={(e) => setWt(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Cash / points price
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceCash}
                onChange={(e) => setPriceCash(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
              <input
                type="number"
                value={pricePoints}
                onChange={(e) => setPricePoints(e.target.value)}
                className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="w-96">
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Reason (required, audit-logged)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. balance pass"
              className="h-10 w-full rounded border border-line bg-background px-3 text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onDone}
              className="h-9 rounded border border-line px-5 font-mono text-[11px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => void save()}
              disabled={saving}
              className="h-9 rounded bg-accent px-5 text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save part"}
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// ---- Lock/unlock toggle for one part -- the REAL purchase-block flag (lk), not decorative. ----
// parts.mjs's buypart hard-rejects any pid with lk='1', shared enforcement for both
// parts-full.xml and wheels-500.xml entries (same handler). PUT /api/admin/cms2/parts/:pid
// { part: { locked: 0 | 1 } } (confirmed live) -- NOT a boolean, see Cms2PartPatch's comment.
function PartLockToggle({ pid, locked }: { pid: number; locked: boolean }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      await cms2Api.savePart(
        pid,
        { locked: locked ? 0 : 1 },
        locked ? "Unlocked via admin console" : "Locked via admin console",
      );
      await queryClient.invalidateQueries({ queryKey: ["cms2-parts"] });
      toast.success(locked ? "Part unlocked." : "Part locked.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={() => void toggle()}
      disabled={saving}
      title={locked ? "Unlock this part for purchase" : "Block this part from purchase"}
      className={
        locked
          ? "h-8 rounded border border-accent/40 bg-accent/10 px-4 font-mono text-[10px] tracking-widest text-accent uppercase transition-colors hover:bg-accent/20 disabled:opacity-50"
          : "h-8 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
      }
    >
      {saving ? "..." : locked ? "Locked" : "Unlocked"}
    </button>
  );
}

// Wheels/rims moved to their own page (src/routes/wheels.tsx) -- wheels-500.xml is a separate,
// large catalog file with no structured backend route, and having it buried as a sub-panel below
// the (already long) parts list made it easy to miss and awkward to navigate to directly.

// Real data source: /api/admin/cms2/parts + /api/admin/cms2/categories (features/site/admin-cms-api.mjs,
// backed by parts.mjs's partCategories()). This is real server-side pagination, category filtering
// and search -- replaces the old flat /api/admin/tuning?type=parts endpoint, which was capped at
// 250 results with no category filter.
function PartsPage() {
  const { status } = useAuth();
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingPid, setEditingPid] = useState<number | null>(null);

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

  const priced = items.filter((p) => p.priceCash > 0);
  const avgPrice = priced.length
    ? Math.round(priced.reduce((a, p) => a + p.priceCash, 0) / priced.length)
    : 0;

  const stats = [
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

  return (
    <Shell breadcrumb="Parts">
      <PageTitle kicker="Global Catalog" title="Parts List" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} delay={50 + i * 50} />
        ))}
      </div>

      <div className="rise mb-6" style={{ animationDelay: "200ms" }}>
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
      </div>

      <Panel
        title="Parts Registry (live CMS2 catalog)"
        meta={`${total.toLocaleString()} TOTAL RECORDS`}
        delay={250}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-line bg-raise/10 text-left font-mono text-[10px] tracking-[0.2em] text-dim/70 uppercase">
                <th className="px-6 py-4 font-bold">Part</th>
                <th className="px-4 py-4 font-bold">Gain</th>
                <th className="px-4 py-4 font-bold">Price</th>
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-6 py-4 text-right font-bold">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((p) => (
                <Fragment key={p.pid}>
                  <tr className="group transition-all hover:bg-raise">
                    <td className="px-6 py-5">
                      <div className="text-[14px] font-bold transition-colors group-hover:text-accent">
                        {(p.model || p.name || `Part ${p.pid}`).toUpperCase()}
                      </div>
                      <div className="mt-1 font-mono text-[10px] tracking-tighter text-dim uppercase">
                        SKU: {p.pid} // CATEGORY: {p.category} // {decodeEntities(p.brand)}
                      </div>
                    </td>
                    <td className="px-4 py-5 font-mono text-[11px] text-mute">
                      {p.hp || p.tq ? `+${p.hp} HP / +${p.tq} TQ` : "—"}
                    </td>
                    <td className="px-4 py-5 font-mono text-[11px] text-mute">
                      {p.priceCash ? `$${p.priceCash.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-5">
                      <StatusPill status={p.locked ? "locked" : "deployed"} />
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <PartLockToggle pid={p.pid} locked={p.locked} />
                        <button
                          onClick={() => setEditingPid(editingPid === p.pid ? null : p.pid)}
                          className="h-8 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
                        >
                          {editingPid === p.pid ? "Close" : "Edit part"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingPid === p.pid ? (
                    <PartFieldEditor
                      key={`${p.pid}-editor`}
                      part={p}
                      onDone={() => setEditingPid(null)}
                    />
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-raise/10 px-6 py-4">
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
        </div>
      </Panel>
    </Shell>
  );
}
