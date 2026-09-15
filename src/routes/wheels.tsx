import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel, PageTitle, Shell, Stat } from "@/components/cms/Shell";
import { cmsApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useCmsFileList, useCmsFileById } from "@/lib/useCmsFile";
import { parseXmlElements, serializeXmlElements } from "@/lib/parseXmlElements";
import { catalogFieldTitle } from "@/lib/catalogFieldGlossary";

export const Route = createFileRoute("/wheels")({
  head: () => ({
    meta: [
      { title: "Wheels & Rims — 1320 Legends Console" },
      { name: "description", content: "Wheel/rim catalog, pricing and purchase locks." },
      { property: "og:title", content: "Wheels & Rims — 1320 Legends Console" },
      {
        property: "og:description",
        content: "Wheel/rim catalog, pricing and purchase locks.",
      },
    ],
  }),
  component: WheelsPage,
});

// Wheels/tires live in a SEPARATE catalog file from parts-full.xml (wheels-500.xml) --
// partsCatalogEntries()/updatePartsCatalogEntry() (and so /api/admin/cms2/parts) explicitly don't
// cover it (parts.mjs:181), and there's no per-field wheel editor route on the backend. The file
// is a flat list of `<p attr='..' .../>` elements (same shape as parts-full.xml) wrapped in a
// `<p>...</p>` root -- parsed here into plain attribute maps (parseXmlElements) and re-serialized
// whole on save (serializeXmlElements), through the existing raw-content CMS file API
// (GET/PUT /api/admin/cms/files/:id). Records don't all share the same attribute set (some carry
// `lk`/`ar`/`loc`, others don't), so each record's edit form renders one text field per key it
// actually has, rather than a fixed schema.
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

function WheelsPage() {
  const { status } = useAuth();
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

  const lockedCount = useMemo(() => records.filter((r) => r.lk === "1").length, [records]);

  const save = async (next: Record<string, string>, reason: string) => {
    if (!meta || !file.data) return;
    setSaving(true);
    try {
      const nextRecords = records.map((r) => (r[WHEEL_ID_KEY] === next[WHEEL_ID_KEY] ? next : r));
      const xml = serializeXmlElements(nextRecords, "p");
      // The raw-file save route (updateCatalogFile) only persists {content, updatedBy} -- there's
      // no reason/audit field on this endpoint, unlike the structured cms2 routes. `reason` is
      // still required client-side (accountability habit / consistency with the other editors in
      // this app) but isn't sent, since the backend has nowhere to put it.
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

  const loading = status !== "authenticated" || list.isLoading || (!!meta && file.isLoading);
  const errored = list.isError || file.isError;

  return (
    <Shell breadcrumb="Wheels">
      <PageTitle kicker="Global Catalog" title="Wheels & Rims" />

      <div className="mb-10 grid grid-cols-4 gap-6">
        <Stat
          label="Wheels listed"
          value={String(records.length || 0)}
          note="WHEELS-500.XML"
          delay={50}
        />
        <Stat label="Locked" value={String(lockedCount)} note="BLOCKED FROM PURCHASE" delay={100} />
        <Stat label="Shown" value={String(filtered.length)} note="SEARCH TO NARROW" delay={150} />
        <Stat
          label="Data source"
          value="RAW FILE"
          note="NO STRUCTURED BACKEND ROUTE"
          emphasis
          delay={200}
        />
      </div>

      <Panel title="Wheels & Rims Catalog" meta={`${records.length || 0} RECORDS`} delay={250}>
        <div className="px-6 py-4 font-mono text-[11px] text-mute">
          Wheels/tires live in a separate catalog file from parts-full.xml, with no structured
          backend route -- each field below maps directly to one XML attribute on the record.
        </div>
        {loading ? (
          <div className="px-6 py-5 font-mono text-[11px] text-dim">Loading wheels-500.xml...</div>
        ) : errored ? (
          <div className="px-6 py-5 font-mono text-[11px] text-accent">
            Could not load wheels-500.xml (requires the backend's database to be configured).
          </div>
        ) : !meta ? (
          <div className="px-6 py-5 font-mono text-[11px] text-accent">
            wheels-500.xml is not seeded in the CMS catalog files table yet.
          </div>
        ) : (
          <>
            <div className="border-t border-line px-6 py-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search wheels by name/brand/model..."
                className="h-10 w-full rounded border border-line bg-background px-4 text-[13px] outline-none transition-all focus:border-accent/50"
              />
            </div>
            <div className="divide-y divide-line border-t border-line">
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
      </Panel>
    </Shell>
  );
}
