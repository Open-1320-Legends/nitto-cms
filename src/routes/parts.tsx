import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat, StatusPill } from "@/components/cms/Shell";
import { SectionLoading, SectionError } from "@/components/cms/DataState";
import { cms2Api, cmsApi, ApiError, type Cms2PartRow } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useCmsFileList, useCmsFileById } from "@/lib/useCmsFile";
import { parseXmlElements, serializeXmlElements } from "@/lib/parseXmlElements";
import { catalogFieldTitle } from "@/lib/catalogFieldGlossary";

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

// ---- Inline price editor for one part row ----
// PUT /api/admin/cms2/parts/:pid { part: { priceCash, pricePoints }, reason } (updatePartsCatalogEntry
// in parts.mjs, confirmed live) -- writes straight into parts-full.xml, the same file the live
// shop reads.
function PartPriceEditor({ part, onDone }: { part: Cms2PartRow; onDone: () => void }) {
  const queryClient = useQueryClient();
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
        { priceCash: Number(priceCash) || 0, pricePoints: Number(pricePoints) || 0 },
        reason.trim(),
      );
      await queryClient.invalidateQueries({ queryKey: ["cms2-parts"] });
      toast.success(`Saved price for ${part.name || `part ${part.pid}`}.`);
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Cash price
            </label>
            <input
              type="number"
              value={priceCash}
              onChange={(e) => setPriceCash(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Points price
            </label>
            <input
              type="number"
              value={pricePoints}
              onChange={(e) => setPricePoints(e.target.value)}
              className="h-10 w-full rounded border border-line bg-background px-4 font-mono text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] tracking-[0.2em] text-dim uppercase">
              Reason (required, audit-logged)
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. balance pass"
              className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50"
            />
          </div>
          <div className="col-span-3 flex justify-end gap-2">
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
              {saving ? "Saving..." : "Save price"}
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

// ---- Wheels/rims catalog: per-record, per-field editor over wheels-500.xml ----
// Confirmed by reading parts.mjs: wheels/tires live in a SEPARATE file, wheels-500.xml, not
// parts-full.xml -- partsCatalogEntries()/updatePartsCatalogEntry() (and so cms2/parts above)
// explicitly don't cover it ("wheels/tires (wheels-500.xml) aren't covered", parts.mjs:181), and
// there's no per-field wheel editor route on the backend. The file is a flat list of `<p attr='..'
// .../>` elements (same shape as parts-full.xml) wrapped in a `<p>...</p>` root -- parsed here into
// plain attribute maps (parseXmlElements) and re-serialized whole on save (serializeXmlElements),
// through the existing raw-content CMS file API (GET/PUT /api/admin/cms/files/:id). Records don't
// all share the same attribute set (some carry `lk`/`ar`/`loc`, others don't), so each record's
// edit form renders one text field per key it actually has, rather than a fixed schema.
const WHEEL_ID_KEY = "i";
const WHEEL_LABEL_KEYS = ["n", "mn", "bn"];

function wheelLabel(rec: Record<string, string>): string {
  for (const k of WHEEL_LABEL_KEYS) if (rec[k]) return rec[k];
  return `Wheel ${rec[WHEEL_ID_KEY] ?? "?"}`;
}

function WheelRecordEditor({
  record,
  onSave,
  onCancel,
  saving,
}: {
  record: Record<string, string>;
  onSave: (next: Record<string, string>, reason: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [fields, setFields] = useState<Record<string, string>>(record);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setFields(record);
  }, [record]);

  return (
    <div className="border-t border-line bg-raise/10 px-6 py-5">
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key}>
            <label
              title={catalogFieldTitle(key)}
              className="mb-2 block cursor-help font-mono text-[10px] tracking-[0.2em] text-dim uppercase underline decoration-dotted decoration-dim/50 underline-offset-2"
            >
              {key}
            </label>
            <input
              value={value}
              onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
              className="h-10 w-full rounded border border-line bg-background px-3 font-mono text-[12px] outline-none transition-all focus:border-accent/50"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="col-span-2">
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
        <div className="col-span-2 flex items-end justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 rounded border border-line px-5 font-mono text-[11px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!reason.trim()) {
                toast.error("A save reason is required (it's written to the audit log).");
                return;
              }
              onSave(fields, reason.trim());
            }}
            disabled={saving}
            className="h-9 rounded bg-accent px-5 text-[11px] font-bold tracking-widest text-accent-foreground uppercase transition-all hover:brightness-125 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save wheel"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WheelsEditor() {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const list = useCmsFileList("parts");
  const meta = list.data?.find((f) => f.seedKey === "wheels-500.xml") ?? null;
  const file = useCmsFileById(meta?.id ?? null);

  const records = useMemo(
    () => parseXmlElements(file.data?.content, "p").filter((r) => r[WHEEL_ID_KEY]),
    [file.data?.content],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records.slice(0, 50);
    return records.filter((r) => wheelLabel(r).toLowerCase().includes(q)).slice(0, 50);
  }, [records, search]);

  const save = async (next: Record<string, string>, reason: string) => {
    if (!meta || !file.data) return;
    setSaving(true);
    try {
      const nextRecords = records.map((r) => (r[WHEEL_ID_KEY] === next[WHEEL_ID_KEY] ? next : r));
      const xml = serializeXmlElements(nextRecords, "p");
      // The raw-file save route (updateCatalogFile) only persists {content, updatedBy} -- there's
      // no reason/audit field on this endpoint, unlike the structured cms2 routes. `reason` is
      // still required client-side (accountability habit / consistency with the other editors on
      // this page) but isn't sent, since the backend has nowhere to put it.
      void reason;
      await cmsApi.save(meta.id, xml);
      await queryClient.invalidateQueries({ queryKey: ["cms-file", meta.id] });
      toast.success(`Saved ${wheelLabel(next)}.`);
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.reason || err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Wheels & Rims Catalog"
      meta={`${records.length || 0} RECORDS — wheels-500.xml`}
      delay={300}
      className="mt-8"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="font-mono text-[11px] text-mute">
          Wheels/tires live in a separate catalog file from parts-full.xml, with no structured
          backend route -- each field below maps directly to one XML attribute on the record.
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="h-8 shrink-0 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground"
        >
          {expanded ? "Close" : "Open editor"}
        </button>
      </div>
      {expanded ? (
        <div className="border-t border-line">
          {list.isLoading || (meta && file.isLoading) ? (
            <div className="px-6 py-5 font-mono text-[11px] text-dim">
              Loading wheels-500.xml...
            </div>
          ) : list.isError || file.isError ? (
            <div className="px-6 py-5 font-mono text-[11px] text-accent">
              Could not load wheels-500.xml (requires the backend's database to be configured).
            </div>
          ) : !meta ? (
            <div className="px-6 py-5 font-mono text-[11px] text-accent">
              wheels-500.xml is not seeded in the CMS catalog files table yet.
            </div>
          ) : (
            <>
              <div className="px-6 py-4">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search wheels by name/brand/model..."
                  className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50"
                />
              </div>
              <div className="divide-y divide-line">
                {filtered.map((rec) => (
                  <Fragment key={rec[WHEEL_ID_KEY]}>
                    <div
                      onClick={() =>
                        setEditingId((id) => (id === rec[WHEEL_ID_KEY] ? null : rec[WHEEL_ID_KEY]))
                      }
                      className="flex cursor-pointer items-center justify-between px-6 py-3 transition-colors hover:bg-raise"
                    >
                      <div>
                        <div className="text-[13px] font-bold">{wheelLabel(rec)}</div>
                        <div className="mt-1 font-mono text-[10px] text-dim uppercase">
                          ID: {rec[WHEEL_ID_KEY]} // CATEGORY: {rec.pi ?? "—"}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-mono text-[11px] text-mute">
                          {rec.p ? `$${rec.p}` : "—"} {rec.pp ? `/ ${rec.pp} pts` : ""}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void save({ ...rec, lk: rec.lk === "1" ? "0" : "1" }, "");
                          }}
                          disabled={saving}
                          title={
                            rec.lk === "1"
                              ? "Unlock this wheel for purchase"
                              : "Block this wheel from purchase"
                          }
                          className={
                            rec.lk === "1"
                              ? "h-8 shrink-0 rounded border border-accent/40 bg-accent/10 px-4 font-mono text-[10px] tracking-widest text-accent uppercase transition-colors hover:bg-accent/20 disabled:opacity-50"
                              : "h-8 shrink-0 rounded border border-line px-4 font-mono text-[10px] tracking-widest text-mute uppercase transition-colors hover:bg-raise hover:text-foreground disabled:opacity-50"
                          }
                        >
                          {rec.lk === "1" ? "Locked" : "Unlocked"}
                        </button>
                      </div>
                    </div>
                    {editingId === rec[WHEEL_ID_KEY] ? (
                      <WheelRecordEditor
                        record={rec}
                        saving={saving}
                        onCancel={() => setEditingId(null)}
                        onSave={(next, reason) => void save(next, reason)}
                      />
                    ) : null}
                  </Fragment>
                ))}
                {!filtered.length ? (
                  <div className="px-6 py-5 font-mono text-[11px] text-dim">
                    No wheels match "{search}".
                  </div>
                ) : null}
              </div>
              {records.length > filtered.length && !search ? (
                <div className="px-6 py-4 font-mono text-[10px] text-dim uppercase">
                  Showing first 50 of {records.length} -- search to narrow down.
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </Panel>
  );
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
                          {editingPid === p.pid ? "Close" : "Edit price"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingPid === p.pid ? (
                    <PartPriceEditor
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

      <WheelsEditor />
    </Shell>
  );
}
